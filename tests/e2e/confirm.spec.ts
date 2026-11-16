import { expect, test, type Page } from "./fixtures";
import { INSAR_PAIRS } from "./pom/explorationMock";
import { GlobePage } from "./pom/GlobePage";

// v9 step 3 (SPECS-flow-v9 §1.3, #15): the confirm panel behind "Use this square". Mocks are the
// backend's real answers; the 4-pass, 3-pass and OFFLINE coverage files are derived from the real
// Qadirabad answer and say so in their `_comment`.

const POINT = [73.5, 32.3];
const NEWEST_PAIR = String(INSAR_PAIRS.pairs[0]?.["pairId"]);
// The real Kumamoto list's newest track-3 descending pair: 30 Sep → 12 Oct.
const TRACK_3_PAIR = String(
  (INSAR_PAIRS.pairs as { pairId: string; seriesKey: string }[]).find(
    (pair) => pair.seriesKey === "003_D_072_4000_SH",
  )?.pairId,
);

const useSquareAt = async (globe: GlobePage): Promise<void> => {
  await globe.goto();
  await globe.searchInput.fill("32.30, 73.50");
  await globe.searchInput.press("Enter");
  await globe.useSquare.click();
};

const noSideScroll = async (page: Page): Promise<void> => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
};

test.describe("Explorer v9: the confirm panel", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("Use this square shows the four phenomena, the 5 real passes and asks nothing of the radar", async ({
    page,
  }) => {
    await globe.mockCoverage();
    await globe.mockInsarPairs();
    const api = await globe.mockExplorations();
    await useSquareAt(globe);

    await expect(globe.placeCard).toHaveAttribute("data-state", "ready");
    const chips = page.getByTestId("confirm-phenomena").getByRole("radio");
    await expect(chips).toHaveText(["Earthquake", "Wildfire", "Deforestation", "Flood"]);
    await expect(globe.phenomenon("flood_wetland")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("confirm-look")).toHaveText(
      "Looks for spots that darken in both HH and HV, the way new open water does.",
    );
    const dates = await page
      .getByTestId("strip-pass")
      .evaluateAll((dots) => dots.map((dot) => dot.getAttribute("data-date")));
    expect(dates).toEqual(["2026-07-14", "2026-08-19", "2026-09-12", "2026-10-18", "2026-11-11"]);
    await expect(globe.placeCard).toContainText("PRESET · LAST 5 MONTHS");
    await expect(page.getByTestId("confirm-series")).toHaveText("5 passes · track 84 ASCENDING");
    await expect(page.getByTestId("confirm-mode")).toHaveText("ONLINE");
    await expect(page.getByTestId("confirm-wait")).toHaveText("Computed live · we stop at 8 min");
    await expect(globe.confirmReason).toHaveCount(0);
    await expect(globe.confirmNote).toHaveCount(0);
    await expect(globe.placeAnalyse).toBeEnabled();

    await globe.phenomenon("wildfire").click();
    await expect(page.getByTestId("confirm-look")).toHaveText(
      "Looks for HV dropping and staying low across several passes.",
    );
    expect(globe.coverageRequests).toHaveLength(1);
    expect(globe.pairRequests).toEqual([]);
    expect(api.posts).toEqual([]);
  });

  test("Start sends the chosen lens with the square's centre and never a date", async ({
    page,
  }) => {
    await globe.mockCoverage();
    const api = await globe.mockExplorations();
    await useSquareAt(globe);

    await globe.phenomenon("vegetation_disturbance").click();
    await globe.placeAnalyse.click();

    await expect(globe.panel).toBeVisible();
    expect(api.posts).toEqual([
      {
        lens: "vegetation_disturbance",
        geometry: { type: "Point", coordinates: POINT },
        source: "L",
      },
    ]);
    await expect(page).toHaveURL(/lens=vegetation_disturbance/);
  });

  test("Earthquake draws the real pairs as arcs, lets another be chosen and sends it with the threshold", async ({
    page,
  }) => {
    await globe.mockCoverage();
    await globe.mockInsarPairs();
    const api = await globe.mockExplorations();
    await useSquareAt(globe);
    await expect(globe.placeCard).toHaveAttribute("data-state", "ready");

    await globe.phenomenon("insar").click();
    await expect(globe.placeCard).toHaveAttribute("data-state", "ready");
    expect(globe.pairRequests).toHaveLength(1);
    // Track 125's 5 most recent passes and the 4 real pairs between them; the newest is chosen.
    await expect(page.getByTestId("strip-pass")).toHaveCount(5);
    const arcs = page.getByTestId("strip-arc");
    await expect(arcs).toHaveCount(4);
    await expect(page.locator('[data-testid="strip-arc"][data-chosen="true"]')).toHaveAttribute(
      "data-pair",
      NEWEST_PAIR,
    );
    await expect(page.getByTestId("confirm-series")).toHaveText("9 passes · track 125 ASCENDING");
    await expect(page.getByTestId("confirm-pair")).toHaveText(
      "Pair 8 Oct → 20 Oct · 12 days · tap an arc to change",
    );
    await expect(page.getByTestId("confirm-insar-window")).toHaveText(
      "Measured: 5 × 5 km at the centre",
    );
    await expect(globe.placeCard).toContainText("PRESET · THE 5 MOST RECENT PASSES");
    await globe.expectScene((scene) => expect(scene.square?.innerKm).toBe(5));

    await globe.tapArc(0);
    await expect(page.getByTestId("confirm-pair")).toHaveText(
      "Pair 2 Sep → 14 Sep · 12 days · tap an arc to change",
    );

    // Another lens drops the inner window; coming back doesn't ask for the pairs again.
    await globe.phenomenon("flood_wetland").click();
    await globe.expectScene((scene) => expect(scene.square?.innerKm).toBeUndefined());
    await expect(page.getByTestId("confirm-insar-window")).toHaveCount(0);
    await globe.phenomenon("insar").click();
    await expect(arcs).toHaveCount(4);
    expect(globe.pairRequests).toHaveLength(1);

    // Advanced: every series is reachable, and the threshold goes with the pair.
    await page.getByTestId("confirm-advanced").click();
    await expect(page.getByTestId("pair-group")).toHaveCount(3);
    await expect(page.getByTestId("confirm-threshold-value")).toHaveText("0.35 · default");
    await page.getByTestId(`confirm-pair-${TRACK_3_PAIR}`).check();
    await expect(page.getByTestId("confirm-series")).toHaveText("8 passes · track 3 DESCENDING");
    await page.getByTestId("confirm-threshold").fill("0.5");
    await expect(page.getByTestId("confirm-threshold-value")).toHaveText("0.50");
    expect(api.posts).toEqual([]);

    await globe.placeAnalyse.click();
    await expect(globe.panel).toBeVisible();
    expect(api.posts).toEqual([
      {
        lens: "insar",
        geometry: { type: "Point", coordinates: POINT },
        source: "L",
        pairId: TRACK_3_PAIR,
        coherenceThreshold: 0.5,
      },
    ]);
  });

  test("the phenomenon chips move with the arrow keys", async ({ page }) => {
    await globe.mockCoverage();
    await globe.mockInsarPairs();
    await useSquareAt(globe);

    await globe.phenomenon("flood_wetland").focus();
    await page.keyboard.press("ArrowRight");
    await expect(globe.phenomenon("insar")).toHaveAttribute("aria-checked", "true");
    await expect(globe.phenomenon("insar")).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(globe.phenomenon("flood_wetland")).toBeFocused();
  });

  test("4 passes are allowed and the note names the largest gap", async ({ page }) => {
    await globe.mockCoverage({ mock: "coverage-qadirabad-4" });
    await useSquareAt(globe);

    await expect(globe.placeCard).toHaveAttribute("data-state", "four");
    await expect(page.getByTestId("strip-pass")).toHaveCount(4);
    await expect(globe.confirmNote).toContainText("4 passes in this range");
    await expect(globe.confirmNote).toContainText(
      "NISAR has no pass here between 14 Jul and 19 Aug.",
    );
    await expect(globe.placeAnalyse).toBeEnabled();
    await expect(globe.confirmReason).toHaveCount(0);
  });

  test("3 passes block Start and say why", async ({ page }) => {
    await globe.mockCoverage({ mock: "coverage-qadirabad-3" });
    const api = await globe.mockExplorations();
    await useSquareAt(globe);

    await expect(globe.placeCard).toHaveAttribute("data-state", "few");
    await expect(globe.confirmNote).toContainText("Not enough history here");
    await expect(globe.confirmNote).toContainText("Only 3 passes fall in this range.");
    await expect(globe.placeAnalyse).toBeDisabled();
    await expect(globe.confirmReason).toHaveText("Not enough history here");
    await expect(page.getByTestId("confirm-wait")).toHaveText("Nothing to compute yet");
    expect(api.posts).toEqual([]);
  });

  test("Earthquake with no pair blocks Start; a pair-list outage can be retried", async ({
    page,
  }) => {
    await globe.mockCoverage();
    await globe.mockInsarPairs({ empty: true });
    await useSquareAt(globe);

    await globe.phenomenon("insar").click();
    await expect(globe.placeCard).toHaveAttribute("data-state", "nopair");
    await expect(globe.confirmNote).toHaveText("No pass pair in this range");
    await expect(globe.confirmReason).toHaveText("No pass pair in this range");
    await expect(globe.placeAnalyse).toBeDisabled();
    await globe.expectScene((scene) => expect(scene.square?.innerKm).toBe(5));
    // Image lenses still read /coverage.
    await globe.phenomenon("wildfire").click();
    await expect(globe.placeAnalyse).toBeEnabled();
    await expect(page.getByTestId("strip-pass")).toHaveCount(5);
  });

  test("a pair list that fails says so and asks again on retry", async ({ page }) => {
    await globe.mockCoverage();
    await globe.mockInsarPairs({ failures: 1 });
    await useSquareAt(globe);

    await globe.phenomenon("insar").click();
    await expect(page.getByTestId("confirm-error")).toContainText(
      "We couldn't reach the radar archive",
    );
    await expect(globe.placeAnalyse).toBeDisabled();
    await page.getByRole("button", { name: "Run it again" }).click();
    await expect(globe.placeCard).toHaveAttribute("data-state", "ready");
    expect(globe.pairRequests).toHaveLength(2);
  });

  test("a prepared case at the square makes the mode OFFLINE", async ({ page }) => {
    await globe.mockCoverage({ mock: "coverage-qadirabad-offline" });
    await useSquareAt(globe);

    await expect(page.getByTestId("confirm-mode")).toHaveText("OFFLINE");
    await expect(page.getByTestId("confirm-wait")).toHaveText("Prepared · opens in about a second");
    await expect(globe.placeAnalyse).toHaveText("Show the result");
  });

  test("Move unlocks the square to place it again; Cancel goes back to the cases", async ({
    page,
  }) => {
    await globe.mockCoverage();
    await useSquareAt(globe);
    await expect(globe.placeCard).toBeVisible();

    await page.getByTestId("confirm-move").click();
    await expect(globe.placeCard).toBeHidden();
    await expect(globe.squareBar).toBeVisible();
    await globe.expectScene((scene) => expect(scene.square?.movable).toBe(true));

    await globe.useSquare.click();
    await expect(globe.placeCard).toHaveAttribute("data-state", "ready");
    await page.getByTestId("confirm-cancel").click();
    await expect(globe.placeCard).toBeHidden();
    await expect(globe.startCard).toBeVisible();
  });

  test("the panel's ⓘ open on hover, on focus and on tap, with the v9 tip texts", async ({
    page,
  }) => {
    await globe.mockCoverage();
    await globe.mockInsarPairs();
    await useSquareAt(globe);
    await expect(globe.placeCard).toHaveAttribute("data-state", "ready");

    await page.getByTestId("tip-phen").hover();
    await expect(page.getByTestId("tip-phen-pop")).toContainText(
      "Each phenomenon reads the radar differently",
    );
    await page.getByTestId("tip-strip").focus();
    await expect(page.getByTestId("tip-strip-pop")).toContainText(
      "The gold dots joined by the gold line are the passes we will read",
    );
    await page.getByTestId("tip-mode").click();
    await expect(page.getByTestId("tip-mode-pop")).toContainText("ONLINE means we compute");
    await page.getByTestId("tip-wait").click();
    await expect(page.getByTestId("tip-wait-pop")).toContainText("at 8 minutes we stop");
    await expect(page.getByTestId("tip-mode-pop")).toHaveCount(0);

    await globe.phenomenon("insar").click();
    await page.getByTestId("confirm-advanced").click();
    await page.getByTestId("tip-threshold").click();
    await expect(page.getByTestId("tip-threshold-pop")).toContainText("Coherence measures");
    // The popover lives outside the scrolling panel, so the panel can't clip it.
    await expect(globe.placeCard.getByTestId("tip-threshold-pop")).toHaveCount(0);
    await page.getByTestId("tip-pair").click();
    await expect(page.getByTestId("tip-pair-pop")).toContainText("The two NISAR passes we compare");
  });

  test("at 1440 × 900 Start stays in view with the longest panel", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await globe.mockCoverage();
    await globe.mockInsarPairs();
    await useSquareAt(globe);
    await globe.phenomenon("insar").click();
    await page.getByTestId("confirm-advanced").click();
    await expect(page.getByTestId("pair-group")).toHaveCount(3);

    await expect(globe.placeAnalyse).toBeInViewport({ ratio: 1 });
    const box = await globe.placeCard.boundingBox();
    expect(box?.width).toBeCloseTo(400, 0);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(900);
  });

  test("at 390 × 844 the panel is a bottom sheet of at most 62 % with Start in view", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await globe.mockCoverage();
    await globe.mockInsarPairs();
    await useSquareAt(globe);
    await globe.phenomenon("insar").click();
    await page.getByTestId("confirm-advanced").click();
    await expect(page.getByTestId("pair-group")).toHaveCount(3);

    await expect(page.locator("main")).toHaveAttribute("data-sheet", "spot");
    await expect(page.getByTestId("sheet-handle")).toHaveCount(0);
    await expect(async () => {
      const box = await globe.placeCard.boundingBox();
      expect(box?.height ?? 999).toBeLessThanOrEqual(0.62 * 844 + 1);
    }).toPass();
    await expect(globe.placeAnalyse).toBeInViewport({ ratio: 1 });
    await noSideScroll(page);
  });
});
