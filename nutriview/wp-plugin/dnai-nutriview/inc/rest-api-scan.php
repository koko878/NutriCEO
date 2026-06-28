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
	$html = preg_replace( '#<head\b[^>]*>.*?</head>#is', ' ', $html );
	$html = preg_replace( '#<!--.*?-->#s', ' ', $html );
	// Les balises bloc deviennent des sauts de ligne (préserve la structure
	// ligne par ligne : titres, items de liste, cellules, lignes de tableau).
	$html = preg_replace( '#</?(p|div|li|ul|ol|h[1-6]|tr|section|article|header|footer|nav|table|thead|tbody)\b[^>]*>#i', "\n", $html );
	$html = preg_replace( '#<br\s*/?>#i', "\n", $html );
	// Les cellules deviennent des sauts de ligne : un libellé par ligne (la
	// valeur d'à côté, souvent numérique, est filtrée en aval). Évite de coller
	// « Salaire de base » et « 4500 » sur le même fragment.
	$html = preg_replace( '#</(td|th)>#i', "\n", $html );
	// TOUTES les autres balises (inline : span, a, strong…) → ESPACE, jamais
	// rien : sinon "<span>Prix</span><span>10</span>" devient "Prix10" collé
	// et l'extraction rate. C'était la cause du « 0 donnée ».
	$text = preg_replace( '#<[^>]+>#', ' ', $html );
	$text = html_entity_decode( (string) $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	// Normalise les espaces et lignes vides multiples.
	$text = preg_replace( "/[ \t]+/", ' ', $text );
	$text = preg_replace( "/[ \t]*\n[ \t]*/", "\n", $text );
	$text = preg_replace( "/\n{3,}/", "\n\n", $text );
	$text = trim( (string) $text );
	$truncated = false;
	// Découpe sur une frontière multi-octets sûre (mb_substr) pour ne pas
	// casser un caractère UTF-8 en deux.
	if ( function_exists( 'mb_strlen' ) ? mb_strlen( $text, 'UTF-8' ) > DNAI_NVIEW_SCAN_MAX_TEXT : strlen( $text ) > DNAI_NVIEW_SCAN_MAX_TEXT ) {
		$text      = function_exists( 'mb_substr' )
			? mb_substr( $text, 0, DNAI_NVIEW_SCAN_MAX_TEXT, 'UTF-8' )
			: substr( $text, 0, DNAI_NVIEW_SCAN_MAX_TEXT );
		$truncated = true;
	}
	return array( 'text' => $text, 'truncated' => $truncated );
}

/** Charset déclaré dans le Content-Type (ex: "text/html; charset=iso-8859-1"). */
function dnai_nview_scan_charset( $ctype ) {
	if ( preg_match( '#charset=([a-z0-9_\-]+)#i', (string) $ctype, $m ) ) {
		return strtoupper( trim( $m[1] ) );
	}
	return '';
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
	$is_json = strpos( $ctype, 'json' ) !== false;
	if ( $ctype !== '' && ! $is_json && strpos( $ctype, 'html' ) === false && strpos( $ctype, 'text' ) === false && strpos( $ctype, 'xml' ) === false ) {
		return new WP_Error(
			'unsupported_type',
			'Type de contenu non exploitable (' . $ctype . '). Attendu HTML, texte ou JSON (OpenAPI).',
			array( 'status' => 415 )
		);
	}

	$html  = (string) wp_remote_retrieve_body( $res );
	$bytes = strlen( $html );

	// Contrat de données (OpenAPI/Swagger/JSON) : on renvoie le JSON brut, le
	// front en extrait les champs. Pas de strip HTML.
	if ( $is_json ) {
		$json = $html;
		if ( function_exists( 'mb_strlen' ) ? mb_strlen( $json, 'UTF-8' ) > DNAI_NVIEW_SCAN_MAX_TEXT : strlen( $json ) > DNAI_NVIEW_SCAN_MAX_TEXT ) {
			$json = function_exists( 'mb_substr' )
				? mb_substr( $json, 0, DNAI_NVIEW_SCAN_MAX_TEXT, 'UTF-8' )
				: substr( $json, 0, DNAI_NVIEW_SCAN_MAX_TEXT );
		}
		return array(
			'url'       => esc_url_raw( $url ),
			'text'      => $json,
			'bytes'     => $bytes,
			'truncated' => false,
		);
	}

	// Recode en UTF-8 si la page déclare un autre charset (intranet legacy
	// en iso-8859-1, windows-1252…) — sinon html_entity_decode UTF-8 produit
	// du mojibake et l'extraction rate.
	$charset = dnai_nview_scan_charset( $ctype );
	if ( $charset === '' && preg_match( '#<meta[^>]+charset=["\']?([a-z0-9_\-]+)#i', $html, $mm ) ) {
		$charset = strtoupper( trim( $mm[1] ) );
	}
	if ( $charset !== '' && $charset !== 'UTF-8' && function_exists( 'mb_convert_encoding' ) ) {
		$converted = @mb_convert_encoding( $html, 'UTF-8', $charset );
		if ( is_string( $converted ) && $converted !== '' ) {
			$html = $converted;
		}
	}

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
