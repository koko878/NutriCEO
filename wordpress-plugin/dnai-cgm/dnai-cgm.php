<?php
/**
 * Plugin Name:       D²nAI CGM Simulator
 * Description:       Sales margin pricing-scenario simulator (CGM equivalent DAP/TSP, floor price, nutrient-value price, MCV) with an AI copilot. The copilot (an Open WebUI / OpenAI-compatible model — Qwen recommended) only returns a strict JSON action; every number shown comes from the verified in-browser engine, so the model can never hallucinate a margin. Calls go through a server-side proxy, so the API key never reaches the browser and there is no CORS.
 * Version:           1.5.2
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-cgm
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_CGM_VER', '1.5.2' );
define( 'DNAI_CGM_URL', plugin_dir_url( __FILE__ ) );

/* -------------------------------------------------------------------------
 * 1. System prompt — the copilot returns a JSON ACTION, never numbers.
 * ---------------------------------------------------------------------- */
function dnai_cgm_default_prompt() {
	return <<<'EOT'
Tu es le copilote du « CGM Simulator » d'OCP Nutricrops (équipe D²nAI), au service des commerciaux. Tu traduis la demande d'un commercial en UNE action JSON qui pilote le moteur de calcul de marge. Tu ne calcules JAMAIS de chiffres toi-même : le moteur déterministe s'en charge et reste la seule source de vérité.

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour ni bloc de code.

Schéma :
{
  "intent": "compute|compare|sensitivity|set|explain|smalltalk",
  "product_index": <entier issu du CATALOGUE, ou null>,
  "ref": "DAP" | "TSP" | null,
  "price": <nombre en $/t, ou null>,
  "rm": { "rock":n,"nh3":n,"sulphur":n,"kcl":n,"sam":n,"acs":n,"borax":n,"zno":n,"cuso4":n,"caso4":n,"caco3":n,"gypse":n } | null,
  "refprice": { "dap":n, "tsp":n } | null,
  "sens": { "nh3":n, "sulphur":n } | null,
  "preface": "<une phrase d'introduction en français, SANS aucun chiffre>",
  "clarify": "<question en français si la demande est ambiguë, sinon null>"
}

Règles :
- "product_index" DOIT être choisi dans le CATALOGUE fourni (l'entier qui suit le #). Si la demande exige un produit mais qu'aucun ne correspond clairement, laisse "product_index" à null et pose une question dans "clarify".
- Dans "rm", ne mets QUE les matières premières explicitement citées par l'utilisateur (en $/t). "sens" est en pourcentage.
- Choix de "intent" : "compare" = classer/comparer les formules OU choisir quel(s) produit(s) vendre/prioriser/recommander (ex. « quel produit vendre en priorité ? », « lesquels créent le plus de valeur ? », « top produits à pousser ? ») — dans ce cas product_index=null, NE demande PAS de clarification, le moteur classe les 141 produits ; "sensitivity" = impact d'une variation NH3/Soufre ; "set" = l'utilisateur fixe un prix ou un paramètre ; "compute" ou "explain" = analyser le produit courant ; "smalltalk" = hors-sujet.
- N'utilise "clarify" que si la demande vise UN produit précis introuvable. Une question générale de priorité/recommandation/classement n'est JAMAIS ambiguë : c'est "compare".
- Ne mets AUCUN chiffre dans "preface".
- "preface" et "clarify" sont en français.
EOT;
}

/* -------------------------------------------------------------------------
 * 2. Settings
 * ---------------------------------------------------------------------- */
function dnai_cgm_opt( $key, $default = '' ) {
	$o = get_option( 'dnai_cgm_settings', array() );
	return isset( $o[ $key ] ) && $o[ $key ] !== '' ? $o[ $key ] : $default;
}

/* -------------------------------------------------------------------------
 * Dataset (formulas / coefficients). The business can replace the built-in
 * data with their real values. An uploaded dataset (option) overrides the
 * default bundled JSON; the front-end falls back to its embedded copy.
 * ---------------------------------------------------------------------- */
function dnai_cgm_default_dataset() {
	$f   = plugin_dir_path( __FILE__ ) . 'data/cgm_data.json';
	$raw = is_readable( $f ) ? file_get_contents( $f ) : '';
	$d   = json_decode( $raw, true );
	return is_array( $d ) ? $d : null;
}

/* The admin override, or null when none is uploaded (front-end uses default). */
function dnai_cgm_override() {
	$opt = get_option( 'dnai_cgm_dataset', null );
	return ( is_array( $opt ) && ! empty( $opt['products'] ) ) ? $opt : null;
}

/* The dataset currently in effect (override if present, else the default). */
function dnai_cgm_current_dataset() {
	$o = dnai_cgm_override();
	return $o ? $o : dnai_cgm_default_dataset();
}

/* Validate an uploaded dataset against the engine's contract. */
function dnai_cgm_validate_dataset( $d ) {
	if ( ! is_array( $d ) ) {
		return 'Fichier illisible (JSON invalide).';
	}
	if ( empty( $d['products'] ) || ! is_array( $d['products'] ) ) {
		return 'Clé « products » manquante ou vide.';
	}
	if ( empty( $d['constants'] ) || empty( $d['defaults'] ) || empty( $d['references'] ) ) {
		return 'Sections « constants », « defaults » ou « references » manquantes.';
	}
	$need = array( 'product', 'line', 'family', 'row', 'cs_rock', 'cs_nh3', 's_total', 'cs_acp', 'nutrient_total', 'variable_cost_total' );
	$p    = $d['products'][0];
	if ( ! is_array( $p ) ) {
		return 'Le premier produit est invalide.';
	}
	foreach ( $need as $k ) {
		if ( ! array_key_exists( $k, $p ) ) {
			return 'Colonne produit manquante : « ' . $k . ' ».';
		}
	}
	return true;
}

/* -------------------------------------------------------------------------
 * XLSX import — reads the original CGM_Simulator workbook (no dependency).
 * Only the BDD_LIGNES and "CGM SIMULATOR" sheets are read (the pricing grid
 * sheet can be huge), using cached cell values written by Excel.
 * ---------------------------------------------------------------------- */
function dnai_cgm_num( $v ) {
	if ( is_int( $v ) || is_float( $v ) ) { return (float) $v; }
	if ( is_string( $v ) && is_numeric( $v ) ) { return (float) $v; }
	return 0.0;
}

function dnai_cgm_xlsx_shared( $xml ) {
	$out = array();
	if ( ! is_string( $xml ) || '' === $xml ) { return $out; }
	$r = new XMLReader();
	$r->XML( $xml );
	$cur = ''; $in = false;
	while ( @$r->read() ) {
		if ( XMLReader::ELEMENT === $r->nodeType ) {
			if ( 'si' === $r->localName ) { $cur = ''; $in = true; }
			elseif ( 't' === $r->localName && $in ) { $cur .= $r->readString(); }
		} elseif ( XMLReader::END_ELEMENT === $r->nodeType && 'si' === $r->localName ) {
			$out[] = $cur; $in = false;
		}
	}
	$r->close();
	return $out;
}

function dnai_cgm_xlsx_cells( $xml, $shared ) {
	$cells = array();
	if ( ! is_string( $xml ) || '' === $xml ) { return $cells; }
	$r = new XMLReader();
	$r->XML( $xml );
	$ref = null; $type = null;
	while ( @$r->read() ) {
		if ( XMLReader::ELEMENT === $r->nodeType ) {
			$ln = $r->localName;
			if ( 'c' === $ln ) {
				$ref  = $r->getAttribute( 'r' );
				$type = $r->getAttribute( 't' );
			} elseif ( 'v' === $ln && null !== $ref ) {
				$v = $r->readString();
				$cells[ $ref ] = ( 's' === $type ) ? ( isset( $shared[ (int) $v ] ) ? $shared[ (int) $v ] : '' ) : $v;
			} elseif ( 't' === $ln && 'inlineStr' === $type && null !== $ref ) {
				$cells[ $ref ] = $r->readString();
			}
		}
	}
	$r->close();
	return $cells;
}

/* Returns a dataset array on success, or a string error message. */
function dnai_cgm_xlsx_to_dataset( $file ) {
	if ( ! class_exists( 'ZipArchive' ) ) {
		return 'Extension PHP « zip » indisponible sur le serveur (requise pour lire .xlsx).';
	}
	$zip = new ZipArchive();
	if ( true !== $zip->open( $file ) ) {
		return 'Fichier .xlsx illisible.';
	}
	$wb   = $zip->getFromName( 'xl/workbook.xml' );
	$rels = $zip->getFromName( 'xl/_rels/workbook.xml.rels' );
	if ( ! $wb || ! $rels ) { $zip->close(); return 'Structure .xlsx inattendue.'; }

	$name2rid = array();
	if ( preg_match_all( '/<sheet[^>]*\bname="([^"]*)"[^>]*\br:id="([^"]*)"/', $wb, $m, PREG_SET_ORDER ) ) {
		foreach ( $m as $mm ) { $name2rid[ html_entity_decode( $mm[1], ENT_QUOTES ) ] = $mm[2]; }
	}
	$rid2tgt = array();
	if ( preg_match_all( '/<Relationship[^>]*\bId="([^"]*)"[^>]*\bTarget="([^"]*)"/', $rels, $m2, PREG_SET_ORDER ) ) {
		foreach ( $m2 as $mm ) { $rid2tgt[ $mm[1] ] = $mm[2]; }
	}
	$path = function ( $sheet ) use ( $name2rid, $rid2tgt ) {
		if ( ! isset( $name2rid[ $sheet ] ) ) { return null; }
		$t = isset( $rid2tgt[ $name2rid[ $sheet ] ] ) ? $rid2tgt[ $name2rid[ $sheet ] ] : null;
		if ( ! $t ) { return null; }
		$t = preg_replace( '#^/?xl/#', '', $t );
		return 'xl/' . ltrim( $t, '/' );
	};
	$bddPath = $path( 'BDD_LIGNES' );
	$simPath = $path( 'CGM SIMULATOR' );
	if ( ! $bddPath || ! $simPath ) { $zip->close(); return 'Onglets « BDD_LIGNES » / « CGM SIMULATOR » introuvables dans le classeur.'; }

	$sharedXml = $zip->getFromName( 'xl/sharedStrings.xml' );
	$shared    = $sharedXml ? dnai_cgm_xlsx_shared( $sharedXml ) : array();
	$bdd       = dnai_cgm_xlsx_cells( $zip->getFromName( $bddPath ), $shared );
	$sim       = dnai_cgm_xlsx_cells( $zip->getFromName( $simPath ), $shared );
	$zip->close();

	$get = function ( $cells, $col, $row ) {
		$k = $col . $row;
		return isset( $cells[ $k ] ) ? $cells[ $k ] : null;
	};

	$cols = array(
		'priority' => 'A', 'family' => 'B', 'product' => 'C', 'line' => 'D',
		'cs_rock' => 'E', 'cs_acp' => 'F', 'cs_nh3' => 'G', 'cs_acs' => 'H', 'cs_sulfur' => 'I',
		'cs_borax' => 'J', 'cs_zno' => 'K', 'cs_cuso4' => 'L', 'cs_kcl' => 'M', 'cs_sam' => 'N',
		'cs_caso4' => 'O', 'cs_caco3' => 'P', 'cs_gypse' => 'Q', 's_from_acp' => 'R',
		's_from_h2so4' => 'S', 's_direct' => 'T', 's_total' => 'U', 'n' => 'V', 'p' => 'W',
		'k' => 'X', 's' => 'Y', 'nutrient_total' => 'Z', 'rock_from_acp_cost' => 'AA',
		'prod_maux' => 'AB', 'prod_om' => 'AC', 'prod_ee' => 'AD', 'prod_vap' => 'AE',
		'prod_tolling_fees' => 'AF', 'variable_cost_total' => 'AG',
	);
	$text_keys = array( 'priority', 'family', 'product', 'line' );

	$products = array();
	$empty    = 0;
	for ( $row = 4; $row <= 250; $row++ ) {
		$name = $get( $bdd, 'C', $row );
		if ( null === $name || '' === trim( (string) $name ) ) {
			if ( ++$empty >= 3 ) { break; }
			continue;
		}
		$empty = 0;
		$o = array( 'row' => $row );
		foreach ( $cols as $key => $col ) {
			$v = $get( $bdd, $col, $row );
			$o[ $key ] = in_array( $key, $text_keys, true ) ? ( null === $v ? '' : (string) $v ) : dnai_cgm_num( $v );
		}
		$products[] = $o;
	}
	if ( count( $products ) < 2 ) {
		return 'Aucune formule lue dans « BDD_LIGNES » (vérifiez que l\'onglet contient les données).';
	}

	// Start from the bundled default to keep labels / notes / sensitivity defaults.
	$ds = dnai_cgm_default_dataset();
	if ( ! is_array( $ds ) ) {
		$ds = array( 'constants' => array(), 'defaults' => array(), 'references' => array(), 'products' => array() );
	}
	$ds['products'] = $products;

	$ds['constants']['sulfur_index']       = dnai_cgm_num( $get( $bdd, 'AK', 2 ) );
	$ds['constants']['sulfur_index_h2so4'] = dnai_cgm_num( $get( $bdd, 'AK', 3 ) );
	$ds['constants']['rock_index']         = dnai_cgm_num( $get( $bdd, 'AM', 2 ) );

	$rm_rows = array( 'rock' => 15, 'nh3' => 16, 'sulphur' => 17, 'borax' => 18, 'zno' => 19, 'cuso4' => 20, 'kcl' => 21, 'sam' => 22, 'caso4' => 23, 'caco3' => 24, 'gypse' => 25, 'acs' => 26 );
	foreach ( $rm_rows as $k => $rr ) {
		$ds['defaults']['rm_prices'][ $k ] = dnai_cgm_num( $get( $sim, 'C', $rr ) );
	}
	$ds['defaults']['reference_prices']['dap'] = dnai_cgm_num( $get( $sim, 'C', 28 ) );
	$ds['defaults']['reference_prices']['tsp'] = dnai_cgm_num( $get( $sim, 'C', 29 ) );

	foreach ( $products as $p ) {
		if ( 'Ref' !== trim( (string) $p['priority'] ) ) { continue; }
		$fam = strtoupper( $p['family'] );
		$slot = ( 0 === strpos( $fam, 'DAP' ) ) ? 'dap' : ( ( 0 === strpos( $fam, 'TSP' ) ) ? 'tsp' : null );
		if ( $slot && empty( $ds['references'][ $slot ]['_set'] ) ) {
			$ds['references'][ $slot ] = array(
				'product'        => $p['product'],
				'line'           => $p['line'],
				'row'            => $p['row'],
				'cs_acp'         => $p['cs_acp'],
				'nutrient_total' => $p['nutrient_total'],
				'_set'           => true,
			);
		}
	}
	foreach ( array( 'dap', 'tsp' ) as $slot ) {
		if ( isset( $ds['references'][ $slot ]['_set'] ) ) { unset( $ds['references'][ $slot ]['_set'] ); }
	}

	$err = dnai_cgm_validate_dataset( $ds );
	if ( true !== $err ) { return 'Conversion Excel invalide : ' . $err; }
	return $ds;
}

add_action( 'admin_menu', function () {
	add_options_page( 'D²nAI CGM', 'D²nAI CGM', 'manage_options', 'dnai-cgm', 'dnai_cgm_settings_page' );
} );

add_action( 'admin_init', function () {
	register_setting( 'dnai_cgm', 'dnai_cgm_settings', array( 'sanitize_callback' => 'dnai_cgm_sanitize' ) );
} );

function dnai_cgm_sanitize( $in ) {
	return array(
		'base_url'      => isset( $in['base_url'] ) ? esc_url_raw( trim( $in['base_url'] ) ) : '',
		'api_path'      => isset( $in['api_path'] ) ? sanitize_text_field( $in['api_path'] ) : '/api/chat/completions',
		'api_key'       => isset( $in['api_key'] ) ? trim( $in['api_key'] ) : '',
		'model'         => isset( $in['model'] ) ? sanitize_text_field( $in['model'] ) : 'cgm-copilote',
		'json_mode'     => ! empty( $in['json_mode'] ) ? '1' : '',
		'timeout'       => isset( $in['timeout'] ) ? max( 15, min( 300, (int) $in['timeout'] ) ) : 60,
		'system_prompt' => isset( $in['system_prompt'] ) ? sanitize_textarea_field( $in['system_prompt'] ) : '',
	);
}

function dnai_cgm_settings_page() {
	$base  = dnai_cgm_opt( 'base_url', 'https://lab.ocpnutricrops.ai' );
	$path  = dnai_cgm_opt( 'api_path', '/api/chat/completions' );
	$key   = dnai_cgm_opt( 'api_key', '' );
	$model = dnai_cgm_opt( 'model', 'cgm-copilote' );
	$json  = dnai_cgm_opt( 'json_mode', '1' );
	$tmout = (int) dnai_cgm_opt( 'timeout', 60 );
	$saved = get_option( 'dnai_cgm_settings', null );
	$prompt = is_array( $saved ) && array_key_exists( 'system_prompt', $saved ) ? $saved['system_prompt'] : dnai_cgm_default_prompt();
	?>
	<div class="wrap">
		<h1>D²nAI CGM Simulator — settings</h1>
		<p>Connect the AI Lab LLM (Open WebUI / OpenAI-compatible — <strong>Qwen</strong> recommended; Mistral works too). Add the tool to any page with the shortcode <code>[dnai_cgm]</code>. The copilot only returns a JSON action; the margin numbers are always computed by the in-browser engine. The API key stays server-side (the browser calls the WP REST proxy <code>/wp-json/dnai-cgm/v1/chat</code>).</p>
		<form method="post" action="options.php">
			<?php settings_fields( 'dnai_cgm' ); ?>
			<table class="form-table" role="presentation">
				<tr><th><label>AI Lab base URL</label></th>
					<td><input type="url" name="dnai_cgm_settings[base_url]" value="<?php echo esc_attr( $base ); ?>" class="regular-text" placeholder="https://lab.ocpnutricrops.ai">
					<p class="description">Open WebUI host (no trailing slash).</p></td></tr>
				<tr><th><label>API path</label></th>
					<td><input type="text" name="dnai_cgm_settings[api_path]" value="<?php echo esc_attr( $path ); ?>" class="regular-text">
					<p class="description">OpenAI-compatible chat endpoint. Open WebUI default: <code>/api/chat/completions</code></p></td></tr>
				<tr><th><label>API key</label></th>
					<td><input type="password" name="dnai_cgm_settings[api_key]" value="<?php echo esc_attr( $key ); ?>" class="regular-text" autocomplete="off">
					<p class="description">Open WebUI → Settings → Account → API Keys. Stored server-side, never exposed to the browser.</p></td></tr>
				<tr><th><label>Copilot model</label></th>
					<td><input type="text" name="dnai_cgm_settings[model]" value="<?php echo esc_attr( $model ); ?>" class="regular-text" placeholder="cgm-copilote">
					<p class="description">The id of your Open WebUI model. <strong>Qwen</strong> is the best base for this JSON-action task; Mistral works too. Use a custom model id (e.g. <code>cgm-copilote</code>) or a base model id.</p></td></tr>
				<tr><th><label>JSON mode</label></th>
					<td><label><input type="checkbox" name="dnai_cgm_settings[json_mode]" value="1" <?php checked( $json, '1' ); ?>> Force a strict JSON response (<code>response_format=json_object</code>)</label>
					<p class="description">Improves reliability with DeepSeek. Disable if your backend rejects the parameter — the proxy also tolerates plain / fenced JSON.</p></td></tr>
				<tr><th><label>Request timeout (s)</label></th>
					<td><input type="number" name="dnai_cgm_settings[timeout]" value="<?php echo esc_attr( $tmout ); ?>" class="small-text" min="15" max="300" step="5">
					<p class="description">The copilot only emits a small JSON action, so it is fast (usually &lt; 15&nbsp;s).</p></td></tr>
				<tr><th><label>System prompt</label></th>
					<td><textarea name="dnai_cgm_settings[system_prompt]" rows="16" class="large-text code"><?php echo esc_textarea( $prompt ); ?></textarea>
					<p class="description">Drives the action-JSON contract. Edit with care: the front-end relies on this exact schema. <strong>Leave empty</strong> if the role already lives in your Open WebUI custom model (Option B) — the plugin will then send no system message.</p></td></tr>
			</table>
			<?php submit_button(); ?>
		</form>

		<hr>
		<h2>Données &amp; formules</h2>
		<?php
		$ov     = dnai_cgm_override();
		$cur    = dnai_cgm_current_dataset();
		$count  = is_array( $cur ) && ! empty( $cur['products'] ) ? count( $cur['products'] ) : 0;
		$msg    = isset( $_GET['dnai_cgm_msg'] ) ? sanitize_text_field( wp_unslash( $_GET['dnai_cgm_msg'] ) ) : '';
		if ( 'ok' === $msg ) {
			echo '<div class="notice notice-success inline"><p>Jeu de données importé. Le simulateur utilise désormais ces formules.</p></div>';
		} elseif ( 'reset' === $msg ) {
			echo '<div class="notice notice-success inline"><p>Données réinitialisées aux valeurs par défaut.</p></div>';
		} elseif ( 'nofile' === $msg ) {
			echo '<div class="notice notice-error inline"><p>Aucun fichier reçu.</p></div>';
		} elseif ( 'invalid' === $msg ) {
			$detail = isset( $_GET['dnai_cgm_detail'] ) ? sanitize_text_field( wp_unslash( $_GET['dnai_cgm_detail'] ) ) : '';
			echo '<div class="notice notice-error inline"><p>Import refusé : ' . esc_html( $detail ) . ' Les données précédentes sont conservées.</p></div>';
		}
		?>
		<p>Le simulateur utilise actuellement <strong><?php echo (int) $count; ?> formules</strong> —
		<strong><?php echo $ov ? 'jeu de données importé' : 'données par défaut (factices, pour le développement)'; ?></strong>.
		Les utilisateurs peuvent aussi télécharger les données depuis la page (boutons dans l'onglet « Comparaison »).</p>

		<p>
			<a class="button" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=dnai_cgm_export&fmt=csv' ), 'dnai_cgm_data' ) ); ?>">⤓ Télécharger les données (CSV / Excel)</a>
			<a class="button" href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=dnai_cgm_export&fmt=json' ), 'dnai_cgm_data' ) ); ?>">⤓ Télécharger (JSON)</a>
		</p>

		<h3>Remplacer les données</h3>
		<p class="description">Téléversez le classeur <strong>Excel <code>.xlsx</code></strong> (même structure que <code>CGM_Simulator_MVP.xlsx</code> : onglets <code>BDD_LIGNES</code> et <code>CGM SIMULATOR</code>), avec les vraies valeurs — il est converti automatiquement. Un fichier <strong>JSON</strong> au format de l'export ci-dessus est aussi accepté. Le contenu est validé avant remplacement ; en cas d'erreur, les données en place sont conservées.</p>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" enctype="multipart/form-data" style="margin:.6em 0">
			<input type="hidden" name="action" value="dnai_cgm_import">
			<?php wp_nonce_field( 'dnai_cgm_data' ); ?>
			<input type="file" name="datafile" accept=".xlsx,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required>
			<?php submit_button( 'Importer et remplacer', 'primary', 'submit', false ); ?>
		</form>

		<?php if ( $ov ) : ?>
		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" onsubmit="return confirm('Réinitialiser aux données par défaut ?');" style="margin:.4em 0">
			<input type="hidden" name="action" value="dnai_cgm_reset">
			<?php wp_nonce_field( 'dnai_cgm_data' ); ?>
			<?php submit_button( '↺ Réinitialiser aux données par défaut', 'secondary', 'submit', false ); ?>
		</form>
		<?php endif; ?>
	</div>
	<?php
}

/* -------------------------------------------------------------------------
 * 2b. Dataset import / export / reset (admin only)
 * ---------------------------------------------------------------------- */
add_action( 'admin_post_dnai_cgm_export', 'dnai_cgm_admin_export' );
add_action( 'admin_post_dnai_cgm_import', 'dnai_cgm_admin_import' );
add_action( 'admin_post_dnai_cgm_reset', 'dnai_cgm_admin_reset' );

function dnai_cgm_admin_export() {
	if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'forbidden' ); }
	check_admin_referer( 'dnai_cgm_data' );
	$d = dnai_cgm_current_dataset();
	if ( ! is_array( $d ) || empty( $d['products'] ) ) { wp_die( 'No dataset available.' ); }
	$fmt = isset( $_GET['fmt'] ) ? sanitize_text_field( wp_unslash( $_GET['fmt'] ) ) : 'json';

	if ( 'csv' === $fmt ) {
		nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename=cgm_formules.csv' );
		echo "\xEF\xBB\xBF"; // BOM for Excel
		$cols = array_keys( $d['products'][0] );
		$out  = fopen( 'php://output', 'w' );
		fputcsv( $out, $cols, ';' );
		foreach ( $d['products'] as $p ) {
			$row = array();
			foreach ( $cols as $c ) { $row[] = isset( $p[ $c ] ) ? $p[ $c ] : ''; }
			fputcsv( $out, $row, ';' );
		}
		fclose( $out );
		exit;
	}

	nocache_headers();
	header( 'Content-Type: application/json; charset=utf-8' );
	header( 'Content-Disposition: attachment; filename=cgm_data.json' );
	echo wp_json_encode( $d, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	exit;
}

function dnai_cgm_admin_import() {
	if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'forbidden' ); }
	check_admin_referer( 'dnai_cgm_data' );
	$back = admin_url( 'options-general.php?page=dnai-cgm' );

	if ( empty( $_FILES['datafile']['tmp_name'] ) || ! is_uploaded_file( $_FILES['datafile']['tmp_name'] ) ) {
		wp_safe_redirect( add_query_arg( 'dnai_cgm_msg', 'nofile', $back ) );
		exit;
	}
	$tmp   = $_FILES['datafile']['tmp_name'];
	$fname = isset( $_FILES['datafile']['name'] ) ? strtolower( (string) $_FILES['datafile']['name'] ) : '';
	$head  = (string) file_get_contents( $tmp, false, null, 0, 2 );
	$is_xlsx = ( '.xlsx' === substr( $fname, -5 ) ) || ( 'PK' === $head );

	if ( $is_xlsx ) {
		$d = dnai_cgm_xlsx_to_dataset( $tmp );
		if ( is_string( $d ) ) {
			wp_safe_redirect( add_query_arg( array( 'dnai_cgm_msg' => 'invalid', 'dnai_cgm_detail' => rawurlencode( $d ) ), $back ) );
			exit;
		}
	} else {
		$d = json_decode( (string) file_get_contents( $tmp ), true );
	}

	$err = dnai_cgm_validate_dataset( $d );
	if ( true !== $err ) {
		wp_safe_redirect( add_query_arg( array( 'dnai_cgm_msg' => 'invalid', 'dnai_cgm_detail' => rawurlencode( $err ) ), $back ) );
		exit;
	}
	update_option( 'dnai_cgm_dataset', $d );
	wp_safe_redirect( add_query_arg( 'dnai_cgm_msg', 'ok', $back ) );
	exit;
}

function dnai_cgm_admin_reset() {
	if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'forbidden' ); }
	check_admin_referer( 'dnai_cgm_data' );
	delete_option( 'dnai_cgm_dataset' );
	wp_safe_redirect( add_query_arg( 'dnai_cgm_msg', 'reset', admin_url( 'options-general.php?page=dnai-cgm' ) ) );
	exit;
}

/* -------------------------------------------------------------------------
 * 3. REST proxy — keeps the API key server-side, avoids CORS
 * ---------------------------------------------------------------------- */
function dnai_cgm_rest_nonce_ok( $request ) {
	return (bool) wp_verify_nonce( $request->get_header( 'X-WP-Nonce' ), 'wp_rest' );
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'dnai-cgm/v1', '/chat', array(
		'methods'             => 'POST',
		'callback'            => 'dnai_cgm_rest_chat',
		'permission_callback' => 'dnai_cgm_rest_nonce_ok',
	) );
} );

function dnai_cgm_rest_chat( WP_REST_Request $request ) {
	$base  = dnai_cgm_opt( 'base_url' );
	$path  = dnai_cgm_opt( 'api_path', '/api/chat/completions' );
	$key   = dnai_cgm_opt( 'api_key' );
	$model = dnai_cgm_opt( 'model', 'cgm-copilote' );
	$json  = dnai_cgm_opt( 'json_mode', '1' ) === '1';
	if ( ! $base || ! $key ) {
		return new WP_REST_Response( array( 'error' => 'Copilote non configuré. Renseignez l\'URL, la clé API et le modèle dans Réglages → D²nAI CGM.' ), 503 );
	}

	$message = trim( (string) $request->get_param( 'message' ) );
	$catalog = (string) $request->get_param( 'catalog' );
	$state   = (string) $request->get_param( 'state' );
	$history = $request->get_param( 'history' );
	if ( '' === $message ) {
		return new WP_REST_Response( array( 'error' => 'Message vide.' ), 400 );
	}

	// System prompt is optional: if the field is left empty, send no system
	// message and let the custom Open WebUI model carry the role (Option B).
	$messages = array();
	$saved = get_option( 'dnai_cgm_settings', null );
	$sys   = is_array( $saved ) && array_key_exists( 'system_prompt', $saved ) ? (string) $saved['system_prompt'] : dnai_cgm_default_prompt();
	if ( '' !== trim( $sys ) ) {
		$messages[] = array( 'role' => 'system', 'content' => $sys );
	}

	// Replay recent conversation turns (user / assistant only).
	if ( is_array( $history ) ) {
		foreach ( array_slice( $history, -4 ) as $turn ) {
			if ( ! is_array( $turn ) ) { continue; }
			$role = isset( $turn['role'] ) && 'assistant' === $turn['role'] ? 'assistant' : 'user';
			$content = isset( $turn['content'] ) ? (string) $turn['content'] : '';
			if ( '' !== $content ) {
				$messages[] = array( 'role' => $role, 'content' => mb_substr( $content, 0, 2000 ) );
			}
		}
	}

	$user = "CATALOGUE (choisis product_index parmi ces entiers) :\n" . $catalog .
		"\n\nÉTAT ACTUEL du simulateur :\n" . $state .
		"\n\nDEMANDE du commercial :\n" . $message;
	$messages[] = array( 'role' => 'user', 'content' => $user );

	$payload = array(
		'model'       => $model,
		'messages'    => $messages,
		'stream'      => false,
		'temperature' => 0.1,
		'max_tokens'  => 350,
	);
	if ( $json ) {
		$payload['response_format'] = array( 'type' => 'json_object' );
	}

	$resp = wp_remote_post( rtrim( $base, '/' ) . $path, array(
		'timeout' => max( 15, min( 300, (int) dnai_cgm_opt( 'timeout', 60 ) ) ),
		'headers' => array(
			'Authorization' => 'Bearer ' . $key,
			'Content-Type'  => 'application/json',
		),
		'body'    => wp_json_encode( $payload ),
	) );

	if ( is_wp_error( $resp ) ) {
		return new WP_REST_Response( array( 'error' => 'AI Lab injoignable : ' . $resp->get_error_message() ), 502 );
	}
	$code = wp_remote_retrieve_response_code( $resp );
	$raw  = wp_remote_retrieve_body( $resp );
	$body = json_decode( $raw, true );
	$content = dnai_cgm_extract_content( $body );

	if ( $code >= 400 || '' === $content ) {
		if ( isset( $body['error']['message'] ) ) {
			$msg = $body['error']['message'];
		} elseif ( isset( $body['error'] ) && is_string( $body['error'] ) ) {
			$msg = $body['error'];
		} elseif ( isset( $body['detail'] ) ) {
			$msg = is_string( $body['detail'] ) ? $body['detail'] : wp_json_encode( $body['detail'] );
		} else {
			$msg = 'HTTP ' . $code . ' sans contenu exploitable. Réponse brute : ' . mb_substr( trim( wp_strip_all_tags( (string) $raw ) ), 0, 300 );
		}
		return new WP_REST_Response( array( 'error' => $msg ), 502 );
	}

	return new WP_REST_Response( array( 'reply' => $content ), 200 );
}

/* Extract assistant text from an OpenAI / Open WebUI response. Strips GPT-OSS
   "harmony" channels so a JSON action survives even on a fallback model. */
function dnai_cgm_extract_content( $body ) {
	if ( ! is_array( $body ) ) {
		return '';
	}
	$choice = isset( $body['choices'][0] ) ? $body['choices'][0] : null;
	$c = isset( $choice['message']['content'] ) ? $choice['message']['content'] : null;
	if ( is_array( $c ) ) {
		$parts = array();
		foreach ( $c as $p ) {
			if ( is_string( $p ) ) { $parts[] = $p; }
			elseif ( is_array( $p ) && isset( $p['text'] ) ) { $parts[] = $p['text']; }
		}
		$c = implode( "\n", $parts );
	}
	$c = is_string( $c ) ? trim( $c ) : '';
	if ( '' === $c && isset( $choice['text'] ) ) {
		$c = trim( (string) $choice['text'] );
	}
	if ( '' === $c && isset( $body['message']['content'] ) && is_string( $body['message']['content'] ) ) {
		$c = trim( $body['message']['content'] );
	}
	if ( false !== stripos( $c, 'assistantfinal' ) ) {
		$parts = preg_split( '/assistantfinal/i', $c );
		$c = trim( end( $parts ) );
	}
	$c = preg_replace( '/<\|[^|>]*\|>/', '', $c );
	return trim( (string) $c );
}

/* -------------------------------------------------------------------------
 * 4. Assets
 * ---------------------------------------------------------------------- */
add_action( 'wp_enqueue_scripts', function () {
	wp_register_style( 'dnai-cgm-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cormorant+Garamond:wght@500;600;700&display=swap', array(), null );
	wp_register_style( 'dnai-cgm', DNAI_CGM_URL . 'assets/dnai-cgm.css', array( 'dnai-cgm-fonts' ), DNAI_CGM_VER );
	wp_register_script( 'dnai-cgm', DNAI_CGM_URL . 'assets/dnai-cgm.js', array(), DNAI_CGM_VER, true );
	wp_localize_script( 'dnai-cgm', 'DNAI_CGM', array(
		'rest'  => esc_url_raw( rest_url( 'dnai-cgm/v1' ) ),
		'nonce' => wp_create_nonce( 'wp_rest' ),
		'data'  => dnai_cgm_override(),
	) );
} );

/* -------------------------------------------------------------------------
 * 5. Shortcode  [dnai_cgm]
 * ---------------------------------------------------------------------- */
function dnai_cgm_shortcode( $atts ) {
	wp_enqueue_style( 'dnai-cgm' );
	wp_enqueue_script( 'dnai-cgm' );
	ob_start(); ?>
	<div class="dnai-cgm-app">
	<div class="cgm-viewbar">
	  <button type="button" class="cgm-vbtn on" data-view="sales">Vue commerciale</button>
	  <button type="button" class="cgm-vbtn" data-view="exec">Vue direction</button>
	</div>

	<div id="cgmSales" class="cgm-view">
	<div class="page">

	  <div class="head">
	    <div class="logo"><span>D<sup>2</sup>n</span></div>
	    <div>
	      <div class="t1">OCP Nutricrops · Data, Digital &amp; AI</div>
	      <div class="t2">CGM Simulator</div>
	    </div>
	    <div class="spacer"></div>
	    <div class="badge-real">141 formules · moteur de marge vérifié</div>
	  </div>

	  <div class="hero">
	    <div class="kicker">Simulateur de marge commerciale · Sales</div>
	    <h1>Quel <em>scénario de prix</em> maximise la marge ?</h1>
	    <p>Choisissez un produit et une ligne, ajustez les prix matières premières, et comparez en direct les 3 méthodes de pricing (prix fixe, prix plancher iso-marge, prix valeur-nutriments) — coût MP, CGM équivalent DAP/TSP et MCV par tonne d'acide P₂O₅. Le copilote IA pilote le simulateur ; tous les chiffres viennent du moteur.</p>
	  </div>

	  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
	    <button type="button" class="btn ghost" id="cgmDlCsv">⤓ Exporter les données (CSV / Excel)</button>
	    <button type="button" class="btn ghost" id="cgmDlJson">⤓ Exporter (JSON)</button>
	  </div>

	  <!-- COPILOT -->
	  <div class="panel">
	    <h2>Copilote CGM <span class="badge-real" style="margin-left:4px">IA</span></h2>
	    <div class="sub">Posez votre question en langage naturel — l'IA règle le simulateur et répond avec les chiffres calculés par le moteur.</div>
	    <div class="cgm-chat">
	      <div class="cgm-chips">
	        <span class="cgm-chip">Analyse le 00-18-10 à 720 $/t</span>
	        <span class="cgm-chip">Quel est le prix plancher pour préserver la marge DAP ?</span>
	        <span class="cgm-chip">Si le soufre passe à 150, qu'arrive-t-il à la marge ?</span>
	        <span class="cgm-chip">Quelles formules créent le plus de valeur ?</span>
	      </div>
	      <div class="cgm-log" id="cgmChatLog"></div>
	      <form class="cgm-form" id="cgmChatForm">
	        <input id="cgmChatInput" type="text" placeholder="Ex. Compare le DAP Black et le 00-18-10 au prix valeur-nutriments…" autocomplete="off">
	        <button type="submit">Envoyer</button>
	      </form>
	    </div>
	  </div>

	  <!-- INPUTS -->
	  <div class="panel">
	    <h2>Paramètres</h2>
	    <div class="sub">Cellules de saisie — tout se recalcule instantanément.</div>
	    <div class="inputs">
	      <div class="fld wide">
	        <label>Produit × ligne</label>
	        <select id="prod"></select>
	      </div>
	      <div class="fld">
	        <label>Référence</label>
	        <div class="seg" id="ref">
	          <button data-r="DAP">DAP</button>
	          <button data-r="TSP">TSP</button>
	        </div>
	      </div>
	      <div class="fld">
	        <label>Prix de vente ($/t)</label>
	        <input id="price" type="number" step="1">
	      </div>
	    </div>

	    <div class="rm-toggle" id="rmToggle">▸ Prix matières premières &amp; références</div>
	    <div class="rm-grid" id="rmGrid">
	      <div class="fld"><label>Rock</label><input data-rm="rock" type="number" step="1"></div>
	      <div class="fld"><label>NH3</label><input data-rm="nh3" type="number" step="1"></div>
	      <div class="fld"><label>Soufre</label><input data-rm="sulphur" type="number" step="1"></div>
	      <div class="fld"><label>KCl</label><input data-rm="kcl" type="number" step="1"></div>
	      <div class="fld"><label>SAM</label><input data-rm="sam" type="number" step="1"></div>
	      <div class="fld"><label>ACS</label><input data-rm="acs" type="number" step="1"></div>
	      <div class="fld"><label>Borax</label><input data-rm="borax" type="number" step="1"></div>
	      <div class="fld"><label>ZnO</label><input data-rm="zno" type="number" step="1"></div>
	      <div class="fld"><label>CuSO4</label><input data-rm="cuso4" type="number" step="1"></div>
	      <div class="fld"><label>CaSO4</label><input data-rm="caso4" type="number" step="1"></div>
	      <div class="fld"><label>CaCO3</label><input data-rm="caco3" type="number" step="1"></div>
	      <div class="fld"><label>Gypse</label><input data-rm="gypse" type="number" step="1"></div>
	      <div class="fld"><label>Prix réf. DAP</label><input data-ref="dap" type="number" step="1"></div>
	      <div class="fld"><label>Prix réf. TSP</label><input data-ref="tsp" type="number" step="1"></div>
	      <div class="fld"><label>Sensi. NH3 %</label><input data-sens="nh3" type="number" step="1"></div>
	      <div class="fld"><label>Sensi. Soufre %</label><input data-sens="sulphur" type="number" step="1"></div>
	    </div>
	  </div>

	  <div class="cgm-tabnav">
	    <button type="button" class="cgm-tabbtn on" data-tab="scen">Scénarios</button>
	    <button type="button" class="cgm-tabbtn" data-tab="sensi">Sensibilité</button>
	    <button type="button" class="cgm-tabbtn" data-tab="cmp">Comparaison</button>
	    <button type="button" class="cgm-tabbtn" data-tab="hist">Historique</button>
	  </div>

	  <div class="cgm-tab" data-tab="scen">
	  <!-- SCENARIOS -->
	  <div class="panel">
	    <h2 id="scenTitle">Scénarios de pricing</h2>
	    <div class="sub" id="scenSub"></div>
	    <div class="scen-grid" id="scens"></div>
	    <div class="verdict" id="verdict"></div>
	  </div>

	  </div><!-- /tab scen -->

	  <div class="cgm-tab" data-tab="sensi" hidden>
	  <!-- SENSITIVITY -->
	  <div class="panel">
	    <h2>Sensibilité aux prix matières premières</h2>
	    <div class="sub">Impact d'une variation NH3 / Soufre sur le coût MP et la marge — driver principal mis en avant.</div>
	    <div class="sensi-wrap">
	      <div class="sensi-kpis" id="sensiKpis"></div>
	      <div>
	        <div id="tornado"></div>
	        <div class="driver" id="driverNote"></div>
	      </div>
	    </div>
	  </div>

	  </div><!-- /tab sensi -->

	  <div class="cgm-tab" data-tab="cmp" hidden>
	  <!-- COMPARISON -->
	  <div class="panel">
	    <h2>Comparaison des formules</h2>
	    <div class="sub">Toutes les formules au prix valeur-nutriments (Sc2), classées par CGM équivalent — <span style="color:var(--ok);font-weight:600">vert = créateur de valeur</span>, <span style="color:var(--bad);font-weight:600">rouge = sous-pricé</span> vs la marge de référence.</div>
	    <div id="bars" style="margin-bottom:14px"></div>
	    <div class="tbl-wrap"><div class="tbl-scroll">
	      <table id="cmpTbl"><thead><tr>
	        <th>Produit</th><th>Ligne</th><th>Coût MP</th><th>Prix planch. (Sc1)</th><th>Prix nutri. (Sc2)</th><th>CGM Eq (Sc2)</th><th>MCV/t P₂O₅</th>
	      </tr></thead><tbody></tbody></table>
	    </div></div>
	  </div>

	  </div><!-- /tab cmp -->

	  <div class="cgm-tab" data-tab="hist" hidden>
	  <!-- HISTORY -->
	  <div class="panel">
	    <div class="hist-head">
	      <h2 style="margin:0">Historique des simulations</h2>
	      <div style="display:flex;gap:8px">
	        <button class="btn" id="saveBtn">＋ Enregistrer cette simulation</button>
	        <button class="btn ghost" id="csvBtn">Exporter CSV</button>
	        <button class="btn ghost" id="clearBtn">Effacer</button>
	      </div>
	    </div>
	    <div id="histList"></div>
	  </div>

	  </div><!-- /tab hist -->

	  <div class="foot">
	    <div>D²nAI · OCP Nutricrops · CGM Simulator — prix matières premières modifiables</div>
	    <div class="mini">Feed the data to feed the decision.</div>
	  </div>

	</div>
	</div><!-- /#cgmSales -->

	<div id="cgmExec" class="cgm-view" hidden>
	<div class="page">

	  <div class="head">
	    <div class="logo"><span>D<sup>2</sup>n</span></div>
	    <div>
	      <div class="t1">OCP Nutricrops · Data, Digital &amp; AI</div>
	      <div class="t2">CGM · Vision exécutive</div>
	    </div>
	    <div class="spacer"></div>
	    <div class="badge-real">Vue direction · synthèse décision</div>
	  </div>

	  <div class="pick">
	    <label>Produit</label>
	    <select id="xprod"></select>
	    <span class="refpill" id="xrefpill" title="Basculer la référence">Réf. —</span>
	  </div>

	  <!-- HERO VERDICT -->
	  <div class="hero"><div class="inner">
	    <div class="status ok" id="xstatus">—</div>
	    <div class="big" id="xbigval">—<span class="u">$/t</span></div>
	    <div class="cap" id="xbigcap">marge commerciale équivalente</div>
	    <div class="say" id="xsay"></div>
	  </div></div>

	  <!-- PRICE TILES -->
	  <div class="tiles">
	    <div class="tile">
	      <div class="rl">Prix plancher</div>
	      <div class="rv" id="xtFloor">—<span class="u">$/t</span></div>
	      <div class="rd">Ne jamais vendre en-dessous : en-deçà, on détruit la marge de référence.</div>
	    </div>
	    <div class="tile reco">
	      <div class="pin">Recommandé</div>
	      <div class="rl">Prix « juste valeur »</div>
	      <div class="rv" id="xtNutri">—<span class="u">$/t</span></div>
	      <div class="rd">Prix équivalent à la valeur nutritive (N+P+K+S) vs la référence.</div>
	    </div>
	    <div class="tile">
	      <div class="rl">Votre prix cible</div>
	      <input id="xtTarget" type="number" step="1">
	      <div class="rd" id="xtargetNote">Testez un prix de marché.</div>
	    </div>
	  </div>

	  <!-- VALUE POSITION -->
	  <div class="panel">
	    <h3>Positionnement de la marge</h3>
	    <div class="ps" id="xgaugeSub">Marge de cette formule au prix cible, comparée à la marge de référence.</div>
	    <div id="xgauge"></div>
	  </div>

	  <!-- TOP OPPORTUNITIES -->
	  <div class="panel">
	    <h3>Où se crée le plus de valeur</h3>
	    <div class="ps">Top des formules à la « juste valeur », classées par marge équivalente — les leviers de mix produit les plus rentables.</div>
	    <div id="xopps"></div>
	  </div>

	  <!-- HYPOTHESES -->
	  <details class="hyp">
	    <summary>⚙︎ Hypothèses prix matières premières</summary>
	    <div class="row">
	      <div class="fld"><label>Roche ($/t)</label><input data-xrm="rock" type="number"></div>
	      <div class="fld"><label>NH3 ($/t)</label><input data-xrm="nh3" type="number"></div>
	      <div class="fld"><label>Soufre ($/t)</label><input data-xrm="sulphur" type="number"></div>
	      <div class="fld"><label>Réf. DAP ($/t)</label><input data-xref="dap" type="number"></div>
	      <div class="fld"><label>Réf. TSP ($/t)</label><input data-xref="tsp" type="number"></div>
	    </div>
	  </details>

	  <div class="foot">
	    <div>D²nAI · OCP Nutricrops · CGM · Vision exécutive</div>
	    <div class="mini">Feed the data to feed the decision.</div>
	  </div>

	</div>
	</div><!-- /#cgmExec -->
	</div>
	<?php return ob_get_clean();
}
add_shortcode( 'dnai_cgm', 'dnai_cgm_shortcode' );
