// =====================================================================
// NutriView — ingestion multi-format côté navigateur (SPEC §9).
// Aucune donnée ne sort du navigateur. Tout est lu en mémoire.
//   - Excel  : SheetJS (xlsx)
//   - PDF    : pdfjs-dist (texte uniquement, pas d'OCR)
//   - Word   : mammoth (.docx → texte)
//   - Texte  : pass-through
//   - Email  : .eml — extraction subject + body (regex simple)
//
// Après extraction, un découpage heuristique cherche des « lignes
// catalogue » via des marqueurs français (« Données », « Fichier de »,
// « Base de », etc.). C'est volontairement basique : ça donne une
// première liste à corriger côté Catalog avant la classification.
//
// TODO Phase 4 — remplacer le découpage heuristique par l'extraction
// IA tâche 1 (cf. SPEC §7) hébergée sur Databricks Model Serving.
// =====================================================================

import * as XLSX from "xlsx";
import mammoth from "mammoth";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";
// Worker bundlé — Vite résout l'URL côté build, OK même en single-file.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — pdfjs ships a .mjs worker
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { DataItem } from "./model";
import { aiAvailable, aiExtractCatalog } from "./ai";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker as string;
}

export interface ExtractionResult {
  rawText: string;
  candidates: DataItem[];
}

// ---------------------------------------------------------------------------
// Découpage heuristique — TODO Phase 4 : remplacé par l'extraction IA.
// ---------------------------------------------------------------------------
const CATALOG_MARKER =
  /^(Données|Fichier(s)? (de|des)|Base(s)? de|Table(s)? (de|des)|Liste(s)? (de|des)|Catalogue (de|des)|Inventaire (de|des)|Référentiel (de|des))/i;

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function clip(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max).trim() + "…" : t;
}

// Chrome/UI à ignorer dans le fallback "libellés" — éléments de navigation,
// boutons, et mots vides qui ne sont jamais des données métier.
const UI_NOISE = new Set([
  "accueil", "connexion", "déconnexion", "deconnexion", "se connecter",
  "se déconnecter", "menu", "rechercher", "recherche", "valider", "annuler",
  "ok", "fermer", "suivant", "précédent", "precedent", "retour", "envoyer",
  "enregistrer", "modifier", "supprimer", "ajouter", "nouveau", "nouvelle",
  "paramètres", "parametres", "profil", "aide", "support", "contact",
  "login", "logout", "submit", "cancel", "search", "settings", "home",
  "next", "previous", "save", "edit", "delete", "add", "close", "back",
  "mot de passe", "password", "email", "e-mail", "identifiant", "username",
  "copyright", "tous droits réservés", "mentions légales", "cookies",
]);

function mkItem(name: string, desc: string, fileName?: string, locator?: string): DataItem {
  return {
    id: uid("item"),
    name: clip(name, 80),
    description: clip(desc, 240),
    cycleLifeStates: [],
    sourceRef: fileName ? { fileName, locator: locator ?? "" } : undefined,
    proposedByAI: false,
    status: "draft",
  };
}

/**
 * Découpage heuristique (fallback hors IA). Deux passes :
 *  1. Marqueurs catalogue FR (« Données… », « Fichier de… ») — haute confiance.
 *  2. Libellés : segments courts de type champ/colonne/titre (ce qu'on trouve
 *     sur une page d'app scannée ou un brief non formaté). Indispensable :
 *     sans ça, tout texte réel qui ne commence pas par un marqueur → 0 donnée.
 * Résultat fusionné, dédupliqué, plafonné. L'utilisateur corrige au Catalogue.
 */
function heuristicCandidates(rawText: string, fileName?: string): DataItem[] {
  if (!rawText || !rawText.trim()) return [];
  const out: DataItem[] = [];
  const seen = new Set<string>();
  const MAX = 60;

  const push = (name: string, desc: string, locator?: string) => {
    const n = name.trim();
    if (!n) return;
    const key = n.toLowerCase();
    if (seen.has(key) || out.length >= MAX) return;
    seen.add(key);
    out.push(mkItem(n, desc, fileName, locator));
  };

  // Passe 1 — marqueurs catalogue (phrases).
  const sentences = rawText
    .split(/\.\s+|\n+/)
    .map((c) => c.trim())
    .filter(Boolean);
  sentences.forEach((c, idx) => {
    if (CATALOG_MARKER.test(c)) push(clip(c, 80), c, `chunk:${idx}`);
  });

  // Passe 2 — libellés (champs / colonnes / titres) : segments courts.
  // On découpe aussi sur séparateurs visuels fréquents (·, •, |, ;, tab,
  // double espace, deux-points) pour récupérer les libellés de formulaires
  // et d'en-têtes de tableaux.
  const segments = rawText
    .split(/[\n\r]+|[•·|;\t]|\s{2,}|:\s/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const seg of segments) {
    if (out.length >= MAX) break;
    const words = seg.split(/\s+/);
    if (seg.length < 3 || seg.length > 70) continue;
    if (words.length > 9) continue;
    if (!/[A-Za-zÀ-ÿ]/.test(seg)) continue; // au moins une lettre
    if (!/^[A-Za-z0-9À-ÿ]/.test(seg)) continue; // pas de puce/symbole en tête
    if (/[.!?]$/.test(seg)) continue; // exclut les phrases (prose)
    const low = seg.toLowerCase();
    if (UI_NOISE.has(low)) continue;
    // Filtre les clusters de chrome (ex. barre de nav « Accueil Profil
    // Déconnexion ») : si la majorité des mots sont du bruit UI, on saute.
    const noiseWords = words.filter((w) => UI_NOISE.has(w.toLowerCase())).length;
    if (noiseWords * 2 >= words.length) continue;
    push(seg, seg);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Excel — SheetJS, 1ère feuille, 1ère ligne = en-têtes.
// ---------------------------------------------------------------------------
export async function extractFromExcel(file: File): Promise<ExtractionResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const firstSheet = wb.SheetNames[0];
  if (!firstSheet) return { rawText: "", candidates: [] };
  const ws = wb.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
  });
  const candidates: DataItem[] = [];
  let rawText = "";
  rows.forEach((row, idx) => {
    const keys = Object.keys(row);
    const lookup = (...names: string[]): string => {
      for (const want of names) {
        const k = keys.find(
          (k) => k.toLowerCase().trim() === want.toLowerCase()
        );
        if (k && row[k] !== "" && row[k] != null) return String(row[k]).trim();
      }
      return "";
    };
    const name =
      lookup("name", "nom", "donnée", "donnee", "intitulé", "intitule") ||
      lookup("title", "titre") ||
      // Fallback : 1ère colonne non vide
      String(
        keys.map((k) => row[k]).find((v) => v != null && v !== "") ?? ""
      ).trim();
    const description =
      lookup("description", "desc", "détail", "detail", "category", "categorie") ||
      keys
        .map((k) => `${k}: ${row[k]}`)
        .filter((s) => !s.endsWith(": "))
        .join(" — ");
    if (!name) return;
    candidates.push({
      id: uid("item"),
      name: clip(name, 80),
      description: clip(description, 240),
      cycleLifeStates: [],
      sourceRef: { fileName: file.name, locator: `row:${idx + 2}` },
      proposedByAI: false,
      status: "draft",
    });
    rawText += `${name}${description ? " — " + description : ""}\n`;
  });
  return { rawText, candidates };
}

// ---------------------------------------------------------------------------
// PDF — pdfjs-dist, texte uniquement.
// ---------------------------------------------------------------------------
export async function extractFromPdf(file: File): Promise<ExtractionResult> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let rawText = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    rawText += pageText + "\n\n";
  }
  return { rawText, candidates: heuristicCandidates(rawText, file.name) };
}

// ---------------------------------------------------------------------------
// PowerPoint .pptx — unzip + extraction des runs de texte <a:t> par slide.
// Aucune dépendance réseau : JSZip lit le conteneur OOXML en mémoire.
// ---------------------------------------------------------------------------
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

export async function extractFromPptx(file: File): Promise<ExtractionResult> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => {
      const na = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const nb = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return na - nb;
    });
  let rawText = "";
  for (const p of slidePaths) {
    const xml = await zip.files[p].async("string");
    const runs = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) =>
      decodeXmlEntities(m[1])
    );
    const slideText = runs.join(" ").trim();
    if (slideText) rawText += slideText + "\n\n";
  }
  return { rawText, candidates: heuristicCandidates(rawText, file.name) };
}

// ---------------------------------------------------------------------------
// Word .docx — mammoth.
// ---------------------------------------------------------------------------
export async function extractFromDocx(file: File): Promise<ExtractionResult> {
  const buf = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buf });
  const rawText = result.value || "";
  return { rawText, candidates: heuristicCandidates(rawText, file.name) };
}

// ---------------------------------------------------------------------------
// Texte brut — pass-through.
// ---------------------------------------------------------------------------
export function extractFromText(input: string): ExtractionResult {
  return { rawText: input, candidates: heuristicCandidates(input) };
}

// ---------------------------------------------------------------------------
// Contrat de données (OpenAPI / JSON Schema / JSON générique).
// C'est la voie FIABLE pour "scanner une app" : plutôt que scraper un écran,
// on lit le modèle de données exposé (export Swagger/OpenAPI, schéma, ou un
// échantillon JSON d'API). Chaque champ devient un objet-donnée candidat.
// ---------------------------------------------------------------------------
function jsonFieldDesc(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as Record<string, unknown>;
  const bits: string[] = [];
  if (typeof p.description === "string" && p.description) bits.push(p.description);
  else if (typeof p.title === "string" && p.title) bits.push(p.title);
  if (typeof p.type === "string") bits.push(`type ${p.type}`);
  if (typeof p.format === "string") bits.push(p.format);
  return bits.join(" · ");
}

/**
 * Tente d'extraire des objets-donnée depuis un contrat JSON.
 * Renvoie null si le texte n'est pas du JSON exploitable (→ fallback ailleurs).
 */
export function extractFromJson(text: string, fileName?: string): ExtractionResult | null {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;

  const out: DataItem[] = [];
  const seen = new Set<string>();
  const MAX = 300;
  const push = (name: string, desc: string) => {
    const n = (name || "").trim();
    if (!n) return;
    const key = n.toLowerCase();
    if (seen.has(key) || out.length >= MAX) return;
    seen.add(key);
    out.push(mkItem(n, desc || n, fileName, "json"));
  };

  const root = obj as Record<string, unknown>;
  // 1) OpenAPI / Swagger : components.schemas ou definitions.
  const comps = (root.components as Record<string, unknown> | undefined)?.schemas;
  const schemas = (comps ?? root.definitions) as Record<string, unknown> | undefined;
  if (schemas && typeof schemas === "object") {
    for (const [schemaName, schema] of Object.entries(schemas)) {
      const props = (schema as Record<string, unknown>)?.properties as
        | Record<string, unknown>
        | undefined;
      if (props && typeof props === "object" && Object.keys(props).length) {
        for (const [propName, prop] of Object.entries(props)) {
          push(`${schemaName}.${propName}`, jsonFieldDesc(prop));
        }
      } else {
        push(schemaName, jsonFieldDesc(schema) || "schéma");
      }
    }
    if (out.length) return { rawText: text, candidates: out };
  }

  // 2) JSON Schema racine unique (properties au top niveau).
  const topProps = root.properties as Record<string, unknown> | undefined;
  if (topProps && typeof topProps === "object" && Object.keys(topProps).length) {
    for (const [propName, prop] of Object.entries(topProps)) {
      push(propName, jsonFieldDesc(prop));
    }
    if (out.length) return { rawText: text, candidates: out };
  }

  // 3) JSON générique : tableau d'objets → clés ; objet → clés.
  const sample = Array.isArray(obj)
    ? (obj.find((x) => x && typeof x === "object") as Record<string, unknown> | undefined)
    : root;
  if (sample && typeof sample === "object") {
    for (const [k, v] of Object.entries(sample)) {
      push(k, `champ (${Array.isArray(v) ? "array" : typeof v})`);
    }
    if (out.length) return { rawText: text, candidates: out };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Extraction "intelligente" depuis un texte (collage / scan d'URL).
// Si l'IA souveraine est configurée, elle extrait sémantiquement les objets-
// donnée (toutes langues, sans dépendre d'un marqueur). Sinon, fallback sur
// l'heuristique (marqueurs + libellés). Garantit qu'un texte réel ne renvoie
// pas 0 donnée juste parce qu'il ne commence pas par « Données… ».
// ---------------------------------------------------------------------------
export interface SmartExtraction {
  candidates: DataItem[];
  source: "schema" | "ai" | "heuristic";
  rawText: string;
}

export async function extractCatalogSmart(text: string): Promise<SmartExtraction> {
  const raw = text || "";
  // 0) Contrat de données (OpenAPI / JSON Schema / JSON) — le plus fiable.
  const trimmed = raw.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const fromJson = extractFromJson(raw);
    if (fromJson && fromJson.candidates.length > 0) {
      return { candidates: fromJson.candidates, source: "schema", rawText: raw };
    }
  }
  if (aiAvailable()) {
    try {
      const r = await aiExtractCatalog({ text: raw });
      if (r.ok && Array.isArray(r.data.items) && r.data.items.length > 0) {
        const candidates = r.data.items.map((it) =>
          mkItemAI(it.name, it.description, it.locator)
        );
        return { candidates, source: "ai", rawText: raw };
      }
    } catch {
      /* bascule sur l'heuristique */
    }
  }
  return { candidates: heuristicCandidates(raw), source: "heuristic", rawText: raw };
}

function mkItemAI(name: string, description?: string, locator?: string): DataItem {
  return {
    id: uid("item"),
    name: clip(name || "", 80),
    description: clip(description || name || "", 240),
    cycleLifeStates: [],
    sourceRef: locator ? { fileName: "(extraction IA)", locator } : undefined,
    proposedByAI: true,
    status: "ai_classified",
  };
}

// ---------------------------------------------------------------------------
// .eml — extraction Subject + body (split à la 1ère ligne vide).
// ---------------------------------------------------------------------------
export function extractFromEml(input: string): ExtractionResult {
  const sep = input.search(/\r?\n\r?\n/);
  let headers = input;
  let body = "";
  if (sep >= 0) {
    headers = input.slice(0, sep);
    body = input.slice(sep).replace(/^\r?\n\r?\n/, "");
  }
  const subjectMatch = headers.match(/^Subject:\s*(.+)$/im);
  const subject = subjectMatch ? subjectMatch[1].trim() : "";
  const rawText = (subject ? `Sujet : ${subject}\n\n` : "") + body;
  return { rawText, candidates: heuristicCandidates(rawText) };
}
