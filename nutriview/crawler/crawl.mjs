// =====================================================================
// NutriView crawler — agent souverain qui ENTRE dans une app (authentifiée),
// l'explore, et récupère les objets-donnée à cataloguer.
//
// Principe : la donnée réelle d'une SPA vit dans ses réponses XHR/API (JSON),
// pas dans les pixels. Le crawler s'authentifie, navigue, et CAPTURE LE RÉSEAU
// (réponses JSON) + les libellés du DOM rendu. Il en déduit les objets-donnée.
//
// Auth (sans automatiser un login MFA, fragile et risqué) :
//   --auth storageState --state <fichier.json>   ← RECOMMANDÉ pour SSO/Entra :
//        on se connecte UNE fois à la main, on sauvegarde la session
//        (playwright codegen / storageState), le crawler la rejoue.
//   --auth form --login <url> --user <id> --pass <pwd>   ← apps simples non-SSO.
//   --auth none                                          ← app publique.
//
// Sortie : JSON { url, objects:[{name,source,sample}], endpoints:[...] }
// directement ingérable par NutriView (extractFromJson / pipeline catalogue).
// =====================================================================
import { chromium } from "playwright";

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const APP_URL = arg("url");
const AUTH = arg("auth", "none");
const MAX_PAGES = parseInt(arg("max-pages", "6"), 10);
if (!APP_URL) {
  console.error("usage: crawl.mjs --url <appUrl> [--auth none|form|storageState] …");
  process.exit(1);
}

// --- Extraction des objets-donnée depuis un corps JSON capturé. ---
function objectsFromJson(body, srcUrl, out, seen) {
  let obj;
  try { obj = typeof body === "string" ? JSON.parse(body) : body; } catch { return; }
  if (!obj || typeof obj !== "object") return;
  const add = (name, sample) => {
    const n = String(name || "").trim();
    if (!n || seen.has("api:" + n.toLowerCase())) return;
    seen.add("api:" + n.toLowerCase());
    out.push({ name: n, source: "api:" + srcUrl, sample: sample === undefined ? "" : String(sample).slice(0, 40) });
  };
  // OpenAPI / JSON Schema
  const schemas = obj.components?.schemas || obj.definitions;
  if (schemas && typeof schemas === "object") {
    for (const [s, sc] of Object.entries(schemas)) {
      const props = sc?.properties;
      if (props) for (const p of Object.keys(props)) add(`${s}.${p}`);
      else add(s);
    }
    return;
  }
  if (obj.properties && typeof obj.properties === "object") {
    for (const p of Object.keys(obj.properties)) add(p);
    return;
  }
  // Réponse de données : tableau d'objets, ou {data:[...]}, ou objet simple.
  const sample = Array.isArray(obj)
    ? obj.find((x) => x && typeof x === "object")
    : Array.isArray(obj.data)
      ? obj.data.find((x) => x && typeof x === "object")
      : obj;
  if (sample && typeof sample === "object") {
    for (const [k, v] of Object.entries(sample)) add(k, Array.isArray(v) ? "[…]" : v);
  }
}

const objects = [];
const seen = new Set();
const endpoints = [];

const browser = await chromium.launch({ headless: true });
const ctxOpts = { ignoreHTTPSErrors: true };
if (AUTH === "storageState") ctxOpts.storageState = arg("state");
const context = await browser.newContext(ctxOpts);
const page = await context.newPage();

// Capture TOUTES les réponses JSON (c'est là qu'est la donnée réelle).
page.on("response", async (resp) => {
  try {
    const ct = (resp.headers()["content-type"] || "").toLowerCase();
    if (!ct.includes("json")) return;
    const u = resp.url();
    if (!endpoints.includes(u)) endpoints.push(u);
    const body = await resp.text();
    objectsFromJson(body, u, objects, seen);
  } catch { /* ignore */ }
});

// --- Authentification ---
if (AUTH === "form") {
  const loginUrl = arg("login", APP_URL);
  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
  await page.fill(arg("user-selector", "#username"), arg("user", ""));
  await page.fill(arg("pass-selector", "#password"), arg("pass", ""));
  await Promise.all([
    page.waitForLoadState("networkidle").catch(() => {}),
    page.click(arg("submit-selector", "#submit")),
  ]);
}

// --- Exploration : page d'entrée + quelques liens internes (même origine). ---
const origin = new URL(APP_URL).origin;
const visited = new Set();
const queue = [APP_URL];
while (queue.length && visited.size < MAX_PAGES) {
  const next = queue.shift();
  if (visited.has(next)) continue;
  visited.add(next);
  try {
    await page.goto(next, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(600); // laisse les XHR se déclencher

    // Libellés du DOM rendu (fallback / complément aux API).
    const labels = await page.evaluate(() => {
      const set = new Set();
      document.querySelectorAll("label, th, [aria-label]").forEach((el) => {
        const t = (el.getAttribute("aria-label") || el.textContent || "").trim();
        if (t && t.length >= 3 && t.length <= 60) set.add(t);
      });
      return [...set];
    });
    for (const t of labels) {
      const key = "dom:" + t.toLowerCase();
      if (!seen.has(key)) { seen.add(key); objects.push({ name: t, source: "dom:" + next, sample: "" }); }
    }

    // Découverte de liens internes pour explorer d'autres écrans.
    const links = await page.evaluate(() =>
      [...document.querySelectorAll("a[href]")].map((a) => a.href)
    );
    for (const l of links) {
      try { if (new URL(l).origin === origin && !visited.has(l) && queue.length < MAX_PAGES) queue.push(l); } catch { /* */ }
    }
  } catch { /* page inaccessible, on continue */ }
}

await browser.close();
console.log(JSON.stringify({ url: APP_URL, authMode: AUTH, pages: [...visited], endpoints, objects }, null, 2));
