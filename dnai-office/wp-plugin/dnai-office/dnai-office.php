<?php
/**
 * Plugin Name:       D²nAI Office — digital twin
 * Description:       Mobile-first cockpit for the D²nAI Office digital twin. Lets each user configure their own personal AI assistant (display name, signature, SharePoint knowledge base, contacts whitelist / blacklist / watchlist, allowed topics, hard guardrails). Serves the live cockpit at /dnai-office and via the [dnai_office] shortcode.
 * Version:           0.2.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-office
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_OFFICE_VER', '0.2.0' );
define( 'DNAI_OFFICE_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_OFFICE_DIR', plugin_dir_path( __FILE__ ) );

/* -------------------------------------------------------------------------
 * Settings storage — single WP option blob keyed by WP user id, so the same
 * plugin instance serves multiple managers. Each user has their own config.
 *
 * Settings are also writable from the WP admin Settings → D²nAI Office page,
 * either for the current user (default) or for any user id (super-admin).
 * ---------------------------------------------------------------------- */
function dnai_office_default_config() {
	return array(
		// Identity
		'display_name'        => '',
		'job_title'           => '',
		'default_lang'        => 'fr',

		// Brand / signature
		'signature_pill'      => "Hamza's digital twin · actif",
		'signature_full'      => "Hamza's digital twin — D²nAI",

		// SharePoint knowledge base
		'sharepoint_url'      => '',
		'sharepoint_label'    => 'SharePoint /sites/dnai-office/hamza/',

		// AI backend (provider-agnostic — reuses the existing D²nAI proxy)
		'backend_url'         => '',
		'backend_token'       => '',

		// Behaviour
		'auto_send_enabled'   => false,
		'delay_send_minutes'  => 5,
		'digest_to'           => '',
		'poll_seconds'        => 30,

		// Contacts routing
		'whitelist'           => array(),
		'blacklist'           => array(),
		'watchlist'           => array(),

		// Topic policy
		'allowed_topics'      => array( 'project_questions', 'info_requests', 'meeting_screening', 'contact_routing' ),
		'extra_forbidden'     => '',
	);
}

function dnai_office_get_user_config( $user_id ) {
	$all = get_option( 'dnai_office_configs', array() );
	$user_cfg = isset( $all[ $user_id ] ) && is_array( $all[ $user_id ] ) ? $all[ $user_id ] : array();
	return array_merge( dnai_office_default_config(), $user_cfg );
}

function dnai_office_save_user_config( $user_id, $payload ) {
	$all = get_option( 'dnai_office_configs', array() );
	$all[ (int) $user_id ] = $payload;
	update_option( 'dnai_office_configs', $all );
}

/* -------------------------------------------------------------------------
 * FULL-SCREEN route — /dnai-office and fallback /?dnai_office_app=1
 * ---------------------------------------------------------------------- */
function dnai_office_add_rewrite() {
	add_rewrite_rule( '^dnai-office/?$', 'index.php?dnai_office_app=1', 'top' );
}
add_action( 'init', 'dnai_office_add_rewrite' );

add_filter( 'query_vars', function ( $vars ) { $vars[] = 'dnai_office_app'; return $vars; } );

register_activation_hook( __FILE__, function () {
	dnai_office_add_rewrite();
	flush_rewrite_rules();
} );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

add_action( 'template_redirect', function () {
	if ( ! intval( get_query_var( 'dnai_office_app' ) ) ) { return; }
	$user_id = get_current_user_id();
	$cfg = dnai_office_get_user_config( $user_id );

	// If the display name is empty, fall back to the WP user's display name.
	if ( empty( $cfg['display_name'] ) && $user_id ) {
		$u = get_userdata( $user_id );
		if ( $u ) { $cfg['display_name'] = $u->display_name; }
	}

	$f = DNAI_OFFICE_DIR . 'app/dnai-office.html';
	if ( ! file_exists( $f ) ) {
		wp_die( 'D²nAI Office app file missing.' );
	}
	nocache_headers();
	header( 'Content-Type: text/html; charset=utf-8' );
	$html = file_get_contents( $f );
	$bridge = '<script>window.DNAI_OFFICE_CONFIG=' . wp_json_encode( $cfg ) . ';</script>';
	echo str_replace( '</head>', $bridge . "\n</head>", $html );
	exit;
} );

/* -------------------------------------------------------------------------
 * Shortcode [dnai_office] — embeds the cockpit full-bleed with auto-resize,
 * same pattern as NutriPlan / CGM Cockpit.
 * ---------------------------------------------------------------------- */
add_shortcode( 'dnai_office', function ( $atts = array() ) {
	$src = esc_url( DNAI_OFFICE_URL . 'app/dnai-office.html?v=' . DNAI_OFFICE_VER );
	$id  = 'dnaiOfficeFrame_' . wp_generate_password( 6, false, false );
	$user_id = get_current_user_id();
	$cfg = dnai_office_get_user_config( $user_id );
	if ( empty( $cfg['display_name'] ) && $user_id ) {
		$u = get_userdata( $user_id );
		if ( $u ) { $cfg['display_name'] = $u->display_name; }
	}
	ob_start(); ?>
<style>
.dnai-office-wrap{position:relative;left:50%;right:50%;margin-left:-50vw;margin-right:-50vw;width:100vw;max-width:100vw;background:#EDEFEA;display:grid;place-items:center;padding:32px 16px}
.dnai-office-wrap iframe{display:block;width:100%;max-width:520px;border:0;height:880px;border-radius:24px;box-shadow:0 30px 60px -20px rgba(0,0,0,.25)}
@media(max-width:600px){.dnai-office-wrap{padding:0}.dnai-office-wrap iframe{max-width:100%;height:100vh;border-radius:0;box-shadow:none}}
.dnai-office-fs{display:inline-block;margin:8px 16px;color:#1B5E20;font-size:13px;text-decoration:underline}
</style>
<div class="dnai-office-wrap">
  <iframe id="<?php echo esc_attr( $id ); ?>" src="<?php echo $src; ?>"
          allow="clipboard-read; clipboard-write" loading="lazy"></iframe>
</div>
<a class="dnai-office-fs" href="<?php echo esc_url( home_url( '/dnai-office' ) ); ?>" target="_blank" rel="noopener">↗ Ouvrir en plein écran</a>
<script>
(function(){
  var f=document.getElementById(<?php echo wp_json_encode( $id ); ?>);
  if(!f) return;
  function send(){ try{ f.contentWindow.postMessage({type:'DNAI_OFFICE_CONFIG', config: <?php echo wp_json_encode( $cfg ); ?>}, '*'); }catch(e){} }
  f.addEventListener('load', send); send();
})();
</script>
<?php
	return ob_get_clean();
} );

/* -------------------------------------------------------------------------
 * Admin page — Settings → D²nAI Office
 *
 * Per-user configuration (each WP user has their own twin). Super-admins
 * can also pick another user id to configure their twin.
 * ---------------------------------------------------------------------- */
add_action( 'admin_menu', function () {
	add_options_page( 'D²nAI Office', 'D²nAI Office', 'read', 'dnai-office', 'dnai_office_settings_page' );
} );

add_action( 'admin_post_dnai_office_save', function () {
	if ( ! is_user_logged_in() ) { wp_die( 'Forbidden', 403 ); }
	check_admin_referer( 'dnai_office_save' );

	$in = isset( $_POST['dnai_office_settings'] ) && is_array( $_POST['dnai_office_settings'] )
		? wp_unslash( $_POST['dnai_office_settings'] ) : array();

	$user_id = isset( $_POST['dnai_office_user_id'] ) ? (int) $_POST['dnai_office_user_id'] : get_current_user_id();
	if ( $user_id !== get_current_user_id() && ! current_user_can( 'manage_options' ) ) {
		$user_id = get_current_user_id();
	}

	$existing = dnai_office_get_user_config( $user_id );

	// Token is write-once-keep-if-blank to avoid wiping it on form re-save.
	$tok = isset( $in['backend_token'] ) ? trim( $in['backend_token'] ) : '';
	if ( $tok === '' ) { $tok = $existing['backend_token']; }

	$payload = array(
		'display_name'       => isset( $in['display_name'] )      ? sanitize_text_field( $in['display_name'] ) : '',
		'job_title'          => isset( $in['job_title'] )         ? sanitize_text_field( $in['job_title'] ) : '',
		'default_lang'       => isset( $in['default_lang'] ) && in_array( $in['default_lang'], array( 'fr', 'en' ), true ) ? $in['default_lang'] : 'fr',

		'signature_pill'     => isset( $in['signature_pill'] )    ? sanitize_text_field( $in['signature_pill'] ) : '',
		'signature_full'     => isset( $in['signature_full'] )    ? sanitize_text_field( $in['signature_full'] ) : '',

		'sharepoint_url'     => isset( $in['sharepoint_url'] )    ? esc_url_raw( $in['sharepoint_url'] ) : '',
		'sharepoint_label'   => isset( $in['sharepoint_label'] )  ? sanitize_text_field( $in['sharepoint_label'] ) : '',

		'backend_url'        => isset( $in['backend_url'] )       ? esc_url_raw( $in['backend_url'] ) : '',
		'backend_token'      => $tok,

		'auto_send_enabled'  => ! empty( $in['auto_send_enabled'] ),
		'delay_send_minutes' => isset( $in['delay_send_minutes'] ) && (int) $in['delay_send_minutes'] >= 0 ? (int) $in['delay_send_minutes'] : 5,
		'digest_to'          => isset( $in['digest_to'] )         ? sanitize_email( $in['digest_to'] ) : '',
		'poll_seconds'       => isset( $in['poll_seconds'] ) && (int) $in['poll_seconds'] >= 10 ? (int) $in['poll_seconds'] : 30,

		'whitelist'          => isset( $in['whitelist'] )         ? dnai_office_parse_lines( $in['whitelist'] ) : array(),
		'blacklist'          => isset( $in['blacklist'] )         ? dnai_office_parse_lines( $in['blacklist'] ) : array(),
		'watchlist'          => isset( $in['watchlist'] )         ? dnai_office_parse_lines( $in['watchlist'] ) : array(),

		'allowed_topics'     => isset( $in['allowed_topics'] ) && is_array( $in['allowed_topics'] ) ? array_values( array_map( 'sanitize_key', $in['allowed_topics'] ) ) : array(),
		'extra_forbidden'    => isset( $in['extra_forbidden'] )   ? wp_kses_post( $in['extra_forbidden'] ) : '',
	);

	dnai_office_save_user_config( $user_id, $payload );
	wp_safe_redirect( add_query_arg( array( 'page' => 'dnai-office', 'dnai_saved' => '1', 'uid' => $user_id ), admin_url( 'options-general.php' ) ) );
	exit;
} );

function dnai_office_parse_lines( $raw ) {
	if ( is_array( $raw ) ) { return array_values( array_filter( array_map( 'sanitize_text_field', $raw ) ) ); }
	$raw = (string) $raw;
	$lines = preg_split( "/[\\r\\n]+/", $raw );
	$out = array();
	foreach ( $lines as $l ) {
		$l = trim( strtolower( $l ) );
		if ( $l !== '' ) { $out[] = $l; }
	}
	return array_values( array_unique( $out ) );
}

function dnai_office_settings_page() {
	$user_id = isset( $_GET['uid'] ) && current_user_can( 'manage_options' ) ? (int) $_GET['uid'] : get_current_user_id();
	$cfg = dnai_office_get_user_config( $user_id );
	if ( empty( $cfg['display_name'] ) ) {
		$u = get_userdata( $user_id );
		if ( $u ) { $cfg['display_name'] = $u->display_name; }
	}
	$has_token = ! empty( $cfg['backend_token'] );
	$all_topics = array(
		'project_questions' => 'Questions sur les projets en cours (CGM, NutriPlan, MDM…)',
		'info_requests'     => "Demandes d'information générales",
		'meeting_screening' => 'Filtrage de demandes de meeting',
		'contact_routing'   => 'Aiguillage vers la bonne personne',
	);
	?>
	<div class="wrap">
		<h1>D²nAI Office — paramétrage</h1>
		<?php if ( isset( $_GET['dnai_saved'] ) ) : ?>
			<div class="notice notice-success is-dismissible"><p>Configuration enregistrée.</p></div>
		<?php endif; ?>

		<p>Configuration du <strong>digital twin</strong> de l'utilisateur. Le cockpit est accessible plein-écran à <a href="<?php echo esc_url( home_url( '/dnai-office' ) ); ?>" target="_blank"><code>/dnai-office</code></a> ou via le shortcode <code>[dnai_office]</code>.</p>

		<?php if ( current_user_can( 'manage_options' ) ) : ?>
		<form method="get" action="<?php echo esc_url( admin_url( 'options-general.php' ) ); ?>" style="margin:8px 0 18px">
			<input type="hidden" name="page" value="dnai-office">
			<label>Configurer le twin de l'utilisateur :
				<select name="uid" onchange="this.form.submit()">
					<?php
					$users = get_users( array( 'fields' => array( 'ID', 'display_name' ), 'number' => 200 ) );
					foreach ( $users as $u ) {
						$sel = ( (int) $u->ID === $user_id ) ? ' selected' : '';
						echo '<option value="' . esc_attr( $u->ID ) . '"' . $sel . '>' . esc_html( $u->display_name ) . ' (ID ' . (int) $u->ID . ')</option>';
					}
					?>
				</select>
			</label>
		</form>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<?php wp_nonce_field( 'dnai_office_save' ); ?>
			<input type="hidden" name="action" value="dnai_office_save">
			<input type="hidden" name="dnai_office_user_id" value="<?php echo esc_attr( $user_id ); ?>">

			<h2 class="title">1. Identité du digital twin</h2>
			<table class="form-table">
				<tr><th>Display name (greeting)</th>
					<td><input type="text" name="dnai_office_settings[display_name]" value="<?php echo esc_attr( $cfg['display_name'] ); ?>" class="regular-text" placeholder="Hamza">
					<p class="description">Affiché dans le « Bonjour, … ». Par défaut : le display name du compte WP.</p></td></tr>
				<tr><th>Job title / rôle</th>
					<td><input type="text" name="dnai_office_settings[job_title]" value="<?php echo esc_attr( $cfg['job_title'] ); ?>" class="regular-text" placeholder="Global Head Data &amp; AI"></td></tr>
				<tr><th>Langue par défaut</th>
					<td>
						<select name="dnai_office_settings[default_lang]">
							<option value="fr" <?php selected( $cfg['default_lang'], 'fr' ); ?>>Français</option>
							<option value="en" <?php selected( $cfg['default_lang'], 'en' ); ?>>English</option>
						</select>
					</td></tr>
			</table>

			<h2 class="title">2. Branding &amp; signature</h2>
			<table class="form-table">
				<tr><th>Pill d'activité (en-tête)</th>
					<td><input type="text" name="dnai_office_settings[signature_pill]" value="<?php echo esc_attr( $cfg['signature_pill'] ); ?>" class="regular-text" placeholder="Hamza's digital twin · actif">
					<p class="description">Texte de la pastille verte affichée en haut, à côté du greeting.</p></td></tr>
				<tr><th>Signature de fin (messages envoyés)</th>
					<td><input type="text" name="dnai_office_settings[signature_full]" value="<?php echo esc_attr( $cfg['signature_full'] ); ?>" class="regular-text" placeholder="Hamza's digital twin — D²nAI">
					<p class="description">Signature obligatoire apposée à chaque message sortant.</p></td></tr>
			</table>

			<h2 class="title">3. Base de connaissance · SharePoint</h2>
			<table class="form-table">
				<tr><th>URL du dossier SharePoint</th>
					<td><input type="url" name="dnai_office_settings[sharepoint_url]" value="<?php echo esc_attr( $cfg['sharepoint_url'] ); ?>" class="regular-text" placeholder="https://ocp.sharepoint.com/sites/dnai-office/hamza/">
					<p class="description">Cible du bouton « Ouvrir le SharePoint » dans le cockpit. C'est le dossier que tu peuples toi-même avec tes docs, FAQ, voice-notes, do-not-discuss, network…</p></td></tr>
				<tr><th>Libellé affiché</th>
					<td><input type="text" name="dnai_office_settings[sharepoint_label]" value="<?php echo esc_attr( $cfg['sharepoint_label'] ); ?>" class="regular-text" placeholder="SharePoint /sites/dnai-office/hamza/">
					<p class="description">Texte affiché dans les pastilles « Sources » du cockpit.</p></td></tr>
			</table>

			<h2 class="title">4. Backend AI</h2>
			<p class="description">Endpoint du backend D²nAI — l'app appellera ces URLs pour générer des réponses en mode connecté (mode RAG sur ton SharePoint). En mode démo, ces champs peuvent rester vides.</p>
			<table class="form-table">
				<tr><th>Backend URL</th>
					<td><input type="url" name="dnai_office_settings[backend_url]" value="<?php echo esc_attr( $cfg['backend_url'] ); ?>" class="regular-text" placeholder="https://..."></td></tr>
				<tr><th>Token d'accès</th>
					<td><input type="password" name="dnai_office_settings[backend_token]" value="" autocomplete="new-password" class="regular-text" placeholder="<?php echo $has_token ? '•••• déjà enregistré — laisser vide pour conserver' : 'token...'; ?>">
					<p class="description">Stocké côté serveur. Jamais exposé au client.</p></td></tr>
			</table>

			<h2 class="title">5. Comportement &amp; envoi</h2>
			<table class="form-table">
				<tr><th>Envoi automatique</th>
					<td><label><input type="checkbox" name="dnai_office_settings[auto_send_enabled]" value="1" <?php checked( $cfg['auto_send_enabled'] ); ?>> Activer l'envoi automatique sur la whitelist</label>
					<p class="description">Si décoché, le bot génère uniquement des brouillons que tu valides manuellement.</p></td></tr>
				<tr><th>Délai d'envoi révocable (min)</th>
					<td><input type="number" min="0" name="dnai_office_settings[delay_send_minutes]" value="<?php echo esc_attr( $cfg['delay_send_minutes'] ); ?>" class="small-text">
					<p class="description">Fenêtre pendant laquelle tu peux intercepter un message avant qu'il parte.</p></td></tr>
				<tr><th>Cadence du polling (sec)</th>
					<td><input type="number" min="10" name="dnai_office_settings[poll_seconds]" value="<?php echo esc_attr( $cfg['poll_seconds'] ); ?>" class="small-text"></td></tr>
				<tr><th>Email du digest quotidien</th>
					<td><input type="email" name="dnai_office_settings[digest_to]" value="<?php echo esc_attr( $cfg['digest_to'] ); ?>" class="regular-text" placeholder="hamza@..."></td></tr>
			</table>

			<h2 class="title">6. Contacts</h2>
			<p class="description">Une adresse par ligne. Format <code>email@domain.com</code> pour cibler un contact précis, ou <code>@domain.com</code> pour cibler un domaine entier.</p>
			<table class="form-table">
				<tr><th>✅ Whitelist <span class="description">(bot-first)</span></th>
					<td><textarea name="dnai_office_settings[whitelist]" rows="5" class="large-text code"><?php echo esc_textarea( implode( "\n", (array) $cfg['whitelist'] ) ); ?></textarea>
					<p class="description">Le bot prend en charge ces contacts en priorité.</p></td></tr>
				<tr><th>🚫 Blacklist <span class="description">(jamais bot)</span></th>
					<td><textarea name="dnai_office_settings[blacklist]" rows="3" class="large-text code"><?php echo esc_textarea( implode( "\n", (array) $cfg['blacklist'] ) ); ?></textarea>
					<p class="description">Ces contacts ne reçoivent jamais de réponse automatique — tu gères en direct.</p></td></tr>
				<tr><th>⚠️ Watchlist <span class="description">(escalade immédiate)</span></th>
					<td><textarea name="dnai_office_settings[watchlist]" rows="3" class="large-text code"><?php echo esc_textarea( implode( "\n", (array) $cfg['watchlist'] ) ); ?></textarea>
					<p class="description">CEO, EVPs, contacts stratégiques. Toute interaction déclenche une notification immédiate, sans traitement bot.</p></td></tr>
			</table>

			<h2 class="title">7. Garde-fous &amp; topics</h2>
			<p class="description">Le bot peut répondre uniquement aux topics autorisés ci-dessous. Les topics interdits durs (pricing, budget, confidentiel, RH, juridique, engagement) sont câblés en dur et non désactivables.</p>
			<table class="form-table">
				<tr><th>✅ Topics autorisés</th>
					<td>
						<?php foreach ( $all_topics as $key => $label ) :
							$checked = in_array( $key, (array) $cfg['allowed_topics'], true );
							?>
							<label style="display:block;margin-bottom:6px"><input type="checkbox" name="dnai_office_settings[allowed_topics][]" value="<?php echo esc_attr( $key ); ?>" <?php checked( $checked ); ?>> <?php echo esc_html( $label ); ?></label>
						<?php endforeach; ?>
					</td></tr>
				<tr><th>🚫 Sujets interdits perso</th>
					<td><textarea name="dnai_office_settings[extra_forbidden]" rows="4" class="large-text"><?php echo esc_textarea( (string) $cfg['extra_forbidden'] ); ?></textarea>
					<p class="description">Sujets perso à ajouter aux garde-fous (un par ligne ou liste libre) : noms de projets confidentiels, sujets RH, négociations en cours… Si une sollicitation les évoque, le bot s'arrête et t'escalade.</p></td></tr>
			</table>

			<h2 class="title">🛡️ Garde-fous en dur (non désactivables)</h2>
			<p class="description">Ces topics déclenchent toujours une escalade, quoi qu'il arrive. Définis dans le code pour des raisons de sécurité — ne peuvent pas être désactivés depuis l'interface.</p>
			<ul style="margin-left:20px;line-height:1.8">
				<li>💰 Prix · budget · coûts · honoraires · montants financiers</li>
				<li>🤝 Engagement · « je confirme » · « je m'engage » · décisions formelles</li>
				<li>🔒 Confidentiel · sensible · données protégées</li>
				<li>👔 RH · salaire · promotion · négociations contrat</li>
				<li>⚖️ Juridique · NDA · contrats · litiges</li>
			</ul>

			<p style="margin-top:24px"><button class="button button-primary button-large">Enregistrer</button>
			<a class="button button-secondary" href="<?php echo esc_url( home_url( '/dnai-office' ) ); ?>" target="_blank" style="margin-left:8px">↗ Ouvrir le cockpit</a></p>
		</form>
	</div>
	<?php
}
