import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ExplorationView } from "@/features/explore/exploreSchemas";
import { canRunRegional, createRegionalRuns, POLL_MS } from "@/features/sheet/regionalRuns";
import { ApiError } from "@/lib/api/apiClient";

const job = (status: string, id = "exp_regional"): ExplorationView =>
  ({ id, status }) as unknown as ExplorationView;

const setup = (launchAnswer: () => Promise<ExplorationView>) => {
  const launch = vi.fn((_id: string) => launchAnswer());
  const poll = vi.fn((_id: string, _signal: AbortSignal) => Promise.resolve(job("running")));
  return { launch, poll, runs: createRegionalRuns({ launch, poll }) };
};

describe("createRegionalRuns", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("launches once per exploration however often the view opens", async () => {
    // Arrange
    const { launch, runs } = setup(() => Promise.resolve(job("running")));

    // Act: open, leave, reopen (the sheet closing and reopening)
    const leave = runs.subscribe("exp_a", () => {});
    runs.ensure("exp_a");
    await vi.advanceTimersByTimeAsync(0);
    leave();
    runs.subscribe("exp_a", () => {});
    runs.ensure("exp_a");

    // Assert
    expect(launch).toHaveBeenCalledTimes(1);
    expect(runs.get("exp_a").view?.status).toBe("running");
  });

  it("a new exploration id starts fresh", async () => {
    const { launch, runs } = setup(() => Promise.resolve(job("running")));

    runs.ensure("exp_a");
    runs.ensure("exp_b");
    await vi.advanceTimersByTimeAsync(0);

    expect(launch.mock.calls.map(([id]) => id)).toEqual(["exp_a", "exp_b"]);
  });

  it("polls only while someone is looking", async () => {
    // Arrange
    const { poll, runs } = setup(() => Promise.resolve(job("running")));
    const leave = runs.subscribe("exp_a", () => {});
    runs.ensure("exp_a");
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(poll).toHaveBeenCalledTimes(1);

    // Act: the sheet closes
    leave();
    await vi.advanceTimersByTimeAsync(POLL_MS * 5);

    // Assert: no background polling, and reopening follows the same job again
    expect(poll).toHaveBeenCalledTimes(1);
    runs.subscribe("exp_a", () => {});
    await vi.advanceTimersByTimeAsync(POLL_MS);
    expect(poll).toHaveBeenCalledTimes(2);
    expect(poll.mock.calls[1]?.[0]).toBe("exp_regional");
  });

  it("a failed launch is re-POSTed only by Retry", async () => {
    // Arrange
    const { launch, runs } = setup(() => Promise.reject(new ApiError(503, "busy", "Busy")));
    runs.subscribe("exp_a", () => {});
    runs.ensure("exp_a");
    await vi.advanceTimersByTimeAsync(0);
    expect(runs.get("exp_a").error).toBe("Analysis capacity is limited. Try again shortly.");

    // Act
    runs.ensure("exp_a");
    await vi.advanceTimersByTimeAsync(0);
    expect(launch).toHaveBeenCalledTimes(1);
    runs.retry("exp_a");
    await vi.advanceTimersByTimeAsync(0);

    // Assert
    expect(launch).toHaveBeenCalledTimes(2);
  });

  it("a finished run is never launched again on reopen", async () => {
    const { launch, runs } = setup(() => Promise.resolve(job("succeeded")));
    runs.ensure("exp_a");
    await vi.advanceTimersByTimeAsync(0);

    runs.subscribe("exp_a", () => {});
    runs.ensure("exp_a");
    await vi.advanceTimersByTimeAsync(POLL_MS);

    expect(launch).toHaveBeenCalledTimes(1);
    expect(runs.get("exp_a").view?.status).toBe("succeeded");
  });
});

describe("canRunRegional", () => {
  const view = (changes: Record<string, unknown>) =>
    ({
      id: "exp",
      status: "succeeded",
      plan: { seriesKey: "L-HH-HV" },
      result: {},
      ...changes,
    }) as unknown as ExplorationView;

  it("offers it on a finished GCOV answer on one series", () => {
    expect(canRunRegional(view({}))).toBe(true);
    expect(canRunRegional(view({ status: "partial" }))).toBe(true);
  });

  it("never on InSAR, failed runs or a missing series", () => {
    expect(canRunRegional(view({ result: { insar: {} } }))).toBe(false);
    expect(canRunRegional(view({ status: "failed" }))).toBe(false);
    expect(canRunRegional(view({ plan: {} }))).toBe(false);
    expect(canRunRegional(undefined)).toBe(false);
  });
});
