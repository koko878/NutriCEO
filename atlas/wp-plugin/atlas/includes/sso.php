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

// Single-shot scope: OIDC claims (openid+profile+email) give us an id_token
// that carries the user's identity (UPN, name) directly, so we don't need a
// second call to Microsoft Graph. The Power Platform scope returns the
// access_token we use to call Copilot Studio. offline_access gives us a
// refresh_token. All four can be combined in one /token exchange — the
// OIDC scopes are not a "resource" and may piggyback on any single-resource
// token request.
//
// IMPORTANT: an OAuth authorization code is SINGLE-USE. We must do the
// exchange exactly once per login flow.
const ATLAS_SSO_SCOPES = 'openid profile email offline_access https://api.powerplatform.com/CopilotStudio.Copilots.Invoke';

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
		'scope'                 => ATLAS_SSO_SCOPES,
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
 * Single /token exchange combining OIDC + Power Platform scopes. The
 * response carries:
 *   - id_token      : JWT whose claims (preferred_username, name) give
 *                     us the user's identity — no Graph round-trip needed
 *   - access_token  : usable against api.powerplatform.com (Copilot Studio)
 *   - refresh_token : long-lived, usable to mint new access_tokens
 *
 * Microsoft authorization codes are SINGLE-USE — calling /token twice
 * with the same code triggers AADSTS54005. That's why we ask for
 * everything we need in one shot.
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

	$tokens = atlas_sso_exchange_code( $code, ATLAS_SSO_SCOPES, $ctx['verifier'] );

	if ( ! $tokens || empty( $tokens['access_token'] ) ) {
		$detail = $tokens['error_description'] ?? 'no detail';
		// Diagnose common failure modes by inspecting the MS error code.
		$hint = '';
		if ( strpos( (string) $detail, 'AADSTS65001' ) !== false || strpos( (string) $detail, 'AADSTS650056' ) !== false ) {
			$hint = " — La permission « Power Platform API → CopilotStudio.Copilots.Invoke » n'est pas grantée. Va dans Azure AD → ton App Registration → API permissions → Grant admin consent.";
		} elseif ( strpos( (string) $detail, 'AADSTS500011' ) !== false ) {
			$hint = " — Le service principal « Power Platform API » n'existe pas dans le tenant. IT doit lancer : Add-MgServicePrincipal -AppId 8578e004-a5c6-46e7-913e-12f58912df43";
		} elseif ( strpos( (string) $detail, 'AADSTS70011' ) !== false ) {
			$hint = " — Scope invalide. Le scope CopilotStudio.Copilots.Invoke n'est pas autorisé pour cette app — vérifie qu'il est bien ajouté dans API permissions.";
		}
		wp_die( esc_html( 'Échec du token exchange : ' . $detail . $hint ), 'Atlas SSO', array( 'response' => 500 ) );
	}

	if ( empty( $tokens['id_token'] ) ) {
		wp_die( "Microsoft n'a pas renvoyé d'id_token — vérifie que le scope « openid » est bien autorisé sur l'App Registration.", 'Atlas SSO', array( 'response' => 500 ) );
	}

	$claims = atlas_sso_decode_jwt_payload( $tokens['id_token'] );
	if ( ! is_array( $claims ) ) {
		wp_die( "id_token Microsoft illisible.", 'Atlas SSO', array( 'response' => 500 ) );
	}

	$upn  = $claims['preferred_username'] ?? ( $claims['email'] ?? '' );
	$name = $claims['name'] ?? $upn;
	if ( ! $upn ) {
		wp_die( "id_token ne contient pas d'identifiant utilisateur — vérifie que les scopes « profile » et « email » sont bien autorisés.", 'Atlas SSO', array( 'response' => 500 ) );
	}

	if ( ! atlas_upn_allowed( $upn ) ) {
		wp_die( esc_html( "L'utilisateur $upn n'est pas autorisé à utiliser Atlas. Contactez l'administrateur." ), 'Atlas SSO', array( 'response' => 403 ) );
	}

	$wp_user_id = atlas_sso_provision_wp_user( $upn, $name );

	wp_clear_auth_cookie();
	wp_set_current_user( $wp_user_id );
	wp_set_auth_cookie( $wp_user_id, true, is_ssl() );

	atlas_session_set(
		$wp_user_id,
		$upn,
		$name,
		$tokens['access_token'],
		$tokens['refresh_token'] ?? '',
		(int) ( $tokens['expires_in'] ?? 3600 )
	);

	$redirect_to = ! empty( $ctx['redirect_to'] ) ? $ctx['redirect_to'] : home_url( '/atlas' );
	wp_safe_redirect( $redirect_to );
	exit;
}

/* -------------------------------------------------------------------------
 * Decode a JWT payload without signature validation.
 *
 * Safe here because the id_token comes back over TLS from Microsoft's
 * /token endpoint as a direct response to OUR HTTPS request — we trust
 * the channel, not a JWT signature. (If we were accepting JWTs from
 * arbitrary parties, we'd validate the signature against MS's JWKS.)
 * ---------------------------------------------------------------------- */
function atlas_sso_decode_jwt_payload( $jwt ) {
	$parts = explode( '.', $jwt );
	if ( count( $parts ) < 2 ) return null;
	$payload = strtr( $parts[1], '-_', '+/' );
	$payload .= str_repeat( '=', ( 4 - strlen( $payload ) % 4 ) % 4 );
	$decoded = base64_decode( $payload, true );
	if ( $decoded === false ) return null;
	$json = json_decode( $decoded, true );
	return is_array( $json ) ? $json : null;
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
			'scope'         => 'https://api.powerplatform.com/CopilotStudio.Copilots.Invoke offline_access',
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
