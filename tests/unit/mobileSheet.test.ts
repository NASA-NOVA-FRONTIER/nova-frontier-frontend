import real from "../fixtures/exploration-qadirabad.json";
import { describe, expect, it } from "vitest";

import { defaultView, dockRows } from "@/features/explore/exploreDock";
import { liveLayers, type LiveLayer } from "@/features/explore/exploreLayers";
import { explorationSchema } from "@/features/explore/exploreSchemas";
import { exploreTimeline } from "@/features/explore/exploreTimeline";
import {
  EXPANDED_FRACTION,
  hasLayerPills,
  layerPills,
  sheetFraction,
  canExpand,
  sheetStep,
  type SheetInput,
} from "@/pages/explorer/mobileSheet";

const view = explorationSchema.parse(real);
const LAYERS = liveLayers(view);
const PASSES = exploreTimeline(view, [], "2026-11-13")?.passes ?? [];

const BASE: SheetInput = {
  story: false,
  moreInfo: false,
  collapsed: false,
  spot: false,
  selection: undefined,
  running: false,
  lensSwitch: false,
  needsPair: false,
  failed: false,
  done: false,
};

const live = (input: Partial<SheetInput>): SheetInput => ({ ...BASE, selection: "live", ...input });

describe("sheetStep: which step the phone sheet shows", () => {
  it("shows nothing on step 1, in the story, on step 7 or with the panel collapsed", () => {
    expect(sheetStep(BASE)).toBeUndefined();
    expect(sheetStep({ ...BASE, spot: true, story: true })).toBeUndefined();
    expect(sheetStep(live({ done: true, moreInfo: true }))).toBeUndefined();
    expect(sheetStep(live({ done: true, collapsed: true }))).toBeUndefined();
  });

  it("follows a live question from the spot to the answer", () => {
    expect(sheetStep({ ...BASE, spot: true })).toBe("spot");
    expect(sheetStep(live({ running: true }))).toBe("wait");
    expect(sheetStep(live({ running: true, lensSwitch: true }))).toBe("lensrun");
    expect(sheetStep(live({ needsPair: true }))).toBe("lensrun");
    expect(sheetStep(live({ done: true }))).toBe("result");
  });

  it("puts any failure on step 8, even after the job is done", () => {
    expect(sheetStep(live({ failed: true }))).toBe("error");
    expect(sheetStep(live({ failed: true, done: true }))).toBe("error");
  });

  it("keeps a measured case in the sheet too", () => {
    expect(sheetStep({ ...BASE, selection: "case" })).toBe("case");
  });
});

describe("sheetFraction", () => {
  it("uses the reference's height per step, and one height when expanded", () => {
    expect(sheetFraction("spot", false)).toBe(0.62);
    expect(sheetFraction("result", false)).toBe(0.46);
    expect(sheetFraction("error", false)).toBe(0.56);
    expect(sheetFraction("wait", true)).toBe(EXPANDED_FRACTION);
  });

  it("keeps the v9 confirm panel at 62 % or less, even when asked to expand", () => {
    expect(canExpand("spot")).toBe(false);
    expect(canExpand("result")).toBe(true);
    expect(sheetFraction("spot", true)).toBe(0.62);
  });
});

describe("layer pills", () => {
  it("show on steps 4–6 only", () => {
    expect(hasLayerPills("result")).toBe(true);
    expect(hasLayerPills("lensrun")).toBe(true);
    expect(hasLayerPills("spot")).toBe(false);
    expect(hasLayerPills("wait")).toBe(false);
    expect(hasLayerPills(undefined)).toBe(false);
  });

  it("read the dock's rows: HH, HV and Δ dB, with the dock's own on state", () => {
    const dock = defaultView(LAYERS, PASSES);
    const pills = layerPills(dockRows(LAYERS, dock.date, dock.pick));
    expect(pills.map((pill) => pill.short)).toEqual(["HH", "HV", "Δ dB"]);
    expect(pills.find((pill) => pill.key === "hh")?.on).toBe(true);
  });

  it("add Rule only when the lens drew its rule layer", () => {
    const rule: LiveLayer = {
      ...(LAYERS[0] as LiveLayer),
      id: "display_flood_signature_flags_dual_darkening",
      kind: "diagnostic",
    };
    const layers = [...LAYERS, rule];
    const dock = defaultView(layers, PASSES);
    const pills = layerPills(dockRows(layers, dock.date, { kind: "layer", id: rule.id }));
    expect(pills.map((pill) => pill.short)).toEqual(["HH", "HV", "Δ dB", "Rule"]);
    expect(pills.find((pill) => pill.key === "rule")?.on).toBe(true);
  });
});
