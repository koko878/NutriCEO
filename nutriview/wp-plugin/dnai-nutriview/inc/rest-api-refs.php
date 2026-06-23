<?php
/**
 * NutriView — Backend Gouvernance (Phase 6) : référentiels + accès.
 *
 * Source d'autorité : décision produit "dashboard custom dans NutriView +
 * rôles custom, sync Azure AD au branchement du SSO".
 *
 * Stocke deux options WP (autoload=no) :
 *   - dnai_nview_refs  : { entities, businessUnits, dataDomains, dataDomainOwners }
 *   - dnai_nview_roles : [ { login, name, roles[] } ]
 *
 * Expose au front via window.DNAI_NVIEW (filtre boot) : refs, roles, govReady.
 * Le login sert de clé d'identité = futur UPN Azure AD (aucune migration le
 * jour du SSO).
 *
 * Endpoints (auth nonce WP) :
 *   - GET /wp-json/dnai/nview/v1/admin/config  (cap edit_posts)  → { refs, roles, can_manage }
 *   - PUT /wp-json/dnai/nview/v1/admin/refs     (cap manage)      → { ok }
 *   - PUT /wp-json/dnai/nview/v1/admin/roles    (cap manage)      → { ok }
 *
 * « manage » côté serveur = WP manage_options OU rôle applicatif admin pour le
 * user courant OU amorçage (aucun admin applicatif encore défini).
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_NVIEW_GOV_NS', 'dnai/nview/v1' );
define( 'DNAI_NVIEW_REFS_OPT', 'dnai_nview_refs' );
define( 'DNAI_NVIEW_ROLES_OPT', 'dnai_nview_roles' );

/* ------------------------------------------------------------------ */
/*  Lecture des options                                                 */
/* ------------------------------------------------------------------ */

function dnai_nview_refs_get() {
	$raw = get_option( DNAI_NVIEW_REFS_OPT, array() );
	if ( ! is_array( $raw ) ) { $raw = array(); }
	return array(
		'entities'         => isset( $raw['entities'] ) && is_array( $raw['entities'] ) ? array_values( $raw['entities'] ) : array(),
		'businessUnits'    => isset( $raw['businessUnits'] ) && is_array( $raw['businessUnits'] ) ? array_values( $raw['businessUnits'] ) : array(),
		'dataDomains'      => isset( $raw['dataDomains'] ) && is_array( $raw['dataDomains'] ) ? array_values( $raw['dataDomains'] ) : array(),
		'dataDomainOwners' => isset( $raw['dataDomainOwners'] ) && is_array( $raw['dataDomainOwners'] ) ? array_values( $raw['dataDomainOwners'] ) : array(),
	);
}

function dnai_nview_roles_get() {
	$raw = get_option( DNAI_NVIEW_ROLES_OPT, array() );
	if ( ! is_array( $raw ) ) { $raw = array(); }
	return array_values( $raw );
}

/* ------------------------------------------------------------------ */
/*  Permissions                                                         */
/* ------------------------------------------------------------------ */

/** Au moins un admin applicatif est-il défini ? */
function dnai_nview_gov_has_admin( $roles ) {
	foreach ( (array) $roles as $a ) {
		if ( is_array( $a ) && ! empty( $a['roles'] ) && in_array( 'admin', (array) $a['roles'], true ) ) {
			return true;
		}
	}
	return false;
}

/** Le user courant a-t-il le rôle applicatif admin ? */
function dnai_nview_gov_current_is_app_admin() {
	$user = wp_get_current_user();
	if ( ! $user || ! $user->ID ) { return false; }
	$login = strtolower( trim( $user->user_login ) );
	foreach ( dnai_nview_roles_get() as $a ) {
		if ( ! is_array( $a ) ) { continue; }
		$l = strtolower( trim( (string) ( $a['login'] ?? '' ) ) );
		if ( $l === $login && ! empty( $a['roles'] ) && in_array( 'admin', (array) $a['roles'], true ) ) {
			return true;
		}
	}
	return false;
}

/** Peut consulter la config (tout utilisateur pouvant éditer). */
function dnai_nview_gov_can_read() {
	return current_user_can( 'edit_posts' );
}

/** Peut administrer (référentiels + accès). */
function dnai_nview_gov_can_manage() {
	if ( current_user_can( 'manage_options' ) ) { return true; }
	if ( dnai_nview_gov_current_is_app_admin() ) { return true; }
	// Amorçage : aucun admin applicatif défini → un éditeur connecté peut
	// initialiser la gouvernance (poser le premier admin).
	if ( ! dnai_nview_gov_has_admin( dnai_nview_roles_get() ) && current_user_can( 'edit_posts' ) ) {
		return true;
	}
	return false;
}

/* ------------------------------------------------------------------ */
/*  Sanitisation                                                        */
/* ------------------------------------------------------------------ */

function dnai_nview_gov_str( $v ) {
	return sanitize_text_field( (string) ( $v ?? '' ) );
}

function dnai_nview_gov_bool( $v ) {
	return filter_var( $v, FILTER_VALIDATE_BOOLEAN );
}

/** Sanitize une structure refs complète. */
function dnai_nview_gov_sanitize_refs( $in ) {
	$in = is_array( $in ) ? $in : array();

	$entities = array();
	foreach ( (array) ( $in['entities'] ?? array() ) as $e ) {
		if ( ! is_array( $e ) ) { continue; }
		$entities[] = array(
			'id'     => dnai_nview_gov_str( $e['id'] ?? '' ),
			'name'   => dnai_nview_gov_str( $e['name'] ?? '' ),
			'code'   => dnai_nview_gov_str( $e['code'] ?? '' ),
			'active' => dnai_nview_gov_bool( $e['active'] ?? true ),
		);
	}

	$bus = array();
	foreach ( (array) ( $in['businessUnits'] ?? array() ) as $b ) {
		if ( ! is_array( $b ) ) { continue; }
		$bus[] = array(
			'id'       => dnai_nview_gov_str( $b['id'] ?? '' ),
			'name'     => dnai_nview_gov_str( $b['name'] ?? '' ),
			'entityId' => dnai_nview_gov_str( $b['entityId'] ?? '' ),
			'active'   => dnai_nview_gov_bool( $b['active'] ?? true ),
		);
	}

	$owners = array();
	foreach ( (array) ( $in['dataDomainOwners'] ?? array() ) as $o ) {
		if ( ! is_array( $o ) ) { continue; }
		$email = sanitize_email( (string) ( $o['email'] ?? '' ) );
		$owners[] = array(
			'id'     => dnai_nview_gov_str( $o['id'] ?? '' ),
			'name'   => dnai_nview_gov_str( $o['name'] ?? '' ),
			'login'  => dnai_nview_gov_str( $o['login'] ?? '' ),
			'email'  => $email,
			'title'  => dnai_nview_gov_str( $o['title'] ?? '' ),
			'active' => dnai_nview_gov_bool( $o['active'] ?? true ),
		);
	}

	$domains = array();
	foreach ( (array) ( $in['dataDomains'] ?? array() ) as $d ) {
		if ( ! is_array( $d ) ) { continue; }
		$domains[] = array(
			'id'          => dnai_nview_gov_str( $d['id'] ?? '' ),
			'name'        => dnai_nview_gov_str( $d['name'] ?? '' ),
			'ownerId'     => dnai_nview_gov_str( $d['ownerId'] ?? '' ),
			'buId'        => dnai_nview_gov_str( $d['buId'] ?? '' ),
			'description' => dnai_nview_gov_str( $d['description'] ?? '' ),
			'active'      => dnai_nview_gov_bool( $d['active'] ?? true ),
		);
	}

	return array(
		'entities'         => $entities,
		'businessUnits'    => $bus,
		'dataDomains'      => $domains,
		'dataDomainOwners' => $owners,
	);
}

/** Sanitize une liste d'assignations de rôles. */
function dnai_nview_gov_sanitize_roles( $in ) {
	$valid = array( 'admin', 'pm', 'owner', 'reader' );
	$out   = array();
	foreach ( (array) $in as $a ) {
		if ( ! is_array( $a ) ) { continue; }
		$login = dnai_nview_gov_str( $a['login'] ?? '' );
		if ( $login === '' ) { continue; }
		$roles = array();
		foreach ( (array) ( $a['roles'] ?? array() ) as $r ) {
			$r = (string) $r;
			if ( in_array( $r, $valid, true ) && ! in_array( $r, $roles, true ) ) {
				$roles[] = $r;
			}
		}
		$out[] = array(
			'login' => $login,
			'name'  => dnai_nview_gov_str( $a['name'] ?? '' ),
			'roles' => $roles,
		);
	}
	return $out;
}

/* ------------------------------------------------------------------ */
/*  Callbacks REST                                                      */
/* ------------------------------------------------------------------ */

function dnai_nview_gov_rest_config() {
	return array(
		'refs'       => dnai_nview_refs_get(),
		'roles'      => dnai_nview_roles_get(),
		'can_manage' => dnai_nview_gov_can_manage(),
	);
}

function dnai_nview_gov_rest_put_refs( $request ) {
	$body = $request->get_json_params();
	$refs = isset( $body['refs'] ) ? $body['refs'] : $body;
	$clean = dnai_nview_gov_sanitize_refs( $refs );
	update_option( DNAI_NVIEW_REFS_OPT, $clean, false );
	return array( 'ok' => true, 'refs' => $clean );
}

function dnai_nview_gov_rest_put_roles( $request ) {
	$body  = $request->get_json_params();
	$roles = isset( $body['roles'] ) ? $body['roles'] : $body;
	$clean = dnai_nview_gov_sanitize_roles( $roles );
	update_option( DNAI_NVIEW_ROLES_OPT, $clean, false );
	return array( 'ok' => true, 'roles' => $clean );
}

add_action( 'rest_api_init', function () {
	register_rest_route( DNAI_NVIEW_GOV_NS, '/admin/config', array(
		'methods'             => 'GET',
		'callback'            => 'dnai_nview_gov_rest_config',
		'permission_callback' => 'dnai_nview_gov_can_read',
	) );
	register_rest_route( DNAI_NVIEW_GOV_NS, '/admin/refs', array(
		'methods'             => 'PUT',
		'callback'            => 'dnai_nview_gov_rest_put_refs',
		'permission_callback' => 'dnai_nview_gov_can_manage',
	) );
	register_rest_route( DNAI_NVIEW_GOV_NS, '/admin/roles', array(
		'methods'             => 'PUT',
		'callback'            => 'dnai_nview_gov_rest_put_roles',
		'permission_callback' => 'dnai_nview_gov_can_manage',
	) );
} );

/* ------------------------------------------------------------------ */
/*  Bridge boot : refs + roles + govReady injectés dans window.DNAI_NVIEW */
/* ------------------------------------------------------------------ */

add_filter( 'dnai_nview_boot_config', function ( $cfg ) {
	$cfg['refs']     = dnai_nview_refs_get();
	$cfg['roles']    = dnai_nview_roles_get();
	$cfg['govReady'] = true;
	return $cfg;
} );
