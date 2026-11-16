import { expect, test, type Locator, type Page } from "./fixtures";
import { succeededView } from "./pom/explorationMock";
import { GlobePage, LIVE_FRAME } from "./pom/GlobePage";

// Cristian's screenshots (16 Nov): the last lens tab looked cut off ("Wilc…").
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

const box = async (locator: Locator) => {
  const found = await locator.boundingBox();
  if (found === null) throw new Error("not laid out");
  return found;
};

const openLiveResult = async (page: Page): Promise<void> => {
  const globe = new GlobePage(page);
  await globe.skipOnboarding();
  await globe.mockObservationPlan();
  await globe.mockExplorations({ first: succeededView() });
  await globe.goto(`?frame=${LIVE_FRAME.id}`);
  await expect(page.getByTestId("lens-tabs")).toBeVisible();
};

test.describe("Live result: nothing clipped or overlapping", () => {
  test("1440: every lens tab sits whole inside its group", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await openLiveResult(page);
    const group = page.getByTestId("lens-tabs");
    const outer = await box(group);
    const tabs = await group.getByRole("button").all();
    expect(tabs.length).toBeGreaterThan(4);
    for (const tab of tabs) {
      const inner = await box(tab);
      expect(inner.x).toBeGreaterThanOrEqual(outer.x - 0.5);
      expect(inner.y).toBeGreaterThanOrEqual(outer.y - 0.5);
      expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width + 0.5);
      expect(inner.y + inner.height).toBeLessThanOrEqual(outer.y + outer.height + 0.5);
    }
  });

  test("390: the lens tabs stay one row that scrolls sideways", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openLiveResult(page);
    const group = page.getByTestId("lens-tabs");
    const sizes = await group.evaluate((row) => ({
      scroll: row.scrollWidth,
      client: row.clientWidth,
    }));
    expect(sizes.scroll).toBeGreaterThan(sizes.client);
    const tops = await group
      .getByRole("button")
      .evaluateAll(
        (tabs) => new Set(tabs.map((tab) => Math.round(tab.getBoundingClientRect().top))).size,
      );
    expect(tops).toBe(1);
  });
});
