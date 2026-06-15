=== D²nAI NutriPlan — Trial Management Cockpit ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 0.15.0
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

= 0.15.0 — Retours métier : drill-downs honnêtes + AI command-bar hybride =
* COCKPIT — Drill-down « % Transform → Demo / Launch » corrigé : le
  filtre pointait sur status:'monitoring' (incohérent avec la métrique
  qui mesure closed-go/closed). Désormais clic → portefeuille filtré
  sur status:'closed-go' (les trials qui ont vraiment transformé).
* COCKPIT — Heatmap « Couverture portefeuille BU × Culture »
  désormais cliquable : chaque cellule non-vide drille avec filtre
  combiné {bu, crop}, ring vert au hover + curseur pointer +
  role=button/tabindex (a11y), cellules vides restent inertes
  (cursor:default).
* COCKPIT — Nouvelle barre de commande AI sticky (hybride) :
  input large « Demande-moi ... » + bouton Demander + 4 chips
  suggestions, ouvre le chat panel pré-rempli avec la requête.
  Pattern Linear / Notion AI : dashboard reste le landing
  (orientation immédiate), bot est one-tap away en haut, le panneau
  full-chat slide à la demande. i18n FR/EN/PT-BR complète.
* AI CHAT PANEL — Polish UX : largeur 380px (vs 420 trop large sur
  écrans moyens), breakpoint à 1240px pour passer en overlay flottant
  (au lieu de 980), close X bouton dédié plus visible (32×32, bordure
  + bg, hover rouge), texte wrap correct (word-break:break-word /
  overflow-wrap:anywhere) sur bulles + suggestions, suggestions
  scrollables (max-height 38vh), ESC pour fermer le chat (en plus du
  bouton ✕ et du clic sur la pastille).
* KANBAN — Fix overflow des cards : titre + meta + footer ne
  débordaient plus de la card 280px (bleed visible). Ajout
  overflow:hidden + min-width:0 sur card et enfants, text-overflow:
  ellipsis sur la ligne foot (« Crop · Product »), white-space:nowrap
  sur le prix (tabular-nums préservé), word-break:break-word sur ttl
  + meta.

= 0.14.0 — Polish final + re-audit cible 16+/20 =
* Pass finale : relecture end-to-end, vérification des states
  interactifs (hover/focus/active) sur KPI/kanban/chips/boutons,
  zéro console.log / TODO / dead code introduit par les passes
  v0.11 → v0.13, JS toujours parsable.
* Classe .eyebrow CSS conservée (rule orpheline harmless), mais
  les divs ont disparu de tous les templates métier — la voix n'est
  plus institutionnellement « scaffold ».
* Voir AUDIT-v0.11.md pour le scoring 5 dimensions actualisé
  (delta vs AUDIT-v0.10.md = 10/20).

= 0.13.0 — Typeset (P3) + Animate (P3) =
* Typeset : remplacement des 10 emojis de navigation sidebar (⚡📊🗂️📚📅
  ⚖️🛡️➕🚀💡⚙️) par un set SVG cohérent inline en <symbol> + <use>
  (stroke 1.8, line icons 18×18, currentColor pour héritage palette).
  Rendu identique cross-OS, accessible, indexable (aria-hidden sur la
  sprite, focusable=false). Échelle typographique inchangée (déjà ≤ 5
  tailles cohérentes : xs/sm/base/lg/xl).
* Animate : suppression de l'animation `pulseDot` sur .tb-btn.ai .dot
  (le bouton AI parle de lui-même, pas besoin de pulse infini), pulse
  conservé sur .sb-foot .dot (signal heartbeat sync NutriTrials).
  Suppression de l'animation `fbPulseHi` 1s alternating outline sur
  .fb-highlight (remplacée par outline dashed statique). Le bloc
  prefers-reduced-motion (v0.11) couvre déjà toutes les transitions
  pour les utilisateurs qui désactivent le mouvement.

= 0.12.0 — Distill (P2) + Adapt (P2) =
* Distill : suppression des préfixes A./B./C./D. sur les 4 cards Dashboards
  (numbered scaffolding) — les cards parallèles parlent d'elles-mêmes.
  Cockpit hero bridge déjà à 3 KPIs (validé, pas de compression
  supplémentaire). Aucune copie sub-titre redondante détectée
  (les .dash-card-h.dash-legend-note portent un sub différent du h3).
* Adapt : touch targets ≥44px via media (pointer:coarse) sur
  .kpi/.chip/.btn/.sb-item/.tb-btn/.pill/.tb-lang button/.ref-chip/.kn-card.
  Language switcher passe à 36px min-height par défaut (44px sur tactile).
  Ref-chip CRUD passe à 36px min-height, button × interne 18→22px.
  Kanban responsive : sous 560px viewport, .kn-col passe à
  `flex:0 0 calc(100vw - 60px)` (1 colonne plein écran swipeable au lieu
  d'un scroll horizontal claustrophobique sur mobile).
* Kanban card : padding uniforme 12px (vs 10px 12px), min-height 44px.

= 0.11.0 — Audit impeccable P0/P1 (a11y + tokens + AI-grammar cleanup) =
* A11Y P0 : label/for binding sur 18 champs du formulaire intake,
  :focus-visible ring vert global, conversion des div onclick en zones
  activables clavier (Enter/Espace + role=button + tabindex via
  MutationObserver), aria-label sur tous les boutons icône (close-X
  modales, langue), focus-trap UC modal sur ouverture+ESC+Tab cycling,
  restauration du focus précédent à la fermeture.
* Anti-patterns P1 : suppression de 11 eyebrows redondants
  (clé i18n .eye conservée mais div retirée — voix non scaffold), retrait
  des side-stripes border-left sur .alert et .fb-item (remplacés par
  bordure complète + bg tint sémantique, dot orange leading pour fb-item),
  tone down Cockpit hero (suppression du blob radial, h1 28px, KPIs 28px,
  gradient simplifié 2-stops), gradient .tb-btn.ai remplacé par solide,
  gradients calendrier (.cal-bar, .legend-sw) simplifiés en couleurs solides.
* Colorize P1 : --muted-2 #8aa195 → #5f7269 (contraste AA 4.6:1 sur
  blanc, vs 2.85:1 avant), bg tints sémantiques pour alertes
  (warn/bad/ok) au lieu de bordure latérale.
* Extract P1 : tokens sémantiques --st-{go,hold,kill,draft}-{bg,fg},
  --av-1..6, --raci-{r,a,c,i}, --ring-focus. Règles pill/avatar/raci
  consomment les tokens (préparation dark mode futur).
* Polish : prefers-reduced-motion block (toutes animations coupées),
  body overflow corrigé en `hidden auto` pour zoom 200%, font weights
  trimmés (Inter 400-700 sans 800, gain ~30 KB sur le payload Google Fonts).

= 0.10.2 — Audit complet des drill-downs (fix bug cosmétique-pas-fonctionnel) =
* Bug Fast Track « SLA moyen » et autres KPIs : ils étaient cliquables
  mais menaient au portefeuille NON filtré (cosmétique seulement). Cause :
  kpiTile()/kpiOfficial() appelés sans le 6e/7e argument `filt`, donc
  `kpiGo({})` vidait tous les filtres au lieu d'en appliquer un.
* Fix : kpiTile et kpiOfficial sont désormais cliquables UNIQUEMENT si
  un filtre est passé. Sinon, ils prennent une classe .kpi--static
  (cursor:default, pas de hover-lift trompeur) — l'utilisateur sait
  immédiatement ce qui est interactif et ce qui ne l'est pas.
* Fast Track : 3 KPIs sur 4 désormais filtrants (actifs ouverts, budget,
  GO rate). « SLA moyen » reste statique (info pure, pas de filtre logique).
* Controls : 2 KPIs sur 4 désormais filtrants (UCs avec issues, total
  issues → filtre ic_with_issues). Compliance % et total IC points
  restent statiques.
* Cockpit BU breakdown table : ligne cliquable harmonisée pour passer
  par kpiGo() au lieu d'une affectation directe (persistance correcte).
* Nouveaux filtres back-end : status_open, ic_with_issues — visibles
  comme chips dans la barre des filtres actifs.
* Tous les chips actifs (type, BU, statut, projet, recherche, culture,
  partenaire, fast_track, partner_setup, kind, installed, open, ic)
  sont désormais visibles et retirables individuellement.

= 0.10.1 — Empty-state premium portefeuille filtré par projet vide =
* Fix UX : quand un user atterrit sur le portefeuille filtré par un
  projet qui n'a pas encore de trials (parce qu'il vient d'être créé),
  on affichait « 0 Use Cases du cycle 2026 » + 4 colonnes Kanban
  « vide » (visuel triste, pas de CTA clair).
* Désormais : hero d'empty-state dédié — illustration 🌱 sur cercle
  pointillé dégradé vert, eyebrow « Projet prêt », titre 30px
  Cormorant, body explicatif, et 2 CTAs : « ← Voir tous les trials »
  + « + Créer le premier trial » (qui pré-sélectionne le projet
  dans le formulaire d'intake).
* Bonus : titre contextuel quand un projet est filtré non-vide
  (« N trials du projet "X" » au lieu de « N Use Cases du cycle 2026 »).
* Bonus : bouton « + Ajouter un trial » dans la toolbar du portefeuille
  filtré par projet (raccourci permanent).

= 0.10.0 — Polish premium UI/UX (modales natives bannies + spring physics) =
* SYSTÈME DE MODALE PREMIUM (UI.prompt / UI.confirm / UI.alert) —
  fin des `prompt()` / `confirm()` / `alert()` natifs du navigateur
  (qui affichaient la chaîne AFD complète). Double-Bezel glass shell,
  backdrop-blur, spring physics, focus auto, ESC pour fermer, Enter
  pour valider, variante danger (confirmations destructives).
* Création de projet refondue : vrai formulaire 6 champs (titre, BU,
  partenaire, culture, budget, description) au lieu de 2 prompts
  successifs. Après création → ouverture directe de la FICHE PROJET
  (vue dédiée premium) avec actions « Voir les trials » et « Ajouter
  un trial » (raccourci UX, pas de détour par le portefeuille).
* Bouton « + Ajouter un trial » depuis la fiche projet pré-sélectionne
  le projet dans le formulaire d'intake.
* Polish global appliqué partout :
  - Variables d'easing custom (cubic-bezier spring) sur transitions
  - Tabular-nums sur tous les chiffres (KPI, dashboards, table)
  - Hover physics : translateY + colored shadow tintée vert (au lieu
    de noir générique) sur KPIs / cards / boutons
  - Active state scale(.97) — pressed feedback physique
  - Inner highlight (Double-Bezel light) sur toutes les cards
  - Toast amélioré : spring entrance + colored shadow + variantes
    success/error
* Toutes les confirmations (suppression référence, reset défauts,
  clear feedback, copie markdown) passent par les modales premium.

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
