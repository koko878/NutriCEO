<?php
/**
 * Plugin Name:       D²nAI CGM Simulator — MVP
 * Description:       MVP of the CGM Simulator (business UX: config / market inputs / results, with editable referential). Exposed as a shortcode [cgm_mvp] and as a direct, mobile-friendly URL. Calculation rules ported 1:1 from the CGM Excel; ships with placeholder data.
 * Version:           1.1.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-cgm-mvp
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_CGMMVP_VER', '1.1.0' );
define( 'DNAI_CGMMVP_URL', plugin_dir_url( __FILE__ ) );

/**
 * Render a full-bleed iframe to the bundled MVP app.
 * Optional shortcode attribute: height (e.g. [cgm_mvp height="1100px"]).
 */
function dnai_cgmmvp_frame( $atts = array() ) {
	$a      = shortcode_atts( array( 'height' => '100vh' ), (array) $atts );
	$height = preg_replace( '/[^0-9a-z%.]/i', '', (string) $a['height'] );
	if ( $height === '' ) { $height = '100vh'; }
	$src = esc_url( DNAI_CGMMVP_URL . 'app/cgm-mvp.html' );
	$id  = 'dnaiCgmFrame_' . wp_rand( 1000, 9999 );

	// The app posts its content height; the iframe auto-resizes so the page
	// scrolls naturally (no nested scrollbar) on desktop and mobile.
	return '<div class="dnai-cgmmvp-wrap" style="width:100%;max-width:100%;margin:0;">'
		. '<iframe id="' . esc_attr( $id ) . '" src="' . $src . '" title="CGM Simulator — MVP" loading="lazy" scrolling="no" '
		. 'style="display:block;width:100%;height:760px;min-height:680px;border:0;border-radius:12px;overflow:hidden;" '
		. 'allow="fullscreen" allowfullscreen></iframe>'
		. '<script>(function(){var f=document.getElementById(' . wp_json_encode( $id ) . ');'
		. 'window.addEventListener("message",function(e){if(e.data&&typeof e.data.dnaiCgmHeight==="number"){f.style.height=(e.data.dnaiCgmHeight+2)+"px";}});'
		. '})();</script>'
		. '</div>';
}
add_shortcode( 'cgm_mvp', 'dnai_cgmmvp_frame' );

/* Show the direct URL on the Plugins page row. */
add_filter( 'plugin_row_meta', function ( $links, $file ) {
	if ( strpos( $file, 'dnai-cgm-mvp' ) !== false ) {
		$links[] = '<a href="' . esc_url( DNAI_CGMMVP_URL . 'app/cgm-mvp.html' ) . '" target="_blank">Ouvrir le MVP</a>';
	}
	return $links;
}, 10, 2 );
