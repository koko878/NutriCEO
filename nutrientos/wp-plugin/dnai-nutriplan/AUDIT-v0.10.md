# NutriPlan — Audit impeccable (v0.10.x)

> Audit technique 5 dimensions selon le skill `impeccable audit`.
> Score : **10/20 (Acceptable — significant work needed)**.
> Date : juin 2026, après v0.10.2.

## Score matrix

| # | Dimension | Score | Key Finding |
|---|---|---|---|
| 1 | Accessibility | **2/4** | Labels non liés aux inputs, pas de `:focus-visible`, 60+ `<div onclick>` non-keyboard-reachable, `--muted-2` fail AA (2.85:1) |
| 2 | Performance | **3/4** | `innerHTML=` full-rewrite × 25, ~110 weights de fonts chargés, 4 animations infinies, backdrop-blur cumulés |
| 3 | Responsive | **2/4** | Kanban 280px fixe (scroll horizontal mobile), touch targets <44px (lang switcher 26px, ref-chip 22px) |
| 4 | Theming | **2/4** | 123 couleurs hardcodées (pill-status, RACI, calendar bars), inline `style=` × 30+, pas de dark mode |
| 5 | Anti-Patterns | **1/4** | Eyebrows sur chaque écran, side-stripe `border-left:4px`, hero-metric template, gradient overload, emoji-as-icon × 200 |
| **TOTAL** | | **10/20** | |

## Anti-patterns verdict — **FAIL (looks AI-shaped)**

Le moteur métier est solide (data, workflow, i18n, drill-down honnête) — pas du AI slop tier. Mais les **scaffolding reflexes** sont exactement ceux que SKILL.md flag comme AI grammar 2026 :

1. **Eyebrow sur chaque écran** (15 instances, clés i18n `*.eye` — le pattern est institutionnalisé)
2. **Side-stripe `border-left: 4px solid`** sur `.alert` et `.fb-item` — ban absolu
3. **Hero-metric template** (Cockpit `.ck-hero` — gradient sombre + 3-col big number/small label/trend)
4. **Numbered scaffolding** `A.B.C.D.` sur les cards Dashboards (décoratif sur cards parallèles)
5. **Glassmorphism by default** sur 3 stacks de modales (3 valeurs de blur différentes)
6. **Identical card grids** répétés (Cockpit Bridge = 4 KPI cards en ligne, idem ailleurs)
7. **Emoji-as-iconography** × 200+ (rendu inconsistant cross-OS, pas accessible)
8. **Gradient overload** (42 `linear-gradient` dont beaucoup décoratifs)

## Top 3 P0 (blocking)

1. **Form labels non liés aux inputs** — 14 champs intake, screen reader lit "edit text blank". WCAG 1.3.1, 4.1.2.
2. **Aucun `:focus-visible`** sur boutons/links/sidebar/cards — keyboard nav totalement invisible. WCAG 2.4.7.
3. **60+ `<div onclick>`** non-keyboard-reachable (KPI tiles, kanban cards, table rows, donut segments) — WCAG 2.1.1. Le drill-down qu'on vient de fixer est inutilisable sans souris.

## 8 P1 + 7 P2 + 4 P3

Cf. `/home/user/NutriCEO/nutrientos/wp-plugin/dnai-nutriplan/AUDIT-v0.10.md` full report (réponse complète de l'agent).

## Positives à conserver

- i18n complet FR/EN/PT-BR
- `UI.prompt/confirm/alert` bien construit (focus trap, aria-modal, autofocus)
- `.kpi--static` discipline (drill-down honnête — le fix de v0.10.2 paye)
- `font-variant-numeric:tabular-nums` partout
- Empty-state premium `pf-empty-hero`
- REST + MySQL + localStorage fallback
- Active filter chips bar (drill-down state visible & reversible)
- Sticky table headers + overflow

## Plan de remédiation (séquence)

| # | Commande | Cible | Priorité |
|---|---|---|---|
| 1 | `/impeccable harden` | P0 a11y : label/for, :focus-visible, div→button, aria-label, prefers-reduced-motion, focus trap UC modal | **P0** |
| 2 | `/impeccable quieter` | Strip eyebrows excédentaires, side-stripes, hero-metric, glassmorphism, gradients décoratifs | P1 |
| 3 | `/impeccable colorize` | `--muted-2` → #637368, muted text sur green-tinted, amber `.dash-bar` → green | P1 |
| 4 | `/impeccable extract` | 123 hardcoded → tokens semantic (`--st-*-fg/bg`, `--av-1..6`, `--raci-*`, `--bar-*`) | P1 |
| 5 | `/impeccable distill` | Drop A.B.C.D., compresser Cockpit Bridge, eyebrows redondants | P2 |
| 6 | `/impeccable adapt` | Touch targets ≥44px, fix `body{overflow:hidden}`, kanban 360px viewport | P2 |
| 7 | `/impeccable typeset` | Nav emojis → inline SVG icon set | P3 |
| 8 | `/impeccable animate` | Limit infinite pulses, scope motion behind reduced-motion | P3 |
| 9 | `/impeccable polish` | Final pass + re-audit → cible 16+/20 | finale |

Estimation : pass 1+2+3 (P0/P1) = ~v0.11.0. Passes 4-9 = v0.12.0 / v0.13.0.

*Audit rédigé par sub-agent impeccable · juin 2026, après v0.10.2 · base pour les passes de remédiation v0.11+.*
