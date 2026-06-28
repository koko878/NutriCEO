import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import {
  extractFromText,
  extractFromEml,
  extractFromPptx,
  extractFromJson,
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

  it("fallback libellés : extrait des champs SANS marqueur (cas scan d'app)", () => {
    // Texte type page d'app : libellés de formulaire, aucun « Données… ».
    const txt = [
      "Fiche employé",
      "Nom complet",
      "Numéro de sécurité sociale",
      "Coordonnées bancaires (RIB)",
      "Salaire de base",
      "Accueil", // chrome UI → filtré
      "Déconnexion", // chrome UI → filtré
    ].join("\n");
    const r = extractFromText(txt);
    const names = r.candidates.map((c) => c.name.toLowerCase());
    expect(r.candidates.length).toBeGreaterThanOrEqual(4);
    expect(names).toContain("nom complet");
    expect(names).toContain("salaire de base");
    expect(names).not.toContain("accueil");
    expect(names).not.toContain("déconnexion");
  });

  it("ignore la prose longue (phrases) dans le fallback libellés", () => {
    const txt =
      "Ceci est une phrase de contexte assez longue qui décrit le projet et ne doit pas devenir une donnée.";
    const r = extractFromText(txt);
    expect(r.candidates.length).toBe(0);
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

describe("ingest.extractFromJson (contrat de données)", () => {
  it("OpenAPI : extrait Schema.champ avec description", () => {
    const oas = JSON.stringify({
      openapi: "3.0.0",
      components: {
        schemas: {
          Employe: {
            properties: {
              nom: { type: "string", description: "Nom complet" },
              salaire: { type: "number" },
            },
          },
        },
      },
    });
    const r = extractFromJson(oas)!;
    const names = r.candidates.map((c) => c.name);
    expect(names).toContain("Employe.nom");
    expect(names).toContain("Employe.salaire");
  });

  it("JSON Schema racine : extrait les properties", () => {
    const schema = JSON.stringify({
      $schema: "x",
      title: "Client",
      properties: { email: { type: "string" }, iban: { type: "string" } },
    });
    const names = extractFromJson(schema)!.candidates.map((c) => c.name);
    expect(names).toContain("email");
    expect(names).toContain("iban");
  });

  it("JSON générique (tableau d'objets) : extrait les clés", () => {
    const arr = JSON.stringify([{ id: 1, nom: "x", montant: 10 }]);
    const names = extractFromJson(arr)!.candidates.map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(["id", "nom", "montant"]));
  });

  it("renvoie null si ce n'est pas du JSON", () => {
    expect(extractFromJson("pas du json")).toBeNull();
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
