# SPEC : NutriView — Classification DGSSI assistée par IA

> **Spec-Driven Development.** Ce document est la source d'autorité du projet.
> L'agent codegen n'implémente rien qui ne soit pas spécifié ici. Toute déviation = question ouverte, pas tranchée silencieusement.
> Référentiel encodé : `REFERENTIEL-DGSSI.md` (synthèse du Guide DGSSI v1.0 du 08/07/2025).

---

## 1. Contexte et problème

Chaque projet digital ou data de Nutricrops doit, **avant son lancement**, faire l'objet d'une classification de ses données selon le référentiel DGSSI (loi 05-20 + décret 2-21-406). Cette classification détermine :

- les politiques de gouvernance à appliquer (gestion d'accès, chiffrement, sauvegardes, audit, etc.) ;
- l'**éligibilité au cloud étranger** : si la donnée est sensible au sens DGSSI (C ≥ 3 ET classe ∈ {I, II}), la **résidence territoriale au Maroc est obligatoire**.

Aujourd'hui, l'exercice est manuel, lent, et peu reproductible. Conséquences observées : décisions cloud différées, exposition au risque de non-conformité, friction entre équipes Digital et RSSI/CDO.

## 2. Objectif de NutriView

Permettre à un chargé de projet de **produire une classification DGSSI complète en < 30 minutes** pour un projet typique, validée et signée par le propriétaire des données, avec une traçabilité opposable.

### Non-objectifs (hors périmètre v1)

- Pas de signature électronique qualifiée (eIDAS / décret marocain) — la "signature" v1 = validation horodatée + hash du contenu + identité authentifiée.
- Pas de gestion des phases « Protection / Réévaluation / Suppression » du cycle DGSSI (NutriView ne s'occupe que des phases **Identification + Classification + suggestions de Protection**).
- Pas de catalogue de données pérenne multi-projets (chaque exercice = un projet ; consolidation = phase 2).
- Pas de génération de policies cloud / templates Terraform à partir du verdict (phase 2).
- Pas de connecteurs SharePoint / Teams ingestion (v1 = upload manuel ; phase 2 = connecteur).

## 3. Critères de succès (mesurables)

- **Conformité** : 100 % des classifications produites par NutriView restent traçables ligne par ligne à une section du guide DGSSI (Annexe II principalement).
- **Productivité** : sur un brief projet typique de 5 pages contenant ~15 données, NutriView produit un draft complet en **< 5 minutes** (ingestion + extraction catalogue + classification IA).
- **Qualité IA** : sur le jeu d'évaluation (§ 13), ≥ **90 % des suggestions IA sont validées sans modification** par le propriétaire.
- **Adhésion** : la signature du propriétaire est obtenue en **< 48 h** sur les 3 premiers projets pilotes (mesure du friction réel).
- **Sécurité** : **0 donnée du brief projet ne sort du tenant Nutricrops** (Databricks France Central / EU West uniquement).

## 4. Architecture cible

```
┌────────────────────── NutriView (front + plugin WP) ──────────────────────┐
│                                                                            │
│  Ingestion           Catalogue          Classification       Validation    │
│  ─────────           ─────────          ──────────────       ──────────    │
│  • Excel (xlsx)      • Lignes typées    • IA suggère C/I/D   • Inbox       │
│  • PDF (pdf.js)      • Schema canonique • Moteur MAX → I-V   • Comments    │
│  • Word (mammoth)    • Édition manuelle • Verdict cloud      • Ajustement  │
│  • Texte / mail      • Métadonnées       • Justifications     • Signature  │
│  • Brief libre        projet            • Mesures Annexe I    horodatée    │
│                                                                            │
└──────────────────┬──────────────────────────────────┬─────────────────────┘
                   │                                   │
                   │ REST (nonce same-origin)          │ wp_mail (notif)
                   ▼                                   ▼
        ┌──────────────────────┐         ┌──────────────────────────┐
        │  WordPress backend   │         │  Propriétaire des données │
        │  • table custom MySQL│         │  (Chief Data Officer /    │
        │  • REST dnai/nview   │         │   data domain owner)      │
        │  • auth WP std       │         └──────────────────────────┘
        │  (SSO Entra ID = p2) │
        └──────────┬───────────┘
                   │ Databricks SDK (token Key Vault)
                   ▼
        ┌──────────────────────────────┐
        │  Databricks Model Serving    │
        │  workspace Nutricrops (FR/EU)│
        │  endpoint compatible OpenAI  │
        │  (système prompt strict +    │
        │   schéma JSON de sortie)     │
        └──────────────────────────────┘
```

**Principe directeur** : le brief projet et les noms de données ne sortent JAMAIS du tenant Nutricrops. L'IA tourne sur Databricks Model Serving (FR Central ou EU West, à confirmer) avec un endpoint compatible OpenAI Chat Completions.

## 5. Modèle de données canonique

```ts
type Dim = "C" | "I" | "D";           // confidentialité / intégrité / disponibilité
type Level = 0 | 1 | 2 | 3 | 4;       // 0=sans impact ... 4=très grave
type Classe = "I" | "II" | "III" | "IV" | "V";

interface DataItem {                   // une "donnée" au sens DGSSI (Annexe II)
  id: string;                          // stable
  name: string;                        // ex: "Données géologiques de site"
  description: string;                 // 1-3 phrases (humain)
  cycleLifeStates: ("création" | "traitement" | "stockage" | "transit" | "archivage")[];
  sourceRef?: { fileName: string; locator: string };  // d'où l'IA l'a tirée
  proposedByAI: boolean;
  status: "draft" | "ai_classified" | "owner_validated" | "signed";
}

interface ClassificationCell {
  dim: Dim;
  level: Level;                        // niveau 0-4
  rationale: string;                   // pourquoi (cite Annexe II si IA)
  citations: { section: string; quote?: string }[];  // traçabilité guide
  aiProposed?: { level: Level; rationale: string };  // pour voir la modif owner
}

interface Classification {
  itemId: string;
  cells: ClassificationCell[];         // 3 cells: C, I, D
  classe: Classe;                      // = MAX(C,I,D) appliqué via mapping
  sensible: boolean;                   // C >= 3 && classe ∈ {I, II}
  verdictCloud:
    | { eligible: false; reason: "données sensibles loi 05-20 — résidence MA obligatoire" }
    | { eligible: true;  conditions: string[] };  // mesures à respecter
  suggestedMeasures: string[];         // graduées selon classe (Annexe I)
  history: ClassificationEvent[];
}

interface ClassificationEvent {
  ts: string;                          // ISO
  actor: string;                       // user_login
  action: "ai_propose" | "owner_edit" | "owner_validate" | "owner_sign" | "ai_reroll";
  delta?: Record<string, unknown>;     // ce qui a changé
}

interface Project {
  id: string;
  title: string;
  owner: string;                       // chef de projet
  dataOwner: string;                   // propriétaire des données (signataire)
  ingestion: {
    source: "excel" | "pdf" | "word" | "text" | "email";
    fileName?: string;
    extractedAt: string;
  };
  items: DataItem[];
  classifications: Record<string, Classification>;
  status: "drafting" | "in_review" | "signed" | "rejected";
  signature?: {
    signedBy: string;
    signedAt: string;
    contentHash: string;               // SHA-256 du JSON canonique de la classif
  };
}
```

## 6. Le moteur d'agrégation (cœur déterministe — pas d'IA)

```ts
function classeOf(levels: { C: Level; I: Level; D: Level }): Classe {
  const max = Math.max(levels.C, levels.I, levels.D);
  return (["V", "IV", "III", "II", "I"] as Classe[])[max];
}

function isSensible(levels: { C: Level; I: Level; D: Level }): boolean {
  const c = classeOf(levels);
  return levels.C >= 3 && (c === "I" || c === "II");
}

function verdictCloud(levels: { C: Level; I: Level; D: Level }) {
  if (isSensible(levels)) {
    return { eligible: false as const, reason: "données sensibles loi 05-20 — résidence MA obligatoire" };
  }
  // sinon : éligible cloud (souverain ou étranger selon politique interne) avec mesures graduées
  return { eligible: true as const, conditions: graduatedMeasures(classeOf(levels)) };
}
```

**Cette logique ne passe JAMAIS par l'IA.** Le verdict cloud est un calcul mécanique, traçable, auditable.

## 7. Rôle de l'IA (l'agent classifieur)

L'IA est appelée pour **trois tâches distinctes**, chacune avec un schéma JSON de sortie strict :

### Tâche 1 — Extraction du catalogue depuis un brief
Entrée : texte brut du brief (extrait par pdf.js / mammoth / xlsx-text / paste).
Sortie : `DataItem[]` (sans classification — juste l'inventaire).

### Tâche 2 — Classification d'une donnée
Entrée : un `DataItem` + contexte projet (BU, criticité métier, audience).
Sortie : `{ C: ClassificationCell, I: ClassificationCell, D: ClassificationCell }` avec rationale et citations à l'Annexe II.

### Tâche 3 — Suggestion de mesures (Annexe I, graduées)
Entrée : la classe finale (I-V).
Sortie : `string[]` (liste de mesures parmi la palette Annexe I, filtrées selon la classe).

**Système prompt commun** (extrait, à durcir en implémentation) :
> Tu es l'assistant de classification DGSSI de Nutricrops. Tu réponds UNIQUEMENT en t'appuyant sur le guide DGSSI v1.0 (annexé en contexte) et la loi 05-20. Si la donnée n'apparaît pas dans les exemples du guide, propose un niveau par analogie en citant l'exemple le plus proche. Ne réponds JAMAIS sans citation. Réponds en JSON strict conforme au schéma fourni.

## 8. Garde-fous (rails non négociables)

1. **Souveraineté** : appels IA uniquement vers Databricks workspace Nutricrops (résidence EU/MA). Aucun appel direct OpenAI / Anthropic / Google depuis le serveur. Toute clé en Key Vault, jamais en clair dans le repo.
2. **Citation obligatoire** : toute classification proposée par l'IA cite au moins une section ou un exemple de l'Annexe II. Sans citation → la suggestion est rejetée et marquée "à classer manuellement".
3. **Propriétaire = source de vérité** : `Project.status = signed` exige une signature du `dataOwner`. L'IA ne signe jamais.
4. **Calcul du verdict cloud déterministe** : implémenté en TypeScript pur, jamais demandé au LLM (qui peut se tromper sur une règle binaire).
5. **Traçabilité totale** : chaque évènement (proposition IA, édition owner, validation, signature) est journalisé avec horodatage + acteur. Le hash de signature couvre le JSON canonique de la classification (un changement = invalide la signature).
6. **Réversibilité** : un propriétaire peut « rouvrir » une classification signée (ce qui crée une nouvelle version, ne perd jamais l'ancienne).
7. **Pas de PII inutile** : le brief peut contenir des PII (noms d'agents, contacts) — l'app les conserve mais ne les envoie au LLM que masqués (placeholder) sauf consentement explicite case-par-cas.

## 9. Stack et contraintes techniques

- **Front** : React 18 + TypeScript + Tailwind CSS v4 + Framer Motion + Phosphor Icons.
- **Build** : Vite + `vite-plugin-singlefile` → un seul `index.html` auto-contenu (cohérence pattern NutriBudget v0.4).
- **Plugin WordPress** : `dnai-nutriview/` — full-screen route `/nutriview` + shortcode `[nutriview]`.
- **Backend** :
  - Table custom `{prefix}dnai_nview_store` (collection PK, data JSON, updated_at, updated_by).
  - REST `dnai/nview/v1/...` : `GET/PUT collection/{projects}`, `POST item/projects`, `DELETE item/projects/{id}`, plus `POST classify` (proxy vers Databricks).
  - Auth WP standard : lecture = connecté, écriture = `edit_posts`. SSO Entra ID = phase finale.
  - Notifications : `wp_mail` pour notifier le propriétaire qu'une classification l'attend.
- **Ingestion** (toutes côté navigateur, données ne sortent pas) :
  - Excel : `xlsx` (SheetJS).
  - PDF : `pdfjs-dist` (texte uniquement, pas OCR).
  - Word : `mammoth` (.docx → texte).
  - PPT : non parsé (v1 ; on demande copier-coller du texte).
  - Email : `.eml` parsé en JS ; `.msg` non supporté v1 (on demande conversion).
- **IA backend** : Databricks Model Serving, endpoint compatible OpenAI Chat Completions. Modèle exact = à confirmer (Llama 3.1 70B Instruct ou DBRX Instruct). Configuration via WP options + Key Vault.
- **Charte D²nAI** : Cormorant Garamond (titres) + Inter (corps), palette verte OCP, vert OCP unique en accent (cohérence NutriBudget/NutriPlan).

## 10. Sécurité, souveraineté, conformité

- Tous les services dans la souscription Azure Nutricrops, région **France Central** (zone EU = acceptable vu le PoV, idéal serait MA mais peu de PaaS y sont).
- Databricks workspace Nutricrops uniquement. Aucun appel LLM externe.
- Journalisation : qui a soumis quoi, quand, hash du contenu envoyé/reçu.
- Le PDF du guide DGSSI est versionné dans le repo (source d'autorité opposable).
- NutriView est lui-même un projet digital → son propre exercice de classification fera partie du PoV (méta-validation : on classifie NutriView avec NutriView).

## 11. Gates et Definition of Done

CI obligatoire, chaque gate bloque le merge :
- `typecheck` strict TS (pas de `any` implicite).
- `lint` (eslint partagé avec NutriBudget si possible).
- `test:unit` : moteur d'agrégation, mapping classe, isSensible, verdictCloud, schema validation des sorties IA.
- `test:eval` : jeu d'éval (§13) passe au seuil fixé.
- `scan:secrets` : aucun token committé.
- `php -l` sur les fichiers PHP du plugin.
- Build Vite single-file succeeds (< 2 Mo gzipped).

DoD d'une fonctionnalité : code + tests + gates + une entrée au jeu d'éval si nouveau type de question.

## 12. Workflow utilisateur (les écrans)

1. **Nouveau projet** : titre, BU, propriétaire des données (sélection user WP), chef de projet, description courte.
2. **Ingestion** : drop d'un fichier OU collage de texte OU "je veux saisir manuellement les données".
3. **Catalogue** (IA tâche 1 sur les ingestions automatiques) : table des `DataItem` proposés, éditable. L'utilisateur valide ou complète la liste avant de demander la classification.
4. **Classification** (IA tâche 2 par ligne) : pour chaque donnée, 3 sliders C/I/D 0-4 pré-remplis par l'IA, avec sa justification + citation. Calcul live de la classe + verdict cloud. Édition libre.
5. **Synthèse** : tableau de toutes les données classées, KPIs (combien de sensibles, distribution classes), **verdict cloud global du projet** (= si au moins une donnée sensible, le projet l'est).
6. **Envoi en validation** : bouton "Envoyer au propriétaire". Mail + entrée dans son inbox NutriView.
7. **Inbox propriétaire** : liste des projets en attente. Ouverture → lecture seule + actions {commenter une ligne, ajuster un niveau (et donc invalider la justification IA), valider, rejeter}.
8. **Signature** : bouton "Signer" en bas une fois toutes les lignes validées. Confirmation explicite → hash + timestamp + identité.
9. **Synthèse finale signée** : export PDF imprimable du dossier (page de garde projet + tableau + verdict + signature + horodatage + référence guide DGSSI v1.0).

## 13. Jeu d'évaluation (acceptance)

À étendre, jamais à supprimer.

| # | Entrée | Vérité terrain | Catégorie |
|---|---|---|---|
| 1 | Brief projet "Cockpit consolidation budget Digital" | Données financières internes → C=2, I=2, D=2 → Classe III, cloud éligible avec mesures | structuré |
| 2 | Ligne "Données géologiques de gisements de phosphates Nutricrops" | C=3, I=3, D=2 → Classe II, sensible, résidence MA obligatoire | structuré |
| 3 | Ligne "Mots de passe ServicePrincipal Azure prod" | C=4 → Classe I, sensible, MA obligatoire | structuré |
| 4 | Ligne "Bulletin météo public site corporate" | C=0, I=1, D=0 → Classe IV, cloud sans restriction | structuré |
| 5 | Brief "Plateforme RH Workday" — extract auto du catalogue | ≥ 4 données détectées : payroll, contrats, évaluations, données médicales | extraction |
| 6 | Donnée hors corpus / inventée | IA répond "à classer manuellement, pas d'analogie suffisante" | abstention |
| 7 | Utilisateur sans rôle propriétaire essaie de signer | Refusé (capability) | sécurité |
| 8 | Donnée tagged sensible → tentative d'export verdict "cloud étranger OK" | Impossible (verdict déterministe, pas d'override) | garde-fou |

## 14. Découpage en phases (objectif : MVP démonstrable en 2 semaines)

- **Phase 0 (J1)** : scaffolding (Vite/React/TS/Tailwind), squelette plugin WP, table MySQL, branche `claude/nutriview` + CI minimale.
- **Phase 1 (J2-J3)** : moteur déterministe (`classeOf`, `isSensible`, `verdictCloud`, mesures Annexe I), tests unitaires, **fonctionne sans IA**.
- **Phase 2 (J4-J5)** : écran Catalogue + Classification (CRUD `DataItem`, sliders C/I/D, calcul live, synthèse projet).
- **Phase 3 (J6-J7)** : ingestion multi-format (Excel/PDF/Word/texte) côté navigateur, extraction texte vers buffer.
- **Phase 4 (J8-J9)** : branchement IA (Databricks Model Serving), prompts strict + schéma JSON, garde-fou citation obligatoire.
- **Phase 5 (J10-J11)** : workflow validation/signature (inbox, notifications mail, hash de signature, export PDF).
- **Phase 6 (J12)** : jeu d'éval + passage des gates + démo CDO / RSSI.
- **Phase 7 (post-MVP)** : SSO Entra ID, connecteur SharePoint, catalogue multi-projets, génération templates policies cloud.

## 15. Décisions à confirmer (questions ouvertes)

| # | Question | Pourquoi ça bloque (ou pas) | Quand on doit trancher |
|---|---|---|---|
| Q1 | Statut IIV exact de Nutricrops (loi 05-20) | Détermine si la conformité est obligatoire ou volontaire. N'impacte pas la mécanique, juste la communication. | Avant la démo |
| Q2 | Endpoint Databricks workspace + nom du modèle disponible (Llama 3.1 70B ? DBRX Instruct ? autre ?) | Bloque la Phase 4 (branchement IA). L'archi peut continuer sans, mock-IA accepté en attendant. | Avant Phase 4 (J8) |
| Q3 | Qui sont les **data domain owners** Nutricrops (liste, mail) ? Le CDO existe-t-il formellement, ou c'est Hamza qui porte ce rôle ad interim ? | Bloque le workflow signature (à qui on route ?). Mock pour le PoV, vrai mapping post-MVP. | Avant phase 5 (J10) |
| Q4 | Cataloguer des projets multiples ou un seul à la fois ? | v1 = un projet par exercice (la spec actuelle). Multi-projets = phase 7. À confirmer. | Maintenant |
| Q5 | Signature électronique : on reste sur "valide + horodate + hash" pour le PoV, ou tu veux brancher un service e-signature (DocuSign/CertEurope/Watiqa) ? | Phase 7 si on veut une vraie e-sign qualifiée. v1 = preuve technique suffisante pour un PoV interne. | Maintenant |
| Q6 | NutriView doit-il aussi gérer la phase **Réévaluation périodique** (relance auto N mois après signature) ? | v1 = non (juste un champ "à réévaluer le …"). Job cron WP = phase 2. | Maintenant |
| Q7 | Verdict cloud nuancé : juste binaire (éligible / non), ou catalogue par fournisseur (Azure FR Central ✓, AWS US ✗, GCP EU ✓ avec mesures, etc.) ? | v1 = binaire + une note "résidence MA obligatoire" si non éligible. Catalogue fournisseurs = phase 2. | Maintenant |

---

*Rédigé par D²nAI · juin 2026 · sur la base de `REFERENTIEL-DGSSI.md` + 3 décisions cadrage (autonomie IA: propose-valide, stack: React/Vite/single-file, backend IA: Databricks souverain). Source d'autorité du projet NutriView jusqu'à itération.*
