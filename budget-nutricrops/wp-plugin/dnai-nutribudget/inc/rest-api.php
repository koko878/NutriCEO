<?php
/**
 * D²nAI NutriBudget — Backend REST + MySQL (PoV, SANS SSO).
 * Inclus depuis dnai-nutribudget.php.
 *
 * Pattern calqué sur NutriPlan :
 *  - table custom {prefix}dnai_nbudget_store (collection PK, data, updated_at, updated_by)
 *  - namespace REST dnai/nbudget/v1
 *  - persistance PARTAGÉE multi-utilisateur (fin du localStorage par poste) ;
 *    localStorage côté front = cache offline / 1er paint.
 *
 * AUTH (volontairement SANS SSO pour le PoV) :
 *  - lecture  : utilisateur connecté WordPress
 *  - écriture : capability 'edit_posts'
 *  - nonce same-origin (X-WP-Nonce)
 *  SSO Entra ID = phase finale → se branchera sur les permission_callback ci-dessous.
 *
 * Collections whitelistées : 'lines' (EngagementLine[]), 'rates' (taux de change).
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_NBUDGET_DB_VERSION', '1' );
define( 'DNAI_NBUDGET_NS', 'dnai/nbudget/v1' );

function dnai_nbudget_table() {
	global $wpdb;
	return $wpdb->prefix . 'dnai_nbudget_store';
}
function dnai_nbudget_collections() { return array( 'lines', 'rates' ); }
function dnai_nbudget_is_collection( $name ) { return in_array( $name, dnai_nbudget_collections(), true ); }

/** Création / migration de la table. Appelée à l'activation ET sur plugins_loaded (idempotent). */
function dnai_nbudget_install() {
	$installed = get_option( 'dnai_nbudget_db_version' );
	if ( $installed === DNAI_NBUDGET_DB_VERSION ) { return; }
	global $wpdb;
	$table   = dnai_nbudget_table();
	$charset = $wpdb->get_charset_collate();
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';
	dbDelta( "CREATE TABLE $table (
		collection VARCHAR(64) NOT NULL,
		data       LONGTEXT NOT NULL,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_by VARCHAR(190) NOT NULL DEFAULT '',
		PRIMARY KEY (collection)
	) $charset;" );
	update_option( 'dnai_nbudget_db_version', DNAI_NBUDGET_DB_VERSION );
}
add_action( 'plugins_loaded', 'dnai_nbudget_install' );

function dnai_nbudget_can_read()  { return is_user_logged_in(); }
function dnai_nbudget_can_write() { return current_user_can( 'edit_posts' ); }

/** Contexte exposé au front (fusionné dans window.DNAI_NBUDGET par le plugin principal). */
function dnai_nbudget_ctx() {
	return array(
		'restUrl' => esc_url_raw( rest_url( DNAI_NBUDGET_NS ) ),
		'nonce'   => wp_create_nonce( 'wp_rest' ),
		'canEdit' => dnai_nbudget_can_write(),
	);
}

function dnai_nbudget_get_collection( $request ) {
	global $wpdb;
	$name = $request['name'];
	if ( ! dnai_nbudget_is_collection( $name ) ) {
		return new WP_Error( 'bad_collection', 'Collection inconnue', array( 'status' => 404 ) );
	}
	$table = dnai_nbudget_table();
	$row   = $wpdb->get_row( $wpdb->prepare( "SELECT data, updated_at, updated_by FROM $table WHERE collection = %s", $name ), ARRAY_A );
	if ( ! $row ) {
		return array( 'collection' => $name, 'data' => null, 'updated_at' => null, 'updated_by' => null );
	}
	return array(
		'collection' => $name,
		'data'       => json_decode( $row['data'], true ),
		'updated_at' => $row['updated_at'],
		'updated_by' => $row['updated_by'],
	);
}

function dnai_nbudget_put_collection( $request ) {
	global $wpdb;
	$name = $request['name'];
	if ( ! dnai_nbudget_is_collection( $name ) ) {
		return new WP_Error( 'bad_collection', 'Collection inconnue', array( 'status' => 404 ) );
	}
	$body = $request->get_json_params();
	if ( ! isset( $body['data'] ) ) {
		return new WP_Error( 'no_data', 'Champ data manquant', array( 'status' => 400 ) );
	}
	$table = dnai_nbudget_table();
	$user  = wp_get_current_user();
	$who   = ( $user && $user->exists() ) ? $user->user_login : 'anon';
	$wpdb->query( $wpdb->prepare(
		"INSERT INTO $table (collection, data, updated_at, updated_by) VALUES (%s, %s, %s, %s)
		 ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)",
		$name, wp_json_encode( $body['data'] ), current_time( 'mysql' ), $who
	) );
	return array( 'ok' => true, 'collection' => $name, 'updated_by' => $who, 'updated_at' => current_time( 'mysql' ) );
}

/** Upsert granulaire d'une ligne (anti-clobber) — collection 'lines'. */
function dnai_nbudget_upsert_item( $request ) {
	global $wpdb;
	if ( $request['name'] !== 'lines' ) {
		return new WP_Error( 'bad_collection', 'Upsert item seulement sur lines', array( 'status' => 400 ) );
	}
	$item = $request->get_json_params();
	if ( empty( $item['id'] ) ) {
		return new WP_Error( 'no_id', 'item.id requis', array( 'status' => 400 ) );
	}
	$table = dnai_nbudget_table();
	$row   = $wpdb->get_var( $wpdb->prepare( "SELECT data FROM $table WHERE collection = 'lines'" ) );
	$list  = $row ? json_decode( $row, true ) : array();
	if ( ! is_array( $list ) ) { $list = array(); }
	$found = false;
	foreach ( $list as $i => $l ) {
		if ( isset( $l['id'] ) && $l['id'] === $item['id'] ) { $list[ $i ] = $item; $found = true; break; }
	}
	if ( ! $found ) { array_unshift( $list, $item ); }
	$user = wp_get_current_user();
	$who  = ( $user && $user->exists() ) ? $user->user_login : 'anon';
	$wpdb->query( $wpdb->prepare(
		"INSERT INTO $table (collection, data, updated_at, updated_by) VALUES ('lines', %s, %s, %s)
		 ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at), updated_by = VALUES(updated_by)",
		wp_json_encode( $list ), current_time( 'mysql' ), $who
	) );
	return array( 'ok' => true, 'id' => $item['id'], 'count' => count( $list ) );
}

function dnai_nbudget_delete_item( $request ) {
	global $wpdb;
	if ( $request['name'] !== 'lines' ) {
		return new WP_Error( 'bad_collection', 'Delete seulement sur lines', array( 'status' => 400 ) );
	}
	$id    = $request['id'];
	$table = dnai_nbudget_table();
	$row   = $wpdb->get_var( $wpdb->prepare( "SELECT data FROM $table WHERE collection = 'lines'" ) );
	$list  = $row ? json_decode( $row, true ) : array();
	if ( ! is_array( $list ) ) { $list = array(); }
	$list = array_values( array_filter( $list, function ( $l ) use ( $id ) {
		return ! ( isset( $l['id'] ) && $l['id'] === $id );
	} ) );
	$wpdb->query( $wpdb->prepare( "UPDATE $table SET data = %s, updated_at = %s WHERE collection = 'lines'", wp_json_encode( $list ), current_time( 'mysql' ) ) );
	return array( 'ok' => true, 'id' => $id, 'count' => count( $list ) );
}

add_action( 'rest_api_init', function () {
	register_rest_route( DNAI_NBUDGET_NS, '/collection/(?P<name>[a-z_]+)', array(
		array( 'methods' => 'GET', 'callback' => 'dnai_nbudget_get_collection', 'permission_callback' => 'dnai_nbudget_can_read' ),
		array( 'methods' => 'PUT', 'callback' => 'dnai_nbudget_put_collection', 'permission_callback' => 'dnai_nbudget_can_write' ),
	) );
	register_rest_route( DNAI_NBUDGET_NS, '/item/(?P<name>[a-z_]+)', array(
		'methods' => 'POST', 'callback' => 'dnai_nbudget_upsert_item', 'permission_callback' => 'dnai_nbudget_can_write',
	) );
	register_rest_route( DNAI_NBUDGET_NS, '/item/(?P<name>[a-z_]+)/(?P<id>[A-Za-z0-9_\-]+)', array(
		'methods' => 'DELETE', 'callback' => 'dnai_nbudget_delete_item', 'permission_callback' => 'dnai_nbudget_can_write',
	) );
} );
