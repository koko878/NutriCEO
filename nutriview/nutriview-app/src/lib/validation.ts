// =====================================================================
// validation.ts — best-effort notify backend WP pour Phase 5.
// La signature est COMPUTE side-front (lib/signature.ts) ; le backend ne
// fait que journaliser et envoyer un wp_mail. Si WP n'est pas configuré
// (mode standalone démo), on no-op silencieusement.
// =====================================================================

import type { Project } from "./model";

type WpBoot = {
  home?: string;
  user?: string;
  ver?: string;
  restNs?: string;
  nonce?: string;
  validationReady?: boolean;
};

function wpBoot(): WpBoot {
  return (typeof window !== "undefined" && (window as { DNAI_NVIEW?: WpBoot }).DNAI_NVIEW) || {};
}

/** True si on peut appeler les endpoints /validation/* du proxy WP. */
export function validationBackendAvailable(): boolean {
  const b = wpBoot();
  return Boolean(b.restNs && b.nonce && b.validationReady);
}

async function post<T>(
  path: string,
  body: unknown
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const b = wpBoot();
  if (!validationBackendAvailable()) {
    return { ok: false, message: "backend WP non disponible (mode standalone)" };
  }
  const url = `${b.home ?? "/"}wp-json/${b.restNs}/${path}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": b.nonce ?? "",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return {
        ok: false,
        message: `HTTP ${res.status} — ${txt.slice(0, 240)}`,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erreur réseau",
    };
  }
}

/** Notifie le backend qu'un projet vient de passer drafting → in_review. */
export async function notifySubmitForReview(
  project: Project,
  contentHash: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!validationBackendAvailable()) return { ok: true }; // silent no-op
  const r = await post<{ ok: boolean }>("validation/submit", {
    projectId: project.id,
    projectTitle: project.title,
    dataOwner: project.dataOwner,
    submittedBy: project.submission?.submittedBy ?? project.owner,
    itemsCount: project.items.length,
    contentHash,
  });
  if (!r.ok) return r;
  return { ok: true };
}

/** Notifie le backend qu'un projet vient d'être signé. */
export async function notifySigned(
  project: Project
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!validationBackendAvailable()) return { ok: true };
  if (!project.signature) {
    return { ok: false, message: "signature absente" };
  }
  const r = await post<{ ok: boolean }>("validation/sign", {
    projectId: project.id,
    projectTitle: project.title,
    owner: project.owner,
    signedBy: project.signature.signedBy,
    signedAt: project.signature.signedAt,
    contentHash: project.signature.contentHash,
  });
  if (!r.ok) return r;
  return { ok: true };
}
