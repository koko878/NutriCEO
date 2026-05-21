<?php
/**
 * Plugin Name:       D²nAI Portal — Intake Genie & Product Catalog
 * Description:       Homepage chatbot that challenges, categorizes and structures Data/Digital/AI needs (powered by the AI Lab LLM, OpenAI-compatible / Open WebUI), plus a product catalog of live and in-development products.
 * Version:           1.2.1
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-portal
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_PORTAL_VER', '1.2.1' );
define( 'DNAI_PORTAL_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_PORTAL_DIR', plugin_dir_path( __FILE__ ) );

/* -------------------------------------------------------------------------
 * 1. Custom Post Types — products (catalog) & needs (intake captures)
 * ---------------------------------------------------------------------- */
function dnai_register_cpts() {
	register_post_type( 'dnai_product', array(
		'labels' => array(
			'name'          => 'Products',
			'singular_name' => 'Product',
			'menu_name'     => 'D²nAI Products',
			'add_new_item'  => 'Add Product',
			'edit_item'     => 'Edit Product',
		),
		'public'       => true,
		'show_in_rest' => true,
		'menu_icon'    => 'dashicons-grid-view',
		'supports'     => array( 'title', 'editor', 'thumbnail', 'excerpt' ),
		'has_archive'  => true,
		'rewrite'      => array( 'slug' => 'products' ),
	) );

	register_post_type( 'dnai_need', array(
		'labels' => array(
			'name'          => 'Intake Needs',
			'singular_name' => 'Need',
			'menu_name'     => 'D²nAI Needs',
		),
		'public'       => false,
		'show_ui'      => true,
		'show_in_menu' => true,
		'menu_icon'    => 'dashicons-format-chat',
		'supports'     => array( 'title', 'editor', 'custom-fields' ),
		'capability_type' => 'post',
	) );
}
add_action( 'init', 'dnai_register_cpts' );

/* product meta: status (live|dev|idea) + category */
function dnai_register_meta() {
	foreach ( array( 'dnai_status', 'dnai_category' ) as $key ) {
		register_post_meta( 'dnai_product', $key, array(
			'type'         => 'string',
			'single'       => true,
			'show_in_rest' => true,
			'auth_callback'=> function() { return current_user_can( 'edit_posts' ); },
		) );
	}
}
add_action( 'init', 'dnai_register_meta' );

/* Product edit screen: simple status / category metabox */
add_action( 'add_meta_boxes', function () {
	add_meta_box( 'dnai_product_meta', 'D²nAI · status & category', function ( $post ) {
		wp_nonce_field( 'dnai_product_meta', 'dnai_product_meta_nonce' );
		$status   = get_post_meta( $post->ID, 'dnai_status', true );
		$category = get_post_meta( $post->ID, 'dnai_category', true );
		echo '<p><label><strong>Status</strong></label><br><select name="dnai_status" style="width:100%">';
		foreach ( array( 'live' => 'Live', 'dev' => 'In development', 'idea' => 'Idea / next wave' ) as $k => $v ) {
			echo '<option value="' . esc_attr( $k ) . '" ' . selected( $status, $k, false ) . '>' . esc_html( $v ) . '</option>';
		}
		echo '</select></p>';
		echo '<p><label><strong>Category</strong></label><br><select name="dnai_category" style="width:100%">';
		foreach ( array( 'Data', 'Digital', 'AI' ) as $c ) {
			echo '<option value="' . esc_attr( $c ) . '" ' . selected( $category, $c, false ) . '>' . esc_html( $c ) . '</option>';
		}
		echo '</select></p>';
	}, 'dnai_product', 'side' );
} );

add_action( 'save_post_dnai_product', function ( $post_id ) {
	if ( ! isset( $_POST['dnai_product_meta_nonce'] ) || ! wp_verify_nonce( $_POST['dnai_product_meta_nonce'], 'dnai_product_meta' ) ) return;
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) return;
	if ( ! current_user_can( 'edit_post', $post_id ) ) return;
	if ( isset( $_POST['dnai_status'] ) )   update_post_meta( $post_id, 'dnai_status', sanitize_text_field( $_POST['dnai_status'] ) );
	if ( isset( $_POST['dnai_category'] ) ) update_post_meta( $post_id, 'dnai_category', sanitize_text_field( $_POST['dnai_category'] ) );
} );

/* -------------------------------------------------------------------------
 * 2. Settings (plug-n-play LLM config — Open WebUI / OpenAI-compatible)
 * ---------------------------------------------------------------------- */
function dnai_default_system_prompt() {
	return "You are D²nAI Intake Genie, the assistant of OCP Nutricrops' Data, Digital & AI team (D²nAI). Your job: help an internal user express a Data, Digital or AI need, then CHALLENGE, clarify and STRUCTURE it so the D²nAI team can scope development.\n\n" .
	"Rules:\n" .
	"- Detect the user's language (French or English) and ALWAYS reply in that language.\n" .
	"- Be warm, concise, professional. Ask ONE or at most TWO questions at a time.\n" .
	"- First understand the raw need, then CHALLENGE it: is it really a Data/Digital/AI problem? what is the underlying business pain? is there a simpler path?\n" .
	"- Categorize into one primary category: Data | Digital | AI, plus a short sub-category.\n" .
	"- Progressively gather: business problem, who is impacted (roles/BU), current process & pain, expected outcome, data available & sources, data sensitivity, volume/frequency, urgency/deadline, sponsor, success metric, constraints (budget, compliance).\n" .
	"- Converse naturally; never dump all questions at once.\n" .
	"- When you have enough to brief the dev team (or the user asks to submit), give the user a short recap in their language, THEN append on a new line a machine-readable block EXACTLY in this format and nothing after it:\n" .
	"[[BRIEF]]{\"title\":\"...\",\"category\":\"Data|Digital|AI\",\"subcategory\":\"...\",\"problem\":\"...\",\"impacted\":\"...\",\"current\":\"...\",\"outcome\":\"...\",\"data_sources\":\"...\",\"sensitivity\":\"...\",\"volume\":\"...\",\"urgency\":\"...\",\"sponsor\":\"...\",\"success_metric\":\"...\",\"constraints\":\"...\",\"lang\":\"fr|en\"}[[/BRIEF]]\n" .
	"- The JSON must be valid and on a single line. Keep keys exactly as given; field values in the user's language.";
}

function dnai_get_opt( $key, $default = '' ) {
	$o = get_option( 'dnai_portal_settings', array() );
	return isset( $o[ $key ] ) && $o[ $key ] !== '' ? $o[ $key ] : $default;
}

add_action( 'admin_menu', function () {
	add_options_page( 'D²nAI Portal', 'D²nAI Portal', 'manage_options', 'dnai-portal', 'dnai_settings_page' );
} );

add_action( 'admin_init', function () {
	register_setting( 'dnai_portal', 'dnai_portal_settings', array( 'sanitize_callback' => 'dnai_sanitize_settings' ) );
} );

function dnai_sanitize_settings( $in ) {
	return array(
		'base_url'      => isset( $in['base_url'] ) ? esc_url_raw( trim( $in['base_url'] ) ) : '',
		'api_path'      => isset( $in['api_path'] ) ? sanitize_text_field( $in['api_path'] ) : '/api/chat/completions',
		'api_key'       => isset( $in['api_key'] ) ? trim( $in['api_key'] ) : '',
		'model'         => isset( $in['model'] ) ? sanitize_text_field( $in['model'] ) : 'dnai-intake-genie',
		'stt_path'      => isset( $in['stt_path'] ) ? sanitize_text_field( $in['stt_path'] ) : '/audio/transcriptions',
		'stt_model'     => isset( $in['stt_model'] ) ? sanitize_text_field( $in['stt_model'] ) : 'whisper-1',
		'system_prompt' => isset( $in['system_prompt'] ) ? wp_kses_post( $in['system_prompt'] ) : '',
		'notify_email'  => isset( $in['notify_email'] ) ? sanitize_email( $in['notify_email'] ) : '',
	);
}

function dnai_settings_page() {
	$base   = dnai_get_opt( 'base_url', 'https://lab.ocpnutricrops.ai' );
	$path   = dnai_get_opt( 'api_path', '/api/chat/completions' );
	$key    = dnai_get_opt( 'api_key', '' );
	$model  = dnai_get_opt( 'model', 'dnai-intake-genie' );
	$sttp   = dnai_get_opt( 'stt_path', '/audio/transcriptions' );
	$sttm   = dnai_get_opt( 'stt_model', 'whisper-1' );
	$prompt = dnai_get_opt( 'system_prompt', dnai_default_system_prompt() );
	$email  = dnai_get_opt( 'notify_email', get_option( 'admin_email' ) );
	?>
	<div class="wrap">
		<h1>D²nAI Portal — settings</h1>
		<p>Plug the AI Lab LLM (Open WebUI / OpenAI-compatible). Shortcodes: <code>[dnai_home]</code> (full homepage), <code>[dnai_intake]</code> (chatbot) and <code>[dnai_catalog]</code> (product catalog).</p>
		<?php if ( isset( $_GET['seeded'] ) ) : ?>
			<div class="notice notice-success is-dismissible"><p><?php echo (int) $_GET['seeded']; ?> sample product(s) added under <strong>D²nAI Products</strong>.</p></div>
		<?php endif; ?>
		<form method="post" action="options.php">
			<?php settings_fields( 'dnai_portal' ); ?>
			<table class="form-table" role="presentation">
				<tr><th><label>AI Lab base URL</label></th>
					<td><input type="url" name="dnai_portal_settings[base_url]" value="<?php echo esc_attr( $base ); ?>" class="regular-text" placeholder="https://lab.ocpnutricrops.ai">
					<p class="description">Open WebUI host (no trailing slash). Ex: https://lab.ocpnutricrops.ai</p></td></tr>
				<tr><th><label>API path</label></th>
					<td><input type="text" name="dnai_portal_settings[api_path]" value="<?php echo esc_attr( $path ); ?>" class="regular-text">
					<p class="description">OpenAI-compatible chat endpoint. Open WebUI default: <code>/api/chat/completions</code></p></td></tr>
				<tr><th><label>API key</label></th>
					<td><input type="password" name="dnai_portal_settings[api_key]" value="<?php echo esc_attr( $key ); ?>" class="regular-text" autocomplete="off">
					<p class="description">Open WebUI → Settings → Account → API Keys. Stored server-side, never exposed to the browser.</p></td></tr>
				<tr><th><label>Model</label></th>
					<td><input type="text" name="dnai_portal_settings[model]" value="<?php echo esc_attr( $model ); ?>" class="regular-text" placeholder="dnai-intake-genie"></td></tr>
				<tr><th><label>Voice — transcription path</label></th>
					<td><input type="text" name="dnai_portal_settings[stt_path]" value="<?php echo esc_attr( $sttp ); ?>" class="regular-text">
					<p class="description">Speech-to-text endpoint on the AI Lab (OpenAI-compatible). Standard: <code>/audio/transcriptions</code>. Open WebUI may use <code>/api/v1/audio/transcriptions</code>.</p></td></tr>
				<tr><th><label>Voice — transcription model</label></th>
					<td><input type="text" name="dnai_portal_settings[stt_model]" value="<?php echo esc_attr( $sttm ); ?>" class="regular-text" placeholder="whisper-1">
					<p class="description">Whisper model name on the lab (e.g. <code>whisper-1</code> or <code>whisper</code>).</p></td></tr>
				<tr><th><label>Notify email</label></th>
					<td><input type="email" name="dnai_portal_settings[notify_email]" value="<?php echo esc_attr( $email ); ?>" class="regular-text">
					<p class="description">Each submitted need is emailed here (and saved under “D²nAI Needs”).</p></td></tr>
				<tr><th><label>System prompt</label></th>
					<td><textarea name="dnai_portal_settings[system_prompt]" rows="14" class="large-text code"><?php echo esc_textarea( $prompt ); ?></textarea>
					<p class="description">Drives how the bot challenges/categorizes and emits the structured <code>[[BRIEF]]…[[/BRIEF]]</code> block.</p></td></tr>
			</table>
			<?php submit_button(); ?>
		</form>
		<hr>
		<h2>Sample products</h2>
		<p>Seed a starter catalog (Market Intelligence Hub, COO Cockpit, EPM &amp; BI Suite, NutriRadar, Agronomy / Document Co-pilots, plus idea-stage products). Existing titles are skipped, so it is safe to run once.</p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="dnai_seed_products">
			<?php wp_nonce_field( 'dnai_seed' ); ?>
			<?php submit_button( 'Seed sample products', 'secondary' ); ?>
		</form>
	</div>
	<?php
}

/* -------------------------------------------------------------------------
 * 2bis. Seed sample products (one click, idempotent)
 * ---------------------------------------------------------------------- */
function dnai_sample_products() {
	return array(
		array( 'Market Intelligence Hub', 'live', 'Data',    'Phosphate & fertilizer market watch: prices, trade flows and competitor signals consolidated into one decision cockpit.' ),
		array( 'COO Cockpit',             'live', 'Digital', 'Real-time operations steering — production, supply, OTIF and KPIs unified in a single live dashboard.' ),
		array( 'EPM &amp; BI Suite',          'live', 'Data',    'Financial planning (EPM) and self-service BI for management: trusted reporting, forecasts and drill-down.' ),
		array( 'NutriRadar',              'dev',  'AI',      'Early-warning engine that surfaces agronomic and market signals through predictive models.' ),
		array( 'Agronomy Co-pilot',       'dev',  'AI',      'AI assistant recommending personalized fertilization by crop, soil and climate context.' ),
		array( 'Document Co-pilot',       'dev',  'AI',      'Internal document search & synthesis (RAG) so teams find and summarize knowledge instantly.' ),
		array( 'Soil-to-Yield Predictor', 'idea', 'AI',      'Model linking soil, climate and input data to expected yield, to guide nutrition strategy.' ),
		array( 'Customer 360',            'idea', 'Data',    'Unified view of farmers and distributors to personalize the offer and anticipate needs.' ),
	);
}

add_action( 'admin_post_dnai_seed_products', function () {
	if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'dnai_seed' ) ) wp_die( 'Not allowed' );
	$created = 0;
	foreach ( dnai_sample_products() as $p ) {
		list( $title, $status, $cat, $desc ) = $p;
		$dupe = get_posts( array( 'post_type' => 'dnai_product', 'title' => $title, 'posts_per_page' => 1, 'fields' => 'ids', 'post_status' => 'any' ) );
		if ( ! empty( $dupe ) ) continue;
		$id = wp_insert_post( array(
			'post_type'    => 'dnai_product',
			'post_status'  => 'publish',
			'post_title'   => $title,
			'post_excerpt' => $desc,
			'post_content' => $desc,
		) );
		if ( $id && ! is_wp_error( $id ) ) {
			update_post_meta( $id, 'dnai_status', $status );
			update_post_meta( $id, 'dnai_category', $cat );
			$created++;
		}
	}
	wp_safe_redirect( add_query_arg( array( 'page' => 'dnai-portal', 'seeded' => $created ), admin_url( 'options-general.php' ) ) );
	exit;
} );

/* -------------------------------------------------------------------------
 * 3. REST API — chat proxy (keeps API key server-side) + need capture
 * ---------------------------------------------------------------------- */
add_action( 'rest_api_init', function () {
	register_rest_route( 'dnai/v1', '/chat', array(
		'methods'             => 'POST',
		'callback'            => 'dnai_rest_chat',
		'permission_callback' => 'dnai_rest_permission',
	) );
	register_rest_route( 'dnai/v1', '/need', array(
		'methods'             => 'POST',
		'callback'            => 'dnai_rest_need',
		'permission_callback' => 'dnai_rest_permission',
	) );
	register_rest_route( 'dnai/v1', '/transcribe', array(
		'methods'             => 'POST',
		'callback'            => 'dnai_rest_transcribe',
		'permission_callback' => 'dnai_rest_permission',
	) );
} );

function dnai_rest_permission( $request ) {
	$nonce = $request->get_header( 'X-WP-Nonce' );
	return (bool) wp_verify_nonce( $nonce, 'wp_rest' );
}

function dnai_rest_chat( WP_REST_Request $request ) {
	$base  = dnai_get_opt( 'base_url' );
	$path  = dnai_get_opt( 'api_path', '/api/chat/completions' );
	$key   = dnai_get_opt( 'api_key' );
	$model = dnai_get_opt( 'model', 'dnai-intake-genie' );
	if ( ! $base || ! $key ) {
		return new WP_REST_Response( array( 'error' => 'LLM not configured. Set base URL and API key in D²nAI Portal settings.' ), 503 );
	}

	$messages = $request->get_param( 'messages' );
	if ( ! is_array( $messages ) ) $messages = array();

	/* sanitize incoming messages, cap length & count */
	$clean = array( array( 'role' => 'system', 'content' => dnai_get_opt( 'system_prompt', dnai_default_system_prompt() ) ) );
	$messages = array_slice( $messages, -24 );
	foreach ( $messages as $m ) {
		$role = isset( $m['role'] ) && in_array( $m['role'], array( 'user', 'assistant' ), true ) ? $m['role'] : 'user';
		$content = isset( $m['content'] ) ? wp_strip_all_tags( (string) $m['content'] ) : '';
		$content = mb_substr( $content, 0, 4000 );
		if ( $content !== '' ) $clean[] = array( 'role' => $role, 'content' => $content );
	}

	$resp = wp_remote_post( rtrim( $base, '/' ) . $path, array(
		'timeout' => 45,
		'headers' => array(
			'Authorization' => 'Bearer ' . $key,
			'Content-Type'  => 'application/json',
		),
		'body'    => wp_json_encode( array(
			'model'    => $model,
			'messages' => $clean,
			'stream'   => false,
		) ),
	) );

	if ( is_wp_error( $resp ) ) {
		return new WP_REST_Response( array( 'error' => 'AI Lab unreachable: ' . $resp->get_error_message() ), 502 );
	}
	$code = wp_remote_retrieve_response_code( $resp );
	$body = json_decode( wp_remote_retrieve_body( $resp ), true );
	if ( $code >= 400 || empty( $body['choices'][0]['message']['content'] ) ) {
		$msg = isset( $body['error']['message'] ) ? $body['error']['message'] : ( 'AI Lab error (HTTP ' . $code . ')' );
		return new WP_REST_Response( array( 'error' => $msg ), 502 );
	}

	return new WP_REST_Response( array( 'reply' => $body['choices'][0]['message']['content'] ), 200 );
}

function dnai_rest_transcribe( WP_REST_Request $request ) {
	$base  = dnai_get_opt( 'base_url' );
	$key   = dnai_get_opt( 'api_key' );
	$path  = dnai_get_opt( 'stt_path', '/audio/transcriptions' );
	$model = dnai_get_opt( 'stt_model', 'whisper-1' );
	if ( ! $base || ! $key ) {
		return new WP_REST_Response( array( 'error' => 'LLM not configured.' ), 503 );
	}

	$files = $request->get_file_params();
	if ( empty( $files['audio']['tmp_name'] ) || ! is_uploaded_file( $files['audio']['tmp_name'] ) ) {
		return new WP_REST_Response( array( 'error' => 'No audio received.' ), 400 );
	}
	$file = $files['audio'];
	if ( ! empty( $file['size'] ) && $file['size'] > 25 * 1024 * 1024 ) {
		return new WP_REST_Response( array( 'error' => 'Audio too large (max 25 MB).' ), 400 );
	}
	$data = file_get_contents( $file['tmp_name'] );
	if ( $data === false || $data === '' ) {
		return new WP_REST_Response( array( 'error' => 'Empty audio.' ), 400 );
	}

	$mime     = ! empty( $file['type'] ) ? preg_replace( '/[^a-zA-Z0-9\/\.\-\+]/', '', $file['type'] ) : 'audio/webm';
	$filename = preg_replace( '/[^a-zA-Z0-9\.\-_]/', '', basename( (string) $file['name'] ) );
	if ( $filename === '' ) $filename = 'audio.webm';

	$boundary = wp_generate_password( 24, false );
	$eol  = "\r\n";
	$body = '--' . $boundary . $eol
		. 'Content-Disposition: form-data; name="model"' . $eol . $eol
		. $model . $eol
		. '--' . $boundary . $eol
		. 'Content-Disposition: form-data; name="file"; filename="' . $filename . '"' . $eol
		. 'Content-Type: ' . $mime . $eol . $eol
		. $data . $eol
		. '--' . $boundary . '--' . $eol;

	$resp = wp_remote_post( rtrim( $base, '/' ) . $path, array(
		'timeout' => 60,
		'headers' => array(
			'Authorization' => 'Bearer ' . $key,
			'Content-Type'  => 'multipart/form-data; boundary=' . $boundary,
		),
		'body'    => $body,
	) );

	if ( is_wp_error( $resp ) ) {
		return new WP_REST_Response( array( 'error' => 'AI Lab unreachable: ' . $resp->get_error_message() ), 502 );
	}
	$code = wp_remote_retrieve_response_code( $resp );
	$rb   = json_decode( wp_remote_retrieve_body( $resp ), true );
	if ( $code >= 400 ) {
		$msg = isset( $rb['error']['message'] ) ? $rb['error']['message'] : ( 'Transcription error (HTTP ' . $code . '). Check the voice path/model in settings.' );
		return new WP_REST_Response( array( 'error' => $msg ), 502 );
	}
	$text = isset( $rb['text'] ) ? $rb['text'] : ( isset( $rb['transcription'] ) ? $rb['transcription'] : '' );
	return new WP_REST_Response( array( 'text' => (string) $text ), 200 );
}

function dnai_rest_need( WP_REST_Request $request ) {
	$brief = $request->get_param( 'brief' );
	if ( ! is_array( $brief ) ) return new WP_REST_Response( array( 'error' => 'invalid brief' ), 400 );

	$f = function( $k ) use ( $brief ) { return isset( $brief[ $k ] ) ? sanitize_text_field( wp_strip_all_tags( (string) $brief[ $k ] ) ) : ''; };
	$title = $f( 'title' ) ?: 'Need';
	$cat   = $f( 'category' );

	$lines = array();
	foreach ( array( 'category','subcategory','problem','impacted','current','outcome','data_sources','sensitivity','volume','urgency','sponsor','success_metric','constraints','lang' ) as $k ) {
		$lines[] = ucfirst( str_replace( '_', ' ', $k ) ) . ': ' . $f( $k );
	}
	$body = implode( "\n", $lines );

	$post_id = wp_insert_post( array(
		'post_type'    => 'dnai_need',
		'post_status'  => 'private',
		'post_title'   => '[' . ( $cat ?: 'Need' ) . '] ' . $title,
		'post_content' => $body,
	), true );

	if ( is_wp_error( $post_id ) ) return new WP_REST_Response( array( 'error' => 'save failed' ), 500 );

	foreach ( $brief as $k => $v ) {
		update_post_meta( $post_id, 'dnai_' . sanitize_key( $k ), sanitize_text_field( wp_strip_all_tags( (string) $v ) ) );
	}

	$to = dnai_get_opt( 'notify_email', get_option( 'admin_email' ) );
	if ( $to ) {
		wp_mail( $to, 'New D²nAI need · ' . $title, "A new need was captured by the Intake Genie:\n\n" . $body . "\n\n— D²nAI Portal" );
	}

	return new WP_REST_Response( array( 'ok' => true, 'id' => $post_id ), 200 );
}

/* -------------------------------------------------------------------------
 * 4. Assets
 * ---------------------------------------------------------------------- */
function dnai_enqueue() {
	wp_register_style( 'dnai-portal', DNAI_PORTAL_URL . 'assets/dnai-portal.css', array(), DNAI_PORTAL_VER );
	wp_register_script( 'dnai-intake', DNAI_PORTAL_URL . 'assets/dnai-intake.js', array(), DNAI_PORTAL_VER, true );
	wp_register_script( 'dnai-catalog', DNAI_PORTAL_URL . 'assets/dnai-catalog.js', array(), DNAI_PORTAL_VER, true );
	wp_localize_script( 'dnai-intake', 'DNAI', array(
		'rest'  => esc_url_raw( rest_url( 'dnai/v1' ) ),
		'nonce' => wp_create_nonce( 'wp_rest' ),
	) );
}
add_action( 'wp_enqueue_scripts', 'dnai_enqueue' );

/* -------------------------------------------------------------------------
 * 5. Shortcodes
 * ---------------------------------------------------------------------- */
function dnai_sc_intake( $atts ) {
	wp_enqueue_style( 'dnai-portal' );
	wp_enqueue_script( 'dnai-intake' );
	$a = shortcode_atts( array(
		'title'   => 'Express a Data, Digital or AI need',
		'opener'  => "Bonjour 👋 Décrivez votre besoin Data / Digital / IA — je vais le challenger et le cadrer pour l'équipe D²nAI. (Hi 👋 describe your need, I'll help frame it.)",
	), $atts );
	ob_start(); ?>
	<div class="dnai-chat" data-opener="<?php echo esc_attr( $a['opener'] ); ?>">
		<div class="dnai-chat-head">
			<span class="dnai-dot"></span>
			<div><div class="dnai-chat-title"><?php echo esc_html( $a['title'] ); ?></div>
			<div class="dnai-chat-sub">D²nAI Intake Genie · powered by the AI Lab</div></div>
		</div>
		<div class="dnai-thread" id="dnai-thread"></div>
		<div class="dnai-compose">
			<textarea id="dnai-input" rows="1" placeholder="Votre besoin… / Your need…"></textarea>
			<button type="button" id="dnai-mic" class="dnai-mic" aria-label="Voice input" title="Parler / Speak">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
			</button>
			<button type="button" id="dnai-send" aria-label="Send">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>
			</button>
		</div>
	</div>
	<?php return ob_get_clean();
}
add_shortcode( 'dnai_intake', 'dnai_sc_intake' );

function dnai_sc_home( $atts ) {
	wp_enqueue_style( 'dnai-portal' );
	$a = shortcode_atts( array(
		'eyebrow'  => 'OCP Nutricrops · Data, Digital & AI',
		'title'    => 'D²nAI',
		'baseline' => 'A business problem you may address through Data, Digital or AI? Just share your thoughts and let D²nAI take care of the rest.',
		'intro'    => 'Une idée, un irritant, un besoin Data / Digital / IA ? Décrivez-le ci-dessous : notre assistant le challenge, le cadre et le transmet à l\'équipe D²nAI. — Got a Data / Digital / AI need? Describe it and our assistant will frame it for the team.',
	), $atts );

	ob_start(); ?>
	<section class="dnai-home">
		<div class="dnai-hero">
			<span class="dnai-eyebrow"><?php echo esc_html( $a['eyebrow'] ); ?></span>
			<h1 class="dnai-wordmark"><?php echo esc_html( $a['title'] ); ?></h1>
			<p class="dnai-baseline"><?php echo esc_html( $a['baseline'] ); ?></p>
			<p class="dnai-intro"><?php echo esc_html( $a['intro'] ); ?></p>
		</div>
		<div class="dnai-home-chat"><?php echo do_shortcode( '[dnai_intake]' ); ?></div>
		<div class="dnai-home-cat">
			<div class="dnai-home-cat-head">
				<h2>Our products</h2>
				<p>Live, in development and on the roadmap.</p>
			</div>
			<?php echo do_shortcode( '[dnai_catalog]' ); ?>
		</div>
	</section>
	<?php return ob_get_clean();
}
add_shortcode( 'dnai_home', 'dnai_sc_home' );

function dnai_sc_catalog( $atts ) {
	wp_enqueue_style( 'dnai-portal' );
	wp_enqueue_script( 'dnai-catalog' );
	$q = new WP_Query( array( 'post_type' => 'dnai_product', 'posts_per_page' => -1, 'orderby' => 'menu_order title', 'order' => 'ASC' ) );

	ob_start();
	echo '<div class="dnai-catalog">';
	echo '<div class="dnai-filters"><button class="dnai-f active" data-f="all">All</button>'
		. '<button class="dnai-f" data-f="live">Live</button>'
		. '<button class="dnai-f" data-f="dev">In development</button>'
		. '<button class="dnai-f" data-f="idea">Ideas</button>'
		. '<button class="dnai-f" data-f="Data">Data</button>'
		. '<button class="dnai-f" data-f="Digital">Digital</button>'
		. '<button class="dnai-f" data-f="AI">AI</button></div>';
	echo '<div class="dnai-grid">';
	if ( $q->have_posts() ) {
		while ( $q->have_posts() ) { $q->the_post();
			$status = get_post_meta( get_the_ID(), 'dnai_status', true ) ?: 'dev';
			$cat    = get_post_meta( get_the_ID(), 'dnai_category', true );
			$labels = array( 'live' => 'Live', 'dev' => 'In dev', 'idea' => 'Idea' );
			printf(
				'<article class="dnai-card" data-status="%1$s" data-cat="%2$s">'
				. '<div class="dnai-card-top"><span class="dnai-badge %1$s">%3$s</span>%4$s</div>'
				. '<h3>%5$s</h3><p>%6$s</p></article>',
				esc_attr( $status ), esc_attr( $cat ),
				esc_html( isset( $labels[ $status ] ) ? $labels[ $status ] : $status ),
				$cat ? '<span class="dnai-cat">' . esc_html( $cat ) . '</span>' : '',
				esc_html( get_the_title() ),
				esc_html( get_the_excerpt() )
			);
		}
		wp_reset_postdata();
	} else {
		echo '<p class="dnai-empty">No product yet. Add products under <strong>D²nAI Products</strong> in wp-admin.</p>';
	}
	echo '</div></div>';
	return ob_get_clean();
}
add_shortcode( 'dnai_catalog', 'dnai_sc_catalog' );

/* -------------------------------------------------------------------------
 * 6. Activation — flush rewrite rules
 * ---------------------------------------------------------------------- */
register_activation_hook( __FILE__, function () {
	dnai_register_cpts();
	flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
