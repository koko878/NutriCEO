<?php
/**
 * Admin settings page for Atlas v0.2+.
 *
 * Settings → Atlas. Three sections, all required:
 *   1. Copilot Studio — connection string + heads-up on the Power Platform
 *      API delegated permission
 *   2. Microsoft 365 SSO (Azure AD App Registration)
 *   3. Access control — UPN whitelist
 *
 * Sensitive fields (client_secret) are masked on display: we never re-output
 * the actual value, only a "•••• stored" placeholder. New values overwrite,
 * empty values leave the existing one alone.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

add_action( 'admin_menu', function () {
	add_options_page( 'Atlas', 'Atlas', 'manage_options', 'atlas', 'atlas_render_settings_page' );
} );

add_action( 'admin_post_atlas_save_settings', 'atlas_handle_settings_save' );

function atlas_handle_settings_save() {
	if ( ! current_user_can( 'manage_options' ) ) wp_die( 'unauthorized' );
	check_admin_referer( 'atlas_save_settings' );

	$current = array_merge( atlas_defaults(), get_option( 'atlas_settings', array() ) );

	$tenant      = isset( $_POST['azure_tenant_id'] )       ? sanitize_text_field( wp_unslash( $_POST['azure_tenant_id'] ) )       : '';
	$client      = isset( $_POST['azure_client_id'] )       ? sanitize_text_field( wp_unslash( $_POST['azure_client_id'] ) )       : '';
	$display     = isset( $_POST['display_name'] )          ? sanitize_text_field( wp_unslash( $_POST['display_name'] ) )          : '';
	$upns        = isset( $_POST['allowed_upns'] )          ? sanitize_textarea_field( wp_unslash( $_POST['allowed_upns'] ) )      : '';
	$conn        = isset( $_POST['cps_connection_string'] ) ? esc_url_raw( trim( wp_unslash( $_POST['cps_connection_string'] ) ) ) : '';
	$spbase      = isset( $_POST['sharepoint_base_url'] )   ? esc_url_raw( trim( wp_unslash( $_POST['sharepoint_base_url'] ) ) )   : '';

	// Strip trailing slash for cleaner URL composition.
	$spbase = rtrim( $spbase, '/' );

	$new = array(
		'azure_tenant_id'        => $tenant,
		'azure_client_id'        => $client,
		'cps_connection_string'  => $conn,
		'sharepoint_base_url'    => $spbase,
		'allowed_upns'           => $upns,
		'display_name'           => $display ?: 'Hamza',
	);

	// Secret: overwrite only if the user typed something new.
	$secret_in = isset( $_POST['azure_client_secret'] ) ? trim( wp_unslash( $_POST['azure_client_secret'] ) ) : '';
	$new['azure_client_secret'] = $secret_in !== '' ? $secret_in : $current['azure_client_secret'];

	update_option( 'atlas_settings', $new, false );

	wp_redirect( add_query_arg( array( 'page' => 'atlas', 'updated' => '1' ), admin_url( 'options-general.php' ) ) );
	exit;
}

function atlas_render_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) return;
	$o = array_merge( atlas_defaults(), get_option( 'atlas_settings', array() ) );
	$redirect_uri = add_query_arg( 'atlas_sso', 'callback', home_url( '/' ) );
	$atlas_url = home_url( '/atlas' );
	$parsed = $o['cps_connection_string'] ? atlas_parse_connection_string( $o['cps_connection_string'] ) : null;
	$mask = function ( $v ) { return $v ? str_repeat( '•', 12 ) . ' (stored)' : ''; };
	?>
	<div class="wrap">
		<h1>Atlas — Second cerveau D²nAI</h1>
		<?php if ( isset( $_GET['updated'] ) ) : ?>
			<div class="notice notice-success is-dismissible"><p>Paramètres enregistrés.</p></div>
		<?php endif; ?>

		<p>
			Atlas est servi à <code><?php echo esc_html( $atlas_url ); ?></code>.
			Authentification Microsoft 365 obligatoire (l'agent Copilot Studio requiert un OAuth délégué).
		</p>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="atlas_save_settings" />
			<?php wp_nonce_field( 'atlas_save_settings' ); ?>

			<h2>1. Copilot Studio — connection string</h2>
			<p>
				Dans <strong>Copilot Studio → ton agent Atlas → Channels → Application Web → Microsoft 365 Agents SDK</strong>,
				clique sur <em>Copier</em> sous "Chaîne de connexion" et colle ici l'URL complète.
			</p>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="cps_connection_string">Connection string</label></th>
					<td>
						<input type="url" name="cps_connection_string" id="cps_connection_string" value="<?php echo esc_attr( $o['cps_connection_string'] ); ?>" class="large-text code" placeholder="https://[env-id].environment.api.powerplatform.com/copilotstudio/dataverse-backed/authenticated/bots/[schema]/conversations?api-version=2022-03-01-preview" />
						<?php if ( $parsed ) : ?>
							<p class="description">
								Parsée :
								<code>env=<?php echo esc_html( $parsed['env_id'] ); ?></code> ·
								<code>agent=<?php echo esc_html( $parsed['schema_name'] ); ?></code> ·
								<code>api=<?php echo esc_html( $parsed['api_version'] ); ?></code>
							</p>
						<?php elseif ( $o['cps_connection_string'] ) : ?>
							<p class="description" style="color:#B91C1C;">⚠️ Le format de l'URL n'est pas reconnu. Vérifie qu'elle contient bien <code>/conversations</code> et <code>api-version=</code>.</p>
						<?php endif; ?>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="sharepoint_base_url">URL de base SharePoint <em style="font-weight:400;color:#6B7268;">(optionnel mais recommandé)</em></label></th>
					<td>
						<input type="url" name="sharepoint_base_url" id="sharepoint_base_url" value="<?php echo esc_attr( $o['sharepoint_base_url'] ); ?>" class="large-text code" placeholder="https://eocp.sharepoint.com/sites/DataNutricrops" />
						<p class="description">
							Quand l'agent cite un fichier dans sa réponse sans URL directe (ex : "Monthly_Sync_xxx.pptx"), Atlas construit un lien de recherche SharePoint vers cette base pour que le chip soit cliquable. Ouvre les résultats SharePoint dans un nouvel onglet. Si laissé vide, les chips sans URL directe ne seront pas cliquables.
						</p>
					</td>
				</tr>
			</table>

			<h2>2. Microsoft 365 SSO (Azure AD App Registration)</h2>
			<p>
				Crée une <em>App Registration</em> dans Azure AD (Microsoft Entra ID) — single tenant.
				Coller l'URI de redirection ci-dessous comme <em>Web Redirect URI</em>.
			</p>
			<p>
				<strong>Permissions déléguées requises</strong> (à ajouter dans <em>API permissions</em> de l'App Registration) :
			</p>
			<ul style="margin-left: 24px; list-style: disc;">
				<li><strong>Microsoft Graph</strong> : <code>openid</code>, <code>profile</code>, <code>email</code>, <code>User.Read</code>, <code>offline_access</code></li>
				<li><strong>Power Platform API</strong> : <code>CopilotStudio.Copilots.Invoke</code> &nbsp;<em>← critique, sans ça l'agent répondra "401"</em></li>
			</ul>
			<div class="notice notice-warning inline" style="margin:8px 0;padding:10px 12px;">
				<p style="margin:0">
					<strong>Piège classique</strong> : "Power Platform API" peut ne pas apparaître dans la liste des APIs.
					Si c'est le cas, IT doit lancer une seule fois cette commande PowerShell dans le tenant :
				</p>
				<pre style="margin:8px 0 4px;background:#f6f7f7;padding:8px;border-left:3px solid #B45309;font-size:12px;overflow-x:auto;">Add-MgServicePrincipal -AppId "8578e004-a5c6-46e7-913e-12f58912df43"</pre>
				<p style="margin:0;font-size:12px;color:#6B7268;">(C'est l'App ID public de "Power Platform API". La commande la rend visible dans toutes les App Registrations du tenant. À faire une fois, c'est tout.)</p>
			</div>
			<p>Puis dans ton App Registration : <em>API permissions → Grant admin consent</em>.</p>

			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label>Redirect URI (à coller dans Azure)</label></th>
					<td>
						<input type="text" readonly value="<?php echo esc_attr( $redirect_uri ); ?>" class="large-text code" onclick="this.select()" />
						<p class="description">À ajouter comme « Web → Redirect URI » dans l'App Registration.</p>
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

			<h2>3. Contrôle d'accès</h2>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="allowed_upns">UPN autorisés</label></th>
					<td>
						<textarea name="allowed_upns" id="allowed_upns" rows="4" class="large-text code" placeholder="hamza.koh@ocp.ma&#10;@ocp.ma (wildcard domaine)"><?php echo esc_textarea( $o['allowed_upns'] ); ?></textarea>
						<p class="description">Un par ligne. Une ligne qui commence par <code>@</code> autorise tout le domaine. Démarrer avec ton seul UPN.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="display_name">Prénom affiché par défaut</label></th>
					<td>
						<input type="text" name="display_name" id="display_name" value="<?php echo esc_attr( $o['display_name'] ); ?>" class="regular-text" />
						<p class="description">Utilisé si Microsoft ne renvoie pas de <code>name</code>.</p>
					</td>
				</tr>
			</table>

			<?php submit_button( 'Enregistrer' ); ?>
		</form>

		<hr/>
		<h2>Diagnostic</h2>
		<?php
		$cps_ok    = $parsed !== null;
		$azure_ok  = $o['azure_tenant_id'] && $o['azure_client_id'] && $o['azure_client_secret'];
		$wl_n      = trim( $o['allowed_upns'] ) ? count( array_filter( preg_split( "/[\\r\\n,;]+/", $o['allowed_upns'] ) ) ) : 0;
		?>
		<ul>
			<li>Copilot Studio : <?php echo $cps_ok ? '<strong style="color:#15803D">configuré</strong>' : '<strong style="color:#B91C1C">connection string manquante ou invalide</strong>'; ?></li>
			<li>Azure AD App Registration : <?php echo $azure_ok ? '<strong style="color:#15803D">configuré</strong>' : '<strong style="color:#B91C1C">tenant/client/secret incomplets</strong>'; ?></li>
			<li>Whitelist UPN : <?php echo $wl_n ? '<strong style="color:#15803D">' . $wl_n . ' entrée(s)</strong>' : '<strong style="color:#B91C1C">vide — personne ne peut se connecter</strong>'; ?></li>
			<li>Atlas prêt à servir : <?php echo atlas_is_configured() ? '<strong style="color:#15803D">✓ oui</strong>' : '<strong style="color:#B91C1C">✗ non — corrige les points en rouge</strong>'; ?></li>
		</ul>

		<?php if ( atlas_is_configured() ) : ?>
			<p style="margin-top:16px;">
				<a href="<?php echo esc_url( $atlas_url ); ?>" class="button button-primary" target="_blank">Ouvrir Atlas →</a>
				&nbsp;
				<a href="<?php echo esc_url( add_query_arg( 'atlas_sso', 'logout', home_url( '/' ) ) ); ?>" class="button">Forcer un re-login (pour tester la chaîne SSO)</a>
			</p>
		<?php endif; ?>
	</div>
	<?php
}
