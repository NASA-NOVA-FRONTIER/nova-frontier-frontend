import { expect, test, type Locator, type Page } from "./fixtures";
import { succeededView } from "./pom/explorationMock";
import { GlobePage, LIVE_FRAME } from "./pom/GlobePage";

// Issue #31: design v8 on a phone, at the reference's 390 × 844 (SPECS-v8 §1 Mobile).
const PHONE = { width: 390, height: 844 };
const EDGE = 8;
// The reference's sheet heights (`sheetFrac`), as in mobileSheet.ts.
const SHEET = { spot: 0.5, wait: 0.46, result: 0.46, error: 0.56, expanded: 0.86 };

test.use({ viewport: PHONE });

const box = async (locator: Locator) => {
  const found = await locator.boundingBox();
  if (found === null) throw new Error("not laid out");
  return found;
};

// The sheet: 8 px from the sides and the bottom, its height a share of the screen.
const expectSheet = async (locator: Locator, fraction: number): Promise<void> => {
  await expect(locator).toBeVisible();
  await expect
    .poll(async () => Math.round((await box(locator)).height))
    .toBeCloseTo(fraction * PHONE.height, -1);
  const sheet = await box(locator);
  expect(sheet.x).toBeCloseTo(EDGE, 0);
  expect(sheet.x + sheet.width).toBeCloseTo(PHONE.width - EDGE, 0);
  expect(sheet.y + sheet.height).toBeCloseTo(PHONE.height - EDGE, 0);
};

// Nothing the user reads or taps leaves the screen sideways, and the page never scrolls sideways.
const expectNoSideScroll = async (page: Page): Promise<void> => {
  const outside = await page.evaluate(() => {
    const parts = document.querySelectorAll<HTMLElement>(
      ".x-top > *, .x-mobilebar *, .x-place, .x-panel, .x-jobmodal, .x-timeline, .x-nova-bubble, .x-sheet-handle",
    );
    return [...parts]
      .filter((part) => part.getClientRects().length > 0 && !part.closest(".x-pill__word"))
      .map((part) => ({ part, rect: part.getBoundingClientRect() }))
      .filter(({ rect }) => rect.left < -0.5 || rect.right > window.innerWidth + 0.5)
      .map(({ part }) => part.className || part.tagName);
  });
  expect(outside).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    PHONE.width,
  );
};

// Nova sits above whatever is at the bottom: the sheet, and the timeline when it shows.
const expectNovaAbove = async (page: Page, below: Locator): Promise<void> => {
  const bubble = page.getByTestId("nova-bubble");
  await expect
    .poll(async () => {
      const nova = await box(bubble);
      return nova.y + nova.height <= (await box(below)).y;
    })
    .toBe(true);
};

test.describe("Explorer v8 on a phone: the bottom sheet", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("the top row fits: mark, the short search and both menus", async ({ page }) => {
    await globe.goto();

    await expect(globe.searchInput).toHaveAttribute("placeholder", "Search a place");
    await expect(globe.helpButton).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId("download-button")).toBeInViewport({ ratio: 1 });
    expect((await box(globe.searchPill)).width).toBeGreaterThan(150);
    // Step 1 keeps its start card; no sheet handle and no layer row yet.
    await expect(page.getByTestId("sheet-handle")).toHaveCount(0);
    await expect(page.getByTestId("mobile-bar")).toHaveCount(0);
    await expectNoSideScroll(page);
  });

  test("step 2: a searched spot opens in the sheet, Nova above it", async ({ page }) => {
    await globe.mockPlaces();
    await globe.mockCoverage();
    await globe.goto();

    await globe.searchInput.click();
    await globe.searchInput.fill("Qadirabad");
    await globe.searchInput.press("Enter");
    await expect(globe.searchMenu).toBeInViewport();
    await globe.searchMenu.getByRole("option", { name: /Phalia Tehsil/ }).click();
    await globe.useSquare.click();
    await expect(page.getByTestId("spot-area")).toBeVisible();

    await expect(page.locator("main")).toHaveAttribute("data-sheet", "spot");
    await expectSheet(globe.placeCard, SHEET.spot);
    await expectNovaAbove(page, globe.placeCard);
    await expectNoSideScroll(page);
  });

  test("step 2: a failed catalog check keeps its retry inside the sheet", async ({ page }) => {
    await globe.mockPlaces();
    await globe.mockCoverage({ failures: 1 });
    await globe.goto();

    await globe.searchInput.fill("Qadirabad");
    await globe.searchInput.press("Enter");
    await globe.searchMenu.getByRole("option", { name: /Phalia Tehsil/ }).click();
    await globe.useSquare.click();

    const error = page.getByTestId("spot-error");
    await expect(error).toBeVisible();
    await expectSheet(globe.placeCard, SHEET.spot);
    await error.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByTestId("spot-area")).toBeVisible();
  });

  test("step 3: the waiting panel is the sheet", async ({ page }) => {
    await globe.mockExplorations();
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(page.getByTestId("job-stages")).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("data-sheet", "wait");
    await expectSheet(globe.jobModal, SHEET.wait);
    await expectNovaAbove(page, globe.jobModal);
    await expectNoSideScroll(page);
  });

  test("steps 4–6: layer pills under the search, compact timeline over the sheet", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(page.getByTestId("lens-card")).toBeVisible();

    await expect(page.locator("main")).toHaveAttribute("data-sheet", "result");
    await expectSheet(globe.panel, SHEET.result);

    // The real answer has no rule layer, so its pill stays away (the unit test covers Rule).
    const pills = page.getByTestId("layer-pills");
    await expect(pills.getByRole("button")).toHaveText(["HH", "HV", "Δ dB"]);
    await expect(page.getByTestId("layer-pill-hh")).toHaveAttribute("aria-pressed", "true");
    expect((await box(pills)).y).toBeGreaterThan((await box(globe.searchPill)).y);
    // Same rows as the dock: the answer has no change layer and no HV image on its target pass.
    await expect(page.getByTestId("layer-pill-change")).toBeDisabled();
    const hv = page.getByTestId("layer-pill-hv");
    await expect(hv).toBeDisabled();
    await expect(hv).toHaveAttribute("title", "No HV image for this pass");
    // 14 Jul has both channels, so HV can be picked there.
    await globe.timelinePasses("base").first().click();
    await expect(globe.timelineReadout).toContainText("14 Jul 2026");
    await expect(hv).toBeEnabled();
    await hv.click();
    await expect(hv).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("layer-pill-hh")).toHaveAttribute("aria-pressed", "false");

    // The compact strip sits on the sheet, without the time-lapse button.
    await expect(globe.timeline).toBeVisible();
    const strip = await box(globe.timeline);
    expect(strip.y + strip.height).toBeLessThanOrEqual((await box(globe.panel)).y);
    await expect(page.getByTestId("timeline-play")).toBeHidden();
    await expectNovaAbove(page, globe.timeline);
    await expectNoSideScroll(page);
  });

  test("the handle expands the sheet over the timeline and gives the globe back", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(page.getByTestId("lens-card")).toBeVisible();

    const handle = page.getByTestId("sheet-handle");
    await expect(handle).toHaveAttribute("aria-expanded", "false");
    await handle.click();
    await expect(handle).toHaveAttribute("aria-expanded", "true");
    await expectSheet(globe.panel, SHEET.expanded);
    await expect(globe.timeline).toBeHidden();
    await expect(page.getByTestId("nova-bubble")).toBeHidden();

    await handle.click();
    await expectSheet(globe.panel, SHEET.result);
    await expect(globe.timeline).toBeVisible();
  });

  test("step 8: an error and its actions fill the taller sheet", async ({ page }) => {
    await globe.mockExplorations({
      startProblems: [
        { status: 503, reasonCode: "QUEUE_FULL", detail: "2 explorations are running" },
      ],
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.jobError).toHaveAttribute("data-category", "queueFull");
    await expect(page.locator("main")).toHaveAttribute("data-sheet", "error");
    await expectSheet(globe.panel, SHEET.error);
    await expect(globe.jobError.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByTestId("layer-pills")).toHaveCount(0);
    await expectNoSideScroll(page);
  });
});

test.describe("Explorer v8 on a desktop: no phone layout", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("keeps the side panel, the dock and the time-lapse", async ({ page }) => {
    const globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(page.getByTestId("lens-card")).toBeVisible();

    await expect(page.locator("main")).toHaveAttribute("data-sheet", "none");
    await expect(page.getByTestId("mobile-bar")).toHaveCount(0);
    await expect(page.getByTestId("sheet-handle")).toHaveCount(0);
    await expect(globe.liveLayerDock).toBeVisible();
    await expect(page.getByTestId("timeline-play")).toBeVisible();
  });
});
