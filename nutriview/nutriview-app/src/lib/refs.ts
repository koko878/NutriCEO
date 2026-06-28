// =====================================================================
// NutriView — référentiels de gouvernance (Phase 6).
//
// 4 référentiels gérés depuis l'écran Admin in-app :
//   - Entités            (ex : OCP Nutricrops, OCP SA…)
//   - Functions / BU     (ex : Data & AI, Core IT, HR…)  → rattachées à une entité
//   - Data Domain Owners (signataires potentiels — login = futur UPN Azure AD)
//   - Data Domains       (ex : RH & Paie, Finance…)      → portés par un owner
//
// Identité : on stocke le `login` WordPress comme clé stable. Le jour où le
// SSO Entra ID est branché, login == UPN, donc rien à migrer.
// =====================================================================

export interface Entity {
  id: string;
  name: string; // ex "OCP Nutricrops"
  code?: string; // ex "NCR"
  active: boolean;
}

export interface BusinessUnit {
  id: string;
  name: string; // ex "Data & AI"
  entityId?: string; // rattachement à une Entité
  active: boolean;
}

export interface DataDomainOwner {
  id: string;
  name: string; // affichage : "Hamza Kohen"
  login: string; // user_login WP == futur UPN Azure AD (clé d'identité)
  email?: string;
  title?: string; // "Chief Data Officer"
  active: boolean;
}

export interface DataDomain {
  id: string;
  name: string; // ex "RH & Paie"
  ownerId?: string; // → DataDomainOwner.id
  buId?: string; // → BusinessUnit.id (BU pilote)
  description?: string;
  active: boolean;
}

export interface Refs {
  entities: Entity[];
  businessUnits: BusinessUnit[];
  dataDomains: DataDomain[];
  dataDomainOwners: DataDomainOwner[];
}

export const EMPTY_REFS: Refs = {
  entities: [],
  businessUnits: [],
  dataDomains: [],
  dataDomainOwners: [],
};

// ---------------------------------------------------------------------------
// Seed par défaut — sert (a) à la démo standalone, (b) au tout premier run WP
// avant que l'admin ne saisisse ses propres référentiels. Volontairement
// minimaliste et cohérent avec le contexte OCP Nutricrops.
// ---------------------------------------------------------------------------
export function seedRefs(): Refs {
  const e1: Entity = { id: "ent_ncr", name: "OCP Nutricrops", code: "NCR", active: true };
  const e2: Entity = { id: "ent_ocp", name: "OCP SA", code: "OCP", active: true };

  const bu1: BusinessUnit = { id: "bu_dai", name: "Data & AI (D²nAI)", entityId: e1.id, active: true };
  const bu2: BusinessUnit = { id: "bu_it", name: "Core IT", entityId: e1.id, active: true };
  const bu3: BusinessUnit = { id: "bu_hr", name: "Ressources Humaines", entityId: e1.id, active: true };
  const bu4: BusinessUnit = { id: "bu_fin", name: "Finance & Contrôle", entityId: e2.id, active: true };

  const o1: DataDomainOwner = {
    id: "own_cdo",
    name: "Chief Data Officer",
    login: "cdo",
    title: "Chief Data Officer",
    active: true,
  };
  const o2: DataDomainOwner = {
    id: "own_hr",
    name: "HR Data Owner",
    login: "hr.owner",
    title: "HRBP Data",
    active: true,
  };
  const o3: DataDomainOwner = {
    id: "own_fin",
    name: "Finance Data Owner",
    login: "fin.owner",
    title: "Contrôle de gestion",
    active: true,
  };

  const d1: DataDomain = { id: "dom_hr", name: "RH & Paie", ownerId: o2.id, buId: bu3.id, active: true };
  const d2: DataDomain = { id: "dom_fin", name: "Finance & Comptabilité", ownerId: o3.id, buId: bu4.id, active: true };
  const d3: DataDomain = { id: "dom_data", name: "Données analytiques & IA", ownerId: o1.id, buId: bu1.id, active: true };

  return {
    entities: [e1, e2],
    businessUnits: [bu1, bu2, bu3, bu4],
    dataDomainOwners: [o1, o2, o3],
    dataDomains: [d1, d2, d3],
  };
}

// ---------------------------------------------------------------------------
// Helpers de résolution — utilisés par les écrans projet et la synthèse.
// ---------------------------------------------------------------------------

export function entityById(refs: Refs, id?: string): Entity | undefined {
  return id ? refs.entities.find((e) => e.id === id) : undefined;
}

export function buById(refs: Refs, id?: string): BusinessUnit | undefined {
  return id ? refs.businessUnits.find((b) => b.id === id) : undefined;
}

export function domainById(refs: Refs, id?: string): DataDomain | undefined {
  return id ? refs.dataDomains.find((d) => d.id === id) : undefined;
}

export function ownerById(refs: Refs, id?: string): DataDomainOwner | undefined {
  return id ? refs.dataDomainOwners.find((o) => o.id === id) : undefined;
}

/** Owner (objet) rattaché à un data domain donné. */
export function ownerOfDomain(refs: Refs, domainId?: string): DataDomainOwner | undefined {
  const d = domainById(refs, domainId);
  return ownerById(refs, d?.ownerId);
}

/** Résout un data domain par son nom (insensible casse/espaces). */
export function resolveDomainByName(refs: Refs, name?: string): DataDomain | undefined {
  if (!name) return undefined;
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const target = norm(name);
  if (!target) return undefined;
  return refs.dataDomains.find((d) => d.active && norm(d.name) === target);
}

// Mots trop génériques pour discriminer un domaine (évite que "Données
// analytiques & IA" capte toutes les lignes contenant « données »).
const DOMAIN_STOPWORDS = new Set([
  "donnees",
  "donnée",
  "données",
  "data",
  "domain",
  "domaine",
  "projet",
  "fichier",
  "base",
  "registre",
]);

/** Retire accents pour une comparaison robuste. */
function deburr(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/**
 * Suggère le data domain le plus probable pour un texte (nom + description
 * d'une donnée), par recoupement des mots significatifs du nom du domaine.
 * Déterministe, fonctionne hors IA. Renvoie l'id ou undefined.
 */
export function suggestDomainId(refs: Refs, text: string): string | undefined {
  const hay = deburr((text || "").toLowerCase());
  if (!hay.trim()) return undefined;
  let best: { id: string; score: number } | undefined;
  for (const d of refs.dataDomains.filter((x) => x.active)) {
    const words = deburr(d.name.toLowerCase())
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !DOMAIN_STOPWORDS.has(w));
    let score = 0;
    for (const w of words) if (hay.includes(w)) score++;
    if (score > 0 && (!best || score > best.score)) {
      best = { id: d.id, score };
    }
  }
  return best?.id;
}

/** BU actives d'une entité (ou toutes si entité non précisée). */
export function busOfEntity(refs: Refs, entityId?: string): BusinessUnit[] {
  return refs.businessUnits.filter(
    (b) => b.active && (!entityId || b.entityId === entityId)
  );
}

/** Génère un id stable préfixé. */
export function refUid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/** Nettoie/valide un objet Refs venant d'une source externe (boot/REST/LS). */
export function normalizeRefs(raw: unknown): Refs {
  if (!raw || typeof raw !== "object") return seedRefs();
  const r = raw as Partial<Refs>;
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const out: Refs = {
    entities: arr<Entity>(r.entities),
    businessUnits: arr<BusinessUnit>(r.businessUnits),
    dataDomains: arr<DataDomain>(r.dataDomains),
    dataDomainOwners: arr<DataDomainOwner>(r.dataDomainOwners),
  };
  // Si tout est vide, on considère qu'on n'a jamais été configuré → seed.
  const total =
    out.entities.length +
    out.businessUnits.length +
    out.dataDomains.length +
    out.dataDomainOwners.length;
  return total === 0 ? seedRefs() : out;
}
