=== D²nAI CGM Simulator — MVP ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 1.1.0
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
Calculation rules ported 1:1 from the CGM Excel. Ships with placeholder data
(a representative subset) — the real workbook plugs in later, same schema.

== Install ==
1. Plugins → Add New → Upload Plugin → choose `dnai-cgm-mvp.zip` → Install → Activate.

== Use — shortcode ==
Create a Page and add:  [cgm_mvp]
Optional height: [cgm_mvp height="1100px"]
Publish and share the page URL. Fully interactive on mobile.

== Use — direct URL ==
https://YOURSITE/wp-content/plugins/dnai-cgm-mvp/app/cgm-mvp.html

== Notes ==
- The referential edits (manual products, constants) are stored per-browser
  (localStorage) for this MVP — no database. Use JSON export/import to share.
- Update content by replacing app/cgm-mvp.html and re-uploading the plugin.
