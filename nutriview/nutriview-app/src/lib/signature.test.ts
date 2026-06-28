// =====================================================================
// signature.test.ts — vérifie que le hash est :
//  1. déterministe (même projet → même hash)
//  2. invariant à l'ordre des clés / items / classifications
//  3. sensible à la donnée signée (changer un level change le hash)
//  4. insensible aux timestamps non décisionnels (ingestion.extractedAt
//     ne fait PAS partie du payload canonique)
// =====================================================================

import { describe, expect, it } from "vitest";
import {
  allItemsClassified,
  allItemsValidated,
  canonicalPerimeterPayload,
  canonicalProjectPayload,
  computePerimeterHash,
  computeProjectHash,
  formatHashShort,
  sha256Hex,
} from "./signature";
import type { Project } from "./model";

// Node 19+ et tous les navigateurs récents exposent globalThis.crypto.subtle.
// Si jamais on tombe sur un runtime exotique, les tests sha256 lèveront une
// erreur claire ("Web Crypto SubtleCrypto.digest non disponible"). On ne
// patche pas le runtime ici pour éviter une dépendance node:crypto typée.

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: "p-1",
    title: "Projet alpha",
    bu: "Nutricrops",
    dataOwner: "Hamza Kohen",
    owner: "Hamza Kohen",
    ingestion: { source: "text", extractedAt: "2026-06-23T10:00:00Z" },
    status: "drafting",
    items: [
      {
        id: "i-1",
        name: "Données clients",
        description: "liste",
        cycleLifeStates: ["stockage", "traitement"],
        proposedByAI: false,
        status: "draft",
      },
      {
        id: "i-2",
        name: "Logs production",
        description: "journaux",
        cycleLifeStates: ["archivage"],
        proposedByAI: true,
        status: "draft",
      },
    ],
    classifications: {
      "i-1": {
        itemId: "i-1",
        cells: [
          { dim: "C", level: 3, rationale: "", citations: [] },
          { dim: "I", level: 2, rationale: "", citations: [] },
          { dim: "D", level: 1, rationale: "", citations: [] },
        ],
        classe: "II",
        sensible: true,
        verdictCloud: { eligible: false, reason: "données sensibles loi 05-20 — résidence MA obligatoire" },
        suggestedMeasures: [],
        history: [],
      },
      "i-2": {
        itemId: "i-2",
        cells: [
          { dim: "C", level: 1, rationale: "", citations: [] },
          { dim: "I", level: 2, rationale: "", citations: [] },
          { dim: "D", level: 2, rationale: "", citations: [] },
        ],
        classe: "III",
        sensible: false,
        verdictCloud: { eligible: true, conditions: [] },
        suggestedMeasures: [],
        history: [],
      },
    },
    ...overrides,
  };
}

describe("signature.canonicalProjectPayload", () => {
  it("est déterministe — appels successifs identiques", () => {
    const p = projectFixture();
    expect(canonicalProjectPayload(p)).toBe(canonicalProjectPayload(p));
  });

  it("indépendant de l'ordre des items en entrée", () => {
    const p1 = projectFixture();
    const p2 = projectFixture({ items: [...p1.items].reverse() });
    expect(canonicalProjectPayload(p1)).toBe(canonicalProjectPayload(p2));
  });

  it("indépendant de l'ordre des cellules d'une classification", () => {
    const p1 = projectFixture();
    const reversed = { ...p1.classifications["i-1"] };
    reversed.cells = [...reversed.cells].reverse();
    const p2 = projectFixture({
      classifications: { ...p1.classifications, "i-1": reversed },
    });
    expect(canonicalProjectPayload(p1)).toBe(canonicalProjectPayload(p2));
  });

  it("indépendant de ingestion.extractedAt (non décisionnel)", () => {
    const p1 = projectFixture();
    const p2 = projectFixture({
      ingestion: { source: "text", extractedAt: "1999-01-01T00:00:00Z" },
    });
    expect(canonicalProjectPayload(p1)).toBe(canonicalProjectPayload(p2));
  });

  it("change si un level change", () => {
    const p1 = projectFixture();
    const bumped = { ...p1.classifications["i-1"] };
    bumped.cells = bumped.cells.map((c) =>
      c.dim === "C" ? { ...c, level: 4 as const } : c
    );
    const p2 = projectFixture({
      classifications: { ...p1.classifications, "i-1": bumped },
    });
    expect(canonicalProjectPayload(p1)).not.toBe(canonicalProjectPayload(p2));
  });
});

describe("signature.sha256Hex", () => {
  it('hash connu pour "abc"', async () => {
    // Référence FIPS 180-4 : SHA-256("abc")
    const h = await sha256Hex("abc");
    expect(h).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("produit toujours 64 caractères hex", async () => {
    const h = await sha256Hex("nutriview");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("signature.canonicalPerimeterPayload / computePerimeterHash", () => {
  it("ne dépend que des données du périmètre", () => {
    const p = projectFixture();
    const onlyI1a = canonicalPerimeterPayload(p, ["i-1"]);
    const onlyI1b = canonicalPerimeterPayload(p, ["i-1"]);
    expect(onlyI1a).toBe(onlyI1b);
    // un périmètre {i-1} diffère du périmètre {i-1, i-2}
    expect(canonicalPerimeterPayload(p, ["i-1"])).not.toBe(
      canonicalPerimeterPayload(p, ["i-1", "i-2"])
    );
  });

  it("le périmètre complet égale le projet entier", () => {
    const p = projectFixture();
    expect(canonicalPerimeterPayload(p, ["i-1", "i-2"])).toBe(
      canonicalProjectPayload(p)
    );
  });

  it("computePerimeterHash produit un hex SHA-256 stable", async () => {
    const p = projectFixture();
    const h1 = await computePerimeterHash(p, ["i-1"]);
    const h2 = await computePerimeterHash(p, ["i-1"]);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("signature.computeProjectHash", () => {
  it("hash d'un projet est stable", async () => {
    const p = projectFixture();
    const h1 = await computeProjectHash(p);
    const h2 = await computeProjectHash(p);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("signature.formatHashShort", () => {
  it("tronque en `6…6` chars", () => {
    expect(
      formatHashShort(
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      )
    ).toBe("012345…abcdef");
  });
  it("retourne l'entrée si trop courte", () => {
    expect(formatHashShort("abc")).toBe("abc");
  });
});

describe("signature.allItemsClassified / allItemsValidated", () => {
  it("classified : false si catalogue vide", () => {
    expect(allItemsClassified(projectFixture({ items: [], classifications: {} }))).toBe(false);
  });
  it("classified : true quand tous les items ont une classification", () => {
    expect(allItemsClassified(projectFixture())).toBe(true);
  });
  it("validated : false par défaut", () => {
    expect(allItemsValidated(projectFixture())).toBe(false);
  });
  it("validated : true quand tous les items ont .validation", () => {
    const p = projectFixture();
    p.items = p.items.map((it) => ({
      ...it,
      validation: { validatedAt: "now", validatedBy: "owner" },
    }));
    expect(allItemsValidated(p)).toBe(true);
  });
});
