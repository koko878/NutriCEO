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
import * as pdfjsLib from "pdfjs-dist";
// Worker bundlé — Vite résout l'URL côté build, OK même en single-file.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — pdfjs ships a .mjs worker
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { DataItem } from "./model";

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

function heuristicCandidates(rawText: string, fileName?: string): DataItem[] {
  if (!rawText) return [];
  // Split sur fin de phrase / saut de ligne.
  const chunks = rawText
    .split(/\.\s+|\n+/)
    .map((c) => c.trim())
    .filter(Boolean);
  const out: DataItem[] = [];
  const seen = new Set<string>();
  for (let idx = 0; idx < chunks.length; idx++) {
    const c = chunks[idx];
    if (!CATALOG_MARKER.test(c)) continue;
    const name = clip(c, 80);
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: uid("item"),
      name,
      description: clip(c, 240),
      cycleLifeStates: [],
      sourceRef: fileName
        ? { fileName, locator: `chunk:${idx}` }
        : undefined,
      proposedByAI: false,
      status: "draft",
    });
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
