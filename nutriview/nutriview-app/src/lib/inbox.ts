// =====================================================================
// inbox — helpers de filtrage pour la vue propriétaire (Phase 5).
//
// Trois usages :
//  1. pendingForOwner(projects, user)    → en attente de MA validation
//  2. mySubmitted(projects, user)        → MES projets envoyés en validation
//  3. signedAround(projects, user)       → MES projets signés (audit trail)
// =====================================================================

import type { Project } from "./model";

/** Insensible à la casse, espaces de bord ignorés. */
function norm(s: string | undefined | null): string {
  return (s ?? "").trim().toLowerCase();
}

/** Projets `in_review` dont je suis le dataOwner. */
export function pendingForOwner(
  projects: Project[],
  user: string
): Project[] {
  const u = norm(user);
  if (!u) return [];
  return projects
    .filter((p) => p.status === "in_review" && norm(p.dataOwner) === u)
    .sort((a, b) => {
      const ta = a.submission?.submittedAt ?? "";
      const tb = b.submission?.submittedAt ?? "";
      return tb.localeCompare(ta); // plus récent en premier
    });
}

/** Projets que J'AI envoyés en validation (chef de projet). */
export function mySubmitted(
  projects: Project[],
  user: string
): Project[] {
  const u = norm(user);
  if (!u) return [];
  return projects.filter(
    (p) => p.status === "in_review" && norm(p.owner) === u
  );
}

/** Projets signés (par moi ou m'ayant impliqué). */
export function mySigned(
  projects: Project[],
  user: string
): Project[] {
  const u = norm(user);
  if (!u) return [];
  return projects.filter(
    (p) =>
      p.status === "signed" &&
      (norm(p.signature?.signedBy) === u ||
        norm(p.owner) === u ||
        norm(p.dataOwner) === u)
  );
}

/** Total des notifications à montrer en pastille header. */
export function inboxBadgeCount(
  projects: Project[],
  user: string
): number {
  return pendingForOwner(projects, user).length;
}
