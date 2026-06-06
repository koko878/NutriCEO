<?php
/**
 * Microsoft 365 SSO flow for Atlas.
 *
 * Implements OAuth 2.0 Authorization Code + PKCE against Microsoft Entra
 * ID. We request a combined set of scopes so we get:
 *   - openid/profile/email/User.Read → to identify the user
 *   - https://api.powerplatform.com/CopilotStudio.Copilots.Invoke
 *                                  → to call the Copilot Studio agent
 *   - offline_access                → to refresh tokens silently for ~90 days
 *
 * URLs:
 *   /?atlas_sso=start        → redirect to MS authorize endpoint
 *   /?atlas_sso=callback     → handle redirect back, mint WP session, store tokens
 *   /?atlas_sso=logout       → clear session, redirect home
 *
 * Tokens are stored in user meta via atlas_session_set(). chat.php
 * refreshes them on demand using the refresh_token.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

const ATLAS_SSO_TRANSIENT_PREFIX = 'atlas_sso_state_';
const ATLAS_SSO_AUTH_URL_TPL     = 'https://login.microsoftonline.com/%s/oauth2/v2.0/authorize';
const ATLAS_SSO_TOKEN_URL_TPL    = 'https://login.microsoftonline.com/%s/oauth2/v2.0/token';
const ATLAS_SSO_USERINFO_URL     = 'https://graph.microsoft.com/oidc/userinfo';

// The Copilot Studio scope cannot be combined with Graph scopes in a single
// /token call because Microsoft refuses cross-resource scope grants. Our
// approach: ask for openid + profile + email + offline_access + the
// Copilot Studio scope at /authorize (this gives us the consent banner with
// both resources listed), then make TWO /token calls in the callback —
// one for Graph (to identify the user) and one for Power Platform (to chat
// with the agent). Both use the same authorization code.
const ATLAS_SSO_SCOPES_AUTHORIZE = 'openid profile email offline_access https://api.powerplatform.com/CopilotStudio.Copilots.Invoke User.Read';
const ATLAS_SSO_SCOPE_CPS        = 'https://api.powerplatform.com/CopilotStudio.Copilots.Invoke offline_access';
const ATLAS_SSO_SCOPE_GRAPH      = 'openid profile email User.Read offline_access';

add_action( 'template_redirect', 'atlas_sso_router', 5 );

function atlas_sso_router() {
	if ( ! isset( $_GET['atlas_sso'] ) ) return;

	$action = sanitize_key( $_GET['atlas_sso'] );

	switch ( $action ) {
		case 'start':    atlas_sso_start();    break;
		case 'callback': atlas_sso_callback(); break;
		case 'logout':   atlas_sso_logout();   break;
		default:         wp_die( 'Unknown SSO action.', 'Atlas SSO', array( 'response' => 400 ) );
	}
}

/* -------------------------------------------------------------------------
 * STEP 1 — kick off the OAuth dance.
 * ---------------------------------------------------------------------- */
function atlas_sso_start() {
	$tenant_id = atlas_opt( 'azure_tenant_id' );
	$client_id = atlas_opt( 'azure_client_id' );

	if ( ! $tenant_id || ! $client_id ) {
		wp_die( 'Atlas SSO is not configured. Set Azure AD credentials in Settings → Atlas.', 'Atlas SSO', array( 'response' => 500 ) );
	}

	$redirect_to = isset( $_GET['redirect_to'] ) ? esc_url_raw( wp_unslash( $_GET['redirect_to'] ) ) : home_url( '/atlas' );

	$state    = wp_generate_password( 32, false );
	$verifier = atlas_sso_random_url_safe( 64 );
	$challenge = rtrim( strtr( base64_encode( hash( 'sha256', $verifier, true ) ), '+/', '-_' ), '=' );

	set_transient( ATLAS_SSO_TRANSIENT_PREFIX . $state, array(
		'verifier'    => $verifier,
		'redirect_to' => $redirect_to,
	), 10 * MINUTE_IN_SECONDS );

	$params = array(
		'client_id'             => $client_id,
		'response_type'         => 'code',
		'redirect_uri'          => atlas_sso_redirect_uri(),
		'response_mode'         => 'query',
		'scope'                 => ATLAS_SSO_SCOPES_AUTHORIZE,
		'state'                 => $state,
		'code_challenge'        => $challenge,
		'code_challenge_method' => 'S256',
		'prompt'                => 'select_account',
	);

	$url = sprintf( ATLAS_SSO_AUTH_URL_TPL, rawurlencode( $tenant_id ) )
		. '?' . http_build_query( $params, '', '&', PHP_QUERY_RFC3986 );
	wp_redirect( $url );
	exit;
}

/* -------------------------------------------------------------------------
 * STEP 2 — handle the redirect back.
 *
 * We make TWO token calls with the same authorization code:
 *   (a) scope = Graph (User.Read) → access_token usable against Graph
 *                                     → call /oidc/userinfo to identify
 *                                       the user (UPN, name)
 *   (b) scope = Power Platform (CopilotStudio.Copilots.Invoke)
 *                                   → access_token + refresh_token usable
 *                                     against Copilot Studio
 *
 * Microsoft allows reusing the same auth code as long as both calls
 * happen quickly. (b) is the one we actually persist; (a) is consumed
 * once and discarded.
 * ---------------------------------------------------------------------- */
function atlas_sso_callback() {
	if ( isset( $_GET['error'] ) ) {
		$err = sanitize_text_field( wp_unslash( $_GET['error'] ) );
		$desc = isset( $_GET['error_description'] ) ? sanitize_text_field( wp_unslash( $_GET['error_description'] ) ) : '';
		wp_die( esc_html( 'Microsoft a renvoyé une erreur : ' . $err . ' — ' . $desc ), 'Atlas SSO', array( 'response' => 400 ) );
	}

	if ( ! isset( $_GET['code'] ) || ! isset( $_GET['state'] ) ) {
		wp_die( 'Missing OAuth response parameters.', 'Atlas SSO', array( 'response' => 400 ) );
	}

	$state = sanitize_key( $_GET['state'] );
	$ctx = get_transient( ATLAS_SSO_TRANSIENT_PREFIX . $state );
	if ( ! is_array( $ctx ) ) {
		wp_die( 'Invalid or expired SSO state — please try logging in again.', 'Atlas SSO', array( 'response' => 400 ) );
	}
	delete_transient( ATLAS_SSO_TRANSIENT_PREFIX . $state ); // single-use

	$code = sanitize_text_field( wp_unslash( $_GET['code'] ) );

	// (a) Graph token — used once to identify the user.
	$graph_tokens = atlas_sso_exchange_code( $code, ATLAS_SSO_SCOPE_GRAPH, $ctx['verifier'] );
	if ( ! $graph_tokens || empty( $graph_tokens['access_token'] ) ) {
		wp_die( esc_html( 'Identity token exchange rejected : ' . ( $graph_tokens['error_description'] ?? 'unknown' ) ), 'Atlas SSO', array( 'response' => 500 ) );
	}

	$user = atlas_sso_fetch_userinfo( $graph_tokens['access_token'] );
	if ( ! $user ) {
		wp_die( 'Could not resolve Microsoft 365 identity.', 'Atlas SSO', array( 'response' => 500 ) );
	}

	$upn = $user['upn'];
	if ( ! atlas_upn_allowed( $upn ) ) {
		wp_die( esc_html( "L'utilisateur $upn n'est pas autorisé à utiliser Atlas. Contactez l'administrateur." ), 'Atlas SSO', array( 'response' => 403 ) );
	}

	// (b) Power Platform token — the one we persist for Copilot Studio calls.
	// We reuse the SAME authorization code (Microsoft allows this for
	// distinct resources within the consent grant).
	$cps_tokens = atlas_sso_exchange_code( $code, ATLAS_SSO_SCOPE_CPS, $ctx['verifier'] );

	// Some tenants return an error here even when (a) succeeded — usually
	// because the user wasn't granted CopilotStudio.Copilots.Invoke or the
	// Power Platform service principal doesn't exist in the tenant. Surface
	// a clear error rather than silently logging in without a usable token.
	if ( ! $cps_tokens || empty( $cps_tokens['access_token'] ) ) {
		$detail = $cps_tokens['error_description'] ?? 'no detail';
		wp_die( esc_html(
			"Authentification réussie côté identité, mais Microsoft refuse le token Copilot Studio. " .
			"Vérifier dans Azure AD que l'App Registration a la permission déléguée " .
			"« Power Platform API → CopilotStudio.Copilots.Invoke » et qu'un admin a fait « Grant admin consent ». " .
			"Détail : $detail"
		), 'Atlas SSO', array( 'response' => 500 ) );
	}

	$wp_user_id = atlas_sso_provision_wp_user( $upn, $user['name'] );

	wp_clear_auth_cookie();
	wp_set_current_user( $wp_user_id );
	wp_set_auth_cookie( $wp_user_id, true, is_ssl() );

	atlas_session_set(
		$wp_user_id,
		$upn,
		$user['name'],
		$cps_tokens['access_token'],
		$cps_tokens['refresh_token'] ?? '',
		(int) ( $cps_tokens['expires_in'] ?? 3600 )
	);

	$redirect_to = ! empty( $ctx['redirect_to'] ) ? $ctx['redirect_to'] : home_url( '/atlas' );
	wp_safe_redirect( $redirect_to );
	exit;
}

/* -------------------------------------------------------------------------
 * STEP 3 — logout.
 * ---------------------------------------------------------------------- */
function atlas_sso_logout() {
	if ( is_user_logged_in() ) {
		$uid = get_current_user_id();
		atlas_session_clear( $uid );
		wp_logout();
	}
	wp_safe_redirect( home_url( '/' ) );
	exit;
}

/* -------------------------------------------------------------------------
 * Refresh the Copilot Studio access token for a user, using their stored
 * refresh_token. Called by chat.php on every request — cheap because
 * we only hit Microsoft if the token is actually expired.
 *
 * Returns the access_token string, or null on failure (in which case the
 * user needs to re-login via SSO).
 * ---------------------------------------------------------------------- */
function atlas_sso_get_fresh_cps_token( $user_id ) {
	$now      = time();
	$expires  = (int) get_user_meta( $user_id, 'atlas_cps_access_expires_at', true );
	$current  = (string) get_user_meta( $user_id, 'atlas_cps_access_token', true );

	if ( $current && $expires > $now + 30 ) {
		return $current; // still fresh
	}

	$refresh = (string) get_user_meta( $user_id, 'atlas_cps_refresh_token', true );
	if ( ! $refresh ) return null;

	$tenant_id     = atlas_opt( 'azure_tenant_id' );
	$client_id     = atlas_opt( 'azure_client_id' );
	$client_secret = atlas_opt( 'azure_client_secret' );

	$resp = wp_remote_post( sprintf( ATLAS_SSO_TOKEN_URL_TPL, rawurlencode( $tenant_id ) ), array(
		'timeout' => 12,
		'headers' => array( 'Content-Type' => 'application/x-www-form-urlencoded' ),
		'body'    => array(
			'client_id'     => $client_id,
			'client_secret' => $client_secret,
			'scope'         => ATLAS_SSO_SCOPE_CPS,
			'refresh_token' => $refresh,
			'grant_type'    => 'refresh_token',
		),
	) );

	if ( is_wp_error( $resp ) ) return null;
	$body = json_decode( wp_remote_retrieve_body( $resp ), true );
	if ( empty( $body['access_token'] ) ) return null;

	update_user_meta( $user_id, 'atlas_cps_access_token', $body['access_token'] );
	update_user_meta( $user_id, 'atlas_cps_access_expires_at', time() + max( 60, (int) ( $body['expires_in'] ?? 3600 ) - 60 ) );
	// Refresh tokens may be rotated — store the new one if returned.
	if ( ! empty( $body['refresh_token'] ) ) {
		update_user_meta( $user_id, 'atlas_cps_refresh_token', $body['refresh_token'] );
	}
	return $body['access_token'];
}

/* -------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------- */
function atlas_sso_redirect_uri() {
	return add_query_arg( 'atlas_sso', 'callback', home_url( '/' ) );
}

function atlas_sso_random_url_safe( $bytes ) {
	return rtrim( strtr( base64_encode( random_bytes( $bytes ) ), '+/', '-_' ), '=' );
}

function atlas_sso_exchange_code( $code, $scope, $verifier ) {
	$tenant_id     = atlas_opt( 'azure_tenant_id' );
	$client_id     = atlas_opt( 'azure_client_id' );
	$client_secret = atlas_opt( 'azure_client_secret' );

	$resp = wp_remote_post( sprintf( ATLAS_SSO_TOKEN_URL_TPL, rawurlencode( $tenant_id ) ), array(
		'timeout' => 15,
		'headers' => array( 'Content-Type' => 'application/x-www-form-urlencoded' ),
		'body'    => array(
			'client_id'     => $client_id,
			'client_secret' => $client_secret,
			'scope'         => $scope,
			'code'          => $code,
			'redirect_uri'  => atlas_sso_redirect_uri(),
			'grant_type'    => 'authorization_code',
			'code_verifier' => $verifier,
		),
	) );

	if ( is_wp_error( $resp ) ) return null;
	return json_decode( wp_remote_retrieve_body( $resp ), true );
}

function atlas_sso_fetch_userinfo( $access_token ) {
	$resp = wp_remote_get( ATLAS_SSO_USERINFO_URL, array(
		'timeout' => 10,
		'headers' => array( 'Authorization' => 'Bearer ' . $access_token ),
	) );
	if ( is_wp_error( $resp ) ) return null;
	$data = json_decode( wp_remote_retrieve_body( $resp ), true );
	if ( ! is_array( $data ) ) return null;
	$upn = isset( $data['email'] ) ? $data['email'] : ( isset( $data['preferred_username'] ) ? $data['preferred_username'] : null );
	if ( ! $upn ) return null;
	return array(
		'upn'  => $upn,
		'name' => isset( $data['name'] ) ? $data['name'] : $upn,
	);
}

function atlas_sso_provision_wp_user( $upn, $name ) {
	$login = 'atlas_' . preg_replace( '/[^a-z0-9]+/', '_', strtolower( $upn ) );
	$user = get_user_by( 'login', $login );
	if ( $user ) return $user->ID;

	$user_id = wp_insert_user( array(
		'user_login'   => $login,
		'user_email'   => $upn,
		'display_name' => $name,
		'user_pass'    => wp_generate_password( 32, true, true ),
		'role'         => 'subscriber',
	) );
	if ( is_wp_error( $user_id ) ) {
		$existing = get_user_by( 'email', $upn );
		if ( $existing ) return $existing->ID;
		wp_die( esc_html( 'Could not provision WP user : ' . $user_id->get_error_message() ), 'Atlas SSO', array( 'response' => 500 ) );
	}
	update_user_meta( $user_id, 'atlas_provisioned_at', time() );
	return $user_id;
}
