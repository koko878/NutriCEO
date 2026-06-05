<?php
/**
 * Plugin Name:       D²nAI Office — Hamza's digital twin console
 * Description:       Admin console for the D²nAI Office agent that runs on the manager's Windows machine. Lets the operator configure contacts (whitelist / blacklist / watchlist), allowed topics, persona, signature and view the activity log of the local agent. The agent itself reads its config from %APPDATA%\dnai-office\config.json on the user's PC — this plugin serves the JSON via a REST endpoint the agent calls home to.
 * Version:           0.1.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-office
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_OFFICE_VER', '0.1.0' );
define( 'DNAI_OFFICE_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_OFFICE_DIR', plugin_dir_path( __FILE__ ) );

/* -------------------------------------------------------------------------
 * Settings helpers — single option blob keyed by WP user id, so the same
 * plugin instance can serve multiple managers down the line (V2 product
 * play). Each manager has their own config payload.
 * ---------------------------------------------------------------------- */
function dnai_office_opt_for_user( $user_id, $key = null, $default = '' ) {
	$o = get_option( 'dnai_office_configs', array() );
	$payload = isset( $o[ $user_id ] ) ? $o[ $user_id ] : array();
	if ( $key === null ) return $payload;
	return isset( $payload[ $key ] ) && $payload[ $key ] !== '' ? $payload[ $key ] : $default;
}

function dnai_office_save_user_config( $user_id, $payload ) {
	$o = get_option( 'dnai_office_configs', array() );
	$o[ (int) $user_id ] = $payload;
	update_option( 'dnai_office_configs', $o );
}

function dnai_office_default_config() {
	return array(
		'backend_url'         => '',
		'backend_token'       => '',
		'poll_seconds'        => 30,
		'delay_send_minutes'  => 5,
		'delay_send_enabled'  => true,
		'digest_to'           => '',
		'personal_context'    => '',
		'whitelist'           => array(),
		'blacklist'           => array(),
		'watchlist'           => array(),
		'allowed_topics'      => array( 'project_questions', 'info_requests', 'meeting_screening', 'contact_routing' ),
		'auto_send_enabled'   => false,
		'signature'           => "Hamza's digital twin — D²nAI",
	);
}

/* -------------------------------------------------------------------------
 * FULL-SCREEN route — pretty URL /dnai-office for the console.
 * Same pattern as the NutriPlan plugin.
 * ---------------------------------------------------------------------- */
function dnai_office_add_rewrite() {
	add_rewrite_rule( '^dnai-office/?$', 'index.php?dnai_office_app=1', 'top' );
}
add_action( 'init', 'dnai_office_add_rewrite' );

add_filter( 'query_vars', function ( $vars ) { $vars[] = 'dnai_office_app'; return $vars; } );

register_activation_hook( __FILE__, function () {
	dnai_office_add_rewrite();
	flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

add_action( 'template_redirect', function () {
	if ( ! intval( get_query_var( 'dnai_office_app' ) ) ) { return; }
	if ( ! is_user_logged_in() ) { auth_redirect(); exit; }
	$f = DNAI_OFFICE_DIR . 'app/console.html';
	if ( ! file_exists( $f ) ) { return; }

	$user_id = get_current_user_id();
	$cfg = array_merge( dnai_office_default_config(), dnai_office_opt_for_user( $user_id ) );

	nocache_headers();
	header( 'Content-Type: text/html; charset=utf-8' );
	$html = file_get_contents( $f );
	$bridge = '<script>window.DNAI_OFFICE=' . wp_json_encode( array(
		'config'  => $cfg,
		'save'    => esc_url_raw( rest_url( 'dnai-office/v1/config' ) ),
		'agent'   => esc_url_raw( rest_url( 'dnai-office/v1/agent-config' ) ),
		'log'     => esc_url_raw( rest_url( 'dnai-office/v1/activity' ) ),
		'nonce'   => wp_create_nonce( 'wp_rest' ),
		'user'    => wp_get_current_user()->display_name,
		'ver'     => DNAI_OFFICE_VER,
	) ) . ';</script>';
	echo str_replace( '</head>', $bridge . "\n</head>", $html );
	exit;
} );

/* -------------------------------------------------------------------------
 * REST endpoints
 * /v1/config        : GET/POST — read + write the current user's config
 * /v1/agent-config  : GET      — the agent on the PC fetches this URL with
 *                                its bearer token (own to the user) to
 *                                receive the latest config JSON, so the
 *                                operator doesn't need to manually copy a
 *                                file to %APPDATA%
 * /v1/activity      : POST     — the agent pushes activity entries here,
 *                                we keep them in user meta for the log UI
 * ---------------------------------------------------------------------- */
function dnai_office_perm_self( $req ) {
	if ( current_user_can( 'read' ) ) { return true; }
	// Agent posting with a per-user agent token (stored in user meta).
	$auth = $req->get_header( 'authorization' );
	if ( $auth && preg_match( '/Bearer\\s+(.+)/i', $auth, $m ) ) {
		$token = trim( $m[1] );
		global $wpdb;
		$user_id = $wpdb->get_var( $wpdb->prepare(
			"SELECT user_id FROM {$wpdb->usermeta} WHERE meta_key = %s AND meta_value = %s LIMIT 1",
			'dnai_office_agent_token', $token
		) );
		if ( $user_id ) {
			wp_set_current_user( $user_id );
			return true;
		}
	}
	return false;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'dnai-office/v1', '/config', array(
		'methods'             => array( 'GET', 'POST' ),
		'permission_callback' => 'dnai_office_perm_self',
		'callback'            => 'dnai_office_rest_config',
	) );
	register_rest_route( 'dnai-office/v1', '/agent-config', array(
		'methods'             => 'GET',
		'permission_callback' => 'dnai_office_perm_self',
		'callback'            => function () {
			$user_id = get_current_user_id();
			$cfg = array_merge( dnai_office_default_config(), dnai_office_opt_for_user( $user_id ) );
			return new WP_REST_Response( $cfg, 200 );
		},
	) );
	register_rest_route( 'dnai-office/v1', '/activity', array(
		'methods'             => 'POST',
		'permission_callback' => 'dnai_office_perm_self',
		'callback'            => 'dnai_office_rest_activity',
	) );
} );

function dnai_office_rest_config( $req ) {
	$user_id = get_current_user_id();
	if ( $req->get_method() === 'GET' ) {
		$cfg = array_merge( dnai_office_default_config(), dnai_office_opt_for_user( $user_id ) );
		return new WP_REST_Response( $cfg, 200 );
	}
	$body = $req->get_json_params();
	if ( ! is_array( $body ) ) { $body = array(); }
	$current = array_merge( dnai_office_default_config(), dnai_office_opt_for_user( $user_id ) );
	// Whitelist of editable fields — we never let a payload write arbitrary keys.
	$editable = array(
		'backend_url', 'backend_token',
		'poll_seconds', 'delay_send_minutes', 'delay_send_enabled',
		'digest_to', 'personal_context',
		'whitelist', 'blacklist', 'watchlist',
		'allowed_topics', 'auto_send_enabled', 'signature',
	);
	foreach ( $editable as $k ) {
		if ( array_key_exists( $k, $body ) ) {
			$current[ $k ] = $body[ $k ];
		}
	}
	dnai_office_save_user_config( $user_id, $current );
	return new WP_REST_Response( array( 'ok' => true, 'config' => $current ), 200 );
}

function dnai_office_rest_activity( $req ) {
	$user_id = get_current_user_id();
	$entries = $req->get_json_params();
	if ( ! is_array( $entries ) ) { return new WP_REST_Response( array( 'error' => 'invalid_payload' ), 400 ); }
	// Append to a circular buffer of the last 500 entries per user.
	$log = get_user_meta( $user_id, 'dnai_office_activity', true );
	if ( ! is_array( $log ) ) { $log = array(); }
	foreach ( $entries as $e ) {
		$log[] = $e;
	}
	if ( count( $log ) > 500 ) { $log = array_slice( $log, -500 ); }
	update_user_meta( $user_id, 'dnai_office_activity', $log );
	return new WP_REST_Response( array( 'ok' => true, 'count' => count( $log ) ), 200 );
}
