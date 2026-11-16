import { expect, test, type Locator, type Page } from "./fixtures";

// T2 (#15): the v9 ⓘ popover (SPECS-flow-v9 §4) on its stub-build harness, /__e2e/infotip.
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "phone", width: 390, height: 844 },
] as const;
const EDGE = 8;

// Pushes to main run the suite on the production dist/, where the harness route doesn't exist.
test.beforeEach(() => {
  test.skip(
    test.info().project.metadata["globe"] !== "stub",
    "the harness only exists in the stub build",
  );
});

const box = async (locator: Locator) => {
  const found = await locator.boundingBox();
  if (found === null) throw new Error("not laid out");
  return found;
};

const tip = (page: Page, name: string) => ({
  button: page.getByTestId(`tip-${name}`),
  pop: page.getByTestId(`tip-${name}-pop`),
});

for (const viewport of VIEWPORTS) {
  test.describe(`InfoTip at ${viewport.width} px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await page.goto("/__e2e/infotip");
      await expect(page.getByTestId("tip-plain")).toBeVisible();
    });

    test("hover opens it and leaving closes it", async ({ page }) => {
      const { button, pop } = tip(page, "plain");
      await button.hover();
      await expect(pop).toBeVisible();
      await expect(pop).toContainText("Plain");
      await page.getByTestId("outside").hover();
      await expect(pop).toBeHidden();
    });

    test("focus opens it, wires aria-describedby, and blur closes it", async ({ page }) => {
      const { button, pop } = tip(page, "plain");
      await expect(button).not.toHaveAttribute("aria-describedby");
      await button.focus();
      await expect(pop).toBeVisible();
      await expect(button).toHaveAttribute("aria-expanded", "true");
      const id = await button.getAttribute("aria-describedby");
      expect(id).toBeTruthy();
      await expect(page.locator(`[id="${id}"]`)).toHaveAttribute("role", "tooltip");
      await expect(page.getByRole("tooltip")).toBeVisible();
      await button.blur();
      await expect(pop).toBeHidden();
      await expect(button).not.toHaveAttribute("aria-describedby");
    });

    test("click pins it past mouse leave; a second click closes it", async ({ page }) => {
      const { button, pop } = tip(page, "plain");
      await button.click();
      await expect(button).toHaveAttribute("data-pinned", "true");
      await page.mouse.move(viewport.width / 2, viewport.height - 200);
      await page.waitForTimeout(200); // past the 80 ms close delay
      await expect(pop).toBeVisible();
      await button.click();
      await expect(pop).toBeHidden();
    });

    test("a click outside closes a pinned tip, and only one is open at a time", async ({
      page,
    }) => {
      const plain = tip(page, "plain");
      const right = tip(page, "right");
      await plain.button.click();
      await expect(plain.pop).toBeVisible();
      await right.button.click();
      await expect(plain.pop).toBeHidden();
      await expect(right.pop).toBeVisible();
      await page.getByTestId("outside").click();
      await expect(right.pop).toBeHidden();
    });

    test("Esc closes it and keeps focus on the button", async ({ page }) => {
      const { button, pop } = tip(page, "plain");
      await button.focus();
      await expect(pop).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(pop).toBeHidden();
      await expect(button).toBeFocused();
    });

    test("Esc on an open tip doesn't reach the page's own Esc handler", async ({ page }) => {
      const { button, pop } = tip(page, "plain");
      const pageEsc = page.getByTestId("page-esc");
      await button.focus();
      await expect(pop).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(pop).toBeHidden();
      await expect(pageEsc).toHaveText("0");
      // With no tip open, Esc does reach the page: the spy works.
      await page.keyboard.press("Escape");
      await expect(pageEsc).toHaveText("1");
    });

    test("escapes the scrolling panel and follows its scroll", async ({ page }) => {
      const { button, pop } = tip(page, "panel");
      await button.click();
      await expect(pop).toBeVisible();
      expect(await pop.evaluate((el) => el.parentElement === document.body)).toBe(true);
      const panel = await box(page.getByTestId("panel"));
      const before = await box(pop);
      // Inside the panel it would be clipped at the panel's bottom edge.
      expect(before.y + before.height).toBeGreaterThan(panel.y + panel.height);
      await page.getByTestId("panel").evaluate((el) => el.scrollBy(0, 30));
      await expect.poll(async () => Math.round((await box(pop)).y)).toBe(Math.round(before.y - 30));
    });

    test("flips above near the bottom edge", async ({ page }) => {
      const { button, pop } = tip(page, "bottom");
      await button.focus();
      await expect(pop).toHaveAttribute("data-side", "above");
      const b = await box(button);
      const p = await box(pop);
      expect(p.y + p.height).toBeLessThanOrEqual(b.y);
      expect(p.y).toBeGreaterThanOrEqual(EDGE);
    });

    test("stays inside the viewport at the right edge, at most 280 px wide", async ({ page }) => {
      const { button, pop } = tip(page, "right");
      await button.focus();
      await expect(pop).toHaveAttribute("data-side", "below");
      const p = await box(pop);
      expect(p.width).toBeLessThanOrEqual(280);
      expect(p.x).toBeGreaterThanOrEqual(EDGE - 0.5);
      expect(p.x + p.width).toBeLessThanOrEqual(viewport.width - EDGE + 0.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    });

    test("shows without a fade under reduced motion", async ({ page }) => {
      const { button, pop } = tip(page, "plain");
      await button.focus();
      await expect(pop).toBeVisible();
      expect(await pop.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    });
  });
}

test.describe("InfoTip on touch", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("tap pins and unpins; a tap outside closes it", async ({ page }) => {
    await page.goto("/__e2e/infotip");
    const { button, pop } = tip(page, "plain");
    await button.tap();
    await expect(pop).toBeVisible();
    await expect(button).toHaveAttribute("data-pinned", "true");
    await button.tap();
    await expect(pop).toBeHidden();
    await button.tap();
    await expect(pop).toBeVisible();
    await page.getByTestId("outside").tap();
    await expect(pop).toBeHidden();
  });
});
