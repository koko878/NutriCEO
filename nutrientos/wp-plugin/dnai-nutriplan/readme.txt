=== D²nAI NutriPlan — Trial Management Cockpit ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 0.22.3
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

= 0.22.3 — Polish UX/UI global (impeccable polish pass) =
* DESIGN TOKENS étendus :
  - Spacing scale 4pt-based : --space-1..10 (4 → 72px).
  - Duration scale : --dur-instant/fast/base/slow/page (80→520ms).
  - Easing tokens : --ease-out-quart/quint/expo/spring/soft (courbes
    exponentielles pour décélération naturelle, jamais bounce).
  - Z-index scale sémantique : dropdown→sticky→modal→toast→tooltip.
  - Shadows enrichies : card / card-hover / glow (chaude/froide
    selon contexte).
  - Couleurs : ajout --green-25 (très clair), --green-400, --ink-3,
    --muted-2, --line-soft pour gradations plus fines.
* PAGE TRANSITIONS : chaque changement d'écran fade+slide-up
  (520ms ease-out-quart). Désactivé en prefers-reduced-motion.
* CARD HOVER : lift -2px + soft glow vert (au lieu de juste bg
  change). Active state -1px scale 0.97. Border-color passage à
  --green-200.
* BUTTON STATES : active scale .97, hover lift sur primary avec
  shadow vert, disabled opacity .5 + cursor not-allowed.
* FOCUS RINGS : plus visibles, branded vert, jamais supprimés. Sur
  buttons : ring + halo shadow vert combiné.
* LOADING SKELETONS : nouvelle classe .skel avec shimmer animation
  (1.4s ease-soft infinite). .skel-text, .skel-card, .skel-line
  composables.
* EMPTY STATES : nouvelle classe .empty-pro (warm gradient bg
  + serif Cormorant + microcopy + CTA). Ancienne .empty enrichie
  avec dashed border vert + bg gradient.
* SIDEBAR : sidebar items avec subtle hover lift + barre verte 3px
  à gauche sur l'item actif (indicateur visuel propre).
* STAGGER REVEAL : alerts/cards/kn-cards apparaissent avec un
  micro-stagger (40ms entre chaque), donne du rythme à la page.
* TABLE ROWS : t-link rows avec hover bg --green-25 (subtle,
  signal de cliquabilité sans agressivité).
* SMOOTH SCROLL : html scroll-behavior smooth (désactivé en
  reduced-motion).
* TOUCH TARGETS : min-height 44px sur mobile (hover:none) pour
  buttons, chips, sb-items, kn-cards.
* TEXT SELECTION : branded vert OCP.
* COCKPIT HERO : vignette subtile (radial gradient bottom-left +
  highlight top-right) pour donner de la profondeur.
* PROGRESS BARS : transition width 380ms ease-out-quart (au lieu
  de 550ms ease linear).
* TOAST : entry/exit avec spring easing.
* RESPECT prefers-reduced-motion partout : transitions et stagger
  désactivés.

= 0.22.2 — RBAC complet UI/UX (11 rôles × 17 permissions atomiques) =
* MATRICE RBAC : 11 rôles applicatifs × 17 permissions atomiques.
  Voir RBAC_MATRIX dans nutriplan.html. Backend reste autorité ; cette
  couche est purement UI (gating visuel + désactivation actions).
* MOTEUR : effectiveRole() = impersonate || actualRole, can(perm)
  exposé globalement. Non-admin ne peuvent pas impersonner.
* PATTERN CSS : <body data-effective-role="X"> + classes .rbac-*-only
  sur les éléments sensibles. Whitelist explicit par rôle (plus safe
  que blacklist : oubli = invisible vs leak).
* ÉLÉMENTS GATÉS :
  - .rbac-create-uc-only : bouton "+ New UC" topbar (admin + entity_mgr)
  - .rbac-admin-only : item sidebar Admin + CRUD ref + manage users
  - .rbac-configure-gov-only : bouton "Configurer" SLA (admin)
  - .rbac-ceo-tab-only : CXTAB "Approbation CEO" (CEO + steering + admin)
  - .rbac-controls-only : CXTAB "Contrôles internes" (admin + steering)
  - .rbac-steering-decide-only : dropdowns Go/Hold/Kill (steering + admin)
  - .rbac-monitoring-decide-only : dropdowns verdict (monitoring + admin)
  - .rbac-ceo-decide-only : selects CEO par entité × région (CEO + admin)
  - .rbac-edit-closure-only : bouton ✏ Éditer KB (admin + steering +
    entity_mgr + trial_owner)
  - .rbac-ft-decide-only : décisions Fast Track (admin + ft_approver)
  - .rbac-sai-review-only : actions SAI Review (admin + sai_reviewer)
* RÔLE READER : tous les inputs/selects/textarea sont disabled visuels
  (pointer-events:none + bg gris), boutons primary opacity .4.
* RÔLE IT_SUPPORT : banner d'orientation "accès technique uniquement"
  + tout le contenu métier masqué (.screen > *:not(.cxtab)).
* MODE IMPERSONATE (admin) : sélecteur "Vue" en topbar (masqué pour
  non-admin) avec 12 rôles. Banner sticky top en jaune indique le mode.
* ACTUAL ROLE : lu depuis window.DNAI_NPLAN.role (claim SSO Entra
  futur), fallback PREFS.actualRole, fallback 'admin' (dev/Hamza).
* IMPERSONATE_ROLES étendu : passage de 8 à 12 rôles (ajout
  entity_contributor, monitoring_member, fast_track_approver, it_support
  + libellé "Vue normale (mon rôle)" plus clair).
* injectCxTab() étendu pour appliquer .rbac-ceo-tab-only et
  .rbac-controls-only sur les onglets contextuels CEO/Controls.
* renderSidebar() étendu pour appliquer .rbac-admin-only sur l'item
  Admin (rétrocompat avec ancien CSS impersonate).
* applyImpersonateUI() renommé applyRBACUI() (alias rétro conservé).
* PHP : v0.22.1 → v0.22.2.

= 0.22.1 — Reproduction visuelle Halima (V14) à l'identique, charte D²nAI =
* WORLD MAP géographique réelle : intégration de WORLDMAP_DATA (171KB
  countries SVG paths, Natural Earth simplifié, viewBox 1000×500) +
  REGION_COORDS repris à l'identique de la maquette Halima V14. Carte
  rendue via drawWorldMap() : chaque pays peint avec shade vert
  progressif selon le progress moyen des trials de sa région
  (4 niveaux : #e6efe9 → #a9c8b9 → #5e9479 → #0c3b2e). Bulles par
  région : trial amber #e3a23c + demo vert OCP (--green-700), rayon ∝
  √(count). Labels région en serif vert profond, progress en muted.
  Footer : légende dots + scale shade.
* PROJECT CARDS Halima-style : refonte renderProjects() avec layout
  identique à V14 (ligne par projet : icône play ▶ vert OCP, eyebrow
  PRJ-001 mono, titre serif vert tronqué single-line, ligne de badges
  pill arrondies [Region · Entity · Status · Contract · 💰 Budget],
  count à droite séparé par border-left avec gros nombre serif +
  "N trials · M demos" en sub).
* TOOLBAR Halima : 3 dropdowns "All Entities / All Regions / All
  Project Status" + toggle Portfolio / Table + bouton primary
  "+ Nouveau projet" à droite, dans une card unifiée.
* CHARTE GRAPHIQUE D²nAI préservée : Cormorant Garamond pour les
  titres, Inter pour body, vert OCP --green-700/800/900 dominant,
  amber #e3a23c uniquement pour le code couleur sémantique trials
  (vs demos vert), badges arrondis cohérents avec le reste de l'app.
* CSS : 60 lignes ajoutées (.prjh-* + extension .wmap-* avec
  .wmap-card, .wmap-h, .wmap-foot, .wmap-scale).
* PHP : v0.22.0 → v0.22.1, taille HTML 728KB → 900KB (worldmap inline).

= 0.22.0 — Refonte selon retours Halima (V13/V14 + docx) =
* CHANTIER 1 — Dashboards : nouveau panneau "Regional Breakdown" sous la
  carte avec toggle 2 vues : "Trials & Demos par région" (barres
  horizontales amber=trials / vert=demos) et "Budget engagé 2026 par
  région" (barres vert OCP avec % et total). Légende ajoutée sous la
  carte. Map bubble enrichie avec dot legend.
* CHANTIER 2 — Trial cards enrichies : la modale openUc() expose
  désormais 4 blocs structurés en haut (avant les détails techniques) :
  📁 Project description (parent + BU + région + rationale),
  📊 Business case (marché + budget + uplift + CO₂),
  🔬 Trial description (plan T×R + fenêtre + MDS coverage + download
  protocole .docx),
  🎯 Status (statut + type + priorité + Fast Track + gates).
* CHANTIER 3 — New Use Case : refonte intake en 2 temps :
  - Écran 1 (selector) : 2 cards côte à côte
    * Standard Process LOCKED (grayscale, info "fenêtres QBR" au clic)
    * Fast Track OPEN (gradient amber, click pour démarrer)
    + preview 3-step en bas.
  - Écran 2 (wizard) : stepper visuel avec progress bar + 3 étapes :
    Step 1 Project Identification (champs objectifs + périmètre),
    Step 2 Business Case (3 tabs : P Market + Design & Hypothesis +
    Eco Impact, mapping concurrents tabulaire avec add/remove),
    Step 3 Trial Description (MDS + budget USD + protocole + Fast Track
    switch).
  - Navigation prev/next + brouillon/submit sur la dernière étape.
  - La structure business_case = {p_market, design, eco} est désormais
    persistée par UC (rétrocompatible : accessors fabriquent les blocs
    depuis les champs scalaires existants pour les vieux UCs).
* CHANTIER 4 — CEO Approval : nouvelle vue (CXTAB Gouvernance > CEO).
  - Section 1 "Annual Portfolio KPIs" : table 7 ans (2024 → 2030) ×
    (Projects / Trials / Demos / Committed Budget), header vert deep.
  - Section 2 "Portfolio Overview by Entity" : 1 card par BU avec
    header (totaux + badges Aligned/No Consensus/Rejected/Pending +
    "View Projects →" drill-down) + table interne par région
    (Région · Cultures · Projects · Trials/Demos · Committed · Steering
    decision · CEO Decision dropdown · CEO Comments textarea).
  - CEO Decision dropdown change la couleur du select (vert/ambre/
    rouge) ; commentaire devient obligatoire si "Needs Review" ou
    "Rejected".
  - Persistance : localStorage 'nplan_ceo_decisions_v1' + collection
    serveur 'ceo_decisions' (whitelistée PHP).
  - Drill-down filtre le portfolio sur la BU sélectionnée.
* CHANTIER 5 — Steering + Monitoring accordion : nouvelle vue
  "Par projet" dans Portfolio (3e onglet en plus de Kanban/Table) +
  cards Steering Portfolio et Monitoring Portfolio dans Governance
  utilisant le helper réutilisable govProjectAccordion(items, actionFn).
  - Chaque project = header expandable (id + titre serif + badges
    région/entité/status + count trials/demos + budget total) → body
    avec grid de trial cards.
  - Dropdown décision (Go/Hold/Kill) inline par trial dans le Steering
    accordion ; verdict (closed-go/hold/kill) dans le Monitoring.
  - Helper utilisé aussi par Portfolio view "Par projet".
* PHP : version 0.21.2 → 0.22.0, collection 'ceo_decisions' ajoutée
  à la whitelist REST.
* i18n : 120+ nouvelles clés FR/EN/PT couvrant les 5 chantiers.
* Smoke E2E np-smoke-v22.mjs : EXIT=0 sur 11 checks (boot helpers,
  Dashboards region split trials+budget, Portfolio accordion 35 UCs
  groupés, trial detail 4 blocs, Intake selector + wizard 3 steps
  + tabs Business Case, CEO 7 ans × 7 entités × 28 selects décisions,
  Steering accordion 3 projets × 4 decision selects, anti-régression
  Admin 9 users).

= 0.21.2 — Coach étendu : mini-tour auto-déclenché sur chaque page =
* EXTENSION COACH à toutes les vues : à chaque fois que l'utilisateur
  arrive sur un écran pour la 1ère fois, le coach lance automatiquement
  un mini-tour de 3-5 étapes qui explique ce qu'il peut/doit faire ici.
* 11 mini-tours définis (1 par vue) en plus du tour welcome global :
  - cockpit (3 étapes) : KPIs portefeuille, alertes, navigation
  - dashboards (3 étapes) : vue analytique, drill-down, bascule
  - projects (3 étapes) : niveau parent CFP, KPIs, créer projet
  - portfolio (3 étapes) : CXTAB, filtres, détail trial
  - intake (5 étapes) : ID auto, 5 étapes formulaire, projet, budget, draft/submit
  - calendar (3 étapes) : Gantt 16 mois, barres macro-phases, QBR
  - fasttrack (3 étapes) : lane d'urgence, KPIs, workflow 5 étapes
  - governance (4 étapes) : SLA bandeau, Steering/CEO, RACI, config
  - kb (3 étapes) : closures, filtres verdict, éditer/PDF
  - controls (3 étapes) : 22 points, KPIs conformité, drill par point
  - admin (3 étapes) : 5 sous-onglets, action du jour, ajouter
* Logique d'auto-déclenchement intelligente :
  - Lance seulement si la vue n'a pas encore été vue (PREFS.coach.tourSeen)
  - Lance seulement si le tour welcome est terminé (priorité)
  - Cooldown 30s après skip pour éviter de spammer (pas de mini-tour
    juste après que l'utilisateur ait skippé un tour précédent)
  - Re-check au tir : si la vue a changé entre-temps, on annule
  - Délai 700ms après navigation pour laisser le DOM se peupler
* Nouveau menu coach (clic droit sur 💡) :
  - 🎯 « Tour de cette page · <nom de la page> · nouveau/déjà vu »
    (label dynamique, mis à jour à chaque changement de vue)
  - ▶ Tour d'accueil complet (8 étapes)
  - 🔄 « Re-déclencher tous les tours » : reset complet + relance auto
    du tour de la vue courante
  - 🔕 Désactiver / 🔔 Activer le coach
* Persistance : PREFS.coach.tourSeen est un objet keyé par tourId, le
  cooldown stocké dans PREFS.coach.lastSkipAt. Persisté serveur via la
  collection 'prefs_user'.
* i18n : 80+ nouvelles clés FR/EN/PT pour les 11 mini-tours.
* Smoke E2E np-smoke-v21-perview.mjs : EXIT=0 (11 vues testées, chaque
  vue auto-lance son tour avec bon titre et step counter ; revisite ne
  relance pas ; resetAllTours redéclenche ; menu affiche le bon label).

= 0.21.1 — Coach D²nAI refondu en guided tour Intercom-style =
* REFONTE COMPLÈTE du coach : remplacement des hints contextuels passifs
  par un vrai tour guidé pas-à-pas style Intercom Product Tours / Pendo /
  Driver.js :
  - Overlay fixed plein-écran avec backdrop semi-transparent rgba(8,16,
    12,.62) et SVG mask qui découpe un trou (spotlight) animé autour de
    l'élément cible (transition 320ms ease-out-quart sur x/y/width/
    height — le trou « glisse » d'une étape à l'autre).
  - Popover positionné automatiquement (top/bottom/left/right/center)
    autour de la cible avec flèche, clampé au viewport. Animation
    d'entrée spring cubic-bezier(.34,1.56,.64,1) sur scale+translateY.
  - Header : eyebrow « Coach D²nAI » avec dot pulse, bouton ×.
  - Titre en Cormorant Garamond serif (charte D²nAI), body en Inter.
  - Footer : barre de progression dégradée vert + compteur « 3 / 8 »,
    boutons ghost « ← Précédent » / « Ignorer » et primary « Suivant → »
    (ou « Terminer ✓ » sur la dernière étape).
  - ResizeObserver qui repositionne le popover et le spotlight en
    temps réel quand la fenêtre ou la cible change de taille.
  - Auto-scroll smooth de la cible vers le centre du viewport avant
    affichage.
  - Raccourcis clavier : ESC = skip, ← = précédent, → / Enter = suivant.
  - 3 TOURS définis :
    * welcome (8 étapes, ~3 min) : auto-déclenché à la 1ère visite —
      navigation, cockpit, impersonate, soumission, bot D²nAI, toggle
      coach.
    * portfolio (3 étapes) : CXTAB projets↔trials, filtres, détail.
    * intake (4 étapes) : ID auto, projet parent, budget USD, brouillon
      vs soumission.
* FIX BOUTON TOGGLE qui ne marchait pas en v0.21.0 :
  - Le bouton 💡 lance directement le tour (clic gauche) au lieu d'ouvrir
    un menu vide.
  - Clic droit ouvre le menu déroulant avec :
    * ▶ Relancer le tour guidé (8 étapes)
    * 📊 Tour Portefeuille (3 étapes)
    * 📝 Tour Soumission (4 étapes)
    * 🔕 Désactiver / 🔔 Activer le coach
  - CSS .tb-coach-menu corrigée (opacity+transform+pointer-events).
* Checklist sidebar : ajout du bouton « ▶ Relancer le tour guidé »
  en tête du panneau.
* Persistance étendue : PREFS.coach = { enabled, tourSeen[id],
  dismissedTour }. Un tour vu ne se relance pas tout seul ; l'utilisateur
  doit cliquer explicitement sur 💡 ou « Relancer ».
* Respect prefers-reduced-motion (transitions désactivées).
* Responsive mobile : popover plein-largeur (12px de gouttière), titre
  réduit.
* i18n : 60+ nouvelles clés FR/EN/PT pour les 3 tours.
* Smoke E2E np-smoke-v21-tour.mjs : EXIT=0, 13 checks (auto-launch,
  step navigation, prev/next/skip, toggle click → relance tour,
  contextmenu → menu, disable/enable, multi-tour portfolio).

= 0.21.0 — Coach D²nAI guide intelligent + Gouvernance paramétrable + B6-B9 fixes =
* COACH D²nAI (4 piliers, guide intelligent pour utilisateurs novices) :
  - Checklist d'onboarding (7 actions concrètes, panneau collapsible bas-
    sidebar avec progress ring SVG animé) qui se masque automatiquement
    quand tout est coché.
  - Hints contextuels par écran (cockpit/portfolio/intake/governance/admin/
    kb) avec règles intelligentes (msg + action call-to-action). 1 hint
    par écran, jamais intrusif, dismissable. Mémoire des hints fermés
    persistée dans PREFS.coach.dismissedHints.
  - Spotlight CSS (box-shadow pulse 1.6s) pour attirer l'œil sur un
    élément à activer.
  - Toggle 3 niveaux dans le topbar (💡 Novice / Intermédiaire / Off) avec
    dot pulse animée quand actif. Click ailleurs ferme le menu.
  - Visited views et flags (uc-opened, uc-created, chat-asked) persistés
    localStorage. Auto-cochage de la checklist sans intervention manuelle.
  - Respecte prefers-reduced-motion (animations désactivées proprement).
  - Mobile : checklist masquée, coach bar adaptée 2 lignes.
* GOUVERNANCE PARAMÉTRABLE (nouveau tab Admin > Gouvernance) :
  - Matrice RACI 11 étapes × 5 rôles entièrement éditable (selects R/A/C/I
    avec code couleur ambre/rouge/bleu/gris). Source de vérité de la vue
    Governance côté membres.
  - Seuils CEO (budget min, durée min) : déclenche le flag ceo_required
    automatique sur soumission UC dépassant l'un des seuils.
  - Éligibilité Fast Track (budget max, durée max) : un FT au-delà est
    refusé silencieusement à la soumission (toast + cycle standard).
  - SLA paramétrables par étape (SAI Review, Steering, CEO, Fast Track,
    Monitoring) en jours. Affichés en bandeau au-dessus de la page
    Governance avec lien direct vers la config.
  - Persistance temps réel : localStorage immédiat + apiPush serveur
    (collection 'governance' whitelistée).
  - Action « Restaurer les valeurs par défaut » pour annuler tout custom.
* RÉFÉRENTIEL CRUD ÉDITABLE :
  - Renommage inline des items strings (BUs, cultures, produits, MDS,
    statuses) via double-clic → input → Enter/blur pour valider, Escape
    pour annuler. Vérification anti-doublon, propagation cascade dans
    DATA (champ scalaire OU array mds_covered).
  - Badge usage par item (compteur de trials utilisant cette valeur)
    visible au survol pour aide à la décision de suppression.
  - Guard suppression étendu à MDS (en plus de BUs/crops/products/
    partners) : toast d'erreur si N trials utilisent l'item, suppression
    bloquée.
* B6 — Intake : ID auto-généré (UC-2026-NNN) affiché en bandeau pro-max
  avant le formulaire (badge vert OCP, code monospace JetBrains). Budget
  passé en input monétaire premium (préfixe $ vert, suffixe USD, helper
  live avec formatage thousand-separator on input). Helper i18n FR/EN/PT.
* B7 — Closure éditable : nouveau bouton « ✏ Éditer » par card KB qui
  ouvre une modale UI.prompt avec textarea synthèse + recommandation,
  persistance par UC dans le champ closure (override des lessons
  computées). Badge « éditée » visible sur les cards modifiées. Block
  recommendation visible inline en vert pâle.
* B8 — Export PDF Closure : nouveau bouton « 🖨 PDF » par card KB qui
  génère un layout d'impression dédié (.kb-print-only, isolé via
  body.kb-printing → display:none sur tout le reste) avec entête D²nAI,
  méta UC, verdict coloré (vert/ambre/rouge selon GO/HOLD/KILL), synthèse,
  recommandation, KPIs, footer attribution. window.print() déclenché
  automatiquement, l'utilisateur choisit « Enregistrer en PDF ».
* B9 — Refresh automatique des vues amont sur mutation données : nouvelle
  fonction dataChanged() appelée depuis saveData() + submitUc() qui
  re-render la sidebar (badges) + l'écran courant si concerné
  (governance/calendar/cockpit/dashboards/controls/fasttrack/kb/portfolio/
  projects). Plus de vues périmées après création d'un Use Case.
* PHP backend : version bumpée 0.20→0.21, collection 'governance' et
  'prefs_user' ajoutées à la whitelist REST. Schéma DB inchangé
  (rétrocompatible).
* i18n : 60+ nouvelles clés FR/EN/PT couvrant coach, intake B6, closure
  B7/B8, références CRUD, gouvernance config, SLA badges, FT refusal.

= 0.20.0 — Bot D²nAI repensé : FAB rond + Sheet flottant (option B) =
* REMPLACEMENT DU PANNEAU CHAT slide-in droit (qui prenait 460px de
  largeur en permanence et faisait doublon avec l'AI command bar du
  cockpit) par un pattern FAB + Sheet à la Intercom/Crisp :
  - FAB rond en bas-droite, 56×56px, gradient vert OCP, halo pulse
    discret (ping vert clair toutes 2.6s, animation respectée par
    prefers-reduced-motion).
  - Au clic : FAB tourne 45° et se transforme en croix (×), sheet
    apparaît en bas-droite avec spring physics (scale+slide).
  - Sheet 400×min(620, 100dvh-130) flottant, fond vert OCP sombre
    (gradient #07140c→#0c1f12), border vert clair subtle, ombre
    profonde polish.
  - Scrim léger (rgba 18% + blur 2px) qui dismiss au clic.
  - L'ancien bouton "D²nAI bot" en topbar est masqué (display:none).
* MOBILE : sheet en bottom-sheet plein écran 88dvh (radius 18 18 0 0),
  slide depuis le bas, scrim plus opaque 50% + blur 4px. Pastille
  feedback commentaire repoussée à bottom:88px pour ne pas chevaucher
  le FAB.
* TOGGLE CHAT : refactor toggleChat() pour ne plus utiliser .app.chat-open
  (l'ancien grid 200/1fr/460 est supprimé du flow), le sheet flotte
  par-dessus tout. Préserve les IDs internes (#chatBody, #chatSugs,
  #chatInput, #chatSendBtn) → chatSend/chatAsk/chatGreet/openChatWith
  continuent de fonctionner sans modification.
* A11Y : aria-label sur FAB, role=dialog sur sheet, Esc ferme (déjà
  câblé par toggleChat), tabindex à conserver, focus auto sur chatInput
  à l'ouverture (220ms après transition).
* Vérifié bout-en-bout via PHP serve + Playwright sur desktop (1440px)
  et mobile (412px) : FAB visible, sheet ouvre/ferme proprement,
  bot répond (3 messages dans le thread après envoi), Admin > Accès
  toujours OK (9 utilisateurs), 0 erreur JS console.

= 0.19.0 — Nav épurée 11→6, impersonate démo, persistence rôles, mobile fix =
* NAV ÉPURÉE 11 → 6 entrées : Cockpit · Portefeuille · Gouvernance ·
  Soumettre (Intake) · KB · Admin. Les 5 écrans cachés (dashboards,
  projects, calendar, controls, fasttrack) restent accessibles via
  des sous-tabs contextuels (CXTAB) injectés en haut des écrans
  pivots : Cockpit ⇄ Vue analytique, Portefeuille ⇄ Projets, Gouvernance
  ⇄ Calendrier ⇄ Contrôles internes, Soumettre ⇄ Fast Track.
* IMPERSONATE : sélecteur "Vue" en topbar pour démos RBAC avant SSO.
  8 rôles simulés (Admin, Entity Manager, Trial Owner, SAI Reviewer,
  Steering, CEO Approver, Reader). Bandeau warn animé en haut + masquage
  des actions selon rôle (ex. "+ New Use Case" disparaît pour reader).
* PERSISTENCE RÔLES : collection 'roles' whitelistée côté PHP (table
  custom dnai_nplan_store). axLoadRolesFromServer() au render de
  Admin > Accès, axSaveRolesToServer() au save modal. Multi-utilisateur
  partagé (en attendant que SSO Entra ID prenne le relais).
* FIX MOBILE PORTRAIT (<760px) : ck-hero passe en padding 18px, h1 26px,
  ck-hs en colonne 1fr ; h-pg 26px, kpi-grid en 1fr avec borders propres,
  topbar gap réduit, search masquée, impersonate masqué. Le hero qui
  débordait sur 412px est rentré (cf retour user 25/06).
* AUDIT BUGS BRIEF V07 (B1-B9) — état réel :
  - B1 Use Case créé invisible : ✅ fixé (saveData()→apiPush usecases)
  - B2 Search KO : ✅ fixé (globalSearch oninput→PREFS.filters.q)
  - B3 Upload doc : ✅ fixé (if_attach + attachments dans uc)
  - B4 KPIs/MDS saisie : ✅ branchée (mds-row, classes CSS présentes)
  - B5 Contrôle date fin vs début : ✅ fixé (ifDateCheck() ligne 4166)
  - B6 ID budget : ⚠ à valider en démo
  - B7 Bouton Éditer Closure inactif : ⚠ à valider, pas de fix trouvé
  - B8 Export PDF Closure : ⚠ à valider, pas de fix trouvé
  - B9 Comités update auto : ⚠ partiellement (re-render goView)
  → B6-B9 à traiter en v0.20 ciblée après validation en démo réelle.

= 0.18.0 — Polish global propagé aux 11 écrans =
* PASSE DE SURCHARGE CSS PURE (zéro modif DOM/JS, zéro risque fonctionnel) :
  élévation systémique de tous les composants partagés (.h-pg, .kpi, .card,
  .tbl, .pill, .chip, .btn.primary, .ck-hero, .ck-hs, .sb-item, .topbar,
  .subnav) — propagé sur cockpit, dashboards, projects, portfolio, intake,
  calendar, fasttrack, governance, kb, controls, admin.
* TYPO MONUMENTALE : .h-pg passe 30px → 40px Cormorant serré, balance text,
  pattern italic h-pg em pour titres asymétriques.
* KPI éditorial : strip border-top/bottom (vs cards séparées), value
  Cormorant 42px (vs 36 Inter), stagger reveal animation 4 cards.
* CK-HERO dramatique : gradient 3 stops, h1 42px + em italic vert clair,
  radial highlight subtile, ck-hs.v en Cormorant serif 38px.
* TABLE row stagger : tbody tr fade-in séquentiel + hover gradient vert
  + barre verticale verte au hover (cohérent avec Admin > Accès).
* MICRO INTERACTIONS : pill hover lift, chip border-hover vert OCP,
  btn.primary shimmer hover (gradient blanc qui balaie en 600ms),
  sb-item slide-right hover, sidebar active glow vert.
* AMBIENT BACKGROUND : double radial vert OCP très subtil + noise grain
  léger fixe-positionné, donne de la matière sans casser le contenu.
* TOPBAR backdrop-blur + saturate 140% (Mac-style frosted glass).
* SUBNAV (onglets admin) modernisée : padding 4px, hover vert clair,
  active vert OCP 900.
* REDUCED-MOTION respecté : toutes les nouvelles anim désactivées si
  prefers-reduced-motion:reduce (rowIn, kpiIn, shimmer, ambient).
* Vérifié bout-en-bout via PHP serve + Playwright sur 6 écrans (cockpit,
  dashboards, portfolio, admin, governance, kb) : 0 erreur JS, 11
  screens disponibles, anti-régression confirmée.

= 0.17.0 — Admin > Accès "pro max" + hotfix injection </head> =
* REFONTE ADMIN > ACCÈS : hero éditorial Cormorant 46px italique, KPI strip
  avec 4 sparklines animées (utilisateurs actifs, rôles, sans MFA, entités),
  number counters animés au reveal, tableau utilisateurs riche avec
  avatars dégradés, badges rôles (admin/comités/lecteur), pills MFA
  Activée/Manquante (Manquante avec halo pulse), tooltips data-tip, hover
  row avec gradient + barre verticale verte, scroll-reveal stagger sur les
  lignes, batch action bar (sélection multi → assigner rôle, forcer MFA,
  désactiver), tri sortable avec aria-sort, mini matrice RBAC en référence
  (6 rôles × 5 actions essentielles), modale d'édition utilisateur avec
  scale+fade depuis le trigger (transform-origin dynamique), sections
  rôles applicatifs cochables (4 rôles principaux + 7 autres en details),
  périmètre d'entité radio + sélecteur, note synchronisation Entra ID
  (groupe AD), action destructive séparée du primaire, toast confirmation
  avec progress bar.
* MOCKDATA RÉEL : 9 utilisateurs avec les noms réels de l'équipe OCP
  Nutricrops (Halima, Abdellah, Abdelali, Saâd, Mounia, Youssef, Robson,
  Mostapha, Lina) — cohérent avec la matrice RBAC consolidée v2 du
  24 juin 2026.
* HOTFIX DÉFENSIF : injection du config bridge passe maintenant par
  strrpos+substr_replace (cible la dernière </head>) au lieu de
  str_replace naïf. Évite le bug latent identifié sur les apps soeurs
  (NutriBudget v0.4.0, NutriView v0.4.0) où une lib bundlée contenant un
  littéral "</head>" cassait le <script> module et affichait du JS brut.
* PHP : harmonisation version header / constante DNAI_NPLAN_VER (était
  désynchronisé 0.16.0 / 0.14.0 — maintenant 0.17.0 partout).
* A11Y : focus-visible sur tous les nouveaux composants, aria-sort sur
  colonnes triables, aria-live="polite" sur batch bar et toast, gestion
  Escape pour fermer la modale, restauration focus à la fermeture.
* Vérifié bout-en-bout via PHP CLI serve + Playwright (chaîne WP réelle,
  pas file://). 0 erreur JS console, 9 utilisateurs rendus, 4 sparklines
  animées, modale fonctionnelle avec édition des 11 rôles applicatifs.

= 0.16.0 — Fix critiques : drill-down visible, chat débordant + croix masquée =
* DRILL-DOWN ENFIN VISIBLE (bug majeur) — cliquer un KPI cockpit
  (« Transform → Demo/Launch », « On time »…) ou une cellule de la
  heatmap filtrait correctement (« 3 résultats ») MAIS atterrissait en
  vue Kanban : les trials closed-go / en exécution vivent dans les
  colonnes Kanban 5-6, HORS écran à droite. L'utilisateur voyait
  4 colonnes vides et croyait le drill-down cassé. Désormais : tout
  drill-down (kpiGo) atterrit en vue TABLE → la liste filtrée est
  visible immédiatement, sans scroll horizontal ni colonnes vides.
* KANBAN — quand un filtre est actif, les colonnes vides sont masquées
  (fini le mur de colonnes « vide » qui cachait la colonne peuplée).
* CHAT DÉBORDANT + CROIX INVISIBLE (même cause racine) — la colonne
  « main » était en `1fr` au lieu de `minmax(0,1fr)` : un contenu large
  (table/kanban) empêchait `main` de rétrécir et POUSSAIT le panneau
  chat (et sa croix de fermeture) hors de l'écran à droite. Fix :
  `minmax(0,1fr)` sur la colonne main + `min-width:0` sur main/chat/
  bulles. La croix ✕ est de nouveau visible, le texte du chat ne
  déborde plus.
* CHAT plus large — quand le chat est ouvert, le menu gauche se
  resserre (240→200px) et le panneau chat s'élargit (380→460px).
  Overlay flottant à 460px sous 1280px.
* KANBAN — texte des cards garanti sans débordement : footer
  « culture · produit » en ellipsis, budget en tabular-nums
  non-cassable, titre + meta en word-break, card en overflow:hidden.

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
