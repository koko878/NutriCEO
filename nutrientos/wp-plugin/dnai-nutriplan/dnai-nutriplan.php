<?php
/**
 * Plugin Name:       D²nAI NutriPlan — Trial Management Cockpit
 * Description:       Sister-app of NutriTrials covering the full upstream Trial Management cycle (annual planning, Use Case intake, Steering / CEO / Monitoring gates, internal controls, Fast Track lane, closure & knowledge base). Includes a chat-with-data AI co-pilot designed and operated by the D²nAI team.
 * Version:           0.22.1
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-nutriplan
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_NPLAN_VER', '0.22.1' );
define( 'DNAI_NPLAN_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_NPLAN_DIR', plugin_dir_path( __FILE__ ) );
define( 'DNAI_NPLAN_DB_VER', '1' );

/* -------------------------------------------------------------------------
 * REAL DATABASE LAYER (MVP ouvert aux utilisateurs)
 * Une table custom {prefix}dnai_nplan_store : une ligne par collection
 * (usecases, projects, reference, feedback). Stockage JSON, persistance
 * serveur partagée entre tous les utilisateurs (≠ localStorage par poste).
 * ---------------------------------------------------------------------- */
function dnai_nplan_table() {
	global $wpdb;
	return $wpdb->prefix . 'dnai_nplan_store';
}
function dnai_nplan_install_db() {
	global $wpdb;
	$table   = dnai_nplan_table();
	$charset = $wpdb->get_charset_collate();
	$sql = "CREATE TABLE $table (
		collection varchar(64) NOT NULL,
		data longtext NOT NULL,
		updated_at datetime NOT NULL DEFAULT '1970-01-01 00:00:00',
		updated_by bigint(20) unsigned NOT NULL DEFAULT 0,
		PRIMARY KEY  (collection)
	) $charset;";
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	dbDelta( $sql );
	update_option( 'dnai_nplan_db_ver', DNAI_NPLAN_DB_VER );
}
// Auto-migration si la version DB change (sans réactiver le plugin).
add_action( 'plugins_loaded', function () {
	if ( get_option( 'dnai_nplan_db_ver' ) !== DNAI_NPLAN_DB_VER ) {
		dnai_nplan_install_db();
	}
} );

function dnai_nplan_collections() {
	// Whitelist — évite l'écriture de collections arbitraires.
	// v0.19 : ajout de "roles" (Admin > Accès).
	// v0.21 : ajout de "governance" (RACI/seuils/SLA paramétrables) + "prefs_user"
	// (préférences personnelles utilisateur, ex: coach on/off, niveau, hints fermés).
	// v0.22 : ajout de "ceo_decisions" (validation portfolio par entité × région, retour Halima).
	return array( 'usecases', 'projects', 'reference', 'feedback', 'roles', 'governance', 'prefs_user', 'ceo_decisions' );
}
function dnai_nplan_store_get( $collection ) {
	global $wpdb;
	$table = dnai_nplan_table();
	$row = $wpdb->get_row( $wpdb->prepare( "SELECT data, updated_at FROM $table WHERE collection = %s", $collection ), ARRAY_A );
	if ( ! $row ) { return null; }
	return array( 'data' => json_decode( $row['data'], true ), 'updated_at' => $row['updated_at'] );
}
function dnai_nplan_store_put( $collection, $data ) {
	global $wpdb;
	$wpdb->replace( dnai_nplan_table(), array(
		'collection' => $collection,
		'data'       => wp_json_encode( $data ),
		'updated_at' => current_time( 'mysql' ),
		'updated_by' => get_current_user_id(),
	), array( '%s', '%s', '%s', '%d' ) );
	return true;
}

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
	add_rewrite_rule( '^nutriplan/?$',       'index.php?dnai_nplan_app=1',  'top' );
	add_rewrite_rule( '^nutriplan-pitch/?$', 'index.php?dnai_nplan_app=2',  'top' );
}
add_action( 'init', 'dnai_nplan_add_rewrite' );

add_filter( 'query_vars', function ( $vars ) { $vars[] = 'dnai_nplan_app'; return $vars; } );

register_activation_hook( __FILE__, function () {
	dnai_nplan_add_rewrite();
	flush_rewrite_rules();
	dnai_nplan_install_db();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

add_action( 'template_redirect', function () {
	$which = intval( get_query_var( 'dnai_nplan_app' ) );
	if ( ! $which ) { return; }
	$file = $which === 2 ? 'app/nutriplan-pitch.html' : 'app/nutriplan.html';
	$f = DNAI_NPLAN_DIR . $file;
	if ( file_exists( $f ) ) {
		nocache_headers();
		header( 'Content-Type: text/html; charset=utf-8' );
		$html = file_get_contents( $f );
		// Inject the AI / config bridge so the SPA can discover endpoints + nonce.
		$cfg  = '<script>window.DNAI_NPLAN=' . wp_json_encode( array(
			'ai'     => dnai_nplan_ai_ready(),
			'chat'   => esc_url_raw( rest_url( 'dnai-nutriplan/v1/chat' ) ),
			'config' => esc_url_raw( rest_url( 'dnai-nutriplan/v1/config' ) ),
			'api'    => esc_url_raw( rest_url( 'dnai-nutriplan/v1' ) ),
			'nonce'  => wp_create_nonce( 'wp_rest' ),
			'home'   => esc_url_raw( home_url( '/' ) ),
			'user'   => wp_get_current_user()->display_name ?: '',
			'ver'    => DNAI_NPLAN_VER,
		) ) . ';</script>';
		// IMPORTANT (v0.17 hotfix défensif) : str_replace remplace TOUTES les
		// occurrences. Si le bundle inline contient un littéral "</head>"
		// (toute lib parsant du HTML, ex: XLSX), l'injection casserait le
		// <script> bundle (fermeture prématurée) et la page afficherait du JS
		// brut. On cible la DERNIÈRE </head> (vraie balise) via strrpos.
		$pos = strrpos( $html, '</head>' );
		if ( $pos !== false ) {
			$html = substr_replace( $html, $cfg . "\n</head>", $pos, strlen( '</head>' ) );
		}
		echo $html;
		exit;
	}
} );

/* -------------------------------------------------------------------------
 * Shortcode [nutriplan] — embeds the app full-bleed with auto-resize.
 * ---------------------------------------------------------------------- */
add_shortcode( 'nutriplan_pitch', function () {
	$src = esc_url( DNAI_NPLAN_URL . 'app/nutriplan-pitch.html?v=' . DNAI_NPLAN_VER );
	$id  = 'dnaiNplanPitch_' . wp_generate_password( 6, false, false );
	return '<div style="position:relative;left:50%;right:50%;margin-left:-50vw;margin-right:-50vw;width:100vw;max-width:100vw;background:#fff">'
		.'<iframe id="'.esc_attr( $id ).'" src="'.$src.'" loading="lazy" style="display:block;width:100%;border:0;min-height:100vh"></iframe>'
		.'<a href="'.esc_url( home_url( '/nutriplan-pitch' ) ).'" target="_blank" rel="noopener" style="display:inline-block;margin:8px 16px;color:#2E7D32;font-size:13px;text-decoration:underline">↗ Open the pitch full-screen (for projection)</a>'
		.'</div>';
} );

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
    api: <?php echo wp_json_encode( esc_url_raw( rest_url( 'dnai-nutriplan/v1' ) ) ); ?>,
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

	/* ----- Data persistence (real DB) ----- */
	// Bulk : GET /collection/{name} · PUT /collection/{name}
	register_rest_route( 'dnai-nutriplan/v1', '/collection/(?P<name>[a-z_]+)', array(
		array(
			'methods'             => 'GET',
			'callback'            => 'dnai_nplan_rest_collection_get',
			'permission_callback' => 'dnai_nplan_same_origin_perm',
		),
		array(
			'methods'             => 'PUT',
			'callback'            => 'dnai_nplan_rest_collection_put',
			'permission_callback' => 'dnai_nplan_same_origin_perm',
		),
	) );
	// Granulaire : POST /item/{name} (upsert par id) · DELETE /item/{name}/{id}
	register_rest_route( 'dnai-nutriplan/v1', '/item/(?P<name>[a-z_]+)', array(
		'methods'             => 'POST',
		'callback'            => 'dnai_nplan_rest_item_upsert',
		'permission_callback' => 'dnai_nplan_same_origin_perm',
	) );
	register_rest_route( 'dnai-nutriplan/v1', '/item/(?P<name>[a-z_]+)/(?P<id>[A-Za-z0-9_\-]+)', array(
		'methods'             => 'DELETE',
		'callback'            => 'dnai_nplan_rest_item_delete',
		'permission_callback' => 'dnai_nplan_same_origin_perm',
	) );
} );

function dnai_nplan_valid_collection( $name ) {
	return in_array( $name, dnai_nplan_collections(), true );
}
function dnai_nplan_rest_collection_get( $req ) {
	$name = $req['name'];
	if ( ! dnai_nplan_valid_collection( $name ) ) { return new WP_REST_Response( array( 'error' => 'unknown collection' ), 404 ); }
	$row = dnai_nplan_store_get( $name );
	$r = new WP_REST_Response( array(
		'collection' => $name,
		'data'       => $row ? $row['data'] : null,
		'updated_at' => $row ? $row['updated_at'] : null,
	), 200 );
	$r->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
	return $r;
}
function dnai_nplan_rest_collection_put( $req ) {
	$name = $req['name'];
	if ( ! dnai_nplan_valid_collection( $name ) ) { return new WP_REST_Response( array( 'error' => 'unknown collection' ), 404 ); }
	$body = $req->get_json_params();
	$data = isset( $body['data'] ) ? $body['data'] : $body;
	dnai_nplan_store_put( $name, $data );
	return new WP_REST_Response( array( 'ok' => true, 'collection' => $name, 'updated_at' => current_time( 'mysql' ) ), 200 );
}
function dnai_nplan_rest_item_upsert( $req ) {
	$name = $req['name'];
	if ( ! dnai_nplan_valid_collection( $name ) ) { return new WP_REST_Response( array( 'error' => 'unknown collection' ), 404 ); }
	$item = $req->get_json_params();
	if ( ! is_array( $item ) || ! isset( $item['id'] ) ) { return new WP_REST_Response( array( 'error' => 'item needs an id' ), 400 ); }
	$row = dnai_nplan_store_get( $name );
	$list = ( $row && is_array( $row['data'] ) ) ? $row['data'] : array();
	$found = false;
	foreach ( $list as $i => $existing ) {
		if ( isset( $existing['id'] ) && $existing['id'] === $item['id'] ) { $list[ $i ] = $item; $found = true; break; }
	}
	if ( ! $found ) { array_unshift( $list, $item ); }
	dnai_nplan_store_put( $name, $list );
	return new WP_REST_Response( array( 'ok' => true, 'id' => $item['id'], 'created' => ! $found, 'count' => count( $list ) ), 200 );
}
function dnai_nplan_rest_item_delete( $req ) {
	$name = $req['name'];
	if ( ! dnai_nplan_valid_collection( $name ) ) { return new WP_REST_Response( array( 'error' => 'unknown collection' ), 404 ); }
	$id = $req['id'];
	$row = dnai_nplan_store_get( $name );
	$list = ( $row && is_array( $row['data'] ) ) ? $row['data'] : array();
	$list = array_values( array_filter( $list, function ( $x ) use ( $id ) { return ! ( isset( $x['id'] ) && $x['id'] === $id ); } ) );
	dnai_nplan_store_put( $name, $list );
	return new WP_REST_Response( array( 'ok' => true, 'id' => $id, 'count' => count( $list ) ), 200 );
}

// Bypass WP's global cookie-nonce check for our endpoint when same-origin
// (Azure Front Door / sticky nonces make the default check unreliable).
add_filter( 'rest_authentication_errors', function ( $result ) {
	$uri = isset( $_SERVER['REQUEST_URI'] ) ? $_SERVER['REQUEST_URI'] : '';
	if ( strpos( $uri, 'dnai-nutriplan/v1/' ) === false ) { return $result; }
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
		<?php if ( $using_shared ) : ?><div class="notice notice-info"><p>Les paramètres backend AI sont actuellement <b>hérités du plugin CGM Cockpit</b>. Tu peux laisser vide pour conserver ce comportement.</p></div><?php endif; ?>
		<p class="description">Backend AI du co-pilote NutriPlan (chat-with-data) — conçu et opéré par l'équipe D²nAI. Réutilise la configuration du CGM Cockpit si déjà en place.</p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'dnai_nplan_save' ); ?>
			<input type="hidden" name="action" value="dnai_nplan_save">
			<table class="form-table">
				<tr><th>Workspace URL</th><td><input type="url" name="dnai_nplan_settings[dbx_workspace]" value="<?php echo $g( 'dbx_workspace' ); ?>" class="regular-text" placeholder="https://..."></td></tr>
				<tr><th>Endpoint name</th><td><input type="text" name="dnai_nplan_settings[dbx_endpoint]" value="<?php echo $g( 'dbx_endpoint' ); ?>" class="regular-text" placeholder="endpoint-name"></td></tr>
				<tr><th>PAT</th><td><input type="password" autocomplete="new-password" name="dnai_nplan_settings[dbx_token]" value="" class="regular-text" placeholder="<?php echo $has_tok ? '•••• déjà enregistré — laisser vide pour conserver' : 'dapi-...'; ?>"></td></tr>
				<tr><th>Timeout (s)</th><td><input type="number" min="15" name="dnai_nplan_settings[dbx_timeout]" value="<?php echo $g( 'dbx_timeout', '120' ); ?>" class="small-text"></td></tr>
			</table>
			<p><button class="button button-primary">Enregistrer</button></p>
		</form>
	</div>
	<?php
}
