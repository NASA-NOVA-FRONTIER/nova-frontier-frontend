import { expect, test } from "./fixtures";
import { succeededView } from "./pom/explorationMock";
import { GlobePage, LIVE_FRAME } from "./pom/GlobePage";

test.describe("Explorer: measured cases", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.mockObservationPlan();
  });

  test("the start card lists the cases and loads the frames snapshot", async () => {
    await globe.goto();
    await expect(globe.startCard).toContainText("What did the radar see?");
    await expect(globe.framesStatus).toContainText("16,663 NISAR frames");
    await expect(globe.caseRow("qadirabad")).toContainText("Did it flood?");
    await expect(globe.caseRow("choco")).toContainText("Coherence only · 0.247");
    await expect(globe.caseRow("choco")).not.toContainText("Pending");
    await expect(globe.startCard).toContainText("Design v7 · 0.7.0");
    await expect(globe.startCard.getByTestId("intro-team")).toHaveAttribute("href", "/about");
  });

  test("a case link opens its panel with the real numbers", { tag: "@globe" }, async ({ page }) => {
    await globe.goto("?case=qadirabad");
    await expect(globe.panelTitle).toHaveText("Qadirabad, Pakistan");
    await expect(globe.panelMeta).toContainText("Measured case");
    await expect(globe.panel.getByTestId("prov-offline")).toHaveText("OFFLINE");
    await expect(globe.verdict).toHaveAttribute("data-verdict", "departure");
    await expect(globe.verdict).toContainText("Changed beyond its normal range");
    await expect(globe.panelStat).toContainText("64.3%");
    await expect(globe.lens("flood_wetland")).toHaveAttribute("aria-pressed", "true");
    await expect(globe.lens("insar")).toHaveAttribute("aria-pressed", "false");
    // The band chart is demo, so its chip shows even with REAL labels hidden.
    await expect(globe.panel.getByTestId("band-chart").getByTestId("prov-demo")).toBeVisible();
    await expect(page).toHaveURL(/\?case=qadirabad$/);
  });

  test("the panel is 372 px wide, 400 px on the lens result", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await globe.goto("?case=qadirabad");
    await expect(globe.panel).toBeVisible();
    expect((await globe.panel.boundingBox())?.width).toBe(372);
    // No component sets the result width yet (#21 does); the class alone must widen it.
    await globe.panel.evaluate((panel) => panel.classList.add("x-panel--result"));
    expect((await globe.panel.boundingBox())?.width).toBe(400);
  });

  test("the layer dock drapes only real crops; HV waits for the API", async () => {
    await globe.goto("?case=qadirabad");
    await expect(globe.dock).toBeVisible();
    await globe.expectScene((scene) =>
      expect(scene.drape?.url).toBe("/cases/qadirabad-change.png"),
    );
    await expect(globe.dock.getByTestId("channel-HV")).toBeDisabled();
    await expect(globe.dock.getByTestId("channel-HV")).toHaveAttribute(
      "title",
      "Served by the backend API soon",
    );
    await globe.dock.getByTestId("layer-baseline").click();
    await expect(globe.dock.getByTestId("layer-baseline")).toHaveAttribute("aria-pressed", "true");
    await globe.expectScene((scene) => expect(scene.drape?.url).toBe("/cases/qadirabad-base.png"));
    await expect(globe.dock.getByTestId("channel-ratio")).toBeDisabled();
  });

  test("a case row opens the case and puts it in the link", async ({ page }) => {
    await globe.goto();
    await expect(globe.caseRow("choco").getByTestId("prov-offline")).toHaveText("OFFLINE");
    await globe.caseRow("choco").click();
    await expect(globe.panelTitle).toHaveText("Chocó, Colombia");
    await expect(page).toHaveURL(/\?case=choco$/);
    // The globe flies to the case; coherence only, so no measured footprint or drape.
    await globe.expectScene((scene) => {
      expect(scene.selectedCaseId).toBe("choco");
      expect(scene.target?.key).toBe("choco");
      expect(scene.outline).toBeUndefined();
      expect(scene.drape).toBeUndefined();
    });
  });

  test("More information opens the sheet; Technical adds the limits; Esc closes", async ({
    page,
  }) => {
    await globe.goto("?case=qadirabad");
    await globe.moreInfo.click();
    await expect(globe.sheet).toContainText("What the radar measured at Qadirabad");
    await expect(globe.sheet).toContainText("Real figure · nova-frontier-model report");
    await expect(globe.sheet.getByTestId("compare-split")).toBeVisible();
    // P0 copy pass: one line instead of a list of empty rows.
    await expect(globe.sheet.getByTestId("empties-line")).toHaveText(
      "Measured radar evidence: no cause, probability or area is inferred.",
    );
    await expect(globe.sheet.getByTestId("sheet-verdict-departure")).toHaveAttribute(
      "data-on",
      "true",
    );
    await expect(globe.techLimit).toBeHidden();

    await page.getByTestId("read-technical").click();
    await expect(globe.techLimit).toContainText("precision 29.7%, recall 64.3%, IoU 25.5%");

    await page.keyboard.press("Escape");
    await expect(globe.sheet).toBeHidden();
    await expect(globe.panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(globe.panel).toBeHidden();
    await expect(page).not.toHaveURL(/case=/);
  });

  test("the timeline compares baseline and target; planned passes aren't clickable", async () => {
    await globe.goto("?case=qadirabad");
    await expect(globe.timeline).toContainText("Planned · a promise, not data");
    await expect(globe.timeline.getByTestId("prov-demo-dates")).toHaveText("DEMO DATES");
    await expect(globe.timelinePasses("plan")).toHaveCount(2);
    for (const planned of await globe.timelinePasses("plan").all())
      await expect(planned).toBeDisabled();
    await expect(globe.timelinePasses("plan").first()).toHaveAttribute("data-next", "true");
    await expect(globe.timelinePasses("plan").last()).not.toHaveAttribute("data-next");
    await expect(globe.timeline.getByTestId("timeline-next")).toHaveText("Next");
    await expect(globe.timeline.getByTestId("timeline-planned-legend")).toContainText(
      "next 16 Nov",
    );

    await expect(globe.timelineCompare).toHaveAttribute("aria-pressed", "true");
    await expect(globe.timelineReadout).toHaveText(
      "Baseline (3 passes, 20 Jun – 14 Jul) ↔ Target 26 Jul 2026",
    );
    await globe.timelinePasses("meas").first().click();
    await expect(globe.timelineCompare).toHaveAttribute("aria-pressed", "false");
    await expect(globe.timelineReadout).toHaveText("7 Aug 2026 · measured pass");
  });

  test("Chocó shows its coherence only, no chart and no timeline", async () => {
    await globe.goto("?case=choco");
    await expect(globe.pending).toContainText(
      "Coherence 0.247 between two passes. Low coherence: the surface changed or vegetation decorrelated the echo.",
    );
    await expect(globe.panel.getByTestId("band-chart")).toHaveCount(0);
    await expect(globe.timeline).toHaveCount(0);
    // #29: the SGC update is linked, so no quality fact is left as a slot.
    await expect(globe.panel).toContainText("Update · 10 Aug 2026");
    await expect(globe.panel.getByTestId("prov-todo")).toHaveCount(0);
    await expect(globe.panel.getByRole("link", { name: /San José del Palmar/ })).toHaveAttribute(
      "href",
      /^https:\/\/www2\.sgc\.gov\.co\//,
    );
  });

  test("hiding REAL labels keeps every DEMO chip", async ({ page }) => {
    await globe.goto("?case=qadirabad");
    await expect(globe.panel.getByTestId("prov-real").first()).toBeVisible();
    await globe.helpButton.click();
    await page.getByTestId("toggle-real").click();
    await expect(globe.panel.getByTestId("prov-real")).toHaveCount(0);
    await expect(globe.panel.getByTestId("prov-demo").first()).toBeVisible();
    // The guided tour is live now: the switch stays on Explore while a case is open.
    await expect(page.getByTestId("mode-tour")).toHaveAttribute("aria-pressed", "false");
  });

  test("the whole-globe button closes the case and clears the link", async ({ page }) => {
    await globe.goto("?case=choco");
    await expect(globe.panel).toBeVisible();
    await globe.wholeGlobe.click();
    await expect(globe.panel).toBeHidden();
    await expect(globe.startCard).toBeVisible();
    await expect(page).not.toHaveURL(/case=/);
  });

  // Regression: leaving the explorer with a layer on the globe crashed the app (blank page),
  // because entity cleanup ran after the Cesium viewer was destroyed.
  test("leaving the explorer with a case open shows the method page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await globe.goto("?case=qadirabad");
    await expect(globe.dock).toBeVisible();
    await page.getByTestId("nav-method").click();
    await expect(page).toHaveURL(/\/method$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("Explorer: live questions", () => {
  test("the frame's next planned pass is the earliest one after today", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-11-10T12:00:00Z"));
    const globe = new GlobePage(page);
    await globe.mockObservationPlan();
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    const next = globe.planPasses.locator('li[data-next="true"]');
    await expect(next).toHaveCount(1);
    await expect(next).toContainText("20 Nov 2026");
    await expect(next).toContainText("next pass");
  });

  test("an archive failure on the plan says so and retries, without touching the answer", async ({
    page,
  }) => {
    const globe = new GlobePage(page);
    await globe.mockObservationPlan({ status: 502, failures: 1 });
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(page.getByTestId("plan-error")).toContainText(
      "We couldn't reach the radar archive",
    );
    await expect(globe.verdict).toBeVisible();
    await page.getByTestId("plan-error").getByRole("button", { name: "Try again" }).click();
    await expect(globe.planPasses).toContainText("39 passes in the plan");
  });

  // Issue #28: a demo case keeps its analysis; no other lens turns it into a live question.
  test("a demo case keeps its lens fixed and says why", async ({ page }) => {
    const globe = new GlobePage(page);
    await globe.mockObservationPlan();
    const api = await globe.mockExplorations({ first: succeededView() });
    await globe.goto("?case=qadirabad");

    await expect(page.getByTestId("lens-locked")).toHaveText(
      "Demo case, computed offline: its analysis is fixed to “Did it flood?”. Search a place or click the globe to ask the radar live.",
    );
    await expect(globe.lens("flood_wetland")).toHaveAttribute("aria-pressed", "true");
    await expect(globe.lens("flood_wetland")).toBeEnabled();
    for (const id of ["vegetation_disturbance", "wildfire", "agriculture", "insar"]) {
      await expect(globe.lens(id)).toBeDisabled();
      await expect(globe.lens(id)).toHaveAttribute("title", "Fixed for this demo case");
    }
    // The questions would each pick another lens, so they leave.
    await expect(page.getByTestId("lens-ask-wildfire")).toBeHidden();

    await globe.lens("wildfire").click({ force: true });
    await expect(globe.panelMeta).toContainText("Measured case");
    await expect(page).toHaveURL(/\?case=qadirabad$/);
    expect(api.posts).toHaveLength(0);
  });

  test("the ground-motion demo case keeps ground motion", async ({ page }) => {
    const globe = new GlobePage(page);
    await globe.mockObservationPlan();
    await globe.goto("?case=choco");
    await expect(globe.lens("insar")).toHaveAttribute("aria-pressed", "true");
    await expect(globe.lens("insar")).toBeEnabled();
    await expect(globe.lens("flood_wetland")).toBeDisabled();
    await expect(page.getByTestId("lens-locked")).toContainText("“Did the ground keep its echo?”");
  });

  test("the gateway's demo cases open measured, OFFLINE and locked to their lens", async ({
    page,
  }) => {
    const globe = new GlobePage(page);
    await globe.mockObservationPlan();
    const api = await globe.mockExplorations({ first: succeededView() });
    const LOCKED = [
      ["bug-fire", "wildfire", "Bug Fire, USA"],
      ["rowe-creek", "vegetation_disturbance", "Rowe Creek, USA"],
      ["skollersta", "agriculture", "Sköllersta, Sweden"],
    ] as const;
    for (const [id, lens, title] of LOCKED) {
      await globe.goto(`?case=${id}`);
      await expect(globe.panelTitle).toHaveText(title);
      await expect(globe.panel.getByTestId("prov-offline")).toHaveText("OFFLINE");
      await expect(globe.lens(lens)).toHaveAttribute("aria-pressed", "true");
      await expect(globe.lens("flood_wetland")).toBeDisabled();
      await expect(page.getByTestId("lens-locked")).toBeVisible();
    }
    expect(api.posts).toHaveLength(0);
  });

  test(
    "hovering land shows its NISAR frame; a click picks the spot and Analyze asks about it",
    { tag: "@globe" },
    async ({ page }) => {
      // Close-up imagery tiles render slowly in software WebGL.
      test.slow();
      const globe = new GlobePage(page);
      await globe.mockObservationPlan();
      await globe.mockCoverage();
      await globe.mockExplorations({ first: succeededView() });
      await globe.goto(`?frame=${LIVE_FRAME.id}`);
      await expect(globe.panelMeta).toContainText(LIVE_FRAME.title);

      await globe.hoverLand();
      await expect(globe.tooltip).toContainText(`${LIVE_FRAME.title} · HH+HV`);
      await expect(globe.tooltip).toContainText("click to ask the radar");

      const before = await globe.panelTitle.textContent();
      await globe.clickLand();
      // Step 2: the click only checks the catalog; nothing runs until Analyze.
      await expect(globe.placeCard).toHaveAttribute("data-state", "ready");
      await expect(globe.panel).toBeHidden();
      await globe.placeAnalyse.click();
      await expect(globe.panelTitle).not.toHaveText(before ?? "");
      await expect(globe.panelMeta).toContainText(LIVE_FRAME.title);
    },
  );
});

test.describe("Explorer: v8 top bar", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("search pill and L | S follow the wordmark, an open case adds no context pill; links fold as it narrows", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await globe.goto("?case=qadirabad");
    await expect(globe.panel).toBeVisible();
    await expect(globe.searchPill).toBeVisible();
    await expect(page.getByTestId("source-switch")).toBeVisible();
    await expect(page.getByTestId("context-chip")).toHaveCount(0);
    // Hidden until the backend accepts a direction: a choice that isn't sent would mislead.
    await expect(page.getByTestId("direction-switch")).toHaveCount(0);

    // 340 px by design; a full top row (the language button included) lets it give a little.
    const pill = await globe.searchPill.boundingBox();
    expect(pill?.width).toBeGreaterThan(300);
    expect(pill?.width).toBeLessThanOrEqual(340);

    // The mode switch hides below 1280 px and the page links below 1120 px.
    await page.setViewportSize({ width: 1300, height: 900 });
    await expect(page.getByTestId("mode-explore")).toBeVisible();
    await expect(page.getByTestId("nav-cases")).toBeVisible();

    await page.setViewportSize({ width: 1200, height: 900 });
    await expect(page.getByTestId("mode-explore")).toBeHidden();
    await expect(page.getByTestId("nav-cases")).toBeVisible();

    await page.setViewportSize({ width: 1100, height: 900 });
    await expect(page.getByTestId("nav-cases")).toBeHidden();
    await expect(page.getByTestId("nav-method")).toBeHidden();
  });
});

test.describe("Explorer: pick a spot (step 2)", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("a land spot shows the catalog's real dates, the 36-day gap and the expected wait", async ({
    page,
  }) => {
    await globe.mockCoverage();
    await globe.goto();
    await globe.searchInput.fill("32.30, 73.50");
    await globe.searchInput.press("Enter");

    await expect(globe.placeCard).toHaveAttribute("data-state", "ready");
    await expect(globe.placeCard).toContainText("NEW SPOT · LIVE ANALYSIS");
    await expect(page.getByTestId("spot-area")).toHaveText(/AREA\s*10\.24 km square/);
    await expect(page.getByTestId("spot-wait")).toContainText("1–4 min");
    await expect(page.getByTestId("spot-wait")).toContainText("plus any queue");
    await expect(page.getByTestId("spot-catalog")).toContainText("IN THE CATALOG · ASCENDING");
    await expect(page.getByTestId("spot-catalog")).toContainText("LAST 5 MONTHS");
    await expect(page.getByTestId("spot-catalog").getByRole("listitem")).toHaveCount(5);
    await expect(page.getByTestId("spot-gap")).toContainText(
      "The 36-day gap after 14 Jul is real.",
    );
    await expect(globe.placeAnalyse).toHaveText(/Analyze this spot/);

    await page.getByTestId("spot-cases").click();
    await expect(globe.placeCard).toBeHidden();
    await expect(globe.startCard).toBeVisible();
  });

  test(
    "an ocean click shows No NISAR data here and the nearest known case",
    { tag: "@globe" },
    async ({ page }) => {
      await globe.mockCoverage({ mock: "coverage-open-ocean" });
      await globe.goto();
      await globe.clickOcean();

      await expect(globe.placeCard).toHaveAttribute("data-state", "noCoverage");
      await expect(globe.placeCard).toContainText("CLICKED POINT · NO COVERAGE");
      await expect(page.getByTestId("place-title")).toHaveText("No NISAR data here");
      await expect(page.getByTestId("spot-nodata")).toHaveText(
        "The catalog has no compatible passes at this point. Over open ocean NISAR data isn't analyzed here.",
      );
      await expect(globe.spotNearest).toContainText(/Nearest known case · about [\d,]+ km/);
      expect(globe.coverageRequests).toHaveLength(1);

      await page.getByTestId("spot-another").click();
      await expect(globe.placeCard).toBeHidden();
      await expect(globe.startCard).toBeVisible();

      await globe.clickOcean();
      await globe.spotNearest.click();
      await expect(globe.panel).toBeVisible();
      await expect(globe.placeCard).toBeHidden();
    },
  );

  test("a catalog that doesn't answer says so and Try again asks once more", async ({ page }) => {
    await globe.mockCoverage({ failures: 1 });
    await globe.goto();
    await globe.searchInput.fill("32.30, 73.50");
    await globe.searchInput.press("Enter");

    await expect(page.getByTestId("spot-error")).toContainText(
      "We couldn't reach the radar archive",
    );
    await page.getByTestId("spot-error").getByRole("button", { name: "Try again" }).click();
    await expect(globe.placeCard).toHaveAttribute("data-state", "ready");
    expect(globe.coverageRequests).toHaveLength(2);
  });
});
