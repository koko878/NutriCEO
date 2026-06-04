=== D²nAI NutriPlan — Trial Management Cockpit ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 0.1.0
Requires at least: 6.0
Requires PHP: 7.4
License: GPL-2.0-or-later

Sister-app of NutriTrials covering the full upstream Trial Management cycle:
annual planning, Use Case intake, Steering / CEO / Monitoring gates, Fast
Track lane, closure & knowledge base. Includes a chat-with-data AI co-pilot.

== Install ==
1. Plugins → Add New → Upload Plugin → choose dnai-nutriplan.zip → Install → Activate.
2. (Optional) If the CGM Cockpit plugin is already configured, NutriPlan
   inherits the Databricks settings — no setup needed. Otherwise, Settings →
   NutriPlan AI to point at your Databricks workspace + endpoint + PAT.
3. If pretty URLs 404, go to Settings → Permalinks → Save.

== Use ==
Full-screen URL (no theme around it):
  https://YOURSITE/nutriplan
Shortcode (in a WP page):
  [nutriplan]
