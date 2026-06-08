=== D²nAI CGM Cockpit — Crisis Center ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 1.16.0
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
