<?php
/**
 * Plugin Name:       D²nAI NutriView
 * Description:       Assistant DGSSI de classification des données pour OCP Nutricrops. Inventaire des données d'un projet, attribution des niveaux C/I/D (échelle décret 2-21-406), calcul déterministe de la classe (I-V) et du verdict cloud (résidence MA obligatoire pour les données sensibles loi 05-20). Phases 0-3 — sans IA, sans backend, persistance navigateur.
 * Version:           0.1.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-nutriview
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_NVIEW_VER', '0.1.0' );
define( 'DNAI_NVIEW_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_NVIEW_DIR', plugin_dir_path( __FILE__ ) );

// TODO Phase 5 — backend REST + MySQL (collection projects, signatures,
// inbox propriétaire). À brancher dans inc/rest-api.php que Hamza ajoutera.
// require_once DNAI_NVIEW_DIR . 'inc/rest-api.php';

/* -------------------------------------------------------------------------
 * 1. Route plein écran  →  /nutriview
 * ---------------------------------------------------------------------- */
function dnai_nview_add_rewrite() {
	add_rewrite_rule( '^nutriview/?$', 'index.php?dnai_nview_app=1', 'top' );
}
add_action( 'init', 'dnai_nview_add_rewrite' );
add_filter( 'query_vars', function ( $v ) { $v[] = 'dnai_nview_app'; return $v; } );

add_action( 'template_redirect', function () {
	if ( ! get_query_var( 'dnai_nview_app' ) ) { return; }
	$path = DNAI_NVIEW_DIR . 'app/nutriview.html';
	if ( ! is_readable( $path ) ) {
		status_header( 404 );
		echo 'NutriView app not built. Run `npm run build` and copy dist/index.html → app/nutriview.html.';
		exit;
	}
	status_header( 200 );
	header( 'Content-Type: text/html; charset=utf-8' );
	header( 'X-Robots-Tag: noindex, nofollow', true );
	nocache_headers();
	$html = file_get_contents( $path );
	$user = wp_get_current_user();
	$cfg  = '<script>window.DNAI_NVIEW=' . wp_json_encode( array(
		'home' => esc_url_raw( home_url( '/' ) ),
		'user' => $user && $user->ID ? sanitize_user( $user->user_login ) : '',
		'ver'  => DNAI_NVIEW_VER,
	) ) . ';</script>';
	echo str_replace( '</head>', $cfg . '</head>', $html ); // phpcs:ignore WordPress.Security.EscapeOutput
	exit;
} );

register_activation_hook( __FILE__, function () {
	dnai_nview_add_rewrite();
	flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

function dnai_nview_fs_url() {
	return get_option( 'permalink_structure' )
		? home_url( '/nutriview' )
		: home_url( '/?dnai_nview_app=1' );
}

/* -------------------------------------------------------------------------
 * 2. Shortcode  [nutriview]  — iframe full-bleed + lien plein écran.
 * ---------------------------------------------------------------------- */
function dnai_nview_shortcode( $atts ) {
	$a   = shortcode_atts( array( 'title' => 'NutriView' ), $atts );
	$src = esc_url( dnai_nview_fs_url() );
	$id  = 'dnaiNviewFrame_' . wp_rand( 1000, 9999 );
	$wrap = 'position:relative;left:50%;right:50%;width:100vw;max-width:100vw;margin-left:-50vw;margin-right:-50vw;padding:0 16px;box-sizing:border-box;';
	return '<div class="dnai-nview-wrap" style="' . esc_attr( $wrap ) . '">'
		. '<div style="text-align:right;margin:0 0 8px;"><a href="' . $src . '" target="_blank" rel="noopener" '
		. 'style="display:inline-flex;align-items:center;gap:6px;font:600 13px sans-serif;color:#2E7D32;text-decoration:none;">⛶ Ouvrir en plein écran</a></div>'
		. '<iframe id="' . esc_attr( $id ) . '" src="' . $src . '" title="' . esc_attr( $a['title'] ) . '" loading="lazy" '
		. 'style="display:block;width:100%;height:860px;min-height:640px;border:0;border-radius:12px;overflow:hidden;background:#fafafa;" '
		. 'allow="fullscreen" allowfullscreen></iframe></div>';
}
add_shortcode( 'nutriview', 'dnai_nview_shortcode' );

/* -------------------------------------------------------------------------
 * 3. Liens méta sur la page Plugins.
 * ---------------------------------------------------------------------- */
add_filter( 'plugin_row_meta', function ( $links, $file ) {
	if ( strpos( $file, 'dnai-nutriview' ) !== false ) {
		$links[] = '<a href="' . esc_url( dnai_nview_fs_url() ) . '" target="_blank"><strong>Ouvrir NutriView</strong></a>';
	}
	return $links;
}, 10, 2 );
