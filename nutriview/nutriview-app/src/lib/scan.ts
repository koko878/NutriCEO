// =====================================================================
// scan.ts — scan d'une URL d'application (Phase 7).
//
// Un navigateur ne peut pas fetch une URL tierce (CORS) : le scan passe
// OBLIGATOIREMENT par un proxy WordPress souverain (inc/rest-api-scan.php)
// qui récupère la page côté serveur, en extrait le texte visible, et le
// renvoie. Le texte est ensuite traité par le même pipeline d'extraction
// que les briefs (heuristique + auto-mapping data domain).
//
// En mode standalone (hors WP, sans restNs/nonce), le scan n'est pas
// disponible — on ne falsifie pas un fetch impossible côté navigateur.
// =====================================================================

type WpBoot = {
  home?: string;
  restNs?: string;
  nonce?: string;
};

function wpBoot(): WpBoot {
  return (
    (typeof window !== "undefined" &&
      (window as { DNAI_NVIEW?: WpBoot }).DNAI_NVIEW) ||
    {}
  );
}

/** Le proxy de scan est-il joignable ? (backend WP présent) */
export function scanBackendAvailable(): boolean {
  const b = wpBoot();
  return Boolean(b.restNs && b.nonce);
}

/** Valide une URL http(s) côté client avant de l'envoyer au proxy. */
export function isValidHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export type ScanResult =
  | { ok: true; text: string; fetchedFrom: string; durationMs: number }
  | { ok: false; message: string };

/** Demande au proxy WP de scanner une URL et d'en extraire le texte. */
export async function scanUrl(url: string): Promise<ScanResult> {
  if (!isValidHttpUrl(url)) {
    return { ok: false, message: "URL invalide (attendu http:// ou https://)." };
  }
  const b = wpBoot();
  if (!scanBackendAvailable()) {
    return {
      ok: false,
      message:
        "Le scan d'URL nécessite le backend WordPress (proxy souverain). En mode démo, collez le texte de l'application.",
    };
  }
  const endpoint = `${b.home ?? "/"}wp-json/${b.restNs}/scan-url`;
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": b.nonce ?? "",
      },
      body: JSON.stringify({ url: url.trim() }),
    });
    const durationMs = Math.round(
      (typeof performance !== "undefined" ? performance.now() : 0) - t0
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return {
        ok: false,
        message: `Échec du scan (HTTP ${res.status}) ${txt.slice(0, 200)}`,
      };
    }
    const data = (await res.json()) as { text?: string; url?: string };
    const text = (data.text ?? "").trim();
    if (!text) {
      return {
        ok: false,
        message: "Le scan n'a renvoyé aucun texte exploitable depuis cette URL.",
      };
    }
    return { ok: true, text, fetchedFrom: data.url ?? url, durationMs };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erreur réseau lors du scan.",
    };
  }
}
