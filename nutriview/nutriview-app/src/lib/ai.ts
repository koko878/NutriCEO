// =====================================================================
// NutriView — adaptateur IA (Phase 4).
// Le front ne parle JAMAIS directement à Databricks (souveraineté + PAT).
// Il appelle le proxy WordPress `dnai/nview/v1/ai/classify`.
// En mode standalone (fichier ouvert seul, hors WP), bascule sur un MOCK
// déterministe local pour permettre la démo sans backend.
//
// Garde-fous SPEC §8 :
//  - citation obligatoire : si une cellule revient sans citation, on la
//    marque `rejected=true` et level=-1 (« à classer manuellement ») ;
//  - aucun appel direct depuis le navigateur vers OpenAI/Anthropic ;
//  - aucune décision finale par l'IA — c'est l'utilisateur qui valide.
// =====================================================================

import type { Dim, Level } from "./model";
import { examplesFor } from "./annexe2";

// ---------------------------------------------------------------------------
// Contexte injecté par le plugin WP via window.DNAI_NVIEW (cf. dnai-nutriview.php).
// ---------------------------------------------------------------------------
type AiStatus = {
  configured: boolean;
  workspace_url: string;
  model: string;
  timeout: number;
  token_set: boolean;
};

type WpBoot = {
  home?: string;
  user?: string;
  ver?: string;
  aiStatus?: AiStatus;
  restNs?: string;
  nonce?: string;
};

declare global {
  interface Window {
    DNAI_NVIEW?: WpBoot;
  }
}

function wpBoot(): WpBoot {
  return (typeof window !== "undefined" && window.DNAI_NVIEW) || {};
}

/** Vrai si la classification IA est branchée (proxy WP + config Databricks). */
export function aiAvailable(): boolean {
  const b = wpBoot();
  return !!(b.aiStatus && b.aiStatus.configured && b.restNs && b.nonce);
}

/** Source à afficher dans l'UI (`databricks-claude-sonnet-4-6` ou `mock`). */
export function aiSource(): string {
  const b = wpBoot();
  if (b.aiStatus?.configured) return b.aiStatus.model;
  return "mock-local";
}

// ---------------------------------------------------------------------------
// Types de réponse — miroirs typés des sorties IA.
// ---------------------------------------------------------------------------

export interface AiCitation {
  section: string;
  quote?: string;
}

export interface AiClassifyCell {
  dim: Dim;
  /** -1 = à classer manuellement (citation manquante OU "ne sais pas"). */
  level: Level | -1;
  rationale: string;
  citations: AiCitation[];
  by_analogy?: boolean;
  rejected?: boolean;
}

export interface AiClassifyResult {
  cells: AiClassifyCell[];
}

export interface AiExtractedItem {
  name: string;
  description: string;
  locator?: string;
}

export interface AiExtractResult {
  items: AiExtractedItem[];
}

export type AiError = {
  ok: false;
  code:
    | "not_configured"
    | "http"
    | "bad_json"
    | "rate_limit"
    | "network"
    | "rejected";
  message: string;
};

export type AiOk<T> = { ok: true; data: T; source: string; durationMs: number };
export type AiResult<T> = AiOk<T> | AiError;

// ---------------------------------------------------------------------------
// Garde-fou citation côté front (défense en profondeur — déjà filtré côté PHP).
// ---------------------------------------------------------------------------

function enforceCitations(cells: AiClassifyCell[]): AiClassifyCell[] {
  return cells.map((c) => {
    const hasCitation =
      Array.isArray(c.citations) &&
      c.citations.some((x) => x && typeof x.section === "string" && x.section.trim().length > 0);
    if (!hasCitation || c.level < 0) {
      return {
        ...c,
        level: -1,
        rationale: c.rationale || "à classer manuellement (citation manquante — garde-fou)",
        citations: c.citations ?? [],
        rejected: true,
      };
    }
    return c;
  });
}

// ---------------------------------------------------------------------------
// Appel REST proxy WordPress.
// ---------------------------------------------------------------------------

async function callProxy<T>(kind: "classify" | "extract", payload: unknown): Promise<AiResult<T>> {
  const b = wpBoot();
  if (!b.restNs || !b.nonce || !b.aiStatus?.configured) {
    return {
      ok: false,
      code: "not_configured",
      message:
        "Backend IA non configuré (WordPress → Réglages → NutriView AI). Mode démo : utilisez la suggestion MOCK.",
    };
  }
  const url = `${b.home ?? "/"}wp-json/${b.restNs}/ai/classify`;
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-WP-Nonce": b.nonce,
      },
      body: JSON.stringify({ kind, payload }),
    });
    const dur = Math.round(performance.now() - t0);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        code: res.status === 429 ? "rate_limit" : "http",
        message: `HTTP ${res.status} — ${body.slice(0, 240)}`,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data, source: b.aiStatus?.model ?? "databricks", durationMs: dur };
  } catch (e) {
    return {
      ok: false,
      code: "network",
      message: e instanceof Error ? e.message : "Erreur réseau",
    };
  }
}

// ---------------------------------------------------------------------------
// Mock déterministe local — utilisé en standalone (hors WP) pour la démo
// ET pour le smoke test Playwright. Cite l'Annexe II réelle (lib/annexe2.ts)
// pour rester crédible. Heuristique : mots-clés du nom de la donnée → niveau.
// ---------------------------------------------------------------------------

const KEYWORDS_HIGH: RegExp =
  /\b(mot de passe|password|credential|secret|token|cle?\s+priv|clef\s+priv|api\s*key|biom[ée]tri|sant[ée]|m[ée]dical|patient|client|salaire|paie|cni|carte\s+identit|geolog|defense|s[eé]curit[eé]\s+[eé]tat|interbancaire|nuclear)/i;
const KEYWORDS_MID: RegExp =
  /\b(financier|finance|contrat|facture|ressources?\s+humaines|rh|employ[ée]|client|fournisseur|production|sap|workday)/i;
const KEYWORDS_LOW: RegExp =
  /\b(brouillon|note|compte[\s-]?rendu|m[ée]t[ée]o|public|annonce|brochure|press)/i;

function mockLevelFor(text: string, dim: Dim): Level {
  const t = text.toLowerCase();
  if (KEYWORDS_HIGH.test(t)) return (dim === "C" ? 4 : 3) as Level;
  if (KEYWORDS_MID.test(t)) return 2;
  if (KEYWORDS_LOW.test(t)) return dim === "C" ? 1 : 0;
  return dim === "D" ? 1 : 2; // défaut prudent
}

function mockClassifyCell(name: string, description: string, dim: Dim): AiClassifyCell {
  const lvl = mockLevelFor(`${name} ${description}`, dim);
  // Citation = un exemple réel tiré de l'Annexe II pour ce niveau.
  const samples = examplesFor(dim, lvl);
  const citation = samples.length > 0 ? samples[0] : "";
  return {
    dim,
    level: lvl,
    rationale: `MOCK — heuristique mots-clés. Niveau proposé par analogie avec un exemple Annexe II.`,
    citations: citation
      ? [{ section: `Annexe II · ${dim} niveau ${lvl}`, quote: citation }]
      : [{ section: `Annexe II · ${dim} niveau ${lvl}` }],
    by_analogy: true,
  };
}

function mockClassify(name: string, description: string): AiClassifyResult {
  return {
    cells: (["C", "I", "D"] as Dim[]).map((d) => mockClassifyCell(name, description, d)),
  };
}

function mockExtract(text: string, max = 8): AiExtractResult {
  // Mock minimaliste : split sur paragraphes courts + détection "Données …".
  const lines = text
    .split(/\n|[.;]/g)
    .map((s) => s.trim())
    .filter((s) => /donn[ée]e|fichier|base|table|liste|catalogue|registre/i.test(s) && s.length > 12)
    .slice(0, max);
  return {
    items: lines.map((s, i) => ({
      name: s.slice(0, 90),
      description: s,
      locator: `paragraphe ~${i + 1}`,
    })),
  };
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/** Suggère la classification C/I/D d'UNE donnée (Tâche 2 du SPEC §7). */
export async function aiClassify(input: {
  name: string;
  description: string;
  projectContext?: string;
}): Promise<AiResult<AiClassifyResult>> {
  // Si on a un backend WP configuré, on l'appelle. Sinon, mock.
  if (aiAvailable()) {
    const res = await callProxy<AiClassifyResult>("classify", {
      item: { name: input.name, description: input.description },
      project_context: input.projectContext ?? "",
    });
    if (res.ok) {
      // Défense en profondeur : on enforce les citations même si le backend l'a déjà fait.
      res.data.cells = enforceCitations(res.data.cells);
    }
    return res;
  }
  // Mode mock (démo locale).
  const data = mockClassify(input.name, input.description);
  return { ok: true, data: { cells: enforceCitations(data.cells) }, source: "mock-local", durationMs: 60 };
}

/** Extrait le catalogue DataItem[] depuis un brief texte (Tâche 1 du SPEC §7). */
export async function aiExtractCatalog(input: {
  text: string;
  maxItems?: number;
}): Promise<AiResult<AiExtractResult>> {
  if (aiAvailable()) {
    return callProxy<AiExtractResult>("extract", {
      text: input.text,
      max_items: input.maxItems ?? 20,
    });
  }
  const data = mockExtract(input.text, input.maxItems);
  return { ok: true, data, source: "mock-local", durationMs: 50 };
}
