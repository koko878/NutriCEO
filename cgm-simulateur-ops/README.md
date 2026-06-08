# CGM Simulateur Ops — initiative BU (F. Ezzebdi)

App R Shiny standalone reçue de **Fouad Ezzebdi (BU Ops)** en juin
2026, déposée telle quelle dans cette branche `claude/cgm-simulateur-ops`
pour préservation et comparaison avec le CGM Cockpit officiel D²nAI.

## Contexte

L'équipe BU Ops a développé en parallèle un mini-simulateur de marge
CGM en R Shiny, sans coordination avec le cockpit officiel qui était
déjà en production. Ce code est conservé ici comme référence historique
et pour faciliter la comparaison entre les deux approches.

## Comparaison avec notre CGM Cockpit officiel

| | Simulateur Ops (cette branche) | CGM Cockpit (branche principale) |
|---|---|---|
| Stack | R + Shiny | HTML + JS, plugin WordPress |
| Catalogue produits | 89 produits | **141 produits** (catalogue v9) |
| Matières premières | 9 RM | **14 RM** (avec gypse, caco3, caso4) |
| Coûts production | ❌ (RM uniquement) | **Oui** (Aux, OM, EE, vapeur, tolling) |
| Scénarios pricing | 1 (basique) | **3** (Sc1 plancher, Sc2 nutriments, Sc3 blending) |
| Market Intelligence | Prix saisis manuellement | **Live Databricks Unity Catalog** |
| Crisis center / playbook | ❌ | **Oui** |
| Co-pilot IA | ❌ | **Oui** |
| Langues | FR uniquement | **FR / EN / PT-BR** |
| Historique simulations | ❌ | **Oui** |
| Analyse de sensibilité multivariée | **✅ Tornado + impact combiné/séparé** | **✅ Intégrée à partir de cette initiative** |

## Ce qu'on a repris dans le cockpit officiel

La **fonctionnalité d'analyse de sensibilité multivariée** (variables
sélectionnables avec choc %/$, tableau d'impact combiné, tornado par
produit ou moyenne sélection) a été identifiée comme un vrai apport.
Elle a été intégrée dans `mockup/cgm.html` sur la branche principale,
généralisée à nos 11 RM + Prix de vente sur l'ensemble des 141 produits
du catalogue, avec export CSV.

Voir le commit `CGM Cockpit — analyse de sensibilité multivariée`
sur la branche `claude/dnai-office-mvp`.

## Lancement local

```r
# Requirements
install.packages(c("shiny", "bslib", "readxl", "dplyr", "plotly",
                   "DT", "ggplot2", "gridExtra", "openxlsx"))

# Run
shiny::runApp("cgm-simulateur-ops")
```

## Contenu

- `app.R` — UI + serveur Shiny (822 lignes)
- `R/calculs.R` — logique métier CGM (69 lignes)
- `data/CSP.xlsx` — coefficients spécifiques de procédé (CSP) par produit
- `data/Referentiel.xlsx` — produits, matières premières, paramètres
- `www/logo.jpg` — logo OCP Nutricrops
- `SimulateurCGM.Rproj` — projet RStudio

## Contact original

Fouad Ezzebdi — fouad.ezzebdi@ocpgroup.ma

---

*Archivé par l'équipe D²nAI (Hamza Koh) le 8 juin 2026 dans la
branche `claude/cgm-simulateur-ops` pour préservation, sans pollution
du code de la branche principale.*
