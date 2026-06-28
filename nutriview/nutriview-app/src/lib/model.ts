// =====================================================================
// NutriView — modèle canonique (cf. SPEC §5).
// Reproduit à l'identique. Toute modification doit passer par la SPEC.
// =====================================================================

export type Dim = "C" | "I" | "D"; // confidentialité / intégrité / disponibilité
export type Level = 0 | 1 | 2 | 3 | 4; // 0=sans impact ... 4=très grave
export type Classe = "I" | "II" | "III" | "IV" | "V";

/** Région de rattachement du projet (périmètre géographique Nutricrops). */
export type Region =
  | "Global"
  | "Brazil"
  | "LATAM"
  | "South West Asia"
  | "Africa";

export const REGIONS: Region[] = [
  "Global",
  "Brazil",
  "LATAM",
  "South West Asia",
  "Africa",
];

export interface DataItem {
  // une "donnée" au sens DGSSI (Annexe II)
  id: string; // stable
  name: string; // ex: "Données géologiques de site"
  description: string; // 1-3 phrases (humain)
  cycleLifeStates: (
    | "création"
    | "traitement"
    | "stockage"
    | "transit"
    | "archivage"
  )[];
  sourceRef?: { fileName: string; locator: string }; // d'où l'IA l'a tirée
  proposedByAI: boolean;
  /** Data domain de rattachement (référentiel gouvernance, optionnel). */
  dataDomainId?: string;
  status: "draft" | "ai_classified" | "owner_validated" | "signed";
  /** Validation owner ligne par ligne — set quand Validate confirme l'item. */
  validation?: {
    validatedAt: string; // ISO
    validatedBy: string; // user_login
    ownerNote?: string;
  };
}

export interface ClassificationCell {
  dim: Dim;
  level: Level; // niveau 0-4
  rationale: string; // pourquoi (cite Annexe II si IA)
  citations: { section: string; quote?: string }[]; // traçabilité guide
  aiProposed?: { level: Level; rationale: string }; // pour voir la modif owner
}

export interface Classification {
  itemId: string;
  cells: ClassificationCell[]; // 3 cells: C, I, D
  classe: Classe; // = MAX(C,I,D) appliqué via mapping
  sensible: boolean; // C >= 3 && classe ∈ {I, II}
  verdictCloud:
    | {
        eligible: false;
        reason: "données sensibles loi 05-20 — résidence MA obligatoire";
      }
    | { eligible: true; conditions: string[] }; // mesures à respecter
  suggestedMeasures: string[]; // graduées selon classe (Annexe I)
  history: ClassificationEvent[];
}

export interface ClassificationEvent {
  ts: string; // ISO
  actor: string; // user_login
  action:
    | "ai_propose"
    | "owner_edit"
    | "owner_validate"
    | "owner_sign"
    | "ai_reroll";
  delta?: Record<string, unknown>; // ce qui a changé
}

export interface Project {
  id: string;
  title: string;
  /** Business unit Nutricrops (libellé affiché — rétro-compat). */
  bu?: string;
  /** Région de rattachement (périmètre géographique). */
  region?: Region;
  /** Liens vers les référentiels de gouvernance (Phase 6, optionnels). */
  entityId?: string;
  buId?: string;
  dataDomainId?: string;
  /** Description courte saisie à la création (optionnelle). */
  description?: string;
  owner: string; // chef de projet
  dataOwner: string; // propriétaire des données (signataire)
  ingestion: {
    source: "excel" | "pdf" | "word" | "text" | "email";
    fileName?: string;
    extractedAt: string;
  };
  items: DataItem[];
  classifications: Record<string, Classification>;
  status: "drafting" | "in_review" | "signed" | "rejected";
  /** Trace de l'envoi en validation (Phase 5). */
  submission?: {
    submittedAt: string; // ISO — passage drafting → in_review
    submittedBy: string; // chef de projet qui a demandé la validation
  };
  signature?: {
    signedBy: string;
    signedAt: string;
    contentHash: string; // SHA-256 du JSON canonique de la classif
  };
  /** Note du propriétaire en cas de rejet (Phase 5). */
  rejection?: {
    rejectedAt: string;
    rejectedBy: string;
    reason: string;
  };
}

// ---------------------------------------------------------------------------
// Petits libellés FR (non-spec, utilisés par l'UI). Centralisés ici pour
// rester cohérents entre les écrans.
// ---------------------------------------------------------------------------
export const LEVEL_LABELS: Record<Level, string> = {
  0: "Sans impact",
  1: "Limité",
  2: "Modéré",
  3: "Grave",
  4: "Très grave",
};

export const DIM_LABELS: Record<Dim, string> = {
  C: "Confidentialité",
  I: "Intégrité",
  D: "Disponibilité",
};

export const CLASSE_LABELS: Record<Classe, string> = {
  I: "Classe I — très grave",
  II: "Classe II — grave",
  III: "Classe III — modéré",
  IV: "Classe IV — limité",
  V: "Classe V — sans impact",
};

export const STORE_KEY = "nutriview_v0";
