<?php
/**
 * Plugin Name:       D²nAI NutrientOS
 * Description:       Hosts the NutrientOS prototype, the executive one-pager and the executive summary. Full-screen URLs (no theme chrome) + shortcodes with full-bleed auto-resizing iframes. Includes a server-side AI proxy (curate) to the OCP AI Lab for auto-summaries/insights.
 * Version:           2.4.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-nutrientos
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_NOS_VER', '2.4.0' );
define( 'DNAI_NOS_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_NOS_DIR', plugin_dir_path( __FILE__ ) );

function dnai_nos_files() {
	return array( 'index' => 'index.html', 'exec' => 'exec.html', 'execsum' => 'execsum.html' );
}
function dnai_nos_opt( $key, $default = '' ) {
	$o = get_option( 'dnai_nos_settings', array() );
	return isset( $o[ $key ] ) && $o[ $key ] !== '' ? $o[ $key ] : $default;
}
function dnai_nos_ai_ready() {
	return dnai_nos_opt( 'base_url' ) !== '' && dnai_nos_opt( 'api_key' ) !== '';
}

/* -------------------------------------------------------------------------
 * 1. FULL-SCREEN routes — serve an app with NO theme, and inject the AI config.
 * ---------------------------------------------------------------------- */
function dnai_nos_add_rewrite() {
	add_rewrite_rule( '^nutrientos/?$',         'index.php?dnai_nos_app=index',   'top' );
	add_rewrite_rule( '^nutrientos-exec/?$',    'index.php?dnai_nos_app=exec',    'top' );
	add_rewrite_rule( '^nutrientos-execsum/?$', 'index.php?dnai_nos_app=execsum', 'top' );
}
add_action( 'init', 'dnai_nos_add_rewrite' );
add_filter( 'query_vars', function ( $v ) { $v[] = 'dnai_nos_app'; return $v; } );

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
		$html = file_get_contents( $path );
		$cfg  = '<script>window.DNAI_NOS=' . wp_json_encode( array(
			'curate' => esc_url_raw( rest_url( 'dnai-nutrientos/v1/curate' ) ),
			'nonce'  => wp_create_nonce( 'wp_rest' ),
			'ai'     => dnai_nos_ai_ready(),
		) ) . ';</script>';
		echo str_replace( '</head>', $cfg . '</head>', $html ); // phpcs:ignore
	} else {
		status_header( 404 ); echo 'NutrientOS app not found.';
	}
	exit;
} );

register_activation_hook( __FILE__, function () { dnai_nos_add_rewrite(); flush_rewrite_rules(); } );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

function dnai_nos_fs_url( $which = 'index' ) {
	$slug = array( 'index' => 'nutrientos', 'exec' => 'nutrientos-exec', 'execsum' => 'nutrientos-execsum' );
	return get_option( 'permalink_structure' ) ? home_url( '/' . $slug[ $which ] ) : home_url( '/?dnai_nos_app=' . $which );
}

/* -------------------------------------------------------------------------
 * 2. Shortcodes — iframe points at the route (so the AI config is injected).
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
		. 'window.addEventListener("message",function(e){if(!e.data)return;'
		. 'if(typeof e.data.dnaiNosHeight==="number"){f.style.height=(e.data.dnaiNosHeight+2)+"px";}'
		. 'if(e.data.dnaiNosScroll){f.scrollIntoView({behavior:"smooth",block:"start"});}});'
		. '})();</script></div>';
}
add_shortcode( 'nutrientos',         function () { return dnai_nos_frame( 'index' ); } );
add_shortcode( 'nutrientos_exec',    function () { return dnai_nos_frame( 'exec' ); } );
add_shortcode( 'nutrientos_execsum', function () { return dnai_nos_frame( 'execsum' ); } );

/* -------------------------------------------------------------------------
 * 3. AI proxy — POST /wp-json/dnai-nutrientos/v1/curate
 *    Body: { title, ftype, content?, image? (data URL) }
 *    Calls the AI Lab (OpenAI-compatible) with the custom model, key server-side.
 * ---------------------------------------------------------------------- */
add_action( 'rest_api_init', function () {
	register_rest_route( 'dnai-nutrientos/v1', '/config', array(
		'methods'             => 'GET',
		'permission_callback' => '__return_true',
		'callback'            => function () {
			nocache_headers();
				$r = new WP_REST_Response( array(
					'curate' => esc_url_raw( rest_url( 'dnai-nutrientos/v1/curate' ) ),
					'nonce'  => wp_create_nonce( 'wp_rest' ),
					'ai'     => dnai_nos_ai_ready(),
				), 200 );
				$r->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
				return $r;
		},
	) );
	register_rest_route( 'dnai-nutrientos/v1', '/curate', array(
		'methods'             => 'POST',
		'callback'            => 'dnai_nos_curate',
		'permission_callback' => function ( $req ) {
			// Accept a valid REST nonce when present…
			$nonce = $req->get_header( 'X-WP-Nonce' );
			if ( $nonce && wp_verify_nonce( $nonce, 'wp_rest' ) ) { return true; }
			// …or a same-origin browser request. Behind Azure Front Door the cookie-bound
			// nonce can be cached/stale, so we also trust requests whose Origin/Referer host
			// matches this site (the browser sets Origin on cross-context POSTs it controls).
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

/* WordPress runs a GLOBAL cookie-nonce check (rest_cookie_check_errors, priority 100
 * on rest_authentication_errors) before any route permission_callback. Running at 99
 * and returning a non-empty value makes that core check short-circuit. Behind Azure
 * Front Door the cookie-bound nonce is often stale (cached), so logged-in admins get
 * a 403 "Cookie check failed" before our same-origin logic can run. Neutralize that
 * error ONLY for our /curate endpoint and ONLY for same-origin browser requests. */
add_filter( 'rest_authentication_errors', function ( $result ) {
	$uri = isset( $_SERVER['REQUEST_URI'] ) ? $_SERVER['REQUEST_URI'] : '';
	if ( strpos( $uri, 'dnai-nutrientos/v1/curate' ) === false ) { return $result; }
	$origin = isset( $_SERVER['HTTP_ORIGIN'] ) ? $_SERVER['HTTP_ORIGIN'] : ( isset( $_SERVER['HTTP_REFERER'] ) ? $_SERVER['HTTP_REFERER'] : '' );
	if ( $origin ) {
		$oh = wp_parse_url( $origin, PHP_URL_HOST );
		$sh = wp_parse_url( home_url(), PHP_URL_HOST );
		if ( $oh && $sh && strcasecmp( $oh, $sh ) === 0 ) {
			return true; // Same-origin: treat as authenticated, bypassing the stale-nonce 403.
		}
	}
	return $result;
}, 99 );

function dnai_nos_curate( $req ) {
	if ( ! dnai_nos_ai_ready() ) {
		return new WP_REST_Response( array( 'error' => 'AI non configurée (Réglages → D²nAI NutrientOS).' ), 400 );
	}
	// The AI Lab model can be slow (cold start, vision). Give it room.
	@set_time_limit( 0 );
	@ignore_user_abort( true );
	$timeout = (int) dnai_nos_opt( 'timeout', '300' );
	if ( $timeout < 30 ) { $timeout = 300; }
	$b       = $req->get_json_params();
	$title   = isset( $b['title'] ) ? sanitize_text_field( $b['title'] ) : '';
	$ftype   = isset( $b['ftype'] ) ? sanitize_text_field( $b['ftype'] ) : '';
	$content = isset( $b['content'] ) ? (string) $b['content'] : '';
	$image   = isset( $b['image'] ) ? (string) $b['image'] : '';

	$base  = rtrim( dnai_nos_opt( 'base_url' ), '/' );
	$path  = dnai_nos_opt( 'api_path', '/api/chat/completions' );
	$key   = dnai_nos_opt( 'api_key' );
	$model = dnai_nos_opt( 'model', 'nutrientos-curator' );

	$schema = "Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, avec EXACTEMENT ces clés :\n"
		. "{\n"
		. "  \"summary\": \"résumé synthétique du contenu, 3 phrases maximum\",\n"
		. "  \"description\": \"à quoi sert ce document/jeu de données, 1 phrase\",\n"
		. "  \"insights\": [\"insight agronomique clé 1\", \"insight 2\", \"insight 3\"],\n"
		. "  \"topics\": [\"mot-clé\", \"mot-clé\"],\n"
		. "  \"suggested_type\": \"dataset|standard|model|document\"\n"
		. "}\n";
	$intro = "Tu es nutrientos-curator, l'IA de curation du hub agronomique OCP Nutricrops.\n"
		. "Asset à cataloguer.\nTitre : {$title}\nType de fichier : {$ftype}\n" . $schema;
	if ( $image ) {
		$user = array(
			array( 'type' => 'text', 'text' => $intro . "Analyse cette image dans le contexte agronomique (sol, culture, parcelle, état du couvert) puis renvoie le JSON." ),
			array( 'type' => 'image_url', 'image_url' => array( 'url' => $image ) ),
		);
	} else {
		$content = mb_substr( $content, 0, 12000 );
		$user    = $intro . "\nContenu à analyser :\n" . $content;
	}

	$payload = array(
		'model'       => $model,
		'temperature' => 0.1,
		'messages'    => array( array( 'role' => 'user', 'content' => $user ) ),
	);
	if ( dnai_nos_opt( 'json_mode', '1' ) === '1' ) {
		$payload['response_format'] = array( 'type' => 'json_object' );
	}

	$resp = wp_remote_post( $base . $path, array(
		'timeout' => $timeout,
		'headers' => array( 'Content-Type' => 'application/json', 'Authorization' => 'Bearer ' . $key ),
		'body'    => wp_json_encode( $payload ),
	) );
	if ( is_wp_error( $resp ) ) {
		return new WP_REST_Response( array( 'error' => $resp->get_error_message() ), 502 );
	}
	$data = json_decode( wp_remote_retrieve_body( $resp ), true );
	$txt  = isset( $data['choices'][0]['message']['content'] ) ? $data['choices'][0]['message']['content'] : '';
	if ( $txt === '' ) {
		return new WP_REST_Response( array( 'error' => 'Réponse vide du modèle.', 'raw' => $data ), 502 );
	}
	// Extract the JSON object from the model's reply.
	$json = json_decode( $txt, true );
	if ( ! is_array( $json ) && preg_match( '/\{.*\}/s', $txt, $m ) ) {
		$json = json_decode( $m[0], true );
	}
	if ( ! is_array( $json ) ) {
		return new WP_REST_Response( array( 'error' => 'JSON non interprétable.', 'text' => $txt ), 502 );
	}
	return new WP_REST_Response( $json, 200 );
}

/* -------------------------------------------------------------------------
 * 4. Settings page
 * ---------------------------------------------------------------------- */
add_action( 'admin_menu', function () {
	add_options_page( 'D²nAI NutrientOS', 'D²nAI NutrientOS', 'manage_options', 'dnai-nutrientos', 'dnai_nos_settings_page' );
} );

/* Self-handled save through admin-post.php. We do NOT use the Settings API /
 * options.php here because this site sits behind Azure Front Door, where the
 * options.php POST round-trip can be dropped/cached and the option never
 * persists. admin-post.php + update_option() is direct and reliable. */
add_action( 'admin_post_dnai_nos_save', function () {
	if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'Forbidden', 403 ); }
	check_admin_referer( 'dnai_nos_save' );
	$in  = isset( $_POST['dnai_nos_settings'] ) && is_array( $_POST['dnai_nos_settings'] )
		? wp_unslash( $_POST['dnai_nos_settings'] ) : array();
	$key = isset( $in['api_key'] ) ? trim( $in['api_key'] ) : '';
	// Blank key field = keep the previously stored key (so re-saving doesn't wipe it).
	if ( $key === '' ) { $key = dnai_nos_opt( 'api_key' ); }
	$val = array(
		'base_url'  => isset( $in['base_url'] ) ? esc_url_raw( trim( $in['base_url'] ) ) : '',
		'api_path'  => isset( $in['api_path'] ) && trim( $in['api_path'] ) !== '' ? sanitize_text_field( $in['api_path'] ) : '/api/chat/completions',
		'api_key'   => $key,
		'model'     => isset( $in['model'] ) && trim( $in['model'] ) !== '' ? sanitize_text_field( $in['model'] ) : 'nutrientos-curator',
		'json_mode' => isset( $in['json_mode'] ) ? '1' : '0',
		'timeout'   => isset( $in['timeout'] ) && (int) $in['timeout'] >= 30 ? (string) (int) $in['timeout'] : '300',
	);
	update_option( 'dnai_nos_settings', $val );
	wp_safe_redirect( add_query_arg( array( 'page' => 'dnai-nutrientos', 'dnai_saved' => '1' ), admin_url( 'options-general.php' ) ) );
	exit;
} );

function dnai_nos_settings_page() {
	$o = get_option( 'dnai_nos_settings', array() );
	$g = function ( $k, $d = '' ) use ( $o ) { return isset( $o[ $k ] ) ? esc_attr( $o[ $k ] ) : $d; };
	$has_key  = ( isset( $o['api_key'] ) && $o['api_key'] !== '' );
	$base_set = ( isset( $o['base_url'] ) && $o['base_url'] !== '' );
	$ready    = dnai_nos_ai_ready();
	?>
	<div class="wrap">
		<h1>D²nAI NutrientOS — IA</h1>
		<?php if ( isset( $_GET['dnai_saved'] ) ) : ?>
			<div class="notice notice-success is-dismissible"><p>Réglages enregistrés.</p></div>
		<?php endif; ?>
		<p>Proxy serveur vers l'AI Lab (OpenAI-compatible). La clé reste côté serveur ; le navigateur appelle <code>/wp-json/dnai-nutrientos/v1/curate</code>.</p>
		<p>Statut : <strong><?php echo $ready ? '✅ configuré' : '⚠️ non configuré'; ?></strong> · Plein écran : <code><?php echo esc_html( dnai_nos_fs_url( 'index' ) ); ?></code></p>
		<p style="color:#555;font-size:13px;margin-top:-6px;">
			Réellement stocké côté serveur — base URL : <code><?php echo $base_set ? esc_html( $o['base_url'] ) : '(vide)'; ?></code> ·
			clé API : <code><?php echo $has_key ? 'enregistrée (' . (int) strlen( $o['api_key'] ) . ' car.)' : '(vide)'; ?></code>
		</p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" autocomplete="off">
			<input type="hidden" name="action" value="dnai_nos_save">
			<?php wp_nonce_field( 'dnai_nos_save' ); ?>
			<table class="form-table">
				<tr><th>AI Lab base URL</th><td><input type="url" name="dnai_nos_settings[base_url]" value="<?php echo $g( 'base_url' ); ?>" class="regular-text" placeholder="https://lab.ocpnutricrops.ai"></td></tr>
				<tr><th>API path</th><td><input type="text" name="dnai_nos_settings[api_path]" value="<?php echo $g( 'api_path', '/api/chat/completions' ); ?>" class="regular-text"></td></tr>
				<tr><th>API key</th><td><input type="password" autocomplete="new-password" name="dnai_nos_settings[api_key]" value="" class="regular-text" placeholder="<?php echo $has_key ? '•••• déjà enregistrée — laisser vide pour conserver' : 'colle ta clé ici'; ?>"></td></tr>
				<tr><th>Modèle</th><td><input type="text" name="dnai_nos_settings[model]" value="<?php echo $g( 'model', 'nutrientos-curator' ); ?>" class="regular-text"></td></tr>
				<tr><th>JSON mode</th><td><label><input type="checkbox" name="dnai_nos_settings[json_mode]" value="1" <?php checked( '1', isset( $o['json_mode'] ) ? $o['json_mode'] : '1' ); ?>> Envoyer response_format=json_object</label></td></tr>
				<tr><th>Timeout (s)</th><td><input type="number" min="30" max="900" name="dnai_nos_settings[timeout]" value="<?php echo $g( 'timeout', '300' ); ?>" class="small-text"> <span style="color:#777;font-size:12px">délai max d'attente du modèle (défaut 300 s). Note : l'hébergeur/CDN peut imposer sa propre limite.</span></td></tr>
			</table>
			<?php submit_button(); ?>
		</form>
	</div>
	<?php
}

/* Plugins page links. */
add_filter( 'plugin_row_meta', function ( $links, $file ) {
	if ( strpos( $file, 'dnai-nutrientos' ) !== false ) {
		$links[] = '<a href="' . esc_url( dnai_nos_fs_url( 'index' ) ) . '" target="_blank"><strong>Plateforme</strong></a>';
		$links[] = '<a href="' . esc_url( admin_url( 'options-general.php?page=dnai-nutrientos' ) ) . '">Réglages IA</a>';
	}
	return $links;
}, 10, 2 );
