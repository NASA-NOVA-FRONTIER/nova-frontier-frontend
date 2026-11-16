import { expect, test, type Page } from "./fixtures";

const DISCLAIMER =
  "NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites. For non-U.S. Government websites, participants must comply with any data use parameters of that specific website.";

test.describe("Learn page", () => {
  test("the nav leads to Learn and marks it as the current page", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByTestId("nav-learn")).not.toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("nav-about")).toHaveAttribute("aria-current", "page");

    await page.getByTestId("nav-learn").click();
    await expect(page).toHaveURL(/\/learn$/);
    await expect(page).toHaveTitle("Learn · NISAR Hazard Watch by Nova Frontier");
    await expect(page.getByTestId("nav-learn")).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Learn to read radar.");
    await expect(page.getByTestId("site-footer")).toBeVisible();
  });

  test("each step in the index scrolls to its section", async ({ page }) => {
    await page.goto("/learn");
    for (const anchor of ["understand", "practise", "data", "apply"]) {
      await page.getByTestId(`learn-index-${anchor}`).click();
      await expect(page).toHaveURL(new RegExp(`#${anchor}$`));
      await expect(page.getByTestId(`learn-step-${anchor}`)).toBeInViewport();
      await page.evaluate(() => window.scrollTo(0, 0));
    }
  });

  test("every resource link is an exact https page opening in a new tab", async ({ page }) => {
    await page.goto("/learn");
    await expect(page.getByTestId("learn-resource")).toHaveCount(10);
    await expect(page.getByTestId("learn-radar")).toHaveCount(3);

    const outbound = page.locator("main a[target=_blank]");
    const hrefs = await outbound.evaluateAll((links) =>
      links.map((link) => [link.getAttribute("href") ?? "", link.getAttribute("rel") ?? ""]),
    );
    expect(hrefs).toHaveLength(15);
    for (const [href, rel] of hrefs) {
      expect(href).toMatch(/^https:\/\/[^#\s]+$/);
      expect(rel).toContain("noopener");
    }
    await expect(page.getByTestId("learn-disclaimer")).toHaveText(DISCLAIMER);
  });

  test("the compare slider moves with the keys and the closing link opens the explorer", async ({
    page,
  }) => {
    await page.goto("/learn");
    const slider = page.getByTestId("learn-compare-slider");
    await expect(slider).toHaveAttribute("aria-valuenow", "50");
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "55");

    await page.getByTestId("learn-cta").click();
    await expect(page).toHaveURL(/\/explore$/);
  });
});

// The canvas counts the frames it draws and says whether its loop is running, so these tests can
// tell a static frame from an animation without reading pixels.
const frames = async (page: Page): Promise<number> =>
  Number(await page.getByTestId("learn-waves-canvas").getAttribute("data-frames"));

test.describe("Learn radar waves", () => {
  test("the band and polarization radios move with the arrow keys and the angle with the range", async ({
    page,
  }) => {
    await page.goto("/learn");
    const waves = page.getByTestId("learn-waves");
    await waves.scrollIntoViewIfNeeded();
    await expect(waves.getByRole("heading", { level: 2 })).toHaveText(
      "Change the wave, change what comes back.",
    );
    const chip = waves.getByTestId("prov-illustrative");
    await expect(chip).toHaveText("ILLUSTRATIVE · WAVELENGTHS TO SCALE");
    await expect(chip).toHaveAttribute("title", /^A diagram, not a measurement\./);
    const canvas = page.getByTestId("learn-waves-canvas");
    const readout = page.getByTestId("learn-waves-readout");
    await expect(readout).toContainText("The long wave reaches deepest");
    await expect(page.getByTestId("learn-waves-meta")).toHaveText(
      "1.26 GHz · NISAR (NASA/JPL), also SAOCOM",
    );

    // Roving tabindex: only the checked radio is in the tab order.
    const L = page.getByTestId("learn-waves-band-L");
    const S = page.getByTestId("learn-waves-band-S");
    const C = page.getByTestId("learn-waves-band-C");
    await expect(L).toHaveAttribute("tabindex", "0");
    await expect(S).toHaveAttribute("tabindex", "-1");
    await L.focus();
    await page.keyboard.press("ArrowRight");
    await expect(S).toBeFocused();
    await expect(S).toHaveAttribute("aria-checked", "true");
    await expect(L).toHaveAttribute("aria-checked", "false");
    await expect(readout).toContainText("The middle wave scatters in the branches");
    await expect(page.getByTestId("learn-waves-meta")).toHaveText("3.2 GHz · NISAR (ISRO)");
    await expect(canvas).toHaveAttribute(
      "aria-label",
      "Diagram: S-band · 9.4 cm pulse at 40 degrees, HH echo. The middle wave scatters in the branches.",
    );
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(C).toBeFocused();
    await expect(readout).toContainText("The short wave scatters at the leaves");

    // Tab leaves the band group and lands on the checked polarization.
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("learn-waves-pol-HH")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId("learn-waves-pol-HV")).toHaveAttribute("aria-checked", "true");
    await expect(waves).toContainText("ECHO · HV");
    await expect(readout).toContainText("which mostly happens inside vegetation.");

    const range = page.getByTestId("learn-waves-incidence");
    await expect(range).toHaveAttribute("min", "33");
    await expect(range).toHaveAttribute("max", "47");
    await page.keyboard.press("Tab");
    await expect(range).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(range).toHaveValue("41");
    await expect(range).toHaveAttribute("aria-valuetext", "41°");
    await page.keyboard.press("End");
    await expect(range).toHaveValue("47");
    await expect(readout).toContainText("A shallower angle crosses more canopy on the way down.");
    await expect(canvas).toHaveAttribute("aria-label", /at 47 degrees, HV echo/);
  });

  test("under reduced motion it draws one static frame that redraws when a control changes", async ({
    page,
  }) => {
    await page.goto("/learn");
    const canvas = page.getByTestId("learn-waves-canvas");
    await canvas.scrollIntoViewIfNeeded();
    await expect(canvas).toHaveAttribute("data-frames", /\d+/);
    await expect(canvas).toHaveAttribute("data-running", "false");
    const still = await frames(page);
    await page.waitForTimeout(1000);
    expect(await frames(page)).toBe(still);

    await page.getByTestId("learn-waves-band-C").click();
    await expect(canvas).toHaveAttribute("data-frames", String(still + 1));
    await page.waitForTimeout(500);
    expect(await frames(page)).toBe(still + 1);
  });

  test.describe("with motion allowed", () => {
    test.use({ reducedMotion: "no-preference" });

    test("it animates on screen and pauses off screen and when the tab is hidden", async ({
      page,
    }) => {
      await page.goto("/learn");
      const canvas = page.getByTestId("learn-waves-canvas");
      await canvas.scrollIntoViewIfNeeded();
      await expect(canvas).toHaveAttribute("data-running", "true");
      const start = await frames(page);
      await expect.poll(() => frames(page)).toBeGreaterThan(start + 10);

      // Off screen: the loop stops and the count holds.
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(canvas).toHaveAttribute("data-running", "false");
      const offScreen = await frames(page);
      await page.waitForTimeout(500);
      expect(await frames(page)).toBe(offScreen);

      // Back on screen it runs again.
      await canvas.scrollIntoViewIfNeeded();
      await expect(canvas).toHaveAttribute("data-running", "true");

      // Hidden tab: the loop stops; visible again, it resumes.
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await expect(canvas).toHaveAttribute("data-running", "false");
      const hidden = await frames(page);
      await page.waitForTimeout(500);
      expect(await frames(page)).toBe(hidden);
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await expect(canvas).toHaveAttribute("data-running", "true");
      await expect.poll(() => frames(page)).toBeGreaterThan(hidden);
    });
  });
});
