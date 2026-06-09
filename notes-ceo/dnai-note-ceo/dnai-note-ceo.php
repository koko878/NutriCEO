<?php
/**
 * Plugin Name:       D²nAI Note CEO
 * Description:       Héberge la note mensuelle Statut & stratégie D²nAI à destination du CEO. URL plein écran (sans theme) pour partage WhatsApp/iMessage avec carte d'aperçu Open Graph, et shortcode pour intégration dans une page WP. Aucune dépendance externe (HTML statique).
 * Version:           1.0.1
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-note-ceo
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_NCEO_VER', '1.0.1' );
define( 'DNAI_NCEO_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_NCEO_DIR', plugin_dir_path( __FILE__ ) );

/**
 * Notes disponibles. Pour ajouter une note du mois suivant :
 *   1. déposer le fichier dans app/note-ceo-AAAA-MM.html
 *   2. ajouter une entrée ici avec la même clé que le slug d'URL
 *   3. mettre à jour DNAI_NCEO_LATEST pour pointer vers la dernière
 */
function dnai_nceo_files() {
	return array(
		'2026-06' => 'note-ceo-2026-06.html',
	);
}
define( 'DNAI_NCEO_LATEST', '2026-06' );

/* -------------------------------------------------------------------------
 * URL plein écran — pas de chrome WordPress, rendu identique au HTML brut.
 *   /note-ceo            → dernière note publiée
 *   /note-ceo/2026-06    → note du mois précisé
 * ---------------------------------------------------------------------- */
add_action( 'init', function () {
	add_rewrite_rule( '^note-ceo/?$', 'index.php?dnai_nceo_month=' . DNAI_NCEO_LATEST, 'top' );
	add_rewrite_rule( '^note-ceo/([0-9]{4}-[0-9]{2})/?$', 'index.php?dnai_nceo_month=$matches[1]', 'top' );
} );
add_filter( 'query_vars', function ( $v ) { $v[] = 'dnai_nceo_month'; return $v; } );

add_action( 'template_redirect', function () {
	$month = get_query_var( 'dnai_nceo_month' );
	if ( ! $month ) { return; }
	$files = dnai_nceo_files();
	if ( ! isset( $files[ $month ] ) ) {
		status_header( 404 );
		echo 'Note CEO introuvable.';
		exit;
	}
	$path = DNAI_NCEO_DIR . 'app/' . $files[ $month ];
	if ( ! is_readable( $path ) ) {
		status_header( 404 );
		echo 'Fichier note manquant.';
		exit;
	}
	status_header( 200 );
	header( 'Content-Type: text/html; charset=utf-8' );
	header( 'X-Robots-Tag: noindex, nofollow', true );
	nocache_headers();
	readfile( $path );
	exit;
} );

register_activation_hook( __FILE__, function () { flush_rewrite_rules(); } );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

function dnai_nceo_url( $month = null ) {
	if ( ! $month ) { $month = DNAI_NCEO_LATEST; }
	if ( get_option( 'permalink_structure' ) ) {
		return home_url( '/note-ceo/' . $month );
	}
	return home_url( '/?dnai_nceo_month=' . $month );
}

/* -------------------------------------------------------------------------
 * Shortcode [note_ceo month="2026-06"] — iframe full-width auto-resize.
 * ---------------------------------------------------------------------- */
add_shortcode( 'note_ceo', function ( $atts ) {
	$a     = shortcode_atts( array( 'month' => DNAI_NCEO_LATEST ), $atts, 'note_ceo' );
	$files = dnai_nceo_files();
	$month = isset( $files[ $a['month'] ] ) ? $a['month'] : DNAI_NCEO_LATEST;
	$src   = esc_url( DNAI_NCEO_URL . 'app/' . $files[ $month ] . '?v=' . DNAI_NCEO_VER );
	$fs    = esc_url( dnai_nceo_url( $month ) );
	$wrap  = 'position:relative;left:50%;right:50%;width:100vw;max-width:100vw;margin-left:-50vw;margin-right:-50vw;padding:0 12px;box-sizing:border-box;';
	return '<div class="dnai-nceo-wrap" style="' . $wrap . '">'
		. '<div style="text-align:right;margin:0 0 8px;"><a href="' . $fs . '" target="_blank" rel="noopener" '
		. 'style="display:inline-flex;align-items:center;gap:6px;font:600 13px sans-serif;color:#2E7D32;text-decoration:none;">⛶ Ouvrir en plein écran</a></div>'
		. '<iframe src="' . $src . '" title="Note CEO ' . esc_attr( $month ) . '" loading="lazy" '
		. 'style="display:block;width:100%;height:1400px;border:0;border-radius:12px;overflow:hidden;" allow="fullscreen" allowfullscreen></iframe>'
		. '</div>';
} );

/* -------------------------------------------------------------------------
 * Plugins page → lien direct vers l'URL plein écran (à partager via WhatsApp).
 * ---------------------------------------------------------------------- */
add_filter( 'plugin_row_meta', function ( $links, $file ) {
	if ( strpos( $file, 'dnai-note-ceo' ) !== false ) {
		$links[] = '<a href="' . esc_url( dnai_nceo_url() ) . '" target="_blank"><strong>Ouvrir la note du mois</strong></a>';
	}
	return $links;
}, 10, 2 );
