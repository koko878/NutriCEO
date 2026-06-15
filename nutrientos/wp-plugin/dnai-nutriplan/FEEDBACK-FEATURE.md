# NutriPlan — Feature « Feedback Edition »

> **Pour une autre session Claude / un autre agent / un onboarding humain.**
> Ce document explique comment fonctionne la fonctionnalité de **récolte de feedback in-app** que j'utilise pendant les démos avec les parties prenantes (SAI, Sponsors BU, comités, CEO). Tout est documenté à partir du code réel (`app/nutriplan.html`, plugin `dnai-nutriplan` v0.16.0).

---

## En une phrase

**Clic-droit sur n'importe quel bloc de l'app → modal pour déposer un commentaire contextualisé (vue + bloc + auteur + texte) → pastille flottante qui compte → panneau de revue avec export JSON / CSV / markdown.** Tout stocké en `localStorage` (par navigateur), zéro backend, zéro setup.

C'est l'outil que j'ouvre quand je fais une démo live avec un user ou un comité : ils annotent ce qui les chiffonne en direct, je récupère un export propre à la fin de la session, je le partage dans Teams/Slack/Notion.

---

## Pourquoi cette feature existe (le « pour quoi »)

Pendant les revues métier (revue SAI, comités) :
- Les retours arrivent par **mail / Teams / Word collés** → perte de contexte (« la 3e tuile en haut à droite de l'écran portefeuille »), perte de traçabilité, doublons.
- Demander à 8 personnes de prendre des screenshots et de pointer ce qui ne va pas est lent et asymétrique.
- Le besoin : **capturer le commentaire au moment exact où il sort**, attaché au bon écran et au bon bloc, sans que le user quitte le contexte de la démo.

C'est exactement ce que fait Figma / Loom / Notion comments — porté ici dans une app WordPress mono-fichier vanilla JS, **sans backend** (les commentaires restent dans le navigateur du démonstrateur).

---

## Comportement utilisateur (le flow démo)

1. **J'ouvre l'app NutriPlan** en plein écran (`/nutriplan`) devant le user.
2. Le user dit « cette tuile-là, je ne comprends pas le label » → **je fais clic-droit dessus**.
3. Apparaît un **menu contextuel sombre** avec 2 entrées :
   - `💬 Ajouter un commentaire ici`
   - `📋 Voir tous les commentaires (N)`
4. Clic sur « Ajouter » → **modal centrée premium** :
   - Header « SUR : *titre du bloc détecté* » + breadcrumb de la vue (ex. *Portefeuille*)
   - Champ **Auteur** (mémorisé entre les commentaires de la session)
   - Champ **Commentaire** (textarea, autofocus)
   - Boutons **Annuler** / **Enregistrer**
5. Pendant l'édition, le bloc commenté est **encadré en pointillés jaunes** (visuel — on sait sur quoi on parle).
6. À l'enregistrement : la modal se ferme, la **pastille flottante en bas-droite** flash et passe à « 💬 N commentaires » (jaune → rouge dès qu'il y en a un).
7. À tout moment je peux cliquer sur la pastille → **panneau de revue plein écran droite** avec la liste complète, suppression unitaire, et **3 boutons d'export** :
   - `⤓ JSON` — fichier `nutriplan-feedback-YYYY-MM-DD-HH-MM.json`
   - `⤓ CSV` — fichier `.csv` (BOM UTF-8, head : `ts, author, view, block, comment, selector, lang`)
   - `📋 Copier markdown` — copie un markdown formaté dans le presse-papier, prêt à coller dans Teams / Slack / Notion / Jira
8. Bouton `🗑 Tout effacer` (avec confirmation premium) pour nettoyer entre 2 démos.

**Aucune installation côté user.** Le user voit la modal sombre branded D²nAI, point.

---

## Architecture technique

### Localisation dans le code

| Élément | Fichier | Lignes |
|---|---|---|
| CSS (`.fb-*` namespace) | `app/nutriplan.html` | 525 → ~590 |
| JS module IIFE `FB` | `app/nutriplan.html` | 4189 → ~4330 |
| Bootstrap (mount badge) | `app/nutriplan.html` | `mountBadge()` appelé au boot |

### Stockage

- **Clé localStorage** : `nutriplan_feedback_v1` (liste des commentaires, JSON sérialisé)
- **Clé auteur** : `nutriplan_feedback_author_v1` (mémorisation prénom entre commentaires)
- **Pas de backend**. C'est *par navigateur*. Si je démo sur mon laptop, les commentaires restent sur mon laptop. Idéal pour un workshop ; pas adapté à du feedback asynchrone multi-user (pas le besoin).

### Modèle de donnée d'un commentaire

```json
{
  "id": "fb-mglmd7-a2b",
  "ts": "2026-06-15T14:32:18.451Z",
  "author": "Abdelali",
  "view": "Portefeuille",
  "block": "% Transform → Demo / Launch",
  "selector": "div.kpi > div.k",
  "lang": "fr",
  "comment": "Le label est ambigu — préciser que c'est calculé sur les trials clos."
}
```

### Détection du contexte (`blockLabel`)

L'algo qui trouve « SUR quoi » l'utilisateur a cliqué, par ordre de priorité :

1. Si l'élément (ou un ancêtre) porte `data-fb-name="..."` → on prend cette valeur. **C'est l'overrride manuel** : je peux annoter explicitement un bloc dans le HTML pour donner un libellé propre au feedback.
2. Sinon, on cherche un ancêtre `.card / .ck-hero / .kpi / .kb-card / .kn-card / .uc-sect / .uc-kpi / .form-section / .heat-row / .row-2c / .cal-row / .mds-row / .screen`.
   - Si trouvé : on prend son `h2/h3/h4/.eyebrow/.h-pg` (texte tronqué à 80 chars).
   - Sinon : on prend la première classe sémantique.
3. Fallback : on remonte 8 ancêtres et on prend le premier `h2/h3/h4`.
4. Sinon : `(zone non identifiée)`.

→ **Pour rendre un bloc plus annotable** : ajouter `data-fb-name="Nom lisible"` sur l'élément.

### Détection de la vue (`viewLabel`)

Lit `PREFS.view` (cockpit / portfolio / projects / intake / calendar / governance / fast-track / kb / controls / admin / dashboards) puis cherche le label i18n du crumb dans la config `NAV`. Donc le `view` stocké est déjà localisé (FR/EN/PT-BR au moment du commentaire).

### Sélecteur CSS (`selectorOf`) — trace technique

En plus du libellé humain, on stocke un sélecteur CSS court (max 5 niveaux d'ancêtres, classes tronquées à 2). C'est la **trace dev** : permet de retrouver l'élément exact dans le code si un commentaire est ambigu côté libellé. Affiché dans l'export JSON/CSV, pas dans la copie markdown (réservé aux humains).

### Branches du UX (où ça ne se déclenche pas)

Le `contextmenu` listener **ignore** :
- Les `<input>`, `<select>`, `<textarea>` (pour ne pas casser le menu natif copier/coller du user)
- La modal feedback elle-même (`.fb-modal`)
- Le panneau de feedback (`.fb-panel`)

Donc clic-droit dans un champ formulaire = comportement natif navigateur normal.

---

## Formats d'export

### JSON

```json
{
  "exportedAt": "2026-06-15T14:35:02.118Z",
  "count": 7,
  "comments": [
    { "id": "...", "ts": "...", "author": "...", "view": "...", "block": "...", "comment": "...", "selector": "...", "lang": "..." }
  ]
}
```

**Use case** : ingestion programmatique, archivage workshop, backup.

### CSV

```
ts,author,view,block,comment,selector,lang
"2026-06-15T14:32:18.451Z","Abdelali","Portefeuille","% Transform → Demo / Launch","Label ambigu…","div.kpi > div.k","fr"
```

BOM UTF-8 en tête (pour Excel français). Double-quote escapée par double-double-quote (standard RFC).

**Use case** : import dans un tracker (Jira, Linear, Notion DB), Excel pour priorisation.

### Markdown (presse-papier)

```markdown
### 1. % Transform → Demo / Launch *(Portefeuille)*
- **Par** Abdelali — 15/06/2026 14:32:18

Le label est ambigu — préciser que c'est calculé sur les trials clos.

---

### 2. Alertes & escalations *(Cockpit)*
- **Par** Sara — 15/06/2026 14:34:01

Manque l'âge de l'alerte en couleur (rouge si >14j).
```

**Use case** : coller direct dans Teams/Slack/Notion/Linear/Jira issue. C'est mon export par défaut en sortie de démo.

---

## Comment je l'utilise en démo (process)

1. **Avant la session** : ouvrir le panneau feedback, `🗑 Tout effacer` (nettoyage).
2. **Pendant la session** : laisser le user piloter, faire clic-droit à chaque retour qu'il formule, lui demander de dicter le commentaire (je tape pour ne pas lui imposer le clavier). Le **prénom** se met une seule fois et s'auto-remplit.
3. **À la fin** : ouvrir le panneau → `📋 Copier markdown` → coller dans Teams ou Notion. En parallèle `⤓ JSON` pour archivage projet.
4. **Triage post-session** : import dans Linear / Notion DB / Excel via CSV, mapping `block` → composant à corriger.

**Astuce démo** : si plusieurs personnes commentent, je change le champ Auteur à chaque tour (`Abdelali`, `Sara`, `Hassan`…) → l'export final attribue proprement les retours.

---

## Limitations connues (à dire au user)

- **Stockage local navigateur** : si je change de laptop ou si je vide les données navigateur, les commentaires non exportés sont perdus. → Exporter régulièrement.
- **Pas de sync multi-user** : c'est un outil de démo unilatéral (le démonstrateur centralise). Pas adapté à du feedback asynchrone réparti — pour ça, utiliser un tracker dédié.
- **Pas d'édition** : un commentaire enregistré peut être supprimé mais pas modifié. (Ajout de l'édition = trivial mais pas prioritaire — pousser et recommencer si erreur.)
- **Le clic-droit natif est shunté** sur les blocs interactifs : si le user veut copier-coller du texte sélectionné, il faut soit sélectionner d'abord puis Ctrl+C, soit faire clic-droit dans un input.

---

## Pour étendre la feature (si un agent doit y toucher)

Hooks d'extension faciles :

- **Améliorer la détection contextuelle** : ajouter `data-fb-name="..."` sur les blocs qu'on veut annoter avec un libellé custom (les `.ck-hero`, certaines zones du formulaire intake, etc.).
- **Ajouter un champ « sévérité »** (P0/P1/P2/P3) dans la modal `addAt()` : 1 ligne CSS + 1 champ + push dans l'objet.
- **Synchro serveur** (si on veut sortir du localStorage) : remplacer `save()` par un POST vers le REST endpoint plugin (`/wp-json/dnai/nplan/v1/feedback` à créer). Reuse du pattern collection existant (`/collection/{name}`).
- **Notification visuelle d'un nouveau commentaire d'un autre user** : pas applicable tant qu'on reste local.

---

## Origine

Feature portée 1:1 depuis le **CGM Cockpit** (autre plugin D²nAI), avec adaptation des libellés de bloc au DOM NutriPlan. Mentionnée dans `readme.txt` à partir de v0.6.0 ; toujours active en v0.16.0.

---

*Doc rédigée par D²nAI · juin 2026 · pour onboarder une autre session Claude ou un humain sur la feature feedback.*
