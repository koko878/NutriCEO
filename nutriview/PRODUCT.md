# Product — NutriView

## Register

product

## Users

- **Chargé de projet digital / data Nutricrops** (Hamza Kohen + équipe D²nAI, sponsors BU côté Digital Solutions) — porte le projet, ingère le brief ou l'Excel, lance la classification, obtient le verdict cloud avant arbitrage d'architecture.
- **Propriétaire des données (data domain owner)** — au sens DGSSI : « Chief Data Officer / responsable de l'unité opérationnelle qui possède la connaissance approfondie de l'importance et de l'utilisation des données ». **Personnage central** : c'est lui qui valide, ajuste, et **signe** la classification. Sans sa signature, aucune décision cloud n'est opposable.
- **RSSI Nutricrops** — relecteur ponctuel, contrôle la cohérence des classifications avec la politique de sécurité.
- **CDO / direction conformité** — consulte les tableaux de bord (combien de projets classifiés, combien de données sensibles, combien de verdicts « non éligible cloud »).
- **Auditeur (interne ou DGSSI)** — accède au registre des classifications signées avec leur traçabilité (hash, horodatage, identité, version du guide encodée).

Contexte d'usage : bureau, navigateur, lumière vive (open-space ou bureau direction). Sessions concentrées (10-30 min pour une classification complète, parfois plusieurs jours d'aller-retour entre chargé de projet et propriétaire). Connectivité fiable (tenant Nutricrops). Mobile possible mais marginal (validation rapide en mobilité par un propriétaire occupé).

## Product Purpose

Avant tout projet digital ou data Nutricrops, **produire en moins de 30 minutes une classification DGSSI complète, justifiée par citations au guide officiel, validée par le propriétaire et signée**, qui détermine la politique de gouvernance et, surtout, l'**éligibilité au cloud étranger** (la donnée sensible au sens loi 05-20 = résidence territoriale obligatoire au Maroc).

Existe parce que :
- L'exercice manuel est aujourd'hui lent, peu reproductible, et inégalement compris dans les équipes — d'où des décisions cloud différées ou prises sans la classification (risque de non-conformité).
- Le guide DGSSI est rigoureux mais dense (35 pages) : sans accompagnement, sa mise en pratique demande un spécialiste à temps plein.
- L'écart entre « j'ai un brief de projet » et « j'ai la donnée typée prête à classifier » est ce qui frustre le plus l'équipe.

Succès = un chargé de projet arrive en réunion d'arbitrage cloud avec un verdict signé, ses justifications citées, et zéro discussion ouverte sur la conformité DGSSI.

## Brand Personality

D²nAI × OCP Nutricrops, sur un registre **administratif / gouvernemental** plus que SaaS. Trois mots :

- **Institutionnel** — c'est un outil qui produit un document opposable, pas un dashboard de productivité. Cormorant Garamond (titres) + Inter (corps) sur fond clair, vert OCP en accent unique, sobriété DGSSI-compatible (le PDF source est lui-même blanc + bleu marine).
- **Pédagogique** — chaque niveau choisi est accompagné de son exemple Annexe II et de sa justification. L'app éduque autant qu'elle classifie. Pas de jargon imposé, libellés en français explicite (« Très grave » plutôt que « C4 »).
- **Traçable** — chaque décision laisse une trace visible (qui a proposé, qui a édité, qui a validé, qui a signé). La traçabilité n'est pas une vue annexe, elle est dans le flux.

## Anti-references

- **ServiceNow GRC / RSA Archer / OneTrust** — outils de conformité « entreprise » lourds, formulaires sans fin, jargon hermétique. NutriView doit donner envie d'être ouvert, pas redouté.
- **Excel « matrice CID »** que NutriView remplace — éviter les grilles 3-cols figées sans état, sans contexte, sans citation. La data brute sans hiérarchie est une cible explicite à dépasser.
- **DocuSign-style** — la signature n'est pas le sujet d'ouverture. NutriView est un outil de **classification** ; la signature est l'aboutissement, pas le héros de la home.
- **SaaS « AI-first » génériques** — pas de gradient violet, pas de hero-metric, pas de « powered by AI » en bandeau. L'IA est un assistant invisible qui propose ; le propriétaire est le décideur visible.
- **Compliance theater** — pas de badges « ISO 27001 ready », pas de score « 87/100 conformité ». NutriView produit un livrable factuel ; il ne se note pas lui-même.
- **Tableurs déguisés** — comme NutriBudget, le résultat n'est pas une grille à plat ; c'est une **synthèse opposable** avec un **verdict net**.

## Design Principles

- **Le verdict cloud est un moment, pas une ligne.** Quand l'app dit « résidence Maroc obligatoire », ça doit frapper visuellement (bannière dédiée, pas une icône perdue dans un tableau). C'est la valeur métier centrale.
- **L'IA propose, le propriétaire décide.** Toute suggestion IA est marquée comme telle, avec sa justification visible et modifiable. La modification du propriétaire écrase la suggestion mais conserve la trace de la proposition initiale. Jamais d'auto-pilotage caché.
- **Citation toujours.** Aucun niveau attribué n'est sans pointer à une section du guide DGSSI (Annexe II en priorité). Si l'IA ne sait pas citer → elle ne propose pas, elle dit « à classer manuellement ».
- **Traçabilité native.** Chaque évènement (proposition IA, édition, validation, signature) est journalisé et visible dans le flux courant — pas dans une vue d'audit secondaire qu'on consulte une fois par an.
- **Souveraineté visible.** L'app rappelle où vivent les données du brief (« traité dans le tenant Nutricrops, modèle Databricks France Central, aucune sortie tenant ») dans le footer ou un badge. C'est un argument de confiance, pas un détail légal.
- **Conformité comme accélérateur.** L'outil doit donner envie d'arriver tôt en projet pour lever les ambiguïtés cloud — pas être perçu comme un goulot d'étranglement RSSI. Le ton est facilitateur, jamais bureaucratique.

## Accessibility & Inclusion

- **WCAG AA minimum** — non négociable (public visé : organismes publics + IIV, beaucoup d'utilisateurs en bureau gouvernemental, parfois assistants visuels).
- Sliders C/I/D opérables au clavier + lecteur d'écran (input range natif + aria), valeurs textuelles toujours doublées (« niveau 3 — Grave », pas juste un point sur une échelle).
- Couleur jamais seule pour porter le verdict : badge classe = forme + couleur + libellé (« Classe II — Grave »), verdict cloud = icône + texte + couleur.
- `prefers-reduced-motion` respecté (les animations de calcul live sont des feedbacks utiles, mais doivent dégrader proprement).
- FR uniquement au v1 (cohérent avec le guide DGSSI source en français). i18n (EN, AR) = phase 2 si le besoin émerge.
- Tabular-nums sur les chiffres (niveaux, dates, horodatages signature) — alignement vertical impeccable pour la crédibilité institutionnelle.

## Stack & contraintes (rappel)

React 18 + TypeScript + Tailwind v4 + Framer Motion + Phosphor Icons, build single-file via `vite-plugin-singlefile`, plugin WordPress `dnai-nutriview` (route `/nutriview` + shortcode `[nutriview]`), persistance localStorage v0 → REST + MySQL phase 1, IA via Databricks Model Serving (souverain, France Central). Charte D²nAI : Cormorant Garamond titres + Inter corps, palette verte OCP, vert OCP unique en accent.

*Rédigé par D²nAI · juin 2026 · synthèse de `SPEC.md` + des 7 décisions cadrage tranchées (autonomie IA propose-valide, stack React single-file + WP, backend Databricks souverain, multi-projets v1, signature hash, réévaluation cron, verdict binaire). Source d'autorité produit du projet NutriView.*
