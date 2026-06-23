import { describe, expect, it } from "vitest";
import {
  inboxBadgeCount,
  mySigned,
  mySubmitted,
  pendingForOwner,
} from "./inbox";
import type { Project } from "./model";

function mk(over: Partial<Project>): Project {
  return {
    id: "p",
    title: "t",
    owner: "alice",
    dataOwner: "bob",
    ingestion: { source: "text", extractedAt: "2026-06-23T00:00:00Z" },
    items: [],
    classifications: {},
    status: "drafting",
    ...over,
  };
}

describe("inbox.pendingForOwner", () => {
  it("retourne uniquement in_review pour le bon dataOwner", () => {
    const ps = [
      mk({ id: "1", status: "in_review", dataOwner: "Bob" }),
      mk({ id: "2", status: "in_review", dataOwner: "Carol" }),
      mk({ id: "3", status: "drafting", dataOwner: "Bob" }),
      mk({ id: "4", status: "signed", dataOwner: "Bob" }),
    ];
    const r = pendingForOwner(ps, "bob");
    expect(r.map((p) => p.id)).toEqual(["1"]);
  });

  it("tri par submittedAt desc", () => {
    const ps = [
      mk({
        id: "old",
        status: "in_review",
        dataOwner: "bob",
        submission: { submittedAt: "2026-01-01T00:00:00Z", submittedBy: "x" },
      }),
      mk({
        id: "new",
        status: "in_review",
        dataOwner: "bob",
        submission: { submittedAt: "2026-06-01T00:00:00Z", submittedBy: "x" },
      }),
    ];
    expect(pendingForOwner(ps, "bob").map((p) => p.id)).toEqual(["new", "old"]);
  });

  it("vide si user vide", () => {
    expect(
      pendingForOwner([mk({ status: "in_review", dataOwner: "bob" })], "")
    ).toEqual([]);
  });
});

describe("inbox.mySubmitted", () => {
  it("retourne in_review dont je suis owner", () => {
    const ps = [
      mk({ id: "1", status: "in_review", owner: "alice" }),
      mk({ id: "2", status: "drafting", owner: "alice" }),
    ];
    expect(mySubmitted(ps, "alice").map((p) => p.id)).toEqual(["1"]);
  });
});

describe("inbox.mySigned", () => {
  it("retourne signed avec implication user", () => {
    const ps = [
      mk({
        id: "by-me",
        status: "signed",
        signature: { signedBy: "bob", signedAt: "x", contentHash: "h" },
      }),
      mk({
        id: "owned",
        status: "signed",
        owner: "bob",
        dataOwner: "carol",
        signature: { signedBy: "carol", signedAt: "x", contentHash: "h" },
      }),
      mk({ id: "other", status: "signed", owner: "x", dataOwner: "y" }),
    ];
    const ids = mySigned(ps, "bob")
      .map((p) => p.id)
      .sort();
    expect(ids).toEqual(["by-me", "owned"]);
  });
});

describe("inbox.inboxBadgeCount", () => {
  it("retourne le nombre de pendants", () => {
    const ps = [
      mk({ status: "in_review", dataOwner: "bob" }),
      mk({ status: "in_review", dataOwner: "bob" }),
      mk({ status: "drafting", dataOwner: "bob" }),
    ];
    expect(inboxBadgeCount(ps, "bob")).toBe(2);
  });
});
