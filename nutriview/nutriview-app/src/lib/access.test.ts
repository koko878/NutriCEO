import { describe, expect, it } from "vitest";
import {
  capsForRoles,
  hasAnyAdmin,
  normalizeAssignments,
  primaryRoleLabel,
  roleCan,
  rolesForUser,
  userCan,
  type RoleAssignment,
} from "./access";

describe("access.capsForRoles", () => {
  it("admin a toutes les caps dont manage", () => {
    const caps = capsForRoles(["admin"]);
    expect(caps.has("manage")).toBe(true);
    expect(caps.has("sign")).toBe(true);
    expect(caps.has("create_project")).toBe(true);
  });
  it("pm peut créer/classifier mais pas signer ni administrer", () => {
    const caps = capsForRoles(["pm"]);
    expect(caps.has("create_project")).toBe(true);
    expect(caps.has("classify")).toBe(true);
    expect(caps.has("sign")).toBe(false);
    expect(caps.has("manage")).toBe(false);
  });
  it("owner peut valider/signer mais pas créer de projet", () => {
    const caps = capsForRoles(["owner"]);
    expect(caps.has("validate")).toBe(true);
    expect(caps.has("sign")).toBe(true);
    expect(caps.has("create_project")).toBe(false);
  });
  it("reader ne peut que lire", () => {
    const caps = capsForRoles(["reader"]);
    expect([...caps]).toEqual(["read"]);
  });
  it("union de rôles cumule les caps", () => {
    const caps = capsForRoles(["pm", "owner"]);
    expect(caps.has("create_project")).toBe(true);
    expect(caps.has("sign")).toBe(true);
    expect(caps.has("manage")).toBe(false);
  });
});

describe("access.bootstrap first-run", () => {
  it("sans aucun admin défini, un inconnu est admin (bootstrap)", () => {
    const roles = rolesForUser([], "nimporte");
    expect(roles).toEqual(["admin"]);
  });
  it("dès qu'un admin existe, un inconnu retombe sur reader", () => {
    const a: RoleAssignment[] = [{ login: "boss", roles: ["admin"] }];
    expect(rolesForUser(a, "inconnu")).toEqual(["reader"]);
  });
  it("un user assigné garde ses rôles explicites", () => {
    const a: RoleAssignment[] = [
      { login: "boss", roles: ["admin"] },
      { login: "alice", roles: ["pm"] },
    ];
    expect(rolesForUser(a, "alice")).toEqual(["pm"]);
  });
  it("matching login insensible à la casse / espaces", () => {
    const a: RoleAssignment[] = [{ login: "Alice ", roles: ["owner"] }];
    expect(rolesForUser(a, "  alice")).toEqual(["owner"]);
  });
});

describe("access.hasAnyAdmin", () => {
  it("false si aucun admin", () => {
    expect(hasAnyAdmin([{ login: "x", roles: ["pm"] }])).toBe(false);
  });
  it("true si un admin", () => {
    expect(hasAnyAdmin([{ login: "x", roles: ["pm", "admin"] }])).toBe(true);
  });
});

describe("access.userCan / roleCan", () => {
  it("userCan compose résolution + cap", () => {
    const a: RoleAssignment[] = [
      { login: "boss", roles: ["admin"] },
      { login: "bob", roles: ["owner"] },
    ];
    expect(userCan(a, "bob", "sign")).toBe(true);
    expect(userCan(a, "bob", "create_project")).toBe(false);
    expect(userCan(a, "boss", "manage")).toBe(true);
  });
  it("roleCan direct", () => {
    expect(roleCan(["reader"], "read")).toBe(true);
    expect(roleCan(["reader"], "manage")).toBe(false);
  });
});

describe("access.primaryRoleLabel", () => {
  it("retourne le rôle le plus puissant", () => {
    expect(primaryRoleLabel(["reader", "owner", "pm"])).toBe("Chef de projet");
    expect(primaryRoleLabel(["reader", "admin"])).toBe("Administrateur");
    expect(primaryRoleLabel([])).toBe("Lecteur");
  });
});

describe("access.normalizeAssignments", () => {
  it("filtre les entrées invalides et les rôles inconnus", () => {
    const out = normalizeAssignments([
      { login: "a", roles: ["pm", "wizard"] },
      { login: "", roles: ["admin"] },
      { roles: ["owner"] },
      null,
      "garbage",
      { login: "b", name: "Bob", roles: ["owner", "reader"] },
    ]);
    expect(out).toEqual([
      { login: "a", name: undefined, roles: ["pm"] },
      { login: "b", name: "Bob", roles: ["owner", "reader"] },
    ]);
  });
  it("retourne [] sur entrée non-array", () => {
    expect(normalizeAssignments("nope")).toEqual([]);
    expect(normalizeAssignments(null)).toEqual([]);
  });
});
