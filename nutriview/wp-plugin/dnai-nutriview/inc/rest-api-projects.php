<?php
/**
 * NutriView — Persistance serveur des projets (phase 1).
 *
 * Débloque le multi-utilisateurs : les classifications ne vivent plus dans le
 * localStorage d'un navigateur mais dans une table MySQL partagée. Le workflow
 * multi-propriétaires (un owner sur SA machine voit les projets en revue qui
 * touchent son périmètre) devient réel.
 *
 * Table : {prefix}dnai_nview_projects — 1 ligne par projet, JSON complet dans
 * `data` + quelques colonnes miroir pour l'audit/tri.
 *
 * Endpoints (auth nonce WP same-origin) :
 *   GET    /wp-json/dnai/nview/v1/projects        (lecture : connecté)        → [Project]
 *   PUT    /wp-json/dnai/nview/v1/projects/{id}   (écriture : edit_posts)     → { ok, project }
 *   DELETE /wp-json/dnai/nview/v1/projects/{id}   (écriture : edit_posts)     → { ok }
 *
 * Modèle de cohérence v1 : last-write-wins par projet (chaque mutation front
 * pousse le projet entier). Suffisant pour le PoV ; verrouillage optimiste
 * (updated_at) = amélioration ultérieure.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

if ( ! defined( 'DNAI_NVIEW_PROJ_NS' ) ) {
	define( 'DNAI_NVIEW_PROJ_NS', 'dnai/nview/v1' );
}
define( 'DNAI_NVIEW_PROJ_DB_VER', '1' );
define( 'DNAI_NVIEW_PROJ_DB_OPT', 'dnai_nview_projects_db_ver' );
define( 'DNAI_NVIEW_PROJ_MAX_BYTES', 1024 * 1024 ); // 1 Mo / projet

/** Nom complet de la table. */
function dnai_nview_proj_table() {
	global $wpdb;
	return $wpdb->prefix . 'dnai_nview_projects';
}

/** Création / migration de la table (idempotent, via dbDelta). */
function dnai_nview_proj_install() {
	if ( get_option( DNAI_NVIEW_PROJ_DB_OPT ) === DNAI_NVIEW_PROJ_DB_VER ) {
		return;
	}
	global $wpdb;
	$table   = dnai_nview_proj_table();
	$charset = $wpdb->get_charset_collate();
	$sql = "CREATE TABLE {$table} (
		id varchar(64) NOT NULL,
		title text NULL,
		status varchar(32) NULL,
		owner varchar(190) NULL,
		data_owner varchar(190) NULL,
		data longtext NOT NULL,
		updated_by varchar(190) NULL,
		updated_at datetime NOT NULL,
		PRIMARY KEY  (id),
		KEY status_idx (status),
		KEY data_owner_idx (data_owner)
	) {$charset};";
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	dbDelta( $sql );
	update_option( DNAI_NVIEW_PROJ_DB_OPT, DNAI_NVIEW_PROJ_DB_VER, false );
}
add_action( 'init', 'dnai_nview_proj_install' );

/* ------------------------------------------------------------------ */
/*  Permissions                                                         */
/* ------------------------------------------------------------------ */
function dnai_nview_proj_can_read() {
	return is_user_logged_in();
}
function dnai_nview_proj_can_write() {
	return current_user_can( 'edit_posts' );
}

/* ------------------------------------------------------------------ */
/*  Callbacks REST                                                      */
/* ------------------------------------------------------------------ */

/** GET /projects → tous les projets (JSON décodé). */
function dnai_nview_proj_list() {
	global $wpdb;
	$table = dnai_nview_proj_table();
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery
	$rows = $wpdb->get_col( "SELECT data FROM {$table} ORDER BY updated_at DESC" );
	$out  = array();
	foreach ( (array) $rows as $r ) {
		$p = json_decode( $r, true );
		if ( is_array( $p ) && ! empty( $p['id'] ) ) {
			$out[] = $p;
		}
	}
	return rest_ensure_response( $out );
}

/** PUT /projects/{id} → upsert d'un projet complet. */
function dnai_nview_proj_put( $request ) {
	$id   = sanitize_text_field( (string) $request['id'] );
	$body = $request->get_json_params();
	// Le front envoie { project: {...} } ou directement le projet.
	$p = isset( $body['project'] ) && is_array( $body['project'] ) ? $body['project'] : $body;

	if ( ! is_array( $p ) || empty( $p['id'] ) ) {
		return new WP_Error( 'bad_project', 'Projet invalide (id manquant).', array( 'status' => 400 ) );
	}
	if ( sanitize_text_field( (string) $p['id'] ) !== $id ) {
		return new WP_Error( 'id_mismatch', 'id de route ≠ id du projet.', array( 'status' => 400 ) );
	}

	$json = wp_json_encode( $p );
	if ( ! is_string( $json ) ) {
		return new WP_Error( 'encode', 'Encodage JSON impossible.', array( 'status' => 400 ) );
	}
	if ( strlen( $json ) > DNAI_NVIEW_PROJ_MAX_BYTES ) {
		return new WP_Error( 'too_large', 'Projet trop volumineux.', array( 'status' => 413 ) );
	}

	$user = wp_get_current_user();
	global $wpdb;
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery
	$wpdb->replace(
		dnai_nview_proj_table(),
		array(
			'id'         => $id,
			'title'      => isset( $p['title'] ) ? sanitize_text_field( (string) $p['title'] ) : '',
			'status'     => isset( $p['status'] ) ? sanitize_text_field( (string) $p['status'] ) : '',
			'owner'      => isset( $p['owner'] ) ? sanitize_text_field( (string) $p['owner'] ) : '',
			'data_owner' => isset( $p['dataOwner'] ) ? sanitize_text_field( (string) $p['dataOwner'] ) : '',
			'data'       => $json,
			'updated_by' => $user && $user->ID ? sanitize_user( $user->user_login ) : '',
			'updated_at' => current_time( 'mysql' ),
		),
		array( '%s', '%s', '%s', '%s', '%s', '%s', '%s', '%s' )
	);
	return rest_ensure_response( array( 'ok' => true, 'project' => $p ) );
}

/** DELETE /projects/{id}. */
function dnai_nview_proj_delete( $request ) {
	$id = sanitize_text_field( (string) $request['id'] );
	global $wpdb;
	// phpcs:ignore WordPress.DB.DirectDatabaseQuery
	$wpdb->delete( dnai_nview_proj_table(), array( 'id' => $id ), array( '%s' ) );
	return rest_ensure_response( array( 'ok' => true ) );
}

add_action( 'rest_api_init', function () {
	register_rest_route( DNAI_NVIEW_PROJ_NS, '/projects', array(
		'methods'             => 'GET',
		'callback'            => 'dnai_nview_proj_list',
		'permission_callback' => 'dnai_nview_proj_can_read',
	) );
	register_rest_route( DNAI_NVIEW_PROJ_NS, '/projects/(?P<id>[A-Za-z0-9_\-]+)', array(
		array(
			'methods'             => 'PUT',
			'callback'            => 'dnai_nview_proj_put',
			'permission_callback' => 'dnai_nview_proj_can_write',
		),
		array(
			'methods'             => 'DELETE',
			'callback'            => 'dnai_nview_proj_delete',
			'permission_callback' => 'dnai_nview_proj_can_write',
		),
	) );
} );

/* Flag front : la persistance serveur des projets est disponible. */
add_filter( 'dnai_nview_boot_config', function ( $cfg ) {
	$cfg['projectsReady'] = true;
	return $cfg;
} );
