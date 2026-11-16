import real from "../fixtures/exploration-qadirabad.json";
import insar from "../fixtures/exploration-kumamoto-insar.json";
import seattle from "../fixtures/exploration-Seattle-wildfire.json";
import { describe, expect, it } from "vitest";

import { explorationSchema } from "@/features/explore/exploreSchemas";
import { exploreTimeline } from "@/features/explore/exploreTimeline";

const TODAY = "2026-11-13";

describe("live timeline images", () => {
  it("gives every Seattle pass its own HH and HV image, plus the track", () => {
    const timeline = exploreTimeline(explorationSchema.parse(seattle.exploration), [], TODAY);
    const measured = timeline?.passes.filter((item) => item.kind !== "plan") ?? [];
    expect(measured).toHaveLength(5);
    for (const item of measured) {
      expect(item.images?.HH).toContain(`display_${item.date}_HH`);
      expect(item.images?.HV).toContain(`display_${item.date}_HV`);
    }
    expect(timeline?.track).toEqual(expect.any(Number));
    expect(timeline?.direction).toEqual(expect.any(String));
  });

  it("leaves a Qadirabad pass with no image empty, never borrowing another date", () => {
    const timeline = exploreTimeline(explorationSchema.parse(real), [], TODAY);
    const byDate = new Map(timeline?.passes.map((item) => [item.date, item.images]));
    expect(byDate.get("2026-09-12")).toEqual({ HH: expect.stringContaining("2026-09-12_HH") });
    expect(byDate.get("2026-10-18")).toBeUndefined();
    expect(byDate.get("2026-11-11")).toBeUndefined();
    expect(timeline).toMatchObject({ track: 84, direction: "A" });
  });

  it("turns the Kumamoto pair into one interval with its coherence and phase images", () => {
    const timeline = exploreTimeline(explorationSchema.parse(insar), [], TODAY);
    expect(timeline?.passes).toEqual([]);
    expect(timeline?.intervals?.chain).toBe(false);
    expect(timeline?.intervals?.items).toEqual([
      { a: "2026-07-21", b: "2026-08-14", images: [expect.any(String), expect.any(String)] },
    ]);
    expect(timeline?.event).toBeUndefined();
  });
});
