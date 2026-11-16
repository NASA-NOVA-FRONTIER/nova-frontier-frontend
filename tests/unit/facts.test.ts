import { describe, expect, it } from "vitest";

import { getFacts } from "@/content/facts";

// Our own measured crops; every other image was made by someone else.
const OURS = /^\/(cases|insar)\//;

describe("facts", () => {
  // #29: an image that isn't ours carries a visible credit.
  it("credits every image that is not one of our own crops", () => {
    for (const fact of getFacts()) {
      if (fact.image === undefined || OURS.test(fact.image.src)) continue;
      expect(fact.image.credit, fact.id).toBeTruthy();
    }
  });

  // #25: every wait draws ten, so the pool holds at least ten, each with a linked source.
  it("hold at least ten sourced facts for each wait to draw from", () => {
    const facts = getFacts();
    expect(facts.length).toBeGreaterThanOrEqual(10);
    expect(new Set(facts.map(({ id }) => id)).size).toBe(facts.length);
    for (const fact of facts) expect(fact.source.href, fact.id).toMatch(/^https:\/\//);
  });
});
