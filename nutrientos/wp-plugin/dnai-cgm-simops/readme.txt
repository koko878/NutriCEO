=== D²nAI CGM Sim-Ops ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 1.0.0
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

= 1.0.0 =
* Première version. Portage 1:1 de l'app R Shiny de F. Ezzebdi avec
  charte D²nAI, exports CSV unifiés, feedback console clic-droit, et
  SVG hand-rolled pour les graphes (zéro dépendance externe).
