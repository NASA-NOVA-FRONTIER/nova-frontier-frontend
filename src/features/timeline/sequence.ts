import { TIMELINE } from "@/content/copyV9";
import type { TimelineData } from "@/features/cases/cases";
import { PASS_LABEL } from "@/features/frames/passLabel";
import {
  axisPct,
  formatDay,
  passSub,
  type Readout,
  type TimelineLayout,
} from "@/features/timeline/timelineLayout";

/*
 * The v9 sequence the player walks (SPECS-flow-v9 §3): one step per measured pass, or one per
 * interferometric pair for ground motion. Pure: ticks, gap labels, interval bars, the event line
 * and the readout all come from here.
 */

const DAY_MS = 86_400_000;
// Gap labels closer than this (% of the ~580 px desktop axis) would overlap; phones hide them all.
export const MIN_GAP_PCT = 5;

export type Step = {
  // The pass the dock and globe follow; for a pair, its later pass.
  date: string;
  // The pair's earlier pass; the pass itself in passes mode.
  from: string;
  // Index into the layout's passes (passes mode only).
  passIndex: number | undefined;
  // Every image this step has, for prefetching. Empty: nothing to show, never another date.
  images: string[];
};

export type Gap = { left: number; label: string; show: boolean };
export type IntervalBar = { left: number; width: number; label: string; aria: string };

export type Sequence = {
  mode: "passes" | "intervals";
  steps: Step[];
  gaps: Gap[];
  bars: IntervalBar[];
  event?: { left: number; label: string };
  // Nothing to animate with one step, or when no step has its own image (a case without them).
  canPlay: boolean;
};

export const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);

const gapsOf = (dates: string[], pct: (date: string) => number): Gap[] =>
  dates.slice(1).map((date, index) => {
    const before = dates[index] ?? date;
    return {
      left: (pct(before) + pct(date)) / 2,
      label: TIMELINE.gap(daysBetween(before, date)),
      show: pct(date) - pct(before) >= MIN_GAP_PCT,
    };
  });

export const sequenceOf = (data: TimelineData, layout: TimelineLayout): Sequence => {
  const pct = (date: string) => axisPct(date, data.start, data.end);
  const intervals = data.intervals;
  if (intervals !== undefined && intervals.items.length > 0) {
    // A measured chain reads in time order; a live answer newest first (COPY: "NEWEST FIRST").
    const items = intervals.items.toSorted((x, y) =>
      intervals.chain ? x.a.localeCompare(y.a) : y.b.localeCompare(x.b),
    );
    const steps = items.map((item) => ({
      date: item.b,
      from: item.a,
      passIndex: undefined,
      images: item.images ?? [],
    }));
    return {
      mode: "intervals",
      steps,
      gaps: [],
      bars: items.map((item, index) => ({
        left: pct(item.a),
        width: pct(item.b) - pct(item.a),
        label: TIMELINE.gap(daysBetween(item.a, item.b)),
        aria: TIMELINE.pairAria(index + 1, formatDay(item.a), formatDay(item.b)),
      })),
      ...(data.event !== undefined && {
        event: {
          left: pct(data.event.date),
          label: TIMELINE.eventMarker(formatDay(data.event.date)),
        },
      }),
      canPlay: steps.length > 1 && steps.some((step) => step.images.length > 0),
    };
  }
  const steps: Step[] = layout.measured.map((index) => {
    const pass = data.passes[index];
    const date = pass?.date ?? "";
    return {
      date,
      from: date,
      passIndex: index,
      images: Object.values(pass?.images ?? {}).filter((href) => href !== undefined),
    };
  });
  return {
    mode: "passes",
    steps,
    gaps: gapsOf(
      steps.map((step) => step.date),
      pct,
    ),
    bars: [],
    canPlay: steps.length > 1 && steps.some((step) => step.images.length > 0),
  };
};

// The largest gap between consecutive passes, which the four-pass line names.
const largestGap = (steps: Step[]): { days: number; a: string; b: string } | undefined =>
  steps.slice(1).reduce<{ days: number; a: string; b: string } | undefined>((best, step, index) => {
    const before = steps[index];
    if (before === undefined) return best;
    const days = daysBetween(before.date, step.date);
    return best === undefined || days > best.days ? { days, a: before.date, b: step.date } : best;
  }, undefined);

const directionOf = (direction: string): string =>
  direction === "A" || direction === "D" ? PASS_LABEL[direction] : direction;

// Title and sub (COPY-flow-v9 §5). Cases have no track, so they keep the v8 sub line (Cristian, T7).
export const sequenceReadout = (
  data: TimelineData,
  layout: TimelineLayout,
  sequence: Sequence,
  index: number,
): Readout => {
  const step = sequence.steps[index];
  const n = sequence.steps.length;
  if (step === undefined) return { line: "", sub: "" };
  if (sequence.mode === "intervals")
    return {
      line: TIMELINE.titleQuake(index + 1, n, formatDay(step.from, false), formatDay(step.date)),
      sub: data.intervals?.chain === true ? TIMELINE.subQuakeCase(n) : TIMELINE.subQuake(n),
    };
  const gap = n === 4 ? largestGap(sequence.steps) : undefined;
  const line =
    gap === undefined
      ? TIMELINE.title(index + 1, n, formatDay(step.date))
      : TIMELINE.fewer(
          index + 1,
          TIMELINE.gap(gap.days),
          formatDay(gap.a, false),
          formatDay(gap.b, false),
        );
  const first = sequence.steps[0]?.date ?? step.date;
  const last = sequence.steps.at(-1)?.date ?? step.date;
  const item = step.passIndex === undefined ? undefined : layout.passes[step.passIndex];
  const sub =
    data.track !== undefined && data.direction !== undefined
      ? TIMELINE.sub(
          n,
          formatDay(first),
          formatDay(last),
          String(data.track),
          directionOf(data.direction),
        )
      : item === undefined
        ? ""
        : passSub(item);
  return { line, sub };
};

// Scrubbing: the step whose tick is closest to where the pointer is on the axis.
export const nearestStep = (lefts: number[], pct: number): number =>
  lefts.reduce(
    (best, left, index) =>
      Math.abs(left - pct) < Math.abs((lefts[best] ?? Infinity) - pct) ? index : best,
    0,
  );
