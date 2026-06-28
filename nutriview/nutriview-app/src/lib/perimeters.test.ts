import { describe, it, expect } from "vitest";
import type { Classification, DataItem, Project } from "./model";
import { seedRefs } from "./refs";
import {
  allPerimetersSigned,
  buildPerimeters,
  effectivePerimeters,
  hasPendingPerimeterForUser,
  ownerMatchesUser,
  perimeterItemsValidated,
  perimeterProgress,
  perimetersForUser,
} from "./perimeters";

function item(id: string, dataDomainId?: string): DataItem {
  return {
    id,
    name: id,
    description: "",
    cycleLifeStates: ["stockage"],
    proposedByAI: false,
    status: "draft",
    dataDomainId,
  };
}

function cls(itemId: string): Classification {
  return {
    itemId,
    cells: [
      { dim: "C", level: 1, rationale: "", citations: [] },
      { dim: "I", level: 1, rationale: "", citations: [] },
      { dim: "D", level: 1, rationale: "", citations: [] },
    ],
    classe: "IV",
    sensible: false,
    verdictCloud: { eligible: true, conditions: [] },
    suggestedMeasures: [],
    history: [],
  };
}

function project(over: Partial<Project> = {}): Project {
  return {
    id: "PRJ-1",
    title: "Test",
    owner: "PM",
    dataOwner: "Général",
    ingestion: { source: "text", extractedAt: "2026-01-01T00:00:00.000Z" },
    items: [],
    classifications: {},
    status: "drafting",
    ...over,
  };
}

describe("buildPerimeters", () => {
  it("groupe les données par data domain owner", () => {
    const refs = seedRefs();
    const hr = refs.dataDomains.find((d) => d.name === "RH & Paie")!;
    const fin = refs.dataDomains.find((d) => d.name === "Finance & Comptabilité")!;
    const p = project({
      items: [item("a", hr.id), item("b", hr.id), item("c", fin.id)],
    });
    const per = buildPerimeters(p, refs);
    expect(per.length).toBe(2);
    const hrPer = per.find((x) => x.domainIds.includes(hr.id))!;
    expect(hrPer.itemIds.sort()).toEqual(["a", "b"]);
    expect(hrPer.ownerName).toBe("HR Data Owner");
    const finPer = per.find((x) => x.domainIds.includes(fin.id))!;
    expect(finPer.itemIds).toEqual(["c"]);
  });

  it("données sans domaine → périmètre du propriétaire général", () => {
    const p = project({ dataOwner: "Nadia", items: [item("a"), item("b")] });
    const per = buildPerimeters(p, seedRefs());
    expect(per.length).toBe(1);
    expect(per[0].ownerName).toBe("Nadia");
    expect(per[0].itemIds.sort()).toEqual(["a", "b"]);
    expect(per[0].domainIds).toEqual([]);
  });

  it("mélange domaine résolu + fallback", () => {
    const refs = seedRefs();
    const hr = refs.dataDomains.find((d) => d.name === "RH & Paie")!;
    const p = project({
      dataOwner: "Général",
      items: [item("a", hr.id), item("b") /* transverse */],
    });
    const per = buildPerimeters(p, refs);
    expect(per.length).toBe(2);
  });
});

describe("ownerMatchesUser", () => {
  it("matche par login ou nom, insensible casse", () => {
    const refs = seedRefs();
    const hr = refs.dataDomains.find((d) => d.name === "RH & Paie")!;
    const per = buildPerimeters(project({ items: [item("a", hr.id)] }), refs);
    expect(ownerMatchesUser(per[0], "hr.owner")).toBe(true);
    expect(ownerMatchesUser(per[0], "HR Data Owner")).toBe(true);
    expect(ownerMatchesUser(per[0], "someone")).toBe(false);
    expect(ownerMatchesUser(per[0], "")).toBe(false);
  });
});

describe("effectivePerimeters (rétro-compat)", () => {
  it("reconstruit un périmètre unique pour un vieux projet sans perimeters", () => {
    const p = project({ dataOwner: "Nadia", items: [item("a"), item("b")] });
    const per = effectivePerimeters(p);
    expect(per.length).toBe(1);
    expect(per[0].ownerName).toBe("Nadia");
    expect(per[0].status).toBe("pending");
  });
  it("projet signé → périmètre reconstruit signed", () => {
    const p = project({ status: "signed", items: [item("a")] });
    expect(effectivePerimeters(p)[0].status).toBe("signed");
  });
});

describe("validation par périmètre", () => {
  const refs = seedRefs();
  const hr = refs.dataDomains.find((d) => d.name === "RH & Paie")!;
  const fin = refs.dataDomains.find((d) => d.name === "Finance & Comptabilité")!;

  function reviewProject(): Project {
    const p = project({
      status: "in_review",
      items: [item("a", hr.id), item("b", fin.id)],
      classifications: { a: cls("a"), b: cls("b") },
    });
    p.perimeters = buildPerimeters(p, refs);
    return p;
  }

  it("perimetersForUser ne renvoie que mes périmètres", () => {
    const p = reviewProject();
    expect(perimetersForUser(p, "hr.owner").length).toBe(1);
    expect(perimetersForUser(p, "hr.owner")[0].domainIds).toContain(hr.id);
    expect(perimetersForUser(p, "inconnu").length).toBe(0);
  });

  it("hasPendingPerimeterForUser true tant que non signé", () => {
    const p = reviewProject();
    expect(hasPendingPerimeterForUser(p, "hr.owner")).toBe(true);
    expect(hasPendingPerimeterForUser(p, "fin.owner")).toBe(true);
    expect(hasPendingPerimeterForUser(p, "inconnu")).toBe(false);
  });

  it("perimeterItemsValidated dépend de la validation ligne par ligne", () => {
    const p = reviewProject();
    const hrPer = p.perimeters!.find((x) => x.domainIds.includes(hr.id))!;
    expect(perimeterItemsValidated(p, hrPer)).toBe(false);
    p.items = p.items.map((it) =>
      it.id === "a"
        ? { ...it, validation: { validatedAt: "x", validatedBy: "hr.owner" } }
        : it
    );
    expect(perimeterItemsValidated(p, hrPer)).toBe(true);
  });

  it("allPerimetersSigned / progress reflètent l'avancement", () => {
    const p = reviewProject();
    expect(allPerimetersSigned(p)).toBe(false);
    expect(perimeterProgress(p)).toEqual({ signed: 0, total: 2 });
    p.perimeters = p.perimeters!.map((x) =>
      x.domainIds.includes(hr.id) ? { ...x, status: "signed" as const } : x
    );
    expect(perimeterProgress(p)).toEqual({ signed: 1, total: 2 });
    expect(allPerimetersSigned(p)).toBe(false);
    p.perimeters = p.perimeters!.map((x) => ({ ...x, status: "signed" as const }));
    expect(allPerimetersSigned(p)).toBe(true);
    void fin;
  });
});
