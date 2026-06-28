// E2E crawler authentifié : prouve « entrer dans une app SSO, explorer,
// récupérer les objets-donnée ». Lance crawl.mjs en sous-process.
import { execFileSync } from "node:child_process";
const APP = "http://127.0.0.1:9973/app";
const LOGIN = "http://127.0.0.1:9973/login";
const run = (args) =>
  JSON.parse(execFileSync("node", ["crawl.mjs", ...args], { encoding: "utf8", cwd: process.cwd() }));

const out = {};
// 1) Sans auth : le mur de login bloque → 0 objet (cas du scan passif actuel).
const noauth = run(["--url", APP, "--auth", "none"]);
out.noAuth = { endpoints: noauth.endpoints.length, objects: noauth.objects.length };

// 2) Avec login : entre dans l'app, capture l'XHR authentifié, extrait les champs.
const authed = run(["--url", APP, "--auth", "form", "--login", LOGIN, "--user", "demo", "--pass", "demo"]);
const names = authed.objects.map((o) => o.name);
out.authed = {
  endpoints: authed.endpoints,
  apiObjects: authed.objects.filter((o) => o.source.startsWith("api:")).map((o) => o.name),
  names,
};

out.ok =
  out.noAuth.objects === 0 &&                                  // sans auth : rien
  authed.endpoints.some((e) => e.includes("/api/employes")) && // a atteint l'API protégée
  ["matricule", "nomComplet", "numeroSecu", "salaireBrut", "rib"].every((f) => names.includes(f));

console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 2);
