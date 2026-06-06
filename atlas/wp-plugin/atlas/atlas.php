<?php
/**
 * Plugin Name:       Atlas — Second cerveau D²nAI
 * Description:       Cockpit mobile-first pour Hamza Koh (Head of Data, Digital & AI) — branché sur un agent Copilot Studio (Microsoft 365 Agents SDK / Power Platform API). Authentification SSO Microsoft 365 obligatoire (OAuth 2.0 Authorization Code + PKCE), relais côté serveur pour appeler l'API Copilot Studio sans exposer le token au browser.
 * Version:           0.2.6
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       atlas
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'ATLAS_VER', '0.2.6' );
define( 'ATLAS_URL', plugin_dir_url( __FILE__ ) );
define( 'ATLAS_DIR', plugin_dir_path( __FILE__ ) );

require_once ATLAS_DIR . 'includes/settings.php';
require_once ATLAS_DIR . 'includes/sso.php';
require_once ATLAS_DIR . 'includes/chat.php';

/* -------------------------------------------------------------------------
 * Settings access — single option blob, server-side only.
 * Sensitive values (client_secret, refresh tokens) are NEVER exposed to
 * the front-end; the JS bridge only ships URLs and the user's display
 * identity.
 * ---------------------------------------------------------------------- */
function atlas_opt( $key, $default = '' ) {
	$o = get_option( 'atlas_settings', array() );
	return isset( $o[ $key ] ) && $o[ $key ] !== '' ? $o[ $key ] : $default;
}

function atlas_save_opt( $key, $value ) {
	$o = get_option( 'atlas_settings', array() );
	$o[ $key ] = $value;
	update_option( 'atlas_settings', $o, false ); // autoload=false: secrets out of the autoloaded blob
}

function atlas_defaults() {
	return array(
		'azure_tenant_id'        => '',
		'azure_client_id'        => '',
		'azure_client_secret'    => '',
		'cps_connection_string'  => '', // Copilot Studio "Application Web" connection URL
		'sharepoint_base_url'    => '', // ex https://eocp.sharepoint.com/sites/DataNutricrops — pour construire des URLs de recherche quand l'agent cite un fichier sans URL
		'allowed_upns'           => '',
		'display_name'           => 'Hamza',
	);
}

/* -------------------------------------------------------------------------
 * Configuration check — Atlas needs:
 *   1. The Copilot Studio connection string (from Channels → Application Web)
 *   2. An Azure AD app registration (Tenant / Client / Secret) with the
 *      Power Platform "CopilotStudio.Copilots.Invoke" delegated scope
 *   3. At least one UPN in the whitelist
 * Without all three, the app refuses to serve.
 * ---------------------------------------------------------------------- */
function atlas_is_configured() {
	return atlas_opt( 'cps_connection_string' )
		&& atlas_opt( 'azure_tenant_id' )
		&& atlas_opt( 'azure_client_id' )
		&& atlas_opt( 'azure_client_secret' )
		&& trim( atlas_opt( 'allowed_upns' ) ) !== '';
}

/* -------------------------------------------------------------------------
 * Parse the Copilot Studio connection string into its components.
 *
 * Input  : https://{env}.environment.api.powerplatform.com/copilotstudio/
 *          dataverse-backed/authenticated/bots/{schema}/conversations?api-version=2022-03-01-preview
 *
 * Output : array(
 *   'base_url'     => 'https://{env}...com/copilotstudio/.../bots/{schema}',
 *   'conv_url'     => '{base_url}/conversations',
 *   'api_version'  => '2022-03-01-preview',
 *   'schema_name'  => '{schema}',
 *   'env_id'       => '{env}',
 *   'raw'          => '<original URL>',
 * )
 *
 * The URL Copilot Studio gives us points to the "start conversation"
 * endpoint. To send a message into an existing conversation, we append
 * /{conversationId} to base_url + /conversations.
 * ---------------------------------------------------------------------- */
function atlas_parse_connection_string( $url ) {
	if ( ! $url ) return null;
	$parts = wp_parse_url( $url );
	if ( ! is_array( $parts ) || empty( $parts['host'] ) || empty( $parts['path'] ) ) return null;

	// Strip the trailing /conversations (and anything after) to get the base bot URL.
	$path = $parts['path'];
	$pos = stripos( $path, '/conversations' );
	if ( $pos === false ) return null;
	$base_path = substr( $path, 0, $pos );

	// Pull api-version out of the query string.
	$api_version = '2022-03-01-preview';
	if ( ! empty( $parts['query'] ) ) {
		parse_str( $parts['query'], $q );
		if ( ! empty( $q['api-version'] ) ) $api_version = $q['api-version'];
	}

	// Schema name = last path segment of the base.
	$schema = basename( $base_path );

	// Env id = first label of the host (before .environment.api…)
	$env_id = strstr( $parts['host'], '.', true );

	$scheme = isset( $parts['scheme'] ) ? $parts['scheme'] : 'https';
	$base_url = $scheme . '://' . $parts['host'] . $base_path;

	return array(
		'base_url'    => $base_url,
		'conv_url'    => $base_url . '/conversations',
		'api_version' => $api_version,
		'schema_name' => $schema,
		'env_id'      => $env_id,
		'raw'         => $url,
	);
}

/* -------------------------------------------------------------------------
 * Whitelist check — is this UPN allowed?
 * ---------------------------------------------------------------------- */
function atlas_upn_allowed( $upn ) {
	$raw = atlas_opt( 'allowed_upns', '' );
	if ( $raw === '' ) return false;
	$upn = strtolower( trim( $upn ) );
	foreach ( preg_split( "/[\\r\\n,;]+/", $raw ) as $line ) {
		$line = strtolower( trim( $line ) );
		if ( $line === '' ) continue;
		if ( $line === $upn ) return true;
		// Domain wildcard: @ocp.ma matches any *@ocp.ma
		if ( str_starts_with( $line, '@' ) && str_ends_with( $upn, $line ) ) return true;
	}
	return false;
}

/* -------------------------------------------------------------------------
 * Atlas session marker + token storage.
 *
 * After a successful SSO, sso.php calls atlas_session_set() with the
 * tokens it received from Microsoft. We store:
 *   - access_token  : short-lived (~1h), used for direct calls right away
 *   - refresh_token : long-lived, used to mint new access tokens on demand
 *   - expires_at    : unix timestamp when access_token stops working
 *
 * The Copilot Studio scope and the OIDC scopes are requested together
 * during the SSO consent step, so both kinds of tokens end up in the
 * same response and we only need one Microsoft round trip per login.
 *
 * Tokens are user-scoped (stored in usermeta). If a different user logs
 * in, they get their own tokens — no cross-contamination.
 * ---------------------------------------------------------------------- */
function atlas_session_is_valid() {
	if ( ! is_user_logged_in() ) return false;
	$uid = get_current_user_id();
	$expires = (int) get_user_meta( $uid, 'atlas_session_expires', true );
	return $expires > time();
}

function atlas_session_set( $user_id, $upn, $name, $access_token, $refresh_token, $access_token_expires_in ) {
	$exp = time() + 8 * HOUR_IN_SECONDS;
	update_user_meta( $user_id, 'atlas_session_expires', $exp );
	update_user_meta( $user_id, 'atlas_session_upn',     sanitize_email( $upn ) );
	update_user_meta( $user_id, 'atlas_session_name',    sanitize_text_field( $name ) );
	update_user_meta( $user_id, 'atlas_cps_access_token',  $access_token );
	update_user_meta( $user_id, 'atlas_cps_refresh_token', $refresh_token );
	update_user_meta( $user_id, 'atlas_cps_access_expires_at', time() + max( 60, (int) $access_token_expires_in - 60 ) );
}

function atlas_session_clear( $user_id ) {
	delete_user_meta( $user_id, 'atlas_session_expires' );
	delete_user_meta( $user_id, 'atlas_session_upn' );
	delete_user_meta( $user_id, 'atlas_session_name' );
	delete_user_meta( $user_id, 'atlas_cps_access_token' );
	delete_user_meta( $user_id, 'atlas_cps_refresh_token' );
	delete_user_meta( $user_id, 'atlas_cps_access_expires_at' );
}

/* -------------------------------------------------------------------------
 * Pretty URL /atlas + shortcode.
 * Both gates require the plugin to be fully configured and the current
 * user to have a valid Atlas SSO session.
 * ---------------------------------------------------------------------- */
function atlas_add_rewrite() {
	add_rewrite_rule( '^atlas/?$', 'index.php?atlas_app=1', 'top' );
}
add_action( 'init', 'atlas_add_rewrite' );

add_filter( 'query_vars', function ( $vars ) {
	$vars[] = 'atlas_app';
	return $vars;
} );

register_activation_hook( __FILE__, function () {
	atlas_add_rewrite();
	flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

add_action( 'template_redirect', function () {
	if ( ! intval( get_query_var( 'atlas_app' ) ) ) return;

	if ( ! atlas_is_configured() ) {
		wp_die( 'Atlas n\'est pas complètement configuré. Va dans Settings → Atlas et remplis : connection string Copilot Studio, App Registration Azure AD, whitelist UPN.' );
	}

	if ( ! atlas_session_is_valid() ) {
		wp_redirect( add_query_arg( array(
			'atlas_sso'   => 'start',
			'redirect_to' => rawurlencode( home_url( '/atlas' ) ),
		), home_url( '/' ) ) );
		exit;
	}

	$f = ATLAS_DIR . 'app/atlas.html';
	if ( ! file_exists( $f ) ) {
		wp_die( 'Atlas UI file is missing.' );
	}

	$uid  = get_current_user_id();
	$name = get_user_meta( $uid, 'atlas_session_name', true ) ?: atlas_opt( 'display_name', 'Hamza' );
	$upn  = get_user_meta( $uid, 'atlas_session_upn',  true );

	nocache_headers();
	header( 'Content-Type: text/html; charset=utf-8' );
	header( 'X-Frame-Options: SAMEORIGIN' );
	header( 'Referrer-Policy: strict-origin-when-cross-origin' );

	$html = file_get_contents( $f );

	$bridge = '<script>window.ATLAS=' . wp_json_encode( array(
		'start_url'    => esc_url_raw( rest_url( 'atlas/v1/start' ) ),
		'send_url'     => esc_url_raw( rest_url( 'atlas/v1/send' ) ),
		'logout_url'   => esc_url_raw( add_query_arg( 'atlas_sso', 'logout', home_url( '/' ) ) ),
		'sp_base'      => esc_url_raw( atlas_opt( 'sharepoint_base_url' ) ),
		'user'         => array(
			'name' => $name,
			'upn'  => $upn,
		),
		'nonce'        => wp_create_nonce( 'wp_rest' ),
		'ver'          => ATLAS_VER,
	) ) . ';</script>';

	echo str_replace( '</head>', $bridge . "\n</head>", $html );
	exit;
} );

/* -------------------------------------------------------------------------
 * Shortcode [atlas]  — iframe-based embed.
 *
 * The iframe loads /atlas, which serves the fully-wired cockpit (bridge
 * + styles + JS). This isolates Atlas from the host theme's CSS and
 * lets the same auth + REST endpoints run regardless of where it's
 * embedded. X-Frame-Options: SAMEORIGIN (set in template_redirect)
 * allows same-site iframing only.
 *
 * Attributes:
 *   [atlas]                 → defaults: max-width 430px, height 900px
 *   [atlas height="700"]    → custom pixel height
 *   [atlas width="100%"]    → override the desktop max-width
 * ---------------------------------------------------------------------- */
add_shortcode( 'atlas', function ( $atts ) {
	$a = shortcode_atts( array(
		'height' => '900',
		'width'  => '430',
	), $atts, 'atlas' );

	if ( ! atlas_is_configured() ) {
		return '<p><em>Atlas n\'est pas configuré.</em></p>';
	}

	// Sanitize: digits only for px, or allow a trailing "%"/"vh"/"vw".
	$sanitize_dim = function ( $v, $default ) {
		$v = trim( (string) $v );
		if ( preg_match( '/^\d+(px|%|vh|vw)?$/', $v ) ) {
			return preg_match( '/[a-z%]$/', $v ) ? $v : $v . 'px';
		}
		return $default;
	};
	$h = $sanitize_dim( $a['height'], '900px' );
	$w = $sanitize_dim( $a['width'],  '430px' );

	$src = esc_url( home_url( '/atlas' ) );
	$style = sprintf(
		'display:block;margin:0 auto;width:100%%;max-width:%s;height:%s;border:0;border-radius:12px;',
		esc_attr( $w ), esc_attr( $h )
	);

	return sprintf(
		'<iframe src="%s" style="%s" loading="lazy" allowfullscreen referrerpolicy="same-origin" title="Atlas — second cerveau D²nAI"></iframe>',
		$src, $style
	);
} );
