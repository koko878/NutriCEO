<?php
/**
 * Plugin Name:       Atlas — Second cerveau D²nAI
 * Description:       Cockpit mobile-first pour Hamza Koh (Head of Data, Digital & AI) — branché sur un agent Copilot Studio via Direct Line, accès aux mails et au SharePoint via Microsoft 365 SSO. Accès restreint par whitelist d'adresses UPN.
 * Version:           0.1.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       atlas
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'ATLAS_VER', '0.1.0' );
define( 'ATLAS_URL', plugin_dir_url( __FILE__ ) );
define( 'ATLAS_DIR', plugin_dir_path( __FILE__ ) );

require_once ATLAS_DIR . 'includes/settings.php';
require_once ATLAS_DIR . 'includes/sso.php';
require_once ATLAS_DIR . 'includes/token.php';

/* -------------------------------------------------------------------------
 * Settings access — single option blob, server-side only.
 * Sensitive values (client_secret, directline_secret) are NEVER exposed
 * to the front-end; the JS bridge below only ships URLs and the user's
 * display identity, never the credentials themselves.
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
		'azure_tenant_id'    => '',
		'azure_client_id'    => '',
		'azure_client_secret'=> '',
		'directline_secret'  => '',
		'allowed_upns'       => '', // newline-separated
		'display_name'       => 'Hamza',
	);
}

/* -------------------------------------------------------------------------
 * Whitelist check — is this UPN allowed to use Atlas?
 * ---------------------------------------------------------------------- */
function atlas_upn_allowed( $upn ) {
	$raw = atlas_opt( 'allowed_upns', '' );
	if ( $raw === '' ) return false;
	$upn = strtolower( trim( $upn ) );
	foreach ( preg_split( "/[\\r\\n,;]+/", $raw ) as $line ) {
		$line = strtolower( trim( $line ) );
		if ( $line === '' ) continue;
		if ( $line === $upn ) return true;
		// domain wildcard: @ocp.ma matches any *@ocp.ma
		if ( str_starts_with( $line, '@' ) && str_ends_with( $upn, $line ) ) return true;
	}
	return false;
}

/* -------------------------------------------------------------------------
 * Atlas session marker — set by sso.php after a successful MS365 login.
 * Stored in user meta, expires after 8h. We do not reuse the WP login
 * because some installs use WP for other purposes — Atlas SSO is scoped
 * to Atlas only.
 * ---------------------------------------------------------------------- */
function atlas_session_is_valid() {
	if ( ! is_user_logged_in() ) return false;
	$uid = get_current_user_id();
	$expires = (int) get_user_meta( $uid, 'atlas_session_expires', true );
	return $expires > time();
}

function atlas_session_set( $user_id, $upn, $name ) {
	$exp = time() + 8 * HOUR_IN_SECONDS;
	update_user_meta( $user_id, 'atlas_session_expires', $exp );
	update_user_meta( $user_id, 'atlas_session_upn',     sanitize_email( $upn ) );
	update_user_meta( $user_id, 'atlas_session_name',    sanitize_text_field( $name ) );
}

function atlas_session_clear( $user_id ) {
	delete_user_meta( $user_id, 'atlas_session_expires' );
	delete_user_meta( $user_id, 'atlas_session_upn' );
	delete_user_meta( $user_id, 'atlas_session_name' );
}

/* -------------------------------------------------------------------------
 * Pretty URL /atlas — serves app/atlas.html with the WP bridge injected.
 * Anyone not logged in via MS365 SSO is redirected to the SSO start URL.
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

	if ( ! atlas_session_is_valid() ) {
		wp_redirect( add_query_arg( array(
			'atlas_sso' => 'start',
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
	// Strong security headers — Atlas is a private app, no need for cross-origin embedding.
	header( 'X-Frame-Options: SAMEORIGIN' );
	header( 'Referrer-Policy: strict-origin-when-cross-origin' );

	$html = file_get_contents( $f );

	// Bridge object — URLs only, NEVER the secrets.
	$bridge = '<script>window.ATLAS=' . wp_json_encode( array(
		'token_url'  => esc_url_raw( rest_url( 'atlas/v1/token' ) ),
		'logout_url' => esc_url_raw( add_query_arg( 'atlas_sso', 'logout', home_url( '/' ) ) ),
		'user'       => array(
			'name' => $name,
			'upn'  => $upn,
		),
		'nonce'      => wp_create_nonce( 'wp_rest' ),
		'ver'        => ATLAS_VER,
	) ) . ';</script>';

	echo str_replace( '</head>', $bridge . "\n</head>", $html );
	exit;
} );

/* -------------------------------------------------------------------------
 * Shortcode [atlas] — embed inside any WP page (e.g. for staging).
 * Same SSO gate as the pretty URL.
 * ---------------------------------------------------------------------- */
add_shortcode( 'atlas', function () {
	if ( ! atlas_session_is_valid() ) {
		$start = add_query_arg( array(
			'atlas_sso'   => 'start',
			'redirect_to' => rawurlencode( get_permalink() ),
		), home_url( '/' ) );
		return '<p><a href="' . esc_url( $start ) . '">Se connecter à Atlas avec Microsoft 365</a></p>';
	}
	$f = ATLAS_DIR . 'app/atlas.html';
	if ( ! file_exists( $f ) ) return '';
	$html = file_get_contents( $f );
	// Crude extraction of the <body> innards for shortcode embedding.
	if ( preg_match( '/<body[^>]*>(.*)<\\/body>/s', $html, $m ) ) {
		return '<div class="atlas-embed">' . $m[1] . '</div>';
	}
	return $html;
} );
