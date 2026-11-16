import { expect, test } from "./fixtures";

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

  test("loads every tile as a 1024 px WebP under 250 KB, with its size reserved", async ({
    page,
  }) => {
    await page.goto("/");
    const strip = page.getByTestId("surface-atlas");
    await strip.scrollIntoViewIfNeeded();
    for (const id of ["forest-river", "chenab", "murray"]) {
      const img = page.getByTestId(`atlas-img-${id}`);
      await expect(img).toHaveAttribute("width", "1024");
      await expect(img).toHaveAttribute("height", "1024");
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1024);
      const src = await img.evaluate((el: HTMLImageElement) => el.currentSrc);
      expect(src).toMatch(new RegExp(`/atlas/${id}\\.webp$`));
      const body = await (await page.request.get(src)).body();
      expect(body.byteLength).toBeLessThanOrEqual(250 * 1024);
    }
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
