# NutriPlan v0.7 — Cadrage : retours métier + Gestion de Projet + écran Admin

> Synthèse du brief de Hamza (15 juin 2026) après les sessions de revue
> métier. Trois entrées : (A) 37 retours consolidés depuis les exports
> feedback, (B) intégration de la couche Gestion de Projet spécifiée dans
> l'Excel SAI, (C) cadrage de l'écran Admin + inventaire complet des
> reference data administrables.
>
> Participants revue : El Tahiri Abdelali, Kilito Houda, El Jaddaoui Halima,
> Hannane Khalid, Chraibi Fatima-Zahra. Source : transcript + 5 fichiers
> feedback (clic-droit) + `Annual_Trial_Cycle_Template-SAI - V2.xlsx`.

---

## 0. Le changement structurant n°1 — Projet → Trial

C'est le point le plus important du brief, et il vient à la fois du
transcript et de l'Excel.

**Aujourd'hui** : NutriPlan gère des *Use Cases* (= trials) à plat.

**Demande métier** (Hannane Khalid + Kilito Houda dans le transcript,
confirmé par le feedback #2 d'Abdelali et la structure de l'Excel) :
il existe **un process amont** qui déclare, valide et suit des **Projets**
(niveau Call for Proposal, avec UM6P et partenaires). Les **trials se
rattachent à un projet** (N trials par projet).

> Houda : *« il y a 2 choses : tout ce qui est Call for Proposal, donc les
> projets de façon globale avec l'UM6P… et après tout ce qui est trial.
> Il faudrait faire la distinction. »*
> Abdelali (#2) : *« We would like to link projects to trials. Can we start
> with a list of information defining the project first and from there get
> into trials? »*

**Conséquence sur le modèle de données** : on introduit une entité
**Projet** parent. Hiérarchie cible :

```
Projet (Call for Proposal · UM6P/partenaire · budget pluriannuel)
  └── Trial 1  (rattaché au projet, hérite Entity/Country/Region/Crop/Partner)
  └── Trial 2
  └── Trial N
```

Les champs `🔒 From Project Identification` dans l'Excel confirment
l'héritage : Entity, Project Title, Partner/Vendor, Country, Region, Crop
sont **saisis au niveau Projet** et **hérités (lecture seule)** au niveau
Trial.

---

## A. Retours métier consolidés (37 items)

Dédupliqués depuis les 5 exports. Classés par nature et priorité.

### A.1 — Bugs à corriger (P0, ça casse la confiance en démo)

| # | Vue | Bug | Source |
|---|---|---|---|
| B1 | Portefeuille / Cockpit | **Un Use Case créé n'apparaît nulle part** (ni dashboard, ni portefeuille) | Houda #34, transcript 24:00 — confirmé bug DB par Hamza |
| B2 | Nouveau Use Case | **Barre de recherche ne fonctionne pas** | Houda #31, Abdelali #20 |
| B3 | Nouveau Use Case | **Upload de documents impossible** | Houda #32 |
| B4 | Nouveau Use Case · KPIs & MDS | **Saisie KPIs / Minimum Data Set impossible** | Houda #36 |
| B5 | Nouveau Use Case · Périmètre | **Date de fin n'est pas contrôlée vs date de début** → ajouter un contrôle | Houda #37 |
| B6 | Nouveau Use Case · Budget | **« ID lié au budget ? »** — champ ID budget pas clair / cassé | Houda #35 |
| B7 | Closure & KB | **Bouton Éditer inactif** | Houda #27 |
| B8 | Closure & KB | **Export PDF ne fonctionne pas** | Houda #28 |
| B9 | Comités & gouvernance | **Aucune mise à jour quand on ajoute des Use Cases** | Houda #33 |

→ **B1, B2, B3, B4 sont les plus urgents** : ils bloquent le parcours
nominal de création/consultation. Sans eux, aucune démo crédible.

### A.2 — Quick wins UX (P1, peu d'effort, fort signal)

| # | Vue | Demande | Source |
|---|---|---|---|
| Q1 | Portefeuille | **Filtres sur les en-têtes de colonnes** | Abdelali #21 |
| Q2 | Portefeuille | **Visualiser par trials ET par projet** | Abdelali #17 |
| Q3 | Cockpit / Controls | **Les KPIs cliquables doivent filtrer le portefeuille** (pas juste l'ouvrir brut) — % fast track, % transform→DEMO/Launch, % on time | Abdelali #6, #22 |
| Q4 | Nouveau Use Case | **Section pièces jointes (optionnelle)** | Abdelali #19 |
| Q5 | Nouveau Use Case · Budget | **Protocole Word obligatoire**, créé par le trial owner, référence pour le steering committee | Abdelali #25 |
| Q6 | Nouveau Use Case · Budget | **Partenaire « Autre » → saisie libre du nom officiel** | Abdelali #23 |
| Q7 | Fast Track | **Choix explicite Fast Track / Standard** (Trial Urgency) | Abdelali #5 |
| Q8 | Comités | **Harmoniser les numéros de Gate** (Halima) | Abdelali #7 |
| Q9 | Référentiels | **« Taxonomie » mal orthographié / à clarifier** | Houda #30 |

### A.3 — Évolutions de fond (P2, à cadrer dans cette v0.7)

| # | Sujet | Demande | Source |
|---|---|---|---|
| F1 | **Projet → Trial** | Lier projets et trials, saisir le projet d'abord | Abdelali #2 (cf. §0) |
| F2 | **Formulaire trial = onglets de l'Excel** | Chaque onglet du formulaire = une feuille de l'Excel SAI (catégorie d'info) | Abdelali #24 |
| F3 | **Dashboard informatif** | Template PPT « PPT TRIAL DASHBOARD » à fournir par SAI | Abdelali #18 |
| F4 | **Ajout de référence par l'utilisateur** | Un user peut proposer une référence → **process de validation par SAI** | Abdelali #4 |
| F5 | **Élargir les BU** | Ajouter BU Nutrition, BU Green Solution, etc. (customisation) | Abdelali #3, Houda #29 |
| F6 | **Calendrier annuel** | Plusieurs ajustements de dates (cf. A.4) | Abdelali #8–16 |
| F7 | **Steering date** | Comment la date du steering committee se met-elle à jour ? | Houda #26 |

### A.4 — Calendrier annuel (cluster de retours d'Abdelali #8–16)

Le calendrier actuel ne colle pas au vrai cycle. Corrections demandées :

- **Notifications** : démarrent le **1er août**
- **Use Case** : soumission entre **août et septembre**
- **Steering committee** : entre **octobre et novembre**
- **Exécution** : de **janvier à décembre** (étendre, pour accommoder tout
  le monde)
- **Monitoring committee** : appel **mensuel**, de **janvier à décembre**
  (et attention : chevauchement actuel avec d'autres lignes du calendrier)
- **Ajouter** : les **Agri-days**, la visualisation **QBR**
- **Manque identifié** : une **session de revue des géographies** (récolte
  sept→déc) — non prévue dans le process, mais nécessaire car au moment de
  la soumission (sept N-1) les géographies n'ont pas encore le dernier mot
  sur leurs projets/trials

---

## B. Intégration Gestion de Projet (Excel SAI)

L'Excel `Annual_Trial_Cycle_Template-SAI - V2` définit 3 entités + 1 feuille
de références. Voici le modèle de données cible.

### B.1 — Entité PROJET (feuille « Project ID »)

| Champ | Type | Notes |
|---|---|---|
| Project ID | auto | généré |
| Entity | ref BU/Region/Function | dropdown |
| Country | ref | dropdown |
| Region | ref | dépend du pays |
| Crop | ref | dropdown |
| Project Title | texte | |
| Project status | ref | New project / Continuation |
| Partner/Vendor | ref + saisie libre | dénomination légale officielle |
| Contract status | ref | Signed / Under discussion / Not started |
| Strategic alignment line | ref | 1 des 6 lignes (cf. B.4) |
| Number of trials per Project | nombre | |
| Project Description | texte long | rationale, objectif, outcomes attendus |
| Lead | texte/personne | |
| Project owner | texte/personne | |
| Project Start Date | date | |
| Project End Date | date | |
| Objective | texte | |
| Duration | nombre | années fiscales |

### B.2 — Entité BUDGET PROJET (feuille « Project budget »)

Champs hérités du Projet (🔒) + saisie budgétaire :

| Champ | Type | Notes |
|---|---|---|
| Project ID, Entity, Project Title, Partner/Vendor | 🔒 hérités | lecture seule |
| Total budget OPEX | nombre $ | start→end |
| Total budget CAPEX | nombre $ | start→end |
| Duration, Start/End | 🔒 hérités | |
| Year 1 → Year 5 Budget ($) | 5 × nombre | Opex + Amortissement du Capex |
| Exchange rate | nombre | |

### B.3 — Entité TRIAL (feuille « Trial Description »)

3 groupes de champs. Les `🔒` sont hérités du Projet parent.

**Groupe 1 · Trial Information**
Project ID 🔒, Entity 🔒, Project Title 🔒, **Trial Urgency** (Fast track/
Standard), Trial Title, Trial Lead (Partner ou OCP ECOSYSTEM),
Partner/Vendor 🔒, **Trial Class** (ref), **Trial Type** (ref), Hypotheses
(template structuré : *« Under [crop/system/soil], treatment [X] will
improve [outcome] by at least [min effect] vs [control], without reducing
[criterion] »*), Was this tested before (Y/N), If Yes → Trial ID, If Yes →
Trial Report (doc), Operational Objectives, Country 🔒, Region 🔒, Crop 🔒,
Site (1 site = 1 trial, multi-sites = lignes séparées), Start date, End
date, Trial status (ref), Reference protocol (lien SharePoint).

**Groupe 2 · Yield KPI**
Target Product benchmark, Average yield per target region, Target yield,
% improvement.

**Groupe 3 · Economics KPIs**
Farmer Economics (ROI), OCP Products, Collaborators product, Competitors'
products, Budget OPEX, Budget CAPEX.

→ **F2 confirmé** : les onglets du formulaire de création de trial doivent
refléter ces 3 groupes (= les feuilles/sections de l'Excel).

### B.4 — Cartographie : reference data de l'Excel vs app actuelle

| Reference (Excel) | Valeurs Excel | Dans l'app ? | Action |
|---|---|---|---|
| **Trial Class** | Fundamental & Discovery · Validation · Pre-Launch · Demonstrations | ✅ `CLASSES` (4) | aligner libellés |
| **Trial Type** | Controlled Conditions · Field research station · Field Validation Customer/Grower · Laboratory | ⚠️ partiels dans `CLASSES.types` | **réaligner sur les 4 de l'Excel** |
| **Contract Status** | Signed · Under discussion · Not started | ❌ | **à créer** |
| **Project status** | New Project · Continuation | ❌ | **à créer** |
| **Strategic alignment Line** | 6 lignes (Product Dev, Cropping mgmt, Sustainability, Digital Ag, Human/livestock nutrition, Demos market adoption) | ⚠️ `STRATEGIC_OBJECTIVES` (6, à comparer) | **réaligner sur les 6 de l'Excel** |
| **Was tested before** | Yes · No | ❌ (booléen) | trivial |
| **Trial Status** | Ongoing · Planned · Concluded | ⚠️ `STATUSES` (workflow ≠) | **distinguer** statut workflow (gates) vs statut trial (Excel) |
| **Project Response** (type de projet) | Validation trial · Demonstration/Field days · Soil analysis/SIG · Training program · Distributor activation · Blending program · Digital advisory/media · Commercial pilot (8) | ❌ | **à créer** |
| **Trial Urgency** | Fast track · Standard | ⚠️ implicite (fast_track booléen) | **expliciter** (Q7) |

---

## C. Écran Admin — cadrage + inventaire reference data

Objectif : tout ce qui est « liste de valeurs » doit être administrable
sans toucher au code, avec une ergonomie soignée. Plus le besoin métier
F4 (proposition + validation SAI) et F5 (élargir les BU).

### C.1 — Architecture de l'écran (sous-nav)

L'Admin passe à une sous-navigation à 4 onglets internes
(`PREFS.adminTab` mémorisé) :

```
Admin
 ├── 📚 Référentiels      (toutes les reference data — CRUD)
 ├── ⚖️  Gouvernance       (comités, RACI, gates, seuils, SLA, calendrier)
 ├── 👥 Accès & rôles      (RBAC — backend requis, specifié)
 └── 🔗 Intégrations       (SharePoint, exports, audit — backend requis)
```

### C.2 — Inventaire COMPLET des reference data administrables

C'est le cœur de la demande. 14 référentiels identifiés, classés par
domaine. Chaque ligne = une table éditable dans l'onglet Référentiels.

**Domaine Organisation**
| # | Référentiel | Champs | Volumétrie | Notes ergonomie |
|---|---|---|---|---|
| R1 | **Business Units** | code, nom, couleur | ~7→12 | F5 : ajouter Nutrition, Green Solution… |
| R2 | **Pays** | code ISO, nom | ~30 | recherche + tri |
| R3 | **Régions** | nom, pays parent | ~80 | **dépendance pays** (cascade) |
| R4 | **Entités** (BU/Region/Function) | nom, type | ~20 | sert au champ Entity du Projet |

**Domaine Agronomie**
| # | Référentiel | Champs | Volumétrie | Notes |
|---|---|---|---|---|
| R5 | **Cultures** | libellé | ~12→30 | chips éditables |
| R6 | **Produits OCP** | libellé, famille | ~12 | lié au catalogue CGM ? (à mutualiser) |
| R7 | **Produits collaborateurs/concurrents** | libellé, type | libre | nouveau (Excel Economics KPIs) |

**Domaine Taxonomie Trial** (aligné Excel)
| # | Référentiel | Champs | Notes |
|---|---|---|---|
| R8 | **Trial Classes** | libellé, TRL, types[] | 4 — aligner Excel |
| R9 | **Trial Types** | libellé, classe parente | 4 — réaligner Excel |
| R10 | **Trial Status** | libellé | Ongoing/Planned/Concluded |
| R11 | **Trial Urgency** | libellé | Fast track/Standard |

**Domaine Projet** (nouveau, ex-Excel)
| # | Référentiel | Champs | Notes |
|---|---|---|---|
| R12 | **Project Status** | libellé | New/Continuation |
| R13 | **Contract Status** | libellé | Signed/Under discussion/Not started |
| R14 | **Strategic Alignment Lines** | n°, libellé | les 6 lignes |
| R15 | **Project Response types** | libellé | les 8 catégories |
| R16 | **Partenaires / Vendors** | nom légal, type, statut contrat | + « Autre » saisie libre (Q6) |

**Domaine Gouvernance & cadre**
| # | Référentiel | Champs | Notes |
|---|---|---|---|
| R17 | **Minimum Data Set (MDS)** | item, obligatoire o/n | 12 items, toggle |
| R18 | **Macro-phases** | libellé, couleur | 4 (Framework v1.0) |
| R19 | **Comités & Gates** | nom, n° gate, cadence | harmoniser n° (Q8) |
| R20 | **Jalons calendrier annuel** | événement, mois début/fin, récurrence | piloté par A.4 |

→ **20 référentiels** au total. (J'ai dépassé les 14 annoncés en éclatant
proprement les dépendances — c'est plus juste.)

### C.3 — Ergonomie — les 8 principes de l'onglet Référentiels

1. **Liste à gauche, édition à droite** (master-detail) — pas de modale
   qui cache le contexte. Sur mobile, bascule en pile.
2. **Édition inline** pour les référentiels simples (chips : cultures,
   produits) ; **panneau latéral** pour les référentiels riches (BU,
   partenaires, gates).
3. **Recherche + tri** systématiques dès qu'un référentiel > 10 lignes.
4. **Dépendances visibles** : éditer un Pays montre ses Régions liées ;
   supprimer est bloqué si des enfants existent (« 8 régions utilisent ce
   pays »).
5. **Garde-fou suppression** : si une valeur est référencée par un projet
   ou un trial existant → suppression bloquée avec le compte d'usage
   (« 4 trials utilisent cette classe »).
6. **Indicateur de provenance** : badge « Framework v1.0 » (verrouillé,
   modification = alerte) vs « Custom » (libre). Répond à F5 et au besoin
   de ne pas casser le cadre signé CEO.
7. **Réordonnancement** drag-handle pour les listes ordonnées (gates,
   macro-phases, lignes stratégiques numérotées).
8. **Export / Import JSON** par référentiel — pour transférer entre
   environnements et préparer le seed backend.

### C.4 — Workflow « proposition de référence » (F4)

Demande explicite d'Abdelali : un utilisateur peut **proposer** une
nouvelle référence, mais elle doit être **validée par SAI** avant d'entrer
dans le référentiel officiel.

Machine à états proposée :
```
[Proposée par user] → (notification SAI) → [En revue SAI]
     ├── Approuvée → entre dans le référentiel officiel + notif au proposant
     └── Rejetée  → archivée + motif + notif au proposant
```

UI : dans chaque référentiel, un bouton **« + Proposer une valeur »**
(visible par tous) distinct de **« + Ajouter »** (visible SAI/admin). Les
valeurs proposées apparaissent en **état pending** (badge orange) jusqu'à
arbitrage. Un compteur « N propositions en attente » en haut de l'onglet
Référentiels.

**Build** : la mécanique d'état est faisable en front (localStorage) pour
la démo ; la notification réelle + le RBAC SAI nécessitent le backend.

### C.5 — Gouvernance, Accès, Intégrations (rappel, cf. ADMIN-SPEC.md)

- **Gouvernance** 🟢 : comités + RACI + seuils (budget→gate CEO) + SLA +
  **calendrier annuel paramétrable** (absorbe A.4) — saisie/affichage
  faisable maintenant, application au workflow en itération 2.
- **Accès & rôles** 🔴 : RBAC par BU via M365 SSO — spécifié, backend
  requis. Le rôle **SAI** (valideur de références, cf. F4) y est défini.
- **Intégrations** 🔴 : SharePoint (protocoles Word, rapports), exports,
  journal d'audit — backend requis.

---

## D. Plan de livraison proposé (v0.7 → v0.9)

| Version | Contenu | Effort | Dépendance |
|---|---|---|---|
| **v0.7.0** | Bugs P0 (B1-B4) + contrôle dates (B5) + recherche (B2) | front | — |
| **v0.7.1** | Quick wins : filtres portefeuille (Q1), KPIs cliquables filtrants (Q3), Fast/Standard explicite (Q7) | front | — |
| **v0.8.0** | **Couche Projet → Trial** (§0, B) : entité Projet, héritage, vue par projet/trial (Q2), formulaire trial en 3 groupes Excel (F2) | front | modèle données |
| **v0.8.1** | Admin onglet **Référentiels** : 20 reference data CRUD + ergonomie C.3 + provenance (C.6) | front | couche REF |
| **v0.9.0** | Calendrier annuel paramétrable (A.4) + Gouvernance seuils (C.5) | front | — |
| **v0.9.1** | Workflow proposition de référence F4 (mécanique front) + dashboard informatif F3 (attend template PPT SAI) | front | template SAI |
| **backend** | RBAC (rôle SAI), SharePoint, audit, notifications | 🔴 | décision archi |

### En attente de SAI (bloquants externes)
- **Le fichier Excel final** avec toutes les données (Abdelali, fin du
  transcript : *« on revient vers vous avec une version finale de l'Excel
  avec toutes les données »*)
- **Le template PPT « TRIAL DASHBOARD »** (F3)
- **Le format Word du protocole** de référence (Q5)

---

## E. Note skills / rendu

Quand on construira **l'écran Admin réel** (v0.8.1), on passera par
`/redesign-skill` (refonte d'un écran existant) + `/soft-skill` (rendu
« high-end ») pour éviter le rendu générique. Le présent document est le
plan ; le pixel viendra avec ces skills, charte D²nAI conservée (vert OCP,
Cormorant + Inter sur surfaces internes).

---

## F. Prochaine décision à trancher

Deux ordres de marche possibles :

**Option 1 — Crédibilité démo d'abord** : on tape les bugs P0 (v0.7.0)
cette semaine pour que la prochaine revue métier se passe sur une app qui
*marche*, puis on attaque la couche Projet.

**Option 2 — Structure d'abord** : on pose la couche Projet → Trial
(v0.8.0) tout de suite, puisque c'est le changement le plus structurant
et que tout le reste (admin, formulaires) en dépend.

**Ma reco : Option 1.** Les bugs B1-B4 tuent la confiance (un Use Case
créé qui disparaît, c'est rédhibitoire en démo). On stabilise, *puis* on
structure. La couche Projet est trop importante pour être posée sur des
fondations qui buguent.

*Cadrage rédigé par D²nAI · 15 juin 2026 · post-revue métier SAI*
