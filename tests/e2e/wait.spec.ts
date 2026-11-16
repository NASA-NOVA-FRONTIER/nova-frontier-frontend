import { expect, test } from "./fixtures";
import { runningView, succeededView } from "./pom/explorationMock";
import { GlobePage, LIVE_FRAME } from "./pom/GlobePage";

// v8 step 3 (the waiting panel, #3) and step 8 (errors and limits, #4), with mocked polling.

const pickQadirabad = async (globe: GlobePage): Promise<void> => {
  await globe.searchInput.click();
  await globe.searchInput.fill("Qadirabad");
  await globe.searchInput.press("Enter");
  // The OpenStreetMap hit (from the mock), not the known case with the same name.
  await globe.searchMenu.getByRole("option", { name: /Phalia Tehsil/ }).click();
  await globe.useSquare.click();
  await expect(globe.placeCard).toContainText("Qadirabad");
  await expect(globe.placeCard).toHaveAttribute("data-state", "ready");
};

test.describe("Explorer v8: the waiting panel", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("with only processing reported, the search is done, reading is current and the rest wait", async ({
    page,
  }) => {
    await globe.mockExplorations();
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    const steps = page.getByTestId("job-stages");
    await expect(steps.locator('[data-step="search"]')).toHaveAttribute("data-state", "done");
    await expect(steps.locator('[data-step="search"]')).toContainText(
      "5 passes found · Ascending · 14 Jul → 11 Nov",
    );
    await expect(steps.locator('[data-step="read"]')).toHaveAttribute("data-state", "current");
    await expect(steps.locator('[data-step="read"]')).toContainText("in progress");
    await expect(steps.locator('[data-step="measure"]')).toContainText("waiting");
    await expect(steps.locator('[data-step="draw"]')).toContainText("waiting");
    await expect(page.getByTestId("job-queue")).toHaveCount(0);
  });

  test("passes read so far show as k of n (backend #6)", async ({ page }) => {
    await globe.mockExplorations({
      running: runningView({ progress: { scenesRead: 2, scenesTotal: 5 } }),
      first: runningView({ progress: { scenesRead: 2, scenesTotal: 5 } }),
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(page.getByTestId("job-stages")).toContainText(
      "2 of 5 read · each appears on the timeline",
    );
  });

  test("a queued job shows the queue line and nothing under way", async ({ page }) => {
    const queued = runningView({ status: "queued", stage: "queued", queuePosition: 1 });
    await globe.mockExplorations({ running: queued, first: queued });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(page.getByTestId("job-queue")).toHaveText(
      "#1One analysis is ahead of yours. Yours starts as soon as it ends.",
    );
    await expect(page.getByTestId("job-stages").locator('[data-step="read"]')).toHaveAttribute(
      "data-state",
      "waiting",
    );
  });

  test("without the backend's estimate the band falls back to 1–4 min", async ({ page }) => {
    const plain = runningView({ etaSeconds: null, etaRemainingSeconds: null });
    await globe.mockExplorations({ running: plain, first: plain });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    const band = page.getByTestId("job-band");
    await expect(band).toHaveAttribute("data-estimated", "false");
    await expect(band).toHaveAttribute("style", /left: 20(\.0)?%; width: 60(\.0)?%/);
  });

  test("the facts carry an image and dots, and pause while hovered or focused", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await globe.mockExplorations();
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    const facts = page.getByTestId("facts-carousel");
    await expect(page.getByTestId("fact-image")).toHaveAttribute(
      "src",
      "/landing/radar-north-dakota.jpg",
    );
    await expect(page.getByTestId("fact-credit")).toHaveText("NISAR image · NASA/JPL-Caltech");
    await expect(page.getByTestId("fact-body")).toHaveAttribute("aria-live", "polite");
    await expect(facts).toHaveAttribute("data-paused", "false");
    await facts.hover();
    await expect(facts).toHaveAttribute("data-paused", "true");
    await page.mouse.move(5, 5);
    await expect(facts).toHaveAttribute("data-paused", "false");
    await page.getByRole("button", { name: "Next fact" }).focus();
    await expect(facts).toHaveAttribute("data-paused", "true");
    await expect(page.getByTestId("fact-count")).toHaveText(/^DID YOU KNOW\? · 1 OF/);
  });

  test("Cancel analysis from a searched place goes back to that place's card", async ({ page }) => {
    await globe.mockPlaces();
    await globe.mockCoverage();
    const api = await globe.mockExplorations();
    await globe.goto();
    await pickQadirabad(globe);

    await globe.placeAnalyse.click();
    await expect(globe.jobModal).toBeVisible();
    await expect(page.getByTestId("job-kicker")).toContainText("QADIRABAD");
    await page.getByTestId("job-cancel").click();

    await expect(globe.jobModal).toBeHidden();
    await expect(globe.placeCard).toContainText("Qadirabad");
    await expect(globe.placeAnalyse).toBeEnabled();
    await expect.poll(() => api.cancelled).toBe(true);
  });
});

test.describe("Explorer v8: errors and limits", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("Queue full: Try again and Open a known case", async () => {
    await globe.mockExplorations({
      startProblems: [
        { status: 503, reasonCode: "QUEUE_FULL", detail: "2 explorations are running" },
      ],
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.jobError).toHaveAttribute("data-category", "queueFull");
    await expect(globe.jobError).toContainText("QUEUE FULL");
    await expect(globe.jobError).toContainText("Try again in a few minutes.");
    await expect(globe.jobError.getByRole("button", { name: "Try again" })).toBeVisible();
    // Try again is followed through in live.spec ("a full queue says so and Try again asks again").
    await globe.jobError.getByRole("button", { name: "Open a known case" }).click();
    await expect(globe.startCard).toBeVisible();
  });

  test("Quota used up (429): the known cases open instantly, with the reset time", async () => {
    await globe.mockExplorations({
      startProblems: [{ status: 429, reasonCode: "DAILY_LIMIT", detail: "daily cap reached" }],
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.jobError).toHaveAttribute("data-category", "quotaOut");
    await expect(globe.jobError).toContainText("Today's live analyses are used up");
    await expect(globe.jobError).toContainText(/They reset at 00:00 UTC, in \d+ h \d+ min\./);
    await expect(globe.jobError).toContainText("Known cases open instantly and don't count.");
    const cases = globe.jobError.getByTestId("job-error-cases");
    await expect(cases).toContainText("INSTANT");
    await cases.getByRole("button", { name: /Qadirabad/ }).click();
    await expect(globe.panelTitle).toContainText("Qadirabad");
  });

  test("Time ran out: states the server's limit; Try again asks again", async () => {
    const api = await globe.mockExplorations({
      first: runningView({
        status: "partial",
        stage: "done",
        error: {
          reasonCode: "TIMEOUT_PARTIAL",
          detail: "the analysis did not finish within 240 s; the planned scenes are listed",
        },
      }),
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.jobError).toHaveAttribute("data-category", "timeout");
    await expect(globe.jobError).toContainText("The analysis ran out of time");
    await expect(globe.jobError).toContainText("(about 4 minutes)");
    await globe.jobError.getByRole("button", { name: "Try again" }).click();
    await expect.poll(() => api.posts.length).toBe(2);
  });

  test("Server restarted: a job lost between polls; Run it again starts a new one", async () => {
    const api = await globe.mockExplorations({
      pollProblem: { status: 404, reasonCode: "NOT_FOUND", detail: "unknown exploration" },
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.jobError).toHaveAttribute("data-category", "serverDown");
    await expect(globe.jobError).toContainText("The server restarted and lost this job");
    await expect(globe.jobError.getByRole("button", { name: "Open a known case" })).toHaveCount(0);
    await globe.jobError.getByRole("button", { name: "Run it again" }).click();
    await expect.poll(() => api.posts.length).toBe(2);
  });

  test("Catalog unavailable: the server-down copy with the archive named", async () => {
    await globe.mockExplorations({
      startProblems: [
        { status: 502, reasonCode: "UPSTREAM_CATALOG_ERROR", detail: "ASF did not answer" },
      ],
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.jobError).toHaveAttribute("data-category", "catalog");
    await expect(globe.jobError).toContainText("SERVER DOWN OR RESTARTED");
    await expect(globe.jobError).toContainText("We couldn't reach the radar archive");
    await expect(globe.jobError.getByRole("button", { name: "Run it again" })).toBeVisible();
  });

  test("No data: passes were listed but none had valid pixels", async () => {
    await globe.mockExplorations({
      first: runningView({
        status: "noData",
        stage: "done",
        error: {
          reasonCode: "NO_COVERAGE",
          detail: "the planned scenes held no usable measurements",
        },
      }),
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.jobError).toHaveAttribute("data-category", "noData");
    await expect(globe.jobError).toContainText("NISAR has no usable pass here yet");
    await expect(globe.jobError.getByRole("button", { name: "Try again" })).toHaveCount(0);
    await globe.jobError.getByRole("button", { name: "Open a known case" }).click();
    await expect(globe.startCard).toBeVisible();
  });

  test("Partial result: says how many passes arrived; Show what arrived keeps the answer", async () => {
    await globe.mockExplorations({
      first: succeededView({ status: "partial", progress: { scenesRead: 3, scenesTotal: 5 } }),
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.jobError).toHaveAttribute("data-category", "partial");
    await expect(globe.jobError).toContainText("3 of 5 passes arrived");
    await expect(globe.jobError).toContainText("2 passes couldn't be read.");
    await expect(globe.verdict).toBeVisible();
    await globe.jobError.getByRole("button", { name: "Show what arrived" }).click();
    await expect(globe.jobError).toHaveCount(0);
    await expect(globe.verdict).toBeVisible();
  });

  test.describe("the quota line on the spot card", () => {
    test.beforeEach(async () => {
      await globe.mockPlaces();
      await globe.mockCoverage();
      await globe.mockExplorations();
    });

    test("is hidden above 3 left", async ({ page }) => {
      await globe.mockLimits({ remainingApp: 4, remainingClient: 9 });
      await globe.goto();
      await pickQadirabad(globe);
      await expect(globe.placeAnalyse).toBeVisible();
      await expect(page.getByTestId("spot-quota")).toHaveCount(0);
    });

    test("is hidden while the limits endpoint isn't deployed (404)", async ({ page }) => {
      await globe.goto();
      await pickQadirabad(globe);
      await expect(globe.placeAnalyse).toBeVisible();
      await expect(page.getByTestId("spot-quota")).toHaveCount(0);
    });

    test("few left: counts the tighter cap and says known cases don't count", async ({ page }) => {
      await globe.mockLimits({ remainingApp: 40, remainingClient: 2 });
      await globe.goto();
      await pickQadirabad(globe);
      const quota = page.getByTestId("spot-quota");
      await expect(quota).toHaveAttribute("data-category", "quotaLow");
      await expect(quota).toContainText("2 live analyses left today");
      await expect(quota).toContainText("Known cases and repeat spots don't use one.");
      await expect(globe.placeAnalyse).toBeVisible();
    });

    test("used up: no Analyze, the known cases and the reset time instead", async ({ page }) => {
      await globe.mockLimits({
        remainingApp: 0,
        remainingClient: 3,
        resetsAt: "2099-01-01T00:00:00Z",
      });
      await globe.goto();
      await pickQadirabad(globe);
      const quota = page.getByTestId("spot-quota");
      await expect(quota).toHaveAttribute("data-category", "quotaOut");
      await expect(quota).toContainText("They reset at 00:00 UTC");
      await expect(globe.placeAnalyse).toHaveCount(0);
      await quota.getByRole("button", { name: /Qadirabad/ }).click();
      await expect(globe.panelTitle).toContainText("Qadirabad");
    });
  });
});
