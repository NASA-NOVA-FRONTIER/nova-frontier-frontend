import { expect, test, type Locator, type Page } from "@playwright/test";

import { succeededView } from "./pom/explorationMock";
import { GlobePage, LIVE_FRAME } from "./pom/GlobePage";

// SPECS-v8 Mobile (#31): one bottom sheet for steps 2–6 and 8 at 390 × 844.
const PHONE = { width: 390, height: 844 };
const MARGIN = 8;

test.use({ viewport: PHONE });

const noSideScroll = async (page: Page): Promise<void> => {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(PHONE.width);
};

// The sheet sits 8 px from the sides and the bottom, at the step's share of the screen.
const expectSheet = async (sheet: Locator, fraction: number): Promise<void> => {
  const box = await sheet.boundingBox();
  if (box === null) throw new Error("the sheet is not on screen");
  expect(Math.abs(box.x - MARGIN)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.width - (PHONE.width - 2 * MARGIN))).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y + box.height - (PHONE.height - MARGIN))).toBeLessThanOrEqual(1);
  expect(Math.abs(box.height - PHONE.height * fraction)).toBeLessThanOrEqual(2);
};

test.describe("Explorer on a phone (390 × 844)", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
    await globe.mockCoverage();
  });

  test("the start card is the sheet; search and Help head the screen; nothing scrolls sideways", async ({
    page,
  }) => {
    await globe.goto();
    await expect(page.locator("main")).toHaveAttribute("data-sheet", "find");
    await expectSheet(globe.startCard, 0.46);
    await expect(globe.searchInput).toHaveAttribute("placeholder", "Search a place");
    await expect(globe.helpButton).toBeVisible();
    await expect(page.getByRole("link", { name: "NISAR Hazard Watch" })).toBeHidden();
    await expect(globe.wholeGlobe).toBeHidden();
    await expect(page.getByTestId("layer-pills")).toHaveCount(0);
    await noSideScroll(page);
  });

  test("a spot and a spot with no data each fill the sheet at their own height", async ({
    page,
  }) => {
    await globe.goto();
    await globe.searchInput.fill("32.30, 73.50");
    await globe.searchInput.press("Enter");
    await expect(globe.placeCard).toHaveAttribute("data-state", "ready");
    await expect(page.locator("main")).toHaveAttribute("data-sheet", "spot");
    await expectSheet(globe.placeCard, 0.5);
    await noSideScroll(page);

    // Registered after beforeEach's land answer, so this one wins.
    await globe.mockCoverage({ mock: "coverage-open-ocean" });
    await page.getByTestId("place-close").click();
    await globe.searchInput.fill("-30, -30");
    await globe.searchInput.press("Enter");
    await expect(globe.placeCard).toHaveAttribute("data-state", "noCoverage");
    await expect(page.locator("main")).toHaveAttribute("data-sheet", "nodata");
    await expectSheet(globe.placeCard, 0.42);
    await noSideScroll(page);
  });

  test("the wait view is the sheet while the radar is read", async ({ page }) => {
    await globe.mockExplorations();
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(globe.jobModal).toBeVisible();
    await expect(page.locator("main")).toHaveAttribute("data-sheet", "wait");
    await expectSheet(globe.jobModal, 0.46);
    await noSideScroll(page);
  });

  test("the result puts layer pills under the search, a compact timeline above the sheet and Nova above both", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(page.locator("main")).toHaveAttribute("data-sheet", "result");
    await expectSheet(globe.panel, 0.46);

    const pills = page.getByTestId("layer-pills");
    await expect(pills).toBeVisible();
    await expect(pills.getByRole("button")).toHaveText(["HH", "HV", "Δ dB", "Rule"]);
    // The real answer has pass images but no change or rule layer: those pills stay off rather
    // than show another layer.
    await expect(page.getByTestId("layer-pill-change")).toBeDisabled();
    await expect(page.getByTestId("layer-pill-rule")).toBeDisabled();
    const hh = page.getByTestId("layer-pill-hh");
    await expect(hh).toBeEnabled();
    const before = await hh.getAttribute("aria-pressed");
    await hh.click();
    await expect(hh).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");
    const pillsBox = await pills.boundingBox();
    const searchBox = await globe.searchPill.boundingBox();
    expect(pillsBox?.y ?? 0).toBeGreaterThan((searchBox?.y ?? 0) + (searchBox?.height ?? 0));

    await expect(globe.timeline).toBeVisible();
    await expect(page.getByTestId("timeline-play")).toBeHidden();
    const timeline = await globe.timeline.boundingBox();
    const panel = await globe.panel.boundingBox();
    const nova = await page.getByTestId("nova-bubble").boundingBox();
    if (timeline === null || panel === null || nova === null) throw new Error("missing boxes");
    expect(timeline.y + timeline.height).toBeLessThanOrEqual(panel.y);
    expect(nova.y + nova.height).toBeLessThanOrEqual(timeline.y);
    await noSideScroll(page);
  });

  test("an error fills the taller error sheet", async ({ page }) => {
    await globe.mockExplorations({
      startProblems: [
        { status: 503, reasonCode: "QUEUE_FULL", detail: "5 explorations are running" },
      ],
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(globe.jobError).toContainText("Lots of people are asking right now.");
    await expect(page.locator("main")).toHaveAttribute("data-sheet", "error");
    await expectSheet(globe.panel, 0.56);
    await expect(page.getByTestId("layer-pills")).toHaveCount(0);
    await noSideScroll(page);
  });
});
