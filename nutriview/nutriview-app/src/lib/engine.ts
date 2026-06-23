// =====================================================================
// NutriView — moteur déterministe (SPEC §6).
// Le calcul classe + verdict cloud + mesures Annexe I est PUREMENT
// mécanique. Aucun appel IA n'est fait depuis ce module — c'est même
// un garde-fou (cf. SPEC §8 point 4).
// =====================================================================

import type { Classe, Level } from "./model";

export interface Levels {
  C: Level;
  I: Level;
  D: Level;
}

/**
 * Agrégation MAX → classe.
 * Mapping : niveau 0 → V (sans impact) … niveau 4 → I (très grave).
 * Cf. SPEC §6 + REFERENTIEL §4.
 */
export function classeOf(levels: Levels): Classe {
  const max = Math.max(levels.C, levels.I, levels.D);
  return (["V", "IV", "III", "II", "I"] as Classe[])[max];
}

/**
 * Données sensibles loi 05-20 = C ≥ 3 ET classe ∈ {I, II}.
 * Cf. SPEC §6 + REFERENTIEL §5.
 */
export function isSensible(levels: Levels): boolean {
  const c = classeOf(levels);
  return levels.C >= 3 && (c === "I" || c === "II");
}

export type VerdictCloud =
  | {
      eligible: false;
      reason: "données sensibles loi 05-20 — résidence MA obligatoire";
    }
  | { eligible: true; conditions: string[] };

/**
 * Verdict cloud déterministe — JAMAIS demandé au LLM (SPEC §8.4).
 */
export function verdictCloud(levels: Levels): VerdictCloud {
  if (isSensible(levels)) {
    return {
      eligible: false,
      reason: "données sensibles loi 05-20 — résidence MA obligatoire",
    };
  }
  return { eligible: true, conditions: graduatedMeasures(classeOf(levels)) };
}

// ---------------------------------------------------------------------------
// Mesures Annexe I, graduées par classe. Liste cumulative : une classe plus
// stricte hérite des mesures des classes moins strictes.
// La palette ci-dessous est un sous-ensemble représentatif de l'Annexe I
// (Gestion des accès / Sécurité environnement / Cycle de vie) — à enrichir
// en Phase 4 quand le PDF Annexe I sera dépouillé en intégralité.
// ---------------------------------------------------------------------------

/** Mesures applicables quelle que soit la classe (y compris V). */
const BASELINE_ALL: string[] = [
  "Traçabilité des actions sur la donnée",
  "Sauvegardes régulières",
];

/** Mesures additionnelles à partir de la classe IV (impact ≥ limité). */
const TIER_IV: string[] = [
  "Contrôle d'accès basique (authentification utilisateur)",
  "Journalisation des accès",
];

/** Mesures additionnelles à partir de la classe III (impact ≥ modéré). */
const TIER_III: string[] = [
  "Chiffrement au repos",
  "Sécurisation des transferts (TLS)",
];

/** Mesures additionnelles à partir de la classe II (impact ≥ grave). */
const TIER_II: string[] = [
  "MFA obligatoire pour les accès",
  "Restriction physique des locaux serveurs",
  "Audit de sécurité trimestriel",
];

/** Mesures additionnelles à partir de la classe I (impact ≥ très grave). */
const TIER_I: string[] = [
  "MFA renforcée (phishing-resistant)",
  "Segmentation réseau",
  "Chiffrement bout-en-bout",
  "Monitoring 24/7",
  "Plan de continuité testé annuellement",
];

/**
 * Mesures cumulatives par classe (cf. Annexe I du guide DGSSI).
 * Classe I = toutes les mesures ; Classe V = baseline seulement.
 */
export function graduatedMeasures(classe: Classe): string[] {
  const measures: string[] = [...BASELINE_ALL];
  // Cumulatif : on ajoute les paliers atteints.
  if (
    classe === "IV" ||
    classe === "III" ||
    classe === "II" ||
    classe === "I"
  ) {
    measures.push(...TIER_IV);
  }
  if (classe === "III" || classe === "II" || classe === "I") {
    measures.push(...TIER_III);
  }
  if (classe === "II" || classe === "I") {
    measures.push(...TIER_II);
  }
  if (classe === "I") {
    measures.push(...TIER_I);
  }
  return measures;
}
