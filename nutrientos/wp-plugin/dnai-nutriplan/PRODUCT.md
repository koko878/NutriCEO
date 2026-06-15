# NutriPlan — Trial Management Cockpit

> Couche **Plan & Govern** au-dessus de [NutriTrials](https://nutritrials.ma).
> Pilote le cycle de management des trials agronomiques OCP Nutricrops :
> du Call for Proposal jusqu'au passage en exécution dans NutriTrials,
> en passant par les Steering / CEO / Monitoring gates, le Fast Track
> et le Knowledge Base de clôture.

## Register

**product** — design SERVES the product. C'est une app interne (dashboards,
tables, formulaires, workflow d'approbation). Pas une landing page, pas une
campagne marketing. La typographie editorial (Cormorant Garamond) sert à
contrebalancer la densité data, pas à porter un récit.

## Users & contexte

### Personas principaux
- **SAI** (Scientific Affairs & Innovation, R&D OCP) — orchestre le cycle annuel, valide les Use Cases, anime les gates. Pouvoir admin global.
- **Sponsor BU** (Africa, Brazil, India, Europe, NAM, APAC) — soumet les trials de sa BU, suit son portefeuille, défend ses sujets en steering.
- **Trial owner** — propriétaire opérationnel d'un trial, soumet, met à jour, clôture.
- **Comités** (Steering, CEO gate, Monitoring) — consulte le portefeuille en décision.
- **CEO / EVP** (Fast Track approbateur, lecteur exec).

### Contexte d'usage
Bureau, navigateur, écrans larges principalement. Mobile rare (consultation, pas saisie). Connectivité fiable. Sessions courtes et focalisées (vérifier statut, valider un gate, soumettre un trial).

### Job-to-be-done
- *Pour SAI* : « instruire les 20-50 trials du cycle 2026 sans rien perdre, garder la traçabilité, livrer le portefeuille validé à NutriTrials »
- *Pour Sponsor BU* : « voir où en sont mes trials, soumettre rapidement, comprendre pourquoi un trial est bloqué »
- *Pour Trial owner* : « créer un trial en moins de 5 min, suivre les gates, recevoir une décision claire »

## Marque & personnalité

### Identité visuelle (imposée — non-négociable)
- **OCP Nutricrops** (filiale OCP Group, Maroc) — agriculture / nutrition phosphatée
- **D²nAI** (équipe Data, Digital & AI Nutricrops — opère l'app)
- Palette verte OCP (#1B5E20, #2E7D32, #4CAF50, etc.) — verts végétaux profonds
- **Cormorant Garamond** (serif éditorial) pour titres / KPIs / display
- **Inter** (sans humanist) pour corps / UI / data
- Pair sur contraste serif×sans : conforme à la règle impeccable

### 3 mots de personnalité
- **Sobre** — outil de travail, pas un dashboard SaaS bling
- **Précis** — chiffres tabulaires, hiérarchie claire, pas de marketing flou
- **Respectueux** — n'interrompt pas le métier ; sert le workflow réel

## Anti-references (ce qu'on ne veut pas)

- **Salesforce / Workday** — overload de boutons, hiérarchie noyée, modales partout
- **Notion / Linear** — trop "tech indé", pas dans le register corporate OCP
- **Dashboards SaaS génériques** — gradient violet "AI", cards uniformes 3-col, big-number/small-label en boucle
- **Tableurs déguisés** — ne pas reproduire un Excel à plat
- **Tout ce qui sent "AI slop"** : eyebrow uppercase tracked sur chaque section, gradient text, glassmorphism décoratif, side-stripe borders > 1px

## Outcomes mesurables (cycle 2026)

- 100% des trials du cycle 2026 instruits dans NutriPlan (vs. Excel/mail)
- Zéro trial "perdu" (B1 fix livré en v0.8) — création d'un trial → apparition immédiate et persistance multi-utilisateur
- Tous les 11 référentiels SAI éditables sans dev (v0.8 Admin CRUD)
- Drill-down KPIs honnête (v0.10.2) : si je clique, ça filtre vraiment
- Modales premium : zéro `prompt/alert/confirm` natif (v0.10)
- i18n 100% FR/EN/PT-BR

## Accessibilité

- WCAG AA minimum (contraste ≥4.5:1 corps, ≥3:1 large)
- Tabular numerics sur tous les chiffres (alignement vertical)
- Focus visible (ring vert), nav clavier (ESC modal, Enter submit, Ctrl/Cmd+K search)
- `prefers-reduced-motion` à brancher en passe `animate` future
- Pas de couleur seule pour porter l'info (statuts = pill + libellé + couleur)

## Stack & contraintes techniques

- WordPress plugin (mono-fichier HTML embarqué) — pattern D²nAI
- Vanilla JS, zéro dépendance build (pas de React, pas de Tailwind)
- BDD MySQL custom + REST API WordPress (table `{prefix}dnai_nplan_store`)
- Hébergement derrière Azure Front Door (cookie-bound nonce contourné, same-origin)
- Souveraineté : data Maroc, conformité loi 09-08 (cf. note CEO)
- Charte vert OCP non-négociable (imposée par CLAUDE.md projet)

## Source de vérité

- `BRIEF-V07-FEEDBACK-PM-ADMIN.md` (cadrage métier + 37 retours SAI consolidés)
- `ADMIN-SPEC.md` (spec écran admin + 20 référentiels)
- `brief-metier-2026-06/` (exports feedback + transcript revue + Excel SAI v2)
- `readme.txt` (changelog versions 0.5 → 0.10)

*Rédigé par D²nAI · juin 2026 · base pour les passes impeccable (audit / critique / polish).*
