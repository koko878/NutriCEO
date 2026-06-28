// =====================================================================
// NutriView Connect — extrait le MODÈLE DE DONNÉES de n'importe quelle app,
// y compris authentifiée. Stratégie « API-first » : on lit le contrat de
// données exposé par l'app (bien plus fiable que scraper des écrans).
//
// Connecteurs (chacun gère son auth, sort le MÊME contrat NutriView) :
//   salesforce  — OAuth2 + API describe (sobjects → champs)
//   openapi     — GET d'un OpenAPI/Swagger JSON (avec Bearer optionnel)
//   graphql     — introspection du schéma (POST + Bearer optionnel)
//   browser     — fallback SPA sans API (Playwright + session) → voir crawl.mjs
//
// Sortie commune : { source, objects:[{name,source,sample}] }
// → ingérable tel quel par NutriView (Ingestion → .json).
//
// Node 18+ (fetch global). Aucun secret n'est journalisé ; passer les tokens
// par variables d'environnement, pas en clair.
// =====================================================================

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

// --- Helpers communs : un champ JSON/objet → objets-donnée candidats. ---
function pushField(out, seen, name, sample) {
  const n = String(name || "").trim();
  if (!n) return;
  const key = n.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ name: n, sample: sample == null ? "" : String(sample).slice(0, 48) });
}

// ---------------------------------------------------------------------------
// Connecteur Salesforce — OAuth2 (password ou token) + API describe.
// ---------------------------------------------------------------------------
async function salesforce() {
  const instance = arg("instance"); // ex https://mondomaine.my.salesforce.com
  const version = arg("api-version", "v59.0");
  if (!instance) throw new Error("salesforce: --instance requis");

  // 1) Auth : token fourni, ou flow OAuth password (utilisateur d'intégration).
  let token = arg("token", process.env.SF_TOKEN || "");
  let apiBase = instance;
  if (!token) {
    const body = new URLSearchParams({
      grant_type: "password",
      client_id: arg("client-id", process.env.SF_CLIENT_ID || ""),
      client_secret: arg("client-secret", process.env.SF_CLIENT_SECRET || ""),
      username: arg("username", process.env.SF_USER || ""),
      password: arg("password", process.env.SF_PASS || ""),
    });
    const r = await fetch(`${instance}/services/oauth2/token`, { method: "POST", body });
    if (!r.ok) throw new Error(`salesforce oauth: HTTP ${r.status}`);
    const j = await r.json();
    token = j.access_token;
    if (j.instance_url) apiBase = j.instance_url;
  }
  const auth = { Authorization: `Bearer ${token}` };

  // 2) Liste des sobjects (objets métier).
  const listR = await fetch(`${apiBase}/services/data/${version}/sobjects/`, { headers: auth });
  if (!listR.ok) throw new Error(`salesforce sobjects: HTTP ${listR.status}`);
  const list = await listR.json();
  let names = (list.sobjects || []).map((s) => s.name).filter(Boolean);

  // Filtre optionnel + plafond (un org SF a des centaines d'objets).
  const only = arg("objects", ""); // "Account,Contact"
  if (only) {
    const want = new Set(only.split(",").map((s) => s.trim().toLowerCase()));
    names = names.filter((n) => want.has(n.toLowerCase()));
  }
  const max = parseInt(arg("max-objects", "50"), 10);
  names = names.slice(0, max);

  // 3) describe de chaque objet → champs.
  const out = [];
  const seen = new Set();
  const endpoints = [];
  for (const name of names) {
    const url = `${apiBase}/services/data/${version}/sobjects/${name}/describe`;
    const dr = await fetch(url, { headers: auth });
    if (!dr.ok) continue;
    endpoints.push(url);
    const d = await dr.json();
    for (const f of d.fields || []) {
      pushField(out, seen, `${name}.${f.name}`, `${f.label || ""}${f.type ? " · " + f.type : ""}`);
    }
  }
  return { source: "salesforce", instance, endpoints, objects: out.map((o) => ({ ...o, source: "salesforce" })) };
}

// ---------------------------------------------------------------------------
// Connecteur OpenAPI / Swagger — GET du document (Bearer optionnel).
// ---------------------------------------------------------------------------
async function openapi() {
  const url = arg("url");
  if (!url) throw new Error("openapi: --url requis");
  const token = arg("token", process.env.API_TOKEN || "");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`openapi: HTTP ${r.status}`);
  const spec = await r.json();
  const out = [];
  const seen = new Set();
  const schemas = spec.components?.schemas || spec.definitions || {};
  for (const [s, sc] of Object.entries(schemas)) {
    const props = sc?.properties;
    if (props) for (const [p, pd] of Object.entries(props)) {
      pushField(out, seen, `${s}.${p}`, [pd?.description, pd?.type].filter(Boolean).join(" · "));
    } else pushField(out, seen, s, sc?.description || "");
  }
  return { source: "openapi", url, objects: out.map((o) => ({ ...o, source: "openapi:" + url })) };
}

// ---------------------------------------------------------------------------
// Connecteur GraphQL — introspection du schéma (Bearer optionnel).
// ---------------------------------------------------------------------------
async function graphql() {
  const url = arg("url");
  if (!url) throw new Error("graphql: --url requis");
  const token = arg("token", process.env.API_TOKEN || "");
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const query = `{ __schema { types { kind name fields { name } } } }`;
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query }) });
  if (!r.ok) throw new Error(`graphql: HTTP ${r.status}`);
  const j = await r.json();
  const types = j.data?.__schema?.types || [];
  const out = [];
  const seen = new Set();
  for (const t of types) {
    if (!t.name || t.name.startsWith("__") || t.kind !== "OBJECT") continue;
    if (["Query", "Mutation", "Subscription"].includes(t.name)) continue;
    for (const f of t.fields || []) pushField(out, seen, `${t.name}.${f.name}`, t.name);
  }
  return { source: "graphql", url, objects: out.map((o) => ({ ...o, source: "graphql:" + url })) };
}

const CONNECTORS = { salesforce, openapi, graphql };

const which = arg("connector");
if (!which || !CONNECTORS[which]) {
  console.error("usage: nview-connect.mjs --connector salesforce|openapi|graphql …");
  console.error("(pour une SPA sans API : utiliser crawl.mjs — connecteur browser)");
  process.exit(1);
}
try {
  const result = await CONNECTORS[which]();
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error("ERREUR:", e.message);
  process.exit(2);
}
