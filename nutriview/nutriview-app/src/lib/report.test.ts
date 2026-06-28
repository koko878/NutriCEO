import { describe, it, expect } from "vitest";
import type { Classification, DataItem, Project } from "./model";
import {
  isSignedDeliverable,
  itemCitations,
  reportSummary,
  reportVerdictKind,
} from "./report";

function item(id: string, name = id): DataItem {
  return {
    id,
    name,
    description: "",
    cycleLifeStates: ["stockage"],
    proposedByAI: false,
    status: "draft",
  };
}

function cls(
  itemId: string,
  levels: { C: number; I: number; D: number },
  classe: Classification["classe"],
  sensible: boolean,
  citations: string[] = []
): Classification {
  return {
    itemId,
    cells: [
      { dim: "C", level: levels.C as 0 | 1 | 2 | 3 | 4, rationale: "", citations: citations.map((s) => ({ section: s })) },
      { dim: "I", level: levels.I as 0 | 1 | 2 | 3 | 4, rationale: "", citations: [] },
      { dim: "D", level: levels.D as 0 | 1 | 2 | 3 | 4, rationale: "", citations: [] },
    ],
    classe,
    sensible: sensible as unknown as boolean,
    verdictCloud: sensible
      ? { eligible: false, reason: "données sensibles loi 05-20 — résidence MA obligatoire" }
      : { eligible: true, conditions: [] },
    suggestedMeasures: [],
    history: [],
  };
}

function project(over: Partial<Project> = {}): Project {
  return {
    id: "PRJ-1",
    title: "Projet test",
    bu: "Mining",
    owner: "Hamza",
    dataOwner: "Owner",
    ingestion: { source: "text", extractedAt: "2026-01-01T00:00:00.000Z" },
    items: [],
    classifications: {},
    status: "drafting",
    ...over,
  };
}

describe("itemCitations", () => {
  it("agrège et déduplique les sections sur les 3 cellules", () => {
    const c = cls("a", { C: 3, I: 1, D: 0 }, "II", true, ["Annexe II §2.1", "Annexe II §2.1"]);
    c.cells[1].citations = [{ section: "Annexe II §3.4" }];
    expect(itemCitations(c)).toEqual(["Annexe II §2.1", "Annexe II §3.4"]);
  });

  it("ignore les sections vides", () => {
    const c = cls("a", { C: 1, I: 1, D: 1 }, "IV", false, ["", "  "]);
    expect(itemCitations(c)).toEqual([]);
  });
});

describe("reportSummary", () => {
  it("compte total/classées/sensibles et la distribution", () => {
    const p = project({
      items: [item("a"), item("b"), item("c")],
      classifications: {
        a: cls("a", { C: 4, I: 0, D: 0 }, "I", true),
        b: cls("b", { C: 1, I: 1, D: 1 }, "IV", false),
      },
    });
    const s = reportSummary(p);
    expect(s.total).toBe(3);
    expect(s.classified).toBe(2);
    expect(s.sensibles).toBe(1);
    expect(s.distribution.I).toBe(1);
    expect(s.distribution.IV).toBe(1);
    expect(s.projectSensible).toBe(true);
  });

  it("classe globale = max niveau atteint toutes données confondues", () => {
    const p = project({
      items: [item("a"), item("b")],
      classifications: {
        a: cls("a", { C: 1, I: 1, D: 1 }, "IV", false), // max niveau 1 → IV
        b: cls("b", { C: 0, I: 3, D: 0 }, "II", false), // max niveau 3 → II
      },
    });
    expect(reportSummary(p).projectClasse).toBe("II");
  });

  it("projet vide → classe V, non sensible", () => {
    const s = reportSummary(project());
    expect(s.classified).toBe(0);
    expect(s.projectClasse).toBe("V");
    expect(s.projectSensible).toBe(false);
  });
});

describe("reportVerdictKind", () => {
  it("none quand rien n'est classé", () => {
    expect(reportVerdictKind(reportSummary(project()))).toBe("none");
  });

  it("sensible dès qu'une donnée est sensible", () => {
    const p = project({
      items: [item("a")],
      classifications: { a: cls("a", { C: 3, I: 0, D: 0 }, "II", true) },
    });
    expect(reportVerdictKind(reportSummary(p))).toBe("sensible");
  });

  it("eligible quand classé sans sensible", () => {
    const p = project({
      items: [item("a")],
      classifications: { a: cls("a", { C: 1, I: 2, D: 0 }, "III", false) },
    });
    expect(reportVerdictKind(reportSummary(p))).toBe("eligible");
  });
});

describe("isSignedDeliverable", () => {
  it("true seulement si status signed + signature présente", () => {
    expect(isSignedDeliverable(project({ status: "signed" }))).toBe(false);
    expect(
      isSignedDeliverable(
        project({
          status: "signed",
          signature: { signedBy: "Owner", signedAt: "x", contentHash: "h" },
        })
      )
    ).toBe(true);
    expect(
      isSignedDeliverable(
        project({
          status: "in_review",
          signature: { signedBy: "Owner", signedAt: "x", contentHash: "h" },
        })
      )
    ).toBe(false);
  });
});
