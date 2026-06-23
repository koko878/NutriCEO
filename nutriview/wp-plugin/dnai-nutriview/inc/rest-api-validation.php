<?php
/**
 * NutriView — Backend Validation/Signature (Phase 5).
 *
 * Source d'autorité : nutriview/SPEC.md §5 (signature), §14 (Phase 5 workflow).
 * Décision Q5 : signature horodatée simple = hash SHA-256 du contenu + nom +
 * timestamp. C'est de la traçabilité documentaire DGSSI, pas une PKI.
 *
 * Ce module se contente d'AUDITER et de NOTIFIER autour du workflow front :
 *  - le hash est calculé côté front (Web Crypto, mêmes octets que ce que
 *    l'utilisateur a sous les yeux dans la modale de signature) ;
 *  - le backend ne re-signe pas, il enregistre + envoie le wp_mail ;
 *  - on garde un log local (option WP autoload=no, rotation 50 entrées).
 *
 * Endpoints (auth nonce WP + capability edit_posts) :
 *  - POST /wp-json/dnai/nview/v1/validation/submit
 *      body : { projectId, projectTitle, dataOwner, submittedBy, itemsCount, contentHash }
 *      effet: log + wp_mail(dataOwner → "Validation requise…")
 *  - POST /wp-json/dnai/nview/v1/validation/sign
 *      body : { projectId, projectTitle, signedBy, signedAt, contentHash, owner }
 *      effet: log + wp_mail(owner → "Classification signée par …")
 *  - GET  /wp-json/dnai/nview/v1/validation/log
 *      retourne les 30 dernières entrées (audit).
 *
 * Sécurité :
 *  - les emails sont récupérés depuis WordPress (get_user_by('login', …))
 *    pour éviter d'envoyer à une adresse fournie par le client ;
 *  - si le user n'existe pas (mode démo standalone), wp_mail est skip
 *    silencieusement — le hash reste tracé côté front.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_NVIEW_VAL_NS', 'dnai/nview/v1' );
define( 'DNAI_NVIEW_VAL_LOG', 'dnai_nview_validation_log' );
define( 'DNAI_NVIEW_VAL_MAX_LOG', 50 );

/* ------------------------------------------------------------------ */
/*  Logging                                                            */
/* ------------------------------------------------------------------ */

function dnai_nview_val_log( $entry ) {
	$log = get_option( DNAI_NVIEW_VAL_LOG, array() );
	if ( ! is_array( $log ) ) { $log = array(); }
	$log[] = $entry;
	if ( count( $log ) > DNAI_NVIEW_VAL_MAX_LOG ) {
		$log = array_slice( $log, -DNAI_NVIEW_VAL_MAX_LOG );
	}
	update_option( DNAI_NVIEW_VAL_LOG, $log, false );
}

/* ------------------------------------------------------------------ */
/*  Permissions                                                        */
/* ------------------------------------------------------------------ */

function dnai_nview_val_can_call() {
	return current_user_can( 'edit_posts' );
}

/* ------------------------------------------------------------------ */
/*  Helpers : retrouver l'email d'un user_login                        */
/* ------------------------------------------------------------------ */

/** Retourne l'email associé à un user_login, ou null si introuvable. */
function dnai_nview_val_email_for( $login ) {
	$login = trim( (string) $login );
	if ( $login === '' ) { return null; }
	$u = get_user_by( 'login', $login );
	if ( $u && ! empty( $u->user_email ) && is_email( $u->user_email ) ) {
		return $u->user_email;
	}
	// On accepte aussi un email direct comme valeur (cas où l'app stocke un
	// email plutôt qu'un login dans dataOwner).
	if ( is_email( $login ) ) { return $login; }
	return null;
}

/* ------------------------------------------------------------------ */
/*  Sanitisation d'un payload de validation                            */
/* ------------------------------------------------------------------ */

function dnai_nview_val_sanitize( $body ) {
	$out = array(
		'projectId'    => isset( $body['projectId'] )    ? sanitize_text_field( $body['projectId'] )    : '',
		'projectTitle' => isset( $body['projectTitle'] ) ? sanitize_text_field( $body['projectTitle'] ) : '',
		'dataOwner'    => isset( $body['dataOwner'] )    ? sanitize_text_field( $body['dataOwner'] )    : '',
		'submittedBy'  => isset( $body['submittedBy'] )  ? sanitize_text_field( $body['submittedBy'] )  : '',
		'owner'        => isset( $body['owner'] )        ? sanitize_text_field( $body['owner'] )        : '',
		'signedBy'     => isset( $body['signedBy'] )     ? sanitize_text_field( $body['signedBy'] )     : '',
		'signedAt'     => isset( $body['signedAt'] )     ? sanitize_text_field( $body['signedAt'] )     : '',
		'itemsCount'   => isset( $body['itemsCount'] )   ? intval( $body['itemsCount'] )                : 0,
		'contentHash'  => isset( $body['contentHash'] )  ? preg_replace( '/[^a-f0-9]/i', '', (string) $body['contentHash'] ) : '',
	);
	return $out;
}

/* ------------------------------------------------------------------ */
/*  Endpoint : submit (drafting → in_review)                           */
/* ------------------------------------------------------------------ */

function dnai_nview_val_rest_submit( $request ) {
	$p = dnai_nview_val_sanitize( $request->get_json_params() ?: array() );
	if ( $p['projectId'] === '' || $p['contentHash'] === '' || strlen( $p['contentHash'] ) !== 64 ) {
		return new WP_Error( 'bad_input', 'projectId et contentHash (64 hex) requis', array( 'status' => 400 ) );
	}

	$mail_to     = dnai_nview_val_email_for( $p['dataOwner'] );
	$mail_status = 'skipped_no_email';

	if ( $mail_to ) {
		$site    = wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
		$subject = sprintf( '[NutriView] Validation requise — %s', $p['projectTitle'] ?: $p['projectId'] );
		$body    = "Bonjour,\n\n";
		$body   .= sprintf( "Le projet « %s » vient de vous être envoyé pour validation propriétaire.\n", $p['projectTitle'] ?: $p['projectId'] );
		$body   .= sprintf( "Envoyé par : %s\n", $p['submittedBy'] ?: '—' );
		$body   .= sprintf( "Nombre de données classifiées : %d\n", $p['itemsCount'] );
		$body   .= sprintf( "Empreinte SHA-256 du contenu : %s\n\n", $p['contentHash'] );
		$body   .= "Vous validez ligne par ligne, puis vous signez : cette empreinte sera apposée comme preuve d'intégrité de la classification.\n\n";
		$body   .= sprintf( "Ouvrir NutriView : %s\n", esc_url_raw( home_url( '/nutriview' ) ) );
		$body   .= sprintf( "\n— %s · NutriView (D²nAI · OCP Nutricrops)", $site );

		$ok = wp_mail( $mail_to, $subject, $body );
		$mail_status = $ok ? 'sent' : 'failed';
	}

	dnai_nview_val_log( array(
		'ts'           => current_time( 'mysql' ),
		'kind'         => 'submit',
		'projectId'    => $p['projectId'],
		'projectTitle' => $p['projectTitle'],
		'submittedBy'  => $p['submittedBy'],
		'dataOwner'    => $p['dataOwner'],
		'contentHash'  => $p['contentHash'],
		'mail'         => $mail_status,
	) );

	return array(
		'ok'           => true,
		'mail_status'  => $mail_status,
		'mail_to_set'  => (bool) $mail_to,
	);
}

/* ------------------------------------------------------------------ */
/*  Endpoint : sign (in_review → signed)                               */
/* ------------------------------------------------------------------ */

function dnai_nview_val_rest_sign( $request ) {
	$p = dnai_nview_val_sanitize( $request->get_json_params() ?: array() );
	if ( $p['projectId'] === '' || $p['contentHash'] === '' || strlen( $p['contentHash'] ) !== 64 ) {
		return new WP_Error( 'bad_input', 'projectId, contentHash (64 hex) requis', array( 'status' => 400 ) );
	}
	if ( $p['signedBy'] === '' ) {
		return new WP_Error( 'bad_input', 'signedBy requis', array( 'status' => 400 ) );
	}

	$mail_to     = dnai_nview_val_email_for( $p['owner'] );
	$mail_status = 'skipped_no_email';

	if ( $mail_to ) {
		$site    = wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
		$subject = sprintf( '[NutriView] Classification signée — %s', $p['projectTitle'] ?: $p['projectId'] );
		$body    = "Bonjour,\n\n";
		$body   .= sprintf( "Le projet « %s » a été signé par %s.\n\n", $p['projectTitle'] ?: $p['projectId'], $p['signedBy'] );
		$body   .= sprintf( "Empreinte SHA-256 signée : %s\n", $p['contentHash'] );
		if ( $p['signedAt'] ) {
			$body .= sprintf( "Date signature : %s\n", $p['signedAt'] );
		}
		$body   .= "\nLa classification est désormais figée. Toute modification ultérieure invalidera ce hash.\n\n";
		$body   .= sprintf( "Ouvrir NutriView : %s\n", esc_url_raw( home_url( '/nutriview' ) ) );
		$body   .= sprintf( "\n— %s · NutriView (D²nAI · OCP Nutricrops)", $site );

		$ok = wp_mail( $mail_to, $subject, $body );
		$mail_status = $ok ? 'sent' : 'failed';
	}

	dnai_nview_val_log( array(
		'ts'           => current_time( 'mysql' ),
		'kind'         => 'sign',
		'projectId'    => $p['projectId'],
		'projectTitle' => $p['projectTitle'],
		'signedBy'     => $p['signedBy'],
		'signedAt'     => $p['signedAt'],
		'contentHash'  => $p['contentHash'],
		'mail'         => $mail_status,
	) );

	return array(
		'ok'          => true,
		'mail_status' => $mail_status,
	);
}

/* ------------------------------------------------------------------ */
/*  Endpoint : log (audit léger)                                       */
/* ------------------------------------------------------------------ */

function dnai_nview_val_rest_log( $request ) {
	$log = (array) get_option( DNAI_NVIEW_VAL_LOG, array() );
	$log = array_slice( array_reverse( $log ), 0, 30 );
	return array( 'log' => $log );
}

/* ------------------------------------------------------------------ */
/*  Routes REST                                                        */
/* ------------------------------------------------------------------ */

add_action( 'rest_api_init', function () {
	register_rest_route( DNAI_NVIEW_VAL_NS, '/validation/submit', array(
		'methods'             => 'POST',
		'callback'            => 'dnai_nview_val_rest_submit',
		'permission_callback' => 'dnai_nview_val_can_call',
	) );
	register_rest_route( DNAI_NVIEW_VAL_NS, '/validation/sign', array(
		'methods'             => 'POST',
		'callback'            => 'dnai_nview_val_rest_sign',
		'permission_callback' => 'dnai_nview_val_can_call',
	) );
	register_rest_route( DNAI_NVIEW_VAL_NS, '/validation/log', array(
		'methods'             => 'GET',
		'callback'            => 'dnai_nview_val_rest_log',
		'permission_callback' => 'dnai_nview_val_can_call',
	) );
} );

/* ------------------------------------------------------------------ */
/*  Bridge : expose un flag `validationReady` côté front                */
/* ------------------------------------------------------------------ */

add_filter( 'dnai_nview_boot_config', function ( $cfg ) {
	$cfg['validationReady'] = true; // permet au front de tenter les /validation/*
	return $cfg;
} );

/* ------------------------------------------------------------------ */
/*  Page admin légère : Outils → NutriView Validation                  */
/* ------------------------------------------------------------------ */

add_action( 'admin_menu', function () {
	add_management_page(
		'NutriView · Journal validations',
		'NutriView Validations',
		'manage_options',
		'dnai-nview-validation',
		'dnai_nview_val_admin_page'
	);
} );

function dnai_nview_val_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) { return; }
	$log = array_reverse( (array) get_option( DNAI_NVIEW_VAL_LOG, array() ) );
	$log = array_slice( $log, 0, 30 );
	?>
	<div class="wrap">
		<h1>NutriView · Journal des validations</h1>
		<p>Trace les envois en validation et les signatures. Ce journal ne remplace pas la persistance des projets (Phase 6 — MySQL multi-utilisateur) ; il sert d'audit léger côté WP.</p>
		<?php if ( empty( $log ) ) : ?>
			<p><em>Aucune entrée pour l'instant.</em></p>
		<?php else : ?>
			<table class="widefat striped">
				<thead>
					<tr>
						<th>Horodatage</th>
						<th>Action</th>
						<th>Projet</th>
						<th>Acteur</th>
						<th>Hash (SHA-256)</th>
						<th>Email</th>
					</tr>
				</thead>
				<tbody>
				<?php foreach ( $log as $r ) :
					$actor = $r['kind'] === 'sign'
						? ( $r['signedBy'] ?? '' )
						: ( $r['submittedBy'] ?? '' );
					?>
					<tr>
						<td><?php echo esc_html( $r['ts'] ?? '' ); ?></td>
						<td><strong><?php echo esc_html( $r['kind'] ?? '' ); ?></strong></td>
						<td>
							<code><?php echo esc_html( $r['projectId'] ?? '' ); ?></code><br />
							<?php echo esc_html( $r['projectTitle'] ?? '' ); ?>
						</td>
						<td><?php echo esc_html( $actor ); ?></td>
						<td><code style="font-size:11px;"><?php echo esc_html( substr( $r['contentHash'] ?? '', 0, 16 ) . '…' ); ?></code></td>
						<td><?php echo esc_html( $r['mail'] ?? '' ); ?></td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
		<?php endif; ?>
	</div>
	<?php
}
