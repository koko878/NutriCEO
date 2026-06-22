# Gestion du budget Nutricrops — Tableau de besoins v2

> Itération de la v1 après lecture complète des 79 mails (jan→juin 2026). v2 apporte :
> **(1)** un regroupement des 18 besoins en **6 épics**, **(2)** un **modèle de données canonique** (la colonne vertébrale qui résout à elle seule la moitié des douleurs), **(3)** un axe **quick-win vs structurel** + estimation d'effort, **(4)** un **mapping vers la spec PoV Agent Task Force CAPEX** (fichier séparé `MAPPING-POV-TASKFORCE.md`).
> Source de vérité de ce projet : ce document + le deck. Statut : **brouillon de cadrage**.

---

## 1. Le problème, reformulé après v1

Trois angles morts, confirmés mail après mail :

1. **Pas de source de vérité unique** — la SharePoint « Digital CAPEX View » est censée faire foi, mais ~15 Excel circulent en pièces jointes, chacun « la dernière version ». Drift systémique.
2. **Pas de lien stable ressource ↔ ligne ↔ engagement ↔ OTP/PO ↔ facture ↔ paiement** — le savoir vit dans 2-3 têtes (Faïçal, Hamza). Reconstruction = appel téléphonique.
3. **La chaîne d'exécution est opaque** — les blocages SAP/Procurement/Legal se découvrent à J-3 du paiement, pas avant.

Conséquence : l'équipe DSI fait un travail de **resaisie + relance + justification**, pas de pilotage. Les Task Forces imposent des deadlines à **1 heure** sur des données qui devraient être disponibles en un clic.

---

## 2. Les 6 épics (regroupement des 18 besoins v1)

| Épic | Besoins v1 couverts | Cœur | Priorité épic |
|---|---|---|---|
| **E1 — Référentiel unique des engagements** | 1, 3, 7 | Une table canonique CAPEX+OPEX, multi-devise, qui remplace les 15 Excel | **P0** |
| **E2 — Mapping ressources & prestataires** | 4, 9, 15 | Qui est payé sur quelle ligne, à quel TJM, sur quel contrat/SOW, pour quel livrable | **P0** |
| **E3 — Chaîne d'exécution & paiement** | 5, 8, 16 | PR→OTP→PO→SAP→facture→paiement + réalisé vs engagé + alertes saturation | **P0** |
| **E4 — Justifications & arbitrages** | 6, 10, 13, 14 | Justifications structurées défendables + scénarios (Zero Progress / Nouveaux projets) + traçabilité décisions | **P1** |
| **E5 — Anti-redondance & agent** | 2, 12, 17 | Répondre une fois aux N Task Forces + calendrier deadlines + renouvellements licences. **C'est ici que vit l'agent Task Force CAPEX.** | **P1** |
| **E6 — Conformité & inter-entité** | 11, 18 | Cross-charge intra-groupe (qui paie qui, markups Teal/OCPS) + garde-fous PII | **P2** |

---

## 3. Modèle de données canonique (la colonne vertébrale)

> C'est l'apport central de la v2. Si on ne construit qu'**une** chose, c'est ça : un schéma typé unique sur lequel toutes les Task Forces se branchent. Aligné avec la spec PoV (`EngagementLine` / `ResourceAssignment`) et enrichi des entités révélées par les mails.

### `EngagementLine` (la ligne budgétaire — entité centrale)
```ts
interface EngagementLine {
  id: string;                  // stable (projet + description)
  scope: "Digital" | "Core IT" | "BU" | string;
  bu: string;                  // Digital Solutions / Africa / BR / NA / NOCP…
  costType: "CAPEX" | "OPEX";
  recurring: boolean;          // recurring vs non-recurring (mails Younes/Waseem)
  projectTitle: string;
  description: string;
  vendor: string;              // FK → Vendor (normaliser BINewVision / BI NewVision)
  sponsor: string;             // qui défend la ligne en comité
  spoc: string;                // point de contact opérationnel
  budgetAmount: number;        // montant engagé (⚠ colonne "Budget Year" du fichier)
  currency: "MAD" | "USD" | "EUR";
  budgetAmountMAD: number;     // converti, pour consolidation
  priority: number;
  projectProgressPct: number;  // 0-100 (demandé par TF CAPEX mai 2026)
  engagementStartDate: string;
  engagementEndDate: string;
  stopImpact: string;          // liste déroulante (demandé par TF CAPEX)
  stopImpactComment: string;
  sourceRef: { fileName: string; sheet: string; row: number; webUrl: string };
}
```

### `ResourceAssignment` (rattachement ressource externe ↔ ligne)
```ts
interface ResourceAssignment {
  resourceName: string;        // ex: "Ayoub Reda", "Ziad Fellah"
  role: string;                // ex: "Senior Platform Engineering / DevSecOps"
  vendor: string;              // BINewVision / Teal / OGESSI…
  dailyRate: number;           // TJM
  dailyRateCurrency: "MAD" | "USD" | "EUR";
  daysConsumed: number;        // ex: "15 JH consommés depuis Go Waseem mars"
  engagementLineId: string;    // FK → EngagementLine
  scopeOfWork: string;
  internalizationStatus: string; // "à internaliser dès feu vert" (freeze recrutement)
  sourceRef: { fileName: string; section: string };
}
```

### `PaymentTracking` (la chaîne d'exécution — révélée par les mails Oumaima/Saoussane)
```ts
interface PaymentTracking {
  engagementLineId: string;    // FK
  da: string;                  // Demande d'Achat
  otp: string;                 // OTP (clé pour identifier le réalisé)
  po: string;                  // Bon de commande / PO (SAP)
  invoiceRef: string;
  amountProcured: number;
  amountInvoiced: number;
  amountPaid: number;
  status: "draft" | "pending-legal" | "pending-procurement"
        | "blocked-sap" | "blocked-topmgmt" | "received" | "paid";
  blockedBy: string;           // "Budget control" | "Procurement" | "Legal" | "Top mgmt"
  blockReason: string;         // ex: "Blocked in SAP", "missing documents"
  sourceRef: { fileName: string; webUrl: string };
}
```

### `Vendor` (master prestataire) + `Justification` (défendabilité)
```ts
interface Vendor {
  canonicalName: string;       // "BINewVision"
  aliases: string[];           // ["BI new vision", "BI NewVision", "BINEW Vision"]
  contracts: { ref: string; signed: boolean; amendments: string[];
               startDate: string; endDate: string; sow: string }[];
  groupEntity: boolean;        // Teal / OCPS = entité groupe (markup à tracer)
}

interface Justification {            // template TF OPEX 18/06 (8 champs)
  engagementLineId: string;
  operationalObjective: string;      // (i) objectif opérationnel
  concreteDeliverable: string;       // (ii) livrable, PAS la solution
  hardDeadline: string;              // (iii) date limite impérative
  businessImpact: string;            // (iv) impact entreprise
  internalCompetenceExists: boolean; // (7-i) expertise interne ?
  internalizationOption: string;     // Teal / OCPS / interne
  budgetSizing: string;              // (8) dimensionnement
  defendabilityScore?: number;       // garde-fou "justification faible"
}
```

**Pourquoi ce modèle change tout** : les 4-5 templates Excel des Task Forces (CAPEX, OPEX, EPM, BBZ, Core IT) sont tous des **projections** de ces 5 entités. Saisir une fois → générer N exports. Fin de la resaisie (besoin #2).

---

## 4. Tableau v2 — besoins, effort, type

| # | Besoin | Épic | Type | Effort | Priorité | Dépend de |
|---|---|---|---|---|---|---|
| 1 | Source de vérité unique des engagements | E1 | Structurel | M | P0 | — |
| 3 | Modèle de donnée canonique | E1 | Structurel | S | P0 | — (fondation) |
| 4 | Mapping ressource ↔ ligne | E2 | Structurel | M | P0 | #3 |
| 5 | Suivi PR→OTP→PO→SAP→facture→paiement | E3 | Structurel | L | P0 | #3 |
| 6 | Justifications structurées défendables | E4 | Quick-win | S | P0 | #3 |
| 2 | Anti-redondance (1 saisie → N exports TF) | E5 | Structurel | M | P0 | #1, #3 |
| 7 | Multi-devise + conversion consolidée | E1 | Quick-win | S | P1 | #3 |
| 8 | Forecast vs réalisé à date | E3 | Structurel | M | P1 | #5 |
| 9 | Catalogue prestataires + contrats + avenants | E2 | Quick-win | S | P1 | #3 |
| 10 | Workflow scénarios d'arbitrage | E4 | Structurel | M | P1 | #1 |
| 13 | Détection « justification faible / champ vide » | E4 | Quick-win | S | P1 | #6 |
| 12 | Calendrier deadlines TF + comités | E5 | Quick-win | XS | P2 | — |
| 14 | Historique décisions & traçabilité | E4 | Structurel | M | P2 | #1 |
| 15 | Rattachement budget ↔ roadmap projet (JH) | E2 | Structurel | M | P2 | #4 |
| 16 | Alerte budget engagé saturé | E3 | Quick-win | S | P2 | #8 |
| 11 | Inter-entité : qui paie qui (cross-charge) | E6 | Structurel | L | P2 | #1, #9 |
| 17 | Anticipation renouvellements licences | E5 | Quick-win | S | P3 | #9 |
| 18 | Garde-fous PII / refus RH | E6 | Quick-win | XS | P3 | — |

Effort : XS (<1j) · S (1-3j) · M (1-2 sem) · L (>2 sem).

**Lecture stratégique** : 3 fondations (#3 modèle, #1 référentiel, #4 mapping) débloquent 80% du reste. Les quick-wins #6, #13, #12, #16 donnent de la valeur visible vite. Le gros morceau structurel est #5 (chaîne paiement) et #11 (cross-charge intra-groupe).

---

## 5. Séquence recommandée

- **Socle (sem 1-2)** : #3 modèle canonique → #1 référentiel unique (import des Excel existants) → #4 mapping ressources. *La fondation de tout.*
- **Valeur visible (sem 2-3)** : #6 justifications structurées + #13 détection champs faibles + #2 export multi-TF (1 saisie → N templates). *Le gain « fini la resaisie » que l'équipe ressent immédiatement.*
- **Exécution (sem 3-5)** : #5 chaîne paiement + #8 réalisé vs engagé + #16 alertes. *La visibilité bout-en-bout.*
- **Pilotage (sem 5+)** : #10 scénarios arbitrage, #14 traçabilité, #11 cross-charge, agent E5.

---

*v2 · D²nAI · juin 2026 · base 79 mails · branche `claude/budget-nutricrops`. Voir aussi : deck `deck/budget-pitch.html` et mapping `MAPPING-POV-TASKFORCE.md`.*
