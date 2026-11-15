import real from "../fixtures/exploration-qadirabad.json";
import { describe, expect, it } from "vitest";

import {
  actionLabel,
  explorationProblem,
  partialProblem,
  quotaLowProblem,
  quotaOutProblem,
} from "@/features/explore/exploreProblems";
import { explorationSchema } from "@/features/explore/exploreSchemas";
import { NETWORK_ERROR } from "@/lib/api/apiClient";

const NOW = new Date("2026-11-14T17:48:00Z");
const problem = (reasonCode: string, detail = "server detail", status = 0) =>
  explorationProblem({ reasonCode, detail, status, now: NOW });

describe("explorationProblem: SPECS-v8 §8 categories", () => {
  it.each([
    ["QUEUE_FULL", 503, "queueFull", "Analyses are already in line", "retry", "knownCase"],
    ["TIMEOUT_PARTIAL", 0, "timeout", "The analysis ran out of time", "retry", "knownCase"],
    [
      "NOT_FOUND",
      404,
      "serverDown",
      "The server restarted and lost this job",
      "runAgain",
      undefined,
    ],
    [NETWORK_ERROR, 0, "serverDown", "We couldn't reach the service", "runAgain", undefined],
    ["INTERNAL_ERROR", 500, "serverDown", "We couldn't reach the service", "runAgain", undefined],
    [
      "UPSTREAM_CATALOG_ERROR",
      502,
      "catalog",
      "We couldn't reach the radar archive",
      "runAgain",
      undefined,
    ],
    ["NO_COVERAGE", 0, "noData", "No NISAR passes cover this place", "knownCase", undefined],
    [
      "INSUFFICIENT_HISTORY",
      0,
      "noData",
      "Not enough radar history here yet",
      "knownCase",
      undefined,
    ],
    ["RATE_LIMITED", 429, "rateLimited", "You're asking quickly", "retry", "knownCase"],
  ])("%s (HTTP %s) is %s", (code, status, category, title, primary, secondary) => {
    const found = problem(code, "x", status);
    expect(found).toMatchObject({ category, title, primary });
    expect(found.secondary).toBe(secondary);
  });

  it("names the category of the design in its kicker", () => {
    expect(problem("QUEUE_FULL").kicker).toBe("Queue full");
    expect(problem("TIMEOUT_PARTIAL").kicker).toBe("Time ran out");
    expect(problem("UPSTREAM_CATALOG_ERROR").kicker).toBe("Server down or restarted");
  });

  it("states the server's own deadline, and none when it gives none", () => {
    expect(
      problem("TIMEOUT_PARTIAL", "the analysis did not finish within 240 s; …").body,
    ).toContain("(about 4 minutes)");
    expect(problem("TIMEOUT_PARTIAL", "late").body).toBe(
      "Reading the passes took longer than the server allows. Try again, or open a known case.",
    );
  });

  it("a ready plan that held no valid pixels is v8's No data, with no direction offered yet", () => {
    const noData = explorationProblem({
      reasonCode: "NO_COVERAGE",
      detail: "the planned scenes held no usable measurements",
      planStatus: "ready",
    });
    expect(noData).toMatchObject({
      category: "noData",
      title: "NISAR has no usable pass here yet",
      primary: "knownCase",
    });
    expect(noData.body).not.toContain("other pass direction");
    expect(noData.secondary).toBeUndefined();
  });

  it("maps a bare HTTP status when the reason is unknown", () => {
    expect(problem("HTTP_503", "x", 503).category).toBe("queueFull");
    expect(problem("HTTP_504", "x", 504).category).toBe("timeout");
    expect(problem("HTTP_502", "x", 502).category).toBe("serverDown");
  });

  it("shows the server's own detail for a reason it has no copy for", () => {
    expect(problem("AREA_TOO_LARGE", "the area is 640 km²", 422)).toMatchObject({
      category: "other",
      title: "We couldn't answer this question",
      body: "the area is 640 km²",
      retry: false,
    });
  });
});

describe("quota states (decision 8: never a number of our own)", () => {
  it("a 429 that is not the per-minute limit is the daily cap, reset at the next 00:00 UTC", () => {
    const out = problem("DAILY_CAP", "x", 429);
    expect(out).toMatchObject({ category: "quotaOut", primary: "knownCase", cases: true });
    expect(out.body).toBe(
      "They reset at 00:00 UTC, in 6 h 12 min. Known cases open instantly and don't count.",
    );
    expect(out.body).not.toMatch(/\b12\b(?! min)/);
  });

  it("the per-minute limit is used up only when the limits say nothing is left", () => {
    const limits = { remainingApp: 0, remainingClient: 4, resetsAt: "2026-11-15T00:00:00Z" };
    expect(problem("RATE_LIMITED", "x", 429).category).toBe("rateLimited");
    expect(
      explorationProblem({ reasonCode: "RATE_LIMITED", detail: "x", status: 429, limits, now: NOW })
        .category,
    ).toBe("quotaOut");
  });

  it("uses the backend's reset time when it gives one", () => {
    const limits = { remainingApp: 0, remainingClient: 0, resetsAt: "2026-11-15T06:00:00Z" };
    expect(quotaOutProblem(limits, NOW).body).toContain("They reset at 06:00 UTC, in 12 h 12 min.");
  });

  it("few left counts what the backend reported and says known cases don't count", () => {
    expect(quotaLowProblem(3)).toMatchObject({
      category: "quotaLow",
      title: "3 live analyses left today",
      body: "Known cases and repeat spots don't use one.",
      primary: "analyze",
      secondary: "knownCase",
    });
    expect(quotaLowProblem(1).title).toBe("1 live analysis left today");
  });
});

describe("partialProblem", () => {
  const REAL = explorationSchema.parse(real);

  it("says how many passes arrived when some are missing", () => {
    const partial = partialProblem({
      ...REAL,
      status: "partial",
      progress: { scenesRead: 3, scenesTotal: 5 },
    });
    expect(partial).toMatchObject({
      category: "partial",
      title: "3 of 5 passes arrived",
      body: "2 passes couldn't be read. Lenses that need a 3-pass baseline may say Not enough data.",
      primary: "showPartial",
      secondary: "retry",
    });
    expect(
      partialProblem({ ...REAL, status: "partial", progress: { scenesRead: 4, scenesTotal: 5 } })
        ?.body,
    ).toMatch(/^One pass couldn't be read\./);
  });

  it("stays away when every pass was read or the answer isn't partial", () => {
    expect(partialProblem({ ...REAL, status: "partial" })).toBeUndefined();
    expect(partialProblem(REAL)).toBeUndefined();
  });
});

describe("actionLabel", () => {
  it("uses the v8 button words", () => {
    expect(actionLabel("knownCase")).toBe("Open a known case");
    expect(actionLabel("runAgain")).toBe("Run it again");
    expect(actionLabel("showPartial")).toBe("Show what arrived");
  });
});
