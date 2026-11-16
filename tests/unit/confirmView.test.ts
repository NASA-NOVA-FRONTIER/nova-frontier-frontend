import land from "../e2e/mocks/coverage-qadirabad.json";
import land4 from "../e2e/mocks/coverage-qadirabad-4.json";
import land3 from "../e2e/mocks/coverage-qadirabad-3.json";
import ocean from "../e2e/mocks/coverage-open-ocean.json";
import kumamoto from "../fixtures/insar-pairs-kumamoto.json";
import { describe, expect, it } from "vitest";

import {
  arcPath,
  arcStrip,
  chosenDates,
  confirmLensOf,
  confirmWait,
  defaultPairId,
  largestGap,
  pairGroups,
  passState,
  seriesOf,
  startBlock,
  stripX,
} from "@/features/confirm/confirmView";
import type { InsarPairs } from "@/features/insar/insarApi";
import type { Coverage } from "@/features/spot/coverageApi";

// Real /coverage answers (Qadirabad, South Atlantic) and the two derived from Qadirabad by dropping dates.
const LAND = land as Coverage;
const LAND_4 = land4 as Coverage;
const LAND_3 = land3 as Coverage;
const OCEAN = ocean as Coverage;
// The real /insar/pairs answer at Kumamoto: 23 pairs over 3 series.
const PAIRS = (kumamoto as InsarPairs).pairs;

describe("confirmLensOf", () => {
  it("keeps the four live lenses and opens an agriculture link on Flood", () => {
    expect(confirmLensOf("insar")).toBe("insar");
    expect(confirmLensOf("wildfire")).toBe("wildfire");
    expect(confirmLensOf("agriculture")).toBe("flood_wetland");
  });
});

describe("seriesOf", () => {
  it("reads track and direction from the backend's series key", () => {
    expect(seriesOf("084_A_018_4005_DHDH")).toEqual({ track: "84", direction: "ASCENDING" });
    expect(seriesOf("003_D_072_4000_SH")).toEqual({ track: "3", direction: "DESCENDING" });
  });

  it("says nothing for a key without them", () => {
    expect(seriesOf(null)).toBeUndefined();
    expect(seriesOf("series-7")).toBeUndefined();
  });
});

describe("passState", () => {
  it("5 passes are normal", () => {
    expect(passState(LAND)).toEqual({ kind: "ready" });
  });

  it("4 passes name the largest gap, whatever its length", () => {
    expect(passState(LAND_4)).toEqual({ kind: "four", gap: ["2026-07-14", "2026-08-19"] });
  });

  it("3 passes are too few", () => {
    expect(passState(LAND_3)).toEqual({ kind: "few", count: 3 });
  });

  it("no coverage is none", () => {
    expect(passState(OCEAN)).toEqual({ kind: "none" });
  });
});

describe("largestGap", () => {
  it("finds the longest interval in unsorted dates", () => {
    expect(largestGap(["2026-09-12", "2026-07-14", "2026-08-19"])).toEqual([
      "2026-07-14",
      "2026-08-19",
    ]);
    expect(largestGap(["2026-07-14"])).toBeUndefined();
  });
});

describe("chosenDates", () => {
  it("is the passes /coverage chose, oldest first", () => {
    expect(chosenDates(LAND)).toEqual([
      "2026-07-14",
      "2026-08-19",
      "2026-09-12",
      "2026-10-18",
      "2026-11-11",
    ]);
  });
});

describe("pairGroups", () => {
  const groups = pairGroups(PAIRS);

  it("groups the pairs by series, the series with the newest pair first", () => {
    expect(groups.map((group) => group.seriesKey)).toEqual([
      "125_A_018_4000_SH",
      "024_A_018_4000_SH",
      "003_D_072_4000_SH",
    ]);
    expect(groups.map((group) => group.pairs.length)).toEqual([8, 8, 7]);
    expect(groups[0]).toMatchObject({ track: "125", direction: "ASCENDING" });
    expect(groups[2]).toMatchObject({ track: "3", direction: "DESCENDING" });
  });

  it("lists each group's pass dates once, oldest first", () => {
    expect(groups[0]?.dates).toEqual([
      "2026-06-22",
      "2026-07-04",
      "2026-07-16",
      "2026-08-21",
      "2026-09-02",
      "2026-09-14",
      "2026-09-26",
      "2026-10-08",
      "2026-10-20",
    ]);
  });

  it("defaults to the newest pair", () => {
    expect(defaultPairId(PAIRS)).toBe(PAIRS[0]?.pairId);
  });
});

describe("arcStrip", () => {
  const [track125] = pairGroups(PAIRS);

  it("draws the 5 most recent passes and only the real pairs between them", () => {
    if (track125 === undefined) throw new Error("no group");
    const strip = arcStrip(track125, undefined);
    expect(strip.dates).toEqual([
      "2026-09-02",
      "2026-09-14",
      "2026-09-26",
      "2026-10-08",
      "2026-10-20",
    ]);
    expect(strip.arcs.map((arc) => `${arc.referenceDate}→${arc.secondaryDate}`)).toEqual([
      "2026-09-02→2026-09-14",
      "2026-09-14→2026-09-26",
      "2026-09-26→2026-10-08",
      "2026-10-08→2026-10-20",
    ]);
  });

  it("adds an older chosen pair's passes so its arc shows", () => {
    if (track125 === undefined) throw new Error("no group");
    const old = track125.pairs.find((pair) => pair.referenceDate === "2026-07-16");
    const strip = arcStrip(track125, old);
    expect(strip.dates).toContain("2026-07-16");
    expect(strip.dates).toContain("2026-08-21");
    expect(strip.arcs.some((arc) => arc.pairId === old?.pairId)).toBe(true);
  });
});

describe("stripX", () => {
  it("places dates by their real day, so uneven gaps stay uneven", () => {
    const dates = chosenDates(LAND);
    const xs = dates.map((date) => stripX(date, dates, 340, 14));
    expect(xs[0]).toBe(14);
    expect(xs.at(-1)).toBe(326);
    // 14 Jul → 19 Aug is 36 days, 19 Aug → 12 Sep is 24.
    const first = (xs[1] ?? 0) - (xs[0] ?? 0);
    const second = (xs[2] ?? 0) - (xs[1] ?? 0);
    expect(first / second).toBeCloseTo(36 / 24, 5);
  });

  it("centres a single date", () => {
    expect(stripX("2026-07-14", ["2026-07-14"], 340, 14)).toBe(170);
  });
});

describe("arcPath", () => {
  it("rises with the pair's length, capped", () => {
    expect(arcPath(0, 40, 60, 50)).toBe("M 0 60 Q 20 12 40 60");
    expect(arcPath(0, 300, 60, 50)).toBe("M 0 60 Q 150 -40 300 60");
  });
});

describe("startBlock", () => {
  it("blocks the image lenses on none and few, never on four", () => {
    expect(startBlock("flood_wetland", undefined, undefined)).toBe("loading");
    expect(startBlock("flood_wetland", { kind: "none" }, undefined)).toBe("none");
    expect(startBlock("wildfire", { kind: "few", count: 3 }, undefined)).toBe("few");
    expect(
      startBlock("vegetation_disturbance", { kind: "four", gap: ["a", "b"] }, undefined),
    ).toBeUndefined();
    expect(startBlock("flood_wetland", { kind: "ready" }, undefined)).toBeUndefined();
  });

  it("blocks Earthquake on the pair list only", () => {
    expect(startBlock("insar", { kind: "none" }, undefined)).toBe("loading");
    expect(startBlock("insar", { kind: "none" }, false)).toBe("noPair");
    expect(startBlock("insar", { kind: "none" }, true)).toBeUndefined();
  });
});

describe("confirmWait (#72): the backend's estimate in the footer", () => {
  it("shows the coverage p80 for the image lenses", () => {
    expect(confirmWait("flood_wetland", undefined, LAND)).toEqual({
      line: "Usually under 4 min",
      offline: false,
    });
    expect(confirmWait("wildfire", undefined, { ...LAND, etaSeconds: 140 }).line).toBe(
      "Usually under 3 min",
    );
  });

  it("gives no number without an estimate, and none for Earthquake", () => {
    expect(confirmWait("flood_wetland", undefined, { ...LAND, etaSeconds: null }).line).toBe(
      "Computed live · we stop at 8 min",
    );
    expect(confirmWait("insar", undefined, LAND).line).toBe("Computed live · we stop at 8 min");
  });

  it("is OFFLINE on a cache hit (image lenses) or a prepared case (any lens)", () => {
    const hit = { ...LAND, etaSeconds: 0, cache: "hit" as const };
    expect(confirmWait("flood_wetland", undefined, hit)).toEqual({
      line: "Prepared · opens in about a second",
      offline: true,
    });
    expect(confirmWait("insar", undefined, hit).offline).toBe(false);
    expect(confirmWait("insar", undefined, { ...LAND, precomputedCase: "qadirabad" }).offline).toBe(
      true,
    );
  });

  it("names why nothing runs when Start is blocked", () => {
    expect(confirmWait("flood_wetland", "none", OCEAN).line).toBe("Nothing to compute");
    expect(confirmWait("flood_wetland", "few", LAND_3).line).toBe("Nothing to compute yet");
    expect(confirmWait("insar", "noPair", LAND).line).toBe("Nothing to compute yet");
  });
});
