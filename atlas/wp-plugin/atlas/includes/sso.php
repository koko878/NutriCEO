<?php
/**
 * Microsoft 365 SSO flow for Atlas.
 *
 * Implements OAuth 2.0 Authorization Code + PKCE against Azure AD
 * (Microsoft Entra ID). Uses the openid + profile + email + User.Read
 * scopes — JUST enough to identify the user. No SharePoint or Mail
 * scopes are requested here: that data is accessed by the Copilot
 * Studio agent under its own author auth, not by this plugin.
 *
 * URLs:
 *   /?atlas_sso=start        → redirect to MS authorize endpoint
 *   /?atlas_sso=callback     → handle redirect back, mint WP session
 *   /?atlas_sso=logout       → clear session, redirect home
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

const ATLAS_SSO_TRANSIENT_PREFIX = 'atlas_sso_state_';
const ATLAS_SSO_AUTH_URL_TPL     = 'https://login.microsoftonline.com/%s/oauth2/v2.0/authorize';
const ATLAS_SSO_TOKEN_URL_TPL    = 'https://login.microsoftonline.com/%s/oauth2/v2.0/token';
const ATLAS_SSO_USERINFO_URL     = 'https://graph.microsoft.com/oidc/userinfo';
const ATLAS_SSO_SCOPES           = 'openid profile email User.Read offline_access';

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

	// Store state + verifier + redirect target in a short-lived transient.
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
 * STEP 2 — handle the redirect back, exchange code for tokens, identify
 * the user, validate against the whitelist, mint a WP session.
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
	$tenant_id = atlas_opt( 'azure_tenant_id' );
	$client_id = atlas_opt( 'azure_client_id' );
	$client_secret = atlas_opt( 'azure_client_secret' );

	// Exchange code for tokens.
	$resp = wp_remote_post( sprintf( ATLAS_SSO_TOKEN_URL_TPL, rawurlencode( $tenant_id ) ), array(
		'timeout' => 15,
		'headers' => array( 'Content-Type' => 'application/x-www-form-urlencoded' ),
		'body'    => array(
			'client_id'     => $client_id,
			'client_secret' => $client_secret,
			'scope'         => ATLAS_SSO_SCOPES,
			'code'          => $code,
			'redirect_uri'  => atlas_sso_redirect_uri(),
			'grant_type'    => 'authorization_code',
			'code_verifier' => $ctx['verifier'],
		),
	) );

	if ( is_wp_error( $resp ) ) {
		wp_die( esc_html( 'Token exchange failed : ' . $resp->get_error_message() ), 'Atlas SSO', array( 'response' => 500 ) );
	}
	$body = json_decode( wp_remote_retrieve_body( $resp ), true );
	if ( empty( $body['access_token'] ) ) {
		$err = isset( $body['error_description'] ) ? $body['error_description'] : 'no access_token returned';
		wp_die( esc_html( 'Token exchange rejected : ' . $err ), 'Atlas SSO', array( 'response' => 500 ) );
	}

	// Identify the user via OIDC userinfo (avoids us having to validate the
	// id_token signature locally — we let Microsoft tell us who's who).
	$user = atlas_sso_fetch_userinfo( $body['access_token'] );
	if ( ! $user ) {
		wp_die( 'Could not resolve Microsoft 365 identity.', 'Atlas SSO', array( 'response' => 500 ) );
	}

	$upn = $user['upn'];
	if ( ! atlas_upn_allowed( $upn ) ) {
		wp_die( esc_html( "L'utilisateur $upn n'est pas autorisé à utiliser Atlas. Contactez l'administrateur." ), 'Atlas SSO', array( 'response' => 403 ) );
	}

	// Map UPN → WP user (create on first login).
	$wp_user_id = atlas_sso_provision_wp_user( $upn, $user['name'] );

	// Open a WP session.
	wp_clear_auth_cookie();
	wp_set_current_user( $wp_user_id );
	wp_set_auth_cookie( $wp_user_id, true, is_ssl() );

	atlas_session_set( $wp_user_id, $upn, $user['name'] );

	// Bounce back to the original destination.
	$redirect_to = ! empty( $ctx['redirect_to'] ) ? $ctx['redirect_to'] : home_url( '/atlas' );
	wp_safe_redirect( $redirect_to );
	exit;
}

/* -------------------------------------------------------------------------
 * STEP 3 — logout: clear the Atlas session marker and WP auth cookie.
 * We do NOT call Microsoft's logout endpoint to avoid signing the user
 * out of the entire M365 tenant — only Atlas.
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
 * Helpers
 * ---------------------------------------------------------------------- */
function atlas_sso_redirect_uri() {
	return add_query_arg( 'atlas_sso', 'callback', home_url( '/' ) );
}

function atlas_sso_random_url_safe( $bytes ) {
	return rtrim( strtr( base64_encode( random_bytes( $bytes ) ), '+/', '-_' ), '=' );
}

function atlas_sso_fetch_userinfo( $access_token ) {
	$resp = wp_remote_get( ATLAS_SSO_USERINFO_URL, array(
		'timeout' => 10,
		'headers' => array( 'Authorization' => 'Bearer ' . $access_token ),
	) );
	if ( is_wp_error( $resp ) ) return null;
	$data = json_decode( wp_remote_retrieve_body( $resp ), true );
	if ( ! is_array( $data ) ) return null;
	// MS returns: sub, email, given_name, family_name, name, picture
	$upn = isset( $data['email'] ) ? $data['email'] : ( isset( $data['preferred_username'] ) ? $data['preferred_username'] : null );
	if ( ! $upn ) return null;
	return array(
		'upn'  => $upn,
		'name' => isset( $data['name'] ) ? $data['name'] : $upn,
	);
}

function atlas_sso_provision_wp_user( $upn, $name ) {
	// Stable slug derived from the UPN, prefixed to avoid colliding with
	// existing WP users created via other means.
	$login = 'atlas_' . preg_replace( '/[^a-z0-9]+/', '_', strtolower( $upn ) );
	$user = get_user_by( 'login', $login );
	if ( $user ) return $user->ID;

	$user_id = wp_insert_user( array(
		'user_login'   => $login,
		'user_email'   => $upn,
		'display_name' => $name,
		'user_pass'    => wp_generate_password( 32, true, true ), // unguessable; user never uses it
		'role'         => 'subscriber',
	) );
	if ( is_wp_error( $user_id ) ) {
		// Fallback: lookup by email if a user already exists with this address.
		$existing = get_user_by( 'email', $upn );
		if ( $existing ) return $existing->ID;
		wp_die( esc_html( 'Could not provision WP user : ' . $user_id->get_error_message() ), 'Atlas SSO', array( 'response' => 500 ) );
	}
	update_user_meta( $user_id, 'atlas_provisioned_at', time() );
	return $user_id;
}
