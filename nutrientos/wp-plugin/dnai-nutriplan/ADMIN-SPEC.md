# NutriPlan — Spec écran d'administration

> Cadrage de l'écran `Admin` (`sc-admin`). État actuel : référentiel en
> lecture seule (BUs, cultures, produits, partenaires, classes/types,
> objectifs, MDS, macro-phases). Objectif : en faire le poste de pilotage
> du référentiel, de la gouvernance et des accès.

Périmètre retenu : **A. Référentiel éditable · B. Gouvernance & seuils ·
C. Utilisateurs & rôles / Intégrations.**

Légende build : 🟢 faisable maintenant (front + localStorage) · 🟡 front
possible mais sans valeur sans persistance · 🔴 nécessite le backend.

---

## Organisation de l'écran

Admin passe d'une page plate à une page **à onglets internes** (sous-nav) :

```
Admin
 ├── Référentiel      (A)
 ├── Gouvernance      (B)
 ├── Accès & rôles    (C)
 └── Intégrations     (F)
```

Sous-nav légère (pills) en haut de `sc-admin`, état mémorisé dans
`PREFS.adminTab`. Chaque onglet rend sa section.

---

## A. Référentiel éditable (CRUD)  🟢

Transformer les cartes actuelles (affichage) en cartes **éditables**.

| Entité | Champs | Actions |
|---|---|---|
| **BU** | code, nom, couleur, régions[] | ajouter · éditer · supprimer (bloquer si essais rattachés) |
| **Cultures** | libellé | ajouter · renommer · supprimer |
| **Produits** | libellé | ajouter · renommer · supprimer |
| **Partenaires** | nom, type | ajouter · éditer · supprimer |
| **Classes & types d'essais** | classe, libellé, niveau TRL, types[] | éditer types, réordonner |
| **Objectifs stratégiques** | libellé, icône | ajouter · éditer |
| **MDS (Minimum Data Set)** | item, obligatoire o/n | toggler obligatoire, ajouter/retirer |

**Interactions :**
- Édition inline (clic sur la ligne → champs) ou mini-modale par entité.
- Garde-fou suppression : si une entité est référencée par un Use Case
  existant (`DATA`), on bloque avec un message (« 4 essais utilisent
  cette BU »).
- Persistance démo : `localStorage` (`nutriplan_referential_v1`), avec
  bouton **« Réinitialiser le référentiel par défaut »**.
- Export / import JSON du référentiel (pour transférer entre navigateurs
  ou préparer le seed backend).

**Note d'architecture :** aujourd'hui `BUS`, `CROPS`, `PRODUCTS`, etc.
sont des constantes en dur. Étape 1 = les charger depuis une couche
`REF` (localStorage si présent, sinon défauts). Toutes les vues lisent
déjà ces tableaux → l'édition se propage automatiquement.

---

## B. Gouvernance & seuils  🟢 (logique) / 🔴 (application réelle aux workflows)

Rendre la gouvernance **paramétrable** au lieu d'être codée en dur.

| Bloc | Contenu | Build |
|---|---|---|
| **Comités** | Steering / CEO gate / Monitoring : nom, cadence, membres (rôles) | 🟢 édition · 🔴 notifications réelles |
| **Matrice RACI** | par étape du cycle × rôle : R/A/C/I | 🟢 saisie & affichage |
| **Seuils de gate** | budget > X k€ → gate CEO ; durée > N mois → Steering | 🟢 saisie · 🟡 application live (recalcule le statut des UC) |
| **Fast Track** | critères d'éligibilité (budget max, durée max, 1 BU, pas de gate CEO) | 🟢 saisie · 🟡 application au formulaire intake |
| **SLA par étape** | jours cibles draft→submitted→steering→ceo→running | 🟢 saisie · 🟡 alimente les alertes du Cockpit |

**Valeur immédiate :** même sans appliquer les seuils au workflow,
afficher « Règles de gouvernance en vigueur » documente le Framework v1.0
signé par le CEO — utile en démo et en audit.

**Étape suivante (front) :** brancher les seuils sur `buildAlerts()` et
sur le formulaire `renderIntake()` pour que le changement de seuil
recalcule réellement les alertes et l'éligibilité Fast Track.

---

## C. Utilisateurs & rôles (RBAC)  🔴 backend requis

Spécifié maintenant, **implémenté après la décision archi** (auth M365 / tenant).

| Élément | Détail |
|---|---|
| **Rôles** | Admin · Sponsor BU · HRBP/PMO · Membre comité · Lecteur |
| **Périmètre** | par BU (un Sponsor Brazil ne voit/valide que Brazil) |
| **Droits par étape** | qui peut soumettre, valider un gate, clôturer |
| **Source d'identité** | Microsoft 365 SSO (Entra ID) — cohérent avec le reste de la stack D²nAI |

**Démo intermédiaire possible 🟡 :** un sélecteur « se faire passer pour »
(rôle + BU) qui masque/affiche les actions, sans vraie auth. Permet de
montrer le RBAC cible en réunion. À n'activer que si tu veux le pitcher.

---

## F. Intégrations & audit  🔴 backend requis

| Intégration | But | Build |
|---|---|---|
| **NutriTrials** (nutritrials.ma) | source live des essais en exécution (downstream) | 🔴 API/sync |
| **SharePoint** | dépôt des livrables & clôtures, knowledge base | 🔴 connecteur |
| **Export** | portefeuille complet CSV/JSON, rapport de cycle | 🟢 export · 🔴 planifié |
| **Journal d'audit** | qui a changé quoi (référentiel, gates, rôles) | 🔴 nécessite stockage serveur |
| **Statut IA** | backend configuré o/n, modèle, périmètre données, 09-08 | 🟢 affichage statut (hérite des réglages WP) |

---

## Phasage recommandé

**Itération 1 — front, livrable rapidement (🟢) :**
1. Sous-nav admin (Référentiel / Gouvernance / Accès / Intégrations).
2. Référentiel éditable CRUD + persistance localStorage + export/import JSON.
3. Gouvernance : saisie & affichage des comités, RACI, seuils, SLA
   (documenté, pas encore appliqué).
4. Bloc « Statut IA & conformité 09-08 » (lecture).

**Itération 2 — front avancé (🟡) :**
5. Brancher les seuils sur les alertes Cockpit + l'éligibilité Fast Track.
6. Mode démo « se faire passer pour » (RBAC simulé) si on veut le pitcher.

**Itération 3 — backend (🔴), après décision archi/tenant :**
7. RBAC réel via M365 SSO, journal d'audit, intégrations NutriTrials &
   SharePoint, exports planifiés.

---

## Modèle de données (couche `REF` à introduire)

```js
// Chargé au boot : localStorage si présent, sinon défauts en dur.
const REF = loadRef(); // { bus, crops, products, partners, classes,
                       //   objectives, mds, governance }
// governance = { committees[], raci{}, thresholds{ceoBudget, steeringMonths},
//                fastTrack{maxBudget, maxMonths, singleBU}, sla{} }
```

Tout le reste de l'app lit déjà `BUS`, `CROPS`… → on les fait pointer sur
`REF.*`. Migration sans réécrire les vues.
