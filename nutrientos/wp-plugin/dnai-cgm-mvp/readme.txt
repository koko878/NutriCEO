=== D²nAI CGM Simulator — MVP ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 1.6.0
Requires at least: 6.0
Requires PHP: 7.4
License: GPL-2.0-or-later

MVP of the CGM Simulator following the business scoping:
- Business UX: Config (product × line, usage 1/2/3, default reference by family) →
  Market inputs (raw materials split volatile/stable, mandatory ones linked to the
  product, % variation fields) → Results (KPIs, split DAP & TSP scenarios,
  OK/under-priced status, sensitivity with main-driver, multi-product comparison).
- Editable referential (admin profile): in-app product CRUD as a delta layer,
  "to complete" view, JSON export/import, editable technical constants.
Calculation rules ported 1:1 from the CGM Excel. Ships with placeholder data.

== Install ==
1. Plugins → Add New → Upload Plugin → choose `dnai-cgm-mvp.zip` → Install → Activate.
2. On activation the full-screen route is registered. If the pretty URL 404s,
   go to Settings → Permalinks → Save (this flushes the rewrite rules).

== Use — FULL SCREEN (recommended) ==
Open, on any device, edge-to-edge with NO theme around it:
  https://YOURSITE/cgm-simulator
  (fallback, always works:  https://YOURSITE/?dnai_cgm_app=1 )
Share this URL with the business / CEO. This is the clean full-screen experience.

== Use — embed in a page (optional) ==
Add the shortcode  [cgm_mvp]  to any Page. The iframe auto-resizes (no inner
scrollbar) and shows an "Ouvrir en plein écran" link.

== Notes ==
- Referential edits (manual products, constants) are stored per-browser
  (localStorage) for this MVP — use JSON export/import to share. No database.
- Update content by replacing app/cgm-mvp.html and re-uploading the plugin.
