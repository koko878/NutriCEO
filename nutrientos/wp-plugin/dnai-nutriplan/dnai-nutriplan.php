<?php
/**
 * Plugin Name:       D²nAI NutriPlan — Trial Management Cockpit
 * Description:       Sister-app of NutriTrials covering the full upstream Trial Management cycle (annual planning, Use Case intake, Steering / CEO / Monitoring gates, Fast Track lane, closure & knowledge base). Includes a chat-with-data AI co-pilot powered by Anthropic Claude (Sonnet 4.6) served via Azure Databricks Foundation Model APIs (OpenAI-compatible). All branded D²nAI bot — no underlying provider mention.
 * Version:           0.2.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-nutriplan
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_NPLAN_VER', '0.2.0' );
define( 'DNAI_NPLAN_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_NPLAN_DIR', plugin_dir_path( __FILE__ ) );

/* -------------------------------------------------------------------------
 * Settings helpers — Databricks proxy reused from CGM Cockpit pattern.
 * If the CGM Cockpit plugin is already installed and configured, we read
 * the same options so the operator doesn't have to enter the PAT twice.
 * ---------------------------------------------------------------------- */
function dnai_nplan_opt( $k, $d = '' ) {
	$o = get_option( 'dnai_nplan_settings', array() );
	if ( isset( $o[ $k ] ) && $o[ $k ] !== '' ) return $o[ $k ];
	// Fallback — read the CGM Cockpit setting if available (same Databricks workspace).
	$shared = get_option( 'dnai_cgmck_settings', array() );
	if ( isset( $shared[ $k ] ) && $shared[ $k ] !== '' ) return $shared[ $k ];
	return $d;
}
function dnai_nplan_ai_ready() {
	$w = dnai_nplan_opt( 'dbx_workspace' );
	$e = dnai_nplan_opt( 'dbx_endpoint' );
	$t = dnai_nplan_opt( 'dbx_token' );
	return ( $w && $e && $t );
}

/* -------------------------------------------------------------------------
 * FULL-SCREEN route — pretty URL /nutriplan + fallback /?dnai_nplan_app=1
 * ---------------------------------------------------------------------- */
function dnai_nplan_add_rewrite() {
	add_rewrite_rule( '^nutriplan/?$', 'index.php?dnai_nplan_app=1', 'top' );
}
add_action( 'init', 'dnai_nplan_add_rewrite' );

add_filter( 'query_vars', function ( $vars ) { $vars[] = 'dnai_nplan_app'; return $vars; } );

register_activation_hook( __FILE__, function () {
	dnai_nplan_add_rewrite();
	flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

add_action( 'template_redirect', function () {
	if ( ! intval( get_query_var( 'dnai_nplan_app' ) ) ) { return; }
	$f = DNAI_NPLAN_DIR . 'app/nutriplan.html';
	if ( file_exists( $f ) ) {
		nocache_headers();
		header( 'Content-Type: text/html; charset=utf-8' );
		$html = file_get_contents( $f );
		// Inject the AI / config bridge so the SPA can discover endpoints + nonce.
		$cfg  = '<script>window.DNAI_NPLAN=' . wp_json_encode( array(
			'ai'     => dnai_nplan_ai_ready(),
			'chat'   => esc_url_raw( rest_url( 'dnai-nutriplan/v1/chat' ) ),
			'config' => esc_url_raw( rest_url( 'dnai-nutriplan/v1/config' ) ),
			'nonce'  => wp_create_nonce( 'wp_rest' ),
			'home'   => esc_url_raw( home_url( '/' ) ),
			'ver'    => DNAI_NPLAN_VER,
		) ) . ';</script>';
		echo str_replace( '</head>', $cfg . "\n</head>", $html );
		exit;
	}
} );

/* -------------------------------------------------------------------------
 * Shortcode [nutriplan] — embeds the app full-bleed with auto-resize.
 * ---------------------------------------------------------------------- */
add_shortcode( 'nutriplan', function () {
	$src = esc_url( DNAI_NPLAN_URL . 'app/nutriplan.html?v=' . DNAI_NPLAN_VER );
	$id  = 'dnaiNplanFrame_' . wp_generate_password( 6, false, false );
	ob_start(); ?>
<style>
.dnai-nplan-wrap{position:relative;left:50%;right:50%;margin-left:-50vw;margin-right:-50vw;width:100vw;max-width:100vw;background:#fff}
.dnai-nplan-wrap iframe{display:block;width:100%;border:0;min-height:80vh}
.dnai-nplan-fs{display:inline-block;margin:8px 16px;color:#2E7D32;font-size:13px;text-decoration:underline}
</style>
<div class="dnai-nplan-wrap">
  <iframe id="<?php echo esc_attr( $id ); ?>" src="<?php echo $src; ?>"
          allow="clipboard-read; clipboard-write" loading="lazy"></iframe>
  <a class="dnai-nplan-fs" href="<?php echo esc_url( home_url( '/nutriplan' ) ); ?>" target="_blank" rel="noopener">↗ Open NutriPlan full-screen</a>
</div>
<script>
(function(){
  var f=document.getElementById(<?php echo wp_json_encode( $id ); ?>);
  if(!f) return;
  // Bridge config to the iframe (same-origin so we can postMessage freely).
  function send(){ try{ f.contentWindow.postMessage({type:'DNAI_NPLAN_CONFIG', config:{
    ai: <?php echo dnai_nplan_ai_ready() ? 'true' : 'false'; ?>,
    chat: <?php echo wp_json_encode( esc_url_raw( rest_url( 'dnai-nutriplan/v1/chat' ) ) ); ?>,
    config: <?php echo wp_json_encode( esc_url_raw( rest_url( 'dnai-nutriplan/v1/config' ) ) ); ?>,
    nonce: <?php echo wp_json_encode( wp_create_nonce( 'wp_rest' ) ); ?>,
    home: <?php echo wp_json_encode( esc_url_raw( home_url( '/' ) ) ); ?>,
    ver: <?php echo wp_json_encode( DNAI_NPLAN_VER ); ?>
  }}, '*'); }catch(e){} }
  f.addEventListener('load', send); send();
  // Auto-resize
  window.addEventListener('message', function(e){
    if(e && e.data && e.data.type==='DNAI_NPLAN_HEIGHT' && e.data.h){ f.style.minHeight = (e.data.h+8)+'px'; }
  });
})();
</script>
<?php
	return ob_get_clean();
} );

/* -------------------------------------------------------------------------
 * REST endpoints — same-origin auth pattern (works behind Azure Front Door).
 * /config  : GET   — capabilities discovery (ai ready, chat URL, nonce)
 * /chat    : POST  — forwards an OpenAI-style chat completion to Databricks
 *
 * The Databricks PAT NEVER leaves the WP server.
 * No underlying provider (Claude / Anthropic / Databricks) is mentioned in
 * the response — everything is branded D²nAI bot client-side.
 * ---------------------------------------------------------------------- */
function dnai_nplan_same_origin_perm( $req ) {
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
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'dnai-nutriplan/v1', '/config', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			nocache_headers();
			$r = new WP_REST_Response( array(
				'ai'     => dnai_nplan_ai_ready(),
				'chat'   => esc_url_raw( rest_url( 'dnai-nutriplan/v1/chat' ) ),
				'nonce'  => wp_create_nonce( 'wp_rest' ),
				'ver'    => DNAI_NPLAN_VER,
			), 200 );
			$r->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
			return $r;
		},
	) );
	register_rest_route( 'dnai-nutriplan/v1', '/chat', array(
		'methods'             => 'POST',
		'callback'            => 'dnai_nplan_chat',
		'permission_callback' => 'dnai_nplan_same_origin_perm',
	) );
} );

// Bypass WP's global cookie-nonce check for our endpoint when same-origin
// (Azure Front Door / sticky nonces make the default check unreliable).
add_filter( 'rest_authentication_errors', function ( $result ) {
	$uri = isset( $_SERVER['REQUEST_URI'] ) ? $_SERVER['REQUEST_URI'] : '';
	if ( strpos( $uri, 'dnai-nutriplan/v1/chat' ) === false ) { return $result; }
	$origin = isset( $_SERVER['HTTP_ORIGIN'] ) ? $_SERVER['HTTP_ORIGIN'] : ( isset( $_SERVER['HTTP_REFERER'] ) ? $_SERVER['HTTP_REFERER'] : '' );
	if ( $origin ) {
		$oh = wp_parse_url( $origin, PHP_URL_HOST );
		$sh = wp_parse_url( home_url(), PHP_URL_HOST );
		if ( $oh && $sh && strcasecmp( $oh, $sh ) === 0 ) { return true; }
	}
	return $result;
}, 99 );

function dnai_nplan_chat( $req ) {
	$workspace = rtrim( dnai_nplan_opt( 'dbx_workspace' ), '/' );
	$endpoint  = dnai_nplan_opt( 'dbx_endpoint' );
	$token     = dnai_nplan_opt( 'dbx_token' );
	$timeout   = max( 15, (int) dnai_nplan_opt( 'dbx_timeout', 120 ) );
	if ( ! $workspace || ! $endpoint || ! $token ) {
		return new WP_REST_Response( array( 'error' => 'Backend non configuré — voir Réglages → NutriPlan AI (ou CGM Cockpit AI, partagé).' ), 503 );
	}
	$body = $req->get_json_params();
	if ( ! is_array( $body ) ) { $body = array(); }
	$messages = isset( $body['messages'] ) && is_array( $body['messages'] ) ? $body['messages'] : array();
	if ( ! $messages ) { return new WP_REST_Response( array( 'error' => 'messages manquants' ), 400 ); }
	$max_tokens  = isset( $body['max_tokens'] ) ? min( 4096, max( 64, (int) $body['max_tokens'] ) ) : 1200;
	$temperature = isset( $body['temperature'] ) ? max( 0, min( 1, (float) $body['temperature'] ) ) : 0.3;

	$url = $workspace . '/serving-endpoints/' . rawurlencode( $endpoint ) . '/invocations';
	$payload = array(
		'messages'    => $messages,
		'max_tokens'  => $max_tokens,
		'temperature' => $temperature,
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
		return new WP_REST_Response( array( 'error' => 'Backend: ' . $resp->get_error_message() ), 502 );
	}
	$code = wp_remote_retrieve_response_code( $resp );
	$raw  = wp_remote_retrieve_body( $resp );
	$data = json_decode( $raw, true );
	if ( $code >= 400 ) {
		$msg = is_array( $data ) && isset( $data['message'] ) ? $data['message']
			 : ( is_array( $data ) && isset( $data['error']['message'] ) ? $data['error']['message'] : substr( $raw, 0, 400 ) );
		return new WP_REST_Response( array( 'error' => 'Backend HTTP ' . $code . ' — ' . $msg ), 502 );
	}
	$text = '';
	if ( is_array( $data ) ) {
		if ( isset( $data['choices'][0]['message']['content'] ) ) { $text = $data['choices'][0]['message']['content']; }
		elseif ( isset( $data['choices'][0]['text'] ) ) { $text = $data['choices'][0]['text']; }
		elseif ( isset( $data['content'][0]['text'] ) ) { $text = $data['content'][0]['text']; }
	}
	if ( $text === '' ) {
		return new WP_REST_Response( array( 'error' => 'Réponse vide du modèle.' ), 502 );
	}
	return new WP_REST_Response( array( 'text' => $text ), 200 );
}

/* -------------------------------------------------------------------------
 * Admin settings page — Réglages → NutriPlan AI
 * Only required if the operator wants the chat to call Databricks directly
 * AND the CGM Cockpit plugin isn't already configured (we reuse those keys).
 * ---------------------------------------------------------------------- */
add_action( 'admin_menu', function () {
	add_options_page( 'NutriPlan AI', 'NutriPlan AI', 'manage_options', 'dnai-nutriplan', 'dnai_nplan_settings_page' );
} );

add_action( 'admin_post_dnai_nplan_save', function () {
	if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'Forbidden', 403 ); }
	check_admin_referer( 'dnai_nplan_save' );
	$in = isset( $_POST['dnai_nplan_settings'] ) && is_array( $_POST['dnai_nplan_settings'] )
		? wp_unslash( $_POST['dnai_nplan_settings'] ) : array();
	$tok = isset( $in['dbx_token'] ) ? trim( $in['dbx_token'] ) : '';
	if ( $tok === '' ) { $tok = get_option( 'dnai_nplan_settings', array() ); $tok = isset( $tok['dbx_token'] ) ? $tok['dbx_token'] : ''; }
	$val = array(
		'dbx_workspace' => isset( $in['dbx_workspace'] ) ? esc_url_raw( trim( $in['dbx_workspace'] ) ) : '',
		'dbx_endpoint'  => isset( $in['dbx_endpoint'] )  ? sanitize_text_field( $in['dbx_endpoint'] )  : '',
		'dbx_token'     => $tok,
		'dbx_timeout'   => isset( $in['dbx_timeout'] ) && (int) $in['dbx_timeout'] >= 15 ? (string) (int) $in['dbx_timeout'] : '120',
	);
	update_option( 'dnai_nplan_settings', $val );
	wp_safe_redirect( add_query_arg( array( 'page' => 'dnai-nutriplan', 'nplan_saved' => '1' ), admin_url( 'options-general.php' ) ) );
	exit;
} );

function dnai_nplan_settings_page() {
	$o = get_option( 'dnai_nplan_settings', array() );
	$shared = get_option( 'dnai_cgmck_settings', array() );
	$g = function ( $k, $d = '' ) use ( $o, $shared ) {
		if ( isset( $o[ $k ] ) && $o[ $k ] !== '' ) return esc_attr( $o[ $k ] );
		if ( isset( $shared[ $k ] ) && $shared[ $k ] !== '' ) return esc_attr( $shared[ $k ] );
		return esc_attr( $d );
	};
	$has_tok = ( isset( $o['dbx_token'] ) && $o['dbx_token'] !== '' ) || ( isset( $shared['dbx_token'] ) && $shared['dbx_token'] !== '' );
	$using_shared = ( ! ( isset( $o['dbx_workspace'] ) && $o['dbx_workspace'] !== '' ) ) && ( isset( $shared['dbx_workspace'] ) && $shared['dbx_workspace'] !== '' );
	?>
	<div class="wrap">
		<h1>NutriPlan AI</h1>
		<?php if ( isset( $_GET['nplan_saved'] ) ) : ?><div class="notice notice-success is-dismissible"><p>Configuration enregistrée.</p></div><?php endif; ?>
		<?php if ( $using_shared ) : ?><div class="notice notice-info"><p>Les paramètres Databricks sont actuellement <b>hérités du plugin CGM Cockpit</b> (même workspace). Tu peux laisser vide pour conserver ce comportement.</p></div><?php endif; ?>
		<p class="description">Le backend AI sert le co-pilote NutriPlan (chat-with-data). Réutilise le proxy Databricks du CGM Cockpit si déjà configuré — sinon renseigne ci-dessous.</p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'dnai_nplan_save' ); ?>
			<input type="hidden" name="action" value="dnai_nplan_save">
			<table class="form-table">
				<tr><th>Workspace URL</th><td><input type="url" name="dnai_nplan_settings[dbx_workspace]" value="<?php echo $g( 'dbx_workspace' ); ?>" class="regular-text" placeholder="https://adb-...azuredatabricks.net"></td></tr>
				<tr><th>Endpoint name</th><td><input type="text" name="dnai_nplan_settings[dbx_endpoint]" value="<?php echo $g( 'dbx_endpoint' ); ?>" class="regular-text" placeholder="databricks-claude-sonnet-4-5"></td></tr>
				<tr><th>PAT</th><td><input type="password" autocomplete="new-password" name="dnai_nplan_settings[dbx_token]" value="" class="regular-text" placeholder="<?php echo $has_tok ? '•••• déjà enregistré — laisser vide pour conserver' : 'dapi-...'; ?>"></td></tr>
				<tr><th>Timeout (s)</th><td><input type="number" min="15" name="dnai_nplan_settings[dbx_timeout]" value="<?php echo $g( 'dbx_timeout', '120' ); ?>" class="small-text"></td></tr>
			</table>
			<p><button class="button button-primary">Enregistrer</button></p>
		</form>
	</div>
	<?php
}
