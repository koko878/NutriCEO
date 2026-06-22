<?php
/**
 * Plugin Name:       D²nAI NutriBudget
 * Description:       Tactical budget consolidation cockpit for OCP Nutricrops — a single source of truth for all engagement lines (CAPEX/OPEX, multi-BU, multi-currency MAD/USD/EUR), the OTP→PO→payment chain, vendor rollups and read-only / Task-Force exports. The bridge before Anaplan. React/Tailwind/Framer single-file build served full-screen by WordPress, no build server. Designed and operated by the D²nAI team.
 * Version:           0.4.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-nutribudget
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_NBUDGET_VER', '0.4.0' );
define( 'DNAI_NBUDGET_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_NBUDGET_DIR', plugin_dir_path( __FILE__ ) );

// Backend partagé : REST + MySQL (PoV, SANS SSO). Persistance multi-utilisateur.
require_once DNAI_NBUDGET_DIR . 'inc/rest-api.php';

/* -------------------------------------------------------------------------
 * FULL-SCREEN route — pretty URL /nutribudget + fallback /?dnai_nbudget_app=1
 * Serves the self-contained React build (app/nutribudget.html) with NO theme
 * chrome. Persistence: shared REST + MySQL backend (inc/rest-api.php), with
 * localStorage as offline cache. Read-only sharing via ?view=shared.
 * SSO Entra ID deferred to the final phase (plugs into REST permission_callbacks).
 * ---------------------------------------------------------------------- */
function dnai_nbudget_add_rewrite() {
	add_rewrite_rule( '^nutribudget/?$', 'index.php?dnai_nbudget_app=1', 'top' );
}
add_action( 'init', 'dnai_nbudget_add_rewrite' );

add_filter( 'query_vars', function ( $vars ) { $vars[] = 'dnai_nbudget_app'; return $vars; } );

register_activation_hook( __FILE__, function () {
	dnai_nbudget_install();   // crée la table {prefix}dnai_nbudget_store
	dnai_nbudget_add_rewrite();
	flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

add_action( 'template_redirect', function () {
	if ( ! intval( get_query_var( 'dnai_nbudget_app' ) ) ) { return; }
	$path = DNAI_NBUDGET_DIR . 'app/nutribudget.html';
	if ( is_readable( $path ) ) {
		status_header( 200 );
		header( 'Content-Type: text/html; charset=utf-8' );
		header( 'X-Robots-Tag: noindex, nofollow', true );
		nocache_headers();
		// Inject a tiny config bridge so the SPA can discover the WP context
		// (and stay forward-compatible with the future REST + SSO target).
		$cfg = '<script>window.DNAI_NBUDGET=' . wp_json_encode( array_merge( array(
			'home' => esc_url_raw( home_url( '/' ) ),
			'user' => wp_get_current_user()->display_name ?: '',
			'ver'  => DNAI_NBUDGET_VER,
		), dnai_nbudget_ctx() ) ) . ';</script>';
		$html = file_get_contents( $path );
		echo str_replace( '</head>', $cfg . "\n</head>", $html ); // phpcs:ignore
	} else {
		status_header( 404 );
		echo 'NutriBudget app not found.';
	}
	exit;
} );

function dnai_nbudget_fs_url() {
	return get_option( 'permalink_structure' )
		? home_url( '/nutribudget' )
		: home_url( '/?dnai_nbudget_app=1' );
}

/* -------------------------------------------------------------------------
 * Shortcode [nutribudget] — embeds the cockpit full-bleed in a page.
 * ---------------------------------------------------------------------- */
add_shortcode( 'nutribudget', function () {
	$src = esc_url( DNAI_NBUDGET_URL . 'app/nutribudget.html?v=' . DNAI_NBUDGET_VER );
	$fs  = esc_url( dnai_nbudget_fs_url() );
	$id  = 'dnaiNbudgetFrame_' . wp_generate_password( 6, false, false );
	$wrap = 'position:relative;left:50%;right:50%;width:100vw;max-width:100vw;margin-left:-50vw;margin-right:-50vw;background:#fafafa;';
	return '<div class="dnai-nbudget-wrap" style="' . $wrap . '">'
		. '<div style="text-align:right;padding:6px 16px;">'
		. '<a href="' . $fs . '" target="_blank" rel="noopener" '
		. 'style="display:inline-flex;align-items:center;gap:6px;font:600 13px sans-serif;color:#2E7D32;text-decoration:none;">'
		. 'Ouvrir NutriBudget en plein écran</a></div>'
		. '<iframe id="' . esc_attr( $id ) . '" src="' . $src . '" title="NutriBudget" loading="lazy" '
		. 'allow="clipboard-read; clipboard-write" '
		. 'style="display:block;width:100%;border:0;min-height:100vh;"></iframe>'
		. '</div>';
} );

/* Plugins-page convenience links. */
add_filter( 'plugin_row_meta', function ( $links, $file ) {
	if ( strpos( $file, 'dnai-nutribudget' ) !== false ) {
		$links[] = '<a href="' . esc_url( dnai_nbudget_fs_url() ) . '" target="_blank"><strong>Ouvrir NutriBudget</strong></a>';
	}
	return $links;
}, 10, 2 );
