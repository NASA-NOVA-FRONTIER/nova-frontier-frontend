import { expect, test, type Locator, type Page } from "./fixtures";
import { succeededView } from "./pom/explorationMock";
import { GlobePage, LIVE_FRAME } from "./pom/GlobePage";

// Cristian's screenshots (16 Nov): the last lens tab looked cut off ("Wilc…") and the timeline's
// Target and Next labels ran into each other ("TARGE NEXT") on the live flood result.
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

// A hidden label (the phone strip drops them) can't collide with anything.
const expectApart = async (a: Locator, b: Locator): Promise<void> => {
  const [one, two] = await Promise.all([a.boundingBox(), b.boundingBox()]);
  if (one === null || two === null) return;
  const overlap =
    one.x < two.x + two.width &&
    two.x < one.x + one.width &&
    one.y < two.y + two.height &&
    two.y < one.y + one.height;
  expect(overlap, `${JSON.stringify(one)} overlaps ${JSON.stringify(two)}`).toBe(false);
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

  for (const viewport of [DESKTOP, PHONE])
    test(`${viewport.width}: the Target and Next labels don't overlap`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openLiveResult(page);
      const track = page.getByTestId("timeline-track");
      await expect(track).toBeVisible();
      if (viewport === DESKTOP) {
        await expect(track.locator(".x-tl__target-label")).toBeVisible();
        await expect(page.getByTestId("timeline-next")).toBeVisible();
      }
      await expectApart(track.locator(".x-tl__target-label"), page.getByTestId("timeline-next"));
    });
});
