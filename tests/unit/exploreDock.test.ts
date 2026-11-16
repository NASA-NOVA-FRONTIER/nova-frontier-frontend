import real from "../fixtures/exploration-qadirabad.json";
import insar from "../fixtures/exploration-kumamoto-insar.json";
import { describe, expect, it } from "vitest";

import { defaultView, dockRows, otherLayers, shownLayer } from "@/features/explore/exploreDock";
import {
  changeLayer,
  liveLayers,
  passLayer,
  type LiveLayer,
} from "@/features/explore/exploreLayers";
import { explorationSchema } from "@/features/explore/exploreSchemas";
import { exploreTimeline } from "@/features/explore/exploreTimeline";

const view = explorationSchema.parse(real);
const LAYERS = liveLayers(view);
const timeline = exploreTimeline(view, [], "2026-11-13");
const PASSES = timeline?.passes ?? [];

const layer = (id: string, kind: LiveLayer["kind"] = "layer"): LiveLayer => ({
  id,
  title: id,
  kind,
  units: "dB",
  legend: null,
  valueRange: null,
  colormap: "gray",
  href: `/layers/${id}`,
  bounds: [0, 0, 1, 1],
});

const row = (date: string | undefined, key: string, layers = LAYERS) =>
  dockRows(layers, date, { kind: "pass", pol: "HH" }).find((item) => item.key === key);

describe("passLayer", () => {
  it("picks a pass image by its exact id", () => {
    expect(passLayer(LAYERS, "2026-09-12", "HH")?.id).toBe("display_2026-09-12_HH");
    expect(passLayer(LAYERS, "2026-09-12", "HV")).toBeUndefined();
    expect(passLayer(LAYERS, "2026-10-18", "HH")).toBeUndefined();
  });

  it("accepts a lowercase pol but only matches the uppercase id of the contract", () => {
    expect(passLayer(LAYERS, "2026-07-14", "hv")?.id).toBe("display_2026-07-14_HV");
    expect(passLayer([layer("display_2026-07-14_hh")], "2026-07-14", "hh")).toBeUndefined();
  });

  it("never matches a change or diagnostic layer, whatever its kind", () => {
    const odd = [
      layer("display_change_HH", "observed"),
      layer("display_cross_pol_decline_count_HH", "observed"),
    ];
    for (const date of ["change", "cross_pol_decline_count", "2026-07-14"])
      for (const pol of ["HH", "HV"] as const) expect(passLayer(odd, date, pol)).toBeUndefined();
  });
});

describe("changeLayer", () => {
  it("recognises kind change or the display_change_<POL> id, and prefers HH", () => {
    expect(changeLayer(LAYERS)).toBeUndefined();
    expect(changeLayer([layer("display_change_HV"), layer("display_change_HH")])?.id).toBe(
      "display_change_HH",
    );
    expect(changeLayer([layer("signed_change", "change")])?.id).toBe("signed_change");
    expect(changeLayer([layer("display_change_hh")])).toBeUndefined();
  });
});

describe("dockRows", () => {
  it("12 Sep: HH on, HV off with its reason", () => {
    expect(row("2026-09-12", "hh")).toMatchObject({ enabled: true, on: true });
    expect(row("2026-09-12", "hv")).toMatchObject({
      enabled: false,
      why: "No HV image for this pass",
    });
  });

  it("18 Oct: neither HH nor HV has an image", () => {
    expect(row("2026-10-18", "hh")).toMatchObject({
      enabled: false,
      why: "No HH image for this pass",
    });
    expect(row("2026-10-18", "hv")?.enabled).toBe(false);
  });

  it("Qadirabad: no change, no rule layer (never the brightening one), coherence asks for a pair, land cover TO FILL", () => {
    expect(row("2026-09-12", "change")?.enabled).toBe(false);
    expect(row("2026-09-12", "rule")?.enabled).toBe(false);
    expect(row("2026-09-12", "coherence")).toMatchObject({
      enabled: true,
      chip: "noPair",
      action: { kind: "pair" },
    });
    expect(row("2026-09-12", "landCover")).toMatchObject({ enabled: false, chip: "todo" });
  });

  it("Kumamoto: the coherence row shows the coherence layer", () => {
    const layers = liveLayers(explorationSchema.parse(insar));
    expect(row(undefined, "coherence", layers)).toMatchObject({
      enabled: true,
      action: { kind: "layer", id: "display_coherence_coherence" },
    });
  });

  it("a dual-darkening flags layer turns the rule row on", () => {
    const layers = [...LAYERS, layer("display_flood_signature_flags_dual_darkening", "diagnostic")];
    expect(row("2026-09-12", "rule", layers)?.enabled).toBe(true);
  });
});

describe("otherLayers", () => {
  it("keeps the brightening flags listed and leaves the pass images to the rows", () => {
    expect(otherLayers(LAYERS).map((item) => item.id)).toEqual([
      "display_flood_signature_flags_co_pol_brightening",
    ]);
  });
});

describe("defaultView", () => {
  it("Qadirabad: the target has no image, so the newest HH (12 Sep, pass 3) opens, not the brightening", () => {
    const shown = defaultView(LAYERS, PASSES);
    expect(shown).toEqual({ pick: { kind: "pass", pol: "HH" }, date: "2026-09-12" });
    expect(shownLayer(LAYERS, shown.pick, shown.date)?.id).toBe("display_2026-09-12_HH");
  });

  it("opens the target's HH when it exists", () => {
    const layers = [...LAYERS, layer("display_2026-11-11_HH")];
    expect(defaultView(layers, PASSES).date).toBe("2026-11-11");
  });

  it("without pass images it keeps the older default (coherence for ground motion)", () => {
    const layers = liveLayers(explorationSchema.parse(insar));
    expect(defaultView(layers, []).pick).toEqual({
      kind: "layer",
      id: "display_coherence_coherence",
    });
  });
});

describe("shownLayer", () => {
  it("a pass with no image shows nothing, never another date", () => {
    expect(shownLayer(LAYERS, { kind: "pass", pol: "HH" }, "2026-10-18")).toBeUndefined();
  });
});
