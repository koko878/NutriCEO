# NutrientOS — Spec de la porte d'entrée Morocco (template multi-BU)

> Doc de cadrage du **premier service** à mettre en ligne. Morocco est le
> pilote, pas la cible. Cette spec est aussi un **template** qui se
> déclinera par BU avec un canal local différent (cf. MULTI-BU-EXTENSION-PLAN).

**Rappel du principe Waze.** La donnée ne se collecte pas, elle s'émet.
On donne un service utile dont l'usage produit la donnée comme sous-produit
invisible. Trois règles non-négociables :
1. **Donner avant de prendre** — le dépôt paie un service immédiat
2. **Zéro saisie en plus** — la saisie du service *est* le dépôt
3. **Effet de réseau** — plus on dépose, meilleure est la sortie

**Bascule clé vs version précédente de cette spec.** On ne construit pas
une nouvelle app. **On se branche sur l'app Al Moutmir existante** (déjà
déployée, qui couvre déjà saisie parcelle + analyse sol + génération de
formule) pour y injecter ce qui manque : sortie enrichie, boucle de retour
rendement, moteur qui s'auto-améliore. Argumentaire complet de ce
revirement : voir section 3 ci-dessous.

---

## 1. Persona — qui ouvre l'app le matin ?

**Cible v1 Morocco : l'agronome Al Moutmir sur le terrain.**

Raisons pour lequel c'est *la* bonne porte d'entrée :

- Il rencontre 5 à 20 agriculteurs par jour. C'est le **plus haut débit**
  de rencontres sol × culture × pratique de tout l'écosystème OCP Maroc.
- Il a déjà un téléphone OCP-sponsorisé, l'app Al Moutmir, l'accès au
  référentiel produits.
- L'app Al Moutmir existe déjà et il l'utilise (ou est censé l'utiliser)
  pour saisir parcelles, analyses, formules. **On part d'un canal éduqué
  et déployé**, pas d'un greenfield.
- Il a déjà une remontée hiérarchique à faire. On la rend *automatique*.

**Note importante** : l'adoption d'Al Moutmir est **faible** aujourd'hui
(communication massive, usage terrain limité). C'est *en soi* la preuve
du principe Waze : l'app demande un effort de dépôt sans récompenser
immédiatement l'agronome. Notre pari : si on ajoute la **récompense
immédiate** (rendement attendu + marge + PDF producteur), l'adoption
décolle. Si elle ne décolle pas, on aura appris quelque chose de précieux
pour les BU suivantes.

**Personas v2/v3** (à ne pas implémenter dans le MVP Morocco) :
- Coopératives Brésil (canal totalement différent, cf. MULTI-BU-EXTENSION)
- Distributeurs Inde (idem)
- Agriculteur direct smartphone (seulement quand la boucle est rodée)

**On ne vise PAS** : le chercheur, le sponsor stratégique, le DG d'OCP.
Eux consomment la sortie, ils ne déposent pas.

---

## 2. Le problème de la journée

Question concrète que l'agronome se pose, dans le champ, à 10h47 du matin,
face à un agriculteur qui attend une réponse :

> « Sur **cette parcelle** (sol moyen, climat semi-aride, blé tendre),
> j'applique **quelle formule OCP, à quelle dose** ? Et je peux promettre
> **quel rendement** et **quelle marge €/ha** ? »

Aujourd'hui, l'app Al Moutmir lui donne la formule (statique, abaque).
Elle ne lui donne **ni le rendement attendu, ni la marge €/ha, ni un PDF
à laisser au producteur**. C'est *exactement* le delta de valeur qu'on
ajoute — et c'est ce qui transforme la corvée actuelle en service qu'il
*veut* ouvrir.

---

## 3. Architecture — branchement sur Al Moutmir, pas remplacement

**Règle de fer** : on n'ajoute pas un deuxième tool dans la main de
l'agronome. On rend le sien plus intelligent.

```
   ┌─────────────────────────────────────────┐
   │   App Al Moutmir (existante, déployée)  │
   │                                         │
   │   • Saisie parcelle, sol, culture       │
   │   • Génération de formule (abaque)      │
   │   • UX mobile native, dark theme        │
   └────────────┬───────────────┬────────────┘
                │               │
   ┌────────────▼───┐   ┌──────▼─────────────────────────┐
   │ NutrientOS API │   │ NutrientOS API (sortie enrichie)│
   │ (dépôt invisible)  │ • Reco formule (calibrée terrain)│
   │ ← parcelle + sol  │ • Rendement attendu (intervalle)│
   │ ← formule sortie  │ • Marge €/ha                    │
   │ ← climat (auto)   │ • PDF/SMS pour le producteur    │
   └────────────────┘   │ • Push J−7 récolte (bouclage)  │
                        └──────────────────────────────────┘
                                  │
                       ┌──────────▼──────────┐
                       │   Backend unifié    │
                       │   (tenant Nutricrops│
                       │    schéma de dépôt  │
                       │    moteur d'apprent.│
                       │    boucle yield)    │
                       └─────────────────────┘
```

**Surface de dépôt = surface de saisie déjà existante côté Al Moutmir.**
On consomme le flux. On n'ajoute aucun nouveau formulaire à l'agronome.

**Champs déposés par interaction** (extraits du flux Al Moutmir) :
- `region`, `commune`, `coordonnées GPS` *(déjà saisis)*
- `culture` *(déjà saisie)*
- `surface (ha)` *(déjà saisi)*
- `régime hydrique` (goutte à goutte / gravitaire / bour) *(déjà saisi)*
- `analyse de sol` si disponible (N, P, K, pH) *(déjà saisi ou "pas
  d'analyse" → base sol régional moyenné)*
- `formule recommandée` *(déjà générée)*
- `date de la visite` *(automatique)*
- `agronome_id` *(SSO M365 déjà en place)*
- `climat contextuel` (T°, pluvio cumulée, ETP) *(récupéré gratuitement
  via API météo géolocalisée — zéro saisie agronome)*

**Champs ajoutés à la sortie** (notre delta de valeur) :
- `rendement attendu` (valeur centrale + fourchette de confiance)
- `marge attendue €/ha`
- `confiance modèle` (« basé sur N visites similaires »)
- `bouton PDF/SMS pour le producteur`

**Champ ajouté plus tard pour clore la boucle** (push J−7 récolte) :
- `rendement réel obtenu` (un seul chiffre, 30 secondes de saisie)

---

## 4. Output immédiat = service qui justifie l'usage

L'écran de réponse, **enrichi dans l'app Al Moutmir** (pas un écran à part),
3 blocs ajoutés à côté de la formule existante :

**Bloc A — Reco formule** : *déjà fournie par Al Moutmir*. On garde, on
n'écrase pas. Plus tard, quand notre moteur sera mieux calibré que
l'abaque, on proposera une « reco enrichie » à côté avec différence
expliquée.

**Bloc B (NEW) — Rendement attendu** : valeur centrale + fourchette de
confiance.
Ex : *« 4,2 t/ha — fourchette 3,7 à 4,8 selon climat ».*

**Bloc C (NEW) — Marge €/ha** : prix vente − coût intrants − coût appli.
Ex : *« 380 €/ha de marge — au prix du blé local d'aujourd'hui ».*

**+ une phrase d'explication** ("pourquoi cette reco") en langage agronome,
2 lignes max. *Ex : « ton sol est faible en P (8 ppm), ton calendrier
hydrique permet 2 apports, on optimise le NPK ».*

**+ bouton « envoyer la fiche au producteur »** : génère un PDF d'une page,
SMS ou WhatsApp au numéro de l'agriculteur. C'est ce qui rend l'agronome
*pro* devant son client — et c'est aussi un crochet de réengagement (le
producteur reçoit un lien qu'il pourra rouvrir).

---

## 5. La boucle de retour rendement *(le point qui tue ou sauve le projet)*

Sans label de sortie, la base est aveugle. C'est ici que 95 % des
plateformes "data agronomique" meurent. Trois mécaniques **en parallèle**
pour maximiser le taux de bouclage :

**M1 — Push notification J−7 récolte dans l'app Al Moutmir**
Quand la date attendue de récolte arrive, push à l'agronome :
*« La parcelle de M. X — récolte cette semaine. Rendement obtenu ? »*
Un champ chiffre, un bouton "envoyer", un bouton "pas eu l'info".
**Objectif : 30 secondes de saisie.**

**M2 — Visite distributeur**
Quand l'agronome retourne chez l'agriculteur (visite saison N+1), première
question pré-remplie sur l'écran : *« Récolte de la saison dernière sur la
parcelle X ? »*. Saisie = re-démarrage du cycle.

**M3 — Intégration NutriTrials / réseau d'essais OCP**
Les essais OCP qui remontent déjà des rendements (Doukkala, etc.) alimentent
la base sans saisie supplémentaire. C'est notre **bootstrap initial** : le
modèle calibré sur les essais d'abord, affiné par les remontées terrain
ensuite.

**Cible MVP Morocco** : ≥ **25 %** des recos sont bouclées par un rendement
réel dans les 12 mois. En-dessous, la base ne se calibre pas assez vite et
le projet stagne. Cible cible à 24 mois : 40 %.

---

## 6. Calibration initiale du modèle *(comment on évite le « cold start »)*

Le piège : à J0, on n'a pas de données pour calibrer la reco → l'agronome
ouvre l'outil, la reco est nulle, il ne revient pas, jamais.

**Solution : bootstrap avec QUEFTS + essais OCP existants.**
- QUEFTS / DSSAT (les modèles agronomiques de commodité) donnent une reco
  **assez bonne** comme baseline. C'est la version "pas pire qu'un agronome
  moyen".
- Les essais OCP déjà remontés (plusieurs milliers d'observations sol ×
  culture × dose × rendement) calibrent ce baseline pour les conditions
  marocaines / africaines.
- À mesure que les recos de l'app sont bouclées par un rendement réel, on
  override progressivement le baseline par notre propre fit.

**Ce que ça implique** : le moteur n'est *pas* un actif. C'est un commodity
bootstrap. La valeur s'accumule dans la base, pas dans le code du moteur.
On peut même rendre QUEFTS open-source si ça aide. **Ce qu'on ne rend
jamais open, c'est la base.**

---

## 7. Métriques *(ce qu'on regarde chaque lundi)*

**Adoption** :
- Agronomes actifs / semaine (DAU/WAU)
- Recos vues / agronome / jour (cible Morocco : 3+)

**Qualité du dépôt** :
- Taux de complétude (combien de recos ont l'analyse de sol vs base
  régionale uniquement)
- Diversité géographique des dépôts à Doukkala (couverture sous-zones)

**Boucle de retour** *(le KPI le plus important)* :
- Taux de bouclage rendement à 12 mois (cible Morocco : 25 %, plancher
  pour ne pas tuer le projet : 15 %)
- Latence moyenne reco → label

**Qualité du modèle** *(la sortie qui s'améliore)* :
- Spearman rang (reco vs rendement réel) — c'est exactement la métrique du
  simulateur d'origine
- RMSE rendement, par culture × région
- **Amélioration Δ par tranche de 1000 nouveaux labels** — c'est la **preuve
  visible** de l'effet de réseau

**Effet réseau** *(à mesurer dès qu'on a une 2ᵉ BU)* :
- Δ qualité du modèle pour la **région N** quand on ajoute des données
  d'une **région voisine N±1** (signal de transfert d'apprentissage)
  — sert aussi à la défense board pour l'extension multi-BU

---

## 8. Anti-patterns à graver dans le marbre

- ❌ **Ne pas** construire une nouvelle app à côté d'Al Moutmir — on s'en
  branche, on l'augmente, on ne la concurrence pas.
- ❌ **Ne pas** ouvrir le service à "tout le monde" dès le jour 1 — un
  cercle restreint d'agronomes Al Moutmir Doukkala, en pilote, pour
  calibrer avant d'élargir.
- ❌ **Ne pas** ajouter de "module collaboration" ou de "feed social" ou de
  "dashboard chef d'équipe" en v1. Tout ce qui n'est pas la question de
  10h47 dilue le service.
- ❌ **Ne pas** demander de saisie qui ne sert pas la reco. Pas de
  "remplissez votre profil", pas de "notez votre satisfaction".
- ❌ **Ne pas** publier le standard de la donnée avant qu'il y ait des
  dépôts à formater. Publier un standard sur du vide = institution-first.
- ❌ **Ne pas** brander "plateforme" — c'est un **service**.
- ❌ **Ne pas** stocker la donnée chez un cloud non maîtrisé. Loi 09-08,
  souveraineté : tenant Nutricrops dès le jour 1 (cf. Décision 1 de la
  Note CEO juin).
- ❌ **Ne pas** assumer que Morocco représente le canal d'OCP. Le pilote
  Morocco valide la *mécanique*, pas le *canal* — voir MULTI-BU pour la
  déclinaison par géographie.

---

## 9. Périmètre MVP — ce qu'on ship en 90 jours, et ce qu'on ne ship pas

**Dans le MVP Morocco :**
- Connecteur API vers Al Moutmir (lecture du flux parcelle/sol/formule)
- Moteur reco backend (QUEFTS bootstrap + calibration essais Doukkala)
- Sortie enrichie injectée dans l'app Al Moutmir (rendement, marge, PDF)
- 1 région : **Doukkala** (terrain déjà briefé via la lighthouse demo v2.6)
- 1 culture : **blé tendre** (saison qui arrive + données d'essais
  disponibles pour le bootstrap)
- Boucle de retour rendement : push J−7 + intégration NutriTrials
- Hébergement sur tenant Nutricrops (préalable Décision 1 Note CEO juin)
- Authentification : SSO M365 (déjà déployé via Al Moutmir)

**Hors MVP — viendra après preuve de la boucle :**
- Multi-régions, multi-cultures Morocco
- **Extension Brésil / Inde** *(spec dédiée par BU, cf. MULTI-BU-EXTENSION-PLAN)*
- Marketplace de partenaires (UM6P, AgriEdge, Ground Truth Analytics)
- Standard ouvert de la "valeur nutritive" (publié *après* avoir des
  dépôts à formater)
- Vue agriculteur direct (smartphone)
- Co-pilote IA conversationnel
- Dashboard région / pays / global pour le management

**On ne fait *jamais* dans NutrientOS :**
- Marketplace e-commerce d'intrants (conflit avec la vente OCP)
- Réseau social agriculteurs (hors scope, et risque réputationnel)
- Remplacement d'Al Moutmir (on est complémentaire, jamais concurrent)

---

## 10. Roadmap 90 jours

| Semaines | Livrable | Critère de succès |
|---|---|---|
| 1-3 | Spec API Al Moutmir négociée + design sortie enrichie + bootstrap modèle (QUEFTS calibré Doukkala) | Connecteur lit le flux Al Moutmir en sandbox, première reco demo testable en interne sur 5 cas type |
| 4-6 | Injection des 3 blocs (rendement/marge/PDF) dans l'app Al Moutmir + tenant Nutricrops actif | 5 agronomes Al Moutmir l'utilisent en pilote interne, voient la sortie enrichie |
| 7-9 | Boucle de retour (push J−7 + intégration NutriTrials) | Première reco bouclée par un rendement réel |
| 10-12 | Pilote terrain Doukkala (20 agronomes) | 300+ recos émises, 80+ recos en attente de bouclage, signal Spearman ≥ baseline QUEFTS, NPS interne ≥ +30 |

**Sortie du sprint 90 j** : on présente au board (a) la sortie enrichie qui
tourne dans Al Moutmir, (b) la première promotion *visible* du modèle au
fur et à mesure que les labels arrivent, (c) un plan d'extension région ×
culture Morocco *et* un plan d'extension multi-BU (Brésil / Inde) déclenché
si Morocco valide.

---

## 11. Préalables critiques *(à débloquer avant d'attaquer)*

1. **Accord avec l'équipe Al Moutmir** pour le branchement API et
   l'injection de blocs UI. Sans cet accord, le MVP n'est pas faisable
   en l'état — il faut alors basculer en plan B (app distincte, plus
   coûteux et plus risqué).
2. **Choix des 5 agronomes Al Moutmir pilotes Doukkala** + leur chef
   d'équipe direct (cf. ADOPTION-PLAYBOOK-V0).
3. **Validation tenant Nutricrops** opérationnel (Décision 1 Note CEO).
4. **Accès aux données d'essais Doukkala** pour le bootstrap modèle
   (équipe R&D OCP).

Aucune ligne de code n'est utile tant que ces 4 préalables ne sont pas
verts.

---

## 12. Ce qui rend ce plan défendable face au board

- **Pas de plateforme à financer** — c'est un service, on dépense en
  proportion de l'usage observé
- **Pas d'app nouvelle à pousser** — on se branche sur l'existant
- **Pas de standard à imposer** — on en publiera un *quand* il y aura des
  dépôts à formater (donc dans 12-18 mois, pas dans 3)
- **Pas de pari technologique** — le moteur baseline est QUEFTS, modèle
  publié depuis 30 ans, défendable scientifiquement
- **Le moat se voit grossir** — chaque mois, on peut afficher la courbe de
  croissance du dataset propriétaire OCP. C'est la métrique la plus simple
  à expliquer au board et au CEO
- **Conformité 09-08 par construction** — tout sur tenant Nutricrops, sous
  contrôle CNDP-compatible
- **Réversible** — si à 90 jours le bouclage rendement n'atteint pas 15 %,
  on tue le projet sans avoir bâti une plateforme à 5 M€

---

## Prochaine étape immédiate

Bloquer une réunion 30 min avec **le responsable de l'app Al Moutmir**
pour valider (a) l'API disponible, (b) la possibilité d'injecter 3 blocs
de sortie supplémentaires dans leur UI, (c) le calendrier réaliste.
Si cette réunion débloque le scenario A (branchement), on attaque. Sinon,
on bascule en scenario B (app distincte) avec un coût et un risque
significativement plus élevés.

*Spec rédigée par D²nAI · juin 2026 · post-pivot Waze + ajustement Al Moutmir + multi-BU*
