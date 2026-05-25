<?php
/**
 * Plugin Name:       D²nAI NutrientOS
 * Description:       Hosts the NutrientOS prototype, the executive one-pager and the executive summary, exposed as shortcodes and as direct URLs (mobile-friendly, fully interactive). Shortcodes: [nutrientos], [nutrientos_exec], [nutrientos_execsum].
 * Version:           1.1.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-nutrientos
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_NOS_VER', '1.1.0' );
define( 'DNAI_NOS_URL', plugin_dir_url( __FILE__ ) );

/**
 * Render a full-bleed iframe to one of the bundled apps.
 * Optional shortcode attribute: height (e.g. [nutrientos height="900px"]).
 */
function dnai_nos_frame( $file, $atts = array() ) {
	$a      = shortcode_atts( array( 'height' => '100vh' ), $atts );
	$height = preg_replace( '/[^0-9a-z%.]/i', '', (string) $a['height'] );
	if ( $height === '' ) { $height = '100vh'; }
	$src = esc_url( DNAI_NOS_URL . 'app/' . $file );

	return '<div class="dnai-nos-wrap" style="width:100%;max-width:100%;margin:0;">'
		. '<iframe src="' . $src . '" title="NutrientOS" loading="lazy" '
		. 'style="display:block;width:100%;height:' . esc_attr( $height ) . ';min-height:620px;border:0;border-radius:12px;overflow:hidden;" '
		. 'allow="fullscreen" allowfullscreen></iframe>'
		. '</div>';
}

add_shortcode( 'nutrientos',          function ( $atts ) { return dnai_nos_frame( 'index.html',   (array) $atts ); } );
add_shortcode( 'nutrientos_exec',     function ( $atts ) { return dnai_nos_frame( 'exec.html',    (array) $atts ); } );
add_shortcode( 'nutrientos_execsum',  function ( $atts ) { return dnai_nos_frame( 'execsum.html', (array) $atts ); } );

/**
 * Small admin helper: show the direct URLs on the Plugins page row.
 */
add_filter( 'plugin_row_meta', function ( $links, $file ) {
	if ( strpos( $file, 'dnai-nutrientos' ) !== false ) {
		$links[] = '<a href="' . esc_url( DNAI_NOS_URL . 'app/index.html' ) . '" target="_blank">Prototype</a>';
		$links[] = '<a href="' . esc_url( DNAI_NOS_URL . 'app/exec.html' ) . '" target="_blank">Exec</a>';
		$links[] = '<a href="' . esc_url( DNAI_NOS_URL . 'app/execsum.html' ) . '" target="_blank">Exec-sum</a>';
	}
	return $links;
}, 10, 2 );
