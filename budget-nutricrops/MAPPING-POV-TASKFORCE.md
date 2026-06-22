# Mapping : besoins budget Nutricrops ↔ spec PoV « Agent Task Force CAPEX »

> Croise les **18 besoins** (tableau v2) avec la **spec PoV** que tu m'as passée (agent souverain ancré SharePoint, lecture seule, cité, garde-fou numérique). Objectif : savoir **ce que le PoV couvre déjà**, **ce qui en est explicitement hors-scope**, et **ce qui est candidat phase 2** (gestion budget « run », au-delà du PoV interrogation).
> Rappel : le PoV répond à des **questions** sur un dossier (read-only). Il ne *gère* pas le budget — il le *rend interrogeable et défendable*. Plusieurs besoins du tableau sont donc structurellement hors PoV (ils impliquent de l'écriture / du workflow).

---

## Légende

- 🟢 **Dans le PoV** — couvert par la spec telle quelle (ou trivialement).
- 🟡 **Partiel** — le PoV adresse une partie, le reste est phase 2.
- 🔵 **Phase 2** — cohérent avec la cible mais hors périmètre PoV (souvent : écriture, workflow, intégration SAP).
- ⚪ **Hors scope PoV** — non-objectif explicite de la spec (§2).

---

## Tableau de mapping

| # | Besoin (v2) | Épic | Statut PoV | Justification / renvoi spec |
|---|---|---|---|---|
| 3 | Modèle de donnée canonique | E1 | 🟢 **Dans le PoV** | Spec §6 : `EngagementLine` + `ResourceAssignment` déjà typés. Le PoV **impose** déjà ce schéma. |
| 1 | Source de vérité unique des engagements | E1 | 🟡 **Partiel** | PoV §4 : « le dossier SharePoint reste l'unique source de vérité, les stores sont des projections ». Le PoV *lit* la source unique mais ne la *crée* pas (pas d'écriture, §2). La création du référentiel = phase 2. |
| 4 | Mapping ressource ↔ ligne | E2 | 🟢 **Dans le PoV** | Spec §6 `ResourceAssignment` + §12 questions 4 & 7 (Ayoub Reda, TJM Mouchine Waraq). Cas d'usage central du PoV. |
| 6 | Justifications structurées défendables | E4 | 🟢 **Dans le PoV** | Spec §7 outil `searchDocuments` (narratif) + §12 question 5 (« pourquoi la ligne Data Catalog est justifiée »). Le PoV *restitue* les justifications citées. |
| 5 | Suivi PR→OTP→PO→SAP→facture→paiement | E3 | 🟡 **Partiel** | Le PoV peut *répondre* « quel est le statut de paiement de la ligne X » SI la donnée est dans le dossier (PaymentTracking ingéré). Mais le *suivi vivant* (statut temps réel SAP) = 🔵 phase 2 (intégration SAP hors PoV). |
| 2 | Anti-redondance (1 saisie → N exports TF) | E5 | 🔵 **Phase 2** | Implique génération d'exports / templates = écriture. PoV est read-only (§2). Mais le PoV prouve que la donnée *peut* être interrogée de façon fiable → fondation de l'anti-redondance. |
| 7 | Multi-devise + conversion | E1 | 🟡 **Partiel** | Le PoV peut restituer un montant + devise tel quel (garde-fou numérique §8.3). La *conversion consolidée* (taux) = logique métier, phase 2. |
| 8 | Forecast vs réalisé à date | E3 | 🟡 **Partiel** | Si « réalisé » est dans le dossier, `queryEngagementLines` peut le rendre. Le *calcul d'écart automatisé* = phase 2. |
| 9 | Catalogue prestataires + contrats + avenants | E2 | 🟢 **Dans le PoV** | `searchDocuments` sur contrats/avenants + normalisation vendor (spec §6 « normaliser BI new vision / BI NewVision »). |
| 10 | Workflow scénarios d'arbitrage | E4 | ⚪ **Hors scope** | Spec §2 non-objectif : « pas de workflow d'approbation ou d'action ». Production de scénarios = humain + phase 2. |
| 13 | Détection « justification faible / champ vide » | E4 | 🟡 **Partiel** | Le PoV *sait répondre* « cette ligne a-t-elle une justification ? » (abstention §8.5 si absente). La *détection proactive batch* = phase 2. |
| 12 | Calendrier deadlines TF + comités | E5 | ⚪ **Hors scope** | Pas dans le corpus interrogeable du PoV (donnée calendaire externe). |
| 14 | Historique décisions & traçabilité | E4 | 🟡 **Partiel** | Le PoV *journalise* requêtes + sources (§10 audit). Mais traçabilité des *décisions d'arbitrage* = phase 2 (nécessite écriture). |
| 15 | Rattachement budget ↔ roadmap (JH) | E2 | 🔵 **Phase 2** | Si fichiers de suivi JH ingérés, interrogeable ; sinon hors corpus. Suivi vivant = phase 2. |
| 16 | Alerte budget engagé saturé | E3 | 🔵 **Phase 2** | Alerting = push proactif, le PoV est pull (question→réponse). Phase 2. |
| 11 | Inter-entité : qui paie qui (cross-charge) | E6 | 🟡 **Partiel** | Le PoV peut répondre « qui paie la ligne X » si documenté (mail Faïçal OCPS/Consort). Réconciliation cross-charge = phase 2. |
| 17 | Anticipation renouvellements licences | E5 | 🔵 **Phase 2** | Nécessite dates de fin + alerting. Le PoV peut répondre « quelles licences finissent en 2026 » si la donnée existe. |
| 18 | Garde-fous PII / refus RH | E6 | 🟢 **Dans le PoV** | Spec §8.4 security trimming + §8.6 « refus PII / RH / salaires ». Déjà un rail non négociable. |

---

## Synthèse

| Statut | Nb besoins | Lesquels |
|---|---|---|
| 🟢 Dans le PoV | **5** | #3, #4, #6, #9, #18 |
| 🟡 Partiel | **7** | #1, #5, #7, #8, #11, #13, #14 |
| 🔵 Phase 2 | **4** | #2, #15, #16, #17 |
| ⚪ Hors scope PoV | **2** | #10, #12 |

**Lecture** : le PoV couvre **pleinement 5 besoins et partiellement 7** — soit **12/18 touchés**, dont les 4 fondations critiques (#3 modèle, #4 mapping, #6 justifications, #1 source de vérité en lecture). C'est un **excellent ratio pour un PoV de 2 semaines** : il prouve la faisabilité sur le cœur, et trace naturellement la phase 2 (écriture, workflow, alerting, intégration SAP).

**Le PoV est le bon premier pas.** Il dérisque la fondation (interroger de façon fiable, citée, sécurisée) sans s'engager sur l'écriture/workflow — qui sont le gros du risque et de l'effort.

---

## Frontière PoV → produit « gestion budget »

```
        ┌──────────────────────── PoV (2 sem, read-only) ────────────────────────┐
        │  Interroger le dossier de façon ancrée, citée, sécurisée                │
        │  → #3 modèle · #4 mapping ressources · #6 justifications · #9 vendors    │
        │  → #1 (lecture) · #18 PII · #5/#7/#8/#11/#13/#14 (réponses partielles)   │
        └─────────────────────────────────────────────────────────────────────────┘
                                         │  si concluant
                                         ▼
        ┌──────────────── Phase 2 — produit « gestion budget » ───────────────────┐
        │  Écriture + workflow + alerting + intégration SAP                        │
        │  → #1 (création référentiel) · #2 exports multi-TF · #5 chaîne vivante   │
        │  → #10 scénarios · #16 alertes · #17 renouvellements · #11 cross-charge  │
        └─────────────────────────────────────────────────────────────────────────┘
```

---

*Mapping · D²nAI · juin 2026 · croise tableau v2 (18 besoins) × spec PoV Agent Task Force CAPEX · branche `claude/budget-nutricrops`.*
