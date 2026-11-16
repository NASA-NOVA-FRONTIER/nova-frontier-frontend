import { describe, expect, it } from "vitest";

import { BUG_FIRE_EVIDENCE, bugFireTimeline } from "@/features/cases/bugFire";
import { findCase } from "@/features/cases/cases";
import {
  CHANNELS,
  daysBetween,
  passImage,
  sharePercent,
} from "@/features/wildfire/wildfireEvidence";

// Every file under public/cases, as Vite sees it ("/public/cases/x.png").
const SHIPPED = new Set(Object.keys(import.meta.glob("/public/cases/**/*.png")));
const shipped = (src: string): boolean => SHIPPED.has(`/public${src}`);
const evidence = BUG_FIRE_EVIDENCE;

describe("Bug Fire evidence (#21)", () => {
  it("lists three baseline passes, then two assessments ending on the target", () => {
    const dates = evidence.passes.map((item) => item.date);
    expect(dates).toEqual([...dates].sort());
    expect(evidence.passes.map((item) => item.role)).toEqual([
      "baseline",
      "baseline",
      "baseline",
      "assessment",
      "assessment",
    ]);
    expect(dates.at(-1)).toBe(evidence.target);
  });

  it("puts the fire between the last baseline pass and the first assessment", () => {
    const lastBaseline = evidence.passes[2]?.date ?? "";
    const firstAssessment = evidence.passes[3]?.date ?? "";
    expect(daysBetween(lastBaseline, evidence.reference.ignition)).toBeGreaterThan(0);
    expect(daysBetween(evidence.reference.containment, firstAssessment)).toBeGreaterThan(0);
  });

  it("ships every image it points at", () => {
    for (const item of evidence.passes) {
      for (const channel of CHANNELS) {
        expect(shipped(passImage(evidence, item.date, channel)), item.date).toBe(true);
      }
    }
    for (const view of evidence.views) {
      const sources = view.src.includes("{channel}")
        ? CHANNELS.map((channel) => view.src.replace("{channel}", channel))
        : [view.src];
      for (const src of sources) expect(shipped(src), view.id).toBe(true);
    }
  });

  it("keeps every count inside the cells it was measured on", () => {
    const { inside, outside } = evidence.perimeter;
    expect(inside.cells + outside.cells).toBeLessThanOrEqual(evidence.cells);
    expect(inside.declineBothDatesCells).toBeLessThanOrEqual(inside.cells);
    expect(outside.declineBothDatesCells).toBeLessThanOrEqual(outside.cells);
    expect(evidence.crossPol.declineOnLastTwoCells).toBeLessThanOrEqual(
      Math.min(...evidence.crossPol.samples.map((sample) => sample.declineCells)),
    );
    for (const item of evidence.passes) {
      expect(item.outsideCells ?? 0).toBeLessThanOrEqual(evidence.cells);
    }
  });

  it("samples the cross-pol decline on the assessment passes", () => {
    const assessed = evidence.passes
      .filter((item) => item.role === "assessment")
      .map((item) => item.date);
    expect(evidence.crossPol.samples.map((sample) => sample.date)).toEqual(assessed);
  });

  it("reads the perimeter split as shares of each side", () => {
    expect(sharePercent(127, 1737)).toBe(7.3);
    expect(sharePercent(18, 1813)).toBe(1);
    expect(sharePercent(1, 0)).toBe(0);
  });

  it("says FIRMS is not in the case instead of showing a guess", () => {
    expect(evidence.firms.status).toBe("unavailable");
  });
});

describe("Bug Fire on the globe (#21)", () => {
  const item = findCase("bug-fire");

  it("drapes its own HH layers over the model's 64-cell, 10 m grid", () => {
    expect(item?.wildfire).toBe(evidence);
    expect(item?.chipKm).toBe(0.64);
    expect(item?.chipGridM).toBe(10);
    expect(shipped(item?.crops?.base ?? "")).toBe(true);
    expect(shipped(item?.crops?.change ?? "")).toBe(true);
  });

  it("draws the five real passes, the ignition and the first assessment as target", () => {
    expect(item?.timeline).toBe(bugFireTimeline);
    expect(bugFireTimeline.realDates).toBe(true);
    expect(bugFireTimeline.passes.map((pass) => pass.date)).toEqual(
      evidence.passes.map((pass) => pass.date),
    );
    expect(bugFireTimeline.passes.map((pass) => pass.kind)).toEqual([
      "base",
      "base",
      "base",
      "target",
      "meas",
    ]);
    expect(bugFireTimeline.passes.find((pass) => pass.kind === "target")?.date).toBe(item?.target);
    expect(bugFireTimeline.onset?.date).toBe("2026-08-08");
  });
});
