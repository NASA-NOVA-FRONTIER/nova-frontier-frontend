import { expect, test } from "@playwright/test";

test.describe("Landing and about pages", () => {
  test("the landing compare slider moves with the arrow keys", async ({ page }) => {
    await page.goto("/");
    const slider = page.getByTestId("compare-slider");
    // Reduced motion skips the intro tween, so the split starts in the middle.
    await expect(slider).toHaveAttribute("aria-valuenow", "50");
    await slider.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(slider).toHaveAttribute("aria-valuenow", "45");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "55");
  });

  test("the landing cases carousel opens a case in the explorer", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-testid^=landing-case-]")).toHaveCount(5);
    await expect(page.getByTestId("landing-chip-choco")).toHaveText("COHERENCE ONLY · 0.247");
    await expect(page.getByTestId("landing-chip-qadirabad")).toHaveText(
      "MEASURED CASE · ESRI WORLD IMAGERY",
    );
    await expect(page.getByTestId("landing-case-qadirabad").getByTestId("prov-offline")).toHaveText(
      "OFFLINE",
    );
    await expect(page.getByTestId("landing-case-choco")).toContainText("Open on the globe →");
    await expect(page.getByTestId("landing-case-choco")).not.toContainText("See the event");
    await page.getByTestId("landing-case-choco").click();
    await expect(page).toHaveURL(/\/explore\?case=choco$/);
  });

  test("the landing sections follow the v8 order, with the atlas between honesty and sources", async ({
    page,
  }) => {
    await page.goto("/");
    const sections = page.locator("main#main > section");
    await expect(sections).toHaveCount(9);
    const names = await sections.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("aria-labelledby") ?? node.getAttribute("aria-label")),
    );
    expect(names).toEqual([
      "What NISAR sees",
      "compare-heading",
      "pipeline-heading",
      "cases-heading",
      "honesty-heading",
      "atlas-heading",
      "sources-heading",
      "mission-heading",
      "close-heading",
    ]);
  });

  test("the landing story ends on Qadirabad with its real figures", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("When the river rose, the radar went dark.")).toBeVisible();
    await page.getByTestId("story-case-link").click();
    await expect(page).toHaveURL(/\/explore\?case=qadirabad$/);
  });

  test("the landing shows where the method fails and the data it uses", async ({ page }) => {
    await page.goto("/");
    const bars = page.getByTestId("honesty-bars");
    await expect(bars).toContainText("32.6%");
    await expect(bars).toContainText("165 / 506");
    await expect(bars.getByTestId("prov-real")).toBeVisible();

    const sources = page.getByTestId("data-sources").getByRole("link");
    await expect(sources).toHaveCount(5);
    await expect(sources.first()).toHaveAttribute(
      "href",
      "https://nisar-docs.asf.alaska.edu/gcov/",
    );
  });

  test("the landing mission shows the interactive satellite and leads to Method", async ({
    page,
  }) => {
    await page.goto("/");
    const figure = page.getByTestId("mission-figure");
    await figure.scrollIntoViewIfNeeded();
    await expect(figure).toHaveAttribute("data-mode", "model");
    const model = figure.getByTestId("nisar-satellite");
    await expect(model).toHaveAttribute("data-status", "ready");
    // Reduced motion: deployed, no autorotate, so the loop stays idle.
    await expect(model).toHaveAttribute("data-running", "false");
    await expect(model.getByTestId("nisar-hotspot-reflector")).toHaveCSS("opacity", "1");
    await expect(figure.getByRole("heading", { level: 2 })).toHaveText(
      "Twelve metres of gold mesh.",
    );
    await expect(page.getByTestId("mission-caption")).toHaveText(
      "Interactive model built to NASA/JPL published dimensions. The gold strip is the radar's swath on the ground.",
    );
    await page.getByTestId("mission-method-link").click();
    await expect(page).toHaveURL(/\/method$/);
  });

  test("the landing nav leads to cases, method, about and the explorer", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Earth, without the clouds.");

    await page.getByTestId("nav-cases").click();
    await expect(page).toHaveURL(/\/cases$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Four places, measured honestly.",
    );

    await page.getByTestId("nav-method").click();
    await expect(page).toHaveURL(/\/method$/);

    await page.getByTestId("nav-about").click();
    await expect(page).toHaveURL(/\/about$/);

    await page.getByTestId("nav-explore").click();
    await expect(page).toHaveURL(/\/explore$/);
  });

  test("every site page shows the design version in the footer", async ({ page }) => {
    for (const path of ["/", "/cases", "/about"]) {
      await page.goto(path);
      await expect(page.getByTestId("site-version")).toHaveText("Design v7 · 0.7.0");
    }
  });

  test("the about page lists the team, from the nav and from the explorer intro", async ({
    page,
  }) => {
    await page.goto("/method");
    await expect(page.getByTestId("method-satellite")).toBeAttached();
    await page.getByTestId("nav-about").click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Six people, one orbit.");
    await expect(page.locator("[data-testid^=member-]")).toHaveCount(6);
    await expect(page.getByTestId("member-cris-eci")).toContainText("Front end · design");
    await expect(page.getByTestId("site-footer")).toContainText("Cattleya trianae");

    await page.goto("/explore");
    await page.getByTestId("intro-team").click();
    await expect(page).toHaveURL(/\/about$/);
  });

  test("every team card opens a GitHub and a LinkedIn profile in a new tab", async ({ page }) => {
    await page.goto("/about");
    const cards = page.locator("[data-testid^=member-]");
    await expect(cards).toHaveCount(6);
    for (const card of await cards.all()) {
      const github = card.getByRole("link", { name: /^GitHub profile of / });
      const linkedin = card.getByRole("link", { name: /^LinkedIn profile of / });
      await expect(github).toHaveAttribute("href", /^https:\/\/github\.com\/[\w-]+$/);
      await expect(linkedin).toHaveAttribute(
        "href",
        /^https:\/\/www\.linkedin\.com\/in\/[\w%-]+\/?$/,
      );
      await expect(github).toHaveAttribute("target", "_blank");
      await expect(linkedin).toHaveAttribute("target", "_blank");
    }
  });

  test("every team card shows its member's 400 px photo, never initials", async ({ page }) => {
    await page.goto("/about");
    const cards = page.locator("[data-testid^=member-]");
    await expect(cards).toHaveCount(6);
    for (const card of await cards.all()) {
      const photo = card.getByRole("img");
      await expect(photo).toHaveAttribute("src", /^\/team\/[\w-]+\.(jpg|png)$/);
      const width = () =>
        photo.evaluate((img) => (img instanceof HTMLImageElement ? img.naturalWidth : 0));
      await expect.poll(width).toBe(400);
    }
  });
});
