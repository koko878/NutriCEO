import { describe, expect, it } from "vitest";
import {
  busOfEntity,
  normalizeRefs,
  ownerOfDomain,
  resolveDomainByName,
  seedRefs,
  suggestDomainId,
  type Refs,
} from "./refs";

describe("refs.seedRefs", () => {
  it("produit des référentiels cohérents et non vides", () => {
    const r = seedRefs();
    expect(r.entities.length).toBeGreaterThan(0);
    expect(r.businessUnits.length).toBeGreaterThan(0);
    expect(r.dataDomains.length).toBeGreaterThan(0);
    expect(r.dataDomainOwners.length).toBeGreaterThan(0);
  });
  it("chaque data domain pointe vers un owner existant", () => {
    const r = seedRefs();
    for (const d of r.dataDomains) {
      const owner = r.dataDomainOwners.find((o) => o.id === d.ownerId);
      expect(owner, `domain ${d.name} doit avoir un owner`).toBeDefined();
    }
  });
});

describe("refs.ownerOfDomain", () => {
  it("résout l'owner d'un domaine", () => {
    const r = seedRefs();
    const dom = r.dataDomains.find((d) => d.name === "RH & Paie")!;
    const owner = ownerOfDomain(r, dom.id);
    expect(owner?.name).toBe("HR Data Owner");
  });
  it("undefined si domaine inconnu", () => {
    expect(ownerOfDomain(seedRefs(), "nope")).toBeUndefined();
  });
});

describe("refs.busOfEntity", () => {
  it("filtre les BU par entité", () => {
    const r = seedRefs();
    const ent = r.entities.find((e) => e.code === "NCR")!;
    const bus = busOfEntity(r, ent.id);
    expect(bus.length).toBeGreaterThan(0);
    expect(bus.every((b) => b.entityId === ent.id)).toBe(true);
  });
  it("toutes les BU actives si entité non précisée", () => {
    const r = seedRefs();
    expect(busOfEntity(r).length).toBe(r.businessUnits.filter((b) => b.active).length);
  });
});

describe("refs.resolveDomainByName", () => {
  it("résout par nom insensible à la casse/espaces", () => {
    const r = seedRefs();
    expect(resolveDomainByName(r, "  rh & paie ")?.name).toBe("RH & Paie");
    expect(resolveDomainByName(r, "FINANCE & COMPTABILITÉ")?.name).toBe(
      "Finance & Comptabilité"
    );
  });
  it("undefined si nom inconnu ou vide", () => {
    const r = seedRefs();
    expect(resolveDomainByName(r, "inexistant")).toBeUndefined();
    expect(resolveDomainByName(r, "")).toBeUndefined();
    expect(resolveDomainByName(r, undefined)).toBeUndefined();
  });
});

describe("refs.suggestDomainId", () => {
  it("rattache une donnée RH au domaine RH & Paie", () => {
    const r = seedRefs();
    const dom = r.dataDomains.find((d) => d.name === "RH & Paie")!;
    expect(suggestDomainId(r, "Bulletins de paie des employés")).toBe(dom.id);
  });
  it("rattache une donnée finance au domaine Finance", () => {
    const r = seedRefs();
    const dom = r.dataDomains.find((d) => d.name === "Finance & Comptabilité")!;
    expect(suggestDomainId(r, "Grand livre comptable et finance")).toBe(dom.id);
  });
  it("ignore les mots génériques (données/data) pour ne pas tout capter", () => {
    const r = seedRefs();
    // « données » seul ne doit pas matcher « Données analytiques & IA »
    expect(suggestDomainId(r, "Données diverses")).toBeUndefined();
  });
  it("undefined si aucun recoupement", () => {
    expect(suggestDomainId(seedRefs(), "xyz qqq")).toBeUndefined();
    expect(suggestDomainId(seedRefs(), "")).toBeUndefined();
  });
});

describe("refs.normalizeRefs", () => {
  it("seed si entrée vide ou invalide", () => {
    expect(normalizeRefs(null).entities.length).toBeGreaterThan(0);
    expect(normalizeRefs({}).entities.length).toBeGreaterThan(0);
  });
  it("préserve des référentiels valides non vides", () => {
    const custom: Refs = {
      entities: [{ id: "e", name: "Solo", active: true }],
      businessUnits: [],
      dataDomains: [],
      dataDomainOwners: [],
    };
    const out = normalizeRefs(custom);
    expect(out.entities).toEqual([{ id: "e", name: "Solo", active: true }]);
    expect(out.businessUnits).toEqual([]);
  });
});
