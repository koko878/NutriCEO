=== D²nAI CGM Simulator ===
Contributors: D²nAI · OCP Nutricrops
Requires at least: 6.0
Tested up to: 6.5
Requires PHP: 7.4
Stable tag: 1.5.2
License: GPLv2 or later

A sales margin pricing-scenario simulator for OCP Nutricrops, with an AI copilot.
Pick a product × line, adjust raw-material prices, and compare the 3 pricing
methods in real time: fixed price, iso-margin floor price, and nutrient-value
price — showing RM cost, CGM equivalent (DAP/TSP) and MCV per tonne of P₂O₅
acid. The copilot (an Open WebUI / OpenAI-compatible model — Qwen recommended)
lets a salesperson drive the simulator in plain language. Standalone — does not
depend on the D²nAI Portal plugin.

== Why it is safe ==
The copilot NEVER produces numbers. It returns only a strict JSON "action"
(which product, which prices, which scenario). The verified in-browser engine —
the exact same formulas as the CGM Excel — does every calculation, and the answer
is built from those computed numbers. So even a mid-size local model cannot
hallucinate a margin: at worst it misreads the request, which you can see and
correct. The model also drives the on-page dashboard, so the conversation and the
simulator stay in sync.

== Install ==
1. Zip the `dnai-cgm` folder and upload it under Plugins → Add New → Upload,
   or copy `dnai-cgm/` into wp-content/plugins/. Activate it.
2. Go to Settings → D²nAI CGM and fill:
   - AI Lab base URL : https://lab.ocpnutricrops.ai
   - API path        : /api/chat/completions   (Open WebUI default)
   - API key         : an Open WebUI API key (Settings → Account → API Keys)
   - Copilot model   : your Open WebUI model id (Qwen recommended; Mistral works;
                       GPT-OSS as a fallback). You can point it at a custom model
                       that already carries the role (e.g. cgm-copilote).
   - JSON mode       : on (sends response_format=json_object for reliable JSON;
                       harmless if your backend ignores it — the proxy also
                       tolerates plain / fenced JSON)
   The API key stays server-side; the browser calls the WP REST proxy
   /wp-json/dnai-cgm/v1/chat, which then calls the AI Lab (no CORS, key hidden).

   Option B (role in the model): if you embed the system prompt in your Open WebUI
   custom model, you can leave the plugin's "System prompt" field empty — the
   plugin then sends no system message and your model carries the contract.

== Use ==
- Add the shortcode  [dnai_cgm]  to any page.
- Two views via the top toggle: "Vue commerciale" (detailed Sales tool, with the
  copilot and tabbed Scénarios / Sensibilité / Comparaison / Historique to keep
  scrolling short) and "Vue direction" (a clean executive summary). Both share the
  same engine and state, so switching keeps the current product and prices.
- Type a question in the copilot box, e.g.:
  - "Analyse le 00-18-10 à 720 $/t"
  - "Quel est le prix plancher pour préserver la marge DAP ?"
  - "Si le soufre passe à 150, qu'arrive-t-il à la marge ?"
  - "Quelles formules créent le plus de valeur ?"
- The copilot sets the simulator (product, reference, prices, sensitivity) and
  answers with the engine's numbers. You can still drive everything by hand.
- Data & formulas: anyone on the page can download the current dataset (CSV for
  Excel, or JSON) from the download buttons at the top of the Sales view. Admins
  replace the dataset in Settings → D²nAI CGM by uploading the original Excel
  workbook (.xlsx, same structure as CGM_Simulator_MVP.xlsx — sheets BDD_LIGNES
  and "CGM SIMULATOR") with the real values; it is converted automatically. A
  JSON file in the export format is also accepted. The content is validated
  before it takes effect, and a reset restores the built-in default. The bundled
  data is placeholder/dev data — upload the real values to go live.
- The simulation history (per-browser) supports save / CSV export / clear.

== How the copilot works ==
1. The model receives the product catalog + the current simulator state and the
   user's request, and returns ONLY a JSON action (intent, product_index, ref,
   price, rm overrides, refprice, sens, plus a short number-free "preface").
2. The front-end validates the JSON, applies it to the engine state, runs
   compute(), and renders the factual answer from the computed values.
3. If the request is ambiguous, the model returns a "clarify" question instead.

== Plug-n-play ==
Any OpenAI-compatible /chat/completions endpoint works (Open WebUI, vLLM,
Azure OpenAI via gateway…). Only base URL + path + key + model change.
