import { CONFIRM, PROCESSING } from "@/content/copyV9";
import type { ExplorationView } from "@/features/explore/exploreSchemas";
import { directionOf } from "@/features/spot/spot";
import { formatDay } from "@/features/timeline/timelineLayout";

/*
 * The processing panel (SPECS-v8 §3, v9 §1.4, #25) read from the backend's own view: an elapsed clock
 * on a 0–5 min bar, the estimate as the backend gives it, four steps and the facts drawn for the run.
 * Nothing here is simulated: a step is done only when the backend says so.
 */

// The bar's axis: 0 to 5 minutes.
export const BAR_SECONDS = 300;
// Decision 8: the band ends on the backend's estimate (its p80 of comparable runs) and keeps the
// handoff's 1–4 min proportions; without an estimate it is the handoff's own 1–4 min.
const FALLBACK_BAND: Band = { from: 60, to: 240 };
const BAND_START_RATIO = 0.25;

type Band = { from: number; to: number };

export type WaitBar = {
  elapsedSeconds: number;
  // 0–1 along the 0–5 min axis; it stops at the end, the clock keeps counting.
  fraction: number;
  band: { from: number; to: number };
  // From the backend, or the handoff's band when it gave none.
  estimated: boolean;
  overdue: boolean;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

// The clock moves between polls: what the server said plus the time since it said it.
export const waitBar = (
  view: ExplorationView | undefined,
  receivedAt: number,
  now: number,
): WaitBar => {
  const elapsedSeconds =
    view === undefined ? 0 : view.elapsedSeconds + Math.max(0, (now - receivedAt) / 1000);
  const eta = view?.etaSeconds ?? null;
  const estimated = eta !== null && eta > 0;
  const band = estimated ? { from: eta * BAND_START_RATIO, to: eta } : FALLBACK_BAND;
  return {
    elapsedSeconds,
    fraction: clamp01(elapsedSeconds / BAR_SECONDS),
    band: { from: clamp01(band.from / BAR_SECONDS), to: clamp01(band.to / BAR_SECONDS) },
    estimated,
    overdue: estimated && elapsedSeconds > eta,
  };
};

// "#1 · One analysis is ahead of yours": the copy says one, so it shows only when exactly one is.
export const queueAhead = (view: ExplorationView | undefined): number | undefined =>
  view?.status === "queued" && view.queuePosition === 1 ? 1 : undefined;

export type WaitStepState = "done" | "current" | "waiting";
export type WaitStep = {
  id: "search" | "read" | "measure" | "draw";
  label: string;
  state: WaitStepState;
  line: string;
};

const searchDone = (view: ExplorationView): string | undefined => {
  const dates = [...(view.plan?.dates ?? [])].sort();
  const first = dates[0];
  const last = dates.at(-1);
  const direction = directionOf(view.plan?.seriesKey);
  if (first === undefined || last === undefined || direction === undefined) return undefined;
  const pretty = direction.charAt(0) + direction.slice(1).toLowerCase();
  return PROCESSING.stepPasses(
    dates.length,
    pretty,
    formatDay(first, false),
    formatDay(last, false),
  );
};

const stageState = (view: ExplorationView, name: string): string | undefined =>
  view.stages.find((stage) => stage.name === name)?.state;

// Which v8 step is under way. The backend today reports planning, then one `processing` stage
// until the end (backend #6 may split it into reading/analysing/rendering); it never says more
// than it knows, so with `processing` only "Reading passes" is current and the rest wait.
const currentIndex = (view: ExplorationView | undefined): number => {
  if (view === undefined) return 0;
  if (view.status === "queued") return 1;
  if (stageState(view, "rendering") === "running") return 3;
  if (stageState(view, "analysing") === "running") return 2;
  return 1;
};

// ONLINE computes the square now; OFFLINE opens an answer prepared earlier (a cache hit; v9 decision).
export type WaitMode = "online" | "offline";
export const waitMode = (view: ExplorationView | undefined): WaitMode =>
  view?.cache === "hit" ? "offline" : "online";

// "Usually under 3 min": the backend's p80, rounded up to what a person reads.
export const formatEstimate = (seconds: number): string =>
  seconds < 60 ? `${Math.ceil(seconds)} s` : `${Math.ceil(seconds / 60)} min`;

// C7: one p80 from the backend, or no number at all before it sends one; past it, the estimate is
// named as past.
export const estimateLine = (view: ExplorationView | undefined, bar: WaitBar): string => {
  if (waitMode(view) === "offline") return PROCESSING.offlineEstimate;
  const eta = view?.etaSeconds ?? null;
  if (!bar.estimated || eta === null) return CONFIRM.waitLineOnline;
  return bar.overdue
    ? PROCESSING.estimateExceeded(formatEstimate(eta))
    : PROCESSING.estimate(formatEstimate(eta));
};

// Ten facts per wait, different between runs and stable within one (seeded by the run), no repeats.
export const FACTS_PER_RUN = 10;

const seedOf = (text: string): number => {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
};

// mulberry32: a small, well-mixed generator, enough to shuffle a list the same way for one seed.
const generator = (seed: number) => {
  let state = seed;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const drawFacts = <T>(pool: readonly T[], seed: string, count = FACTS_PER_RUN): T[] => {
  const next = generator(seedOf(seed));
  const items = [...pool];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(next() * (index + 1));
    const kept = items[index];
    const moved = items[other];
    if (kept === undefined || moved === undefined) continue;
    items[index] = moved;
    items[other] = kept;
  }
  return items.slice(0, Math.min(count, items.length));
};

export const waitSteps = (view: ExplorationView | undefined): WaitStep[] => {
  const current = currentIndex(view);
  const queued = view?.status === "queued";
  const read = view?.progress?.scenesRead ?? null;
  const total = view?.progress?.scenesTotal ?? 0;
  const searched = view === undefined ? undefined : searchDone(view);

  const steps: Array<Omit<WaitStep, "state" | "line"> & { done: string; running: string }> = [
    {
      id: "search",
      label: PROCESSING.steps[0],
      // Without a direction in the series key the done-line would have to guess, so it says Done.
      done: searched ?? PROCESSING.done,
      running: PROCESSING.inProgress,
    },
    {
      id: "read",
      label: PROCESSING.steps[1],
      done: read !== null && total > 0 ? PROCESSING.stepRead(read, total) : PROCESSING.done,
      running:
        read !== null && total > 0 ? PROCESSING.stepRead(read, total) : PROCESSING.inProgress,
    },
    {
      id: "measure",
      label: PROCESSING.steps[2],
      done: PROCESSING.done,
      running: PROCESSING.inProgress,
    },
    {
      id: "draw",
      label: PROCESSING.steps[3],
      done: PROCESSING.done,
      running: PROCESSING.inProgress,
    },
  ];
  // OFFLINE: the answer was prepared earlier, so every step is already done (v9 §1.4).
  const offline = waitMode(view) === "offline";

  return steps.map(({ id, label, done, running }, index) => {
    // A queued job has its plan but nothing under way yet.
    const state: WaitStepState = offline
      ? "done"
      : index < current
        ? "done"
        : index === current && !queued
          ? "current"
          : "waiting";
    const line = state === "done" ? done : state === "current" ? running : PROCESSING.waiting;
    return { id, label, state, line };
  });
};
