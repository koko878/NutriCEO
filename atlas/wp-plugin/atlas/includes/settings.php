<?php
/**
 * Admin settings page for Atlas.
 *
 * Settings → Atlas. Three sections:
 *   1. Microsoft 365 SSO (Azure AD App Registration)
 *   2. Copilot Studio — Direct Line secret
 *   3. Access control — UPN whitelist
 *
 * Sensitive fields (client_secret, directline_secret) are masked on
 * display: we never re-output the actual value, only a "•••• stored"
 * placeholder. New values overwrite, empty values leave existing alone.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'admin_menu', function () {
	add_options_page(
		'Atlas',
		'Atlas',
		'manage_options',
		'atlas',
		'atlas_render_settings_page'
	);
} );

add_action( 'admin_post_atlas_save_settings', 'atlas_handle_settings_save' );

function atlas_handle_settings_save() {
	if ( ! current_user_can( 'manage_options' ) ) wp_die( 'unauthorized' );
	check_admin_referer( 'atlas_save_settings' );

	$current = array_merge( atlas_defaults(), get_option( 'atlas_settings', array() ) );

	$tenant = isset( $_POST['azure_tenant_id'] ) ? sanitize_text_field( wp_unslash( $_POST['azure_tenant_id'] ) ) : '';
	$client = isset( $_POST['azure_client_id'] ) ? sanitize_text_field( wp_unslash( $_POST['azure_client_id'] ) ) : '';
	$display = isset( $_POST['display_name'] ) ? sanitize_text_field( wp_unslash( $_POST['display_name'] ) ) : '';
	$upns   = isset( $_POST['allowed_upns'] ) ? sanitize_textarea_field( wp_unslash( $_POST['allowed_upns'] ) ) : '';

	$new = array(
		'azure_tenant_id' => $tenant,
		'azure_client_id' => $client,
		'allowed_upns'    => $upns,
		'display_name'    => $display ?: 'Hamza',
	);

	// Secrets: overwrite only if the user typed something new.
	$secret_in   = isset( $_POST['azure_client_secret'] ) ? trim( wp_unslash( $_POST['azure_client_secret'] ) ) : '';
	$directline_in = isset( $_POST['directline_secret'] )   ? trim( wp_unslash( $_POST['directline_secret'] ) )   : '';

	$new['azure_client_secret'] = $secret_in     !== '' ? $secret_in     : $current['azure_client_secret'];
	$new['directline_secret']   = $directline_in !== '' ? $directline_in : $current['directline_secret'];

	update_option( 'atlas_settings', $new, false );

	wp_redirect( add_query_arg( array( 'page' => 'atlas', 'updated' => '1' ), admin_url( 'options-general.php' ) ) );
	exit;
}

function atlas_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) return;
	$o = array_merge( atlas_defaults(), get_option( 'atlas_settings', array() ) );
	$redirect_uri = add_query_arg( 'atlas_sso', 'callback', home_url( '/' ) );
	$atlas_url = home_url( '/atlas' );
	$mask = function ( $v ) { return $v ? str_repeat( '•', 12 ) . ' (stored)' : ''; };
	?>
	<div class="wrap">
		<h1>Atlas — Second cerveau D²nAI</h1>
		<?php if ( isset( $_GET['updated'] ) ) : ?>
			<div class="notice notice-success is-dismissible"><p>Paramètres enregistrés.</p></div>
		<?php endif; ?>

		<?php $mode = atlas_mode(); ?>
		<div class="notice notice-info inline" style="margin:12px 0;padding:10px 12px;">
			<p style="margin:0;">
				<strong>Mode actuel : <?php echo $mode === 'sso' ? '🔐 SSO Microsoft 365' : '🟢 Atlas Lite (login WordPress standard)'; ?></strong><br/>
				<?php if ( $mode === 'lite' ) : ?>
					Tu peux utiliser Atlas dès que la section <strong>2. Direct Line</strong> est remplie. La section 1 (Microsoft 365 SSO) est optionnelle — la remplir bascule automatiquement en mode SSO.
				<?php else : ?>
					Les 3 champs Azure AD sont remplis : l'authentification passe par Microsoft 365 et la whitelist UPN. Vider l'un des trois champs Azure AD revient au mode Lite.
				<?php endif; ?>
			</p>
		</div>

		<p>
			Atlas est servi à <code><?php echo esc_html( $atlas_url ); ?></code>.
		</p>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="atlas_save_settings" />
			<?php wp_nonce_field( 'atlas_save_settings' ); ?>

			<h2>1. Microsoft 365 SSO (Azure AD App Registration) <span style="font-size:13px;font-weight:400;color:#6B7268;">— optionnel</span></h2>
			<p>
				<strong>Tu peux ignorer cette section pour démarrer.</strong> Tant qu'elle reste vide,
				l'accès à Atlas se fait via login WordPress standard (mode Lite). Remplir les 3 champs
				ci-dessous bascule en mode SSO Microsoft 365 — utile si tu veux que plusieurs personnes
				accèdent à Atlas avec leur compte OCP.
			</p>
			<p>
				En mode SSO : crée une <em>App Registration</em> dans le portail Azure AD de ton tenant OCP.
				Permissions <strong>déléguées</strong> requises (Microsoft Graph) :
				<code>openid</code>, <code>profile</code>, <code>email</code>, <code>User.Read</code>, <code>offline_access</code>.
				Ajoute l'URI de redirection ci-dessous comme <em>Web Redirect URI</em>.
			</p>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="redirect_uri">Redirect URI (à coller dans Azure)</label></th>
					<td>
						<input type="text" readonly value="<?php echo esc_attr( $redirect_uri ); ?>" class="large-text code" onclick="this.select()" />
						<p class="description">Copie cette URL et ajoute-la comme « Web → Redirect URI » dans l'App Registration Azure.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="azure_tenant_id">Tenant ID</label></th>
					<td><input type="text" name="azure_tenant_id" id="azure_tenant_id" value="<?php echo esc_attr( $o['azure_tenant_id'] ); ?>" class="regular-text" placeholder="00000000-0000-0000-0000-000000000000" /></td>
				</tr>
				<tr>
					<th scope="row"><label for="azure_client_id">Application (client) ID</label></th>
					<td><input type="text" name="azure_client_id" id="azure_client_id" value="<?php echo esc_attr( $o['azure_client_id'] ); ?>" class="regular-text" placeholder="00000000-0000-0000-0000-000000000000" /></td>
				</tr>
				<tr>
					<th scope="row"><label for="azure_client_secret">Client secret</label></th>
					<td>
						<input type="password" name="azure_client_secret" id="azure_client_secret" value="" class="regular-text" autocomplete="new-password" placeholder="<?php echo esc_attr( $mask( $o['azure_client_secret'] ) ?: 'Coller la valeur Azure ici' ); ?>" />
						<p class="description">Stocké côté serveur, jamais envoyé au navigateur. Laisser vide pour conserver la valeur actuelle.</p>
					</td>
				</tr>
			</table>

			<h2>2. Copilot Studio — Direct Line <span style="font-size:13px;font-weight:400;color:#B91C1C;">— requis</span></h2>
			<p>
				Dans Copilot Studio → ton agent Atlas → <em>Settings → Channels → Direct Line</em> → "Add this channel" si pas déjà fait → copie une des deux <em>Secret keys</em> (clique sur l'icône œil pour la révéler).
			</p>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="directline_secret">Direct Line secret</label></th>
					<td>
						<input type="password" name="directline_secret" id="directline_secret" value="" class="regular-text" autocomplete="new-password" placeholder="<?php echo esc_attr( $mask( $o['directline_secret'] ) ?: 'Coller la clé Direct Line ici' ); ?>" />
						<p class="description">Stocké côté serveur uniquement. Le browser reçoit un token éphémère d'1h, généré à la demande.</p>
					</td>
				</tr>
			</table>

			<h2>3. Contrôle d'accès</h2>
			<p>
				<?php if ( $mode === 'sso' ) : ?>
					En mode SSO, seuls les UPN listés ici peuvent accéder à Atlas après authentification Microsoft.
				<?php else : ?>
					En mode Lite, le contrôle d'accès passe par les comptes WordPress (gère qui a un compte sur ce site). La whitelist UPN ci-dessous ne s'applique qu'en mode SSO — tu peux la pré-remplir si tu prévois de basculer plus tard.
				<?php endif; ?>
			</p>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="allowed_upns">UPN autorisés (mode SSO uniquement)</label></th>
					<td>
						<textarea name="allowed_upns" id="allowed_upns" rows="4" class="large-text code" placeholder="hamza.koh@ocp.ma&#10;@ocp.ma (wildcard domaine)"><?php echo esc_textarea( $o['allowed_upns'] ); ?></textarea>
						<p class="description">Un par ligne. Une ligne qui commence par <code>@</code> autorise tout le domaine (ex : <code>@ocp.ma</code>). Recommandation : commence par ton seul UPN.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="display_name">Prénom affiché par défaut</label></th>
					<td>
						<input type="text" name="display_name" id="display_name" value="<?php echo esc_attr( $o['display_name'] ); ?>" class="regular-text" />
						<p class="description">Utilisé si Microsoft ne renvoie pas de <code>name</code>. Atlas dira par exemple « Bonjour, <strong><?php echo esc_html( $o['display_name'] ); ?></strong> ».</p>
					</td>
				</tr>
			</table>

			<?php submit_button( 'Enregistrer' ); ?>
		</form>

		<hr/>
		<h2>Diagnostic</h2>
		<ul>
			<li>Direct Line : <?php echo $o['directline_secret'] ? '<strong style="color:#15803D">configuré</strong>' : '<strong style="color:#B91C1C">requis pour démarrer</strong>'; ?></li>
			<li>SSO Microsoft 365 : <?php echo $o['azure_tenant_id'] && $o['azure_client_id'] && $o['azure_client_secret'] ? '<strong style="color:#15803D">configuré — mode SSO actif</strong>' : '<strong style="color:#6B7268">non configuré — mode Lite actif</strong>'; ?></li>
			<li>Whitelist UPN (mode SSO) :
				<?php
				$n = trim( $o['allowed_upns'] ) ? count( array_filter( preg_split( "/[\\r\\n,;]+/", $o['allowed_upns'] ) ) ) : 0;
				if ( $mode === 'sso' ) {
					echo $n ? '<strong style="color:#15803D">' . $n . ' entrée(s)</strong>' : '<strong style="color:#B91C1C">vide — personne ne peut se connecter</strong>';
				} else {
					echo $n ? '<strong style="color:#6B7268">' . $n . ' entrée(s) (inactif en mode Lite)</strong>' : '<em style="color:#6B7268">vide (sans impact en mode Lite)</em>';
				}
				?>
			</li>
			<?php if ( $mode === 'lite' && $o['directline_secret'] ) : ?>
				<li>WordPress login : <strong style="color:#15803D">tout user avec capability <code>read</code> peut accéder</strong>. Gère qui a un compte via <a href="<?php echo esc_url( admin_url( 'users.php' ) ); ?>">Users → All Users</a>.</li>
			<?php endif; ?>
		</ul>
	</div>
	<?php
}
