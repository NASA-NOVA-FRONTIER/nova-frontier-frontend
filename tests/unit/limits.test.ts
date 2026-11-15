import { describe, expect, it } from "vitest";

import { getFacts } from "@/content/facts";
import { limitsSchema, quotaOf, resetOf, resetText } from "@/features/limits/limitsApi";

const NOW = new Date("2026-11-14T17:48:00Z");
const limits = (remainingApp: number | null, remainingClient: number | null) => ({
  remainingApp,
  remainingClient,
  resetsAt: "2026-11-15T00:00:00Z",
});

describe("quotaOf: SPECS-v8 §8, the counter only at 3 or fewer left", () => {
  it("is hidden above 3, and when the endpoint isn't there yet", () => {
    expect(quotaOf(limits(4, 9), NOW)).toEqual({ kind: "hidden" });
    expect(quotaOf(undefined, NOW)).toEqual({ kind: "hidden" });
    expect(quotaOf(limits(null, null), NOW)).toEqual({ kind: "hidden" });
  });

  it("counts the tighter of the app's and this client's caps", () => {
    expect(quotaOf(limits(40, 3), NOW)).toEqual({ kind: "low", remaining: 3 });
    expect(quotaOf(limits(2, null), NOW)).toEqual({ kind: "low", remaining: 2 });
  });

  it("is used up at zero, with the reset time", () => {
    expect(quotaOf(limits(0, 5), NOW)).toEqual({
      kind: "out",
      resetsAt: new Date("2026-11-15T00:00:00Z"),
    });
  });
});

describe("reset time", () => {
  it("falls back to the next 00:00 UTC when the backend gives none or a past one", () => {
    expect(resetOf(undefined, NOW).toISOString()).toBe("2026-11-15T00:00:00.000Z");
    expect(resetOf("2026-11-14T00:00:00Z", NOW).toISOString()).toBe("2026-11-15T00:00:00.000Z");
    expect(resetOf("not a date", NOW).toISOString()).toBe("2026-11-15T00:00:00.000Z");
  });

  it("writes {h} h {m} min", () => {
    expect(resetText(new Date("2026-11-15T00:00:00Z"), NOW)).toEqual({
      at: "00:00",
      wait: "6 h 12 min",
    });
  });

  it("accepts the backend's shape", () => {
    expect(limitsSchema.parse(limits(3, 1))).toEqual(limits(3, 1));
  });
});

describe("facts", () => {
  it("every fact names a source, and the five v8 facts come with their title and image", () => {
    const facts = getFacts();
    for (const fact of facts) expect(fact.source.href).toMatch(/^https:\/\//);
    expect(facts.filter((fact) => fact.image !== undefined).map((fact) => fact.title)).toEqual([
      "Radar sees through clouds",
      "A 24 cm wave",
      "Calm water looks dark",
      "Every 12 days",
      "Coherence, 0 to 1",
    ]);
  });
});
