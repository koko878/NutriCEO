<?php
/**
 * Plugin Name:       D²nAI NutrientOS
 * Description:       Hosts the NutrientOS prototype, the executive one-pager and the executive summary. Serves FULL-SCREEN URLs (no theme chrome) and shortcodes [nutrientos], [nutrientos_exec], [nutrientos_execsum] with full-bleed, cache-busted, auto-resizing iframes.
 * Version:           1.6.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-nutrientos
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_NOS_VER', '1.6.0' );
define( 'DNAI_NOS_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_NOS_DIR', plugin_dir_path( __FILE__ ) );

/* Which app maps to which bundled file. */
function dnai_nos_files() {
	return array(
		'index'   => 'index.html',
		'exec'    => 'exec.html',
		'execsum' => 'execsum.html',
	);
}

/* -------------------------------------------------------------------------
 * 1. FULL-SCREEN routes — serve an app with NO theme around it.
 *    Pretty:   /nutrientos  ·  /nutrientos-exec  ·  /nutrientos-execsum
 *    Fallback: /?dnai_nos_app=index|exec|execsum
 * ---------------------------------------------------------------------- */
function dnai_nos_add_rewrite() {
	add_rewrite_rule( '^nutrientos/?$',         'index.php?dnai_nos_app=index',   'top' );
	add_rewrite_rule( '^nutrientos-exec/?$',    'index.php?dnai_nos_app=exec',    'top' );
	add_rewrite_rule( '^nutrientos-execsum/?$', 'index.php?dnai_nos_app=execsum', 'top' );
}
add_action( 'init', 'dnai_nos_add_rewrite' );

add_filter( 'query_vars', function ( $vars ) {
	$vars[] = 'dnai_nos_app';
	return $vars;
} );

add_action( 'template_redirect', function () {
	$which = get_query_var( 'dnai_nos_app' );
	if ( ! $which ) { return; }
	$files = dnai_nos_files();
	$file  = isset( $files[ $which ] ) ? $files[ $which ] : 'index.html';
	$path  = DNAI_NOS_DIR . 'app/' . $file;
	if ( is_readable( $path ) ) {
		status_header( 200 );
		header( 'Content-Type: text/html; charset=utf-8' );
		header( 'X-Robots-Tag: noindex, nofollow', true );
		nocache_headers();
		readfile( $path );
	} else {
		status_header( 404 );
		echo 'NutrientOS app not found.';
	}
	exit;
} );

register_activation_hook( __FILE__, function () {
	dnai_nos_add_rewrite();
	flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

/* Best full-screen URL for a given app (pretty if permalinks on). */
function dnai_nos_fs_url( $which = 'index' ) {
	$slug = array( 'index' => 'nutrientos', 'exec' => 'nutrientos-exec', 'execsum' => 'nutrientos-execsum' );
	if ( get_option( 'permalink_structure' ) ) {
		return home_url( '/' . $slug[ $which ] );
	}
	return home_url( '/?dnai_nos_app=' . $which );
}

/* -------------------------------------------------------------------------
 * 2. Shortcodes — full-bleed, cache-busted, auto-resizing iframe.
 * ---------------------------------------------------------------------- */
function dnai_nos_frame( $which ) {
	$files = dnai_nos_files();
	$file  = isset( $files[ $which ] ) ? $files[ $which ] : 'index.html';
	$src   = esc_url( DNAI_NOS_URL . 'app/' . $file . '?v=' . DNAI_NOS_VER );
	$fs    = esc_url( dnai_nos_fs_url( $which ) );
	$id    = 'dnaiNosFrame_' . wp_rand( 1000, 9999 );

	$wrap = 'position:relative;left:50%;right:50%;width:100vw;max-width:100vw;margin-left:-50vw;margin-right:-50vw;padding:0 16px;box-sizing:border-box;';

	return '<div class="dnai-nos-wrap" style="' . $wrap . '">'
		. '<div style="text-align:right;margin:0 0 8px;"><a href="' . $fs . '" target="_blank" rel="noopener" '
		. 'style="display:inline-flex;align-items:center;gap:6px;font:600 13px sans-serif;color:#2E7D32;text-decoration:none;">⛶ Ouvrir en plein écran</a></div>'
		. '<iframe id="' . esc_attr( $id ) . '" src="' . $src . '" title="NutrientOS" loading="lazy" scrolling="no" '
		. 'style="display:block;width:100%;height:820px;min-height:620px;border:0;border-radius:12px;overflow:hidden;" '
		. 'allow="fullscreen" allowfullscreen></iframe>'
		. '<script>(function(){var f=document.getElementById(' . wp_json_encode( $id ) . ');'
		. 'window.addEventListener("message",function(e){if(e.data&&typeof e.data.dnaiNosHeight==="number"){f.style.height=(e.data.dnaiNosHeight+2)+"px";}});'
		. '})();</script>'
		. '</div>';
}

add_shortcode( 'nutrientos',         function () { return dnai_nos_frame( 'index' ); } );
add_shortcode( 'nutrientos_exec',    function () { return dnai_nos_frame( 'exec' ); } );
add_shortcode( 'nutrientos_execsum', function () { return dnai_nos_frame( 'execsum' ); } );

/* Plugins page: link to the full-screen URLs. */
add_filter( 'plugin_row_meta', function ( $links, $file ) {
	if ( strpos( $file, 'dnai-nutrientos' ) !== false ) {
		$links[] = '<a href="' . esc_url( dnai_nos_fs_url( 'index' ) ) . '" target="_blank"><strong>Plateforme</strong></a>';
		$links[] = '<a href="' . esc_url( dnai_nos_fs_url( 'exec' ) ) . '" target="_blank">Exec</a>';
		$links[] = '<a href="' . esc_url( dnai_nos_fs_url( 'execsum' ) ) . '" target="_blank">Exec-sum</a>';
	}
	return $links;
}, 10, 2 );
