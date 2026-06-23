// =====================================================================
// NutriView — signature SHA-256 du contenu d'un projet (Phase 5).
//
// SPEC §5 : `signature.contentHash = SHA-256 du JSON canonique de la classif`.
// Décision Q5 : signature électronique simple = hash du payload classifié
// horodaté + nom du propriétaire. C'est de la *traçabilité*, pas une PKI ;
// suffisant pour le besoin documentaire DGSSI v1 (la décision est la trace).
//
// Canonisation : on n'inclut QUE les champs qui définissent la décision
// (id projet, dataOwner, items immuables, classifications). On exclut tout
// ce qui peut changer sans modifier la décision : ingestion.extractedAt
// secondaire, validation timestamps, history, etc.
// =====================================================================

import type { Project, DataItem, Classification, ClassificationCell } from "./model";

/** Encode en hex minuscule (16^2 = 256 chars max — ici toujours 64). */
function bytesToHex(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < view.length; i++) {
    const h = view[i].toString(16);
    out += h.length === 1 ? "0" + h : h;
  }
  return out;
}

/** SHA-256 sur une chaîne UTF-8 → hex. */
export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return bytesToHex(buf);
  }
  // Fallback ultra-basique (jamais utilisé en prod — Web Crypto est partout).
  // Ce fallback est juste pour ne pas casser un environnement de test exotique.
  // Il NE remplace PAS SHA-256 — on lève à la place pour ne pas mentir.
  throw new Error("Web Crypto SubtleCrypto.digest non disponible — impossible de signer.");
}

/** Cellule canonique — uniquement { dim, level } pour la signature. */
interface CanonCell {
  dim: ClassificationCell["dim"];
  level: number;
}

interface CanonItem {
  id: string;
  name: string;
  description: string;
  cycleLifeStates: string[]; // trié
}

interface CanonClassification {
  itemId: string;
  cells: CanonCell[]; // toujours dans l'ordre C, I, D
  classe: Classification["classe"];
  sensible: boolean;
}

interface CanonPayload {
  projectId: string;
  title: string;
  bu: string;
  dataOwner: string;
  items: CanonItem[]; // trié par id
  classifications: CanonClassification[]; // trié par itemId
  schemaVersion: 1; // permet de migrer sans casser les anciens hashs
}

function canonItem(it: DataItem): CanonItem {
  return {
    id: it.id,
    name: (it.name || "").trim(),
    description: (it.description || "").trim(),
    cycleLifeStates: [...it.cycleLifeStates].sort(),
  };
}

function canonClassification(cls: Classification): CanonClassification {
  const byDim: Record<string, number> = { C: 0, I: 0, D: 0 };
  for (const c of cls.cells) byDim[c.dim] = c.level;
  return {
    itemId: cls.itemId,
    cells: [
      { dim: "C", level: byDim.C },
      { dim: "I", level: byDim.I },
      { dim: "D", level: byDim.D },
    ],
    classe: cls.classe,
    sensible: cls.sensible,
  };
}

/**
 * Représentation canonique stable d'un projet pour signature.
 * Ne dépend PAS de l'ordre des clés JS, ni des timestamps volatils,
 * ni de l'historique — uniquement la *décision*.
 */
export function canonicalProjectPayload(p: Project): string {
  const items: CanonItem[] = [...p.items]
    .map(canonItem)
    .sort((a, b) => a.id.localeCompare(b.id));
  const classifications: CanonClassification[] = Object.values(p.classifications)
    .map(canonClassification)
    .sort((a, b) => a.itemId.localeCompare(b.itemId));
  const payload: CanonPayload = {
    projectId: p.id,
    title: (p.title || "").trim(),
    bu: (p.bu || "").trim(),
    dataOwner: (p.dataOwner || "").trim(),
    items,
    classifications,
    schemaVersion: 1,
  };
  // JSON.stringify avec un replacer qui trie les clés à chaque niveau,
  // garantit la canonisation indépendante de l'ordre d'insertion.
  return stableStringify(payload);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map((v) => stableStringify(v)).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map(
    (k) => JSON.stringify(k) + ":" + stableStringify(obj[k])
  );
  return "{" + parts.join(",") + "}";
}

/** Hash SHA-256 hex du payload canonique d'un projet. */
export async function computeProjectHash(p: Project): Promise<string> {
  return sha256Hex(canonicalProjectPayload(p));
}

/** Format court pour affichage : `a1b2c3…f4g5h6`. */
export function formatHashShort(hex: string): string {
  if (!hex || hex.length < 16) return hex;
  return `${hex.slice(0, 6)}…${hex.slice(-6)}`;
}

/**
 * Tous les items du catalogue ont-ils une classification ?
 * (Pré-requis pour passer en `in_review`.)
 */
export function allItemsClassified(p: Project): boolean {
  if (p.items.length === 0) return false;
  return p.items.every((it) => Boolean(p.classifications[it.id]));
}

/** Tous les items ont-ils été validés par le propriétaire ? */
export function allItemsValidated(p: Project): boolean {
  if (p.items.length === 0) return false;
  return p.items.every((it) => Boolean(it.validation));
}
