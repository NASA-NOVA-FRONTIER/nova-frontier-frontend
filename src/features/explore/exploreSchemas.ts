import { z } from "zod";
import { nativeGridSchema, scienceProductsSchema } from "@/features/explore/scienceProducts";

import type { BBox } from "@/features/frames/frame.types";

/*
 * The backend's ExplorationView, checked at the boundary. Nested science blocks (`lens`,
 * `aoiSummary`) keep the ML service's snake_case keys; only the fields the UI reads are listed and
 * the rest passes through. tests/fixtures/exploration-qadirabad.json is a real answer.
 */

const box = z.tuple([z.number(), z.number(), z.number(), z.number()]);
const perChannel = z.record(z.string(), z.number().nullable());

export const FINAL_STATUSES = ["succeeded", "partial", "noData", "failed", "cancelled"] as const;
export const ACTIVE_STATUSES = ["queued", "running"] as const;

const stageSchema = z.object({
  name: z.enum(["planning", "processing", "reading", "analysing", "rendering"]),
  state: z.enum(["done", "running", "pending"]),
  seconds: z.number().nullable(),
  budgetSeconds: z.number().nullable(),
});

const layerSchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  units: z.string(),
  colormap: z.string(),
  bounds: box,
  url: z.string(),
  legend: z.record(z.string(), z.string()).nullable(),
  valueRange: z.tuple([z.number(), z.number()]).nullable(),
  crs: z.string().nullish(),
  grid: nativeGridSchema.nullish(),
  dates: z.array(z.string()).nullish(),
});

const sceneSchema = z.object({
  granuleId: z.string(),
  acquiredAt: z.string(),
  track: z.number(),
  direction: z.string(),
  frame: z.number(),
  mode: z.string(),
  maturity: z.string(),
  configuration: z.string(),
});

// The lens's evaluation (flood today). Every block is optional and falls back to undefined when it
// doesn't parse, so one odd block hides its section instead of failing the whole answer.
const signatureSchema = z.looseObject({
  state: z.string(),
  fraction: z.number().nullable().optional(),
  signature_cells: z.number(),
  supported_cells: z.number(),
});

const surroundingSchema = z.looseObject({
  status: z.string(),
  reason: z.string().nullable().optional(),
  focal_cells: z.number().optional(),
  minimum_cells: z.number().optional(),
  surrounding_cells: z.number().optional(),
  focal_radius_m: z.number().optional(),
  comparison_annulus_m: z.tuple([z.number(), z.number()]).optional(),
  matches: z
    .looseObject({ matched_control_pixels: z.number() })
    .nullable()
    .optional()
    .catch(undefined),
  differential_darkening: z
    .looseObject({ state: z.string(), reason: z.string().nullable().optional() })
    .nullable()
    .optional()
    .catch(undefined),
});

const neighborhoodSchema = z.looseObject({
  status: z.string(),
  focal_radius_m: z.number().optional(),
  comparison_annulus_m: z.tuple([z.number(), z.number()]).optional(),
  focal_cells: z.number().optional(),
  comparison_cells: z.number().optional(),
});

const targetContrastSchema = z.looseObject({
  state: z.string(),
  reason: z.string().nullable().optional(),
  positive_pixels: z.number().optional(),
  mean_contrast_db: z.number(),
  spatial_resampling_95_interval_db: z.tuple([z.number(), z.number()]).nullable().optional(),
});

// OPERA optical second witness (#22), as nova-frontier-model `flood_lens.py` writes it
// (`optical_comparison` + `with_evidence`); checked against Daniel's San Marcos job cf3e5f2d…
// Each block drops on its own when it doesn't parse, so the UI hides it instead of guessing.
const opticalEpochSchema = z.looseObject({
  date: z.string(),
  source_id: z.string().nullable().optional(),
});

// One OPERA group (`stable_nonwater`, `new_open_water`, …); the flood rule's cells are
// `dual_darkening_cells`.
const opticalGroupSchema = z.looseObject({
  cells: z.number(),
  dual_darkening_cells: z.number(),
});

const matchedChannelSchema = z.looseObject({
  mean_contrast_db: z.number(),
  spatial_resampling_95_interval_db: z.tuple([z.number(), z.number()]),
});

const waterComparisonSchema = z.looseObject({
  status: z.string(),
  reason: z.string().nullable().optional(),
  epochs: z
    .looseObject({
      pre: opticalEpochSchema.optional().catch(undefined),
      post: opticalEpochSchema.optional().catch(undefined),
    })
    .nullable()
    .optional()
    .catch(undefined),
  groups: z.record(z.string(), opticalGroupSchema).nullable().optional().catch(undefined),
  matched_new_water_comparison: z
    .looseObject({
      status: z.string(),
      matches: z
        .looseObject({ matched_positive_pixels: z.number().nullable().optional() })
        .nullable()
        .optional()
        .catch(undefined),
      channels: z
        .looseObject({ HH: matchedChannelSchema.optional().catch(undefined) })
        .nullable()
        .optional()
        .catch(undefined),
    })
    .nullable()
    .optional()
    .catch(undefined),
  point_new_open_water_state: z.string().nullable().optional().catch(undefined),
  point_group_code: z.number().nullable().optional().catch(undefined),
});

const confounderSchema = z.looseObject({ id: z.string(), status: z.string() });

const evaluationSchema = z.looseObject({
  grid: z
    .looseObject({ pixel_spacing_m: z.array(z.number()) })
    .nullable()
    .optional()
    .catch(undefined),
  point: z
    .looseObject({ signature_states: z.record(z.string(), z.string()).optional() })
    .nullable()
    .optional()
    .catch(undefined),
  grid_signatures: z
    .looseObject({
      dual_darkening: signatureSchema.nullable().optional().catch(undefined),
      co_pol_brightening: signatureSchema.nullable().optional().catch(undefined),
    })
    .nullable()
    .optional()
    .catch(undefined),
  signature_policy: z
    .looseObject({
      dual_darkening_max_change_db: z.object({ co: z.number(), cross: z.number() }),
    })
    .nullable()
    .optional()
    .catch(undefined),
  surrounding_comparison: surroundingSchema.nullable().optional().catch(undefined),
  // Agriculture: the 60 m patch against matched cells 120–300 m away, per channel.
  neighborhood: neighborhoodSchema.nullable().optional().catch(undefined),
  matches: z
    .looseObject({ matched_control_pixels: z.number(), matched_fraction: z.number().optional() })
    .nullable()
    .optional()
    .catch(undefined),
  policy: z
    .looseObject({
      minimum_cells: z.number().optional(),
      material_contrast_db: z.number().optional(),
    })
    .nullable()
    .optional()
    .catch(undefined),
  target_contrasts: z
    .record(z.string(), targetContrastSchema.nullable().catch(null))
    .nullable()
    .optional()
    .catch(undefined),
  water_comparison: waterComparisonSchema.nullable().optional().catch(undefined),
  confounders: z.array(confounderSchema).optional().catch(undefined),
});

// Wildfire: how often HV fell below its band, over the grid per assessed pass and at the pixel.
const crossPolHistorySchema = z.looseObject({
  status: z.string(),
  polarization: z.string().optional(),
  samples: z.array(z.looseObject({ date: z.string(), decline_cells: z.number() })),
});

const pixelCrossPolHistorySchema = z.looseObject({
  decline_dates: z.number(),
  assessed_dates: z.number(),
});

const lensSchema = z.looseObject({
  status: z.string(),
  reason: z.string().nullable().optional(),
  target_date: z.string().optional(),
  baseline_dates: z.array(z.string()).optional(),
  assessment_dates: z.array(z.string()).optional(),
  point: z
    .looseObject({
      status: z.string(),
      target_minus_baseline_db: perChannel,
      diagnostic_half_width_db: perChannel,
      cross_pol_history: pixelCrossPolHistorySchema.nullable().optional().catch(undefined),
    })
    .nullable()
    .optional(),
  radar: z
    .looseObject({
      polarizations: z.array(z.string()),
      posting_m: z.number(),
      common_cells: z.number().optional().catch(undefined),
      cross_pol_history: crossPolHistorySchema.nullable().optional().catch(undefined),
    })
    .nullable()
    .optional(),
  evidence: z.looseObject({ status: z.string() }).optional(),
  evaluation: evaluationSchema.nullable().optional().catch(undefined),
});

const aoiSummarySchema = z.looseObject({
  cells_in_area: z.number(),
  cells_with_measurement: z.number(),
  cells_departing_from_baseline: z.number(),
  departing_fraction: z.number().nullable(),
  area_covered_fraction: z.number().nullable().optional(),
  median_target_minus_baseline_db: perChannel.nullable().optional(),
});

const observationSchema = z.looseObject({
  date: z.string(),
  status: z.string(),
  reason: z.string().optional(),
  granule_id: z.string().optional(),
  granule_title: z.string().optional(),
  sensing_start_utc: z.string().optional(),
  grid: nativeGridSchema.optional(),
  point_db: perChannel.optional(),
  valid_pixel_count_by_pol: z.record(z.string(), z.number()).optional(),
});

const insarSchema = z.object({
  pairId: z.string(),
  status: z.string(),
  reason: z.string().nullable(),
  polarization: z.string().nullable(),
  medianCoherence: z.number().nullable(),
  coherenceThreshold: z.number(),
  coherentCells: z.number().nullable(),
  phaseCells: z.number().nullable(),
  windowCells: z.number().nullable(),
  pointCoherence: z.number().nullable(),
  pointWrappedPhaseRad: z.number().nullable(),
  phaseReference: z.string().nullable(),
  correctionsApplied: z.array(z.string()),
  // Always null: the phase is wrapped and uncorrected, so no displacement is reported.
  losDisplacementCm: z.null(),
});

const fireContextSchema = z.object({
  status: z.enum(["available", "unavailable", "notConfigured"]),
  source: z.string(),
  windowStart: z.string().nullable(),
  windowEnd: z.string().nullable(),
  detections: z.number().nullable(),
  lowConfidenceExcluded: z.number().nullable(),
  firstDetection: z.string().nullable(),
  lastDetection: z.string().nullable(),
  peakFrpMw: z.number().nullable(),
  satellites: z.array(z.string()),
  products: z.array(z.string()),
  note: z.string(),
});

const resultSchema = z.object({
  geometry: z.record(z.string(), z.unknown()),
  areaKm2: z.number(),
  windowStart: z.string(),
  windowEnd: z.string(),
  scenes: z.array(sceneSchema),
  observations: z.array(observationSchema),
  lens: lensSchema.nullable(),
  aoiSummary: aoiSummarySchema.nullable(),
  layers: z.array(layerSchema),
  quality: z.record(z.string(), z.unknown()),
  limitations: z.array(z.string()),
  scientificStatus: z.string(),
  timings: z.record(z.string(), z.number()),
  isDemo: z.boolean(),
  // Independent evidence (wildfire lens only), never part of the radar `lens`.
  fireContext: fireContextSchema.nullable().optional(),
  // The interferometric pair's measurements (insar lens only).
  insar: insarSchema.nullable().optional(),
  // Extra More-information data: a shape we don't expect drops only these panels,
  // never the whole live answer.
  products: scienceProductsSchema.nullish().catch(undefined),
});

export const explorationSchema = z.object({
  id: z.string(),
  status: z.enum([...ACTIVE_STATUSES, ...FINAL_STATUSES]),
  stage: z.string(),
  lens: z.string(),
  source: z.string(),
  cache: z.enum(["miss", "hit"]),
  etaSeconds: z.number().nullable(),
  etaRemainingSeconds: z.number().nullable(),
  elapsedSeconds: z.number(),
  stages: z.array(stageSchema),
  progress: z.object({ scenesRead: z.number().nullable(), scenesTotal: z.number() }).nullable(),
  // Backend #6: analyses ahead of this one while it is queued (0 when running). Absent until then.
  queuePosition: z.number().int().nonnegative().nullish(),
  plan: z
    .object({
      status: z.string(),
      seriesKey: z.string().nullable(),
      dates: z.array(z.string()),
      maturityMixed: z.boolean(),
      notes: z.array(z.string()),
    })
    .nullable(),
  result: resultSchema.nullable(),
  error: z.object({ reasonCode: z.string(), detail: z.string() }).nullable(),
});

export type ExplorationView = z.infer<typeof explorationSchema>;
export type ExplorationResult = NonNullable<ExplorationView["result"]>;
export type InsarSummary = NonNullable<ExplorationResult["insar"]>;
export type FireContext = NonNullable<ExplorationResult["fireContext"]>;
export type ExplorationLayer = ExplorationResult["layers"][number];
export type ExplorationStage = ExplorationView["stages"][number];

export const isFinal = (status: ExplorationView["status"]): boolean =>
  (FINAL_STATUSES as readonly string[]).includes(status);

export const layerBox = (layer: ExplorationLayer): BBox => layer.bounds;

/*
 * The lens evaluation as the UI reads it, in camelCase. Backend #11 is moving these keys to
 * camelCase: when it lands, only the schemas above and this mapping change.
 */
export type Signature = {
  state: string;
  fraction: number | undefined;
  signatureCells: number;
  supportedCells: number;
};

export type Surroundings = {
  status: string;
  differentialState: string | undefined;
  focalCells: number | undefined;
  minimumCells: number | undefined;
  surroundingCells: number | undefined;
  matchedControlCells: number | undefined;
  focalRadiusM: number | undefined;
  annulusM: [number, number] | undefined;
};

// `id` is the backend's group key; `signatureCells` its `dual_darkening_cells`.
export type OpticalGroup = { id: string; cells: number; signatureCells: number };

// One optical snapshot; `sensor` comes from the DSWx-HLS product id (`…_S2C_30_…`).
export type OpticalSnapshot = { date: string; sensor: string | undefined };

export type WaterComparison = {
  status: string;
  reason: string | undefined;
  pre: OpticalSnapshot | undefined;
  post: OpticalSnapshot | undefined;
  groups: OpticalGroup[] | undefined;
  // Set only when the matched new-water comparison was evaluated.
  matchedPairs: number | undefined;
  coPolContrast: { meanDb: number; intervalDb: [number, number] } | undefined;
  pointState: string | undefined;
  // 0 stayed dry, 1 new open water, 2 water on both dates, 3 open water receded, 4 mixed.
  pointGroupCode: number | undefined;
};

export type Confounder = { id: string; status: string };

export type LensEvaluation = {
  targetDate: string | undefined;
  // The last baseline pass: the radar bracket's first date.
  lastBaselineDate: string | undefined;
  baselinePasses: number | undefined;
  pixelSpacingM: number | undefined;
  // The backend's own reading of each signature at the clicked pixel.
  pixelDualDarkening: string | undefined;
  dualDarkening: Signature | undefined;
  coPolBrightening: Signature | undefined;
  dualDarkeningMaxChangeDb: { co: number; cross: number } | undefined;
  surroundings: Surroundings | undefined;
  neighbours: Neighbours | undefined;
  water: WaterComparison | undefined;
  confounders: Confounder[];
};

export type ChannelContrast = {
  channel: string;
  // absent_on_sampled_support, insufficient_data, … as the backend names them.
  state: string;
  reason: string | undefined;
  meanDb: number;
  interval95Db: [number, number] | undefined;
};

// Agriculture: the focal patch against baseline-matched cells around it.
export type Neighbours = {
  status: string;
  radiusM: number | undefined;
  annulusM: [number, number] | undefined;
  focalCells: number | undefined;
  comparisonCells: number | undefined;
  matchedControlCells: number | undefined;
  minimumCells: number | undefined;
  materialContrastDb: number | undefined;
  contrasts: ChannelContrast[];
};

type RawWater = z.infer<typeof waterComparisonSchema>;

// The HLS tile id names its satellite: S2A/S2B/S2C are Sentinel-2, L8/L9 Landsat.
const SENSOR: Record<string, string> = {
  S2A: "Sentinel-2A",
  S2B: "Sentinel-2B",
  S2C: "Sentinel-2C",
  L8: "Landsat 8",
  L9: "Landsat 9",
};

export const sensorOf = (sourceId: string | null | undefined): string | undefined => {
  const token = sourceId?.match(/_(S2[ABC]|L[89])_/)?.[1];
  return token === undefined ? undefined : SENSOR[token];
};

type RawEpoch = z.infer<typeof opticalEpochSchema>;

const snapshotOf = (raw: RawEpoch | undefined): OpticalSnapshot | undefined =>
  raw === undefined ? undefined : { date: raw.date, sensor: sensorOf(raw.source_id) };

const EVALUATED = "evaluated";

const waterOf = (raw: RawWater | null | undefined): WaterComparison | undefined => {
  if (raw == null) return undefined;
  const matched = raw.matched_new_water_comparison;
  const evaluated = matched?.status === EVALUATED ? matched : undefined;
  const hh = evaluated?.channels?.HH;
  return {
    status: raw.status,
    reason: raw.reason ?? undefined,
    pre: snapshotOf(raw.epochs?.pre),
    post: snapshotOf(raw.epochs?.post),
    groups:
      raw.groups == null
        ? undefined
        : Object.entries(raw.groups).map(([id, group]) => ({
            id,
            cells: group.cells,
            signatureCells: group.dual_darkening_cells,
          })),
    matchedPairs: evaluated?.matches?.matched_positive_pixels ?? undefined,
    coPolContrast:
      hh === undefined
        ? undefined
        : { meanDb: hh.mean_contrast_db, intervalDb: hh.spatial_resampling_95_interval_db },
    pointState: raw.point_new_open_water_state ?? undefined,
    pointGroupCode: raw.point_group_code ?? undefined,
  };
};

type RawSignature = z.infer<typeof signatureSchema>;

const signatureOf = (raw: RawSignature | null | undefined): Signature | undefined =>
  raw == null
    ? undefined
    : {
        state: raw.state,
        fraction: raw.fraction ?? undefined,
        signatureCells: raw.signature_cells,
        supportedCells: raw.supported_cells,
      };

export const lensEvaluationOf = (result: ExplorationResult): LensEvaluation | undefined => {
  const lens = result.lens;
  const evaluation = lens?.evaluation;
  if (lens == null || evaluation == null) return undefined;
  const around = evaluation.surrounding_comparison;
  const near = evaluation.neighborhood;
  return {
    neighbours:
      near == null
        ? undefined
        : {
            status: near.status,
            radiusM: near.focal_radius_m,
            annulusM: near.comparison_annulus_m,
            focalCells: near.focal_cells,
            comparisonCells: near.comparison_cells,
            matchedControlCells: evaluation.matches?.matched_control_pixels,
            minimumCells: evaluation.policy?.minimum_cells,
            materialContrastDb: evaluation.policy?.material_contrast_db,
            contrasts: Object.entries(evaluation.target_contrasts ?? {}).flatMap(([channel, c]) =>
              c == null
                ? []
                : [
                    {
                      channel,
                      state: c.state,
                      reason: c.reason ?? undefined,
                      meanDb: c.mean_contrast_db,
                      interval95Db: c.spatial_resampling_95_interval_db ?? undefined,
                    },
                  ],
            ),
          },
    targetDate: lens.target_date,
    lastBaselineDate: lens.baseline_dates?.at(-1),
    baselinePasses: lens.baseline_dates?.length,
    pixelSpacingM: evaluation.grid?.pixel_spacing_m[0],
    pixelDualDarkening: evaluation.point?.signature_states?.["dual_darkening"],
    dualDarkening: signatureOf(evaluation.grid_signatures?.dual_darkening),
    coPolBrightening: signatureOf(evaluation.grid_signatures?.co_pol_brightening),
    dualDarkeningMaxChangeDb: evaluation.signature_policy?.dual_darkening_max_change_db,
    surroundings:
      around == null
        ? undefined
        : {
            status: around.status,
            differentialState: around.differential_darkening?.state,
            focalCells: around.focal_cells,
            minimumCells: around.minimum_cells,
            surroundingCells: around.surrounding_cells,
            matchedControlCells: around.matches?.matched_control_pixels,
            focalRadiusM: around.focal_radius_m,
            annulusM: around.comparison_annulus_m,
          },
    water: waterOf(evaluation.water_comparison),
    confounders: evaluation.confounders ?? [],
  };
};

// Wildfire's rule evidence: the backend sends it in lens.radar and lens.point, not in evaluation.
export type CrossPolHistory = {
  status: string;
  polarization: string | undefined;
  commonCells: number | undefined;
  samples: { date: string; declineCells: number }[];
  pixelDeclinePasses: number | undefined;
  pixelAssessedPasses: number | undefined;
};

export const crossPolHistoryOf = (result: ExplorationResult): CrossPolHistory | undefined => {
  const history = result.lens?.radar?.cross_pol_history;
  if (history == null) return undefined;
  const pixel = result.lens?.point?.cross_pol_history;
  return {
    status: history.status,
    polarization: history.polarization,
    commonCells: result.lens?.radar?.common_cells,
    samples: history.samples.map((sample) => ({
      date: sample.date,
      declineCells: sample.decline_cells,
    })),
    pixelDeclinePasses: pixel?.decline_dates,
    pixelAssessedPasses: pixel?.assessed_dates,
  };
};
