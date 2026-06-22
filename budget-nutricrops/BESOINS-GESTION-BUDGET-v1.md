# Gestion du budget Nutricrops — Premier tableau de besoins (v1)

> Synthèse à partir de **79 mails** triés sur le sujet budget (PST → 7z → extraction msgconvert → digest markdown). Période : **janvier → juin 2026**. Acteurs : DSI Nutricrops + Task Force Digital CAPEX / OPEX Groupe + Performance Group + EPM + Procurement + sponsors BU + prestataires.
> Ce document est un **brouillon de cadrage**, pas une spec. À itérer avec toi.

---

## Ce que les mails révèlent en une phrase

**Tout le monde demande à tout le monde, sur des templates Excel différents, avec des délais d'une heure, les mêmes données budgétaires saisies trois fois, sans vue consolidée**. Le travail réel de l'équipe (Hamza, Meryem, Faïçal, Saoussane, Oumaima) est devenu un travail de **resaisie + relance + justification**, pendant que les arbitrages Task Force CAPEX se prennent sur la base de fichiers dont la fraîcheur n'est jamais garantie.

3 angles morts critiques émergent : **(1)** pas de **source de vérité unique** sur les engagements (chaque demandeur a son Excel) ; **(2)** pas de **lien stable ressource ↔ ligne budget ↔ facture/OTP/PO** (le savoir vit dans la tête de 2-3 personnes) ; **(3)** la **chaîne PR → OTP → PO → SAP → facture → paiement** est opaque, les blocages se découvrent à J-3 du paiement.

---

## Cartographie des acteurs cités

| Pôle | Personnes | Rôle observé |
|---|---|---|
| **DSI Nutricrops** | Hamza KOHEN (Global Head Data & AI + Core IT), Waseem RASHID (EVP Digital Solutions), Faïçal CONGO (Architecture Tech & Standards), Fatima Zahra CHRAIBI, Meryem EL MECHRAFI, Marwane BOUAYAD, Wissam NYOUBE, Soufiane AAMRI, Dina MAGHDAD, Saoussane EL HANNACHI, Nassim HAJJAJI, Sarah BENFDIL, Chantal GHANNAM MAGUIN (OCP BR), Oumaima ELOUALIDI (Exec Assistant Waseem) | Construction, défense et exécution du budget Digital Nutricrops |
| **Task Force Digital Groupe (CAPEX + OPEX)** | El Habib ID HAMMOU, Youness EL GHAOUTY, Omar MARHFOUR, Karim ELBAZ, Mohamed AKHCHOUN, Samer DARWISH, Youssef CHOURKANI, Abla BENKIRANE, Imane BOUTAHAR, Karim KHALFI, Mehdi CHHIH, El Hassane MOUBARAK (CORE IT) | Consolidation Groupe, arbitrages, demandes de données récurrentes |
| **Performance Group / EPM / Budget Control** | Younes IBNHAQQI, Youssef BENSABER, Wiame RABAI, Mohammed AUDEH | Approche BBZ (Budget Base Zero), monthly breakdown, scénarios |
| **Top mgmt / Comités** | Azeddine SBAI (Najib BENFARES en Cc), Mehdi CHHIH, COMEX, Board Nutricrops, Comité Budget / Comité Investissement | Arbitrages, validations finales |
| **Procurement / Legal / SAP** | (cités sans noms — bloquent les PO/factures) | Blocages SAP, validation contrats |
| **Prestataires externes cités** | BINewVision (Ayoub Reda, Ziad Fellah + autres consultants), BCG (Aschbacher Thibaud, Hamid Maher, Nabil Mikou), BCG Platinion (Hakim Hamane), Teal (Fadoua IDRISSI, Malak MADRANE, Abdelhakim SABIR), OCP Solutions, Wellington, LeadXC, MicroData, OGESSI (Younes BENNAI), Microsoft (Younes Obohou, Olivia, Kawtar) | Vendors + missions consulting + licences |
| **Filiales OCP groupe** | OCP North America, OCP Africa, OCP BR, plusieurs BU + Africa-collaborateurs | Périmètre élargi de consolidation OPEX/CAPEX (mail du 26/05 « Pilotage exécution budgétaire ») |

---

## Premier tableau des besoins

| # | Besoin fonctionnel | Évidence dans les mails (extraits) | Acteurs concernés | Volumétrie observée | Douleur actuelle | Priorité |
|---|---|---|---|---|---|---|
| **1** | **Source de vérité unique des engagements budgétaires** (CAPEX + OPEX, Digital + Core IT, par BU/projet/ligne/prestataire) | « ce fichier consolidé du budget CAPEX Nutricrops », « la dernière version du budget », « cette version était consolidée par la Digital taskforce et est sous review », SharePoint « Digital CAPEX View » | Hamza, Waseem, El Hassane, Saoussane, Mehdi Chhih | ~15 fichiers Excel cités, multiples versions (v2505, ajusté, MAJ, Strategy, modified) | Drift permanent, « please send me the last version », recopie manuelle | **P0** |
| **2** | **Stop aux demandes redondantes** : structure de données qui répond une bonne fois à toutes les Task Forces (CAPEX, OPEX, EPM, Group Perf, Core IT, BBZ) sans resaisie | TF CAPEX demande 7 champs supplémentaires en mai (avancement %, dates engagement, délais paiement, impact arrêt, commentaire, n° commande, OTP) ; OPEX TF demande monthly breakdown + BBZ ; EPM demande sur les mêmes lignes différentes infos | TF CAPEX, TF OPEX, EPM, Hamza + équipe | 4-5 demandes parallèles sur les mêmes lignes, deadlines 1h-3j | « Fill out and share within 1 hour », resaisie 3-4x par ligne | **P0** |
| **3** | **Modèle de donnée canonique** d'une ligne budgétaire (type CAPEX/OPEX, projet, description, prestataire, montant, devise, statut projet, statut contractuel, statut paiement, sponsor, SPOC) | Champs récurrents dans tous les templates : Fournisseur, Projet/volet, Type, Montant, Currency, Contrat/SOW signé, Start/End date, DA, OTP, BC, Réception, Facturation/Paiement | Tous | ~120 lignes Digital + Core IT Nutricrops estimées | Colonnes inconsistantes entre templates, mêmes champs sous d'autres noms | **P0** |
| **4** | **Rattachement ressource externe ↔ ligne budgétaire** (qui est payé sur quelle ligne, à quel TJM, sur quel scope) | « Ayoub Reda et Ziad Fellah travaillaient sur le build infra et sont depuis quelques mois sur la maintenance » ; « 15 JH de consommé depuis le Go de Waseem en mars qui ne sont pas pris en charge » ; TJM 9000 DH Teal markup inconnu ; ligne « Data platform run : external support » | Faïçal, Hamza, Younes Bennai (OGESSI), Teal | ~10-20 ressources externes cités | Personne ne sait reconstruire le mapping sans appel à Faïçal/Hamza | **P0** |
| **5** | **Suivi PR → OTP → PO → SAP → facture → paiement** par ligne, avec statut et raison de blocage | « list of all projects currently on standby for payment » (3 demandes Oumaima en mars) ; « Salesforce licences 758 423 USD blocked in SAP » ; « purchase orders created mais invoices blocked in SAP » ; « blocked by top management decision » | Oumaima, Saoussane, Procurement, Legal | Au moins 3 projets P0 bloqués (Salesforce CRM, Slack, HR Connect) + autres en attente | Découverte tardive des blocages, escalade ad hoc | **P0** |
| **6** | **Justifications structurées et défendables** par ligne (objectif opérationnel, livrable concret, date impérative, impact business, alternative interne/Teal/OCPS, dimensionnement budget) | Waseem 27/03 : « justifications…not defendable…will not get the OPEX. Subscription fees underlying ChatGPT licenses is NOT a business justification ». Template TF OPEX 18/06 (8 colonnes structurées : besoin, livrable, internalisation, dimensionnement…) | Waseem, équipe DSI, TF Digital | 6-8 champs justification par ligne | Justifications libres rejetées en revue, retravail à chaque passage Board | **P0** |
| **7** | **Multi-devise (MAD / USD / EUR) + conversion** consolidée | HR Connect 4 094 225 MAD ; Salesforce 66 647 USD, 758 423 USD ; BCG fees en EUR (probable) ; Nutricrops BR en USD/BRL | Tous | Au moins 3 devises dans les fichiers cités | Pas de taux unique, conversion manuelle au cas par cas | **P1** |
| **8** | **Vue forecast vs réalisé à date** (engagement vs consommation, par ligne) | Mail El Habib 04/05 : « Remontée réalisation à date du budget Digital CAPEX » ; demande TF CAPEX du champ « taux avancement projet 0-100% » | El Habib (TF), Hamza | Sur chacune des 120 lignes | Pas de vue mensuelle, calculs à la main pour chaque revue | **P1** |
| **9** | **Catalogue prestataires + contrats + avenants** (Vendor master : raison sociale + variantes, contrats signés, avenants, scope of work, durée, dépendances) | « Avenant 2 au contrat » BINewVision ; SOW Teal HR Connect / Workday / NutriTravel ; BCG Data platform framing ; OGESSI architecture ; Wellington / LeadXC / OCPS / MicroData prestataires à compléter | Faïçal, Hamza, El Hassane, Oumaima | ~15-20 prestataires cités | Allocations par contrat dispersées, pas de master vendor | **P1** |
| **10** | **Workflow scénarios d'arbitrage** (Zero Progress, Scénario 1 Nouveaux projets, présentations Comité Budget / Comité d'Investissement) | Mail SBAI 22/06 : « arrêt projets CAPEX effectif…préparer scénario Zero Progress avec priorisation paiements + scénario 1 nouveaux projets…canevas joint » ; « projets >5 MMAD : objectif, sponsor, prestataire, livrables, planning, budget, engagement, bénéfices, impact report » | SBAI, El Hassane, Hamza, Najib BENFARES, Top mgmt | Plusieurs scénarios à présenter en parallèle | Production de slides ad hoc à chaque comité | **P1** |
| **11** | **Inter-entité : qui paie qui** (intra-groupe OCP Group ↔ Nutricrops ↔ BU OCP BR / NA / Africa ; markup Teal / OCPS) | Faïçal : « OCPS et Consort Group sous notre BU bien que dans Operations & Science » ; Younes BENNAI : « TJM 9000 DH facturé à Teal ; je ne connais pas leur markup vers OCP » ; budget Core IT « communiqué à équipe digital Backbone Corpo » | Faïçal, Oumaima, Teal, OCPS, El Hassane | Au moins 4 entités OCP en cross-charge | Cross-charge invisible, qui finance quoi = appel téléphonique | **P2** |
| **12** | **Calendrier des deadlines TF + comités** (anticipation au lieu de fire-fighting) | Mails saturés de « within 1 hour », « before Wednesday », « ce jour à minuit », « next 2 hours », « give this priority », « samedi 23/05 minuit sinon ligne ignorée » | Tous | ~15 deadlines critiques sur 6 mois | Réactif à 100%, jamais proactif | **P2** |
| **13** | **Détection automatique « justification faible / champ vide »** avant soumission TF | Mails de relance EL GHAOUTY 22/05 et 23/05 : « vous avez au moins une ligne avec le champ Impact d'arrêt non renseigné »…« date limite ce jour minuit, sinon ligne non restituée à la commission » | El Ghaouty (TF), équipe Nutricrops | Plusieurs lignes incomplètes par soumission | Relances tardives, lignes éjectées de la commission | **P2** |
| **14** | **Historique des décisions & traçabilité** (qui a validé quoi, quand, sur quelle version, contre quelle justification) | Multiples « please use the attached template » + version drift ; « cette version a été consolidée par la TF Digital, sous review » ; arbitrages Board sans trace | Tous | À chaque arbitrage Board / Comité | Décisions perdues entre 2 mails | **P2** |
| **15** | **Rattachement budget ↔ roadmap projet** (suivi mission architecture, livrables, planning, JH consommés) | Bennai : « fichier de suivi actualisé…15 JH consommés depuis Go Waseem mars » ; « Workday : nouveau planning + budget recalibré » | Faïçal, Younes Bennai, équipe Teal | ~5-10 missions roadmap suivies | Suivi JH manuel par mail, pas de lien avec budget | **P2** |
| **16** | **Alerte sur budget engagé saturé** (« budget limit not allowing to continue ») | Faïçal 29/01 : « facing a budget limit that will not allow us to continue further…freeze 2026 engagements…I would like your decision » → escalade à Hamza | Faïçal, Hamza | Au moins 1 alerte critique cycle | Découverte au moment du blocage | **P2** |
| **17** | **Anticipation des renouvellements licences** (factures récurrentes, dates de fin) | Mail Khaoulani 18/03 : « factures licences 2025-2026 reçues…anticiper 2026-2027 dans vos budgets…catalogue d'outils IA pour le groupe » ; ChatGPT Enterprise, OpenAI, Salesforce, Slack, HR Connect, Mulesoft, Microsoft 365 E5 (5033 k€ pour 500 licences MicroData non payés) | Khaoulani, Faïçal, Hamza, Procurement | ~10 licences cycliques | Renouvellements oubliés → factures « surprises » | **P3** |
| **18** | **Refus / abstention RH** (les mails ne touchent pas aux salaires, mais le risque existe si on construit une vue unique sur ressources) | Pas d'évidence directe dans le corpus, mais « TJM 9000 DH », noms de personnes individuels → frontière PII proche | Tous | — | Risque conformité à anticiper | **P3** |

---

## Patterns transversaux (à valider avec toi)

1. **Excel + SharePoint = lit double de la vérité** : la SharePoint page « Digital CAPEX View » existe et est censée être la source ; mais les éditeurs continuent d'envoyer des Excel en pièces jointes → divergence quasi-systémique.
2. **L'équipe a déjà un sous-ensemble de la spec PoV** : la spec « Agent Task Force CAPEX » que tu m'as donnée plus tôt couvre déjà certains besoins (1, 4, 5 surtout) — ce tableau peut servir à prioriser ce qu'on couvre dans le PoV et ce qui reste hors-scope.
3. **Le rôle de Hamza dans la chaîne** est de **filtre + traducteur** : Top mgmt et TF demandent → Hamza fait redescendre / consolider / renvoyer. Toute solution doit lui rendre du temps, pas en consommer plus.
4. **Les délais TF sont absurdes** (« 1 hour », « avant minuit ») : un outil qui pré-construit les soumissions à partir d'une source unique = gain de plusieurs heures par cycle de demande.
5. **Le mapping ressource ↔ ligne** est le savoir le plus fragile (point #4 du tableau) : il vit dans les têtes de Faïçal, Hamza et 2-3 autres. Sa formalisation est la fondation d'à peu près tout le reste.

---

## Ce que je propose comme prochaine étape (pas encore codée)

3 choix possibles, par ordre de coût croissant :

- **(A) Itération du tableau** — tu corriges/priorise/ajoute, on convergence vers v2.
- **(B) Synthèse en deck de 5 slides** « Pourquoi un outil de gestion budget Nutricrops » → support pour Waseem/Top mgmt.
- **(C) Couplage avec la spec PoV Task Force CAPEX** — j'identifie pour chaque besoin du tableau s'il est dans le PoV, hors PoV, ou candidat phase 2, et je te ponds un mapping clair.

Dis-moi laquelle.

---

## Annexes (dans `budget-nutricrops/extracts/`)

- `mails.jsonl` — 79 mails parsés (sujet, from, to, cc, date, body) pour requêtes structurées
- `mails-digest.md` — digest condensé lisible (800 chars/mail) pour relecture humaine
- Les `.msg` originaux sont restés en scratchpad (non commités, contenu sensible) — me dire si tu veux que je les commit sous forme chiffrée ou qu'on les laisse hors du repo

*Rédigé par D²nAI · juin 2026 · à partir de 79 mails Outlook (jan→juin 2026) sur sujet budget Nutricrops · branche `claude/budget-nutricrops`.*
