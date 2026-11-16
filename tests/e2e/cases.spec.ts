import { expect, test } from "./fixtures";

test.describe("Measured cases page", () => {
  test("filtering by a question leaves only the cases that ask it", async ({ page }) => {
    await page.goto("/cases");
    const cards = page.locator("[data-testid^=case-card-]");
    await expect(cards).toHaveCount(6);

    const flood = page.getByTestId("cases-filter-flood_wetland");
    await expect(flood).toHaveText(/Did it flood\?/);
    await flood.click();
    await expect(flood).toHaveAttribute("aria-pressed", "true");
    await expect(cards).toHaveCount(1);
    await expect(page.getByTestId("case-card-qadirabad")).toBeVisible();

    // Issue #28: every question has exactly one demo case.
    await page.getByTestId("cases-filter-wildfire").click();
    await expect(cards).toHaveCount(1);
    await expect(page.getByTestId("case-card-bug-fire")).toBeVisible();

    // The landslide question has no live lens; its filter lists the one case that asks it.
    await page.getByTestId("cases-filter-observed_dynamics").click();
    await expect(cards).toHaveCount(1);
    await expect(page.getByTestId("case-card-niscemi-aftermath")).toContainText("+2.17 dB");

    await page.getByTestId("cases-filter-all").click();
    await expect(cards).toHaveCount(6);
  });

  // Issue #28: one demo case per phenomenon, each marked as computed offline.
  test("each demo case carries the OFFLINE chip", async ({ page }) => {
    await page.goto("/cases");
    for (const id of ["qadirabad", "choco", "bug-fire", "para-event-02", "niscemi-aftermath"]) {
      const chip = page.getByTestId(`case-card-${id}`).getByTestId("prov-offline");
      await expect(chip).toHaveText("OFFLINE");
      await expect(chip).toHaveAttribute("title", /analysis is fixed/);
    }
  });

  test("a case card opens that case in the explorer", async ({ page }) => {
    await page.goto("/cases");
    const card = page.getByTestId("case-card-qadirabad");
    await expect(card).toContainText("64.3% vs 1.0%");
    await expect(card.getByTestId("prov-real")).toBeVisible();
    await card.getByTestId("case-open-qadirabad").click();
    await expect(page).toHaveURL(/\/explore\?case=qadirabad$/);
  });

  test("Chocó names its coherence-only state and opens on the globe like the others", async ({
    page,
  }) => {
    await page.goto("/cases");
    const choco = page.getByTestId("case-card-choco");
    await expect(choco.getByTestId("prov-coherence-only")).toHaveText("Coherence only · 0.247");
    await expect(choco).not.toContainText("Pending");
    await expect(choco.getByTestId("prov-real")).toHaveCount(0);
    await expect(choco.getByTestId("case-open-choco")).toHaveText("Open on the globe");
    await expect(choco).not.toContainText("See the event");
  });

  test("the ground-motion case reads as measured, not as missing radar", async ({ page }) => {
    await page.goto("/cases");
    const card = page.getByTestId("case-card-choco");
    await expect(card).toContainText("Measured, not a verdict");
    await expect(card).not.toContainText("Not enough radar yet");
    await expect(card).toContainText("Did the ground keep its echo?");
  });

  test("the bottom card asks the radar instead of promising landslides", async ({ page }) => {
    await page.goto("/cases");
    await expect(
      page.getByRole("heading", { name: "Your place isn't here? Ask the radar." }),
    ).toBeVisible();
    await expect(page.getByText("ANY PLACE ON LAND")).toBeVisible();
    await expect(page.locator("[data-testid^=ask-icon-]")).toHaveCount(4);
    await expect(page.getByTestId("ask-icon-landslide")).toHaveCount(0);
    await expect(page.getByTestId("ask-icon-earthquake")).toHaveCount(0);
    const body = page.locator("body");
    await expect(body).not.toContainText("Landslides");
    await expect(body).not.toContainText("No measured case yet");
    await page.getByTestId("cases-ask-cta").click();
    await expect(page).toHaveURL(/\/explore$/);
  });
});
