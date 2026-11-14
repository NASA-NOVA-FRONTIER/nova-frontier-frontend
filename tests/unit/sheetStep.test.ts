import { describe, expect, it } from "vitest";

import {
  hasCompactTimeline,
  hasLayerPills,
  SHEET_FRACTION,
  sheetStep,
  type SheetInput,
} from "@/features/mobile/sheetStep";

const live = (over: Partial<NonNullable<SheetInput["live"]>> = {}): SheetInput => ({
  fullScreen: false,
  view: "live",
  noCoverage: false,
  live: { running: false, lensSwitch: false, failed: false, result: false, ...over },
});

describe("sheetStep", () => {
  it("follows the v8 steps from the start card to the lens result", () => {
    expect(sheetStep({ fullScreen: false, view: "start", noCoverage: false })).toBe("find");
    expect(sheetStep({ fullScreen: false, view: "spot", noCoverage: false })).toBe("spot");
    expect(sheetStep({ fullScreen: false, view: "spot", noCoverage: true })).toBe("nodata");
    expect(sheetStep(live({ running: true }))).toBe("wait");
    expect(sheetStep(live())).toBe("raw");
    expect(sheetStep(live({ running: true, lensSwitch: true }))).toBe("lensrun");
    expect(sheetStep(live({ result: true }))).toBe("result");
  });

  it("shows an error over everything else in a live answer", () => {
    expect(sheetStep(live({ failed: true, running: true }))).toBe("error");
  });

  it("keeps a measured case as its own sheet", () => {
    expect(sheetStep({ fullScreen: false, view: "case", noCoverage: false })).toBe("case");
  });

  it("hands the screen to the story and the More information sheet", () => {
    expect(sheetStep({ ...live({ result: true }), fullScreen: true })).toBe("none");
  });
});

describe("what sits around the sheet", () => {
  it("uses the design's share of the screen per step", () => {
    expect(SHEET_FRACTION.spot).toBe(0.5);
    expect(SHEET_FRACTION.nodata).toBe(0.42);
    expect(SHEET_FRACTION.error).toBe(0.56);
  });

  it("puts the compact timeline on steps 3–6 and the layer pills on steps 4–6", () => {
    expect(hasCompactTimeline("wait")).toBe(true);
    expect(hasCompactTimeline("spot")).toBe(false);
    expect(hasLayerPills("wait")).toBe(false);
    expect(["raw", "lensrun", "result"].every((step) => hasLayerPills(step as "raw"))).toBe(true);
  });
});
