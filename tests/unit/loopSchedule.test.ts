import { describe, expect, it } from "vitest";

import {
  crossfadeFor,
  EQUAL_POWER_CURVES,
  LOOP_CROSSFADE_SECONDS,
  planPass,
  type LoopPass,
} from "@/features/music/loopSchedule";

// The real lengths of the shipped tracks, plus a short one that forces a smaller crossfade.
const STARFIRE_SECONDS = 325.224;
const SOLACE_SECONDS = 340.846;
const SHORT_SECONDS = 20;
const FIRST_START = 0.05;
const SAMPLE_STEP = 0.05;
const PASSES = 6;
const POWER_TOLERANCE = 1e-3;

// What the browser does with a value curve: straight lines between its points.
const curveAt = (curve: Float32Array, fraction: number): number => {
  const position = fraction * (curve.length - 1);
  const low = Math.floor(position);
  const high = Math.min(low + 1, curve.length - 1);
  const lowValue = curve[low] ?? 0;
  const highValue = curve[high] ?? 0;
  return lowValue + (highValue - lowValue) * (position - low);
};

const gainAt = (pass: LoopPass, crossfade: number, time: number): number => {
  if (time < pass.start || time >= pass.stopAt) return 0;
  if (pass.fadeInAt !== null && time < pass.fadeInAt + crossfade) {
    return curveAt(EQUAL_POWER_CURVES.fadeIn, (time - pass.fadeInAt) / crossfade);
  }
  if (time >= pass.fadeOutAt) {
    return curveAt(EQUAL_POWER_CURVES.fadeOut, (time - pass.fadeOutAt) / crossfade);
  }
  return 1;
};

const passes = (duration: number): LoopPass[] =>
  Array.from({ length: PASSES }, (_, index) =>
    planPass({ index, firstStart: FIRST_START, duration }),
  );

describe("crossfadeFor", () => {
  it("uses the full crossfade on a long track", () => {
    expect(crossfadeFor(STARFIRE_SECONDS)).toBe(LOOP_CROSSFADE_SECONDS);
  });

  it("shrinks it on a short track so the two fades never meet", () => {
    expect(crossfadeFor(SHORT_SECONDS)).toBe(SHORT_SECONDS / 4);
  });
});

describe("planPass", () => {
  it("starts the first pass where asked, with no fade in", () => {
    // Arrange / Act
    const pass = planPass({ index: 0, firstStart: FIRST_START, duration: STARFIRE_SECONDS });

    // Assert
    expect(pass.start).toBe(FIRST_START);
    expect(pass.fadeInAt).toBeNull();
    expect(pass.stopAt).toBeCloseTo(FIRST_START + STARFIRE_SECONDS, 6);
    expect(pass.fadeOutAt).toBeCloseTo(pass.stopAt - LOOP_CROSSFADE_SECONDS, 6);
  });

  it("starts each next pass as the previous one begins to fade out", () => {
    // Arrange / Act
    const [first, second, third] = passes(STARFIRE_SECONDS);

    // Assert
    expect(second?.start).toBeCloseTo(first?.fadeOutAt ?? Number.NaN, 6);
    expect(third?.start).toBeCloseTo(second?.fadeOutAt ?? Number.NaN, 6);
  });

  it("fades every later pass in over the span the previous one fades out", () => {
    // Arrange / Act
    const [first, second] = passes(STARFIRE_SECONDS);

    // Assert
    expect(second?.fadeInAt).toBeCloseTo(second?.start ?? Number.NaN, 6);
    expect(second?.start).toBeCloseTo(first?.fadeOutAt ?? Number.NaN, 6);
    expect(first?.stopAt).toBeCloseTo((second?.start ?? 0) + LOOP_CROSSFADE_SECONDS, 6);
  });
});

describe("the loop never goes quiet or loud at the seam", () => {
  it.each([
    ["Starfire", STARFIRE_SECONDS],
    ["Solace", SOLACE_SECONDS],
    ["a short track", SHORT_SECONDS],
  ])("keeps the power constant across %s's passes", (_name, duration) => {
    // Arrange
    const crossfade = crossfadeFor(duration);
    const timeline = passes(duration);
    const end = FIRST_START + (PASSES - 2) * (duration - crossfade);
    const worst = { low: Number.POSITIVE_INFINITY, high: Number.NEGATIVE_INFINITY };

    // Act
    for (let time = FIRST_START; time < end; time += SAMPLE_STEP) {
      const power = timeline.reduce((sum, pass) => sum + gainAt(pass, crossfade, time) ** 2, 0);
      worst.low = Math.min(worst.low, power);
      worst.high = Math.max(worst.high, power);
    }

    // Assert
    expect(worst.low).toBeGreaterThan(1 - POWER_TOLERANCE);
    expect(worst.high).toBeLessThan(1 + POWER_TOLERANCE);
  });

  it("starts and ends each fade curve at exactly silence and full level", () => {
    const { fadeIn, fadeOut } = EQUAL_POWER_CURVES;
    expect(fadeIn[0]).toBe(0);
    expect(fadeIn[fadeIn.length - 1]).toBeCloseTo(1, 6);
    expect(fadeOut[0]).toBeCloseTo(1, 6);
    expect(fadeOut[fadeOut.length - 1]).toBeCloseTo(0, 6);
  });
});
