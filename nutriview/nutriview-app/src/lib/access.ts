// =====================================================================
// NutriView — modèle d'accès (Phase 6).
//
// 4 rôles applicatifs, attribués par login (== futur UPN Azure AD) :
//   - admin   : tout, dont gestion des référentiels et des accès.
//   - pm      : crée des projets, classifie, envoie en validation.
//   - owner   : valide ligne par ligne et signe (propriétaire des données).
//   - reader  : lecture seule.
//
// Le jour du SSO Entra ID, ces RoleAssignment seront synchronisés depuis
// les groupes Azure AD — d'où la clé `login` plutôt qu'un id interne.
//
// BOOTSTRAP first-run : tant qu'AUCUN admin n'est défini, tout utilisateur
// est traité comme admin (sinon on se verrouille dehors au premier lancement).
// Dès qu'au moins un admin existe, les inconnus retombent sur `reader`.
// =====================================================================

export type Role = "admin" | "pm" | "owner" | "reader";

export type Cap =
  | "read"
  | "create_project"
  | "classify"
  | "validate"
  | "sign"
  | "manage"; // gérer référentiels + accès

export interface RoleAssignment {
  login: string; // user_login WP == UPN
  name?: string; // affichage
  roles: Role[];
}

export const ALL_ROLES: Role[] = ["admin", "pm", "owner", "reader"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  pm: "Chef de projet",
  owner: "Propriétaire des données",
  reader: "Lecteur",
};

export const ROLE_HINTS: Record<Role, string> = {
  admin: "Gère référentiels, accès et tous les projets.",
  pm: "Crée des projets, classifie, envoie en validation.",
  owner: "Valide et signe les classifications de ses données.",
  reader: "Consultation seule.",
};

const ROLE_CAPS: Record<Role, Cap[]> = {
  admin: ["read", "create_project", "classify", "validate", "sign", "manage"],
  pm: ["read", "create_project", "classify"],
  owner: ["read", "validate", "sign"],
  reader: ["read"],
};

export const CAP_LABELS: Record<Cap, string> = {
  read: "Consulter",
  create_project: "Créer un projet",
  classify: "Classifier",
  validate: "Valider",
  sign: "Signer",
  manage: "Administrer",
};

function norm(s: string | undefined | null): string {
  return (s ?? "").trim().toLowerCase();
}

/** Y a-t-il au moins un administrateur défini dans les assignations ? */
export function hasAnyAdmin(assignments: RoleAssignment[]): boolean {
  return assignments.some((a) => a.roles.includes("admin"));
}

/**
 * Rôles effectifs d'un utilisateur.
 * - Si une assignation existe pour ce login → ses rôles.
 * - Sinon, bootstrap : aucun admin défini → ["admin"] ; sinon → ["reader"].
 */
export function rolesForUser(
  assignments: RoleAssignment[],
  login: string
): Role[] {
  const u = norm(login);
  const found = assignments.find((a) => norm(a.login) === u);
  if (found && found.roles.length > 0) return found.roles;
  if (!hasAnyAdmin(assignments)) return ["admin"]; // first-run bootstrap
  return ["reader"];
}

/** Capabilities effectives (union des caps de tous les rôles). */
export function capsForRoles(roles: Role[]): Set<Cap> {
  const out = new Set<Cap>();
  for (const r of roles) for (const c of ROLE_CAPS[r] ?? []) out.add(c);
  return out;
}

/** True si l'ensemble de rôles confère la capability demandée. */
export function roleCan(roles: Role[], cap: Cap): boolean {
  return capsForRoles(roles).has(cap);
}

/** Pratique : caps directes d'un utilisateur. */
export function userCan(
  assignments: RoleAssignment[],
  login: string,
  cap: Cap
): boolean {
  return roleCan(rolesForUser(assignments, login), cap);
}

/** Étiquette compacte du rôle « principal » (le plus puissant) d'un user. */
export function primaryRoleLabel(roles: Role[]): string {
  for (const r of ALL_ROLES) {
    if (roles.includes(r)) return ROLE_LABELS[r];
  }
  return ROLE_LABELS.reader;
}

/** Nettoie une liste d'assignations venant d'une source externe. */
export function normalizeAssignments(raw: unknown): RoleAssignment[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set<Role>(ALL_ROLES);
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => {
      const login = typeof x.login === "string" ? x.login.trim() : "";
      const name = typeof x.name === "string" ? x.name.trim() : undefined;
      const roles = Array.isArray(x.roles)
        ? (x.roles.filter((r) => valid.has(r as Role)) as Role[])
        : [];
      return { login, name, roles };
    })
    .filter((a) => a.login.length > 0);
}
