// Tests du garde-fou citation + du mock IA local (Phase 4).
// Le mock est utilisé en démo standalone ET dans le smoke Playwright.

import { describe, expect, it } from "vitest";
import { aiClassify, aiAvailable, aiSource } from "./ai";

describe("ai (mock standalone)", () => {
  it("aiAvailable() est false sans window.DNAI_NVIEW.aiStatus.configured", () => {
    expect(aiAvailable()).toBe(false);
    expect(aiSource()).toBe("mock-local");
  });

  it("aiClassify retourne 3 cells C/I/D avec citation Annexe II", async () => {
    const r = await aiClassify({
      name: "Mots de passe ServicePrincipal Azure prod",
      description: "Credentials d'accès aux ressources Azure de production.",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.cells).toHaveLength(3);
    const dims = r.data.cells.map((c) => c.dim).sort();
    expect(dims).toEqual(["C", "D", "I"]);
    for (const cell of r.data.cells) {
      expect(cell.citations.length).toBeGreaterThanOrEqual(1);
      expect(cell.citations[0].section).toMatch(/Annexe II/);
    }
  });

  it("le mock note les mots de passe en C élevé (≥ 3)", async () => {
    const r = await aiClassify({
      name: "Mots de passe ServicePrincipal Azure prod",
      description: "secret token",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = r.data.cells.find((x) => x.dim === "C");
    expect(c).toBeDefined();
    expect(c!.level).toBeGreaterThanOrEqual(3);
  });

  it("le mock note les données publiques en C faible (≤ 1)", async () => {
    const r = await aiClassify({
      name: "Bulletin météo public",
      description: "Données météo destinées à la communication externe.",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = r.data.cells.find((x) => x.dim === "C");
    expect(c).toBeDefined();
    expect(c!.level).toBeLessThanOrEqual(1);
  });
});

describe("ai · garde-fou citation (défense en profondeur)", () => {
  it("le mock n'émet jamais une cellule sans citation", async () => {
    const r = await aiClassify({
      name: "Données opaques imaginaires",
      description: "Description sans mots-clés discriminants.",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const cell of r.data.cells) {
      // Citation présente ET non rejetée (mock force toujours une citation).
      expect(cell.citations[0]?.section).toBeTruthy();
      expect(cell.rejected).toBeFalsy();
      expect(cell.level).toBeGreaterThanOrEqual(0);
    }
  });
});
