import { describe, expect, it } from "vitest";

import { CASES, findCase, findLens } from "@/features/cases/cases";
import { NISCEMI, NISCEMI_EVIDENCE } from "@/features/cases/niscemi";
import { timelineRows } from "@/features/downloads/timelineExport";
import {
  assessmentPasses,
  baselineImage,
  baselinePasses,
  CHANNELS,
  daysBetween,
  formatDb,
  formatIqr,
  isAftermathOnly,
  isPerChannel,
  outsidePercent,
  passImage,
  peakPass,
  viewImage,
} from "@/features/landslide/landslideEvidence";
import { caseHits } from "@/features/search/searchRows";

// Every file under public/cases, as Vite sees it ("/public/cases/x.png").
const SHIPPED = new Set(Object.keys(import.meta.glob("/public/cases/**/*.png")));
const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
};

describe("landslide evidence helpers", () => {
  it("writes dB shifts with a sign and a real minus", () => {
    expect(formatDb(2.17)).toBe("+2.17 dB");
    expect(formatDb(-0.4)).toBe("−0.40 dB");
    expect(formatDb(0)).toBe("0.00 dB");
    expect(formatIqr([1.24, 3.5])).toBe("+1.24 dB to +3.50 dB");
  });

  it("counts days between two dates", () => {
    expect(daysBetween("2026-01-25", "2026-06-24")).toBe(150);
  });

  it("says nothing about a pass with no band count", () => {
    const baseline = NISCEMI_EVIDENCE.passes[0];
    expect(baseline?.role).toBe("baseline");
    expect(baseline === undefined ? 0 : outsidePercent(baseline, 16_384)).toBeUndefined();
  });
});

describe("Niscemi, the landslide case (#24)", () => {
  const evidence = NISCEMI_EVIDENCE;

  it("is aftermath only: every pass follows the 25 Jan landslide, the first 150 days later", () => {
    expect(isAftermathOnly(evidence)).toBe(true);
    const first = evidence.passes[0]?.date ?? "";
    expect(daysBetween(evidence.event.date, first)).toBe(150);
    expect(NISCEMI.quality[0]?.why).toContain("150 days later");
  });

  it("has four baseline passes, then four assessment passes ending on the target", () => {
    const dates = evidence.passes.map((pass) => pass.date);
    expect(dates).toEqual([...dates].sort());
    expect(baselinePasses(evidence)).toHaveLength(4);
    expect(assessmentPasses(evidence)).toHaveLength(4);
    expect(dates.at(-1)).toBe(evidence.target);
    expect(assessmentPasses(evidence).every((pass) => pass.outsideCells !== undefined)).toBe(true);
  });

  it("states the headline and the marker shift its own series gives", () => {
    expect(NISCEMI.stat).toBe(formatDb(evidence.shift.area.HH.median));
    const target = evidence.passes.at(-1);
    for (const channel of CHANNELS) {
      const base = median(baselinePasses(evidence).map((pass) => pass.point[channel]));
      expect((target?.point[channel] ?? 0) - base).toBeCloseTo(evidence.shift.point[channel], 1);
    }
  });

  it("puts the largest out-of-band share on 16 Sep, on a 0–100% scale", () => {
    expect(peakPass(evidence)?.date).toBe("2026-09-16");
    const shares = assessmentPasses(evidence).map((pass) =>
      Number(outsidePercent(pass, evidence.cells)?.toFixed(1)),
    );
    expect(shares).toEqual([2.9, 2.7, 46.2, 32.6]);
  });

  it("ships every image the panel and the globe can show", () => {
    const images = [
      ...evidence.passes.flatMap((pass) =>
        CHANNELS.map((channel) => passImage(evidence, pass.date, channel)),
      ),
      ...CHANNELS.map((channel) => baselineImage(evidence, channel)),
      ...evidence.views.flatMap((view) =>
        isPerChannel(view) ? CHANNELS.map((channel) => viewImage(view, channel)) : [view.src],
      ),
      NISCEMI.crops?.base ?? "",
      NISCEMI.crops?.change ?? "",
    ];
    for (const path of images) expect(SHIPPED.has(`/public${path}`), path).toBe(true);
  });

  it("draws its timeline from the series, with real dates and the event before them", () => {
    const timeline = NISCEMI.timeline;
    expect(timeline?.realDates).toBe(true);
    expect(timeline?.passes.map((pass) => pass.date)).toEqual(evidence.passes.map((p) => p.date));
    expect(timeline?.passes.at(-1)?.kind).toBe("target");
    expect(timeline?.onset?.date).toBe(evidence.event.date);
    expect(timelineRows(NISCEMI).every((row) => !row.demo)).toBe(true);
  });

  it("is a measured case under its own question, never a live lens", () => {
    expect(NISCEMI.verdict).toBe("measured");
    expect(NISCEMI.hazard).toBe("landslide");
    expect(findLens(NISCEMI.lens)?.chip).toBe("Did the slope keep its echo?");
    expect(findCase("niscemi-aftermath")).toBe(NISCEMI);
    expect(CASES).toContain(NISCEMI);
  });

  it("is found by name in the search, as an instant case", () => {
    expect(caseHits("Niscemi", CASES).map(({ id }) => id)).toEqual(["niscemi-aftermath"]);
  });
});

describe("the other measured cases keep demo timelines", () => {
  it("marks every row of a demo timeline as demo", () => {
    const qadirabad = findCase("qadirabad");
    expect(
      qadirabad === undefined ? [] : timelineRows(qadirabad).map((row) => row.demo),
    ).not.toContain(false);
  });
});
