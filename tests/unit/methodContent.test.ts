import { describe, expect, it } from "vitest";

import { formatPercent, percent } from "@/features/cases/cases";
import {
  BENCH,
  BENCH_MAX_DB,
  EVIDENCE,
  formatSignedDb,
  INTERVAL_DOMAIN,
  toPercent,
  PALETTES,
  PIPELINE,
  RAMP,
  SAT_STAGE,
  SEQ_FRAMES,
} from "@/pages/method/methodContent";
import { missionFallback } from "@/features/satellite/mobileFallback";

const shares = (id: string): string[] =>
  EVIDENCE.find((item) => item.id === id)?.group?.rows.map((row) =>
    formatPercent(percent(row.k, row.n)),
  ) ?? [];

describe("toPercent", () => {
  it("places a value on a fixed axis and clamps it to the track", () => {
    expect(toPercent(0, [-3.5, 1.5])).toBe(70);
    expect(toPercent(-5, [-3.5, 1.5])).toBe(0);
    expect(toPercent(3, [-3.5, 1.5])).toBe(100);
    expect(toPercent(1, [2, 2])).toBe(0);
  });
});

describe("formatSignedDb", () => {
  it("uses a real minus sign and keeps two decimals", () => {
    expect(formatSignedDb(-1.34)).toBe("−1.34");
    expect(formatSignedDb(0.17)).toBe("+0.17");
    expect(formatSignedDb(0)).toBe("0.00");
  });
});

describe("Method evidence", () => {
  // The counts must reproduce the shares quoted in FLOOD_EVIDENCE.md.
  it("derives the reported Matam and Barh shares from their cell counts", () => {
    expect(shares("matam")).toEqual(["17.8%", "1.1%"]);
    expect(shares("barh")).toEqual(["87.5%", "32.6%"]);
  });

  it("keeps both Timber Fire intervals across zero and inside the drawn axis", () => {
    const timber = EVIDENCE.find((item) => item.id === "timber")?.intervals ?? [];
    expect(timber).toHaveLength(2);
    for (const { low, high, value } of timber) {
      expect(low).toBeLessThan(0);
      expect(high).toBeGreaterThan(0);
      expect(low).toBeGreaterThanOrEqual(INTERVAL_DOMAIN[0]);
      expect(high).toBeLessThanOrEqual(INTERVAL_DOMAIN[1]);
      expect(value).toBeGreaterThanOrEqual(low);
      expect(value).toBeLessThanOrEqual(high);
    }
  });

  it("fits every benchmark error on the shared dB axis", () => {
    const all = BENCH.flatMap((region) => region.rmse);
    expect(all.every((value) => value > 0 && value <= BENCH_MAX_DB)).toBe(true);
  });
});

// P0 copy pass: a fringe is path length, never a displacement in centimetres.
describe("scientific copy pass", () => {
  const palettes = JSON.stringify(PALETTES);
  const stage = JSON.stringify(SAT_STAGE);

  it("states a phase cycle as path length, never as displacement", () => {
    expect(PALETTES.find(({ title }) => title === "Wrapped phase")?.note).toContain(
      "One full cycle is about 12 cm of change in path length.",
    );
    expect(palettes + stage).not.toMatch(/centimet|ground moved|pending|not yet|don't apply/i);
  });

  it("reads up to five passes, as the backend's ScenePlanner does", () => {
    expect(PIPELINE.find(({ n }) => n === "03")?.tech).toBe(
      "≤ 5 dates · 80 m blocks, power averaged before dB",
    );
  });

  it("shows the HH baseline on the fixed gray scale", () => {
    expect(SEQ_FRAMES[0]?.img).toBe("/cases/qadirabad-base-gray.png");
    expect(SEQ_FRAMES[0]?.ramp).toBe(RAMP.grayDb);
    expect(SEQ_FRAMES[0]?.tag).toContain("−30 → 0 dB");
  });
});

// SPECS-content-pages-v8 §3 "09 Colours": one gray entry for HH and HV, coherence in cividis.
describe("colour key", () => {
  it("shows HH and HV on one fixed gray −30…0 dB", () => {
    const gray = PALETTES.filter(({ title }) => title.startsWith("Backscatter"));
    expect(gray).toHaveLength(1);
    expect(gray[0]).toMatchObject({ bar: RAMP.grayDb, left: "−30 dB", right: "0 dB" });
  });

  it("adds coherence on cividis 0–1", () => {
    expect(PALETTES.find(({ title }) => title === "Coherence")).toMatchObject({
      bar: RAMP.cividis,
      left: "0 · changed",
      right: "1 · alike",
    });
  });
});

describe("satellite stage", () => {
  it("keeps the three SPECS §3 steps that open and close the teardown", () => {
    expect(SAT_STAGE.steps.map(({ kicker }) => kicker)).toEqual([
      "STOWED FOR LAUNCH",
      "DEPLOYED IN ORBIT",
      "LOOKING SIDEWAYS",
    ]);
  });

  it("falls back to the photo only on a phone that can't keep 40 fps", () => {
    expect(missionFallback(390, 30)).toBe(true);
    expect(missionFallback(720, 39.9)).toBe(true);
    expect(missionFallback(390, 55)).toBe(false);
    expect(missionFallback(390, 40)).toBe(false);
    expect(missionFallback(721, 20)).toBe(false);
    expect(missionFallback(1440, 20)).toBe(false);
  });
});
