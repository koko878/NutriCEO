// =====================================================================
// Tests unitaires du moteur déterministe (SPEC §6 + Annexe I).
// Run : `npm test` (vitest).
// =====================================================================

import { describe, it, expect } from "vitest";
import { classeOf, isSensible, verdictCloud, graduatedMeasures } from "./engine";
import type { Classe, Level } from "./model";

const LEVELS: Level[] = [0, 1, 2, 3, 4];
const CLASSE_OF_MAX: Record<number, Classe> = {
  0: "V",
  1: "IV",
  2: "III",
  3: "II",
  4: "I",
};

describe("classeOf — agrégation MAX", () => {
  it("retourne la bonne classe pour les 125 combinaisons (C,I,D) ∈ {0..4}³", () => {
    for (const c of LEVELS) {
      for (const i of LEVELS) {
        for (const d of LEVELS) {
          const expected = CLASSE_OF_MAX[Math.max(c, i, d)];
          expect(classeOf({ C: c, I: i, D: d })).toBe(expected);
        }
      }
    }
  });

  it("est commutative — l'ordre des dimensions ne change pas le résultat", () => {
    expect(classeOf({ C: 3, I: 1, D: 0 })).toBe(
      classeOf({ C: 0, I: 1, D: 3 })
    );
    expect(classeOf({ C: 4, I: 2, D: 1 })).toBe(
      classeOf({ C: 1, I: 2, D: 4 })
    );
  });
});

describe("isSensible — règle loi 05-20 (C ≥ 3 ET classe ∈ {I, II})", () => {
  it("(C=3, I=0, D=0) → sensible (classe II, C=3)", () => {
    expect(isSensible({ C: 3, I: 0, D: 0 })).toBe(true);
  });

  it("(C=2, I=4, D=0) → NON sensible (classe I mais C=2 < 3)", () => {
    // Cas piège : classe I (max=4) mais la confidentialité reste à 2,
    // donc pas de règle de résidence MA.
    expect(isSensible({ C: 2, I: 4, D: 0 })).toBe(false);
  });

  it("(C=4, I=0, D=0) → sensible (classe I, C=4)", () => {
    expect(isSensible({ C: 4, I: 0, D: 0 })).toBe(true);
  });

  it("(C=3, I=2, D=0) → sensible (classe II, C=3)", () => {
    expect(isSensible({ C: 3, I: 2, D: 0 })).toBe(true);
  });

  it("(C=3, I=3, D=2) → sensible (classe II, C=3)", () => {
    // Exemple #2 du jeu d'éval SPEC §13 : données géologiques.
    expect(isSensible({ C: 3, I: 3, D: 2 })).toBe(true);
  });

  it("(C=0, I=1, D=0) → NON sensible (classe IV)", () => {
    // Exemple #4 du jeu d'éval SPEC §13 : bulletin météo public.
    expect(isSensible({ C: 0, I: 1, D: 0 })).toBe(false);
  });

  it("(C=2, I=2, D=2) → NON sensible (classe III)", () => {
    // Exemple #1 du jeu d'éval : données financières internes.
    expect(isSensible({ C: 2, I: 2, D: 2 })).toBe(false);
  });
});

describe("verdictCloud — discriminated union", () => {
  it("renvoie eligible=false avec la bonne raison pour une donnée sensible", () => {
    const v = verdictCloud({ C: 4, I: 0, D: 0 });
    expect(v.eligible).toBe(false);
    if (!v.eligible) {
      expect(v.reason).toBe(
        "données sensibles loi 05-20 — résidence MA obligatoire"
      );
    }
  });

  it("renvoie eligible=true avec les conditions Annexe I pour une donnée non sensible", () => {
    const v = verdictCloud({ C: 0, I: 0, D: 0 });
    expect(v.eligible).toBe(true);
    if (v.eligible) {
      expect(Array.isArray(v.conditions)).toBe(true);
      expect(v.conditions.length).toBeGreaterThan(0);
    }
  });

  it("classe I non-confidentielle (C=2, I=4) reste éligible — pas la résidence MA", () => {
    const v = verdictCloud({ C: 2, I: 4, D: 0 });
    expect(v.eligible).toBe(true);
  });
});

describe("graduatedMeasures — palier par classe + cumulatif", () => {
  it("Classe V = baseline (traçabilité + sauvegardes)", () => {
    const m = graduatedMeasures("V");
    expect(m).toContain("Traçabilité des actions sur la donnée");
    expect(m).toContain("Sauvegardes régulières");
    expect(m).not.toContain("Contrôle d'accès basique (authentification utilisateur)");
    expect(m).not.toContain("Chiffrement au repos");
    expect(m).not.toContain("MFA obligatoire pour les accès");
    expect(m).not.toContain("MFA renforcée (phishing-resistant)");
  });

  it("Classe IV inclut baseline + contrôle d'accès + journalisation", () => {
    const m = graduatedMeasures("IV");
    expect(m).toContain("Traçabilité des actions sur la donnée");
    expect(m).toContain("Contrôle d'accès basique (authentification utilisateur)");
    expect(m).toContain("Journalisation des accès");
    expect(m).not.toContain("Chiffrement au repos");
    expect(m).not.toContain("MFA obligatoire pour les accès");
  });

  it("Classe III inclut chiffrement au repos + TLS, mais pas MFA", () => {
    const m = graduatedMeasures("III");
    expect(m).toContain("Chiffrement au repos");
    expect(m).toContain("Sécurisation des transferts (TLS)");
    expect(m).toContain("Contrôle d'accès basique (authentification utilisateur)");
    expect(m).not.toContain("MFA obligatoire pour les accès");
    expect(m).not.toContain("Segmentation réseau");
  });

  it("Classe II inclut MFA + restriction physique + audit trimestriel", () => {
    const m = graduatedMeasures("II");
    expect(m).toContain("MFA obligatoire pour les accès");
    expect(m).toContain("Restriction physique des locaux serveurs");
    expect(m).toContain("Audit de sécurité trimestriel");
    expect(m).toContain("Chiffrement au repos");
    expect(m).not.toContain("Segmentation réseau");
    expect(m).not.toContain("Monitoring 24/7");
  });

  it("Classe I inclut tout (MFA renforcée + segmentation + E2E + monitoring + PCA)", () => {
    const m = graduatedMeasures("I");
    expect(m).toContain("MFA renforcée (phishing-resistant)");
    expect(m).toContain("Segmentation réseau");
    expect(m).toContain("Chiffrement bout-en-bout");
    expect(m).toContain("Monitoring 24/7");
    expect(m).toContain("Plan de continuité testé annuellement");
  });

  it("Cumulatif strict : Classe I ⊇ Classe II ⊇ Classe III ⊇ Classe IV ⊇ Classe V", () => {
    const v = new Set(graduatedMeasures("V"));
    const iv = new Set(graduatedMeasures("IV"));
    const iii = new Set(graduatedMeasures("III"));
    const ii = new Set(graduatedMeasures("II"));
    const i = new Set(graduatedMeasures("I"));
    for (const m of v) expect(iv.has(m)).toBe(true);
    for (const m of iv) expect(iii.has(m)).toBe(true);
    for (const m of iii) expect(ii.has(m)).toBe(true);
    for (const m of ii) expect(i.has(m)).toBe(true);
  });
});
