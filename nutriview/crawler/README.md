# NutriView Connect — extraire le modèle de données de n'importe quelle app

Objectif : pour **n'importe quelle application** (y compris derrière une
authentification — Salesforce, apps Entra/SSO, etc.), faire **entrer NutriView**,
en **extraire les objets-donnée**, et les **cataloguer pour classification DGSSI**.

Sortie commune (tous les connecteurs) :

```json
{ "source": "...", "objects": [ { "name": "Account.Email", "source": "salesforce", "sample": "Email · email" } ] }
```

→ déposable directement dans NutriView (**Ingestion → fichier `.json`**), qui en
fait des données candidates + auto-mapping data domain.

## Principe : API-first, navigateur en dernier recours

La donnée d'une app vit dans son **modèle exposé par API**, pas dans ses pixels.
La quasi-totalité des apps d'entreprise l'exposent :

| Type d'app | Connecteur | Ce qu'on lit |
|---|---|---|
| Salesforce | `salesforce` | OAuth2 → API *describe* (`/sobjects/<X>/describe`) → tous les champs |
| API REST avec spec | `openapi` | document OpenAPI/Swagger → schémas + champs |
| API GraphQL | `graphql` | introspection du schéma → types + champs |
| OData (Dynamics, SAP…) | `odata` *(roadmap)* | `$metadata` → EntityType/Property |
| Base de données | `db` *(roadmap)* | `information_schema` → tables/colonnes |
| **SPA sans API** | `browser` (crawl.mjs) | session rejouée → capture des XHR + libellés DOM |

Le **navigateur headless** (`crawl.mjs`) n'est que le **fallback** pour les apps
qui n'exposent aucune API et ne rendent qu'en JS.

## Authentification (souveraine)

On ne stocke jamais de secret dans le front ; passer les tokens par variables
d'environnement / coffre (Key Vault, Databricks secrets).

- **Salesforce** : `client_credentials` ou `password` flow d'un **utilisateur
  d'intégration** (connected app, scope lecture). Ou un access_token existant.
- **OpenAPI / GraphQL** : `--token <bearer>` (jeton d'un service principal /
  compte d'intégration en lecture seule).
- **SPA (browser)** : `storageState` — on se connecte **une fois** à la main
  (SSO + MFA), la session est rejouée. Voir plus bas.

## Usage

```bash
npm install            # node-fetch est natif (Node 18+) ; Playwright pour le browser
npx playwright install chromium   # uniquement pour le connecteur browser

# Salesforce — extrait tous les sobjects et leurs champs
node nview-connect.mjs --connector salesforce \
  --instance https://mondomaine.my.salesforce.com \
  --client-id "$SF_CLIENT_ID" --client-secret "$SF_CLIENT_SECRET" \
  --username "$SF_USER" --password "$SF_PASS" \
  --objects Account,Contact,Opportunity > sf-objets.json
# (ou --token "$SF_TOKEN" si on a déjà un access_token)

# API REST avec OpenAPI protégé
node nview-connect.mjs --connector openapi --url https://app/api/openapi.json --token "$API_TOKEN" > api-objets.json

# API GraphQL
node nview-connect.mjs --connector graphql --url https://app/graphql --token "$API_TOKEN" > gql-objets.json

# SPA sans API (fallback navigateur, session sauvegardée)
npx playwright codegen --save-storage=session.json https://app/        # login SSO une fois
node crawl.mjs --url https://app/ --auth storageState --state session.json > spa-objets.json
```

Puis : NutriView → **Ingestion → Déposer** le `.json` → catalogue → classification.

## Déploiement souverain (recommandé)

Ce kit **ne tourne pas dans le plugin WordPress**. Il s'exécute comme **service /
container dans le tenant Nutricrops** (même périmètre souverain que Databricks) :

- les connecteurs API (salesforce/openapi/graphql) sont du **Node pur** (fetch),
  légers — un petit container ou un job suffit ;
- le connecteur **browser** ajoute Chromium (Playwright) — container Node+Chromium
  (Azure Container Instance / App Service container) ;
- secrets en **coffre** (Key Vault / Databricks secrets), jamais dans le front ;
- accès **journalisés** (qui a extrait quoi, quand) — exigence DGSSI ;
- déclenché à la demande par NutriView, ou en CLI par le chargé de projet.

## Garde-fous

- Lecture seule (describe / introspection / GET ; aucune écriture).
- Plafonds (`--max-objects`), filtre `--objects`.
- Connecteur browser : même origine, `--max-pages`, ne soumet aucun formulaire
  applicatif (hors login).
- À cadrer avec le RSSI : un agent qui se connecte à une app = accès à tracer.

## Statut (prouvé end-to-end contre des mocks)

- `salesforce` : OAuth password → describe → champs (Account.*, Contact.*). ✅
- `openapi` : Bearer → schémas/champs ; 401 sans token. ✅
- `graphql` : introspection Bearer → types/champs. ✅
- `browser` : login formulaire → capture XHR derrière le mur de connexion. ✅

Tests : `test/connect.test.mjs` (APIs), `test/crawl.test.mjs` (browser),
mocks `test/mock-apis.php` & `test/mock-sso.php`.

Reste à brancher sur les vraies instances (nécessite, côté IT : un utilisateur
d'intégration / connected app Salesforce, un service principal pour les API, ou
une session sauvegardée pour les SPA).
