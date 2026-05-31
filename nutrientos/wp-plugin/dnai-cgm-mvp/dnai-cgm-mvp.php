<?php
/**
 * Plugin Name:       D²nAI CGM Simulator — MVP
 * Description:       MVP of the CGM Simulator (business UX: config / market inputs / results, with editable referential). Serves a FULL-SCREEN URL (no theme chrome) and a shortcode [cgm_mvp]. Calculation rules ported 1:1 from the CGM Excel; ships with placeholder data.
 * Version:           1.6.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-cgm-mvp
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_CGMMVP_VER', '1.6.0' );
define( 'DNAI_CGMMVP_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_CGMMVP_DIR', plugin_dir_path( __FILE__ ) );

/* -------------------------------------------------------------------------
 * 1. FULL-SCREEN route — serves the app with NO theme around it.
 *    Pretty URL:  https://YOURSITE/cgm-simulator
 *    Fallback:    https://YOURSITE/?dnai_cgm_app=1   (works even if permalinks
 *                 aren't flushed)
 * ---------------------------------------------------------------------- */
function dnai_cgmmvp_add_rewrite() {
	add_rewrite_rule( '^cgm-simulator/?$', 'index.php?dnai_cgm_app=1', 'top' );
}
add_action( 'init', 'dnai_cgmmvp_add_rewrite' );

add_filter( 'query_vars', function ( $vars ) {
	$vars[] = 'dnai_cgm_app';
	return $vars;
} );

add_action( 'template_redirect', function () {
	if ( ! get_query_var( 'dnai_cgm_app' ) ) { return; }
	$f = DNAI_CGMMVP_DIR . 'app/cgm-mvp.html';
	if ( is_readable( $f ) ) {
		status_header( 200 );
		header( 'Content-Type: text/html; charset=utf-8' );
		header( 'X-Robots-Tag: noindex, nofollow', true );
		nocache_headers();
		readfile( $f );
	} else {
		status_header( 404 );
		echo 'CGM app not found.';
	}
	exit;
} );

/* Flush rewrite rules on activation/deactivation so /cgm-simulator works. */
register_activation_hook( __FILE__, function () {
	dnai_cgmmvp_add_rewrite();
	flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

/* Helper: best full-screen URL (pretty if permalinks on, else query fallback). */
function dnai_cgmmvp_fs_url() {
	return ( get_option( 'permalink_structure' ) )
		? home_url( '/cgm-simulator' )
		: home_url( '/?dnai_cgm_app=1' );
}

/* -------------------------------------------------------------------------
 * 2. Shortcode [cgm_mvp] — embed inside a page (auto-resizing iframe),
 *    with a "Plein écran" link to the dedicated full-screen URL.
 * ---------------------------------------------------------------------- */
function dnai_cgmmvp_frame( $atts = array() ) {
	// Cache-busting via the plugin version, so re-uploads load the new app.
	$src = esc_url( DNAI_CGMMVP_URL . 'app/cgm-mvp.html?v=' . DNAI_CGMMVP_VER );
	$fs  = esc_url( dnai_cgmmvp_fs_url() );
	$id  = 'dnaiCgmFrame_' . wp_rand( 1000, 9999 );

	// Full-bleed: break out of the theme's content column to use the whole window width.
	$wrap = 'position:relative;left:50%;right:50%;width:100vw;max-width:100vw;margin-left:-50vw;margin-right:-50vw;padding:0 16px;box-sizing:border-box;';

	return '<div class="dnai-cgmmvp-wrap" style="' . $wrap . '">'
		. '<div style="text-align:right;margin:0 0 8px;"><a href="' . $fs . '" target="_blank" rel="noopener" '
		. 'style="display:inline-flex;align-items:center;gap:6px;font:600 13px sans-serif;color:#2E7D32;text-decoration:none;">⛶ Ouvrir en plein écran</a></div>'
		. '<iframe id="' . esc_attr( $id ) . '" src="' . $src . '" title="CGM Simulator — MVP" loading="lazy" scrolling="no" '
		. 'style="display:block;width:100%;height:760px;min-height:680px;border:0;border-radius:12px;overflow:hidden;" '
		. 'allow="fullscreen" allowfullscreen></iframe>'
		. '<script>(function(){var f=document.getElementById(' . wp_json_encode( $id ) . ');'
		. 'window.addEventListener("message",function(e){if(e.data&&typeof e.data.dnaiCgmHeight==="number"){f.style.height=(e.data.dnaiCgmHeight+2)+"px";}});'
		. '})();</script>'
		. '</div>';
}
add_shortcode( 'cgm_mvp', 'dnai_cgmmvp_frame' );

/* Show both URLs on the Plugins page row. */
add_filter( 'plugin_row_meta', function ( $links, $file ) {
	if ( strpos( $file, 'dnai-cgm-mvp' ) !== false ) {
		$links[] = '<a href="' . esc_url( dnai_cgmmvp_fs_url() ) . '" target="_blank"><strong>Ouvrir (plein écran)</strong></a>';
		$links[] = '<a href="' . esc_url( DNAI_CGMMVP_URL . 'app/cgm-mvp.html' ) . '" target="_blank">Fichier direct</a>';
	}
	return $links;
}, 10, 2 );
