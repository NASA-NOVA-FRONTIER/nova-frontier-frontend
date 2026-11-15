import { describe, expect, it } from "vitest";

import { findCase } from "@/features/cases/cases";
import type { LonLat } from "@/features/frames/frame.types";
import { frameUnder, toFrame } from "@/features/frames/frames";
import { caseTooltip, frameTooltip } from "@/features/globe/tooltipText";

// The real globe and the E2E stub both pick frames and write hover text through these.
const square = (west: number, south: number, size: number): LonLat[] => [
  [west, south],
  [west + size, south],
  [west + size, south + size],
  [west, south + size],
  [west, south],
];

const ascending = toFrame({ t: 47, f: 3, p: "A", x: 1, r: [square(-76, 2, 4)] });
const descending = toFrame({ t: 83, f: 86, p: "D", x: 0, r: [square(-80, 2, 8)] });

describe("frameUnder", () => {
  it("prefers the ascending frame where both passes cover the point", () => {
    expect(frameUnder([descending, ascending], [-74, 4])?.id).toBe("47-3");
  });

  it("falls back to the descending frame", () => {
    expect(frameUnder([descending, ascending], [-79, 4])?.id).toBe("83-86");
  });

  it("finds nothing over open ocean", () => {
    expect(frameUnder([descending, ascending], [-20, 18])).toBeUndefined();
  });
});

describe("tooltip text", () => {
  it("names the frame, its polarizations and the point", () => {
    expect(frameTooltip(ascending, [-74.75, 2.89])).toEqual({
      title: "Track 47 · Frame 3 · HH+HV",
      sub: "2.89° N, 74.75° W · NISAR frame ~240 km · click to ask the radar",
    });
    expect(frameTooltip(descending, [-79, 4]).title).toBe("Track 83 · Frame 86 · HH only");
  });

  it("names a measured case by its lens, and Chocó by its coherence", () => {
    const qadirabad = findCase("qadirabad");
    const choco = findCase("choco");
    if (qadirabad === undefined || choco === undefined) throw new Error("missing case");
    expect(caseTooltip(qadirabad)).toEqual({
      title: "Qadirabad",
      sub: expect.stringMatching(/^Measured case · .+/),
    });
    expect(caseTooltip(choco).sub).toMatch(/^Coherence only · /);
  });
});
