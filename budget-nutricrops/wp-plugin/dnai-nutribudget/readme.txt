=== D²nAI NutriBudget ===
Contributors: dnai-ocp-nutricrops
Tags: budget, consolidation, capex, opex, ocp, nutricrops, dashboard
Requires at least: 6.0
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 0.3.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Tactical budget consolidation cockpit for OCP Nutricrops (D²nAI) — the bridge before Anaplan. Single source of truth for all engagement lines.

== Description ==

NutriBudget consolidates every engagement line (CAPEX/OPEX, multi-BU, multi-currency
MAD/USD/EUR) into one tactical cockpit, makes the OTP→PO→payment chain visible upstream,
rolls up spend by vendor, and produces read-only share links + Task-Force CSV exports
(one entry → N formats). It exists to replace the ~15 drifting Excel files with a single
source of truth, until Anaplan lands (~2 years out).

Five views:

* **Consolidé** — KPIs (total / CAPEX / OPEX / blocked), CAPEX-vs-OPEX split, by-BU and
  by-category bars, payment-status bars (bars drill down into the filtered lines).
* **Lignes** — searchable / sortable / filterable table; add / edit / delete via an
  accessible modal (focus trap, keyboard, ESC).
* **Prestataires** — vendor rollup (engaged amount + line count + share).
* **Exécution & paiement** — OTP → PO → payment chain, blocked lines first.
* **Partage & export** — read-only share link (?view=shared), CSV export, Task-Force
  CAPEX/OPEX templates, print/PDF, data-completeness bars.

Delivery: a self-contained React / TypeScript / Tailwind / Framer Motion app, built
locally to ONE static HTML file (fonts, CSS and JS inlined) and served full-screen by
this plugin — no build server on WordPress.

* Full-screen route: `/nutribudget` (fallback `/?dnai_nbudget_app=1`)
* Shortcode: `[nutribudget]`

Persistence is browser localStorage at this stage (MVP, per workstation). The target is a
shared REST + MySQL backend behind SSO Entra ID, following the NutriPlan pattern.

== Changelog ==

= 0.3.0 =
* Full React / Vite / Tailwind v4 / Framer Motion migration of the v0.2 vanilla cockpit
  (taste-skill pass: Geist + Geist Mono, OCP-green single accent, no emoji — Phosphor
  icons throughout, bento consolidated dashboard, spring motion, skeleton loaders, empty
  state, WCAG AA).
* Shipped as a single self-contained HTML build served full-screen by WordPress.
* Feature parity with v0.2: 5 views, multi-currency consolidation, drill-down bars,
  accessible edit modal, read-only share mode, CSV + Task-Force exports.

= 0.2.0 =
* Vanilla mono-file reference build (a11y AA pass).
