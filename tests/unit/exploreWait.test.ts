import real from "../fixtures/exploration-qadirabad.json";
import { describe, expect, it } from "vitest";

import { explorationSchema, type ExplorationView } from "@/features/explore/exploreSchemas";
import {
  drawFacts,
  estimateLine,
  formatEstimate,
  queueAhead,
  waitBar,
  waitMode,
  waitSteps,
} from "@/features/explore/exploreWait";

const REAL = explorationSchema.parse(real);

// The backend's view while a job runs today: planning done, one `processing` stage. A running job is
// never a cache hit (a hit answers final at once).
const running = (extra: Partial<ExplorationView> = {}): ExplorationView => ({
  ...REAL,
  status: "running",
  cache: "miss",
  stage: "processing",
  etaSeconds: 120,
  elapsedSeconds: 30,
  stages: [
    { name: "planning", state: "done", seconds: 0.9, budgetSeconds: 2 },
    { name: "processing", state: "running", seconds: null, budgetSeconds: null },
  ],
  progress: { scenesRead: null, scenesTotal: 5 },
  result: null,
  ...extra,
});

describe("waitBar: elapsed on a 0–5 min axis, never a countdown", () => {
  it("counts between polls and shades the band from the backend's estimate", () => {
    const bar = waitBar(running(), 1_000, 16_000);
    expect(bar.elapsedSeconds).toBe(45);
    expect(bar.fraction).toBeCloseTo(45 / 300);
    // p80 of 120 s: the band ends there and keeps the handoff's 1–4 proportions.
    expect(bar.band).toEqual({ from: 30 / 300, to: 120 / 300 });
    expect(bar).toMatchObject({ estimated: true, overdue: false });
  });

  it("falls back to the handoff's 1–4 min only without an estimate", () => {
    const bar = waitBar(running({ etaSeconds: null }), 0, 0);
    expect(bar.band).toEqual({ from: 0.2, to: 0.8 });
    expect(bar).toMatchObject({ estimated: false, overdue: false });
  });

  it("stops the bar at 5 min while the clock keeps counting, and says when it is past the estimate", () => {
    const bar = waitBar(running({ elapsedSeconds: 420 }), 0, 0);
    expect(bar.fraction).toBe(1);
    expect(bar.elapsedSeconds).toBe(420);
    expect(bar.overdue).toBe(true);
  });

  it("starts at zero before the first answer", () => {
    expect(waitBar(undefined, 0, 5_000).elapsedSeconds).toBe(0);
  });
});

describe("waitSteps: as far as the backend reports, no further", () => {
  it("before the first answer only the catalog search is under way", () => {
    expect(waitSteps(undefined).map((step) => [step.state, step.line])).toEqual([
      ["current", "In progress"],
      ["waiting", "Waiting"],
      ["waiting", "Waiting"],
      ["waiting", "Waiting"],
    ]);
  });

  it("with only `processing`, the search is done, reading is current and the rest wait", () => {
    const steps = waitSteps(running());
    expect(steps.map((step) => step.label)).toEqual([
      "Finding passes",
      "Reading passes",
      "Measuring change",
      "Drawing the layers",
    ]);
    expect(steps.map((step) => step.state)).toEqual(["done", "current", "waiting", "waiting"]);
    // The real plan: five dates of series 084_A_018 between 14 Jul and 11 Nov.
    expect(steps[0]?.line).toBe("5 passes · Ascending · 14 Jul → 11 Nov");
    expect(steps[1]?.line).toBe("In progress");
  });

  it("shows k of n while passes are read (backend #6)", () => {
    const steps = waitSteps(running({ progress: { scenesRead: 2, scenesTotal: 5 } }));
    expect(steps[1]?.line).toBe("2 of 5 read");
  });

  it("moves on only when the backend names the later stages", () => {
    const steps = waitSteps(
      running({
        progress: { scenesRead: 5, scenesTotal: 5 },
        stages: [
          { name: "planning", state: "done", seconds: 0.9, budgetSeconds: 2 },
          { name: "reading", state: "done", seconds: 80, budgetSeconds: null },
          { name: "analysing", state: "running", seconds: null, budgetSeconds: null },
        ],
      }),
    );
    expect(steps.map((step) => [step.state, step.line])).toEqual([
      ["done", "5 passes · Ascending · 14 Jul → 11 Nov"],
      ["done", "5 of 5 read"],
      ["current", "In progress"],
      ["waiting", "Waiting"],
    ]);
  });

  it("a queued job has its plan but nothing under way", () => {
    expect(waitSteps(running({ status: "queued" })).map((step) => step.state)).toEqual([
      "done",
      "waiting",
      "waiting",
      "waiting",
    ]);
  });

  it("says only Done for the search when the series key names no direction (#25)", () => {
    const plan = REAL.plan === null ? null : { ...REAL.plan, seriesKey: "odd-key" };
    expect(waitSteps(running({ plan }))[0]?.line).toBe("Done");
  });

  it("OFFLINE: a prepared answer shows every step done (v9 §1.4)", () => {
    const steps = waitSteps(running({ cache: "hit" }));
    expect(steps.map((step) => step.state)).toEqual(["done", "done", "done", "done"]);
  });
});

describe("queueAhead", () => {
  it("shows #1 only when the job is queued behind exactly one (the copy says one)", () => {
    expect(queueAhead(running({ status: "queued", queuePosition: 1 }))).toBe(1);
    expect(queueAhead(running({ status: "queued", queuePosition: 2 }))).toBeUndefined();
    expect(queueAhead(running({ status: "queued" }))).toBeUndefined();
    expect(queueAhead(running({ queuePosition: 0 }))).toBeUndefined();
  });
});

describe("the mode and the estimate (#25, v9 C7)", () => {
  it("is OFFLINE only for a prepared answer", () => {
    expect(waitMode(running())).toBe("online");
    expect(waitMode(running({ cache: "hit" }))).toBe("offline");
    expect(waitMode(undefined)).toBe("online");
  });

  it("names the backend's p80, then says when it is past it, and no number without one", () => {
    const at = (elapsedSeconds: number, etaSeconds: number | null) => {
      const view = running({ elapsedSeconds, etaSeconds });
      return estimateLine(view, waitBar(view, 0, 0));
    };
    expect(at(30, 150)).toBe("Usually under 3 min");
    expect(at(200, 150)).toBe("Estimate was under 3 min");
    expect(at(30, null)).toBe("Computed live · we stop at 8 min");
    const offline = running({ cache: "hit" });
    expect(estimateLine(offline, waitBar(offline, 0, 0))).toBe("Prepared ahead of time");
    expect(formatEstimate(45)).toBe("45 s");
  });
});

describe("drawFacts: ten per wait, stable within a run, no repeats", () => {
  const pool = Array.from({ length: 40 }, (_, index) => index);

  it("draws ten different facts, the same ten for the same run", () => {
    const drawn = drawFacts(pool, "run-a");
    expect(drawn).toHaveLength(10);
    expect(new Set(drawn).size).toBe(10);
    expect(drawFacts(pool, "run-a")).toEqual(drawn);
  });

  it("draws another set for another run", () => {
    expect(drawFacts(pool, "run-b")).not.toEqual(drawFacts(pool, "run-a"));
  });

  it("shows the whole pool, shuffled, when it holds fewer than ten", () => {
    const small = [1, 2, 3];
    expect([...drawFacts(small, "run-a")].sort()).toEqual(small);
  });
});
