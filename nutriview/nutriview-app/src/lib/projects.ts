// =====================================================================
// projects.ts — synchronisation des projets avec le backend WP (phase 1).
//
// localStorage reste le cache local (réactivité + offline) ; le serveur est
// la source de vérité partagée entre utilisateurs. Au boot on hydrate depuis
// le serveur ; à chaque mutation on pousse le projet (PUT debouncé par id).
// Si le backend n'est pas dispo (mode démo standalone), tout reste local.
// =====================================================================

import type { Project } from "./model";

type WpBoot = {
  home?: string;
  restNs?: string;
  nonce?: string;
  projectsReady?: boolean;
};

function wpBoot(): WpBoot {
  return (
    (typeof window !== "undefined" &&
      (window as { DNAI_NVIEW?: WpBoot }).DNAI_NVIEW) ||
    {}
  );
}

/** La persistance serveur des projets est-elle joignable ? */
export function projectsBackendAvailable(): boolean {
  const b = wpBoot();
  return Boolean(b.restNs && b.nonce && b.projectsReady);
}

function base(): string {
  const b = wpBoot();
  return `${b.home ?? "/"}wp-json/${b.restNs}`;
}

function headers(): Record<string, string> {
  const b = wpBoot();
  return { "Content-Type": "application/json", "X-WP-Nonce": b.nonce ?? "" };
}

/** GET tous les projets partagés. null si backend indisponible ou erreur. */
export async function fetchProjects(): Promise<Project[] | null> {
  if (!projectsBackendAvailable()) return null;
  try {
    const res = await fetch(`${base()}/projects`, {
      credentials: "same-origin",
      headers: headers(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as Project[]) : null;
  } catch {
    return null;
  }
}

// PUT debouncé par id — évite de marteler le serveur quand on glisse un slider.
const pushTimers: Record<string, ReturnType<typeof setTimeout>> = {};

/** Pousse (upsert) un projet vers le serveur. No-op silencieux si indispo. */
export function pushProject(project: Project): void {
  if (!projectsBackendAvailable() || !project?.id) return;
  const id = project.id;
  if (pushTimers[id]) clearTimeout(pushTimers[id]);
  pushTimers[id] = setTimeout(() => {
    try {
      void fetch(`${base()}/projects/${encodeURIComponent(id)}`, {
        method: "PUT",
        credentials: "same-origin",
        headers: headers(),
        body: JSON.stringify({ project }),
      }).catch(() => {});
    } catch {
      /* silencieux : le cache local garde la main */
    }
  }, 500);
}

/** Supprime un projet côté serveur. */
export function deleteProjectRemote(id: string): void {
  if (!projectsBackendAvailable() || !id) return;
  try {
    void fetch(`${base()}/projects/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: headers(),
    }).catch(() => {});
  } catch {
    /* silencieux */
  }
}
