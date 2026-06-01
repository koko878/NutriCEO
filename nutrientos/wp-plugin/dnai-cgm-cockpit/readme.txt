=== D²nAI CGM Cockpit — Crisis Center ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 1.8.2
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
