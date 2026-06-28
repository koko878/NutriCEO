// E2E NutriView Connect : prouve l'extraction du modèle de données depuis
// des apps AUTHENTIFIÉES (Salesforce OAuth, OpenAPI Bearer, GraphQL Bearer).
import { execFileSync } from "node:child_process";
const B = "http://127.0.0.1:9975";
const run = (args) => JSON.parse(execFileSync("node", ["nview-connect.mjs", ...args], { encoding: "utf8" }));
const fail = (args) => {
  try { execFileSync("node", ["nview-connect.mjs", ...args], { encoding: "utf8", stdio: "pipe" }); return false; }
  catch { return true; }
};

const out = {};
const sf = run(["--connector", "salesforce", "--instance", B, "--client-id", "x", "--client-secret", "y", "--username", "u", "--password", "p"]);
out.salesforce = sf.objects.map((o) => o.name);
const oa = run(["--connector", "openapi", "--url", `${B}/secure/openapi.json`, "--token", "APITOKEN"]);
out.openapi = oa.objects.map((o) => o.name);
const gq = run(["--connector", "graphql", "--url", `${B}/graphql`, "--token", "APITOKEN"]);
out.graphql = gq.objects.map((o) => o.name);
out.openapiNoToken401 = fail(["--connector", "openapi", "--url", `${B}/secure/openapi.json`]);

out.ok =
  ["Account.Name", "Account.AnnualRevenue", "Contact.Email"].every((f) => out.salesforce.includes(f)) &&
  out.openapi.includes("Facture.montantTTC") &&
  out.graphql.includes("Patient.dossierMedical") &&
  out.openapiNoToken401 === true;

console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 2);
