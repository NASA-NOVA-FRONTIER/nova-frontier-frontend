import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { INSAR_PAIRS, insarView, succeededView, wildfireView } from "./pom/explorationMock";
import { GlobePage, layerIdOf, LIVE_FRAME } from "./pom/GlobePage";

// The v9 sequence player (#26), on the stub globe: every step asks the globe for its own image.

const timeline = (page: Page) => page.getByTestId("timeline");
const readout = (page: Page) => page.getByTestId("timeline-readout");

// Records every image the stub globe was asked to drape, in order, however slowly the test runs.
const recordDrapes = (page: Page) =>
  page.evaluate(() => {
    const seen: string[] = [];
    const globe = document.querySelector('[data-testid="globe"]');
    const read = () => {
      const scene = JSON.parse(globe?.getAttribute("data-scene") ?? "{}") as {
        drape?: { url: string };
      };
      const url = scene.drape?.url ?? "";
      if (seen.at(-1) !== url) seen.push(url);
    };
    read();
    if (globe !== null)
      new MutationObserver(read).observe(globe, {
        attributes: true,
        attributeFilter: ["data-scene"],
      });
    Object.assign(window, { drapes: seen });
  });
const drapes = (page: Page) =>
  page.evaluate(() => (window as unknown as { drapes: string[] }).drapes);

test.describe("Sequence timeline: autoplay", () => {
  test.use({ reducedMotion: "no-preference" });
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("plays every Seattle pass with its own image, in date order", async ({ page }) => {
    await globe.mockExplorations({ first: wildfireView() });
    await recordDrapesOnLoad(page, globe);

    await expect(timeline(page)).toHaveAttribute("data-playing", "true");
    await expect(page.getByTestId("timeline-play")).toHaveAttribute("aria-label", "Pause");
    // Five passes at 1.6 s, then the loop comes back to the first.
    await expect
      .poll(async () => new Set(await drapes(page)).size, { timeout: 20_000 })
      .toBeGreaterThanOrEqual(5);
    const ids = (await drapes(page)).map(layerIdOf).filter((id) => id.startsWith("display_"));
    const firstLoop = ids.slice(
      ids.indexOf("display_2026-06-26_HH"),
      ids.indexOf("display_2026-06-26_HH") + 5,
    );
    expect(firstLoop).toEqual([
      "display_2026-06-26_HH",
      "display_2026-07-20_HH",
      "display_2026-08-25_HH",
      "display_2026-09-18_HH",
      "display_2026-10-24_HH",
    ]);
  });

  test("a hidden tab pauses the player", async ({ page }) => {
    await globe.mockExplorations({ first: wildfireView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(timeline(page)).toHaveAttribute("data-playing", "true");

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(timeline(page)).toHaveAttribute("data-playing", "false");
    await expect(page.getByTestId("timeline-play")).toHaveAttribute("aria-label", "Play");
  });

  test("with Loop off at 2×, it stops on the last pass", async ({ page }) => {
    await globe.mockExplorations({ first: wildfireView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await page.getByTestId("timeline-loop").click();
    await expect(page.getByTestId("timeline-loop")).toHaveAttribute("aria-pressed", "false");
    await page.getByTestId("timeline-speed-2").click();
    await expect(page.getByTestId("timeline-speed-2")).toHaveAttribute("aria-pressed", "true");
    // Speed and loop never pause it.
    await expect(timeline(page)).toHaveAttribute("data-playing", "true");

    await expect(readout(page)).toHaveText("Pass 5 of 5 · 24 Oct 2026", { timeout: 15_000 });
    await expect(timeline(page)).toHaveAttribute("data-playing", "false");
  });
});

// Not a POM change (T3 owns GlobePage): load and start recording before the first step lands.
const recordDrapesOnLoad = async (page: Page, globe: GlobePage) => {
  await globe.goto(`?frame=${LIVE_FRAME.id}`);
  await recordDrapes(page);
};

test.describe("Sequence timeline: controls", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("under reduced motion it opens paused on the pass the result is about", async ({ page }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(timeline(page)).toHaveAttribute("data-playing", "false");
    await expect(readout(page)).toHaveText("Pass 3 of 5 · 12 Sep 2026");
    await expect(page.getByTestId("timeline-sub")).toHaveText(
      "5 MEASURED PASSES · 14 JUL 2026 → 11 NOV 2026 · TRACK 84 ASCENDING",
    );
    await expect(page.getByTestId("timeline-gap").first()).toHaveText("36 D");
  });

  test("previous and next move the image; a pass with none shows nothing, never another date", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await page.getByTestId("timeline-step-next").click();
    await expect(readout(page)).toHaveText("Pass 4 of 5 · 18 Oct 2026");
    await globe.expectScene((scene) => expect(scene.drape).toBeUndefined());
    await page.getByTestId("timeline-prev").click();
    await page.getByTestId("timeline-prev").click();
    await expect(readout(page)).toHaveText("Pass 2 of 5 · 19 Aug 2026");
    await globe.expectScene((scene) =>
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_2026-08-19_HH"),
    );
  });

  test("play, then a click on a pass pauses on it; Home and End jump to the ends", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await page.getByTestId("timeline-play").click();
    await expect(timeline(page)).toHaveAttribute("data-playing", "true");
    // Quiet while it plays, announced once the user takes over.
    await expect(page.locator(".x-tl__readout")).toHaveAttribute("aria-live", "off");
    await globe.timelinePasses("base").first().click();
    await expect(timeline(page)).toHaveAttribute("data-playing", "false");
    await expect(page.locator(".x-tl__readout")).toHaveAttribute("aria-live", "polite");
    await expect(readout(page)).toHaveText("Pass 1 of 5 · 14 Jul 2026");

    await page.keyboard.press("End");
    await expect(readout(page)).toHaveText("Pass 5 of 5 · 11 Nov 2026");
    await page.keyboard.press("Home");
    await expect(readout(page)).toHaveText("Pass 1 of 5 · 14 Jul 2026");
  });

  test("dragging along the track scrubs to the nearest pass", async ({ page }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    const track = await page.getByTestId("timeline-track").boundingBox();
    if (track === null) throw new Error("the track is on screen");
    const y = track.y + track.height / 2;
    await page.mouse.move(track.x + 2, y);
    await page.mouse.down();
    await expect(readout(page)).toHaveText("Pass 1 of 5 · 14 Jul 2026");
    await page.mouse.move(track.x + track.width * 0.62, y, { steps: 8 });
    await page.mouse.up();
    await expect(readout(page)).not.toHaveText("Pass 1 of 5 · 14 Jul 2026");
    await globe.expectScene((scene) => expect(scene.drape?.url ?? "").not.toContain("2026-07-14"));
  });

  test("ground motion steps through pairs: one live pair, no event line", async ({ page }) => {
    const pair = String(INSAR_PAIRS.pairs[0]?.["pairId"]);
    await globe.mockExplorations({ first: insarView() });
    await globe.mockInsarPairs();
    await globe.goto(`?frame=${LIVE_FRAME.id}&lens=insar&pair=${pair}`);

    await expect(timeline(page)).toHaveAttribute("data-mode", "intervals");
    await expect(page.getByTestId("timeline-pair-0")).toHaveAttribute("aria-current", "true");
    await expect(page.getByTestId("timeline-pair-0")).toHaveText("24 D");
    await expect(readout(page)).toHaveText("Pair 1 of 1 · 21 Jul → 14 Aug 2026");
    await expect(page.getByTestId("timeline-sub")).toHaveText("1 MEASURED PAIR · NEWEST FIRST");
    await expect(page.getByTestId("timeline-event")).toHaveCount(0);
    await expect(page.getByTestId("timeline-play")).toHaveCount(0);
  });

  test("a case with no image per pass keeps its change map and offers no play", async ({
    page,
  }) => {
    await globe.goto("?case=qadirabad");

    await expect(page.getByTestId("timeline-play")).toHaveCount(0);
    await expect(page.getByTestId("timeline-speed")).toHaveCount(0);
    await expect(page.getByTestId("timeline-gap").first()).toHaveText("12 D");
    await page.getByTestId("timeline-step-next").click();
    await expect(readout(page)).toHaveText("Pass 5 of 8 · 7 Aug 2026");
    await globe.expectScene((scene) => expect(scene.drape?.url).toContain("qadirabad-change"));
  });
});
