import { expect, test } from "./fixtures";
import { noCoverageView } from "./pom/explorationMock";
import { GlobePage } from "./pom/GlobePage";

test.describe("Explorer: place search", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
    await globe.mockCoverage();
  });

  test("typing sends nothing; Enter searches once and lists the places with their credit", async ({
    page,
  }) => {
    await globe.mockPlaces();
    await globe.goto();
    await expect(globe.searchInput).toHaveAttribute(
      "placeholder",
      "Search a place or paste coordinates",
    );
    await globe.searchInput.click();

    await globe.searchInput.pressSequentially("Qadirabad");
    await page.waitForTimeout(800);
    expect(globe.placeRequests).toHaveLength(0);

    await globe.searchInput.press("Enter");
    await expect(globe.placeOption(1)).toBeVisible();
    expect(globe.placeRequests).toHaveLength(1);
    expect(globe.placeRequests[0]).toContain("q=Qadirabad");
    expect(globe.placeRequests[0]).toContain("limit=6");
    await expect(globe.placeOption(0)).toContainText("Phalia Tehsil");
    await expect(globe.placeOption(0)).toContainText("32.30° N, 73.50° E · live analysis");
    await expect(page.getByTestId("place-tag-0")).toHaveText("1–4 MIN");
    await expect(
      globe.searchMenu.getByRole("link", { name: "© OpenStreetMap contributors" }),
    ).toBeVisible();
  });

  test("arrow keys and Enter pick a place; the spot card shows the catalog and Analyze asks the radar", async ({
    page,
  }) => {
    test.slow();
    await globe.mockPlaces();
    await globe.goto();
    await globe.searchInput.click();
    await globe.searchInput.fill("Qadirabad");
    await globe.searchInput.press("Enter");
    // The instant case row shows before the geocoder answers; wait for the place to lead the list.
    await expect(globe.placeOption(0)).toContainText("Phalia Tehsil");

    await globe.searchInput.press("ArrowDown");
    await expect(globe.placeOption(0)).toHaveAttribute("aria-selected", "true");
    await globe.searchInput.press("Enter");

    await expect(globe.searchMenu).toBeHidden();
    await globe.useSquare.click();
    await expect(globe.placeCard).toContainText("Qadirabad");
    await expect(page.getByTestId("confirm-place")).toContainText("32.30° N, 73.50° E");
    await expect(globe.startCard).toBeHidden();

    await globe.placeAnalyse.click();
    await expect(globe.panelMeta).toContainText("Live question · Track 84 · Frame 18");
    await expect(globe.placeCard).toBeHidden();
    await expect(page).toHaveURL(/frame=84-18/);
  });

  test("a place with no catalog coverage shows the no-data note and Start stays off", async () => {
    // Registered after beforeEach's land answer, so this one wins.
    await globe.mockCoverage({ mock: "coverage-open-ocean" });
    await globe.mockPlaces({ mock: "places-open-ocean" });
    await globe.goto();
    await globe.searchInput.click();
    await globe.searchInput.fill("South Atlantic");
    await globe.searchInput.press("Enter");
    await globe.placeOption(0).click();
    await globe.useSquare.click();

    await expect(globe.placeCard).toHaveAttribute("data-state", "none");
    await expect(globe.confirmNote).toContainText("NISAR hasn't measured this square yet");
    await expect(globe.placeAnalyse).toBeDisabled();
  });

  test("catalog coverage allows analysis outside the frame snapshot", async ({ page }) => {
    await globe.mockExplorations({ first: noCoverageView() });
    await globe.goto();
    await globe.searchInput.fill("-30, -10");
    await globe.searchInput.press("Enter");
    await globe.useSquare.click();

    await expect(globe.placeAnalyse).toBeEnabled();
    const submitted = page.waitForRequest(
      (request) => request.method() === "POST" && request.url().endsWith("/api/v1/explorations"),
    );
    await globe.placeAnalyse.click();
    expect((await submitted).postDataJSON()).toMatchObject({
      geometry: { type: "Point", coordinates: [-10, -30] },
    });
    await expect(page).toHaveURL(/point=-10,-30/);
    await expect(globe.panelMeta).toContainText("Live question · NISAR catalog");
  });

  test("no match shows an empty state and the globe stays usable", async ({ page }) => {
    await page.route("**/api/v1/places**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ places: [], attribution: "© OpenStreetMap contributors" }),
      }),
    );
    await globe.goto();
    await globe.searchInput.click();
    await globe.searchInput.fill("Nowhereville");
    await globe.searchInput.press("Enter");

    await expect(page.getByTestId("place-empty")).toContainText(
      "No place found for “Nowhereville”.",
    );
    await expect(globe.startCard).toBeVisible();
  });

  test("a failing search says so and Try again repeats it", async () => {
    await globe.mockPlaces({ failures: 1 });
    await globe.goto();
    await globe.searchInput.click();
    await globe.searchInput.fill("Qadirabad");
    await globe.searchInput.press("Enter");

    await expect(globe.searchError).toContainText("We couldn't reach the place search");
    await globe.searchError.getByRole("button", { name: "Try again" }).click();
    // The instant case row is there before the retry answers; the geocoder's row proves it did.
    await expect(globe.placeOption(0)).toContainText("Phalia Tehsil");
    expect(globe.placeRequests).toHaveLength(2);
  });

  test("Esc closes the search, the start card button opens it, and the card's close returns to the list", async ({
    page,
  }) => {
    await globe.mockPlaces();
    await globe.goto();
    await page.getByTestId("search-cta").click();
    await expect(globe.searchInput).toBeFocused();
    await globe.searchInput.fill("Qadirabad");
    await globe.searchInput.press("Enter");
    await expect(globe.searchMenu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(globe.searchMenu).toBeHidden();

    await globe.searchInput.click();
    await globe.searchInput.press("Enter");
    await globe.placeOption(0).click();
    await globe.useSquare.click();
    await expect(globe.placeCard).toBeVisible();
    await page.getByTestId("confirm-cancel").click();
    await expect(globe.placeCard).toBeHidden();
    await expect(globe.startCard).toBeVisible();
  });

  test("pasted coordinates resolve on the spot without asking the geocoder", async () => {
    await globe.mockPlaces();
    await globe.goto();
    await globe.searchInput.fill("32.30, 73.50");
    await globe.searchInput.press("Enter");
    await globe.useSquare.click();

    await expect(globe.placeCard).toContainText("32.30° N, 73.50° E");
    await expect(globe.placeAnalyse).toBeEnabled();
    expect(globe.placeRequests).toHaveLength(0);
    expect(globe.coverageRequests[0]).toContain("lon=73.5&lat=32.3");
  });

  test("a query that names a known case lists it as INSTANT and opens it", async ({ page }) => {
    await globe.mockPlaces();
    await globe.goto();
    await globe.searchInput.fill("Qadirabad");
    await globe.searchInput.press("Enter");

    const caseRow = globe.placeOption(2);
    await expect(caseRow).toContainText("Qadirabad, Pakistan");
    await expect(caseRow).toContainText("Known case · flood · Jul 2026");
    await expect(page.getByTestId("place-tag-2")).toHaveText("INSTANT");

    for (const _ of [0, 1, 2]) await globe.searchInput.press("ArrowDown");
    await expect(caseRow).toHaveAttribute("aria-selected", "true");
    await globe.searchInput.press("Enter");
    await expect(globe.searchMenu).toBeHidden();
    await expect(globe.panelTitle).toContainText("Qadirabad");
  });
});
