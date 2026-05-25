=== D²nAI NutrientOS ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 1.1.0
Requires at least: 6.0
Requires PHP: 7.4
License: GPL-2.0-or-later

Hosts the NutrientOS prototype, the executive one-pager and the executive
summary on your WordPress site — as shortcodes and as direct, mobile-friendly
URLs (fully interactive on iPhone/Android, unlike an HTML file sent by chat).

== Install ==
1. Plugins → Add New → Upload Plugin → choose `dnai-nutrientos.zip` → Install → Activate.
   (Or copy the `dnai-nutrientos/` folder into wp-content/plugins/ and activate.)

== Use — Option A: shortcodes (recommended, gives a clean page URL) ==
Create a new Page (e.g. "NutrientOS") and put ONE shortcode in it:
  [nutrientos]            → the interactive platform prototype
  [nutrientos_exec]       → the 1-page executive (Why/What/How)
  [nutrientos_execsum]    → the detailed executive summary
Publish, then share that page's URL. Works on mobile.
Optional height: [nutrientos height="900px"]

Tip: for a clean full-screen feel, use a blank/"canvas" page template if your
theme offers one.

== Use — Option B: direct URLs (no page needed) ==
After activation, these links are live and shareable:
  https://YOURSITE/wp-content/plugins/dnai-nutrientos/app/index.html
  https://YOURSITE/wp-content/plugins/dnai-nutrientos/app/exec.html
  https://YOURSITE/wp-content/plugins/dnai-nutrientos/app/execsum.html

== Update the content ==
Replace the files in `app/` (index.html / exec.html / execsum.html) with newer
versions and re-upload the plugin. No database, no settings.
