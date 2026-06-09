# D²nAI Knowledge Pack

> **À copier dans `CLAUDE.md` à la racine du nouveau repo.** Ce document
> capture l'ADN technique, visuel et conversationnel des projets D²nAI
> pour qu'une nouvelle session Claude Code reparte avec le bon contexte
> dès le premier message.

---

## 1. Contexte entreprise & équipe

- **Groupe** : OCP Group (Maroc)
- **Filiale / BU** : **OCP Nutricrops** — https://www.ocpnutricrops.com
- **Mission BU** : *« Empowering farmers to deliver sustainable nutrition for a growing world. »*
- **Mission Groupe** : *« Feed the soil to feed the world. »*
- **Équipe** : **D²nAI** — *Data, Digital & AI* — l'équipe data/digital/IA Nutricrops, pilotée par Hamza Koh.
- **Public cible des livrables** : CEO Nutricrops + comités exécutifs, métiers (pricing, COO, DRH, risk), board OCP.

---

## 2. Charte visuelle

### Palette (réutiliser systématiquement)

```css
:root{
  /* Greens — OCP / D²nAI */
  --green-900:#103d17;
  --green-800:#1B5E20;  /* vert principal (titres, accents) */
  --green-700:#2E7D32;
  --green-600:#388E3C;
  --green-500:#4CAF50;
  --green-300:#66BB6A;  /* vert clair / accent positif */
  --green-100:#D6EADB;
  --green-50:#EAF4EC;   /* fond carte / TL;DR */
  /* Encres */
  --ink:#10231a;
  --muted:#5c6b62;
  --line:#e3ebe5;
  /* Statuts */
  --warn:#B45309;  --warn-bg:#FEF3C7;  --warn-line:#FCD34D;
  --bad:#B91C1C;   --bad-bg:#FEE2E2;
  --amber:#D97706; --amber-bg:#FFFBEB;
  --dark:#07140c;  /* fond bloc "ask" */
}
```

### Typographie

- **Titres / wordmark** : `Cormorant Garamond` (serif classique, italiques pour emphase)
- **Corps / UI** : `Inter` (weights 400-800)
- Import standard :
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet">
  ```

### Logo D²nAI (en HTML, sans asset externe)

```html
<div class="brand">D<sup>2</sup>nAI<span class="by">Data · Digital &amp; AI · OCP Nutricrops</span></div>
```

```css
.brand{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:30px;color:var(--green-800);line-height:1}
.brand sup{font-size:18px;vertical-align:super}
.brand .by{display:block;font-family:'Inter';font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:5px}
```

### Favicon / icon SVG inline (pas de fichier à embarquer)

```html
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'%3E%3Crect width='180' height='180' rx='40' fill='%231B5E20'/%3E%3Ctext x='90' y='118' text-anchor='middle' font-family='serif' font-size='90' font-weight='700' fill='%23E6F4E6'%3ED%3C/text%3E%3C/svg%3E">
```

### Ton & registre

- Univers : agriculture / nutrition des cultures × data / IA
- Valeurs : durabilité, santé des sols, agriculture climato-positive, centrée agriculteur
- Registre : **professionnel, technique, orienté impact terrain, francophone par défaut**
- Pour les notes CEO : sobre, précis, jamais jargon anglo-saxon non nécessaire

---

## 3. Stack technique réel (ce qui existe en prod)

| Couche | Technologie | Notes |
|---|---|---|
| **Front** | HTML/CSS/JS mono-fichier embarqué | Pas de build, pas de framework. Single-file = vitesse d'itération maximale. |
| **Host** | WordPress (plusieurs sites + plugins maison `dnai-*`) | Pattern : plugin par produit, shortcode + URL plein écran. |
| **CDN / edge** | Azure Front Door (AFD) | Attention aux caches POST options.php — utiliser `admin-post.php` pour les settings. |
| **IA** | Open WebUI / OpenAI-compatible APIs · Azure Databricks Foundation Model APIs | Toujours en proxy serveur, jamais d'API key côté client. |
| **Données structurées** | Databricks Unity Catalog (Market Intel, etc.) | SQL warehouse pour les data lakes Groupe. |
| **Documents** | SharePoint (interne) | Indexation locale pour RAG quand sensible. |
| **Mail** | Exchange on-prem | `.msg` natif, conversion en `.eml` pour ingestion. |
| **Auth** | Microsoft 365 SSO (Azure AD / Entra ID) | OAuth Authorization Code + PKCE quand pertinent. |
| **Mobile** | Pas d'app native — PWA-friendly HTML (apple-mobile-web-app, theme-color, viewport-fit cover) | Le CEO consomme tout sur iPhone. |
| **Source control** | GitHub (`koko878/*` repos) | Toujours sur une branche dédiée, push avec rebase systématique. |

---

## 4. Patterns architecturaux maison

### 4.1. Le plugin WordPress D²nAI standard

Pattern stabilisé sur 6+ plugins (`dnai-cgm-cockpit`, `dnai-nutrientos`, `dnai-nutriplan`, `dnai-note-ceo`, `atlas`, `dnai-office`).

**Structure :**
```
dnai-<produit>/
├── dnai-<produit>.php   # bootstrap + routes + shortcodes + REST + settings
├── readme.txt           # version, install, use, changelog
└── app/
    ├── <produit>.html   # le mono-fichier qui fait tourner l'expérience
    └── ...
```

**Squelette du `.php` :**

```php
<?php
/**
 * Plugin Name:       D²nAI <Produit>
 * Description:       <Une ligne sur ce que fait le plugin>
 * Version:           1.0.0
 * Author:            D²nAI · OCP Nutricrops
 * License:           GPL-2.0-or-later
 * Text Domain:       dnai-<produit>
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }

define( 'DNAI_<PROD>_VER', '1.0.0' );
define( 'DNAI_<PROD>_URL', plugin_dir_url( __FILE__ ) );
define( 'DNAI_<PROD>_DIR', plugin_dir_path( __FILE__ ) );

/* ----- 1. URL plein écran (pas de chrome WP) ----- */
add_action( 'init', function () {
    add_rewrite_rule( '^<slug>/?$', 'index.php?dnai_<prod>_app=1', 'top' );
});
add_filter( 'query_vars', function ( $v ) { $v[] = 'dnai_<prod>_app'; return $v; });

add_action( 'template_redirect', function () {
    if ( ! get_query_var( 'dnai_<prod>_app' ) ) return;
    $path = DNAI_<PROD>_DIR . 'app/<produit>.html';
    status_header(200);
    header('Content-Type: text/html; charset=utf-8');
    header('X-Robots-Tag: noindex, nofollow', true);
    nocache_headers();
    $html = file_get_contents( $path );
    // Injection config (REST endpoints, nonce, flags AI)
    $cfg = '<script>window.DNAI_<PROD>=' . wp_json_encode([
        'chat'  => esc_url_raw( rest_url( 'dnai-<prod>/v1/chat' ) ),
        'nonce' => wp_create_nonce( 'wp_rest' ),
        'ai'    => /* bool ai_ready */ true,
    ]) . ';</script>';
    echo str_replace( '</head>', $cfg . '</head>', $html );
    exit;
});

register_activation_hook( __FILE__, fn() => flush_rewrite_rules() );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

/* ----- 2. Shortcode pour embed dans une page WP ----- */
add_shortcode( '<produit>', function () {
    $src = esc_url( DNAI_<PROD>_URL . 'app/<produit>.html?v=' . DNAI_<PROD>_VER );
    $wrap = 'position:relative;left:50%;right:50%;width:100vw;max-width:100vw;margin-left:-50vw;margin-right:-50vw;padding:0 12px;box-sizing:border-box;';
    return '<div style="' . $wrap . '"><iframe src="' . $src
         . '" style="display:block;width:100%;height:820px;border:0;border-radius:12px;overflow:hidden;"'
         . ' allow="fullscreen" allowfullscreen></iframe></div>';
});

/* ----- 3. REST proxy IA (clé serveur, jamais côté client) ----- */
// register_rest_route avec permission_callback custom :
//   - accepte le nonce WP standard
//   - ET accepte same-origin (Origin/Referer host = home_url host)
//     parce que derrière AFD le cookie-bound nonce est souvent stale.

/* ----- 4. Settings via admin-post.php (PAS options.php derrière AFD) ----- */
add_action( 'admin_post_dnai_<prod>_save', function () {
    if ( ! current_user_can('manage_options') ) wp_die('Forbidden', 403);
    check_admin_referer('dnai_<prod>_save');
    update_option( 'dnai_<prod>_settings', /* sanitized */ ... );
    wp_safe_redirect( add_query_arg(['page'=>'dnai-<prod>', 'dnai_saved'=>'1'], admin_url('options-general.php')) );
    exit;
});
```

**Pourquoi `admin-post.php` et pas `options.php`** : derrière Azure Front Door, les POST options.php peuvent être cachés/droppés et l'option n'est jamais persistée. `admin-post.php` + `update_option()` est direct et fiable.

**Pourquoi le permission_callback REST a un fallback same-origin** : derrière AFD, le cookie-bound nonce est régulièrement stale (caché), donc on tolère les requêtes browser dont l'Origin = home_url.

### 4.2. Le HTML mono-fichier

- **Tout-en-un** : CSS embarqué dans `<style>`, JS dans `<script>`, pas d'asset externe.
- **CDN externe autorisé** : Google Fonts uniquement.
- **Configuration injectée** : le PHP injecte `window.DNAI_<PROD> = {...}` juste avant `</head>` avec REST endpoints + nonce + flags.
- **Headers iPhone** :
  ```html
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#1B5E20">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="<Nom court>">
  ```
- **Open Graph** (pour partage WhatsApp/iMessage/LinkedIn) :
  ```html
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="D²nAI · OCP Nutricrops">
  <meta property="og:title" content="...">
  <meta property="og:description" content="...">
  <meta property="og:locale" content="fr_FR">
  <meta name="twitter:card" content="summary_large_image">
  ```

### 4.3. i18n trilingue (FR / EN / PT-BR)

Pattern data-attribute, sans framework :

```html
<button class="lng on" data-l="fr" onclick="setLang('fr')">🇫🇷</button>
<button class="lng"    data-l="en" onclick="setLang('en')">🇬🇧</button>
<button class="lng"    data-l="pt" onclick="setLang('pt')">🇧🇷</button>

<h1 data-k="title">Titre</h1>
<p  data-k="lead">Texte d'intro</p>
```

```js
let LANG='fr';
const T = {
  fr:{ 'title':'Titre', 'lead':'Texte d\'intro' },
  en:{ 'title':'Title', 'lead':'Lead text' },
  pt:{ 'title':'Título', 'lead':'Texto introdutório' }
};
function applyLang(){
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-k]').forEach(e => {
    const v = T[LANG][e.dataset.k];
    if (v !== undefined) e.innerHTML = v;
  });
}
function setLang(l){
  LANG = l;
  document.querySelectorAll('.lng').forEach(b => b.classList.toggle('on', b.dataset.l === l));
  applyLang();
}
setLang('fr');
```

Pour les placeholders : `data-kph="key"` + boucle correspondante.

### 4.4. Iframe auto-resize (postMessage)

Pour intégrer un mono-page HTML dans une page WP sans scrollbars internes :

**Dans le HTML embarqué :**
```js
(function(){
  if (window.self === window.top) return;  // pas dans une iframe
  function ph(){
    const p = document.querySelector('.page');
    const h = Math.ceil(p ? (p.offsetTop*2 + p.offsetHeight) : document.body.scrollHeight);
    parent.postMessage({dnaiHeight: h}, '*');
  }
  window.addEventListener('load', ph);
  window.addEventListener('resize', ph);
  if ('ResizeObserver' in window) new ResizeObserver(ph).observe(document.body);
  ph();
})();
```

**Dans le shortcode WP :**
```js
window.addEventListener('message', e => {
  if (typeof e.data?.dnaiHeight === 'number')
    iframe.style.height = (e.data.dnaiHeight + 2) + 'px';
});
```

### 4.5. Server-side AI proxy (jamais d'API key côté client)

Pattern stabilisé pour Open WebUI / Azure Databricks / OpenAI :

```php
function dnai_<prod>_chat( WP_REST_Request $req ){
    @set_time_limit(0); @ignore_user_abort(true);
    $base    = rtrim( get_option('dnai_<prod>_base_url'), '/' );
    $path    = get_option('dnai_<prod>_api_path', '/api/chat/completions');
    $key     = get_option('dnai_<prod>_api_key');
    $model   = get_option('dnai_<prod>_model', 'qwen3-coder-30b');
    $payload = $req->get_json_params();
    if ( get_option('dnai_<prod>_json_mode','1') === '1' ) {
        $payload['response_format'] = ['type' => 'json_object'];
    }
    $resp = wp_remote_post( $base . $path, [
        'timeout' => 300,
        'headers' => ['Content-Type' => 'application/json', 'Authorization' => 'Bearer ' . $key],
        'body'    => wp_json_encode($payload),
    ]);
    /* parse + retourner JSON */
}
```

---

## 5. Conventions visuelles & UX

### Layout responsive — breakpoints standards

```css
@media print { /* sans box-shadow, sans margin */ }

/* Tablette & mobile large */
@media (max-width: 680px){
  .grid-2col, .grid-3col { grid-template-columns: 1fr; }
  .kpis-band { grid-template-columns: repeat(2,1fr); }
  .page { padding: 30px 20px; margin: 14px auto; border-radius: 12px; }
}

/* iPhone */
@media (max-width: 520px){
  body { padding: 0; background: #fff; }
  .page { margin: 0; padding: 22px 16px env(safe-area-inset-bottom) 16px;
          box-shadow: none; border-radius: 0; }
  .head { flex-direction: column; align-items: flex-start; gap: 10px; }
  /* … réduire les font-size de 2-4px partout … */
}
```

### Composants stables (à réutiliser)

- **`.page`** : container blanc max-width 880px, box-shadow douce, margin auto
- **`.tldr`** : bloc vert clair avec border-left vert 500, accroche en haut de note
- **`.tag`** : label uppercase letter-spacing pour eyebrow de section
- **`.kpis-band`** : grille 4 colonnes de chiffres clés (1 KPI = 1 grand chiffre serif + 1 sous-libellé Inter caps)
- **`.proj` / `.attn` / `.axis`** : cards de projet / point d'attention / décision (pattern note CEO)
- **`.ask`** : bloc final sur fond `--dark` (#07140c) pour la demande/synthèse, lettres vert clair sur noir
- **`.pill`** : pastille de statut (`.pill.ok` vert, `.pill.warn` amber, `.pill.run` bleu, `.pill.scope` gris)

### Pictos & symboles privilégiés

- `●` pour statut OK / actif
- `◐ ◑` pour cadrage / en cours
- `⚠` pour alerte
- `⏱` pour deadline (mais **éviter** dans les notes CEO — trop agressif)
- `→` pour next-step / transition
- `·` middle-dot pour séparer méta-infos (préférer à `—` quand possible)

---

## 6. Conventions de style éditorial (français)

Ces règles s'appliquent aux notes CEO, executive summaries, copy produit.

- **Pas d'anglicismes inutiles** : « lancement » > « kick-off » ; « preuve de concept » > « POC » ; « mise en service » > « go-live » ; « co-pilote IA » > « AI co-pilot » ; « responsabilité de la donnée » > « ownership data ».
- **Pas de TL;DR** dans une note exec. Préférer « En une phrase : ».
- **Em dashes (—) qui traînent** : à éviter dans le corps de texte. Remplacer par `:` (introduction) ou `;` (séparateur). Les garder uniquement dans les titres stylistiques.
- **Pas de `&`** dans le corps de texte FR : utiliser « et ».
- **Conventions terminologiques** :
  - `task force` (deux mots, lowercase)
  - `Loi 09-08` (référence à la loi marocaine de protection des données)
  - `Nutricrops` (toujours capitalisée, pas « OCP Nutricrops » à chaque mention — alterner)
  - `D²nAI` (avec le ² Unicode, pas `D2nAI`)
- **Pas de deadlines visibles en badges** dans une note CEO — perçu comme un ultimatum. Inclure la temporalité dans la prose si nécessaire (« d'ici la fin du mois »).
- **Espaces insécables `&nbsp;`** avant `:` quand on veut le rendu typographique français propre.

---

## 7. Workflow git & livrables

### Branches

- Toujours travailler sur la **branche dédiée** indiquée par la session (ex. `claude/<feature-name>`).
- **Jamais** push sur `main` sans demande explicite.
- **Toujours** rebase avant push :
  ```bash
  git pull --rebase origin <branch> && git push -u origin <branch>
  ```

### Format de commit

```
<Produit> v<version> — <résumé en une ligne>

<paragraphe explicatif court, en français>

https://claude.ai/code/session_...
```

### Versioning

- Tous les plugins WP versionnés sémantiquement (1.0.0, 1.0.1, 1.1.0).
- Bump dans 3 endroits sync : `Plugin Name` header PHP, `define DNAI_*_VER`, `readme.txt` `Stable tag`.
- Changelog dans `readme.txt`, le dernier en haut.

### Livrables au user

- HTML standalone → `SendUserFile` direct
- Plugin WP → toujours zipper sous `dnai-<produit>-v<version>.zip` puis `SendUserFile`
- Exclure les fichiers cachés à l'archivage : `zip -rq <out>.zip <dir> -x '*/.*'`

---

## 8. Patterns conversationnels (façon de bosser avec moi)

- **Langue** : français par défaut, anglais uniquement si je le demande.
- **Brevity** : réponses courtes et directes, pas de pédagogie inutile. État final > narration du process.
- **Tradeoffs** : quand je demande un choix d'architecture, donne 2-3 options claires avec pour/contre, puis recommande explicitement la tienne.
- **Validation avant maquette** : pour tout livrable destiné au CEO/board, valide le texte en clair (markdown) avant de coder le HTML.
- **Relecture systématique** : sur les livrables exec, fais une passe ortho + anglicismes + em dashes traînants avant de me passer le zip.
- **Actions destructives** : confirme avant `rm`, `git reset --hard`, suppression de zips trackés, etc.
- **Souveraineté & conformité 09-08** : pour tout projet RH/données personnelles, propose d'office l'option on-premise et flag le risque CNDP si le user va vers le cloud.
- **Pas d'over-engineering** : préférer un fichier mono-page qui marche à une archi clean qui retarde la livraison. Le user itère vite.

---

## 9. Catalogue produits (référence rapide)

| Produit | Stack | Public | Statut |
|---|---|---|---|
| **CGM Cockpit** | WP plugin, HTML/JS, IA Claude via Databricks | Pricing & Commerce | En prod (v1.18+) |
| **NutrientOS** | WP plugin, HTML/JS | Board / vision Groupe | Pitch en cours |
| **NutriPlan** | WP plugin, HTML/JS | CEO + trials team | Framework signé v1.0 |
| **Atlas** | WP plugin + Copilot Studio / Databricks | Hamza (assistant perso « second cerveau ») | v0.2.7 |
| **Helios** | Mockup HTML iPhone | DRH (Nadia) | Proto, en attente arbitrage on-prem |
| **NutriCEO / Maestro / Sentinel / Custobot** | Mockups HTML iPhone | CEO / COO / RM / Sales | Proto |
| **Note CEO mensuelle** | WP plugin | CEO | v1.1 (juin 2026) |
| **D²nAI Office** | Agent Windows + WP admin console | équipe interne | Scaffold v0.1 |

---

## 10. Anti-patterns à éviter

- ❌ Build pipelines complexes (webpack, vite, npm install lourd) — on est en HTML mono-fichier.
- ❌ Frameworks JS (React, Vue) pour des mockups ou notes — vanilla suffit, plus rapide à itérer.
- ❌ API keys côté client — toujours via proxy WP REST.
- ❌ `options.php` Settings API derrière AFD — utiliser `admin-post.php`.
- ❌ Push sans rebase — finit toujours en rejected.
- ❌ Charte couleur off-brand (pas de bleu corporate, pas de orange flashy — vert OCP point).
- ❌ Anglicismes gratuits dans le copy FR.
- ❌ TL;DR / kick-off / Go-live dans une note CEO.
- ❌ Mentions Claude / Anthropic / Databricks **visibles dans l'UI utilisateur final** (sauf demande explicite). Le bot s'appelle « D²nAI bot ».
- ❌ Em dashes dans le corps de texte qui n'apportent rien.

---

## 11. Snippet de démarrage rapide — page HTML D²nAI

Squelette à coller pour démarrer un nouveau livrable, déjà à la charte :

```html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#1B5E20">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>... · D²nAI · OCP Nutricrops</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@500;600;700&display=swap" rel="stylesheet">
<style>
:root{--green-900:#103d17;--green-800:#1B5E20;--green-700:#2E7D32;--green-500:#4CAF50;--green-50:#EAF4EC;
      --ink:#10231a;--muted:#5c6b62;--line:#e3ebe5;--dark:#07140c}
*{box-sizing:border-box}
body{margin:0;font-family:'Inter',sans-serif;color:var(--ink);background:#e9eee9;line-height:1.5}
h1,h2,h3,h4{font-family:'Cormorant Garamond',serif}
.page{max-width:880px;margin:26px auto;background:#fff;box-shadow:0 18px 50px -30px rgba(16,35,26,.5);padding:54px 60px}
.brand{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:30px;color:var(--green-800);line-height:1}
.brand sup{font-size:18px;vertical-align:super}
.brand .by{display:block;font-family:'Inter';font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-top:5px}
.tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--green-700)}
.tldr{background:var(--green-50);border-left:4px solid var(--green-500);border-radius:0 10px 10px 0;padding:16px 20px;font-size:14.5px;margin:18px 0 30px}
@media(max-width:680px){.page{padding:30px 20px;margin:14px auto;border-radius:12px}}
@media(max-width:520px){body{padding:0;background:#fff}.page{margin:0;padding:22px 16px env(safe-area-inset-bottom) 16px;box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="page">
  <div class="brand">D<sup>2</sup>nAI<span class="by">Data · Digital &amp; AI · OCP Nutricrops</span></div>
  <span class="tag">● <!-- eyebrow --></span>
  <h1>...</h1>
  <div class="tldr"><b>En une phrase&nbsp;:</b> ...</div>
  <!-- ... -->
</div>
</body>
</html>
```

---

*Pack généré le 9 juin 2026 depuis le repo `koko878/NutriCEO`. À copier dans `CLAUDE.md` du nouveau repo et à ajuster selon le périmètre du nouveau projet.*
