# NutriView Crawler — exploration d'app authentifiée

Agent souverain qui **entre dans une application** (y compris derrière SSO),
**l'explore**, et **récupère les objets-donnée** à cataloguer pour
classification DGSSI. Sa sortie JSON est directement ingérable par NutriView.

C'est la réponse au cas « le scan passif renvoie 0 donnée » : une SPA (React/
Angular) derrière Azure AD / Entra ID ne livre rien à un simple `GET` — il faut
un navigateur qui s'authentifie, exécute le JS, et capture les données.

## Pourquoi capturer le réseau, pas les pixels

La donnée réelle d'une SPA vit dans ses **réponses XHR/API (JSON)**, pas dans
le rendu. Le crawler intercepte toutes les réponses JSON pendant la navigation
et en déduit les objets-donnée (un champ = un objet à classifier). Il complète
avec les libellés du DOM rendu (formulaires, en-têtes de tableaux).

## Authentification (souveraine, sans automatiser un login MFA)

Automatiser un login SSO interactif est fragile (MFA, accès conditionnel) et
risqué. Trois modes, du plus recommandé au plus simple :

| Mode | Commande | Pour |
|---|---|---|
| **storageState** (recommandé SSO/Entra) | `--auth storageState --state session.json` | On se connecte **une fois** à la main (`npx playwright codegen --save-storage=session.json <url>`), la session est rejouée par le crawler. Aucun mot de passe stocké, MFA déjà passée. |
| **form** | `--auth form --login <url> --user <id> --pass <pwd>` | Apps internes simples à login formulaire (non-SSO). |
| **none** | `--auth none` | App publique. |

> Alternative encore plus propre quand l'app a une **API** : ne pas crawler le
> navigateur du tout, mais enregistrer NutriView comme **application Entra**
> (service principal, client-credentials, scope lecture seule) et lire
> directement l'**OpenAPI/Swagger** ou les endpoints. Plus robuste et plus
> auditable en contexte DGSSI. NutriView ingère déjà l'OpenAPI (`extractFromJson`).

## Usage

```bash
npm install            # installe Playwright (navigateur headless)
npx playwright install chromium

# App SSO : capturer la session une fois, puis crawler
npx playwright codegen --save-storage=session.json https://app.interne/quorum/
node crawl.mjs --url https://app.interne/quorum/ --auth storageState --state session.json --max-pages 8 > objets.json

# App à login formulaire
node crawl.mjs --url https://app/ --auth form --login https://app/login \
  --user "$NV_USER" --pass "$NV_PASS" > objets.json
```

Sortie `objets.json` :

```json
{
  "url": "...", "authMode": "storageState",
  "pages": ["...","..."],
  "endpoints": ["https://app/api/employes", "..."],
  "objects": [
    { "name": "matricule",   "source": "api:https://app/api/employes", "sample": "E001" },
    { "name": "salaireBrut", "source": "api:https://app/api/employes", "sample": "4200" }
  ]
}
```

Ce JSON se charge dans NutriView (Ingestion → Déposer un fichier `.json`), qui
en fait des données candidates + auto-mapping data domain.

## Déploiement souverain (prod)

Ce crawler **ne tourne pas dans le plugin WordPress** (un hôte WP n'a pas de
navigateur headless). Il s'exécute comme **service/container dans le tenant
Nutricrops** (le même périmètre souverain que Databricks) :

- conteneur Node + Chromium (Playwright) dans le réseau interne ;
- déclenché à la demande par NutriView (ou lancé par le chargé de projet) ;
- secrets (storageState / identifiants service) dans un coffre (Key Vault /
  Databricks secrets), **jamais dans le navigateur ni le front** ;
- journalisation des accès (qui a crawlé quoi, quand) pour l'audit DGSSI.

## Garde-fous

- Même origine uniquement pour l'exploration de liens (pas de fuite hors app).
- Plafond de pages (`--max-pages`).
- Lecture seule : le crawler ne soumet aucun formulaire applicatif (hors login).
- À cadrer avec le RSSI : un agent qui se connecte à une app = accès à tracer.

## Statut

Prototype **prouvé end-to-end** contre un mock SSO+SPA (login → SPA → XHR
`/api/employes`) : sans auth = 0 objet ; authentifié = champs extraits depuis
l'API protégée. Test : `crawl.test.mjs`. Reste à brancher sur une vraie app
Entra ID (nécessite un enregistrement d'app / une session sauvegardée côté IT).
