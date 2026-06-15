=== D²nAI NutriPlan — Trial Management Cockpit ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 0.9.1
Requires at least: 6.0
Requires PHP: 7.4
License: GPL-2.0-or-later

Plan & Govern layer ON TOP of NutriTrials (live at nutritrials.ma). Covers
the full upstream Trial Management cycle: annual planning, Use Case intake,
Steering / CEO / Monitoring gates, Fast Track lane, closure & knowledge
base — with an AI chat-with-data co-pilot. Ships a projector-ready pitch
deck (HTML + print-to-PDF) for stakeholder buy-in.

== Install ==
1. Plugins → Add New → Upload Plugin → choose dnai-nutriplan.zip → Install → Activate.
2. (Optional) If the CGM Cockpit plugin is already configured, NutriPlan
   inherits the AI backend settings — no setup needed. Otherwise, Settings →
   NutriPlan AI to configure the AI backend.
3. If pretty URLs 404, go to Settings → Permalinks → Save.

== Use ==
Full-screen URLs (no theme around them):
  https://YOURSITE/nutriplan         → the live MVP app (Cockpit)
  https://YOURSITE/nutriplan-pitch   → the pitch deck (HTML, Ctrl+P for PDF)

Shortcodes (in a WP page):
  [nutriplan]         → embeds the live MVP app
  [nutriplan_pitch]   → embeds the pitch deck

== Feedback edition ==
Clic-droit sur n'importe quel bloc de l'app NutriPlan pour déposer un
commentaire lié à son contexte (vue + bloc). Une pastille flottante
« 💬 N commentaires » en bas à droite ouvre le panneau de revue, avec
export JSON / CSV / markdown (copier-coller dans Teams / Slack / Notion).
Tout est stocké en localStorage (par navigateur) — idéal pour récolter
le feedback des parties prenantes pendant une démo, sans backend.

== Changelog ==

= 0.9.1 — Vue Dashboards dédiée (F3, demande SAI/Abdelali) =
* Nouvel écran « Dashboards » (nav) reproduisant le PPT TRIAL DASHBOARD :
  - Bandeau 6 KPIs : Trials/Démos planifiés · installés · avancement global.
  - A. Carte géographique à bulles (trials ambre / démos vert) +
    avancement régional par zone.
  - B. Donut Type de partenaire · C. Donut Cultures · D. Donut Budget
    par région — donuts SVG hand-rolled (zéro dépendance externe).
* 100 % calculé en direct depuis le portefeuille (DATA) : mise à jour
  automatique à chaque création de trial. Charte D²nAI, tabular-nums.

= 0.9.0 — Couche Projet→Trial + filtres + KPIs cliquables (vague 2) =
* COUCHE PROJET → TRIAL (changement structurel de l'Excel SAI) :
  - Nouvelle entité Projet (Call for Proposal), persistée en BDD
    (collection 'projects'), avec champs Excel (entité, statut projet/
    contrat, ligne stratégique, type de projet, budget, durée).
  - Nouvel écran « Projets » (nav) : cartes projet + KPIs + création.
  - Trials rattachés à un projet (héritage), sélecteur projet dans le
    formulaire de création de trial.
  - Clic sur un projet → portefeuille filtré sur ses trials (Q2),
    bannière de contexte + reset.
* Q1 — Filtres par colonne dans la table du portefeuille (BU, culture,
  type, statut, partenaire) en plus des chips existants.
* Q3 — KPIs du cockpit CLIQUABLES et FILTRANTS (Fast Track → filtre
  fast_track ; transform/on-time/bridge → filtres de statut), au lieu
  d'ouvrir le portefeuille brut.
* B8 — Export CSV des trials clôturés (Knowledge Base) fonctionnel.
* Projets synchronisés serveur (sync au boot, amorçage au 1er run).

= 0.8.0 — Backend BDD réel + retours métier (vague 1) =
* BASE DE DONNÉES RÉELLE (MVP ouvrable aux utilisateurs) : table custom
  {prefix}dnai_nplan_store + API REST (/collection bulk, /item granulaire).
  Persistance serveur PARTAGÉE entre tous les utilisateurs (fini le
  localStorage par poste). localStorage reste en cache offline / 1er paint.
  Sync auto au boot ; amorçage serveur au premier lancement (seed).
* Formulaire de création de Use Case RÉELLEMENT fonctionnel (corrige le
  bug n°1 : un Use Case créé apparaît enfin dans le portefeuille/cockpit,
  et est persisté en base via upsert granulaire anti-clobber).
  - Contrôle date fin > date début
  - MDS cochables · pièces jointes · protocole Word obligatoire à la
    soumission · partenaire « Autre » avec saisie libre · Fast/Standard
* Recherche globale fonctionnelle (filtre le portefeuille en direct).
* Écran ADMIN refondu — sous-nav 4 onglets :
  - Référentiels : CRUD complet de 11 référentiels (BU, cultures,
    produits, partenaires, MDS + statut projet/contrat/trial, urgence,
    lignes stratégiques, types de projet — alignés Excel SAI), édition
    inline, garde-fou suppression si utilisé par un trial, badge
    provenance (Cœur / Excel SAI), export JSON, persistance serveur.
  - Cadre v1.0 (lecture seule, Framework signé CEO)
  - Accès & rôles (modèle RBAC cible, rôle SAI)
  - Intégrations (statut BDD / SharePoint / audit / IA en temps réel)
* Référentiels Projet importés de l'Excel SAI (statuts, lignes
  stratégiques, types de projet) — socle de la future couche Projet→Trial.

= 0.6.0 =
* Feedback edition : clic-droit sur n'importe quel bloc pour commenter,
  pastille flottante + panneau de revue, export JSON / CSV / markdown.
  Porté du CGM Cockpit, adapté aux vues NutriPlan (cockpit, portefeuille,
  gouvernance, intake, fast track, KB…).

= 0.5.2 =
* Pitch demo CTAs point to live AFD URL.

= 0.5.1 =
* Slim pitch + zero provider branding.

= 0.5.0 =
* Alignement Framework v1.0 (CEO-signed).
