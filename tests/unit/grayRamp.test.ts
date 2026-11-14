import { describe, expect, it } from "vitest";

import { dbToGray, GRAY_DB_RANGE, powerToDb } from "@/features/cases/grayRamp";

describe("dbToGray", () => {
  it("maps the fixed −30…0 dB range to black…white", () => {
    expect(GRAY_DB_RANGE).toEqual([-30, 0]);
    expect(dbToGray(-30)).toBe(0);
    expect(dbToGray(-15)).toBe(128);
    expect(dbToGray(0)).toBe(255);
  });

  // The Qadirabad baseline reaches +7.8 dB over towns and −19 dB on water: both stay on the scale.
  it("clips values outside the range instead of stretching to the data", () => {
    expect(dbToGray(7.8)).toBe(255);
    expect(dbToGray(-45)).toBe(0);
  });

  it("gives a gap no gray, so it is drawn transparent rather than black", () => {
    expect(dbToGray(Number.NaN)).toBeUndefined();
  });
});

describe("powerToDb", () => {
  it("converts linear power to dB", () => {
    expect(powerToDb(1)).toBe(0);
    expect(powerToDb(0.001)).toBeCloseTo(-30);
  });
});
