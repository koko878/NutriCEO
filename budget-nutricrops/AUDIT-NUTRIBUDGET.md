# NutriBudget — Audit impeccable

> Audit technique 5 dimensions (skill `impeccable audit`) sur `app/nutribudget.html`.
> Register : **product**. Charte D²nAI. Avant → après la passe de remédiation.

## Score

| # | Dimension | v0.1 | v0.2 | Δ |
|---|---|---|---|---|
| 1 | Accessibility | 2/4 | **4/4** | +2 |
| 2 | Performance | 3/4 | **3/4** | = |
| 3 | Responsive | 2/4 | **3/4** | +1 |
| 4 | Theming | 3/4 | **3/4** | = |
| 5 | Anti-Patterns | 3/4 | **4/4** | +1 |
| **Total** | | **13/20** | **17/20** | **+4** |

Bandes : 13 = Acceptable · 17 = Good. Verdict anti-patterns : **PASS** (ne ressemble pas à de l'AI slop).

## Ce qui a été corrigé (v0.2)

### Accessibility (P0 → résolu)
- **Labels liés** : 15 champs du formulaire d'édition passent en `<label for=>` (lecture écran correcte).
- **Clavier** : barres de drill-down (BU, statut paiement) converties de `<div onclick>` en `<button type="button">` ; en-têtes de tri `<th>` rendus `role="button"` + `tabindex=0` + `onkeydown` (Enter/Espace) + `aria-sort`.
- **Focus-trap modale** : `role="dialog"` + `aria-modal`, Tab cyclique, restitution du focus à l'élément déclencheur à la fermeture, ESC ferme.
- **aria-label** sur boutons icône (✎ éditer, ✕ fermer, recherche, selects de filtre, lien de partage) ; **aria-hidden** sur les emoji décoratifs (KPI, boutons texte).
- **`prefers-reduced-motion`** : coupe animations/transitions.
- Utilitaire **`.sr-only`** pour les libellés masqués visuellement.

### Responsive (P1 → résolu)
- `.top` passe en `flex-wrap` (plus de débordement horizontal mobile).
- Sous 760px : `.top`/`.nav` dé-stickés (fin du chevauchement quand le header wrap), `.role` masqué.
- Touch targets ≥44px via `@media(pointer:coarse)` ; `.ic-btn` 30→36px.

### Anti-Patterns + Theming (P2 → résolu)
- Gradients décoratifs des barres de données **aplatis en couleurs solides tokenisées** (`var(--green-600)`, `var(--capex)`, `var(--opex)`, `var(--muted)`) — sobriété conforme au register product.
- Emoji-as-icon neutralisés pour l'accessibilité (décoratifs `aria-hidden`).

## Reste (P2/P3, non bloquant)
- Quelques hex encore en dur (textes de bannières, bordure delete modale) — tokenisables.
- Pattern innerHTML full-render (OK à l'échelle MVP ; delta-render si la liste grossit beaucoup).
- Bandeau KPI = 4 tuiles (frôle le « card grid » mais légitime pour un dashboard budgétaire, sans gradient-accent).
- i18n FR uniquement (EN/PT-BR à prévoir comme NutriPlan).

*Audit + remédiation · D²nAI · juin 2026 · branche `claude/budget-nutricrops`.*
