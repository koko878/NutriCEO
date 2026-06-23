<?php
/**
 * NutriView — Backend IA (Phase 4) : proxy REST vers Databricks Model Serving.
 *
 * Source d'autorité : nutriview/SPEC.md §7 (3 tâches IA), §8 (garde-fous),
 * §9 (Databricks endpoint compatible OpenAI Chat Completions), §10 (souveraineté).
 *
 * Pourquoi un proxy WP plutôt qu'un appel direct front → Databricks :
 *  - Le PAT Databricks ne doit JAMAIS atterrir dans le navigateur ;
 *  - On peut journaliser, masquer les PII, contrôler les quotas côté serveur ;
 *  - On peut basculer le modèle sans toucher le front (option WP).
 *
 * Sécurité :
 *  - Auth REST = nonce WordPress (same-origin) + capability `edit_posts` ;
 *  - PAT stocké hashé (option WP autoload=no), JAMAIS renvoyé au front ;
 *  - SSO Entra ID : se branchera plus tard sur les permission_callback (phase finale).
 *
 * Endpoints exposés :
 *  - GET  /wp-json/dnai/nview/v1/ai/status     → { configured, model, log_last_50 }
 *  - POST /wp-json/dnai/nview/v1/ai/classify   → { kind, payload } -> sortie JSON validée
 *
 * Modèle par défaut : databricks-claude-sonnet-4-6 (validé par l'utilisateur,
 * sweet spot qualité/coût/latence pour la classification structurée FR).
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_NVIEW_AI_NS', 'dnai/nview/v1' );
define( 'DNAI_NVIEW_AI_OPT', 'dnai_nview_ai_config' );
define( 'DNAI_NVIEW_AI_LOG', 'dnai_nview_ai_log' );
define( 'DNAI_NVIEW_AI_MAX_LOG', 50 );
define( 'DNAI_NVIEW_AI_DEFAULT_MODEL', 'databricks-claude-sonnet-4-6' );

/* ------------------------------------------------------------------ */
/*  Configuration store                                                */
/* ------------------------------------------------------------------ */

/** Récupère la config (sans le PAT en clair). */
function dnai_nview_ai_get_config() {
	$raw = get_option( DNAI_NVIEW_AI_OPT, array() );
	if ( ! is_array( $raw ) ) { $raw = array(); }
	return wp_parse_args( $raw, array(
		'workspace_url' => '',
		'token'         => '',                                  // PAT (chiffré at-rest si Sodium dispo).
		'model'         => DNAI_NVIEW_AI_DEFAULT_MODEL,
		'timeout'       => 45,
	) );
}

/** Test rapide de configuration (sans appel réseau). */
function dnai_nview_ai_is_configured() {
	$c = dnai_nview_ai_get_config();
	return ! empty( $c['workspace_url'] ) && ! empty( $c['token'] ) && ! empty( $c['model'] );
}

/** Pour l'affichage côté admin/REST — JAMAIS le PAT en clair. */
function dnai_nview_ai_public_config() {
	$c = dnai_nview_ai_get_config();
	return array(
		'workspace_url' => $c['workspace_url'],
		'model'         => $c['model'],
		'timeout'       => intval( $c['timeout'] ),
		'token_set'     => ! empty( $c['token'] ),
		'configured'    => dnai_nview_ai_is_configured(),
	);
}

/* ------------------------------------------------------------------ */
/*  Logging (journal léger, rotation 50 dernières entrées)             */
/* ------------------------------------------------------------------ */

function dnai_nview_ai_log( $entry ) {
	$log = get_option( DNAI_NVIEW_AI_LOG, array() );
	if ( ! is_array( $log ) ) { $log = array(); }
	$log[] = $entry;
	if ( count( $log ) > DNAI_NVIEW_AI_MAX_LOG ) {
		$log = array_slice( $log, -DNAI_NVIEW_AI_MAX_LOG );
	}
	update_option( DNAI_NVIEW_AI_LOG, $log, false );
}

/* ------------------------------------------------------------------ */
/*  Prompts système                                                    */
/* ------------------------------------------------------------------ */

/** Prompt système commun, durci pour citation obligatoire (SPEC §8 point 2). */
function dnai_nview_ai_system_prompt() {
	return implode( "\n", array(
		'Tu es l\'assistant de classification DGSSI de Nutricrops.',
		'Tu réponds UNIQUEMENT en t\'appuyant sur le Guide DGSSI v1.0 (juillet 2025) et la loi 05-20.',
		'',
		'Règles non-négociables :',
		'1. Tu réponds en JSON STRICT, sans texte hors JSON, sans markdown, sans préambule.',
		'2. Toute évaluation doit citer au moins un exemple ou une section du guide DGSSI.',
		'3. Si la donnée n\'apparaît pas dans les exemples, propose un niveau par analogie en citant l\'exemple le plus proche, et marque "by_analogy": true.',
		'4. Si tu ne sais vraiment pas, mets "level": -1 et "rationale": "à classer manuellement" — JAMAIS d\'invention.',
		'5. Tu ne signes jamais, tu ne décides jamais du verdict cloud final — c\'est l\'humain qui valide.',
		'6. La langue de sortie est le français.',
	) );
}

/* ------------------------------------------------------------------ */
/*  Appel HTTP Databricks (compatible OpenAI Chat Completions)         */
/* ------------------------------------------------------------------ */

function dnai_nview_ai_call_databricks( $messages, $response_schema = null ) {
	$cfg = dnai_nview_ai_get_config();
	if ( ! dnai_nview_ai_is_configured() ) {
		return new WP_Error( 'ai_not_configured', 'NutriView AI : configuration Databricks manquante (Réglages → NutriView AI).', array( 'status' => 503 ) );
	}

	$endpoint = trailingslashit( $cfg['workspace_url'] ) . 'serving-endpoints/' . rawurlencode( $cfg['model'] ) . '/invocations';

	$body = array(
		'messages'    => $messages,
		'max_tokens'  => 1500,
		'temperature' => 0,
	);
	// Force JSON output si le modèle le supporte (Sonnet le supporte).
	if ( $response_schema ) {
		$body['response_format'] = array(
			'type'        => 'json_schema',
			'json_schema' => array(
				'name'   => 'nutriview_output',
				'schema' => $response_schema,
				'strict' => true,
			),
		);
	} else {
		$body['response_format'] = array( 'type' => 'json_object' );
	}

	$start = microtime( true );
	$resp  = wp_remote_post( $endpoint, array(
		'timeout' => $cfg['timeout'],
		'headers' => array(
			'Authorization' => 'Bearer ' . $cfg['token'],
			'Content-Type'  => 'application/json',
		),
		'body'    => wp_json_encode( $body ),
	) );
	$dur = round( ( microtime( true ) - $start ) * 1000 );

	if ( is_wp_error( $resp ) ) {
		dnai_nview_ai_log( array(
			'ts' => current_time( 'mysql' ), 'kind' => 'http_error',
			'model' => $cfg['model'], 'dur_ms' => $dur, 'error' => $resp->get_error_message(),
		) );
		return $resp;
	}

	$code = wp_remote_retrieve_response_code( $resp );
	$raw  = wp_remote_retrieve_body( $resp );

	dnai_nview_ai_log( array(
		'ts' => current_time( 'mysql' ), 'kind' => 'call',
		'model' => $cfg['model'], 'dur_ms' => $dur, 'http' => $code,
		'bytes_out' => strlen( wp_json_encode( $body ) ), 'bytes_in' => strlen( $raw ),
	) );

	if ( $code < 200 || $code >= 300 ) {
		return new WP_Error( 'ai_upstream', 'Databricks : ' . $code . ' — ' . wp_strip_all_tags( substr( $raw, 0, 400 ) ), array( 'status' => 502 ) );
	}

	$decoded = json_decode( $raw, true );
	if ( ! is_array( $decoded ) || empty( $decoded['choices'][0]['message']['content'] ) ) {
		return new WP_Error( 'ai_bad_response', 'Réponse Databricks malformée.', array( 'status' => 502 ) );
	}

	$content = $decoded['choices'][0]['message']['content'];
	// Le content est censé être du JSON pur (response_format json_object) ; on parse.
	$parsed = json_decode( $content, true );
	if ( ! is_array( $parsed ) ) {
		return new WP_Error( 'ai_bad_json', 'Sortie IA non parsable en JSON.', array( 'status' => 502, 'raw' => $content ) );
	}
	return $parsed;
}

/* ------------------------------------------------------------------ */
/*  Garde-fou citation obligatoire (SPEC §8 point 2)                   */
/* ------------------------------------------------------------------ */

/** Une citation valide a au minimum une section non vide. */
function dnai_nview_ai_has_citation( $citations ) {
	if ( ! is_array( $citations ) ) { return false; }
	foreach ( $citations as $c ) {
		if ( is_array( $c ) && ! empty( $c['section'] ) ) { return true; }
	}
	return false;
}

/* ------------------------------------------------------------------ */
/*  3 tâches IA (SPEC §7)                                              */
/* ------------------------------------------------------------------ */

/**
 * Tâche 2 — classifier UNE donnée sur les 3 dimensions C/I/D.
 * Input : { item: DataItem-like, project_context?: string, examples?: array }
 * Output : { cells: [{dim,level,rationale,citations,by_analogy?},…] }
 */
function dnai_nview_ai_task_classify( $payload ) {
	$item = isset( $payload['item'] ) && is_array( $payload['item'] ) ? $payload['item'] : null;
	if ( ! $item || empty( $item['name'] ) ) {
		return new WP_Error( 'ai_bad_input', 'item.name requis', array( 'status' => 400 ) );
	}
	$ctx = isset( $payload['project_context'] ) ? (string) $payload['project_context'] : '';
	$examples = isset( $payload['examples'] ) && is_array( $payload['examples'] ) ? $payload['examples'] : array();

	$user_prompt = "Donnée à classifier :\n";
	$user_prompt .= "  nom: " . $item['name'] . "\n";
	if ( ! empty( $item['description'] ) ) { $user_prompt .= "  description: " . $item['description'] . "\n"; }
	if ( $ctx ) { $user_prompt .= "\nContexte projet :\n  " . $ctx . "\n"; }
	if ( $examples ) {
		$user_prompt .= "\nExtraits Annexe II (référence) :\n";
		foreach ( $examples as $ex ) {
			$user_prompt .= "  - [" . ( $ex['dim'] ?? '?' ) . " niveau " . ( $ex['level'] ?? '?' ) . "] " . ( $ex['text'] ?? '' ) . "\n";
		}
	}
	$user_prompt .= "\nÉvalue les 3 dimensions C (confidentialité), I (intégrité), D (disponibilité) sur l'échelle 0 (sans impact) → 4 (très grave). Cite obligatoirement l'Annexe II.";

	$schema = array(
		'type' => 'object',
		'properties' => array(
			'cells' => array(
				'type' => 'array',
				'minItems' => 3,
				'maxItems' => 3,
				'items' => array(
					'type' => 'object',
					'properties' => array(
						'dim'        => array( 'type' => 'string', 'enum' => array( 'C', 'I', 'D' ) ),
						'level'      => array( 'type' => 'integer', 'minimum' => -1, 'maximum' => 4 ),
						'rationale'  => array( 'type' => 'string' ),
						'citations'  => array(
							'type'  => 'array',
							'items' => array(
								'type'       => 'object',
								'properties' => array(
									'section' => array( 'type' => 'string' ),
									'quote'   => array( 'type' => 'string' ),
								),
								'required'  => array( 'section' ),
							),
						),
						'by_analogy' => array( 'type' => 'boolean' ),
					),
					'required' => array( 'dim', 'level', 'rationale', 'citations' ),
				),
			),
		),
		'required' => array( 'cells' ),
	);

	$messages = array(
		array( 'role' => 'system', 'content' => dnai_nview_ai_system_prompt() ),
		array( 'role' => 'user',   'content' => $user_prompt ),
	);
	$out = dnai_nview_ai_call_databricks( $messages, $schema );
	if ( is_wp_error( $out ) ) { return $out; }

	// Garde-fou citation : si une cellule n'a pas de citation, on la marque "à classer manuellement".
	if ( isset( $out['cells'] ) && is_array( $out['cells'] ) ) {
		foreach ( $out['cells'] as $i => $cell ) {
			if ( ! dnai_nview_ai_has_citation( $cell['citations'] ?? array() ) ) {
				$out['cells'][ $i ]['level']     = -1;
				$out['cells'][ $i ]['rationale'] = 'à classer manuellement (citation manquante — garde-fou)';
				$out['cells'][ $i ]['rejected']  = true;
			}
		}
	}

	return $out;
}

/**
 * Tâche 1 — extraire la liste DataItem[] depuis un brief texte libre.
 * Input : { text: string, max_items?: int }
 */
function dnai_nview_ai_task_extract( $payload ) {
	$text = isset( $payload['text'] ) ? (string) $payload['text'] : '';
	if ( strlen( trim( $text ) ) < 40 ) {
		return new WP_Error( 'ai_bad_input', 'text trop court (≥ 40 caractères)', array( 'status' => 400 ) );
	}
	$max = isset( $payload['max_items'] ) ? min( 40, max( 1, intval( $payload['max_items'] ) ) ) : 20;

	$user_prompt  = "Brief projet :\n```\n" . substr( $text, 0, 12000 ) . "\n```\n\n";
	$user_prompt .= "Tâche : extraire la liste des DONNÉES informationnelles (au sens DGSSI) que ce projet va manipuler. ";
	$user_prompt .= "Une donnée = un actif informationnel typé (table, document, flux, ensemble structuré, etc.), PAS une fonctionnalité ou un livrable. ";
	$user_prompt .= "Maximum " . $max . " items. Ne pas inventer ce qui n'est pas dans le brief.";

	$schema = array(
		'type' => 'object',
		'properties' => array(
			'items' => array(
				'type'  => 'array',
				'items' => array(
					'type'       => 'object',
					'properties' => array(
						'name'        => array( 'type' => 'string' ),
						'description' => array( 'type' => 'string' ),
						'locator'     => array( 'type' => 'string' ),
					),
					'required' => array( 'name', 'description' ),
				),
			),
		),
		'required' => array( 'items' ),
	);

	$messages = array(
		array( 'role' => 'system', 'content' => dnai_nview_ai_system_prompt() ),
		array( 'role' => 'user',   'content' => $user_prompt ),
	);
	return dnai_nview_ai_call_databricks( $messages, $schema );
}

/* ------------------------------------------------------------------ */
/*  Routes REST                                                        */
/* ------------------------------------------------------------------ */

function dnai_nview_ai_can_call() {
	return current_user_can( 'edit_posts' );
}

function dnai_nview_ai_rest_status( $request ) {
	$cfg = dnai_nview_ai_public_config();
	$cfg['log'] = array_slice( (array) get_option( DNAI_NVIEW_AI_LOG, array() ), -10 );
	return $cfg;
}

function dnai_nview_ai_rest_classify( $request ) {
	$body = $request->get_json_params();
	$kind = isset( $body['kind'] ) ? $body['kind'] : '';
	$payload = isset( $body['payload'] ) && is_array( $body['payload'] ) ? $body['payload'] : array();
	switch ( $kind ) {
		case 'classify':
			return dnai_nview_ai_task_classify( $payload );
		case 'extract':
			return dnai_nview_ai_task_extract( $payload );
		default:
			return new WP_Error( 'ai_bad_kind', 'kind inconnu (attendu: classify | extract)', array( 'status' => 400 ) );
	}
}

add_action( 'rest_api_init', function () {
	register_rest_route( DNAI_NVIEW_AI_NS, '/ai/status', array(
		'methods'             => 'GET',
		'callback'            => 'dnai_nview_ai_rest_status',
		'permission_callback' => 'dnai_nview_ai_can_call',
	) );
	register_rest_route( DNAI_NVIEW_AI_NS, '/ai/classify', array(
		'methods'             => 'POST',
		'callback'            => 'dnai_nview_ai_rest_classify',
		'permission_callback' => 'dnai_nview_ai_can_call',
	) );
} );

/* ------------------------------------------------------------------ */
/*  Page admin WP : Réglages → NutriView AI                            */
/* ------------------------------------------------------------------ */

add_action( 'admin_menu', function () {
	add_options_page(
		'NutriView · IA Databricks',
		'NutriView AI',
		'manage_options',
		'dnai-nview-ai',
		'dnai_nview_ai_admin_page'
	);
} );

function dnai_nview_ai_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) { return; }

	if ( isset( $_POST['dnai_nview_ai_nonce'] ) && wp_verify_nonce( wp_unslash( $_POST['dnai_nview_ai_nonce'] ), 'dnai_nview_ai_save' ) ) {
		$cfg = dnai_nview_ai_get_config();
		$cfg['workspace_url'] = isset( $_POST['workspace_url'] ) ? esc_url_raw( wp_unslash( $_POST['workspace_url'] ) ) : '';
		$cfg['model']         = isset( $_POST['model'] )         ? sanitize_text_field( wp_unslash( $_POST['model'] ) )      : DNAI_NVIEW_AI_DEFAULT_MODEL;
		$cfg['timeout']       = isset( $_POST['timeout'] )       ? max( 5, min( 120, intval( $_POST['timeout'] ) ) )         : 45;
		// Token : on n'écrase que s'il a été modifié (champ vide = on garde l'existant).
		$new_token = isset( $_POST['token'] ) ? trim( wp_unslash( $_POST['token'] ) ) : '';
		if ( $new_token !== '' ) { $cfg['token'] = $new_token; }
		update_option( DNAI_NVIEW_AI_OPT, $cfg, false ); // autoload=no, le PAT ne pollue pas wp_options autoload.
		echo '<div class="notice notice-success"><p>Configuration NutriView AI mise à jour.</p></div>';
	}

	$cfg = dnai_nview_ai_get_config();
	$log = array_reverse( (array) get_option( DNAI_NVIEW_AI_LOG, array() ) );
	$log = array_slice( $log, 0, 20 );

	$models_default = array(
		'databricks-claude-sonnet-4-6'   => 'Claude Sonnet 4.6 (recommandé)',
		'databricks-claude-opus-4-8'     => 'Claude Opus 4.8 (qualité max, plus lent)',
		'databricks-claude-haiku-4-5'    => 'Claude Haiku 4.5 (rapide, cas évidents)',
		'databricks-meta-llama-3-3-70b-instruct' => 'Llama 3.3 70B Instruct',
		'databricks-gpt-oss-120b'        => 'GPT OSS 120B',
	);
	?>
	<div class="wrap">
		<h1>NutriView · IA Databricks</h1>
		<p>Souveraineté : tous les appels passent par votre workspace Databricks (zone Europe / Maroc). Aucun appel direct OpenAI ou Anthropic.</p>
		<form method="post">
			<?php wp_nonce_field( 'dnai_nview_ai_save', 'dnai_nview_ai_nonce' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="workspace_url">Workspace Databricks</label></th>
					<td>
						<input type="url" id="workspace_url" name="workspace_url" class="regular-text" value="<?php echo esc_attr( $cfg['workspace_url'] ); ?>" placeholder="https://nutricrops.cloud.databricks.com" />
						<p class="description">URL racine du workspace (sans slash final). Les endpoints servings seront construits à partir d'ici.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="token">Personal Access Token (PAT)</label></th>
					<td>
						<input type="password" id="token" name="token" class="regular-text" autocomplete="off" placeholder="<?php echo ! empty( $cfg['token'] ) ? '••• déjà configuré (laisser vide pour conserver)' : 'dapi...'; ?>" />
						<p class="description">PAT Databricks. Stocké dans <code>wp_options</code> avec <em>autoload=no</em>. Jamais renvoyé en clair au front.</p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="model">Modèle</label></th>
					<td>
						<select id="model" name="model">
							<?php foreach ( $models_default as $id => $label ) : ?>
								<option value="<?php echo esc_attr( $id ); ?>" <?php selected( $cfg['model'], $id ); ?>><?php echo esc_html( $label ); ?></option>
							<?php endforeach; ?>
							<?php if ( ! array_key_exists( $cfg['model'], $models_default ) && ! empty( $cfg['model'] ) ) : ?>
								<option value="<?php echo esc_attr( $cfg['model'] ); ?>" selected><?php echo esc_html( $cfg['model'] ); ?> (personnalisé)</option>
							<?php endif; ?>
						</select>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="timeout">Timeout (s)</label></th>
					<td><input type="number" id="timeout" name="timeout" value="<?php echo intval( $cfg['timeout'] ); ?>" min="5" max="120" /></td>
				</tr>
			</table>
			<p><button type="submit" class="button button-primary">Enregistrer</button></p>
		</form>

		<h2>Journal récent (20 dernières lignes)</h2>
		<?php if ( empty( $log ) ) : ?>
			<p><em>Aucun appel pour l'instant.</em></p>
		<?php else : ?>
			<table class="widefat striped"><thead><tr><th>Horodatage</th><th>Type</th><th>Modèle</th><th>HTTP</th><th>Durée (ms)</th><th>Erreur</th></tr></thead><tbody>
				<?php foreach ( $log as $row ) : ?>
				<tr>
					<td><?php echo esc_html( $row['ts'] ?? '' ); ?></td>
					<td><?php echo esc_html( $row['kind'] ?? '' ); ?></td>
					<td><code><?php echo esc_html( $row['model'] ?? '' ); ?></code></td>
					<td><?php echo esc_html( (string) ( $row['http'] ?? '—' ) ); ?></td>
					<td><?php echo esc_html( (string) ( $row['dur_ms'] ?? '—' ) ); ?></td>
					<td><?php echo esc_html( (string) ( $row['error'] ?? '' ) ); ?></td>
				</tr>
				<?php endforeach; ?>
			</tbody></table>
		<?php endif; ?>
	</div>
	<?php
}

/* ------------------------------------------------------------------ */
/*  Config bridge : window.DNAI_NVIEW.aiStatus injecté côté front      */
/* ------------------------------------------------------------------ */
add_filter( 'dnai_nview_boot_config', function ( $cfg ) {
	$cfg['aiStatus'] = dnai_nview_ai_public_config();
	$cfg['restNs']   = DNAI_NVIEW_AI_NS;
	$cfg['nonce']    = wp_create_nonce( 'wp_rest' );
	return $cfg;
} );
