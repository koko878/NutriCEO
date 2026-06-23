// =====================================================================
// NutriView — corpus d'exemples Annexe II (graine).
// Source : SPEC §13 + REFERENTIEL §3. Volontairement minimal — Hamza
// pourra l'enrichir au fil des projets et en s'appuyant sur le PDF du
// guide DGSSI v1.0 (08/07/2025).
//
// TODO Phase 4 — enrichir depuis Annexe II PDF complet (35 p.).
//   - voir spec/guide-dgssi-classification.pdf
//   - structurer par section + numéro de page pour la citation IA
// =====================================================================

import type { Dim, Level } from "./model";

export type Annexe2Corpus = Record<Dim, Record<Level, string[]>>;

export const ANNEXE2: Annexe2Corpus = {
  C: {
    0: [
      "Bulletin météo public",
      "Communiqués de presse publiés",
      "Pages web corporate publiques",
    ],
    1: [
      "Notes de service à diffusion restreinte",
      "Documents internes opérationnels",
      "Annuaire interne (sans données sensibles)",
    ],
    2: [
      "Données financières internes consolidées",
      "Données RH (salaires individuels)",
      "Comptes-rendus de comités opérationnels",
    ],
    3: [
      "Données géologiques de gisements",
      "Plans détaillés d'IIV",
      "Stratégies commerciales confidentielles",
    ],
    4: [
      "Mots de passe de comptes privilégiés",
      "Clés cryptographiques racines",
      "Secrets d'authentification système (ServicePrincipal Azure prod)",
    ],
  },
  I: {
    0: [
      "Documentation publique",
      "Brochures marketing publiées",
    ],
    1: [
      "Documents de travail collaboratifs",
      "Brouillons de notes internes",
    ],
    2: [
      "Référentiels produits",
      "Données contractuelles fournisseurs",
      "Catalogues internes",
    ],
    3: [
      "Données comptables certifiées",
      "Données de paie",
      "Données qualité produit (analyses laboratoire)",
    ],
    4: [
      "Données de contrôle commande industriel IIV",
      "Paramètres de sécurité fonctionnelle (SIS)",
    ],
  },
  D: {
    0: [
      "Archives froides hors-ligne",
      "Sauvegardes historiques rarement consultées",
    ],
    1: [
      "Intranet documentaire",
      "Sites informationnels secondaires",
    ],
    2: [
      "Outils de reporting internes",
      "Plateformes de partage documentaire BU",
    ],
    3: [
      "ERP financier",
      "Messagerie d'entreprise",
      "Plateformes collaboratives critiques",
    ],
    4: [
      "Système d'authentification central",
      "Plateforme de contrôle process IIV",
      "SCADA / supervision industrielle",
    ],
  },
};

/**
 * Récupère les exemples Annexe II pour (dim, niveau) — utilisé par
 * le panneau latéral « Voir exemples » de l'écran Classify.
 */
export function examplesFor(dim: Dim, level: Level): string[] {
  return ANNEXE2[dim][level];
}
