# NutriView — référentiel DGSSI consolidé

> Synthèse compacte du **Guide relatif à la classification des données** (DGSSI v1.0, 08/07/2025, 35 p.).
> Ce document est la **source d'autorité** que l'app encodera. Toute classification produite par NutriView doit pouvoir se justifier ligne par ligne par référence à une section de ce guide.
> PDF source : `spec/guide-dgssi-classification.pdf`.

---

## 1. Périmètre & base légale

- **Audience** : Entités et **Infrastructures d'Importance Vitale (IIV)** au sens de la **loi n° 05-20** sur la cybersécurité.
- **Référentiel d'impacts opposable** : **décret d'application n° 2-21-406** de la loi 05-20.
- **Question ouverte Nutricrops** : statut IIV exact à confirmer (impacte le caractère obligatoire vs volontaire de la conformité).

## 2. Les 3 dimensions de sécurité (CID)

- **C — Confidentialité** : accès limité aux personnes/systèmes autorisés.
- **I — Intégrité** : données exactes, complètes, modifiables seulement par les autorisés.
- **D — Disponibilité** : accessibles aux personnes/systèmes autorisés quand ils en ont besoin.

## 3. Échelle d'impact par dimension (5 niveaux)

| Niveau | Libellé | Impact |
|---|---|---|
| 4 | Très grave | Maintien capacités sécurité/défense État, intérêts stratégiques, santé/sécurité population, économie nationale, IIV |
| 3 | Grave | Incapacité (partielle/totale) IIV ou plusieurs entités non-IIV, pertes financières importantes IIV |
| 2 | Modéré | Gêne mineure IIV, ou incapacité totale entité non-IIV, pertes financières modérées |
| 1 | Limité | Gêne entité non-IIV, pertes financières limitées |
| 0 | Sans impact | Aucune gêne ni perte |

Chaque cellule a des **exemples concrets dans l'Annexe II** du guide (à encoder comme "evidence base" pour l'IA).

## 4. Règle d'agrégation (cœur de la classification)

**Classe globale = MAX(C, I, D)**

Mapping classe :
| Classe | Sensibilité | Origine |
|---|---|---|
| **I** | 4 (très grave) | impact maximal très grave sur ≥ 1 dimension |
| **II** | 3 (grave) | impact grave |
| **III** | 2 (modéré) | impact modéré |
| **IV** | 1 (limité) | impact limité |
| **V** | 0 (sans impact) | aucun impact |

## 5. Règle souveraineté / éligibilité cloud (le verdict que produit NutriView)

> **Données sensibles loi 05-20** = données dont **C ≥ 3** **ET** classe ∈ {I, II}
> → mesures de protection renforcées, dont **règle de résidence sur le territoire national**.

**Verdict cloud (logique d'app)** :
- **Cloud étranger ❌** si données sensibles (résidence MA obligatoire).
- **Cloud souverain MA / on-prem ✅ obligatoire** dans ce cas.
- Sinon : éligibilité conditionnelle aux mesures de protection adaptées au niveau.

## 6. Rôles (le « cadre collégial » exigé par le guide)

| Rôle | Mission |
|---|---|
| **CDO** (Chief Data Officer) | Stratégie data globale, coordination, conformité |
| **RSSI** | Politiques/procédures, surveillance contrôles, assignation rôles |
| **🟢 Propriétaire des données** | **Évaluation importance + classification → c'est lui qui VALIDE et SIGNE** |
| **Dépositaire** | Mise en œuvre technique des contrôles, gestion accès, audit |
| **Spécialiste classification** | Expert formé, support départements, formation, vérification |
| **Auditeur** | Revue contrôles, alignement politiques, suggestions |
| **Utilisateur** | Conformité, signalement incidents |

**Principe directeur** : classification = exercice **collégial**, jamais sur une seule personne.

## 7. Processus global (5 phases itératives)

```
Identification → Classification → Protection → Réévaluation → Suppression
   (inventaire)   (CID + MAX)     (Annexe I)    (périodique)   (archivage/destruction)
```

## 8. Méthodologie projet de classification

**Préparation** :
1. Organisation équipe (chargé projet + RSSI + métier)
2. Analyse contexte (taille, missions, obligations légales/contractuelles)
3. Définition échelle d'impact (échelle décret 2-21-406 obligatoire + échelle spécifique organisme)
4. Définition périmètre (par domaine d'activité)

**Mise en œuvre** :
1. Inventaire des données (ateliers avec propriétaires)
2. Attribution des niveaux (évaluation impacts C/I/D, classe = MAX, validation propriétaires)

## 9. Mesures de protection (Annexe I, à brancher sur le niveau)

Trois familles, à graduer selon la classe :

- **Gestion des accès** : MFA, moindre privilège, sécurisation connexions, journalisation.
- **Sécurité environnement** : restriction & traçabilité accès, protection serveurs & postes.
- **Cycle de vie** : validation automatisée saisie, traçabilité actions, **chiffrement**, sauvegardes régulières, destruction obsolètes, sécurisation transferts.

## 10. Principes invariants

- **Cycle de vie** : reclassification possible quand la donnée évolue (temporalité).
- **Proportionnalité** : niveau le plus bas possible, mais suffisamment élevé.
- **Neutralité technologique** : on classe le **contenu**, pas le format/support/origine.
- **Gouvernance collégiale** : aucun rôle ne décide seul.

---

## Ce que NutriView doit encoder (cahier des charges minimal)

1. **Catalogue de données** (entrée Excel ou auto-extrait d'un brief projet multi-format).
2. **Wizard CID** par donnée : pour chaque dimension, l'utilisateur (ou l'IA) choisit un niveau 0-4 en s'appuyant sur les exemples Annexe II.
3. **Moteur d'agrégation MAX** + calcul classe I-V + **verdict cloud** (résidence MA obligatoire si C≥3 ET classe∈{I,II}).
4. **Workflow validation/signature** envoyé au propriétaire des données (Chief Data Officer / data domain owner) avec ajustement possible ligne par ligne avant signature.
5. **Mesures de protection** suggérées (Annexe I) graduées selon classe.
6. **Traçabilité** : qui a classé / qui a validé / qui a signé / horodatage / version.

*Source : `spec/guide-dgssi-classification.pdf` (DGSSI v1.0, 08/07/2025) — Direction Générale de la Sécurité des Systèmes d'Information, Royaume du Maroc.*
