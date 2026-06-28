<?php
/**
 * NutriView — Proxy de scan d'URL (Phase 7).
 *
 * Un navigateur ne peut pas récupérer une URL tierce (CORS). Le front délègue
 * donc à ce proxy souverain : WordPress (côté serveur Nutricrops) récupère la
 * page, en extrait le texte visible, et le renvoie au front qui le passe au
 * pipeline d'extraction (objets-donnée + auto-mapping data domain).
 *
 * Endpoint :
 *   POST /wp-json/dnai/nview/v1/scan-url   { url }   (auth nonce, cap edit_posts)
 *     → { url, text, bytes, truncated }
 *
 * Garde-fous :
 *   - schéma http/https uniquement ;
 *   - timeout court (wp_remote_get) ;
 *   - taille de réponse plafonnée (extraction texte tronquée) ;
 *   - seuls les content-types HTML/texte sont exploités.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

if ( ! defined( 'DNAI_NVIEW_SCAN_NS' ) ) {
	define( 'DNAI_NVIEW_SCAN_NS', 'dnai/nview/v1' );
}
define( 'DNAI_NVIEW_SCAN_MAX_BYTES', 2 * 1024 * 1024 ); // 2 Mo de HTML max
define( 'DNAI_NVIEW_SCAN_MAX_TEXT', 60000 );            // 60k caractères de texte

/** Permission : utilisateur connecté pouvant éditer (same-origin nonce). */
function dnai_nview_scan_can() {
	return current_user_can( 'edit_posts' );
}

/** Extrait le texte visible d'un document HTML (sans script/style/nav chrome). */
function dnai_nview_scan_html_to_text( $html ) {
	// Retire les blocs non visibles / non pertinents.
	$html = preg_replace( '#<script\b[^>]*>.*?</script>#is', ' ', $html );
	$html = preg_replace( '#<style\b[^>]*>.*?</style>#is', ' ', $html );
	$html = preg_replace( '#<noscript\b[^>]*>.*?</noscript>#is', ' ', $html );
	$html = preg_replace( '#<!--.*?-->#s', ' ', $html );
	// Les balises de bloc deviennent des sauts de ligne (préserve la structure).
	$html = preg_replace( '#<(br|/p|/div|/li|/h[1-6]|/tr|/td|/th)\b[^>]*>#i', "\n", $html );
	$text = wp_strip_all_tags( $html );
	$text = html_entity_decode( $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	// Normalise les espaces et lignes vides multiples.
	$text = preg_replace( "/[ \t]+/", ' ', $text );
	$text = preg_replace( "/\n\s*\n\s*\n+/", "\n\n", $text );
	$text = trim( $text );
	$truncated = false;
	if ( strlen( $text ) > DNAI_NVIEW_SCAN_MAX_TEXT ) {
		$text      = substr( $text, 0, DNAI_NVIEW_SCAN_MAX_TEXT );
		$truncated = true;
	}
	return array( 'text' => $text, 'truncated' => $truncated );
}

function dnai_nview_scan_rest( $request ) {
	$body = $request->get_json_params();
	$url  = isset( $body['url'] ) ? trim( (string) $body['url'] ) : '';

	if ( $url === '' ) {
		return new WP_Error( 'missing_url', 'URL manquante.', array( 'status' => 400 ) );
	}
	$parts = wp_parse_url( $url );
	$scheme = isset( $parts['scheme'] ) ? strtolower( $parts['scheme'] ) : '';
	if ( ! in_array( $scheme, array( 'http', 'https' ), true ) ) {
		return new WP_Error( 'bad_scheme', 'Seules les URL http(s) sont acceptées.', array( 'status' => 400 ) );
	}

	$res = wp_remote_get(
		$url,
		array(
			'timeout'             => 12,
			'redirection'         => 3,
			'limit_response_size' => DNAI_NVIEW_SCAN_MAX_BYTES,
			'user-agent'          => 'NutriView-Scanner/1.0 (+OCP Nutricrops souverain)',
			'headers'             => array( 'Accept' => 'text/html,application/xhtml+xml,text/plain' ),
		)
	);

	if ( is_wp_error( $res ) ) {
		return new WP_Error(
			'fetch_failed',
			'Impossible de récupérer l\'URL : ' . $res->get_error_message(),
			array( 'status' => 502 )
		);
	}

	$code = wp_remote_retrieve_response_code( $res );
	if ( $code < 200 || $code >= 400 ) {
		return new WP_Error(
			'http_status',
			'La cible a répondu HTTP ' . $code . '.',
			array( 'status' => 502 )
		);
	}

	$ctype = strtolower( (string) wp_remote_retrieve_header( $res, 'content-type' ) );
	if ( $ctype !== '' && strpos( $ctype, 'html' ) === false && strpos( $ctype, 'text' ) === false && strpos( $ctype, 'xml' ) === false ) {
		return new WP_Error(
			'unsupported_type',
			'Type de contenu non exploitable (' . $ctype . '). Attendu HTML/texte.',
			array( 'status' => 415 )
		);
	}

	$html = (string) wp_remote_retrieve_body( $res );
	$bytes = strlen( $html );
	$parsed = dnai_nview_scan_html_to_text( $html );

	return array(
		'url'       => esc_url_raw( $url ),
		'text'      => $parsed['text'],
		'bytes'     => $bytes,
		'truncated' => $parsed['truncated'],
	);
}

add_action( 'rest_api_init', function () {
	register_rest_route( DNAI_NVIEW_SCAN_NS, '/scan-url', array(
		'methods'             => 'POST',
		'callback'            => 'dnai_nview_scan_rest',
		'permission_callback' => 'dnai_nview_scan_can',
	) );
} );

/* Flag front : le scan d'URL est disponible. */
add_filter( 'dnai_nview_boot_config', function ( $cfg ) {
	$cfg['scanReady'] = true;
	return $cfg;
} );
