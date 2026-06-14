=== D²nAI NutrientOS ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 2.7.0
Requires at least: 6.0
Requires PHP: 7.4
License: GPL-2.0-or-later

Hosts the NutrientOS prototype, the executive one-pager and the executive
summary on your WordPress site — full-screen URLs (no theme chrome) and
shortcodes with full-bleed, cache-busted, auto-resizing iframes.

== Install ==
1. Plugins → Add New → Upload Plugin → choose `dnai-nutrientos.zip` → Install → Activate.
2. If pretty URLs 404, go to Settings → Permalinks → Save (flushes rewrite rules).

== Use — FULL SCREEN (recommended) ==
Open, on any device, edge-to-edge with NO theme around it:
  https://YOURSITE/nutrientos            → the interactive platform
  https://YOURSITE/nutrientos-exec       → the 1-page executive (Why/What/How)
  https://YOURSITE/nutrientos-execsum    → the detailed executive summary
Fallbacks (always work): /?dnai_nos_app=index | exec | execsum

== Use — embed in a page (optional) ==
Add ONE shortcode to a Page:
  [nutrientos]  ·  [nutrientos_exec]  ·  [nutrientos_execsum]
The iframe is full-bleed (spans the window width), cache-busted and auto-resizes
to its content (no nested scrollbar), with an "Ouvrir en plein écran" link.

== Strategy docs (in the plugin folder) ==
ENTRY-DOOR-SPEC.md         — spec of the first service (Morocco pilot,
                             branchement Al Moutmir, template multi-BU)
ADOPTION-PLAYBOOK-V0.md    — how to get the first 20 Al Moutmir agronomists
                             active in Doukkala (14-week playbook)
MULTI-BU-EXTENSION-PLAN.md — extension after Morocco proof: Brazil,
                             Africa sub-Saharan, India, Europe — one
                             backend, N entry doors per BU

== Update the content ==
Replace the files in `app/` and re-upload. The version number cache-busts the
embed automatically. No database, no settings.

== Changelog ==

= 2.7.0 — Waze pivot =
* execsum.html refait : nouvelle narration board (le moteur est commodity,
  la donnée est l'actif, Waze pour la nutrition, backend unifié + N portes
  d'entrée géographiques). FR / EN / PT-BR. Preuve Al Moutmir intégrée.
* 3 docs strat ajoutés dans le plugin folder :
  - ENTRY-DOOR-SPEC.md (spec Morocco + template multi-BU, post-branchement
    Al Moutmir)
  - ADOPTION-PLAYBOOK-V0.md (playbook 14 semaines pour le pilote Doukkala,
    20 agronomes Al Moutmir)
  - MULTI-BU-EXTENSION-PLAN.md (trajectoire 18-24 mois post-Morocco :
    Brésil → Afrique → Inde → Europe, schéma de dépôt commun, moteur
    centralisé)

= 2.6.0 =
* Founding-partners pitch + Doukkala lighthouse demo.
