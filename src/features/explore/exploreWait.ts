import { STEP_3 } from "@/content/copyV8";
import type { ExplorationView } from "@/features/explore/exploreSchemas";
import { directionOf } from "@/features/spot/spot";
import { formatDay } from "@/features/timeline/timelineLayout";

/*
 * The v8 waiting panel (SPECS-v8 §3) read from the backend's own view: an elapsed clock on a 0–5 min
 * bar and four steps. Nothing here is simulated: a step is done only when the backend says so.
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
  return STEP_3.stepSearchDone(
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

export const waitSteps = (view: ExplorationView | undefined): WaitStep[] => {
  const current = currentIndex(view);
  const queued = view?.status === "queued";
  const read = view?.progress?.scenesRead ?? null;
  const total = view?.progress?.scenesTotal ?? 0;
  const searched = view === undefined ? undefined : searchDone(view);

  const steps: Array<Omit<WaitStep, "state" | "line"> & { done: string; running: string }> = [
    {
      id: "search",
      label: STEP_3.stepSearch,
      // #25: without a direction in the series key the done-line would have to guess, so it stays empty.
      done: searched ?? "",
      running: STEP_3.stepCurrent,
    },
    {
      id: "read",
      label: STEP_3.stepRead,
      done: read !== null && total > 0 ? STEP_3.stepReadDone(read, total) : "",
      running:
        read !== null && total > 0 ? STEP_3.stepReadRunning(read, total) : STEP_3.stepCurrent,
    },
    {
      id: "measure",
      label: STEP_3.stepMeasure,
      done: STEP_3.stepMeasureDone,
      running: STEP_3.stepCurrent,
    },
    { id: "draw", label: STEP_3.stepDraw, done: STEP_3.stepDrawDone, running: STEP_3.stepCurrent },
  ];

  return steps.map(({ id, label, done, running }, index) => {
    // A queued job has its plan but nothing under way yet.
    const state: WaitStepState =
      index < current ? "done" : index === current && !queued ? "current" : "waiting";
    const line = state === "done" ? done : state === "current" ? running : STEP_3.stepPending;
    return { id, label, state, line };
  });
};
