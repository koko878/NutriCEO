<?php
/**
 * Plugin Name:       D²nAI CGM Cockpit — Crisis Center
 * Description:       Parallel plugin to dnai-cgm-mvp. Hosts the "Crisis Cockpit" version of the CGM Simulator (Netflix/Spotify-style command deck: live RM ticker, crisis playbook, S-pressure heatmap, substitution advisor, AI co-pilot). Coexists with the original plugin — different shortcode and route so the existing CGM page is untouched.
 * Version:           1.8.2
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-cgm-cockpit
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_CGMCK_VER', '1.8.2' );
define( 'DNAI_CGMCK_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_CGMCK_DIR', plugin_dir_path( __FILE__ ) );

/* Full-screen route: /cgm-cockpit (fallback /?dnai_cgmck_app=1) */
function dnai_cgmck_add_rewrite() {
	add_rewrite_rule( '^cgm-cockpit/?$', 'index.php?dnai_cgmck_app=1', 'top' );
}
add_action( 'init', 'dnai_cgmck_add_rewrite' );

add_filter( 'query_vars', function ( $vars ) {
	$vars[] = 'dnai_cgmck_app';
	return $vars;
} );

add_action( 'template_redirect', function () {
	if ( ! get_query_var( 'dnai_cgmck_app' ) ) { return; }
	$f = DNAI_CGMCK_DIR . 'app/cgm-cockpit.html';
	if ( is_readable( $f ) ) {
		status_header( 200 );
		header( 'Content-Type: text/html; charset=utf-8' );
		header( 'X-Robots-Tag: noindex, nofollow', true );
		nocache_headers();
		readfile( $f );
	} else {
		status_header( 404 );
		echo 'CGM Cockpit app not found.';
	}
	exit;
} );

register_activation_hook( __FILE__, function () {
	dnai_cgmck_add_rewrite();
	flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

function dnai_cgmck_fs_url() {
	return ( get_option( 'permalink_structure' ) )
		? home_url( '/cgm-cockpit' )
		: home_url( '/?dnai_cgmck_app=1' );
}

/* Shortcode [cgm_cockpit] — embed inside a page (auto-resizing iframe). */
function dnai_cgmck_frame( $atts = array() ) {
	$src = esc_url( DNAI_CGMCK_URL . 'app/cgm-cockpit.html?v=' . DNAI_CGMCK_VER );
	$fs  = esc_url( dnai_cgmck_fs_url() );
	$id  = 'dnaiCgmCkFrame_' . wp_rand( 1000, 9999 );

	$wrap = 'position:relative;left:50%;right:50%;width:100vw;max-width:100vw;margin-left:-50vw;margin-right:-50vw;padding:0 16px;box-sizing:border-box;';

	return '<div class="dnai-cgmck-wrap" style="' . $wrap . '">'
		. '<div style="text-align:right;margin:0 0 8px;"><a href="' . $fs . '" target="_blank" rel="noopener" '
		. 'style="display:inline-flex;align-items:center;gap:6px;font:600 13px sans-serif;color:#2E7D32;text-decoration:none;">⛶ Ouvrir en plein écran</a></div>'
		. '<iframe id="' . esc_attr( $id ) . '" src="' . $src . '" title="CGM Cockpit — Crisis Center" loading="lazy" scrolling="no" '
		. 'style="display:block;width:100%;height:840px;min-height:720px;border:0;border-radius:12px;overflow:hidden;background:#07140c;" '
		. 'allow="fullscreen" allowfullscreen></iframe>'
		. '<script>(function(){var f=document.getElementById(' . wp_json_encode( $id ) . ');'
		. 'window.addEventListener("message",function(e){if(e.data&&typeof e.data.dnaiCgmHeight==="number"){f.style.height=(e.data.dnaiCgmHeight+2)+"px";}});'
		. '})();</script>'
		. '</div>';
}
add_shortcode( 'cgm_cockpit', 'dnai_cgmck_frame' );

/* Show both URLs on the Plugins page row. */
add_filter( 'plugin_row_meta', function ( $links, $file ) {
	if ( strpos( $file, 'dnai-cgm-cockpit' ) !== false ) {
		$links[] = '<a href="' . esc_url( dnai_cgmck_fs_url() ) . '" target="_blank"><strong>Ouvrir (plein écran)</strong></a>';
		$links[] = '<a href="' . esc_url( DNAI_CGMCK_URL . 'app/cgm-cockpit.html' ) . '" target="_blank">Fichier direct</a>';
	}
	return $links;
}, 10, 2 );
