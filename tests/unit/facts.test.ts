import { describe, expect, it } from "vitest";

import { getFacts } from "@/content/facts";

// Our own measured crops and atlas panels; every other image was made by someone else.
const OURS = /^\/(cases|insar|atlas)\//;
// The files under public/ the facts may point at (keys only; nothing is loaded).
const PUBLIC = new Set(
  Object.keys(import.meta.glob("/public/{facts,cases,insar,atlas}/**/*.{png,webp}")).map((path) =>
    path.replace(/^\/public/, ""),
  ),
);

describe("facts", () => {
  // #29: an image that isn't ours carries a visible credit.
  it("credits every image that is not one of our own crops", () => {
    for (const fact of getFacts()) {
      if (OURS.test(fact.image.src)) continue;
      expect(fact.image.credit, fact.id).toBeTruthy();
    }
  });

  // #25: a pool of at least 40 (v9 COPY-flow §7), ten drawn per wait, each with a linked source.
  it("hold at least forty sourced facts for each wait to draw from", () => {
    const facts = getFacts();
    expect(facts.length).toBeGreaterThanOrEqual(40);
    expect(new Set(facts.map(({ id }) => id)).size).toBe(facts.length);
    for (const fact of facts) expect(fact.source.href, fact.id).toMatch(/^https:\/\//);
  });

  // #25: each fact is short, titled and illustrated, and its image is described for screen readers.
  it("give every fact a title, a short text and an image with alt text that exists", () => {
    for (const fact of getFacts()) {
      expect(fact.title, fact.id).toBeTruthy();
      expect(fact.text.length, fact.id).toBeLessThanOrEqual(180);
      expect(fact.image.alt, fact.id).toBeTruthy();
      expect(PUBLIC.has(fact.image.src), fact.image.src).toBe(true);
    }
  });
});
