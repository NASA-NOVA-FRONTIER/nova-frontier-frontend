// The v9 result card's numbers from real answers. Rowe Creek's evaluated HV history comes from the
// gateway job (the only real answer with two assessed passes); it is set into the Seattle answer.
import kumamoto from "../fixtures/exploration-kumamoto-insar.json";
import qadirabad from "../fixtures/exploration-qadirabad.json";
import seattle from "../fixtures/exploration-Seattle-wildfire.json";
import roweFire from "../fixtures/modal-job-wildfire-rowe-creek-pr23.json";
import { describe, expect, it } from "vitest";

import { statOf } from "@/content/copyV9";
import type { TimelinePass } from "@/features/cases/cases";
import { explorationSchema, type ExplorationResult } from "@/features/explore/exploreSchemas";
import { originOf, rangeLineOf, resultBody, resultStat } from "@/features/result/resultStat";

const parse = (raw: unknown) => explorationSchema.parse(raw);
const resultOf = (raw: unknown): ExplorationResult => {
  const result = parse(raw).result;
  if (result === null) throw new Error("fixture has a result");
  return result;
};

const QADIRABAD = resultOf(qadirabad);
const SEATTLE = resultOf(seattle.exploration);
const KUMAMOTO = resultOf(kumamoto);

const roweRadar = roweFire.result.science.lens.radar;
const ROWE = resultOf({
  ...seattle.exploration,
  result: {
    ...seattle.exploration.result,
    lens: {
      ...seattle.exploration.result.lens,
      radar: {
        ...seattle.exploration.result.lens.radar,
        common_cells: roweRadar.common_cells,
        cross_pol_history: roweRadar.cross_pol_history,
      },
    },
  },
});

describe("resultStat", () => {
  it("flood: dual-darkening cells of the supported cells", () => {
    const stat = resultStat("flood_wetland", QADIRABAD);
    expect(stat).toEqual({
      k: 208344,
      n: 1048576,
      label: "analysis cells met the darkening signature",
    });
    expect(stat && statOf(stat.k, stat.n)).toBe("208,344 of 1,048,576");
  });

  it("earthquake: window cells with phase above the threshold the pair was measured with", () => {
    expect(resultStat("insar", KUMAMOTO)).toEqual({
      k: 39584,
      n: 62500,
      label: "window cells with phase above 0.35",
    });
  });

  it("wildfire and vegetation: the backend's repeated-decline count on Rowe Creek", () => {
    for (const lens of ["wildfire", "vegetation_disturbance"] as const)
      expect(resultStat(lens, ROWE)).toEqual({
        k: 65,
        n: 4096,
        label: "cells with repeated HV decline",
      });
  });

  it("no stat when HV was assessed once (Seattle) or the lens has no history", () => {
    expect(resultStat("wildfire", SEATTLE)).toBeUndefined();
    expect(resultStat("vegetation_disturbance", QADIRABAD)).toBeUndefined();
  });

  it("no stat when the pair has no window count", () => {
    const insar = KUMAMOTO.insar;
    if (insar == null) throw new Error("fixture has insar");
    expect(resultStat("insar", { ...KUMAMOTO, insar: { ...insar, windowCells: null } })).toBe(
      undefined,
    );
  });
});

describe("originOf", () => {
  it("a cache hit is OFFLINE, a fresh run ONLINE", () => {
    expect(originOf(parse(qadirabad))).toBe("offline");
    expect(originOf(parse(kumamoto))).toBe("online");
  });
});

describe("rangeLineOf and resultBody", () => {
  const passes: TimelinePass[] = [
    { date: "2026-07-14", kind: "base" },
    { date: "2026-08-19", kind: "base" },
    { date: "2026-09-12", kind: "target" },
    { date: "2026-11-30", kind: "plan" },
  ];

  it("the measured passes' real dates; planned passes don't count", () => {
    expect(rangeLineOf("flood_wetland", QADIRABAD, passes)).toBe(
      "14 JUL 2026 → 12 SEP 2026 · 3 PASSES",
    );
    expect(rangeLineOf("flood_wetland", QADIRABAD, [])).toBeUndefined();
  });

  it("the earthquake pair's two dates, and a body that names the pair, never an event", () => {
    expect(rangeLineOf("insar", KUMAMOTO, [])).toBe("1 PAIR · 21 JUL 2026 → 14 AUG 2026");
    expect(resultBody("insar", KUMAMOTO)).toMatch(/^The pair 21 Jul 2026 → 14 Aug 2026 kept/);
    expect(resultBody("insar", KUMAMOTO)).not.toMatch(/event/i);
  });

  it("wildfire compares with the median of earlier passes", () => {
    expect(resultBody("wildfire", SEATTLE)).toMatch(/^Compared with the median of earlier passes/);
  });
});
