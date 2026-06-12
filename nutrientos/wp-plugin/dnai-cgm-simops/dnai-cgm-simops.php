<?php
/**
 * Plugin Name:       D²nAI CGM Sim-Ops
 * Description:       Refonte HTML/JS (stack D²nAI) du simulateur CGM R Shiny initialement développé par la BU Ops (F. Ezzebdi). Reproduit à l'identique la logique métier (cout par MP, CGM, CGM EQ DAP), les KPIs, les graphes (CGM vs EQ DAP + composition du coût), la synthèse, et l'analyse de sensibilité (chocs %/$, impact combiné, tornado, impact séparé). Mono-fichier autonome, zéro dépendance externe, charte D²nAI.
 * Version:           1.0.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-cgm-simops
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_SIMOPS_VER', '1.0.0' );
define( 'DNAI_SIMOPS_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_SIMOPS_DIR', plugin_dir_path( __FILE__ ) );

/* -------------------------------------------------------------------------
 * 1. URL plein écran (pas de chrome WP).
 *    https://VOTRE-SITE/cgm-simops
 * ---------------------------------------------------------------------- */
add_action( 'init', function () {
	add_rewrite_rule( '^cgm-simops/?$', 'index.php?dnai_simops_app=1', 'top' );
} );
add_filter( 'query_vars', function ( $v ) { $v[] = 'dnai_simops_app'; return $v; } );

add_action( 'template_redirect', function () {
	if ( ! get_query_var( 'dnai_simops_app' ) ) { return; }
	$path = DNAI_SIMOPS_DIR . 'app/cgm-simops.html';
	if ( ! is_readable( $path ) ) { status_header( 404 ); echo 'CGM Sim-Ops app introuvable.'; exit; }
	status_header( 200 );
	header( 'Content-Type: text/html; charset=utf-8' );
	header( 'X-Robots-Tag: noindex, nofollow', true );
	nocache_headers();
	readfile( $path );
	exit;
} );

register_activation_hook( __FILE__, function () { flush_rewrite_rules(); } );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

function dnai_simops_fs_url() {
	return get_option( 'permalink_structure' )
		? home_url( '/cgm-simops' )
		: home_url( '/?dnai_simops_app=1' );
}

/* -------------------------------------------------------------------------
 * 2. Shortcode [cgm_simops] — iframe pleine largeur, auto-resize.
 * ---------------------------------------------------------------------- */
add_shortcode( 'cgm_simops', function () {
	$src  = esc_url( DNAI_SIMOPS_URL . 'app/cgm-simops.html?v=' . DNAI_SIMOPS_VER );
	$fs   = esc_url( dnai_simops_fs_url() );
	$id   = 'dnaiSimopsFrame_' . wp_rand( 1000, 9999 );
	$wrap = 'position:relative;left:50%;right:50%;width:100vw;max-width:100vw;margin-left:-50vw;margin-right:-50vw;padding:0 12px;box-sizing:border-box;';
	return '<div class="dnai-simops-wrap" style="' . $wrap . '">'
		. '<div style="text-align:right;margin:0 0 8px;"><a href="' . $fs . '" target="_blank" rel="noopener" '
		. 'style="display:inline-flex;align-items:center;gap:6px;font:600 13px sans-serif;color:#2E7D32;text-decoration:none;">⛶ Ouvrir en plein écran</a></div>'
		. '<iframe id="' . esc_attr( $id ) . '" src="' . $src . '" title="CGM Sim-Ops" loading="lazy" scrolling="no" '
		. 'style="display:block;width:100%;height:1400px;min-height:900px;border:0;border-radius:12px;overflow:hidden;" allow="fullscreen" allowfullscreen></iframe>'
		. '<script>(function(){var f=document.getElementById(' . wp_json_encode( $id ) . ');'
		. 'window.addEventListener("message",function(e){if(!e.data)return;'
		. 'if(typeof e.data.dnaiSimopsHeight==="number"){f.style.height=(e.data.dnaiSimopsHeight+2)+"px";}});'
		. '})();</script></div>';
} );

/* -------------------------------------------------------------------------
 * 3. Plugins page → lien direct vers l'URL plein écran.
 * ---------------------------------------------------------------------- */
add_filter( 'plugin_row_meta', function ( $links, $file ) {
	if ( strpos( $file, 'dnai-cgm-simops' ) !== false ) {
		$links[] = '<a href="' . esc_url( dnai_simops_fs_url() ) . '" target="_blank"><strong>Ouvrir le simulateur</strong></a>';
	}
	return $links;
}, 10, 2 );
