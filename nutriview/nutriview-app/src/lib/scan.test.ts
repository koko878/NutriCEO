import { describe, it, expect, afterEach } from "vitest";
import { isValidHttpUrl, scanBackendAvailable, scanUrl } from "./scan";

// Le module lit window.DNAI_NVIEW ; en environnement node on shim window.
const g = globalThis as { window?: { DNAI_NVIEW?: unknown } };
function setBoot(boot?: Record<string, unknown>) {
  g.window = boot ? { DNAI_NVIEW: boot } : {};
}

afterEach(() => {
  delete g.window;
});

describe("scan.isValidHttpUrl", () => {
  it("accepte http/https, refuse le reste", () => {
    expect(isValidHttpUrl("https://app.nutricrops.com")).toBe(true);
    expect(isValidHttpUrl("http://10.0.0.4:8080/dash")).toBe(true);
    expect(isValidHttpUrl("ftp://x")).toBe(false);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpUrl("pas une url")).toBe(false);
    expect(isValidHttpUrl("")).toBe(false);
  });
});

describe("scan.scanBackendAvailable", () => {
  it("false sans restNs/nonce", () => {
    expect(scanBackendAvailable()).toBe(false);
    setBoot({ restNs: "dnai/nview/v1" });
    expect(scanBackendAvailable()).toBe(false); // nonce manquant
    setBoot({ restNs: "dnai/nview/v1", nonce: "abc" });
    expect(scanBackendAvailable()).toBe(true);
  });
});

describe("scan.scanUrl (garde-fous)", () => {
  it("rejette une URL invalide sans appel réseau", async () => {
    const r = await scanUrl("pas-une-url");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/URL invalide/);
  });

  it("indique que le backend est requis en standalone", async () => {
    const r = await scanUrl("https://app.demo");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/backend WordPress/);
  });
});
