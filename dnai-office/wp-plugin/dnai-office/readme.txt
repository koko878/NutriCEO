=== D²nAI Office — Hamza's digital twin console ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 0.1.0
Requires at least: 6.0
Requires PHP: 7.4
License: GPL-2.0-or-later

Admin console for the D²nAI Office agent. The agent runs on the user's
Windows machine, reads Outlook desktop via MAPI (no Exchange server access
needed, no IT involvement), generates replies via the D²nAI backend, and
syncs its configuration from this plugin via REST.

== Install ==
1. Plugins → Add New → Upload Plugin → choose dnai-office.zip → Install → Activate.
2. If pretty URLs 404, go to Settings → Permalinks → Save.
3. Open https://YOURSITE/dnai-office (requires WP login) to configure
   your bot — contacts, topics, persona, signature, backend URL.

== Use ==
The console is per-user — each WP-logged-in user gets their own bot
configuration. Designed to scale to multiple OCP managers piloting the
D²nAI Office product.

== Architecture ==
Console (WP plugin)  ⇄  REST API  ⇄  Agent .exe on the user's Windows PC
                                       ↓ MAPI/COM
                                    Outlook desktop
                                       ↓ HTTPS via VPN
                                    D²nAI backend (LLM)
