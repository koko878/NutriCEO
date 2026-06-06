=== Atlas — Second cerveau D²nAI ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 0.2.1
Requires at least: 6.0
Requires PHP: 8.0
License: GPL-2.0-or-later

Cockpit mobile-first pour Hamza Koh (Head of Data, Digital & AI).
Branché sur un agent Copilot Studio via le nouveau Microsoft 365 Agents
SDK (Power Platform API). Authentification Microsoft 365 SSO obligatoire
(OAuth 2.0 Authorization Code + PKCE), relais côté serveur PHP pour ne
jamais exposer le token au browser.

== Architecture ==

  [browser /atlas]
       │  fetch POST /wp-json/atlas/v1/start | /send
       ▼
  [WP server endpoint]
       │  refresh OAuth token si expiré (via refresh_token user-scoped)
       │  POST https://{env}.environment.api.powerplatform.com/.../conversations
       │   Authorization: Bearer {fresh access_token}
       ▼
  [Copilot Studio Direct-to-Engine API]
       │  réponse SSE — parsée côté serveur, renvoyée en JSON au browser
       ▼
  [browser rendu]

Aucun secret ne passe par le navigateur. Le client_secret Azure AD, le
refresh_token de l'utilisateur, et la connection string Copilot Studio
restent tous côté serveur PHP.

== Install ==

1. Plugins → Add New → Upload Plugin → atlas.zip → Activate.
2. Settings → Permalinks → Save (rafraîchit pretty URLs).
3. Settings → Atlas → remplir les 3 sections (voir ci-dessous).
4. Ouvrir https://YOURSITE/atlas → redirect vers Microsoft → login → cockpit.

== Setup Azure AD App Registration ==

1. Portail Azure → Microsoft Entra ID → App registrations → New registration
2. Name : "Atlas — D²nAI" · Single tenant
3. Redirect URI : Web → coller la valeur affichée dans Settings → Atlas
   (format https://YOURSITE/?atlas_sso=callback)
4. Noter Application (client) ID + Directory (tenant) ID
5. Certificates & secrets → New client secret → 24 mois → copier la Value
6. API permissions → Add a permission → Delegated :
   - Microsoft Graph : openid, profile, email, User.Read, offline_access
   - Power Platform API : CopilotStudio.Copilots.Invoke
7. Grant admin consent for <tenant>
8. Coller tenant/client/secret dans Settings → Atlas

== Piège classique — "Power Platform API" introuvable ==

Quand tu ajoutes une permission et que tu cherches "Power Platform API",
elle peut ne PAS apparaître dans la liste des APIs disponibles. C'est
parce que le service principal n'existe pas encore dans ton tenant.

L'admin IT doit lancer une seule fois cette commande PowerShell :

  Add-MgServicePrincipal -AppId "8578e004-a5c6-46e7-913e-12f58912df43"

(C'est l'App ID public de "Power Platform API". La commande la rend
visible dans toutes les App Registrations du tenant. À faire une fois.)

Documentation MS officielle :
https://learn.microsoft.com/en-us/power-platform/admin/programmability-authentication-v2#step-1-determine-which-power-platform-api-permissions-your-application-needs

== Setup Copilot Studio ==

1. copilotstudio.microsoft.com → ton agent Atlas
2. Settings → Security → Authentication → choisir "Authentifier avec
   Microsoft" (built-in Entra ID) — REQUIS pour Atlas v0.2+
3. Channels → Application Web → onglet "Microsoft 365 Agents SDK"
4. Copier la "Chaîne de connexion" complète (URL avec /conversations
   et api-version)
5. Coller dans Settings → Atlas → "Connection string"

== Whitelist ==

Settings → Atlas → UPN autorisés : un email par ligne. Une ligne qui
commence par @ autorise tout le domaine. Recommandation : commence par
ton seul UPN.

== Sécurité ==

* Client secret Azure : stocké via update_option avec autoload=false.
  Jamais sérialisé dans le bridge JS. Jamais loggé.
* Tokens utilisateur (access + refresh) : user meta scoped, cleared on
  logout. Refresh token rotaté à chaque refresh si Microsoft en renvoie
  un nouveau.
* OAuth state : transient 10min single-use (anti-CSRF). PKCE S256.
* Le browser ne reçoit JAMAIS de token Microsoft — tous les appels API
  passent par les endpoints /wp-json/atlas/v1/start et /send.
* Nonce wp_rest requis sur chaque appel des endpoints REST.

== Use ==

URL pleine page (recommandée pour install mobile en PWA) :
  https://YOURSITE/atlas

Shortcode (intégration dans une page WP) :
  [atlas]                            défauts : max-width 430px, height 900px
  [atlas height="700"]               hauteur personnalisée
  [atlas width="100%" height="100vh"] pleine page

L'embed est un iframe vers /atlas → bénéficie de la même auth SSO et
des mêmes endpoints REST, isolé du CSS du thème WP.

== Changelog ==

= 0.2.1 =
* Fix shortcode [atlas] : bascule en iframe vers /atlas plutôt que
  d'essayer d'extraire le <body> seul (ce qui privait la UI du bridge
  JS et des styles). Accepte attributs height + width.

= 0.2.0 =
* Refactor majeur : abandon du SDK Direct Line classique (déprécié dans
  les nouveaux tenants Copilot Studio). Bascule vers le Microsoft 365
  Agents SDK + Power Platform API.
* Relais serveur PHP : le browser ne parle plus à Microsoft directement.
* OAuth scope étendu pour inclure CopilotStudio.Copilots.Invoke.
* Stockage des access/refresh tokens par utilisateur, refresh transparent.
* Mode Lite supprimé (l'API Copilot Studio impose l'auth OAuth).
* Réécriture complète de includes/token.php → includes/chat.php avec
  parser SSE et endpoints /v1/start + /v1/send.

= 0.1.1 =
* Auto-détection Lite vs SSO selon configuration.

= 0.1.0 =
* Initial release — Direct Line classique + SSO M365.
