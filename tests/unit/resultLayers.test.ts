// The v9 layer switch against the backend's real layer ids: the three exploration answers the app
// saved, plus the gateway jobs for San Marcos (flood with both signatures) and Rowe Creek.
import kumamoto from "../fixtures/exploration-kumamoto-insar.json";
import qadirabad from "../fixtures/exploration-qadirabad.json";
import seattle from "../fixtures/exploration-Seattle-wildfire.json";
import sanMarcos from "../fixtures/modal-job-flood-san-marcos-optical.json";
import roweFire from "../fixtures/modal-job-wildfire-rowe-creek-pr23.json";
import roweVegetation from "../fixtures/modal-job-vegetation-rowe-creek-pr23.json";
import { describe, expect, it } from "vitest";

import type { TimelinePass } from "@/features/cases/cases";
import { liveLayers, type LiveLayer } from "@/features/explore/exploreLayers";
import { explorationSchema } from "@/features/explore/exploreSchemas";
import {
  defaultResultView,
  isV9Lens,
  layerOptions,
  selectedOption,
} from "@/features/result/resultLayers";

const fromView = (raw: unknown): LiveLayer[] => liveLayers(explorationSchema.parse(raw));

// Gateway jobs carry ids only; that is all the switch reads.
const fromIds = (job: { result: { layers: { id: string }[] } }): LiveLayer[] =>
  job.result.layers.map(({ id }) => ({
    id,
    title: id,
    kind: "layer",
    units: "",
    legend: null,
    valueRange: null,
    colormap: "",
    href: `/layers/${id}`,
    bounds: [0, 0, 1, 1],
  }));

const picks = (options: ReturnType<typeof layerOptions>) =>
  options.map(({ id, pick }) => [id, pick?.kind === "layer" ? pick.id : (pick?.pol ?? null)]);

describe("layerOptions", () => {
  it("flood on Qadirabad: HH passes, no baseline change and no dual-darkening layer", () => {
    expect(picks(layerOptions("flood_wetland", fromView(qadirabad)))).toEqual([
      ["hh", "HH"],
      ["change", null],
      // Only co_pol_brightening came back: never offered as the darkening signature.
      ["sig", null],
    ]);
  });

  it("flood on San Marcos: the baseline change, not the pair change, and dual darkening", () => {
    expect(picks(layerOptions("flood_wetland", fromIds(sanMarcos)))).toEqual([
      ["hh", "HH"],
      ["change", "display_baseline_change_HH"],
      ["sig", "display_flood_signature_flags_dual_darkening"],
    ]);
  });

  it("wildfire on Seattle reads ids, not the stale kinds the answer carries", () => {
    expect(picks(layerOptions("wildfire", fromView(seattle.exploration)))).toEqual([
      ["hv", "HV"],
      ["hvdrop", "display_baseline_change_HV"],
    ]);
  });

  it("wildfire and vegetation on Rowe Creek", () => {
    for (const [lens, job] of [
      ["wildfire", roweFire],
      ["vegetation_disturbance", roweVegetation],
    ] as const)
      expect(picks(layerOptions(lens, fromIds(job)))).toEqual([
        ["hv", "HV"],
        ["hvdrop", "display_baseline_change_HV"],
      ]);
  });

  it("earthquake on Kumamoto: coherence and wrapped phase", () => {
    expect(picks(layerOptions("insar", fromView(kumamoto)))).toEqual([
      ["coh", "display_coherence_coherence"],
      ["phase", "display_wrapped_phase_rad_wrapped_phase_rad"],
    ]);
  });

  it("coherence never takes a coherence-contrast layer", () => {
    const layers = fromIds({
      result: { layers: [{ id: "display_coherence_contrast_1" }, { id: "display_x" }] },
    });
    expect(layerOptions("insar", layers)[0]?.pick).toBeUndefined();
  });

  it("labels come from copyV9, the change layer against the baseline median", () => {
    expect(layerOptions("flood_wetland", []).map(({ label }) => label)).toEqual([
      "HH",
      "Change vs baseline median",
      "Darkening signature",
    ]);
  });
});

describe("defaultResultView", () => {
  const passes = (dates: string[]): TimelinePass[] =>
    dates.map((date, index) => ({ date, kind: index === dates.length - 1 ? "target" : "base" }));

  it("opens each lens on its first layer, a pass channel on the target", () => {
    expect(
      defaultResultView(
        "wildfire",
        fromView(seattle.exploration),
        passes(["2026-09-18", "2026-10-24"]),
      ),
    ).toEqual({ pick: { kind: "pass", pol: "HV" }, date: "2026-10-24" });
    expect(defaultResultView("insar", fromView(kumamoto), [])).toEqual({
      pick: { kind: "layer", id: "display_coherence_coherence" },
      date: undefined,
    });
  });

  it("a target with no image for the channel opens on the newest pass that has one", () => {
    // Qadirabad's target 12 Sep has HH only; HV exists on 14 Jul and 19 Aug.
    const layers = fromView(qadirabad);
    const view = defaultResultView(
      "wildfire",
      layers,
      passes(["2026-07-14", "2026-08-19", "2026-09-12"]),
    );
    expect(view).toEqual({ pick: { kind: "pass", pol: "HV" }, date: "2026-08-19" });
  });

  it("finds the option for a pick, and none for a layer outside the switch", () => {
    const options = layerOptions("flood_wetland", fromIds(sanMarcos));
    expect(selectedOption(options, { kind: "pass", pol: "HH" })?.id).toBe("hh");
    expect(
      selectedOption(options, { kind: "layer", id: "display_flood_signature_flags_dual_darkening" })
        ?.id,
    ).toBe("sig");
    expect(selectedOption(options, { kind: "layer", id: "display_change_HH" })).toBeUndefined();
  });
});

describe("isV9Lens", () => {
  it("the four live lenses; agriculture keeps the v8 card", () => {
    expect(isV9Lens("flood_wetland")).toBe(true);
    expect(isV9Lens("insar")).toBe(true);
    expect(isV9Lens("agriculture")).toBe(false);
  });
});
