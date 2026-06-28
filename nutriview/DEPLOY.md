# Déploiement NutriView — pas à pas

Trois briques, indépendantes. **Seule la brique A est obligatoire.**

| Brique | Rôle | Obligatoire ? | Où ça tourne |
|---|---|---|---|
| **A. Plugin WordPress** | l'app NutriView (classification, validation, signature, PDF) | ✅ oui | ton site WordPress |
| **B. IA souveraine** | suggestions de classification + extraction sémantique | optionnel | Databricks (tenant) |
| **C. NutriView Connect** | scanner une app (Salesforce, API, SPA) → objets-donnée | optionnel | container Node dans le tenant |

---

## A. Plugin WordPress (obligatoire) — ~5 min

**Prérequis** : un site WordPress (≥ 6.0, PHP ≥ 7.4), un compte admin.

1. **Installer** : WP-admin → Extensions → Ajouter → **Téléverser une extension** →
   choisir `dnai-nutriview-v0.7.4.zip` → Installer → **Activer**.
2. **Permaliens** : Réglages → Permaliens → **Enregistrer** (sans rien changer).
   Indispensable pour que la route `/nutriview` réponde.
3. **Ouvrir l'app** : `https://ton-site/nutriview` (ou shortcode `[nutriview]`
   dans une page). Tu dois voir l'écran « Classifications DGSSI ».
4. **Gouvernance** : dans l'app → **Admin** → saisir tes référentiels
   (Entités, Functions/BU, Data Domains + leurs **owners**), puis onglet
   **Accès** : attribuer les rôles par login (Administrateur / Chef de projet /
   Propriétaire / Lecteur).
   - Amorçage : tant qu'aucun admin n'est défini, tout utilisateur connecté a
     l'accès complet. **Mets-toi admin en premier**, sinon tu te verrouilles.

> ⚠️ **Limite importante (à connaître avant de déployer en multi-utilisateurs).**
> Dans cette version, les **projets/classifications sont stockés dans le
> navigateur** (localStorage), pas sur le serveur. Conséquences :
> - un projet créé sur un poste n'est PAS visible sur un autre poste/navigateur ;
> - le workflow multi-propriétaires (inbox d'un owner sur SA machine) suppose
>   une persistance serveur **pas encore implémentée** (prévue phase 1 :
>   REST + MySQL).
>
> Utilisable tel quel pour : démo, exercice de classification mono-poste,
> production du livrable PDF signé. Pour du vrai multi-utilisateurs partagé,
> il faut d'abord brancher la persistance serveur (voir « Étape suivante »).

---

## B. IA souveraine Databricks (optionnel) — suggestions + extraction

Sans ça, NutriView marche en mode déterministe + heuristique (l'IA est juste
absente, rien ne casse).

**Prérequis** : un workspace Databricks (région EU/France), un endpoint Model
Serving, un PAT (token).

1. WP-admin → Réglages → **NutriView AI**.
2. Renseigner : **workspace URL**, **modèle** (ex. un Claude/LLM servi), **PAT**.
3. Enregistrer. L'app passe en mode IA (suggestions C/I/D citées Annexe II,
   extraction sémantique au scan/collage).

Le front ne parle jamais à Databricks directement : tout passe par le proxy
WP (`/wp-json/dnai/nview/v1/ai/*`), même origine + nonce. Le PAT reste côté
serveur.

---

## C. NutriView Connect — scanner une app (optionnel)

Pour « faire entrer NutriView dans une app et récupérer ses objets-donnée ».
**Ne tourne PAS dans WordPress** (besoin de Node, d'appels OAuth sortants et,
pour les SPA, d'un navigateur headless).

### C.1 Essai rapide en local

**Prérequis** : Node ≥ 18.

```bash
unzip nutriview-connect-v0.1.zip && cd crawler
npm install
# (uniquement pour le connecteur "browser" / SPA :)
npx playwright install chromium
```

Lancer le bon connecteur selon l'app :

```bash
# Salesforce → tous les objets + champs
node nview-connect.mjs --connector salesforce \
  --instance https://tondomaine.my.salesforce.com \
  --client-id "$SF_CLIENT_ID" --client-secret "$SF_CLIENT_SECRET" \
  --username "$SF_USER" --password "$SF_PASS" \
  --objects Account,Contact,Opportunity > sf.json

# API REST avec OpenAPI/Swagger (jeton lecture)
node nview-connect.mjs --connector openapi --url https://app/api/openapi.json --token "$API_TOKEN" > api.json

# API GraphQL
node nview-connect.mjs --connector graphql --url https://app/graphql --token "$API_TOKEN" > gql.json

# SPA sans API (login SSO fait UNE fois, session rejouée)
npx playwright codegen --save-storage=session.json https://app/
node crawl.mjs --url https://app/ --auth storageState --state session.json > spa.json
```

Puis : NutriView → **Ingestion → Déposer un fichier** → le `.json` produit →
catalogue → classification.

### C.2 Mise en production (recommandé)

Container **Node + Chromium** (image type `mcr.microsoft.com/playwright`) déployé
dans le **tenant Nutricrops** (Azure Container Instance ou App Service container) :

1. Builder l'image avec le dossier `crawler/` + `npm ci`.
2. Stocker les secrets (PAT, client secret SF, `session.json`) dans **Key Vault**
   (ou Databricks secrets) — jamais en clair, jamais dans le front.
3. Exécuter à la demande (CLI par le chargé de projet) ou via un job planifié.
4. Récupérer le `.json` de sortie → l'ingérer dans NutriView.
5. **Journaliser** chaque exécution (qui / quoi / quand) — exigence DGSSI.

**Côté IT, il faut un accès lecture seule** : connected app + utilisateur
d'intégration (Salesforce), service principal (API), ou une session sauvegardée
(SPA). À cadrer avec le RSSI (un agent qui se connecte = accès à tracer).

---

## Ordre conseillé

1. **A** seul → tu as NutriView opérationnel (classification manuelle + import
   fichier + PDF signé).
2. **+ B** quand tu veux les suggestions IA.
3. **+ C** quand tu veux scanner des apps (Salesforce & co).

## Étape suivante (pour le vrai multi-utilisateurs)

Brancher la **persistance serveur des projets** (REST + table MySQL) pour que
les classifications soient partagées entre postes et que le workflow
multi-propriétaires fonctionne entre personnes différentes. C'est le seul
chantier bloquant pour un déploiement multi-utilisateurs ; dis-le-moi et je le
fais.
