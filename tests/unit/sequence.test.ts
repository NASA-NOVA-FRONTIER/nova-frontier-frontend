import { describe, expect, it } from "vitest";

import { CASES, type TimelineData } from "@/features/cases/cases";
import {
  daysBetween,
  nearestStep,
  sequenceOf,
  sequenceReadout,
} from "@/features/timeline/sequence";
import { layoutTimeline } from "@/features/timeline/timelineLayout";

const live: TimelineData = {
  passes: [
    { date: "2026-07-14", kind: "base", images: { HH: "/hh-0714", HV: "/hv-0714" } },
    { date: "2026-08-19", kind: "base", images: { HH: "/hh-0819" } },
    { date: "2026-09-12", kind: "base", images: { HH: "/hh-0912" } },
    { date: "2026-10-18", kind: "base" },
    { date: "2026-11-11", kind: "target" },
    { date: "2026-11-23", kind: "plan" },
  ],
  start: "2026-06-30",
  end: "2026-12-07",
  today: "2026-11-13",
  optical: [],
  opticalNote: "",
  track: 84,
  direction: "A",
};

const build = (data: TimelineData) => {
  const layout = layoutTimeline(data);
  return { layout, sequence: sequenceOf(data, layout) };
};

describe("sequence of passes", () => {
  it("has one step per measured pass, at its real date, never a planned one", () => {
    const { layout, sequence } = build(live);
    expect(sequence.mode).toBe("passes");
    expect(sequence.steps.map((step) => step.date)).toEqual([
      "2026-07-14",
      "2026-08-19",
      "2026-09-12",
      "2026-10-18",
      "2026-11-11",
    ]);
    expect(sequence.steps.map((step) => layout.passes[step.passIndex ?? -1]?.date)).toEqual(
      sequence.steps.map((step) => step.date),
    );
  });

  it("keeps each pass's own images; a pass without one has none, never another date's", () => {
    const { sequence } = build(live);
    expect(sequence.steps[0]?.images).toEqual(["/hh-0714", "/hv-0714"]);
    expect(sequence.steps[3]?.images).toEqual([]);
    expect(sequence.canPlay).toBe(true);
  });

  it("labels the real gaps in days and hides the ones too close to read", () => {
    const { sequence } = build(live);
    expect(sequence.gaps.map((gap) => gap.label)).toEqual(["36 D", "24 D", "36 D", "24 D"]);
    expect(sequence.gaps.every((gap) => gap.show)).toBe(true);
    const tight = build({ ...live, start: "2025-01-01", end: "2027-12-31" }).sequence;
    expect(tight.gaps.some((gap) => !gap.show)).toBe(true);
  });

  it("reads Pass i of n with the track on a live answer", () => {
    const { layout, sequence } = build(live);
    expect(sequenceReadout(live, layout, sequence, 2)).toEqual({
      line: "Pass 3 of 5 · 12 Sep 2026",
      sub: "5 MEASURED PASSES · 14 JUL 2026 → 11 NOV 2026 · TRACK 84 ASCENDING",
    });
  });

  it("with four passes, names the largest gap", () => {
    const four = { ...live, passes: live.passes.filter((item) => item.date !== "2026-09-12") };
    const { layout, sequence } = build(four);
    expect(sequenceReadout(four, layout, sequence, 0).line).toBe(
      "Pass 1 of 4 · 4 MEASURED PASSES · 60 D with no pass between 19 Aug and 18 Oct",
    );
  });

  // Qadirabad (DEMO dates, only base and change crops): nothing of its own to animate.
  it("a case without per-pass images can't play and keeps the v8 sub line", () => {
    const qadirabad = CASES.find((item) => item.id === "qadirabad")?.timeline;
    if (qadirabad === undefined) throw new Error("Qadirabad has a timeline");
    const { layout, sequence } = build(qadirabad);
    expect(sequence.canPlay).toBe(false);
    expect(sequenceReadout(qadirabad, layout, sequence, 4)).toEqual({
      line: "Pass 5 of 8 · 7 Aug 2026",
      sub: "8.4% of supported cells outside the normal range",
    });
  });
});

describe("sequence of intervals (ground motion)", () => {
  const pair: TimelineData = {
    passes: [],
    start: "2026-07-07",
    end: "2026-08-28",
    today: "2026-11-13",
    optical: [],
    opticalNote: "",
    intervals: {
      items: [{ a: "2026-07-21", b: "2026-08-14", images: ["/coh", "/phase"] }],
      chain: false,
    },
  };

  it("one live pair is one step, with no event line and nothing to play", () => {
    const { layout, sequence } = build(pair);
    expect(sequence.mode).toBe("intervals");
    expect(sequence.steps).toHaveLength(1);
    expect(sequence.event).toBeUndefined();
    expect(sequence.canPlay).toBe(false);
    expect(sequence.bars[0]?.label).toBe("24 D");
    expect(sequenceReadout(pair, layout, sequence, 0)).toEqual({
      line: "Pair 1 of 1 · 21 Jul → 14 Aug 2026",
      sub: "1 MEASURED PAIR · NEWEST FIRST",
    });
  });

  // v9 correction 2: Kumamoto is a chain 07-09→07-21→08-14→08-26, never "all straddle the event".
  it("a measured chain reads in time order and never claims to straddle an event", () => {
    const chain: TimelineData = {
      ...pair,
      intervals: {
        chain: true,
        items: [
          { a: "2026-08-14", b: "2026-08-26", images: ["/c"] },
          { a: "2026-07-09", b: "2026-07-21", images: ["/a"] },
          { a: "2026-07-21", b: "2026-08-14", images: ["/b"] },
        ],
      },
    };
    const { layout, sequence } = build(chain);
    expect(sequence.steps.map((step) => step.from)).toEqual([
      "2026-07-09",
      "2026-07-21",
      "2026-08-14",
    ]);
    expect(sequence.event).toBeUndefined();
    const readout = sequenceReadout(chain, layout, sequence, 1);
    expect(readout).toEqual({
      line: "Pair 2 of 3 · 21 Jul → 14 Aug 2026",
      sub: "3 MEASURED PAIRS",
    });
    expect(readout.sub).not.toMatch(/STRADDLE/);
  });

  it("draws the event line only for a sourced event date", () => {
    const sourced = { ...pair, event: { date: "2026-08-01", source: "USGS" } };
    expect(build(sourced).sequence.event?.label).toBe("EVENT · 1 AUG 2026");
  });

  it("a live list reads newest first", () => {
    const many: TimelineData = {
      ...pair,
      intervals: {
        chain: false,
        items: [
          { a: "2026-07-09", b: "2026-07-21" },
          { a: "2026-07-21", b: "2026-08-14" },
        ],
      },
    };
    expect(build(many).sequence.steps.map((step) => step.date)).toEqual([
      "2026-08-14",
      "2026-07-21",
    ]);
  });
});

describe("helpers", () => {
  it("counts whole days and finds the tick nearest the pointer", () => {
    expect(daysBetween("2026-07-14", "2026-08-19")).toBe(36);
    expect(nearestStep([0, 30, 60, 100], 44)).toBe(1);
    expect(nearestStep([0, 30, 60, 100], 46)).toBe(2);
    expect(nearestStep([0, 30, 60, 100], 120)).toBe(3);
  });
});
