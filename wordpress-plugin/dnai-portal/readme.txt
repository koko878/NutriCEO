=== D²nAI Portal — Intake Genie & Product Catalog ===
Contributors: D²nAI · OCP Nutricrops
Requires at least: 6.0
Tested up to: 6.5
Requires PHP: 7.4
Stable tag: 1.4.0
License: GPLv2 or later

A homepage chatbot that challenges, categorizes and structures internal
Data / Digital / AI needs — powered by your AI Lab LLM (Open WebUI /
OpenAI-compatible) — plus a product catalog of live and in-development products.

== Install ==
1. Zip the `dnai-portal` folder and upload it under Plugins → Add New → Upload,
   or copy `dnai-portal/` into wp-content/plugins/. Activate it.
2. Go to Settings → D²nAI Portal and fill:
   - AI Lab base URL  : https://lab.ocpnutricrops.ai
   - API path         : /api/chat/completions   (Open WebUI default, OpenAI-compatible)
   - API key          : an Open WebUI API key (Settings → Account → API Keys)
   - Model            : dnai-intake-genie
   - Notify email     : where captured needs are emailed
   The API key stays server-side (the browser never sees it — calls go through
   the WP REST proxy /wp-json/dnai/v1/chat).

== Use ==
- Homepage chatbot:  add the shortcode  [dnai_intake]
- Product catalog:   add the shortcode  [dnai_catalog]
- Raw-material radar: add the shortcode  [dnai_radar]
- Add products under "D²nAI Products" in wp-admin; set each product's
  Status (Live / In development / Idea) and Category (Data / Digital / AI).
- Submitted needs are saved under "D²nAI Needs" and emailed to the notify address.

== Radar Intrants ([dnai_radar]) ==
An AI event-radar on raw-material prices (sulfur first). Buyers maintain an
editable watchlist (producers, shipping routes, demand, market, events — stored
in their browser) and get a one-click directional buy/price signal, generated
server-side via the WP REST proxy /wp-json/dnai/v1/radar (so no CORS and the API
key stays server-side). Set the radar model and web-search toggle in
Settings → D²nAI Portal. Until configured, the radar shows a clearly-labelled
demo signal so the page is presentable.

== How the bot frames a need ==
The system prompt (editable in settings) makes the bot:
- reply in the user's language (FR/EN, auto-detected),
- challenge the request and categorize it (Data / Digital / AI + sub-category),
- gather: problem, impacted users, current pain, expected outcome, data sources,
  sensitivity, volume, urgency, sponsor, success metric, constraints,
- then emit a machine-readable [[BRIEF]]{...}[[/BRIEF]] block that the front-end
  captures, displays as a recap card, and saves as a "Need".

== Plug-n-play ==
Any OpenAI-compatible /chat/completions endpoint works (Open WebUI, vLLM,
Azure OpenAI via gateway, LM Studio…). Only base URL + path + key + model change.
