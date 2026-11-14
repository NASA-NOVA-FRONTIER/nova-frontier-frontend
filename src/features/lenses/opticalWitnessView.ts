import { STEP_6, WITNESS } from "@/content/copyV8";
import { OPTICAL, type ContrastGroup, type Matched } from "@/features/cases/cases";
import type { LensEvaluation, OpticalGroup } from "@/features/explore/exploreSchemas";
import { formatDay } from "@/features/timeline/timelineLayout";

// `water_comparison.groups` keys (nova-frontier-model `exploration_lenses.GROUPS`).
export const GROUP = {
  newWater: "new_open_water",
  stableWater: "stable_open_water",
  stayedDry: "stable_nonwater",
  receded: "open_water_loss",
  mixed: "mixed_or_partial",
} as const;

// The v7 OPERA legend order: new water, stable water, stayed dry, water loss, mixed.
const ROWS = [
  { id: GROUP.newWater, label: WITNESS.groupNewWater, color: OPTICAL.newWater },
  { id: GROUP.stableWater, label: WITNESS.groupStableWater, color: OPTICAL.stableWater },
  { id: GROUP.stayedDry, label: WITNESS.groupStayedDry, color: OPTICAL.dry },
  { id: GROUP.receded, label: WITNESS.groupReceded, color: OPTICAL.loss },
  { id: GROUP.mixed, label: WITNESS.groupMixed, color: OPTICAL.mixed },
] as const;

// Statuses the backend uses for a finished comparison and for one still looking for snapshots.
const READY = "evaluated";
const NOT_ENOUGH = "insufficient_data";
const PENDING = new Set(["pending", "running", "queued"]);
// Reasons that mean no usable snapshot pair, which the COPY sentence says. Any other reason is a
// service failure: UNAVAILABLE with no sentence, so the card never claims there was no snapshot.
const NO_SNAPSHOT = new Set([
  "optical_evidence_unavailable",
  "no_optical_candidate_in_window",
  "insufficient_joint_optical_coverage",
  "reference_outside_temporal_support",
  "reference_sensing_dates_unavailable",
]);

// "Cells that stayed dry almost never do" only holds at or under the FITS BEST dry ceiling (§6.5).
const DRY_ALMOST_NEVER = 0.05;
const AGREE_FROM = 5;
const TENTHS = 10;

export const groupOf = (
  groups: readonly OpticalGroup[] | undefined,
  id: string,
): OpticalGroup | undefined => groups?.find((group) => group.id === id && group.cells > 0);

// Share of a group's cells that meet the radar rule; undefined for an empty or missing group.
export const shareOf = (group: OpticalGroup | undefined): number | undefined =>
  group === undefined ? undefined : group.signatureCells / group.cells;

export type WitnessView =
  | { state: "pending"; text: string | undefined }
  | { state: "unavailable"; text: string | undefined }
  | {
      state: "ready";
      lead: string;
      snapshots: string | undefined;
      bars: ContrastGroup;
      whisker: Matched | undefined;
      point: string | undefined;
    };

type Water = NonNullable<LensEvaluation["water"]>;

const leadOf = (water: Water, groups: readonly OpticalGroup[]): string | undefined => {
  const dryGroup = groupOf(groups, GROUP.stayedDry);
  const dry = shareOf(dryGroup);
  const share = shareOf(groupOf(groups, GROUP.newWater));
  if (share === undefined) {
    // No cell turned to water: the stayed-dry group still says what the radar rule did.
    const { pre, post } = water;
    if (dryGroup === undefined || pre === undefined || post === undefined) return undefined;
    return STEP_6.opticalNoNewWater(
      formatDay(pre.date, false),
      formatDay(post.date, false),
      dryGroup.signatureCells,
      dryGroup.cells,
    );
  }
  const inTen = Math.round(share * TENTHS);
  const agrees = inTen >= AGREE_FROM && dry !== undefined && dry <= DRY_ALMOST_NEVER;
  return agrees ? STEP_6.opticalAgree(inTen) : STEP_6.opticalPartly(inTen);
};

const snapshotsOf = ({ pre, post }: Water): string | undefined => {
  if (pre === undefined || post === undefined) return undefined;
  const [d1, d2] = [formatDay(pre.date), formatDay(post.date)];
  return pre.sensor === undefined || post.sensor === undefined
    ? WITNESS.snapshotDates(d1, d2)
    : WITNESS.snapshots(pre.sensor, d1, post.sensor, d2);
};

// The group under the clicked pixel in words; a missing code is no optical cell there.
const pointOf = ({ pointGroupCode, pointState }: Water): string | undefined => {
  if (pointGroupCode !== undefined) return WITNESS.pointGroup[pointGroupCode];
  return pointState === undefined ? undefined : WITNESS.pointNoCell;
};

// −8.39, with a true minus sign like the rest of the card.
const db = (value: number): string => `${value < 0 ? "−" : ""}${Math.abs(value).toFixed(2)}`;

const whiskerOf = (water: Water): Matched | undefined => {
  const contrast = water.coPolContrast;
  const pairs = water.matchedPairs;
  if (contrast === undefined || pairs === undefined || pairs <= 0) return undefined;
  const [low, high] = contrast.intervalDb;
  return {
    title: WITNESS.whiskerTitle,
    n: STEP_6.whiskerCaption(pairs),
    v: contrast.meanDb,
    ci: contrast.intervalDb,
    line: WITNESS.whiskerInterval(db(low), db(high)),
  };
};

/*
 * SECOND WITNESS · OPERA OPTICAL: PENDING → READY → UNAVAILABLE (SPECS-v8 §6.4). Every number comes
 * from `water_comparison`; a status or shape we have no words for returns undefined (hidden), so
 * the card never claims an optical result the backend didn't give.
 */
export const witnessOf = (
  evaluation: LensEvaluation | undefined,
  jobActive: boolean,
): WitnessView | undefined => {
  const water = evaluation?.water;
  const d1 = evaluation?.lastBaselineDate;
  const d2 = evaluation?.targetDate;
  const pendingText =
    d1 === undefined || d2 === undefined
      ? undefined
      : STEP_6.opticalPendingText(formatDay(d1), formatDay(d2));

  if (water === undefined) return jobActive ? { state: "pending", text: pendingText } : undefined;
  if (PENDING.has(water.status)) return { state: "pending", text: pendingText };
  if (water.status === NOT_ENOUGH && water.reason !== undefined)
    return {
      state: "unavailable",
      text: NO_SNAPSHOT.has(water.reason) ? STEP_6.opticalUnavailableText : undefined,
    };
  if (water.status !== READY || water.groups === undefined) return undefined;

  const lead = leadOf(water, water.groups);
  if (lead === undefined) return undefined;
  const words = pointOf(water);
  return {
    state: "ready",
    lead,
    snapshots: snapshotsOf(water),
    bars: {
      title: STEP_6.opticalTitle,
      sub: "",
      rows: ROWS.flatMap(({ id, label, color }) => {
        const group = groupOf(water.groups, id);
        return group === undefined
          ? []
          : [{ label, k: group.signatureCells, n: group.cells, color }];
      }),
    },
    whisker: whiskerOf(water),
    point: words === undefined ? undefined : STEP_6.opticalPoint(words),
  };
};
