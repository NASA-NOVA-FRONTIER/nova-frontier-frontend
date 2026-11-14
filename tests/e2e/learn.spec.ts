import { expect, test } from "@playwright/test";

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
