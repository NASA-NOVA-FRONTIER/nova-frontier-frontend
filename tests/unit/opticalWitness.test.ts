import real from "../fixtures/exploration-qadirabad.json";
import sanMarcos from "../fixtures/lens-flood-san-marcos.json";
import { describe, expect, it } from "vitest";

import {
  explorationSchema,
  lensEvaluationOf,
  sensorOf,
  type LensEvaluation,
  type WaterComparison,
} from "@/features/explore/exploreSchemas";
import { floodDrivers } from "@/features/lenses/drivers";
import { witnessOf } from "@/features/lenses/opticalWitnessView";
import { formatDay } from "@/features/timeline/timelineLayout";

const result = explorationSchema.parse(real).result;
if (result === null) throw new Error("fixture has a result");
const EVALUATION = lensEvaluationOf(result);
if (EVALUATION === undefined) throw new Error("fixture has an evaluation");

// Barh optical groups from docs/design/v8/DATA_PROVENANCE-v8.md (REAL job water_comparison).
const BARH: WaterComparison = {
  status: "evaluated",
  reason: undefined,
  pre: { date: "2026-07-26", sensor: "Landsat 8" },
  post: { date: "2026-09-13", sensor: "Sentinel-2B" },
  groups: [
    { id: "new_open_water", cells: 2702, signatureCells: 2468 },
    { id: "stable_open_water", cells: 506, signatureCells: 232 },
    { id: "stable_nonwater", cells: 1226, signatureCells: 1 },
    { id: "mixed_or_partial", cells: 995, signatureCells: 299 },
  ],
  matchedPairs: 171,
  coPolContrast: { meanDb: -8.39, intervalDb: [-9.1, -7.58] },
  pointState: "insufficient_data",
  pointGroupCode: undefined,
};

// Daniel's San Marcos job (cf3e5f2d…): OPERA evaluated, no cell turned to water.
const SAN_MARCOS = lensEvaluationOf(
  explorationSchema.parse({ ...real, result: { ...real.result, lens: sanMarcos.lens } }).result ??
    result,
);
if (SAN_MARCOS === undefined) throw new Error("San Marcos has an evaluation");

const withWater = (water: Partial<WaterComparison> | undefined): LensEvaluation => ({
  ...EVALUATION,
  water: water && { ...BARH, ...water },
});

describe("lensEvaluationOf · water_comparison", () => {
  it("reads the real unavailable answer and the confounders", () => {
    expect(EVALUATION.water).toMatchObject({
      status: "insufficient_data",
      reason: "optical_evidence_unavailable",
      groups: undefined,
    });
    expect(EVALUATION.confounders.map(({ id }) => id)).toContain("wind");
  });
});

describe("lensEvaluationOf · the real San Marcos water_comparison", () => {
  it("maps the groups object, the epochs, the point and the matched comparison", () => {
    expect(SAN_MARCOS.water).toEqual({
      status: "evaluated",
      reason: undefined,
      pre: { date: "2026-09-24", sensor: "Sentinel-2C" },
      post: { date: "2026-10-19", sensor: "Sentinel-2A" },
      groups: [
        { id: "stable_nonwater", cells: 221, signatureCells: 12 },
        { id: "new_open_water", cells: 0, signatureCells: 0 },
        { id: "stable_open_water", cells: 0, signatureCells: 0 },
        { id: "open_water_loss", cells: 0, signatureCells: 0 },
        { id: "mixed_or_partial", cells: 17, signatureCells: 0 },
      ],
      // `insufficient_data` there, so no whisker numbers.
      matchedPairs: undefined,
      coPolContrast: undefined,
      pointState: "contradicts",
      pointGroupCode: 0,
    });
  });

  it("reads the satellite from the DSWx-HLS product id, or nothing", () => {
    expect(sensorOf("OPERA_L3_DSWx-HLS_T18PVQ_20260924T152651Z_20260928T231505Z_S2C_30_v1.1")).toBe(
      "Sentinel-2C",
    );
    expect(sensorOf("OPERA_L3_DSWx-HLS_T44RPR_20260726T050000Z_20260728T000000Z_L8_30_v1.1")).toBe(
      "Landsat 8",
    );
    expect(sensorOf("something_else")).toBeUndefined();
    expect(sensorOf(undefined)).toBeUndefined();
  });

  it("keeps the whisker numbers when the matched comparison was evaluated", () => {
    const { evaluation } = sanMarcos.lens;
    const lens = {
      ...sanMarcos.lens,
      evaluation: {
        ...evaluation,
        water_comparison: {
          ...evaluation.water_comparison,
          matched_new_water_comparison: {
            status: "evaluated",
            reason: null,
            matches: { matched_positive_pixels: 171 },
            channels: {
              HH: { mean_contrast_db: -8.39, spatial_resampling_95_interval_db: [-9.1, -7.58] },
            },
          },
        },
      },
    };
    const view = explorationSchema.parse({ ...real, result: { ...real.result, lens } });
    const water = view.result === null ? undefined : lensEvaluationOf(view.result)?.water;
    expect(water?.matchedPairs).toBe(171);
    expect(water?.coPolContrast).toEqual({ meanDb: -8.39, intervalDb: [-9.1, -7.58] });
  });
});

describe("witnessOf", () => {
  it("is READY on San Marcos with no new water: lead, snapshots, rows, point, no whisker", () => {
    const witness = witnessOf(SAN_MARCOS, false);
    if (witness?.state !== "ready") throw new Error("ready");
    expect(witness.lead).toBe(
      `Optical images show no new open water between 24 Sep and ${formatDay("2026-10-19", false)}; 12 of 221 cells that stayed dry meet the radar rule.`,
    );
    expect(witness.snapshots).toBe(
      `Sentinel-2C ${formatDay("2026-09-24")} → Sentinel-2A ${formatDay("2026-10-19")}`,
    );
    expect(witness.bars.rows.map(({ label, k, n }) => [label, k, n])).toEqual([
      ["Stayed dry", 12, 221],
      ["Mixed or partial", 0, 17],
    ]);
    expect(witness.whisker).toBeUndefined();
    expect(witness.point).toBe("At your pixel's optical cell: stayed dry.");
  });

  it("shows only the dates when the product id names no satellite", () => {
    const witness = witnessOf(
      withWater({
        pre: { date: "2026-07-26", sensor: undefined },
        post: { date: "2026-09-13", sensor: "Sentinel-2B" },
      }),
      false,
    );
    expect(witness?.state === "ready" && witness.snapshots).toBe(
      `${formatDay("2026-07-26")} → ${formatDay("2026-09-13")}`,
    );
  });

  it("adds the receded row and words when open water was lost", () => {
    const witness = witnessOf(
      withWater({
        groups: [...(BARH.groups ?? []), { id: "open_water_loss", cells: 40, signatureCells: 3 }],
        pointGroupCode: 3,
      }),
      false,
    );
    if (witness?.state !== "ready") throw new Error("ready");
    expect(witness.bars.rows.map(({ label }) => label)).toEqual([
      "New open water",
      "Water on both dates",
      "Stayed dry",
      "Open water receded",
      "Mixed or partial",
    ]);
    expect(witness.point).toBe("At your pixel's optical cell: open water receded.");
  });

  it("hides the witness when no group can lead it", () => {
    expect(
      witnessOf(
        withWater({ groups: [{ id: "mixed_or_partial", cells: 9, signatureCells: 1 }] }),
        false,
      ),
    ).toBeUndefined();
  });

  it("is UNAVAILABLE with the COPY sentence for a missing snapshot, and bare for a service failure", () => {
    const noSnapshot = { status: "insufficient_data", reason: "no_optical_candidate_in_window" };
    expect(witnessOf(withWater(noSnapshot), false)).toEqual({
      state: "unavailable",
      text: "No OPERA snapshot with enough clear cells within 4 days of the radar dates. The radar result stands on its own.",
    });
    const failure = { status: "insufficient_data", reason: "optical_worker_error" };
    expect(witnessOf(withWater(failure), false)).toEqual({ state: "unavailable", text: undefined });
  });

  it("is UNAVAILABLE on the real Qadirabad answer, with the COPY sentence", () => {
    expect(witnessOf(EVALUATION, false)).toEqual({
      state: "unavailable",
      text: "No OPERA snapshot with enough clear cells within 4 days of the radar dates. The radar result stands on its own.",
    });
  });

  it("is PENDING while the backend still looks for snapshots", () => {
    expect(witnessOf(withWater({ status: "pending" }), true)?.state).toBe("pending");
  });

  it("is PENDING with no comparison yet only while the job runs", () => {
    expect(witnessOf(withWater(undefined), true)?.state).toBe("pending");
    expect(witnessOf(withWater(undefined), false)).toBeUndefined();
  });

  it("is READY on Barh: 9 in 10 agree and the dry group stays under 5 %", () => {
    const witness = witnessOf(withWater({}), false);
    if (witness?.state !== "ready") throw new Error("ready");
    expect(witness.lead).toBe(
      "Optical images agree: 9 in 10 cells that turned to water also meet the radar rule. Cells that stayed dry almost never do.",
    );
    expect(witness.bars.rows.map(({ k, n }) => [k, n])).toEqual([
      [2468, 2702],
      [232, 506],
      [1, 1226],
      [299, 995],
    ]);
    expect(witness.whisker?.n).toBe(
      "New-water cells minus matched dry cells, 171 pairs · 95% spatial interval",
    );
    expect(witness.point).toBe("At your pixel's optical cell: not enough clear view.");
  });

  it("says 'partly agree' under 5 in 10", () => {
    const witness = witnessOf(
      withWater({ groups: [{ id: "new_open_water", cells: 100, signatureCells: 30 }] }),
      false,
    );
    expect(witness?.state === "ready" && witness.lead).toBe(
      "Optical images partly agree: 3 in 10 cells that turned to water also meet the radar rule.",
    );
  });

  it("hides a status it has no words for", () => {
    expect(witnessOf(withWater({ status: "something_new" }), false)).toBeUndefined();
  });
});

describe("floodDrivers", () => {
  it("gives Barh FITS BEST, PARTLY and WEAK from the groups alone", () => {
    const view = floodDrivers(withWater({}));
    expect(view?.drivers.map(({ id, fit }) => [id, fit])).toEqual([
      ["flooding", "fitsBest"],
      ["existingWater", "partly"],
      ["wetSoil", "weak"],
    ]);
    expect(view?.drivers[0]?.for).toBe(
      // formatDay's en-GB month ("Sep" or "Sept") depends on the runtime's ICU.
      `Optical shows 2,702 cells turned to open water between 26 Jul and ${formatDay("2026-09-13", false)}; 91% of them meet the radar rule.`,
    );
    expect(view?.drivers[2]?.for).toBe("Radar darkened 1 cell that optical shows stayed dry.");
    expect(view?.drivers[2]?.against).toBe("That is 0.1% of the stayed-dry cells.");
  });

  it("lists the unchecked confounders in the footer, not the ones the cards cover", () => {
    expect(floodDrivers(withWater({}))?.footer).toBe(
      "A river gauge, rain record or field report would settle it. Not checked here: freeze and thaw, wind on water, look angle, speckle, terrain shadow.",
    );
  });

  it("drops FITS BEST when too many stayed-dry cells meet the rule", () => {
    const view = floodDrivers(
      withWater({
        groups: [
          { id: "new_open_water", cells: 100, signatureCells: 90 },
          { id: "stable_nonwater", cells: 100, signatureCells: 10 },
        ],
      }),
    );
    expect(view).toBeUndefined();
  });

  it("shows nothing on San Marcos: 5.4 % of stayed-dry cells meet the rule, no new or stable water", () => {
    expect(floodDrivers(SAN_MARCOS)).toBeUndefined();
  });

  it("gives each rule its own synthetic case", () => {
    const fits = (groups: WaterComparison["groups"]) =>
      floodDrivers(withWater({ groups }))?.drivers.map(({ id, fit }) => [id, fit]);
    expect(
      fits([
        { id: "new_open_water", cells: 100, signatureCells: 80 },
        { id: "stable_nonwater", cells: 100, signatureCells: 4 },
      ]),
    ).toEqual([["flooding", "fitsBest"]]);
    expect(fits([{ id: "stable_open_water", cells: 50, signatureCells: 20 }])).toEqual([
      ["existingWater", "partly"],
    ]);
    expect(fits([{ id: "stable_nonwater", cells: 1000, signatureCells: 5 }])).toEqual([
      ["wetSoil", "weak"],
    ]);
  });

  it("hides wet soil when no stayed-dry cell meets the rule: nothing speaks for it", () => {
    expect(
      floodDrivers(
        withWater({ groups: [{ id: "stable_nonwater", cells: 1000, signatureCells: 0 }] }),
      ),
    ).toBeUndefined();
  });

  it("shows nothing without a ready comparison (the real fixture)", () => {
    expect(floodDrivers(EVALUATION)).toBeUndefined();
  });
});
