// =====================================================================
// perimeters.ts — fan-out de validation par data domain owner (Phase 7).
//
// Process cible étape 5 : la classification atterrit chez le ou les data
// domain owners, chacun valide/ajuste SUR SON PÉRIMÈTRE. Le projet n'est
// clos (signed) que lorsque tous les périmètres touchés sont signés.
//
// Le mono-propriétaire historique est le cas dégénéré : un seul périmètre
// porté par project.dataOwner (quand aucune donnée n'a de data domain résolu).
// Logique pure, testable hors UI.
// =====================================================================

import type { Perimeter, Project } from "./model";
import { domainById, ownerOfDomain, type Refs } from "./refs";

function norm(s: string | undefined | null): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Construit les périmètres d'un projet à partir des data domains de ses
 * données et des owners du référentiel. Les données sans domaine résolu
 * retombent sur le propriétaire général du projet (project.dataOwner).
 */
export function buildPerimeters(project: Project, refs: Refs): Perimeter[] {
  const byKey = new Map<string, Perimeter>();
  const fallbackName = project.dataOwner?.trim() || "Propriétaire des données";
  const fallbackKey = norm(project.dataOwner) || "__owner__";

  for (const it of project.items) {
    const dom = domainById(refs, it.dataDomainId);
    const owner = ownerOfDomain(refs, it.dataDomainId);
    const key = owner ? norm(owner.login || owner.name) : fallbackKey;
    const ownerLogin = owner ? owner.login || owner.name : project.dataOwner || "";
    const ownerName = owner ? owner.name || owner.login : fallbackName;

    let p = byKey.get(key);
    if (!p) {
      p = {
        ownerLogin,
        ownerName,
        domainIds: [],
        domainNames: [],
        itemIds: [],
        status: "pending",
      };
      byKey.set(key, p);
    }
    p.itemIds.push(it.id);
    if (dom && !p.domainIds.includes(dom.id)) {
      p.domainIds.push(dom.id);
      p.domainNames.push(dom.name);
    }
  }

  // Tri stable : périmètres avec domaines nommés d'abord, puis fallback.
  return [...byKey.values()].sort((a, b) =>
    (b.domainNames[0] || "").localeCompare(a.domainNames[0] || "")
  );
}

/** Un utilisateur correspond-il au propriétaire d'un périmètre ? (login OU nom) */
export function ownerMatchesUser(p: Perimeter, user: string): boolean {
  const u = norm(user);
  if (!u) return false;
  return u === norm(p.ownerLogin) || u === norm(p.ownerName);
}

/**
 * Périmètres effectifs d'un projet : ceux stockés (post-soumission), ou un
 * périmètre unique reconstruit depuis dataOwner pour les vieux projets.
 */
export function effectivePerimeters(project: Project): Perimeter[] {
  if (project.perimeters && project.perimeters.length > 0) {
    return project.perimeters;
  }
  // Rétro-compat : projet mono-propriétaire sans périmètres stockés.
  return [
    {
      ownerLogin: project.dataOwner || "",
      ownerName: project.dataOwner || "Propriétaire des données",
      domainIds: [],
      domainNames: [],
      itemIds: project.items.map((it) => it.id),
      status: project.status === "signed" ? "signed" : "pending",
    },
  ];
}

/** Périmètres dont l'utilisateur est propriétaire. */
export function perimetersForUser(project: Project, user: string): Perimeter[] {
  return effectivePerimeters(project).filter((p) => ownerMatchesUser(p, user));
}

/** L'utilisateur a-t-il au moins un périmètre en attente sur ce projet ? */
export function hasPendingPerimeterForUser(project: Project, user: string): boolean {
  return effectivePerimeters(project).some(
    (p) => ownerMatchesUser(p, user) && p.status !== "signed"
  );
}

/** Toutes les données d'un périmètre sont-elles validées ligne par ligne ? */
export function perimeterItemsValidated(project: Project, p: Perimeter): boolean {
  if (p.itemIds.length === 0) return false;
  return p.itemIds.every((id) => {
    const it = project.items.find((x) => x.id === id);
    return Boolean(it?.validation);
  });
}

/** Tous les périmètres du projet sont-ils signés ? */
export function allPerimetersSigned(project: Project): boolean {
  const ps = effectivePerimeters(project);
  return ps.length > 0 && ps.every((p) => p.status === "signed");
}

/** Compteur d'avancement : périmètres signés / total. */
export function perimeterProgress(project: Project): { signed: number; total: number } {
  const ps = effectivePerimeters(project);
  return { signed: ps.filter((p) => p.status === "signed").length, total: ps.length };
}
