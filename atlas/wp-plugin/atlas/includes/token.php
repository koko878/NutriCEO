<?php
/**
 * Direct Line token endpoint.
 *
 * The browser asks /wp-json/atlas/v1/token. We:
 *  1. Verify the caller has a valid Atlas session (MS365-SSO'd).
 *  2. Exchange the server-side Direct Line *secret* for an ephemeral
 *     *token* tied to a specific user identity.
 *  3. Return the token + conversation id to the browser.
 *
 * The secret never leaves the server. The token is bound to one
 * conversation and expires in ~1 hour, so even if intercepted it
 * gives limited blast radius.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

const ATLAS_DIRECTLINE_GENERATE_URL = 'https://directline.botframework.com/v3/directline/tokens/generate';

add_action( 'rest_api_init', function () {
	register_rest_route( 'atlas/v1', '/token', array(
		'methods'             => 'POST',
		'permission_callback' => 'atlas_token_perm',
		'callback'            => 'atlas_token_handler',
	) );
} );

function atlas_token_perm() {
	if ( ! atlas_user_can_access() ) return false;
	$nonce = isset( $_SERVER['HTTP_X_WP_NONCE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_WP_NONCE'] ) ) : '';
	if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) return false;
	return true;
}

function atlas_token_handler( $req ) {
	$secret = atlas_opt( 'directline_secret' );
	if ( ! $secret ) {
		return new WP_REST_Response( array( 'error' => 'directline_not_configured' ), 500 );
	}

	$uid = get_current_user_id();
	if ( atlas_mode() === 'sso' ) {
		$upn  = get_user_meta( $uid, 'atlas_session_upn',  true );
		$name = get_user_meta( $uid, 'atlas_session_name', true );
	} else {
		$wp_user = wp_get_current_user();
		$upn  = $wp_user->user_email;
		$name = $wp_user->display_name ?: atlas_opt( 'display_name', 'Hamza' );
	}

	// Direct Line user.id must be stable and prefixed (MS convention).
	// Stable across sessions for the same WP / SSO identity, so the agent's
	// memory of "this is Hamza" survives reconnects.
	$identity_seed = $upn ? $upn : ( 'wp-user-' . $uid );
	$dl_user_id = 'dl_' . substr( hash( 'sha256', $identity_seed ), 0, 32 );

	$resp = wp_remote_post( ATLAS_DIRECTLINE_GENERATE_URL, array(
		'timeout' => 12,
		'headers' => array(
			'Authorization' => 'Bearer ' . $secret,
			'Content-Type'  => 'application/json',
		),
		'body'    => wp_json_encode( array(
			'user' => array(
				'id'   => $dl_user_id,
				'name' => $name,
			),
		) ),
	) );

	if ( is_wp_error( $resp ) ) {
		return new WP_REST_Response( array( 'error' => 'directline_network_error', 'detail' => $resp->get_error_message() ), 502 );
	}
	$code = wp_remote_retrieve_response_code( $resp );
	$body = json_decode( wp_remote_retrieve_body( $resp ), true );

	if ( $code !== 200 || empty( $body['token'] ) ) {
		return new WP_REST_Response( array( 'error' => 'directline_rejected', 'status' => $code ), 502 );
	}

	return new WP_REST_Response( array(
		'token'          => $body['token'],
		'conversationId' => isset( $body['conversationId'] ) ? $body['conversationId'] : null,
		'expires_in'     => isset( $body['expires_in'] ) ? (int) $body['expires_in'] : 3600,
		'user'           => array(
			'id'   => $dl_user_id,
			'name' => $name,
		),
	), 200 );
}
