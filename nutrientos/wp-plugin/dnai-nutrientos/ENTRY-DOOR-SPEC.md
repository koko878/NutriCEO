# NutrientOS — Spec de la porte d'entrée (MVP « Waze pour la nutrition »)

> Doc de cadrage du **premier service** à mettre en ligne — pas la plateforme,
> pas le standard, pas le marketplace. La plus petite chose qui crée déjà la
> boucle dépôt → valeur, et qui en grandissant *est* le moat de données.

**Rappel du principe.** La donnée ne se collecte pas, elle s'émet. On donne
un service utile dont l'usage produit la donnée comme sous-produit
invisible. Trois règles non-négociables :
1. **Donner avant de prendre** — le dépôt paie un service immédiat
2. **Zéro saisie en plus** — la saisie du service *est* le dépôt
3. **Effet de réseau** — plus on dépose, meilleure est la sortie

---

## 1. Persona — qui ouvre l'app le matin ?

**Cible v1 : l'agronome Al Moutmir sur le terrain.**

Raisons pour lequel c'est *la* bonne porte d'entrée :

- Il rencontre 5 à 20 agriculteurs par jour. C'est le **plus haut débit** de
  rencontres sol × culture × pratique de tout l'écosystème OCP.
- Il a déjà un téléphone OCP-sponsorisé, une bande passante 4G, un accès au
  référentiel produits OCP.
- Il a déjà un protocole : visite, prélèvement de sol, recommandation.
  L'outil ne lui *ajoute* rien — il **remplace** son carnet et son tableur.
- Il a déjà une remontée hiérarchique à faire (rapport de visite). On la
  rend *automatique*.
- Le bénéfice immédiat est dur : sans outil, il rentre le soir, ouvre Excel,
  recompose les données, transmet par mail. L'outil lui rend **2 heures par
  jour**.

**Personas v2/v3** (à ne pas implémenter dans le MVP) :
- Distributeur OCP : même mécanique, débit moins élevé, motivation
  commerciale plus que conseil
- Coopérative : agrégateur de besoins, dépose pour ses adhérents
- Agriculteur direct (smartphone) : seulement quand la boucle est rodée

**On ne vise PAS** : le chercheur, le sponsor stratégique, le DG d'OCP. Eux
consomment la sortie, ils ne déposent pas.

---

## 2. Le problème de la journée

Question concrète que l'agronome se pose, dans le champ, à 10h47 du matin,
face à un agriculteur qui attend une réponse :

> « Sur **cette parcelle** (sol moyen, climat semi-aride, blé tendre),
> j'applique **quelle formule OCP, à quelle dose** ? Et je peux promettre
> **quel rendement** et **quelle marge €/ha** ? »

Aujourd'hui il répond à la louche, ou il dit "je reviens vers toi", ou il
consulte un tableur que personne ne met à jour. **L'outil répond en 30
secondes, avec une justification courte que l'agriculteur comprend.**

C'est la *seule* chose qu'il fait. Pas de "tableau de bord", pas de
"reporting", pas de "module collaboration". Une question, une réponse,
sortir vivant.

---

## 3. Surface de saisie = surface de dépôt

**Règle de fer** : ce qu'on demande à l'agronome de saisir, c'est exactement
ce dont on a besoin pour la reco. Pas un seul champ "pour la base".

**6 champs maximum**, dont la plupart pré-remplis ou en sélection rapide :

| # | Champ | Type | Pré-remplissage |
|---|---|---|---|
| 1 | Région / commune | sélecteur | Géolocalisation auto (GPS) |
| 2 | Culture cible | sélecteur | Top 5 culture × région |
| 3 | Surface (ha) | nombre | — |
| 4 | Analyse de sol *(si dispo)* | 4 valeurs (N, P, K, pH) | Bouton « pas d'analyse » → base sol régional moyenné |
| 5 | Pratique précédente | sélecteur | « inconnu » accepté |
| 6 | Prix vente attendu *(optionnel)* | nombre | Default régional |

Sortie côté dépôt = `{région, culture, sol, climat (auto), pratique, date,
agronome_id, ferme_id pseudo}`. Le climat (T°, pluvio cumulée, ETP) vient
**gratuitement** via API méteo géolocalisée — l'agronome ne saisit rien.

---

## 4. Output immédiat = service qui justifie l'usage

L'écran de réponse, 3 blocs :

**Bloc A — Reco formule** : produit OCP + dose + nombre d'apports + calendrier.
Ex : *« NPK 15-15-15 OCP Spécial, 280 kg/ha, 2 apports (semis + tallage) ».*

**Bloc B — Rendement attendu** : valeur centrale + fourchette de confiance.
Ex : *« 4,2 t/ha — fourchette 3,7 à 4,8 selon climat ».*

**Bloc C — Marge €/ha** : prix vente − coût intrants − coût appli.
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

**M1 — Push notification J−7 récolte**
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

**Cible MVP** : ≥ **40 %** des recos sont bouclées par un rendement réel
dans les 12 mois. En-dessous, la base ne se calibre pas assez vite et le
projet stagne.

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
On peut même rendre QUEFTS open-source si ça aide le standard. **Ce qu'on
ne rend jamais open, c'est la base.**

---

## 7. Métriques *(ce qu'on regarde chaque lundi)*

**Adoption** :
- Agronomes actifs / semaine (DAU/WAU)
- Recos émises / agronome / jour (cible : 3+)

**Qualité du dépôt** :
- Taux de complétude (combien de recos ont l'analyse de sol vs base
  régionale uniquement)
- Diversité géographique des dépôts

**Boucle de retour** *(le KPI le plus important)* :
- Taux de bouclage rendement à 12 mois (cible : 40 %, plancher : 25 %)
- Latence moyenne reco → label

**Qualité du modèle** *(la sortie qui s'améliore)* :
- Spearman rang (reco vs rendement réel) — c'est exactement la métrique du
  simulateur d'origine
- RMSE rendement, par culture × région
- **Améliroation Δ par tranche de 1000 nouveaux labels** — c'est la **preuve
  visible** de l'effet de réseau

**Effet réseau** :
- Δ qualité du modèle pour la **région N** quand on ajoute des données
  d'une **région voisine N±1** (signal de transfert d'apprentissage)

---

## 8. Anti-patterns à graver dans le marbre

- ❌ **Ne pas** ouvrir le service à "tout le monde" dès le jour 1 — un
  cercle restreint d'agronomes Al Moutmir, en pilote, pour calibrer avant
  d'élargir.
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

---

## 9. Périmètre MVP — ce qu'on ship en 90 jours, et ce qu'on ne ship pas

**Dans le MVP :**
- App web mobile-first (PWA, pas d'app native) pour les agronomes Al Moutmir
- 6 champs de saisie + sortie 3-blocs (reco, rendement, marge)
- 1 région (à choisir : probablement **Doukkala** — terrain déjà briefé
  via la lighthouse demo NutrientOS v2.6)
- 1 culture (probablement **blé tendre** — saison qui arrive et données
  d'essais déjà disponibles)
- Bootstrap modèle = QUEFTS calibré sur essais OCP Doukkala
- Boucle de retour rendement : push J−7 + intégration NutriTrials
- Hébergement sur tenant Nutricrops (préalable Décision 1)
- Authentification : SSO M365 pour les agronomes (déjà déployé)

**Hors MVP — viendra après preuve de la boucle :**
- Multi-régions, multi-cultures
- Marketplace de partenaires (UM6P, AgriEdge, Ground Truth Analytics)
- Standard ouvert de la "valeur nutritive" (publié *après* avoir des
  dépôts à formater)
- Vue agriculteur direct (smartphone)
- Co-pilote IA conversationnel
- Dashboard région / pays / global pour le management

**On ne fait *jamais* dans NutrientOS :**
- Marketplace e-commerce d'intrants (conflit avec la vente OCP)
- Réseau social agriculteurs (hors scope, et risque réputationnel)

---

## 10. Roadmap 90 jours

| Semaines | Livrable | Critère de succès |
|---|---|---|
| 1-3 | Spec figée + design + bootstrap modèle (QUEFTS calibré Doukkala) | Une reco demo testable en interne sur 5 cas type |
| 4-6 | App PWA (saisie + sortie) + SSO M365 + tenant Nutricrops | 5 agronomes Al Moutmir l'utilisent en pilote interne |
| 7-9 | Boucle de retour (push J−7 + intégration NutriTrials) | Première reco bouclée par un rendement réel |
| 10-12 | Pilote terrain Doukkala (20 agronomes) | 300+ recos émises, 80+ recos en attente de bouclage, signal Spearman ≥ baseline QUEFTS |

**Sortie du sprint 90 j** : on présente au board (a) l'app qui tourne, (b)
la première promotion *visible* du modèle au fur et à mesure que les
labels arrivent, (c) un plan d'élargissement région × culture.

---

## 11. Ce qui rend ce plan défendable face au board

- **Pas de plateforme à financer** — c'est un service, on dépense en
  proportion de l'usage observé
- **Pas de standard à imposer** — on en publiera un *quand* il y aura des
  dépôts à formater (donc dans 12-18 mois, pas dans 3)
- **Pas de pari technologique** — le moteur baseline est QUEFTS, modèle
  publié depuis 30 ans, défendable scientifiquement
- **Le moat se voit grossir** — chaque mois, on peut afficher la courbe de
  croissance du dataset propriétaire OCP. C'est la métrique la plus simple
  à expliquer au board et au CEO
- **Conformité 09-08 par construction** — tout sur tenant Nutricrops, sous
  contrôle CNDP-compatible
- **Réversible** — si à 90 jours le bouclage rendement n'atteint pas 25 %,
  on tue le projet sans avoir bâti une plateforme à 5 M€

---

## Prochaine étape immédiate

Choisir **la région × la culture du pilote** (recommandation : Doukkala ×
blé tendre) et **la liste des 5 agronomes Al Moutmir** qui démarrent.
C'est la seule décision qui bloque la spec design, qui bloque le sprint 1.

*Spec rédigée par D²nAI · juin 2026 · post-pivot Waze*
