# Product — NutriBudget

## Register

product

## Users

- **Hamza Kohen** (Global Head Data & AI + Core IT, D²nAI) — consolide, défend et arbitre le budget Digital/Data Nutricrops ; fait le pont entre Top management / Task Forces Groupe et l'équipe.
- **Équipe DSI Nutricrops** (Meryem El Mechrafi, Faïçal Congo, Fatima Z. Chraibi, Marwane Bouayad, Wissam Nyoube, Saoussane El Hannachi, Oumaima Eloualidi…) — saisissent et maintiennent les lignes, suivent les paiements, répondent aux demandes des Task Forces.
- **Waseem Rashid** (EVP Digital Solutions) + sponsors BU — défendent leurs lignes en comité, suivent leur portefeuille.
- **Comités & Task Forces** (TF CAPEX, TF OPEX, EPM, Group Performance, Comité Budget / Investissement, Board Nutricrops) — consomment des vues consolidées en lecture pour arbitrer.

Contexte d'usage : bureau, navigateur, écrans larges. Sessions courtes et sous pression (répondre à une demande TF avec deadline d'une heure, vérifier un statut de paiement bloqué, consolider avant un comité). Connectivité fiable. Mobile = consultation rare.

## Product Purpose

Outil **tactique** de gestion, consolidation et partage du budget au niveau Nutricrops — le **pont avant Anaplan** (déploiement à ~2 ans). Il existe parce que le budget vit aujourd'hui éparpillé dans ~15 fichiers Excel et une SharePoint, sans source de vérité, sans lien stable ressource↔ligne↔paiement, et avec une chaîne d'exécution (OTP→PO→SAP→facture) opaque qui se découvre à J-3 du paiement.

Trois jobs, mesurables :
- **Gérer** — une ligne d'engagement saisie une fois, typée (CAPEX/OPEX, BU, prestataire, montant, devise, OTP/PO, statut paiement, justification).
- **Consolider** — vue temps réel multi-BU / multi-devise (MAD/USD/EUR → MAD), CAPEX vs OPEX, par prestataire, par statut de paiement.
- **Partager** — vue lecture seule pour les comités + export CSV + génération des templates Task Force (une saisie → N formats), pour en finir avec la resaisie sous deadline.

Succès = l'équipe arrête de ressaisir/relancer et passe au pilotage ; les arbitrages se prennent sur une donnée fraîche et tracée.

## Brand Personality

OCP Nutricrops × D²nAI. Trois mots : **sobre** (outil de travail financier, pas un dashboard SaaS bling), **fiable** (chiffres tabulaires, conversion explicite, traçabilité — la confiance d'un outil budgétaire est non négociable), **respectueux du métier** (sert le workflow réel des Task Forces et comités, ne le complique pas). Charte D²nAI imposée : Cormorant Garamond (titres) + Inter (corps), palette verte OCP, fond clair.

## Anti-references

- **Anaplan / SAP / outils EPM lourds** — la cible long terme, mais surtout pas leur complexité ni leur courbe d'adoption ; NutriBudget doit être ouvrable et utile en une minute.
- **Tableur déguisé** — ne pas reproduire un Excel à plat ; la valeur est dans la consolidation et la vue, pas dans une nième grille.
- **Dashboards SaaS génériques** — gradient violet « AI », hero-metric en boucle, cards uniformes 3-col, glassmorphism décoratif, eyebrow uppercase sur chaque section.
- **Faux sérieux financier** — pas de rouge/vert criard partout ; la couleur porte un sens (statut paiement, CAPEX vs OPEX), jamais la décoration.

## Design Principles

- **La consolidation est le produit.** Toute vue doit répondre « combien, où, dans quel état » sans que l'utilisateur recompte. Si une info oblige à ressaisir ou rappeler quelqu'un, c'est un échec.
- **Le chiffre ne ment jamais.** Tabular-nums partout, devise et taux de conversion explicites, montants traçables jusqu'à la source. Aucun nombre « de tête ».
- **Une saisie, N sorties.** Les templates Task Force sont des projections d'un modèle unique, jamais des ressaisies.
- **Rendre visible l'amont.** Ce qui se découvrait à J-3 du paiement (blocages SAP/Procurement) doit être visible en permanence.
- **Lecture seule = par défaut pour le partage.** Diffuser aux comités sans jamais risquer une modification.

## Accessibility & Inclusion

- WCAG AA minimum (contraste ≥4.5:1 corps, ≥3:1 large/UI). Texte muted jamais sous le seuil.
- La couleur ne porte jamais seule l'information : statut = pastille + libellé + couleur ; CAPEX/OPEX = libellé + couleur.
- Tabular-nums sur tous les chiffres (alignement vertical des montants).
- Navigation clavier (focus visible vert, ESC ferme la modale), `prefers-reduced-motion` à respecter.
- Multilingue non requis au MVP (FR), mais à anticiper (équipe FR/EN/PT-BR comme NutriPlan).

## Stack & contraintes

Mono-fichier HTML, vanilla JS, zéro build (pattern D²nAI). Persistance localStorage au MVP ; cible REST + MySQL + SSO Entra ID (pattern NutriPlan) pour le partage serveur réel. Souveraineté : data Maroc, conformité loi 09-08. Charte verte OCP non négociable.

*Rédigé par D²nAI · juin 2026 · base : 79 mails budget + tableau de besoins v2 + app NutriBudget v0.1.*
