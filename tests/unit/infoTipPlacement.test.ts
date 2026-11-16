import { describe, expect, it } from "vitest";

import { INFO_TIP_GAP, INFO_TIP_MARGIN, placeInfoTip } from "@/lib/infoTipPlacement";

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };
const button = (left: number, top: number) => ({ left, top, width: 20, height: 20 });

describe("placeInfoTip", () => {
  it("sits below the button, centred on it, 280 px wide", () => {
    const p = placeInfoTip({ anchor: button(600, 100), tipHeight: 90, viewport: desktop });
    expect(p).toEqual({ side: "below", top: 120 + INFO_TIP_GAP, left: 610 - 140, width: 280 });
  });

  it("flips above when the measured height doesn't fit below", () => {
    const p = placeInfoTip({ anchor: button(600, 840), tipHeight: 90, viewport: desktop });
    expect(p.side).toBe("above");
    expect(p.top).toBe(840 - INFO_TIP_GAP - 90);
  });

  it("stays below near the bottom when a short tip still fits", () => {
    // 900 - 8 - (800 + 20 + 8) = 64 px of room: a 60 px tip fits, so no flip.
    const p = placeInfoTip({ anchor: button(600, 800), tipHeight: 60, viewport: desktop });
    expect(p.side).toBe("below");
  });

  it("keeps the larger side when neither fits", () => {
    const short = { width: 390, height: 200 };
    expect(placeInfoTip({ anchor: button(100, 60), tipHeight: 300, viewport: short }).side).toBe(
      "below",
    );
    expect(placeInfoTip({ anchor: button(100, 140), tipHeight: 300, viewport: short }).side).toBe(
      "above",
    );
  });

  it("clamps to the left edge", () => {
    const p = placeInfoTip({ anchor: button(0, 100), tipHeight: 90, viewport: desktop });
    expect(p.left).toBe(INFO_TIP_MARGIN);
  });

  it("clamps to the right edge", () => {
    const p = placeInfoTip({ anchor: button(1420, 100), tipHeight: 90, viewport: desktop });
    expect(p.left + p.width).toBe(1440 - INFO_TIP_MARGIN);
  });

  it("keeps 280 px on a 390 px phone and stays inside it", () => {
    const p = placeInfoTip({ anchor: button(360, 100), tipHeight: 90, viewport: phone });
    expect(p.width).toBe(280);
    expect(p.left).toBeGreaterThanOrEqual(INFO_TIP_MARGIN);
    expect(p.left + p.width).toBeLessThanOrEqual(390 - INFO_TIP_MARGIN);
  });

  it("shrinks to the viewport minus its margins when narrower than 296 px", () => {
    const p = placeInfoTip({
      anchor: button(100, 100),
      tipHeight: 90,
      viewport: { width: 240, height: 600 },
    });
    expect(p).toMatchObject({ width: 240 - 2 * INFO_TIP_MARGIN, left: INFO_TIP_MARGIN });
  });
});
