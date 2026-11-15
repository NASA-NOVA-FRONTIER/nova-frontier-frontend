import { expect, test, type Page } from "./fixtures";
import { succeededView } from "./pom/explorationMock";
import { GlobePage } from "./pom/GlobePage";

// Inside frame 47-3 (Colombia); its centre is -74.755, 2.89.
const BBOX = "-74.78,2.87,-74.73,2.91";

// Every request that would run or check something; placing and moving the square must make none.
const watchRuns = (page: Page): string[] => {
  const runs: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/v1/explorations") || url.includes("/api/v1/coverage")) runs.push(url);
  });
  return runs;
};

test.describe("Explorer: the 10 × 10 km square", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
    await globe.mockCoverage();
    // "Analyze this spot" reaches the exploration API; mock it so a real backend on :8000 cannot interfere.
    await globe.mockExplorations({ first: succeededView() });
  });

  test("a click places the square and nothing runs yet", async ({ page }) => {
    const runs = watchRuns(page);
    await globe.goto();
    await expect(page.getByTestId("hint-pill")).toHaveText(
      "Click any land to place a 10 × 10 km square",
    );

    await globe.placeSquare();
    await expect(globe.squareBar).toContainText("Square placed");
    await expect(globe.squareBar).toContainText("10 × 10 km · about 105 km² · nothing runs yet");
    await expect(globe.useSquare).toHaveText("Use this square");
    await expect(globe.startCard).toBeHidden();
    await globe.expectScene((scene) => {
      expect(scene.square).toEqual({ centre: [-74.75, 2.89], sideKm: 10.24, movable: true });
      expect(scene.target?.key).toMatch(/^square\|/);
    });
    expect(runs).toEqual([]);
  });

  test("a drag moves the square under a still camera, and still nothing runs", async ({ page }) => {
    const runs = watchRuns(page);
    await globe.goto();
    await globe.placeSquare();
    const key = (await globe.scene()).target?.key;

    await globe.dragSquare({ dx: 80, dy: -40 });
    await globe.expectScene((scene) => {
      const [lon, lat] = scene.square?.centre ?? [0, 0];
      expect(lon).toBeCloseTo(-74.71, 6);
      expect(lat).toBeCloseTo(2.91, 6);
      expect(scene.square?.movable).toBe(true);
      expect(scene.target?.key).toBe(key);
    });
    await expect(globe.squareBar).toBeVisible();
    expect(runs).toEqual([]);
  });

  test("clicking other land moves the square there", async () => {
    await globe.goto();
    await globe.placeSquare();
    await globe.clickOcean();
    await globe.expectScene((scene) => expect(scene.square?.centre).toEqual([-20, 18]));
    await expect(globe.squareBar).toBeVisible();
  });

  test("Cancel and Esc take the square away", async () => {
    await globe.goto();
    await globe.placeSquare();
    await globe.squareCancel.click();
    await expect(globe.squareBar).toBeHidden();
    await expect(globe.startCard).toBeVisible();
    await globe.expectScene((scene) => expect(scene.square).toBeUndefined());

    await globe.placeSquare();
    await globe.press("Escape");
    await expect(globe.squareBar).toBeHidden();
    await globe.expectScene((scene) => expect(scene.square).toBeUndefined());
  });

  test("Use this square checks the catalog, then Analyze asks about the moved centre", async ({
    page,
  }) => {
    await globe.goto();
    await globe.placeSquare();
    await globe.dragSquare({ dx: 80, dy: -40 });
    expect(globe.coverageRequests).toHaveLength(0);

    await globe.useSquare.click();
    await expect(globe.squareBar).toBeHidden();
    await expect(globe.placeCard).toHaveAttribute("data-state", "ready");
    expect(globe.coverageRequests).toHaveLength(1);
    // Used, the square stays where it is.
    await globe.expectScene((scene) => expect(scene.square?.movable).toBe(false));

    const request = page.waitForRequest((entry) => entry.url().endsWith("/api/v1/explorations"));
    await globe.placeAnalyse.click();
    const body = (await request).postDataJSON() as {
      geometry: { type: string; coordinates: number[] };
    };
    expect(body.geometry.type).toBe("Point");
    expect(body.geometry.coordinates[0]).toBeCloseTo(-74.71, 4);
    expect(body.geometry.coordinates[1]).toBeCloseTo(2.91, 4);
    await expect(globe.panelMeta).toContainText("Live question");
  });

  test("an old ?bbox= link places the square at its centre and runs nothing", async ({ page }) => {
    const runs = watchRuns(page);
    await globe.goto(`?bbox=${BBOX}&lens=wildfire`);
    await expect(globe.squareBar).toBeVisible();
    await globe.expectScene((scene) => {
      const [lon, lat] = scene.square?.centre ?? [0, 0];
      expect(lon).toBeCloseTo(-74.755, 6);
      expect(lat).toBeCloseTo(2.89, 6);
    });
    expect(runs).toEqual([]);

    // The link's lens is kept for the square's first run.
    await globe.useSquare.click();
    const request = page.waitForRequest((entry) => entry.url().endsWith("/api/v1/explorations"));
    await globe.placeAnalyse.click();
    expect((await request).postDataJSON()).toMatchObject({ lens: "wildfire" });
  });

  test("an old ?geo= link falls back to the centre of its corners", async ({ page }) => {
    const runs = watchRuns(page);
    await globe.goto("?geo=-74.78,2.87_-74.73,2.87_-74.73,2.91_-74.78,2.91");
    await expect(globe.squareBar).toBeVisible();
    await globe.expectScene((scene) => {
      const [lon, lat] = scene.square?.centre ?? [0, 0];
      expect(lon).toBeCloseTo(-74.755, 6);
      expect(lat).toBeCloseTo(2.89, 6);
    });
    expect(runs).toEqual([]);
  });

  test("the guided tour ignores clicks on the globe", async ({ page }) => {
    await globe.goto("?story=1");
    await globe.clickLand();
    await expect(globe.squareBar).toBeHidden();
    await expect(page).toHaveURL(/story=1/);
    await globe.expectScene((scene) => expect(scene.square).toBeUndefined());
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test("the bar and Use this square fit the screen", async ({ page }) => {
      await globe.goto();
      await expect(page.getByTestId("hint-pill")).toHaveText("Tap any land to place a square");
      await globe.placeSquare();
      await expect(globe.useSquare).toBeInViewport({ ratio: 1 });
      await expect(globe.squareCancel).toBeInViewport({ ratio: 1 });
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBe(0);
    });
  });
});

test.describe("Explorer: dragging the square on the real globe", () => {
  test(
    "a click places the square and a mouse drag moves it east",
    { tag: "@globe" },
    async ({ page }) => {
      const globe = new GlobePage(page);
      await globe.skipOnboarding();
      await globe.mockObservationPlan();
      const runs = watchRuns(page);
      await globe.goto();

      await globe.placeSquare();
      await expect(globe.square).toHaveAttribute("data-movable", "true");
      await expect(page.getByTestId("square-label")).toHaveText("10 × 10 KM · 105 KM²");
      const before = await globe.squareCentre();
      expect(before).toBeDefined();

      await globe.dragSquare({ dx: 80, dy: 0 });
      await expect(async () => {
        const after = await globe.squareCentre();
        expect(after?.[0]).toBeGreaterThan(before?.[0] ?? 0);
        // A drag sideways barely changes the latitude (the camera looks straight down).
        expect(Math.abs((after?.[1] ?? 0) - (before?.[1] ?? 0))).toBeLessThan(0.02);
      }).toPass({ timeout: 10_000 });
      await expect(globe.squareBar).toBeVisible();
      expect(runs).toEqual([]);
    },
  );
});
