=== Atlas — Second cerveau D²nAI ===
Contributors: D²nAI · OCP Nutricrops
Stable tag: 0.1.0
Requires at least: 6.0
Requires PHP: 8.0
License: GPL-2.0-or-later

Cockpit mobile-first pour Hamza Koh (Head of Data, Digital & AI). Branché
sur un agent Copilot Studio via Direct Line. Accès restreint par
authentification Microsoft 365 SSO (OAuth 2.0 Authorization Code + PKCE)
et whitelist d'UPN. Aucun credential MS365 n'est stocké dans WordPress :
seul le Direct Line secret y vit (côté serveur, jamais exposé au browser).

== Install ==
1. Plugins → Add New → Upload Plugin → choisir atlas.zip → Install → Activate.
2. Settings → Permalinks → Save (au cas où les pretty URLs ne se rafraîchissent pas).
3. Settings → Atlas → configurer les 3 sections : Azure AD, Direct Line, Whitelist UPN.
4. Ouvrir https://YOURSITE/atlas — tu es redirigé vers Microsoft 365 pour authentification.

== Setup Azure AD App Registration ==
1. Portail Azure → Microsoft Entra ID → App registrations → New registration
2. Name : "Atlas — D²nAI" · Supported account types : Single tenant (ton tenant OCP)
3. Redirect URI : Web → coller la valeur affichée dans Settings → Atlas du plugin
   (format : https://YOURSITE/?atlas_sso=callback)
4. Une fois créée : noter Application (client) ID et Directory (tenant) ID
5. Certificates & secrets → New client secret → expiration max → copier la valeur
6. API permissions → Microsoft Graph → Delegated → ajouter :
   openid, profile, email, User.Read, offline_access
   (puis "Grant admin consent for <tenant>" — peut nécessiter un IT admin)
7. Coller Tenant ID, Client ID, Client Secret dans Settings → Atlas

== Setup Copilot Studio agent + Direct Line ==
1. copilotstudio.microsoft.com → créer l'agent "Atlas" avec le system prompt
   et la knowledge SharePoint configurés
2. Settings → Channels → Direct Line → Add channel → copier l'une des deux clés
3. Coller dans Settings → Atlas → Direct Line secret

== Whitelist ==
Settings → Atlas → UPN autorisés : un email par ligne.
Une ligne qui commence par @ autorise tout le domaine (ex : @ocp.ma).
Démarrer avec ton seul UPN, élargir si besoin.

== Sécurité ==
* Client secret Azure et Direct Line secret : stockés via update_option avec
  autoload=false, jamais sérialisés dans le bridge JS, jamais loggés.
* Token Direct Line généré à la demande, scopé à une conversation et à un
  user.id stable dérivé de l'UPN. Expire en ~1h.
* OAuth state stocké dans un transient 10min, single-use (anti-CSRF).
* PKCE S256 obligatoire (sécurise même en cas de fuite du code).
* Session Atlas distincte de la session WP (méta utilisateur avec expiration
  8h). Logout via /?atlas_sso=logout n'invalide pas la session M365 tenant.

== Use ==
URL pleine page (recommandée pour install mobile en PWA) :
  https://YOURSITE/atlas
Shortcode (intégration dans une page WP) :
  [atlas]
