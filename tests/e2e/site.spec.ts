import { expect, type Page, test } from "./fixtures";

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
    await expect(page.getByTestId("landing-case-niscemi-aftermath")).toContainText(
      "DID THE SLOPE KEEP ITS ECHO?",
    );
    await expect(page.getByTestId("landing-case-niscemi-aftermath")).toHaveAttribute(
      "href",
      "/explore?case=niscemi-aftermath",
    );
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
      "Five places, measured honestly.",
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
      await expect(page.getByTestId("site-version")).toHaveText("Design v9");
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

  // #29: the footer holds on a desktop and on a phone, with its image credits.
  for (const screen of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`the footer fits a ${screen.width} px screen on every site page`, async ({ page }) => {
      await page.setViewportSize(screen);
      for (const path of ["/", "/cases", "/method", "/learn", "/about"]) {
        await page.goto(path);
        const footer = page.getByTestId("site-footer");
        await footer.scrollIntoViewIfNeeded();
        await expect(footer).toContainText("Earth: NASA Blue Marble");
        expect((await footer.boundingBox())?.width, path).toBe(screen.width);
        const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(pageWidth, path).toBe(screen.width);
      }
    });
  }
});

// The mission model under reduced motion: deployed and still, so a hotspot stays where it was drawn.
const openMissionModel = async (page: Page) => {
  await page.goto("/");
  const figure = page.getByTestId("mission-figure");
  await figure.scrollIntoViewIfNeeded();
  const model = figure.getByTestId("nisar-satellite");
  await expect(model).toHaveAttribute("data-status", "ready");
  await expect(model).toHaveAttribute("data-running", "false");
  const boom = model.getByTestId("nisar-hotspot-boom");
  await expect(boom).toHaveCSS("opacity", "1");
  return { boom, tip: model.getByTestId("nisar-satellite-tip") };
};

const SHOWN = /s-sat__tip--shown/;

test.describe("Landing satellite hotspots", () => {
  test("hovering the boom keeps its card open while the pointer moves toward it", async ({
    page,
  }) => {
    const { boom, tip } = await openMissionModel(page);
    const box = await boom.boundingBox();
    if (box === null) throw new Error("boom hotspot has no box");
    // A 44 px target around the same 26 px ring.
    expect(box.width).toBeCloseTo(44, 0);
    await expect(boom).toHaveCSS("width", "44px");
    expect(
      await boom.evaluate((el) => getComputedStyle(el, "::before").getPropertyValue("width")),
    ).toBe("26px");

    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await expect(tip).toHaveClass(SHOWN);
    await expect(tip).toContainText("9 m boom");

    // Count every time the card closes from here on: it must not blink while the pointer stays near.
    await tip.evaluate((el) => {
      const w = window as unknown as { tipClosed: number };
      w.tipClosed = 0;
      new MutationObserver(() => {
        if (!el.classList.contains("s-sat__tip--shown")) w.tipClosed += 1;
      }).observe(el, { attributes: true, attributeFilter: ["class"] });
    });
    const tipBox = await tip.boundingBox();
    const toward = tipBox !== null && tipBox.x > cx ? 1 : -1;
    await page.mouse.move(cx + toward * 10, cy, { steps: 10 });
    await page.mouse.move(cx + toward * 20, cy, { steps: 10 });
    await page.waitForTimeout(300);
    await expect(tip).toHaveClass(SHOWN);
    expect(await page.evaluate(() => (window as unknown as { tipClosed: number }).tipClosed)).toBe(
      0,
    );
    // Hovering doesn't move the target.
    expect(await boom.boundingBox()).toEqual(box);

    // Clearly away from every dot: the card closes.
    await page.mouse.move(cx - 150, cy - 150, { steps: 5 });
    await expect(tip).not.toHaveClass(SHOWN);
  });

  test("keyboard focus on a hotspot shows its card and blur hides it", async ({ page }) => {
    const { boom, tip } = await openMissionModel(page);
    await boom.focus();
    await expect(tip).toHaveClass(SHOWN);
    await expect(tip).toContainText("9 m boom");
    await boom.blur();
    await expect(tip).not.toHaveClass(SHOWN);
  });

  test.describe("on a touch screen", () => {
    test.use({ hasTouch: true });

    test("a tap toggles the card", async ({ page }) => {
      const { boom, tip } = await openMissionModel(page);
      await boom.tap();
      await expect(tip).toHaveClass(SHOWN);
      await expect(boom).toHaveAttribute("aria-pressed", "true");
      await boom.tap();
      await expect(tip).not.toHaveClass(SHOWN);
      await expect(boom).toHaveAttribute("aria-pressed", "false");
    });
  });
});

// Issue #61: at 390 px the page links crowded the explorer pill against the right edge.
test.describe("Site nav on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the explorer pill sits fully on screen on every content page", async ({ page }) => {
    for (const path of ["/", "/cases", "/method", "/learn", "/about"]) {
      await page.goto(path);
      const pill = page.getByTestId("nav-explore");
      await expect(pill).toBeInViewport({ ratio: 1 });
      await expect(pill).toHaveAccessibleName("Explore");
      // Inside the 16 px side gutter, not pressed against the edge where wider fonts clip it.
      const edge = await pill.evaluate((el) => el.getBoundingClientRect().right);
      expect(edge).toBeLessThanOrEqual(390 - 16);
      await expect(page.getByTestId("nav-menu")).toBeInViewport({ ratio: 1 });
      // Closed, the folded links are out of sight and out of the tab order.
      await expect(page.getByTestId("nav-links")).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        390,
      );
    }
  });

  test("the menu opens and closes by keyboard and gives focus back", async ({ page }) => {
    await page.goto("/learn");
    const menu = page.getByTestId("nav-menu");
    await expect(menu).toHaveAttribute("aria-expanded", "false");

    await menu.focus();
    await page.keyboard.press("Enter");
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("nav-links")).toBeVisible();
    await expect(page.getByTestId("nav-learn")).toHaveAttribute("aria-current", "page");

    // Tab order follows the screen: Menu, the four links, then the explorer pill.
    for (const id of ["nav-cases", "nav-method", "nav-learn", "nav-about", "nav-explore"]) {
      await page.keyboard.press("Tab");
      await expect(page.getByTestId(id)).toBeFocused();
    }

    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("nav-links")).toBeHidden();
    await expect(menu).toBeFocused();

    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/cases$/);
  });
});
