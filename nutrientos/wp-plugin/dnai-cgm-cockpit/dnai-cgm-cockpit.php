<?php
/**
 * Plugin Name:       D²nAI CGM Cockpit — Crisis Center
 * Description:       Parallel plugin to dnai-cgm-mvp. Hosts the "Crisis Cockpit" version of the CGM Simulator (Netflix/Spotify-style command deck: live RM ticker, crisis playbook, S-pressure heatmap, substitution advisor, AI co-pilot). Coexists with the original plugin — different shortcode and route so the existing CGM page is untouched. Includes a server-side AI proxy that supports Anthropic Claude served via Azure Databricks Foundation Model APIs (OpenAI-compatible), with optional fallback to the NutrientOS curator.
 * Version:           1.9.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-cgm-cockpit
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_CGMCK_VER', '1.9.0' );
define( 'DNAI_CGMCK_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_CGMCK_DIR', plugin_dir_path( __FILE__ ) );

/* -------------------------------------------------------------------------
 * Settings helpers
 * ---------------------------------------------------------------------- */
function dnai_cgmck_opt( $k, $d = '' ) {
	$o = get_option( 'dnai_cgmck_settings', array() );
	return isset( $o[ $k ] ) && $o[ $k ] !== '' ? $o[ $k ] : $d;
}
function dnai_cgmck_ai_ready() {
	// Databricks Claude ready if workspace + endpoint + token are set.
	$w = dnai_cgmck_opt( 'dbx_workspace' );
	$e = dnai_cgmck_opt( 'dbx_endpoint' );
	$t = dnai_cgmck_opt( 'dbx_token' );
	return $w !== '' && $e !== '' && $t !== '';
}

/* -------------------------------------------------------------------------
 * Full-screen route — injects window.DNAI_CGMCK config so the cockpit
 * can find the AI proxy without a separate fetch.
 * ---------------------------------------------------------------------- */
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
		$html = file_get_contents( $f );
		$cfg  = '<script>window.DNAI_CGMCK=' . wp_json_encode( array(
			'ai'    => dnai_cgmck_ai_ready(),
			'chat'  => esc_url_raw( rest_url( 'dnai-cgm-cockpit/v1/chat' ) ),
			'nonce' => wp_create_nonce( 'wp_rest' ),
		) ) . ';</script>';
		echo str_replace( '</head>', $cfg . '</head>', $html ); // phpcs:ignore
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

/* -------------------------------------------------------------------------
 * Shortcode [cgm_cockpit] — embed inside a page (auto-resizing iframe).
 * ---------------------------------------------------------------------- */
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

/* -------------------------------------------------------------------------
 * REST API: /wp-json/dnai-cgm-cockpit/v1/{config,chat}
 *
 * /config (GET, public): returns { ai, chat, nonce } so the embed flow
 *   (shortcode iframe, no <head> injection) can still discover the proxy.
 *
 * /chat (POST, same-origin or nonce-authenticated): forwards an OpenAI-style
 *   chat completion request to the configured Databricks Model Serving
 *   endpoint (Claude via Anthropic on Databricks Foundation Model APIs).
 *   The Databricks PAT stays on the WP server — never exposed to the browser.
 * ---------------------------------------------------------------------- */
add_action( 'rest_api_init', function () {
	register_rest_route( 'dnai-cgm-cockpit/v1', '/config', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			nocache_headers();
			$r = new WP_REST_Response( array(
				'ai'    => dnai_cgmck_ai_ready(),
				'chat'  => esc_url_raw( rest_url( 'dnai-cgm-cockpit/v1/chat' ) ),
				'nonce' => wp_create_nonce( 'wp_rest' ),
			), 200 );
			$r->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
			return $r;
		},
	) );
	register_rest_route( 'dnai-cgm-cockpit/v1', '/chat', array(
		'methods'             => 'POST',
		'callback'            => 'dnai_cgmck_chat',
		'permission_callback' => function ( $req ) {
			$nonce = $req->get_header( 'X-WP-Nonce' );
			if ( $nonce && wp_verify_nonce( $nonce, 'wp_rest' ) ) { return true; }
			$origin = $req->get_header( 'origin' );
			if ( ! $origin ) { $origin = $req->get_header( 'referer' ); }
			if ( $origin ) {
				$oh = wp_parse_url( $origin, PHP_URL_HOST );
				$sh = wp_parse_url( home_url(), PHP_URL_HOST );
				if ( $oh && $sh && strcasecmp( $oh, $sh ) === 0 ) { return true; }
			}
			return false;
		},
	) );
} );

/* Bypass WP's global cookie-nonce check for our endpoint when same-origin
 * (Azure Front Door / sticky nonces make the default check unreliable). */
add_filter( 'rest_authentication_errors', function ( $result ) {
	$uri = isset( $_SERVER['REQUEST_URI'] ) ? $_SERVER['REQUEST_URI'] : '';
	if ( strpos( $uri, 'dnai-cgm-cockpit/v1/chat' ) === false ) { return $result; }
	$origin = isset( $_SERVER['HTTP_ORIGIN'] ) ? $_SERVER['HTTP_ORIGIN'] : ( isset( $_SERVER['HTTP_REFERER'] ) ? $_SERVER['HTTP_REFERER'] : '' );
	if ( $origin ) {
		$oh = wp_parse_url( $origin, PHP_URL_HOST );
		$sh = wp_parse_url( home_url(), PHP_URL_HOST );
		if ( $oh && $sh && strcasecmp( $oh, $sh ) === 0 ) { return true; }
	}
	return $result;
}, 99 );

function dnai_cgmck_chat( $req ) {
	if ( ! dnai_cgmck_ai_ready() ) {
		return new WP_REST_Response( array( 'error' => 'AI non configurée (Réglages → CGM Cockpit AI).' ), 400 );
	}
	@set_time_limit( 0 );
	@ignore_user_abort( true );

	$body = $req->get_json_params();
	if ( ! is_array( $body ) ) { $body = array(); }
	$messages    = isset( $body['messages'] ) && is_array( $body['messages'] ) ? $body['messages'] : array();
	$max_tokens  = isset( $body['max_tokens'] ) ? (int) $body['max_tokens'] : 700;
	$temperature = isset( $body['temperature'] ) ? floatval( $body['temperature'] ) : 0.2;

	if ( ! count( $messages ) ) {
		return new WP_REST_Response( array( 'error' => 'No messages.' ), 400 );
	}

	$workspace = rtrim( dnai_cgmck_opt( 'dbx_workspace' ), '/' );
	$endpoint  = dnai_cgmck_opt( 'dbx_endpoint' );          // e.g. databricks-claude-sonnet-4
	$token     = dnai_cgmck_opt( 'dbx_token' );
	$timeout   = (int) dnai_cgmck_opt( 'dbx_timeout', '120' );
	if ( $timeout < 15 ) { $timeout = 120; }

	// Databricks Model Serving — OpenAI-compatible chat completions path.
	$url = $workspace . '/serving-endpoints/' . rawurlencode( $endpoint ) . '/invocations';

	$payload = array(
		'messages'    => $messages,
		'temperature' => $temperature,
		'max_tokens'  => $max_tokens,
	);

	$resp = wp_remote_post( $url, array(
		'timeout' => $timeout,
		'headers' => array(
			'Content-Type'  => 'application/json',
			'Authorization' => 'Bearer ' . $token,
		),
		'body'    => wp_json_encode( $payload ),
	) );
	if ( is_wp_error( $resp ) ) {
		return new WP_REST_Response( array( 'error' => 'Databricks: ' . $resp->get_error_message() ), 502 );
	}
	$code = wp_remote_retrieve_response_code( $resp );
	$raw  = wp_remote_retrieve_body( $resp );
	$data = json_decode( $raw, true );

	if ( $code >= 400 ) {
		$msg = is_array( $data ) && isset( $data['message'] ) ? $data['message']
			 : ( is_array( $data ) && isset( $data['error']['message'] ) ? $data['error']['message'] : substr( $raw, 0, 400 ) );
		return new WP_REST_Response( array( 'error' => 'Databricks HTTP ' . $code . ' — ' . $msg ), 502 );
	}

	// Standard OpenAI shape: choices[0].message.content
	$text = '';
	if ( is_array( $data ) ) {
		if ( isset( $data['choices'][0]['message']['content'] ) ) {
			$text = $data['choices'][0]['message']['content'];
		} elseif ( isset( $data['choices'][0]['text'] ) ) {
			$text = $data['choices'][0]['text'];
		} elseif ( isset( $data['content'][0]['text'] ) ) {
			// Anthropic native shape (some Databricks endpoints pass-through).
			$text = $data['content'][0]['text'];
		}
	}
	if ( $text === '' ) {
		return new WP_REST_Response( array( 'error' => 'Réponse vide du modèle.', 'raw' => $data ), 502 );
	}

	$usage = ( is_array( $data ) && isset( $data['usage'] ) ) ? $data['usage'] : null;
	return new WP_REST_Response( array(
		'text'  => $text,
		'model' => isset( $data['model'] ) ? $data['model'] : $endpoint,
		'usage' => $usage,
	), 200 );
}

/* -------------------------------------------------------------------------
 * Admin settings page
 * Réglages → CGM Cockpit AI
 * ---------------------------------------------------------------------- */
add_action( 'admin_menu', function () {
	add_options_page( 'CGM Cockpit AI', 'CGM Cockpit AI', 'manage_options', 'dnai-cgm-cockpit', 'dnai_cgmck_settings_page' );
} );

// Use admin-post.php for reliable save behind Azure Front Door.
add_action( 'admin_post_dnai_cgmck_save', function () {
	if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'Forbidden', 403 ); }
	check_admin_referer( 'dnai_cgmck_save' );
	$in = isset( $_POST['dnai_cgmck_settings'] ) && is_array( $_POST['dnai_cgmck_settings'] )
		? wp_unslash( $_POST['dnai_cgmck_settings'] ) : array();
	$tok = isset( $in['dbx_token'] ) ? trim( $in['dbx_token'] ) : '';
	if ( $tok === '' ) { $tok = dnai_cgmck_opt( 'dbx_token' ); } // keep existing if blank
	$val = array(
		'dbx_workspace' => isset( $in['dbx_workspace'] ) ? esc_url_raw( trim( $in['dbx_workspace'] ) ) : '',
		'dbx_endpoint'  => isset( $in['dbx_endpoint'] )  ? sanitize_text_field( $in['dbx_endpoint'] )  : '',
		'dbx_token'     => $tok,
		'dbx_timeout'   => isset( $in['dbx_timeout'] ) && (int) $in['dbx_timeout'] >= 15 ? (string) (int) $in['dbx_timeout'] : '120',
	);
	update_option( 'dnai_cgmck_settings', $val );
	wp_safe_redirect( add_query_arg( array( 'page' => 'dnai-cgm-cockpit', 'cgmck_saved' => '1' ), admin_url( 'options-general.php' ) ) );
	exit;
} );

function dnai_cgmck_settings_page() {
	$o = get_option( 'dnai_cgmck_settings', array() );
	$g = function ( $k, $d = '' ) use ( $o ) { return isset( $o[ $k ] ) ? esc_attr( $o[ $k ] ) : $d; };
	$has_tok = ( isset( $o['dbx_token'] ) && $o['dbx_token'] !== '' );
	?>
	<div class="wrap">
		<h1>CGM Cockpit — AI (Claude via Databricks)</h1>
		<?php if ( isset( $_GET['cgmck_saved'] ) ) : ?>
			<div class="notice notice-success is-dismissible"><p>Réglages enregistrés.</p></div>
		<?php endif; ?>
		<p>Proxy serveur vers <b>Azure Databricks Foundation Model APIs</b> (OpenAI-compatible). Le co-pilote IA du Cockpit appelle <code>/wp-json/dnai-cgm-cockpit/v1/chat</code> qui forwarde vers ton endpoint Databricks servant Claude (Sonnet 4.6 ou autre). Le PAT reste côté serveur.</p>
		<p>Statut : <strong><?php echo dnai_cgmck_ai_ready() ? '✅ configuré' : '⚠️ non configuré'; ?></strong></p>
		<p style="color:#555;font-size:13px;">
			Réellement stocké côté serveur — workspace : <code><?php echo esc_html( dnai_cgmck_opt( 'dbx_workspace' ) ?: '(vide)' ); ?></code> ·
			endpoint : <code><?php echo esc_html( dnai_cgmck_opt( 'dbx_endpoint' ) ?: '(vide)' ); ?></code> ·
			PAT : <code><?php echo $has_tok ? 'enregistré (' . (int) strlen( $o['dbx_token'] ) . ' car.)' : '(vide)'; ?></code>
		</p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" autocomplete="off">
			<input type="hidden" name="action" value="dnai_cgmck_save">
			<?php wp_nonce_field( 'dnai_cgmck_save' ); ?>
			<table class="form-table">
				<tr><th>Workspace URL</th><td>
					<input type="url" name="dnai_cgmck_settings[dbx_workspace]" value="<?php echo $g( 'dbx_workspace' ); ?>" class="regular-text" placeholder="https://adb-XXXXXXXXXXXXXXXX.X.azuredatabricks.net">
					<p class="description">URL de ton workspace Azure Databricks (sans <code>/serving-endpoints/...</code>).</p>
				</td></tr>
				<tr><th>Serving endpoint</th><td>
					<input type="text" name="dnai_cgmck_settings[dbx_endpoint]" value="<?php echo $g( 'dbx_endpoint' ); ?>" class="regular-text" placeholder="databricks-claude-sonnet-4">
					<p class="description">Nom de l'endpoint Databricks Model Serving qui sert Claude (Foundation Model API ou external model). L'URL appelée sera <code>{workspace}/serving-endpoints/{endpoint}/invocations</code>.</p>
				</td></tr>
				<tr><th>Personal Access Token</th><td>
					<input type="password" autocomplete="new-password" name="dnai_cgmck_settings[dbx_token]" value="" class="regular-text" placeholder="<?php echo $has_tok ? '•••• déjà enregistré — laisser vide pour conserver' : 'dapi-...'; ?>">
					<p class="description">PAT Databricks (ou jeton OAuth M2M). Permission <code>Can Query</code> sur l'endpoint.</p>
				</td></tr>
				<tr><th>Timeout (s)</th><td>
					<input type="number" min="15" max="600" name="dnai_cgmck_settings[dbx_timeout]" value="<?php echo $g( 'dbx_timeout', '120' ); ?>" class="small-text">
					<span style="color:#777;font-size:12px">Délai max d'attente Databricks (défaut 120 s).</span>
				</td></tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<hr>
		<h2>Test rapide (cURL)</h2>
		<pre style="background:#f6f7f7;padding:12px;border-radius:6px;overflow:auto;font-size:12px;">curl -X POST '<?php echo esc_html( rest_url( 'dnai-cgm-cockpit/v1/chat' ) ); ?>' \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Bonjour, peux-tu me dire bonjour ?"}],"max_tokens":80}'</pre>
	</div>
	<?php
}

/* Show useful links on the Plugins page row. */
add_filter( 'plugin_row_meta', function ( $links, $file ) {
	if ( strpos( $file, 'dnai-cgm-cockpit' ) !== false ) {
		$links[] = '<a href="' . esc_url( dnai_cgmck_fs_url() ) . '" target="_blank"><strong>Ouvrir (plein écran)</strong></a>';
		$links[] = '<a href="' . esc_url( admin_url( 'options-general.php?page=dnai-cgm-cockpit' ) ) . '">Réglages AI</a>';
	}
	return $links;
}, 10, 2 );
