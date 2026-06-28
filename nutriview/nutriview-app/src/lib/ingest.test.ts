import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import {
  extractFromText,
  extractFromEml,
  extractFromPptx,
} from "./ingest";

describe("ingest.extractFromText (heuristique)", () => {
  it("repère les lignes catalogue par marqueur", () => {
    const txt =
      "Contexte du projet.\nDonnées clients du CRM.\nFichier de paie mensuel.\nBlabla non pertinent.";
    const r = extractFromText(txt);
    const names = r.candidates.map((c) => c.name.toLowerCase());
    expect(names.some((n) => n.startsWith("données clients"))).toBe(true);
    expect(names.some((n) => n.startsWith("fichier de paie"))).toBe(true);
  });
});

describe("ingest.extractFromEml", () => {
  it("extrait le sujet et le corps", () => {
    const eml = "Subject: Données RH\r\nFrom: a@b\r\n\r\nFichier de paie des employés.";
    const r = extractFromEml(eml);
    expect(r.rawText).toContain("Données RH");
    expect(r.rawText).toContain("Fichier de paie");
  });
});

// Construit un .pptx minimal (zip OOXML) en mémoire pour tester l'extraction.
async function makePptx(slides: string[][]): Promise<File> {
  const zip = new JSZip();
  slides.forEach((runs, i) => {
    const body = runs.map((t) => `<a:p><a:r><a:t>${t}</a:t></a:r></a:p>`).join("");
    zip.file(
      `ppt/slides/slide${i + 1}.xml`,
      `<?xml version="1.0"?><p:sld><p:cSld><p:spTree>${body}</p:spTree></p:cSld></p:sld>`
    );
  });
  const blob = await zip.generateAsync({ type: "arraybuffer" });
  return new File([blob], "deck.pptx", {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}

describe("ingest.extractFromPptx", () => {
  it("extrait le texte des slides dans l'ordre", async () => {
    const file = await makePptx([
      ["Projet NutriView"],
      ["Données clients du CRM"],
      ["Fichier de paie mensuel"],
      ["Base de données analytiques"],
    ]);
    const r = await extractFromPptx(file);
    expect(r.rawText).toContain("Projet NutriView");
    expect(r.rawText).toContain("Données clients du CRM");
    expect(r.rawText).toContain("Fichier de paie mensuel");
    // Le découpage heuristique récupère des candidats catalogue.
    const names = r.candidates.map((c) => c.name.toLowerCase());
    expect(names.some((n) => n.startsWith("données clients"))).toBe(true);
    expect(names.some((n) => n.startsWith("fichier de paie"))).toBe(true);
  });

  it("décode les entités XML et ignore les slides vides", async () => {
    const file = await makePptx([["Données R&amp;D &lt;confidentiel&gt;"], []]);
    const r = await extractFromPptx(file);
    expect(r.rawText).toContain("Données R&D <confidentiel>");
  });
});
