# NutrientOS — Plan d'extension multi-BU (post-pilote Morocco)

> Comment passer du **pilote Morocco** (preuve de la mécanique Waze, 20
> agronomes Al Moutmir, 1 région, 1 culture) à un **moat de données
> multinational** qui couvre les principales BU OCP en 18-24 mois.
> Compagnon de ENTRY-DOOR-SPEC et ADOPTION-PLAYBOOK-V0.

**Rappel.** OCP est multinational. Une seule app planétaire ne marchera
pas (canaux, acteurs, pratiques digitales radicalement différents). Une
constellation d'apps indépendantes fragmente les données et tue le moat.
La bonne réponse : **un backend unifié + N portes d'entrée géographiques
adaptées aux canaux locaux**.

---

## 1. Architecture cible (rappel)

```
                        ┌─────────────────────────┐
                        │   Backend unifié        │
                        │   tenant Nutricrops     │
                        │   schéma de dépôt commun│
                        │   moteur centralisé     │
                        │   (apprend global,      │
                        │    applique local)      │
                        └────────────┬────────────┘
                                     │
              ┌────────┬─────────────┼─────────────┬────────┐
              │        │             │             │        │
        ┌─────▼─┐  ┌──▼───┐    ┌────▼─────┐  ┌────▼───┐  ┌─▼─────┐
        │MOROCCO│  │BRÉSIL│    │   INDE   │  │AFRIQUE │  │EUROPE │
        │Al Mou.│  │coop  │    │distrib.+ │  │outgrow.│  │ag-tech│
        │       │  │      │    │WhatsApp  │  │        │  │partner│
        └───────┘  └──────┘    └──────────┘  └────────┘  └───────┘
```

- **Le centralisé est l'actif** : schéma, moteur, conformité, dataset
- **Le démultiplié est le canal** : la BU choisit son acteur dominant, on
  s'y plug

---

## 2. Critères de priorisation entre BU

Pour décider **laquelle après Morocco**, on note chaque BU sur 4 axes :

| Axe | Question |
|---|---|
| **Volume potentiel** | Combien d'observations/an au régime de croisière ? |
| **Canal mûr** | Existe-t-il un acteur dominant qu'on peut activer ? |
| **Accès politique** | A-t-on une relation BU forte qui débloque l'accord ? |
| **Coût/bénéfice** | Investissement vs valeur ajoutée au dataset global |

Notes attribuées **après** l'expérience pilote Morocco — les hypothèses
ci-dessous sont à valider terrain.

| BU | Volume | Canal | Politique | Coût/B | Total | Reco |
|---|---|---|---|---|---|---|
| **Brésil** | ★★★★★ | ★★★★ (coops géantes) | ★★★ | ★★★★ | **16/20** | **Priorité 1** |
| **Inde** | ★★★★★ | ★★ (très fragmenté) | ★★★ | ★★ | 12/20 | Priorité 3 |
| **Afrique sub-saharienne** | ★★★ | ★★★ (programmes outgrower OCP) | ★★★★ | ★★★ | 13/20 | **Priorité 2** |
| **Europe** | ★★ | ★★★★ (ag-techs locales mûres) | ★★ | ★★ | 10/20 | Priorité 4 |

**Reco de séquence (à valider en bilan T+12 Morocco) :**

1. **Brésil** (mois 4-9 post-Morocco) — meilleur ratio volume/canal
2. **Afrique sub-saharienne** (mois 7-12) — relation politique forte, on
   capitalise sur les programmes outgrower déjà animés par OCP
3. **Inde** (mois 10-18) — gros volume mais le plus dur à activer (canal
   fragmenté), donc on attend d'avoir 2 références BU + un dataset
   bootstrap solide
4. **Europe** (mois 18+) — partenariat ag-tech local par pays, plus
   stratégique que volume

---

## 3. Schémas par BU

### 3.1. Brésil — la porte d'entrée « coopératives »

**Canal dominant** : 6-8 coopératives géantes (Coamo, C.Vale, Cocamar,
Agropalma, etc.) emploient chacune **plusieurs centaines d'agronomes**
qui couvrent leurs adhérents. C'est la concentration parfaite — 3-4 coops
activées = couverture massive sans démultiplication terrain à la
marocaine.

**Porte d'entrée envisageable** :
- Partenariat data avec **2-3 coopératives leaders** dans le triangle
  soja-maïs-canne (Mato Grosso, Paraná, Goiás)
- Soit on alimente leur outil agronomique interne (s'ils en ont un), soit
  on co-développe une extension
- Branding : co-OCP + nom de la coop (ex. "Coamo Soja Calc · powered by
  OCP"). Pas de NutrientOS visible — comme pour Al Moutmir.

**Données ouvertes par interaction** :
- parcelle, sol, culture, climat, formule recommandée, rendement attendu
- *deposit specific* : **type de coopérative, taille d'exploitation**
  (le Brésil a une distribution très bimodale petit/grand)

**Boucle de retour rendement** : naturelle via la coop (le rendement
revient automatiquement dans leur SI pour la commercialisation/paiement
de l'adhérent). On consomme ce flux existant. **C'est l'avantage majeur
du canal coop** : la boucle est déjà industrielle.

**Pilote Brésil (90 jours)** :
- 1 coop, 30 agronomes, soja, Mato Grosso
- Cible : 1500 recos émises, ≥ 50 % rendement bouclé (coop = boucle
  industrielle)
- Sortie : la signature de 1-2 coops supplémentaires devient l'enjeu de
  la suite

**Effort estimé** : ~3-4 ETP D²nAI + un sponsor commercial BU Brésil pour
ouvrir la porte coop.

---

### 3.2. Afrique sub-saharienne — la porte d'entrée « outgrower »

**Canal dominant** : OCP anime déjà des **programmes outgrower** dans
plusieurs pays africains (Côte d'Ivoire, Sénégal, Kenya, Éthiopie,
Nigeria, etc.). Ces programmes ont des **agronomes coordinateurs OCP ou
partenaires** qui visitent régulièrement les agriculteurs encadrés.

**Porte d'entrée envisageable** :
- Intégration aux outils digitaux des programmes outgrower (souvent une
  app maison ou un outil ONG type CommCare)
- Pour les programmes sans outil digital : déploiement d'une PWA légère,
  multi-langue (français, anglais, swahili, haoussa selon pays)
- Cas WhatsApp : pour les zones très rurales, complément WhatsApp Business
  où l'agronome envoie sol+culture par message, reçoit reco+rendement+marge
  en retour

**Données ouvertes par interaction** :
- parcelle, sol (souvent absent — défaut sol régional crucial),
  culture, climat
- *deposit specific* : **statut de l'agriculteur** (encadré vs libre),
  pays/programme, accès aux intrants subventionnés

**Boucle de retour rendement** : via la collecte des programmes (déjà
faite pour la mesure d'impact des programmes outgrower OCP — donnée
existante à brancher).

**Pilote Afrique (90 jours)** :
- 1 programme outgrower existant, 50 agronomes, 1 culture (maïs ou riz
  selon pays)
- Cible : 2000 recos émises, ≥ 30 % rendement bouclé via collecte
  programme
- Sortie : modèle de déploiement répliquable sur les 3-4 programmes
  outgrower OCP majeurs

**Effort estimé** : ~2-3 ETP D²nAI + partenariat fort avec l'équipe
programmes outgrower OCP.

---

### 3.3. Inde — la porte d'entrée « distributeur + WhatsApp »

**Canal dominant** : le marché indien des intrants est **extrêmement
fragmenté** — des milliers de petits distributeurs (dealers, retailers),
chacun couvrant quelques centaines d'agriculteurs. Pas d'acteur unique
à activer.

**Porte d'entrée envisageable** :
- App distributeur (Android, low-bandwidth) avec composante WhatsApp
  Business intégrée
- Le distributeur conseille l'agriculteur, génère la formule + rendement +
  marge, envoie la fiche par WhatsApp (le canal réel des champs indiens —
  même les petits exploitants ont WhatsApp)
- Modèle d'adoption en cascade via des **regroupements de distributeurs**
  (chambres de commerce, hubs régionaux) plutôt que distributeur par
  distributeur
- Partenariat possible avec une **ag-tech indienne** (DeHaat, AgroStar,
  BharatAgri) plutôt que build from scratch

**Données ouvertes par interaction** :
- parcelle, sol (rare), culture, climat, formule, rendement attendu
- *deposit specific* : **état/district, taille d'exploitation, type
  d'agriculteur** (smallholder, marginal, medium)

**Boucle de retour rendement** : plus dure. Trois pistes en parallèle :
(a) push WhatsApp à l'agriculteur à la récolte, (b) re-visite distributeur
saison suivante (canal commercial naturel), (c) partenariat avec un
service de mandi (marché) pour récupérer les ventes effectives.

**Pilote Inde (90 jours)** :
- 50 distributeurs dans 1 état (Maharashtra ou Punjab), 1 culture
- Cible : 3000 recos émises, ≥ 15 % rendement bouclé (cible basse — le
  canal est plus dur)
- Sortie : modèle d'agrégation des distributeurs pour scaling

**Effort estimé** : ~4-5 ETP D²nAI + partenariat ag-tech locale
indispensable. À ne pas attaquer en solo.

---

### 3.4. Europe — la porte d'entrée « partenariat ag-tech »

**Canal dominant** : marché mature, hautement compétitif, avec des
**ag-techs leaders** par pays (xarvio en Allemagne, Inari/Soletanche en
France, Bayer FieldView, etc.). Les agriculteurs européens sont déjà
saturés d'outils. **L'enjeu n'est pas le volume mais la défense
stratégique** (rester pertinent, ne pas se faire désintermédier).

**Porte d'entrée envisageable** :
- Partenariat data avec une ag-tech leader par pays prioritaire (France,
  Espagne, Italie, Pologne, Roumanie)
- On fournit une **brique reco nutrition** qui s'intègre à leur écosystème
- En échange, on consomme leur flux de données pour calibrer le moteur

**Données ouvertes par interaction** :
- Parcelle (souvent géo-précise via SIG agri européen), sol (souvent
  analysé), culture, climat (services européens de qualité)
- *deposit specific* : **certifications** (bio, HVE), **PAC** (déclarations
  cultures)

**Boucle de retour rendement** : excellente — les pratiques de tracabilité
agricole en Europe sont déjà en place.

**Pilote Europe (90 jours)** :
- 1 partenariat ag-tech, 1 pays, 1 culture
- Cible : qualitative > quantitative — on cherche à apprendre à composer
  avec un acteur mûr, pas à dominer un marché vide

**Effort estimé** : ~2 ETP D²nAI + équipe commerciale OCP Europe pour
nouer le partenariat.

---

## 4. Ce qui est **commun à toutes les BU** (le backend)

### 4.1. Schéma de dépôt commun

Une seule structure de données, déclinable par BU avec des **extensions
spécifiques** (cf. `*specific*` dans chaque section ci-dessus) :

```yaml
deposit:
  # Identification
  id: UUID
  ts: timestamp ISO 8601
  source:
    bu: morocco | brazil | india | africa | europe
    channel: al_moutmir | coop_xxx | distributor_id | outgrower_prog | agtech_partner
    agent_id: hash anonymisé (ne quitte pas le tenant)
  # Géographie
  location:
    country, region, district, gps (optionnel)
  # Agronomique
  field:
    culture, surface_ha, sol (N, P, K, pH, MO) ou null,
    pratique_precedente, regime_hydrique
  climate:
    auto-récupéré: T°, pluvio cumulée, ETP, période
  # Décision
  reco:
    formule_proposee, dose, calendrier, rendement_attendu, marge_attendue
    confidence_score, n_visites_similaires
  # Bouclage (optionnel, vient plus tard)
  outcome:
    rendement_reel, date_recolte, latence_jours, source_label
  # Extensions BU-spécifiques (jsonb)
  extensions:
    # ex. brésil: taille_exploit, type_coop
    # ex. inde: etat, type_agriculteur
    # ex. afrique: programme_outgrower, agriculteur_encadre
```

### 4.2. Moteur centralisé

- **Bootstrap** : QUEFTS + essais OCP existants (Doukkala bootstrap, puis
  données régionales par BU)
- **Apprentissage** : retraining continu sur le flux de bouclage rendement
- **Transfert d'apprentissage** : un dépôt brésilien sur soja améliore
  marginalement le modèle de soja partout — c'est l'effet réseau global
  qu'on veut prouver dès qu'on a 2 BU

### 4.3. Conformité multi-juridiction

- Hébergement primaire : **tenant Nutricrops Maroc** (conformité 09-08)
- Exports BU : copies anonymisées par juridiction selon législation locale
  (LGPD Brésil, DPDP Act Inde, RGPD Europe, etc.)
- Aucune donnée nominative n'est jamais répliquée hors juridiction
  d'origine sans anonymisation
- Audit log centralisé : qui a accédé à quoi, depuis où, quand

---

## 5. Trajectoire 18-24 mois

```
Mois 0-3   │ Pilote Morocco (cf. ENTRY-DOOR-SPEC + ADOPTION-PLAYBOOK)
Mois 4-6   │ Extension Morocco (60 agronomes, 3 régions, 2 cultures)
           │ Kick-off Brésil (négo coop, signature pilote)
Mois 7-9   │ Pilote Brésil (1 coop, 30 agronomes, soja)
           │ Kick-off Afrique (programme outgrower)
Mois 10-12 │ Pilote Afrique (1 programme, 50 agronomes, maïs/riz)
           │ Bilan annuel + go/no-go Inde
Mois 13-18 │ Extension Brésil (2-3 coops), extension Afrique (2 programmes)
           │ Pilote Inde (50 distributeurs, partenariat ag-tech)
Mois 19-24 │ Extension Inde, kick-off Europe
           │ Première publication du schéma de dépôt comme standard ouvert
           │ (timing dépend de la maturité du dataset)
```

**Effet cumulatif visé à 24 mois** :
- **Dataset propriétaire** : >100k observations bouclées par un rendement
  réel, couvrant 4-5 BU
- **Moteur calibré** : Spearman ≥ 0.7 sur les principales cultures dans
  chaque BU activée
- **Reconnaissance externe** : le schéma de dépôt OCP commence à être
  référencé par les milieux académiques (UM6P, instituts agronomiques
  partenaires)
- **Position concurrentielle** : OCP devient impossible à désintermédier
  sur la nutrition phosphatée — pas par le marketing, par la donnée

---

## 6. Décisions à arbitrer maintenant *(parallèles au pilote Morocco)*

Pour ne pas perdre 6 mois entre le succès du pilote Morocco et le kick-off
BU2, les décisions suivantes doivent être instruites **pendant** le pilote
Morocco, pas après :

| Décision | Owner pressenti | Échéance | Statut |
|---|---|---|---|
| Choix de la coop pilote Brésil | Sponsor commercial BU Brésil + D²nAI | T+8 sem. Morocco | À ouvrir |
| Choix du programme outgrower Afrique | Équipe outgrower OCP + D²nAI | T+10 sem. Morocco | À ouvrir |
| Sondage des ag-techs indiennes | Sponsor commercial BU Inde | T+10 sem. Morocco | À ouvrir |
| Définition du schéma de dépôt v1 (commun) | D²nAI + R&D agronomie | T+6 sem. Morocco | À ouvrir |
| Tenant Nutricrops opérationnel (multi-juridiction) | IT Groupe + D²nAI | T+8 sem. Morocco | Décision 1 Note CEO juin |

Si ces 5 chantiers parallèles ne sont pas pré-instruits, le bilan T+12
Morocco se traduit par 6 mois de flottement administratif avant le kick-off
BU2 — et on perd l'élan.

---

## 7. Anti-patterns spécifiques au multi-BU

- ❌ **Vouloir une seule app pour le monde entier** — déjà tranché, mais
  à re-tranché à chaque demande exec qui re-propose l'idée
- ❌ **Laisser chaque BU bâtir son propre stack** — perte du moat, on
  redevient un patchwork de POC
- ❌ **Synchroniser les calendriers BU** — on calque le rythme de la BU
  la plus lente. Mieux : on laisse chaque BU démarrer dès qu'elle est
  prête, avec un schéma commun garanti
- ❌ **Brander "NutrientOS" sur les apps BU** — chaque BU brand local
  (coop, programme, distributor) ; le brand NutrientOS reste corporate
- ❌ **Vouloir 100 % de couverture par BU avant d'attaquer la suivante** —
  une BU active à 30 % vaut mieux que 5 BU à 0 %. Démarrer plus vite, on
  optimise plus tard.
- ❌ **Sous-investir en data engineering centralisé** — le schéma de dépôt
  + le moteur + l'ingestion multi-BU c'est ~50 % de l'effort. À sous-traiter
  c'est mort.

---

## 8. Ce qui rend ce plan défendable face au board

- **Aucun engagement multi-BU avant preuve Morocco** — on n'engage le
  budget BU2 qu'après les critères verts du pilote Morocco
- **Séquence basée sur la priorisation 4-axes** — Brésil avant Inde, et
  ce n'est pas un choix émotionnel
- **Réutilisation du backend** — chaque BU additionnelle coûte moins
  cher que la précédente (effet d'apprentissage et de mutualisation)
- **Pas de pari géographique** — on n'a pas à "choisir entre" les BU.
  Toutes activées progressivement, schéma commun, retour mutualisé
- **Souveraineté multi-juridiction** — la conformité 09-08 marocaine
  garantit le hub, et chaque BU respecte sa propre législation. Aucun
  conflit régulatoire bloquant

---

## Prochaine étape

**Ne pas attendre le bilan Morocco pour ouvrir les conversations BU.**
Bloquer maintenant 4 réunions de cadrage exploratoire :

1. Sponsor commercial BU Brésil — sonder les coops cibles
2. Responsable programmes outgrower OCP — sonder les programmes mûrs
3. Sponsor commercial BU Inde — sonder les ag-techs locales partenaires
4. R&D agronomie OCP — co-construire le schéma de dépôt v1

Ces 4 réunions valent autant que le pilote Morocco en termes de
trajectoire — elles évitent le mois 4-6 de flottement administratif.

*Plan rédigé par D²nAI · juin 2026 · post-pivot Waze, post-insight Al Moutmir Morocco-only*
