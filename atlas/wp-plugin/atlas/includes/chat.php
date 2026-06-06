<?php
/**
 * Server-side relay to the Copilot Studio Direct-to-Engine API.
 *
 * The browser never talks to Microsoft directly — it POSTs to two REST
 * endpoints on this WordPress install, which then forward the request
 * to api.powerplatform.com using the user's OAuth access token. This
 * keeps the token out of the browser entirely.
 *
 * Endpoints:
 *   POST /wp-json/atlas/v1/start
 *     → { conversationId, activities: [Activity...] }
 *
 *   POST /wp-json/atlas/v1/send
 *     body: { conversationId: string, text: string, locale?: string }
 *     → { activities: [Activity...] }
 *
 * Microsoft's API answers in Server-Sent Events (text/event-stream).
 * We consume the stream synchronously, parse activity events, and
 * collapse them into a JSON array for the browser. This is fine for
 * Atlas because each turn is short (a few activities at most).
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'rest_api_init', function () {
	register_rest_route( 'atlas/v1', '/start', array(
		'methods'             => 'POST',
		'permission_callback' => 'atlas_chat_perm',
		'callback'            => 'atlas_chat_start',
	) );
	register_rest_route( 'atlas/v1', '/send', array(
		'methods'             => 'POST',
		'permission_callback' => 'atlas_chat_perm',
		'callback'            => 'atlas_chat_send',
	) );
} );

function atlas_chat_perm() {
	if ( ! atlas_session_is_valid() ) return false;
	$nonce = isset( $_SERVER['HTTP_X_WP_NONCE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_WP_NONCE'] ) ) : '';
	if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) return false;
	return true;
}

/* -------------------------------------------------------------------------
 * POST /atlas/v1/start — opens a Copilot Studio conversation.
 * ---------------------------------------------------------------------- */
function atlas_chat_start( $req ) {
	$body = $req->get_json_params();
	$locale = is_array( $body ) && ! empty( $body['locale'] ) ? sanitize_text_field( $body['locale'] ) : 'fr-FR';

	$conn = atlas_parse_connection_string( atlas_opt( 'cps_connection_string' ) );
	if ( ! $conn ) {
		return new WP_REST_Response( array( 'error' => 'invalid_connection_string' ), 500 );
	}

	$token = atlas_sso_get_fresh_cps_token( get_current_user_id() );
	if ( ! $token ) {
		return new WP_REST_Response( array( 'error' => 'session_expired', 'detail' => 'Re-login required' ), 401 );
	}

	$url = add_query_arg( 'api-version', $conn['api_version'], $conn['conv_url'] );

	$resp = wp_remote_post( $url, array(
		'timeout' => 60,
		'headers' => array(
			'Authorization' => 'Bearer ' . $token,
			'Content-Type'  => 'application/json',
			'Accept'        => 'text/event-stream',
			'User-Agent'    => 'Atlas-WP/' . ATLAS_VER,
		),
		'body'    => wp_json_encode( array(
			'emitStartConversationEvent' => true,
			'locale' => $locale,
		) ),
	) );

	$parsed = atlas_chat_parse_response( $resp );
	if ( $parsed instanceof WP_REST_Response ) return $parsed;

	// Conversation id: usually present on the first activity's `conversation.id`,
	// sometimes also exposed via header.
	$conv_id = null;
	foreach ( $parsed['activities'] as $a ) {
		if ( ! empty( $a['conversation']['id'] ) ) {
			$conv_id = $a['conversation']['id'];
			break;
		}
	}
	if ( ! $conv_id ) {
		$hdrs = wp_remote_retrieve_headers( $resp );
		$conv_id = $hdrs['x-ms-conversationid'] ?? ( $hdrs['conversationid'] ?? null );
	}

	return new WP_REST_Response( array(
		'conversationId' => $conv_id,
		'activities'     => $parsed['activities'],
	), 200 );
}

/* -------------------------------------------------------------------------
 * POST /atlas/v1/send — sends one user activity into an existing
 * conversation and returns whatever the agent replies in the same turn.
 * ---------------------------------------------------------------------- */
function atlas_chat_send( $req ) {
	$body = $req->get_json_params();
	if ( ! is_array( $body ) || empty( $body['conversationId'] ) || ! isset( $body['text'] ) ) {
		return new WP_REST_Response( array( 'error' => 'missing_params' ), 400 );
	}
	$conv_id = sanitize_text_field( $body['conversationId'] );
	$text    = (string) $body['text'];
	$locale  = ! empty( $body['locale'] ) ? sanitize_text_field( $body['locale'] ) : 'fr-FR';

	$conn = atlas_parse_connection_string( atlas_opt( 'cps_connection_string' ) );
	if ( ! $conn ) {
		return new WP_REST_Response( array( 'error' => 'invalid_connection_string' ), 500 );
	}

	$uid   = get_current_user_id();
	$token = atlas_sso_get_fresh_cps_token( $uid );
	if ( ! $token ) {
		return new WP_REST_Response( array( 'error' => 'session_expired' ), 401 );
	}

	$upn  = (string) get_user_meta( $uid, 'atlas_session_upn',  true );
	$name = (string) get_user_meta( $uid, 'atlas_session_name', true );
	$from_id = 'user-' . substr( hash( 'sha256', $upn ?: 'anon' ), 0, 24 );

	$url = add_query_arg( 'api-version', $conn['api_version'], $conn['conv_url'] . '/' . rawurlencode( $conv_id ) );

	$payload = array(
		'activity' => array(
			'type'   => 'message',
			'text'   => $text,
			'locale' => $locale,
			'from'   => array(
				'id'   => $from_id,
				'name' => $name ?: 'user',
				'role' => 'user',
			),
		),
	);

	$resp = wp_remote_post( $url, array(
		'timeout' => 120, // agent answers can take a while when knowledge retrieval is involved
		'headers' => array(
			'Authorization' => 'Bearer ' . $token,
			'Content-Type'  => 'application/json',
			'Accept'        => 'text/event-stream',
			'User-Agent'    => 'Atlas-WP/' . ATLAS_VER,
		),
		'body'    => wp_json_encode( $payload ),
	) );

	$parsed = atlas_chat_parse_response( $resp );
	if ( $parsed instanceof WP_REST_Response ) return $parsed;

	return new WP_REST_Response( array(
		'activities' => $parsed['activities'],
	), 200 );
}

/* -------------------------------------------------------------------------
 * Parse a Copilot Studio response. The body can be:
 *
 *   - text/event-stream: a sequence of SSE blocks, each containing one
 *     `event: activity\ndata: {...JSON...}` triple plus optional terminator
 *     `event: end`. This is the normal path.
 *
 *   - application/json: a single error object (when MS returns a 4xx/5xx
 *     it sometimes downgrades to JSON instead of SSE).
 *
 * Returns either:
 *   - array{ activities: array<Activity> }  on success
 *   - WP_REST_Response  on transport / upstream errors (forwarded verbatim)
 * ---------------------------------------------------------------------- */
function atlas_chat_parse_response( $resp ) {
	if ( is_wp_error( $resp ) ) {
		return new WP_REST_Response( array( 'error' => 'upstream_network', 'detail' => $resp->get_error_message() ), 502 );
	}
	$status = wp_remote_retrieve_response_code( $resp );
	$body   = wp_remote_retrieve_body( $resp );

	if ( $status < 200 || $status >= 300 ) {
		// Microsoft usually puts a JSON error body even on 4xx.
		$decoded = json_decode( $body, true );
		return new WP_REST_Response( array(
			'error'  => 'upstream_' . $status,
			'detail' => is_array( $decoded ) ? $decoded : substr( $body, 0, 500 ),
		), $status >= 500 ? 502 : $status );
	}

	$activities = atlas_chat_parse_sse_activities( $body );
	return array( 'activities' => $activities );
}

/* -------------------------------------------------------------------------
 * Minimal SSE parser — extract every `event: activity` data payload.
 *
 * Format reminder (RFC 8895-ish):
 *   event: activity\n
 *   data: {"type":"message", ...}\n
 *   \n
 *   event: end\n
 *   data: end\n
 *   \n
 *
 * We tolerate CRLF, multi-line data fields, and unexpected events.
 * ---------------------------------------------------------------------- */
function atlas_chat_parse_sse_activities( $body ) {
	$out = array();
	// Normalize line endings, split on blank-line delimiter.
	$body = str_replace( "\r\n", "\n", $body );
	foreach ( explode( "\n\n", $body ) as $block ) {
		$block = trim( $block );
		if ( $block === '' ) continue;

		$event = null;
		$data_lines = array();
		foreach ( explode( "\n", $block ) as $line ) {
			if ( strpos( $line, 'event:' ) === 0 ) {
				$event = trim( substr( $line, 6 ) );
			} elseif ( strpos( $line, 'data:' ) === 0 ) {
				$data_lines[] = ltrim( substr( $line, 5 ) );
			}
		}

		if ( $event === 'activity' && ! empty( $data_lines ) ) {
			$decoded = json_decode( implode( "\n", $data_lines ), true );
			if ( is_array( $decoded ) ) {
				$out[] = $decoded;
			}
		}
		// Other events (end, error, subscriptionData, etc.) are ignored —
		// the browser only needs the activity payloads.
	}
	return $out;
}
