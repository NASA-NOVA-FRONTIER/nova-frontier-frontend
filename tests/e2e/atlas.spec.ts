import { expect, test } from "@playwright/test";

test.describe("Landing surface atlas", () => {
  test("opens on Chenab and expands a tile on keyboard focus and click", async ({ page }) => {
    await page.goto("/");
    const atlas = page.getByTestId("surface-atlas");
    await expect(atlas.getByText("How each place's echo behaves over time.")).toBeVisible();
    await expect(atlas.getByTestId("atlas-chip")).toHaveText("EXPERIMENTAL · NOVA-FRONTIER-MODEL");

    const chenab = page.getByTestId("atlas-tile-chenab");
    await expect(chenab).toHaveAttribute("aria-expanded", "true");

    // Tab from Chenab through the strip until Murray Basin has focus.
    const murray = page.getByTestId("atlas-tile-murray");
    await chenab.focus();
    for (let i = 0; i < 4; i += 1) await page.keyboard.press("Tab");
    await expect(murray).toBeFocused();
    await expect(murray).toHaveAttribute("aria-expanded", "true");
    await expect(chenab).toHaveAttribute("aria-expanded", "false");
    await expect(murray.getByText("16 DATES · HOLDOUT")).toBeVisible();

    const okavango = page.getByTestId("atlas-tile-okavango");
    await okavango.click();
    await expect(okavango).toHaveAttribute("aria-expanded", "true");
    await expect(murray).toHaveAttribute("aria-expanded", "false");
  });

  test("has no transition under reduced motion", async ({ page }) => {
    await page.goto("/");
    const duration = await page
      .getByTestId("atlas-tile-chenab")
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    // site.css clamps every transition to a near-zero duration under reduced motion.
    expect(Number.parseFloat(duration)).toBeLessThan(0.01);
  });

  test("scrolls inside its strip on a phone, never the page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const murray = page.getByTestId("atlas-tile-murray");
    await murray.scrollIntoViewIfNeeded();
    await murray.click();
    await expect(murray).toHaveAttribute("aria-expanded", "true");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
