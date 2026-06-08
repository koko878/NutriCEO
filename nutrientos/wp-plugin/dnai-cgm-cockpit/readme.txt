=== D²nAI CGM Cockpit — Crisis Center ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 1.18.0
Requires at least: 6.0
Requires PHP: 7.4
License: GPL-2.0-or-later

Parallel plugin to dnai-cgm-mvp. Hosts the "Crisis Cockpit" version of the
CGM Simulator (Netflix/Spotify-style command deck): live RM ticker, crisis
playbook (1-click scenarios), S-pressure heatmap, substitution advisor and
AI co-pilot. Coexists with the original plugin — different shortcode and
route — so the existing CGM page is untouched.

== Install ==
1. Plugins → Add New → Upload Plugin → choose dnai-cgm-cockpit.zip → Install.
2. Activate alongside dnai-cgm-mvp (the two plugins do not conflict).
3. If pretty URLs 404, go to Settings → Permalinks → Save.

== Use ==
Full-screen URL (no theme around it):
  https://YOURSITE/cgm-cockpit
Shortcode (in a WP page):
  [cgm_cockpit]

== Changelog ==

= 1.18.0 =
* Bouton dédié « ＋ Commencer nouvelle simulation » dans l'en-tête du
  co-pilote IA — visible et bien identifié (style amber sur fond vert
  pour appeler l'œil), permet à l'utilisateur de relancer une nouvelle
  conversation/simulation à tout moment sans avoir à recharger la page.
* Au clic : la conversation est purgée (state.cpConv vidée), le chat
  est nettoyé, le champ input remis à zéro puis re-focalisé, et une
  bulle d'accueil amber invite l'utilisateur à formuler son besoin ou
  à cliquer une suggestion pour démarrer la simulation guidée.
* Trilingue FR / EN / PT-BR (ck.newSim + ck.newSimWelcome).
* CSS .ck-newsim avec hover + shadow ; sur mobile (< 600px) le bouton
  passe pleine largeur dans le header pour rester tappable.
* Nouvelle classe .cp-bubble.cp-welcome pour la bulle de réinitialisation
  (dégradé amber discret cohérent avec le bouton déclencheur).

= 1.17.0 =
* Simulation conversationnelle — le co-pilote peut désormais GUIDER
  l'utilisateur à travers une simulation CGM par questions interactives,
  sans qu'il ait besoin de toucher aux formulaires :
  - ASK_CHOICE : pose une question avec boutons cliquables (ex famille
    de produit, référence DAP/TSP, choix d'action)
  - ASK_INPUT : pose une question avec champ texte/nombre (ex prix de
    vente, valeur d'un choc RM)
  - SET : applique des modifications au simulateur (produit, ref, prix,
    RM, chocs, navigation vers un onglet)
  - SUMMARY : termine avec un résumé + boutons de next-step (stresser,
    comparer, nouvelle simulation)
  - ANSWER : mode classique préservé pour les questions informatives
* Conversation persistée (state.cpConv) — le co-pilote a la mémoire
  de la conversation, peut enchaîner les tours sans répéter le contexte.
* System prompt étendu avec catalogue compact + état simulateur + schéma
  JSON strict des actions. Tolerant aux fences markdown ```...```.
* Nouvelles bubbles UI : .cp-bubble avec .cp-question, .cp-choice
  (boutons stackés), .cp-input (input + bouton OK), .cp-set (badge
  confirmation), .cp-summary (résumé + next_choices).
* Fix overflow horizontal mobile : .wrap padding 32px → 14px sur < 600px,
  .card padding 20px → 14px, .scol .b padding 16px → 12px. Réglait le
  bug visible des cartes Scénario DAP/TSP qui débordaient à droite.
* Helper escapeAttr() ajouté (alias escapeHtml) pour attributes HTML.

= 1.16.0 =
* Landing direct sur l'onglet Cockpit (avant : Configuration) — l'utilisateur
  voit le command deck en premier, pas le formulaire de saisie.
* Co-pilote IA déplacé tout en haut du Cockpit, en hero pleine largeur — c'est
  désormais le premier élément que voit l'utilisateur (avant : caché dans une
  grille 2 colonnes en bas de la page). Style "card hero" avec dégradé vert
  pour l'attirer immédiatement.
* Substitution Advisor remonté en row pleine largeur (libéré du grid 2 cols
  qu'il partageait avec le co-pilote).
* Fix overflow mobile sur les cartes Scénario DAP/TSP de l'écran Résultats :
  passage de display:flex en grid 1fr+auto. Les valeurs $/t restent toujours
  visibles à droite, le label peut ellipser si trop long sur écran étroit.

= 1.15.0 =
* Analyse de sensibilité enrichie (inspirée d'une initiative BU Ops
  de F. Ezzebdi) — la carte "Analyse de sensibilité" dans Résultats
  garde son tornado existant et reçoit en plus :
  - Toggle %/$ par MP volatile dans l'écran Inputs marché (avant
    seulement % — désormais permet "NH3 +50$" en absolu).
  - Tableau "Exposition portefeuille" sous le tornado : top 20
    produits par |Δ CGM éq.| avec base + Δ Coût MP + Δ CGM colorés.
    Permet de voir d'un coup d'œil quels produits du catalogue
    sont les plus exposés aux chocs actuellement configurés.
  - Bouton "⤓ CSV" en haut du tableau portefeuille : export
    sensibilité complète (TOUS les produits, pas juste top 20)
    avec en-tête des chocs appliqués pour partage au contrôle de
    gestion / comité prix.
* state.sensMode ajouté en mémoire (pct par défaut, persistance
  prévue en v1.16). Compat ascendante préservée (state.sens[k]
  inchangé, lu par AI copilot et historique).
* applySensShocks() centralise la logique d'application des chocs
  (utilisé par renderSensi, drivers/tornado, portfolio table,
  export CSV) — une seule source de vérité.

= 1.14.0 =
* Vague 3: Sc3 swap-mode + per-nutrient tolerance + admin family/MP
