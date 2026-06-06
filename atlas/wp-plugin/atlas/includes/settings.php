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

		<p>
			Atlas est servi à <code><?php echo esc_html( $atlas_url ); ?></code>.
			Accès restreint aux UPN ci-dessous, authentifiés via Microsoft 365.
		</p>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="atlas_save_settings" />
			<?php wp_nonce_field( 'atlas_save_settings' ); ?>

			<h2>1. Microsoft 365 SSO (Azure AD App Registration)</h2>
			<p>
				Crée une <em>App Registration</em> dans le portail Azure AD de ton tenant OCP.
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

			<h2>2. Copilot Studio — Direct Line</h2>
			<p>
				Dans Copilot Studio → ton agent Atlas → <em>Channels → Direct Line</em> → copie l'une des deux clés.
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
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="allowed_upns">UPN autorisés</label></th>
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
			<li>SSO : <?php echo $o['azure_tenant_id'] && $o['azure_client_id'] && $o['azure_client_secret'] ? '<strong style="color:#15803D">configuré</strong>' : '<strong style="color:#B91C1C">non configuré</strong>'; ?></li>
			<li>Direct Line : <?php echo $o['directline_secret'] ? '<strong style="color:#15803D">configuré</strong>' : '<strong style="color:#B91C1C">non configuré</strong>'; ?></li>
			<li>Whitelist : <?php echo trim( $o['allowed_upns'] ) ? '<strong style="color:#15803D">' . count( array_filter( preg_split( "/[\\r\\n,;]+/", $o['allowed_upns'] ) ) ) . ' entrée(s)</strong>' : '<strong style="color:#B91C1C">vide — personne ne peut se connecter</strong>'; ?></li>
		</ul>
	</div>
	<?php
}
