=== D²nAI CGM Sim-Ops ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 1.2.0
Requires at least: 6.0
Requires PHP: 7.4
License: GPL-2.0-or-later

Refonte HTML/JS (stack D²nAI) du simulateur CGM R Shiny initialement
développé par la BU Ops (F. Ezzebdi). Reproduit à l'identique la
logique métier (coût par MP, CGM = Prix − coût MP, CGM EQ DAP), les
KPIs, les graphes (CGM vs EQ DAP + composition du coût), la synthèse
par produit avec ligne moyenne, et l'analyse de sensibilité (chocs en
%/$, impact combiné, tornado par produit ou moyenne, impact séparé
produit × variable). Mono-fichier autonome (zéro dépendance externe :
ni Plotly, ni Chart.js, ni R, ni Shiny Server), charte D²nAI.

== Install ==
1. Plugins → Add New → Upload Plugin → choisir dnai-cgm-simops.zip → Install → Activate.
2. Si les jolies URLs renvoient 404, Réglages → Permaliens → Save.

== Use ==
URL plein écran (sans theme WP) :
  https://VOTRE-SITE/cgm-simops

Shortcode (dans une page WP) :
  [cgm_simops]

== Périmètre ==
Référentiel embarqué : 89 produits OCP Nutricrops (DAP, MAP, TSP/TSP+,
NPK, NPS), 9 matières premières (Soufre, Ammoniac, KCL, Amsul, Roche
P2O5, Roche Granulation, Zn, B, Cu), 3 paramètres modèle (CSP_ACS_S,
CSP_Roche_P2O5, CSP_ACS_P2O5). Prix d'entrée seedés avec des valeurs
2026 placeholder à ajuster (le fichier source de Fouad avait les prix
à zéro). Aucune information confidentielle dans le seed par défaut.

== Différences vs Sim-Ops original ==
- Mono-fichier HTML autonome (plus besoin de R, RStudio, Shiny Server)
- Charte D²nAI (vert OCP) au lieu de la charte R par défaut
- Trilingue ready (FR seul pour l'instant, structure data-k disponible)
- Feedback console intégrée : clic-droit sur n'importe quel bloc pour
  déposer un commentaire — pastille flottante + panneau de revue +
  export JSON / CSV / markdown (porté du CGM Cockpit)
- Export CSV unifié (un seul bouton, hypothèses incluses) au lieu
  d'Excel + CSV + PDF — plus simple à archiver et à comparer

== Différences vs CGM Cockpit officiel ==
Cette app est volontairement minimaliste — elle reproduit l'approche
mono-écran de la BU Ops. Pour le cockpit complet (143 produits, 14 MP,
philosophies de pricing, scénarios crisis, Market Intel live, co-pilote
IA, multilingue, historique des simulations), voir le plugin
dnai-cgm-cockpit.

== Changelog ==

= 1.2.0 =
* Alignement détaillé sur les screenshots du Sim-Ops original (Fouad) :
  - Légende du graphe « Composition du coût » : ordre inversé (Cu, B,
    Zn, Roche Granulation, AmSul, KCl, Ammoniac, Roche P2O5, Soufre)
    et déplacée en haut au lieu du bas
  - Synthèse par produit : ajout d'une toolbar « 📋 Copy » (TSV vers
    clipboard, collable Excel/Sheets/Teams) + champ recherche +
    ligne « Affichage N sur N produits »
  - Trois boutons d'export (PDF / Excel / CSV) au lieu d'un seul CSV,
    sur les deux onglets (Simulation et Sensibilité)
* Export PDF : ouvre le dialogue d'impression natif sur la vue
  courante (synthesis + KPIs), avec print stylesheet dédié qui
  masque les chromes (tabs, pastille feedback, boutons d'actions).
  L'utilisateur choisit « Enregistrer en PDF ».
* Export Excel : technique HTML-table-as-xls — Excel l'ouvre
  nativement comme un vrai classeur, avec une feuille par section
  (synthèse, hypothèses RM, paramètres). Aucune dépendance CDN
  ajoutée (pas de SheetJS), zéro impact sur la taille du bundle.

= 1.1.0 =
* UI alignée sur le visuel du Sim-Ops original (logo OCP rond, tab nav
  vert vif, mise en page KPI valeur grande / sous-titre dessous, barre
  de recherche avec icône au-dessus).
* Nouvelle option « Base d'équivalence DAP » :
  - ACP P2O5 (défaut) : utilise l'EQ_DAP_Ratio du référentiel (= comportement
    original 1:1 du R).
  - Global P2O5 : recalcule la CGM EQ DAP comme CGM / teneur P2O5 du produit,
    i.e. la marge ramenée à la tonne de P2O5 pur — utile pour comparer
    des produits de teneurs très différentes (TSP vs DAP vs NPK).
* Signature D²nAI conservée mais discrète (mention « refonte D²nAI »
  dans le coin haut droit du header).

= 1.0.0 =
* Première version. Portage 1:1 de l'app R Shiny de F. Ezzebdi avec
  charte D²nAI, exports CSV unifiés, feedback console clic-droit, et
  SVG hand-rolled pour les graphes (zéro dépendance externe).
