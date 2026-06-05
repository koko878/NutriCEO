=== D²nAI Office — digital twin ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 0.2.0
Requires at least: 6.0
Requires PHP: 7.4
License: GPL-2.0-or-later

Mobile-first cockpit for the D²nAI Office digital twin. Each WP user gets
their own personal AI assistant configurable via the admin settings page:
display name, signature, SharePoint knowledge base URL, contacts
whitelist / blacklist / watchlist, allowed topics, and personal hard
guardrails on top of the system-wide ones.

The cockpit is served at /dnai-office (logged-in users only) and can also
be embedded in any WP page via the [dnai_office] shortcode. Mobile-first
by design — frame iPhone for desktop demo, full-screen on phones.

== Install ==
1. Plugins → Add New → Upload Plugin → choose dnai-office.zip → Install → Activate.
2. If pretty URLs 404, go to Settings → Permalinks → Save.
3. Settings → D²nAI Office → configure your digital twin (display name,
   SharePoint URL, signature, contacts, topics, guardrails).
4. Open https://YOURSITE/dnai-office to test the cockpit.

== Use ==
Full-screen URL (recommended for mobile install):
  https://YOURSITE/dnai-office
Shortcode (embed in any WP page):
  [dnai_office]

Each WP user has their own twin configuration. Super-admins can edit
other users' configurations via the user picker in the settings page.

== Settings layout ==
1. Identity — display name, job title, default language
2. Branding — signature pill (header) and full signature (sent messages)
3. SharePoint — folder URL and display label (the bot's knowledge base)
4. Backend AI — provider-agnostic endpoint URL and token
5. Behaviour — auto-send, delay-send, poll cadence, digest email
6. Contacts — whitelist (bot-first), blacklist (never bot), watchlist
   (immediate escalation). Match by full address or @domain.
7. Topics & guardrails — allowed topics + personal forbidden list.
   Hard-coded guardrails (pricing, budget, confidential, HR, legal,
   commitment) are always enforced and cannot be disabled from the UI.
