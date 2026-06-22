// =====================================================================
// NutriBudget v0.3 — canonical data model (React/TS migration)
// EngagementLine + integrated payment tracking. Mirrors v0.2 vanilla
// app + BESOINS-GESTION-BUDGET-v2.md. Tactical bridge before Anaplan.
// =====================================================================

export type CostType = "CAPEX" | "OPEX";
export type Currency = "MAD" | "USD" | "EUR";
export type PayStatus = "draft" | "pending" | "blocked" | "paid";

export interface EngagementLine {
  id: string;
  bu: string;
  costType: CostType;
  cat: string;
  project: string;
  vendor: string;
  sponsor: string;
  spoc: string;
  amount: number;
  cur: Currency;
  otp: string;
  po: string;
  pay: PayStatus;
  payNote: string;
  justif: string;
  progress: number;
}

export const BUS = [
  "Digital Solutions",
  "Core IT",
  "Data & AI",
  "Africa",
  "Brazil",
  "North America",
  "HR",
] as const;

export const CATS = [
  "Consulting & professional fees",
  "Licences & subscriptions",
  "Infrastructure & cloud",
  "Build / projet",
  "Run / maintenance",
  "Business operations",
] as const;

export const CURRENCIES: Currency[] = ["MAD", "USD", "EUR"];

// Conversion rates to MAD (editable). Indicative — to be wired to an official rate.
export type Rates = Record<Currency, number>;
export const DEFAULT_RATES: Rates = { MAD: 1, USD: 10.0, EUR: 10.8 };

export const PAY_LABELS: Record<PayStatus, string> = {
  draft: "Brouillon",
  pending: "En attente",
  blocked: "Bloqué",
  paid: "Payé",
};

export const PAY_ORDER: Record<PayStatus, number> = {
  blocked: 0,
  pending: 1,
  draft: 2,
  paid: 3,
};

// Realistic seed (derived from the budget mails — illustrative amounts). 13 lines.
export const SEED: EngagementLine[] = [
  { id: "L-001", bu: "Digital Solutions", costType: "CAPEX", cat: "Licences & subscriptions", project: "Salesforce — CRM (3rd wave)", vendor: "Salesforce", sponsor: "Waseem Rashid", spoc: "Fatima Z. Chraibi", amount: 758423, cur: "USD", otp: "IV-003411-002", po: "3960018865", pay: "blocked", payNote: "Bloqué dans SAP (Budget control)", justif: "Licences CRM cœur — déjà déployées, paiement à régulariser.", progress: 90 },
  { id: "L-002", bu: "Digital Solutions", costType: "OPEX", cat: "Licences & subscriptions", project: "Salesforce — Slack", vendor: "Salesforce", sponsor: "Waseem Rashid", spoc: "Fatima Z. Chraibi", amount: 45000, cur: "USD", otp: "GT-004202-014", po: "", pay: "blocked", payNote: "Bloqué Procurement (SAP)", justif: "Collaboration équipes Digital.", progress: 60 },
  { id: "L-003", bu: "HR", costType: "CAPEX", cat: "Build / projet", project: "HR Connect — licences (Workday)", vendor: "Teal", sponsor: "Karim Yousfi", spoc: "Saoussane El Hannachi", amount: 4094225, cur: "MAD", otp: "", po: "", pay: "blocked", payNote: "Bloqué Procurement (SAP)", justif: "Socle SIRH groupe — déploiement Workday.", progress: 55 },
  { id: "L-004", bu: "HR", costType: "OPEX", cat: "Run / maintenance", project: "HR Connect — AMS / support", vendor: "Teal", sponsor: "Karim Yousfi", spoc: "Saoussane El Hannachi", amount: 545261, cur: "MAD", otp: "", po: "", pay: "pending", payNote: "En attente OTP", justif: "Maintenance applicative SIRH.", progress: 40 },
  { id: "L-005", bu: "Data & AI", costType: "OPEX", cat: "Run / maintenance", project: "Data platform run : external support (ref 137)", vendor: "BINewVision", sponsor: "Hamza Kohen", spoc: "Faïçal Congo", amount: 2000000, cur: "MAD", otp: "", po: "", pay: "pending", payNote: "Avenant 2 en cours", justif: "Ressources Data/DevSecOps critiques pour le maintien en conditions opérationnelles, en attente d’internalisation (freeze recrutement).", progress: 70 },
  { id: "L-006", bu: "Data & AI", costType: "CAPEX", cat: "Build / projet", project: "COO Cockpit — tableaux de bord direction Opérations", vendor: "BINewVision", sponsor: "Hamza Kohen", spoc: "Faïçal Congo", amount: 1040000, cur: "MAD", otp: "", po: "", pay: "pending", payNote: "OTP à fournir", justif: "Cockpit décisionnel COO — build par vagues puis maintenance évolutive.", progress: 80 },
  { id: "L-007", bu: "Data & AI", costType: "OPEX", cat: "Consulting & professional fees", project: "Data Catalog & Metadata Management", vendor: "OCP Solutions", sponsor: "Hamza Kohen", spoc: "Marwane Bouayad", amount: 900000, cur: "MAD", otp: "", po: "", pay: "draft", payNote: "", justif: "Déploiement OpenMetadata comme catalogue data Nutricrops — gouvernance (PoV 2025).", progress: 30 },
  { id: "L-008", bu: "Data & AI", costType: "CAPEX", cat: "Consulting & professional fees", project: "Data platform framing", vendor: "BCG", sponsor: "Hamza Kohen", spoc: "Faïçal Congo", amount: 320000, cur: "EUR", otp: "", po: "", pay: "draft", payNote: "Proposition reçue", justif: "Cadrage stratégique plateforme data.", progress: 15 },
  { id: "L-009", bu: "Digital Solutions", costType: "CAPEX", cat: "Build / projet", project: "NutriTravel — volet National (web)", vendor: "Teal", sponsor: "Karim Yousfi", spoc: "Saoussane El Hannachi", amount: 513714, cur: "MAD", otp: "", po: "", pay: "draft", payNote: "Estimation indicative", justif: "Gestion NDF & OM — extension plateforme NutriTravel.", progress: 10 },
  { id: "L-010", bu: "Digital Solutions", costType: "OPEX", cat: "Licences & subscriptions", project: "Mulesoft — intégrateur", vendor: "Salesforce", sponsor: "Waseem Rashid", spoc: "Fatima Z. Chraibi", amount: 85425, cur: "USD", otp: "IV-004130-001", po: "", pay: "paid", payNote: "Réglé", justif: "Intégration applicative.", progress: 100 },
  { id: "L-011", bu: "Digital Solutions", costType: "OPEX", cat: "Licences & subscriptions", project: "Microsoft 365 E5 — 500 licences", vendor: "MicroData", sponsor: "Waseem Rashid", spoc: "Faïçal Congo", amount: 5033000, cur: "MAD", otp: "", po: "", pay: "blocked", payNote: "HT non payé — litige", justif: "Licences M365 achetées, paiement en souffrance.", progress: 100 },
  { id: "L-012", bu: "Data & AI", costType: "OPEX", cat: "Consulting & professional fees", project: "Mission architecture d’entreprise (MVA)", vendor: "OGESSI", sponsor: "Hamza Kohen", spoc: "Faïçal Congo", amount: 15 * 9000, cur: "MAD", otp: "", po: "", pay: "pending", payNote: "15 JH consommés (TJM 9000)", justif: "Architecture AS-IS / cible, sync task-force MVA groupe.", progress: 35 },
  { id: "L-013", bu: "Core IT", costType: "CAPEX", cat: "Infrastructure & cloud", project: "Budget CAPEX Core IT Nutricrops", vendor: "OCP Group (Backbone)", sponsor: "El Hassane Moubarak", spoc: "Marwane Bouayad", amount: 3000000, cur: "MAD", otp: "", po: "", pay: "draft", payNote: "Consolidé Core IT", justif: "Socle infrastructure Core IT.", progress: 25 },
];

export const LS_KEY = "nutribudget_v2";
