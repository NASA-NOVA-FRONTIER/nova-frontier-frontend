import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { INSAR_PAIRS, insarView, succeededView, wildfireView } from "./pom/explorationMock";
import { GlobePage, layerIdOf, LIVE_FRAME } from "./pom/GlobePage";

// The v9 sequence player (#26): every step asks the globe for its own image and names it in the stamp.

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

const KUMAMOTO_PAIR = String(INSAR_PAIRS.pairs[0]?.["pairId"]);

test.describe("Sequence timeline: autoplay", () => {
  test.use({ reducedMotion: "no-preference" });
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
    await globe.mockExplorations({ first: wildfireView() });
  });

  test("plays every Seattle pass with its own image, in date order", async ({ page }) => {
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await recordDrapes(page);

    await globe.expectTimelinePlaying(true);
    await expect(globe.timelinePlay).toHaveAttribute("aria-label", "Pause");
    // Five passes at 1.6 s, then the loop comes back to the first.
    await expect
      .poll(async () => new Set(await drapes(page)).size, { timeout: 20_000 })
      .toBeGreaterThanOrEqual(5);
    const ids = (await drapes(page)).map(layerIdOf).filter((id) => id.startsWith("display_"));
    const first = ids.indexOf("display_2026-06-26_HH");
    expect(ids.slice(first, first + 5)).toEqual([
      "display_2026-06-26_HH",
      "display_2026-07-20_HH",
      "display_2026-08-25_HH",
      "display_2026-09-18_HH",
      "display_2026-10-24_HH",
    ]);
  });

  test("a hidden tab pauses the player", async ({ page }) => {
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await globe.expectTimelinePlaying(true);

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await globe.expectTimelinePlaying(false);
    await expect(globe.timelinePlay).toHaveAttribute("aria-label", "Play");
  });

  test("grabbing the globe pauses the player", async () => {
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await globe.expectTimelinePlaying(true);

    await globe.grabGlobe();
    await globe.expectTimelinePlaying(false);
  });

  test("the explorer's Reduce motion switch pauses it where it is, and never resumes it", async ({
    page,
  }) => {
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await globe.helpButton.click();
    await globe.expectTimelinePlaying(true);

    await globe.motionSwitch.click();
    await globe.expectTimelinePlaying(false);
    const pausedOn = await globe.timelineReadout.textContent();
    // Two seconds is more than one 1.6 s step: a running timer would have moved it.
    await page.waitForTimeout(2_000);
    await expect(globe.timelineReadout).toHaveText(pausedOn ?? "");
    await expect(globe.timelinePlay).toHaveAttribute("aria-label", "Play");

    await globe.motionSwitch.click();
    await page.waitForTimeout(2_000);
    await globe.expectTimelinePlaying(false);
    await expect(globe.timelineReadout).toHaveText(pausedOn ?? "");
  });

  test("More information pauses it while hidden; closing it returns to the same pass", async ({
    page,
  }) => {
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await globe.expectTimelinePlaying(true);

    await globe.moreInfo.click();
    await expect(globe.sheet).toBeVisible();
    await expect(globe.timeline).toBeHidden();
    await globe.expectTimelinePlaying(false);
    const pausedOn = await globe.timelineReadout.textContent();
    await page.waitForTimeout(2_000);
    await expect(globe.timelineReadout).toHaveText(pausedOn ?? "");

    await page.keyboard.press("Escape");
    await expect(globe.sheet).toBeHidden();
    await expect(globe.timeline).toBeVisible();
    await globe.expectTimelinePlaying(false);
    await expect(globe.timelineReadout).toHaveText(pausedOn ?? "");
  });

  test("with Loop off at 2×, it stops on the last pass", async () => {
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await globe.timelineLoop.click();
    await expect(globe.timelineLoop).toHaveAttribute("aria-pressed", "false");
    await globe.timelineSpeedOption(2).click();
    await expect(globe.timelineSpeedOption(2)).toHaveAttribute("aria-pressed", "true");
    // Speed and loop never pause it.
    await globe.expectTimelinePlaying(true);

    await expect(globe.timelineReadout).toHaveText("Pass 5 of 5 · 24 Oct 2026", {
      timeout: 15_000,
    });
    await globe.expectTimelinePlaying(false);
  });
});

test.describe("Sequence timeline: controls", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("under reduced motion it opens paused on the reference pass", async () => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await globe.expectTimelinePlaying(false);
    await expect(globe.timelineReadout).toHaveText("Pass 1 of 5 · 14 Jul 2026");
    await expect(globe.timelineSub).toHaveText(
      "5 MEASURED PASSES · 14 JUL 2026 → 11 NOV 2026 · TRACK 84 ASCENDING",
    );
    await expect(globe.timelineGaps.first()).toHaveText("36 D");
  });

  test("the stamp names the pass in focus; a pass with no image shows nothing, never another date", async () => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.stamp).toHaveText("14 JUL 2026PASS 1 OF 5 · REFERENCE");
    await globe.timelinePass(2).click();
    await expect(globe.timelineReadout).toHaveText("Pass 3 of 5 · 12 Sep 2026");
    await expect(globe.stamp).toHaveText("12 SEP 2026PASS 3 OF 5 · 24 DAYS AFTER PASS 2");
    await globe.timelineStepNext.click();
    await expect(globe.timelineReadout).toHaveText("Pass 4 of 5 · 18 Oct 2026");
    await expect(globe.stamp).toHaveText("18 OCT 2026PASS 4 OF 5 · 36 DAYS AFTER PASS 3");
    await globe.expectScene((scene) => expect(scene.drape).toBeUndefined());
    await globe.timelinePrev.click();
    await globe.timelinePrev.click();
    await expect(globe.timelineReadout).toHaveText("Pass 2 of 5 · 19 Aug 2026");
    await globe.expectScene((scene) =>
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_2026-08-19_HH"),
    );
    await globe.timelinePasses("base").first().click();
    await expect(globe.stamp).toHaveText("14 JUL 2026PASS 1 OF 5 · REFERENCE");
  });

  test("opening and closing More information keeps the paused pass", async ({ page }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await globe.timelinePlay.click();
    await globe.expectTimelinePlaying(true);
    await globe.timelinePass(1).click();
    await globe.expectTimelinePlaying(false);
    await expect(globe.timelineReadout).toHaveText("Pass 2 of 5 · 19 Aug 2026");
    await expect(globe.stamp).toHaveText("19 AUG 2026PASS 2 OF 5 · 36 DAYS AFTER PASS 1");

    await globe.moreInfo.click();
    await expect(globe.sheet).toBeVisible();
    // Hidden and inert: out of the tab order and the accessibility tree, but still mounted.
    await expect(globe.timeline).toBeHidden();
    await expect(globe.timelineWrap).toHaveAttribute("inert", "");
    await page.keyboard.press("Escape");
    await expect(globe.sheet).toBeHidden();

    await expect(globe.timeline).toBeVisible();
    await expect(globe.timelineReadout).toHaveText("Pass 2 of 5 · 19 Aug 2026");
    await globe.expectTimelinePlaying(false);
    await expect(globe.stamp).toHaveText("19 AUG 2026PASS 2 OF 5 · 36 DAYS AFTER PASS 1");
    await globe.expectScene((scene) =>
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_2026-08-19_HH"),
    );
  });

  test("on a phone the timeline under the sheet can't take focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(globe.timeline).toBeVisible();

    await globe.moreInfo.click();
    await expect(globe.sheet).toBeVisible();
    await expect(globe.timeline).toBeHidden();
    await expect(globe.timelineWrap).toHaveAttribute("inert", "");
    for (let press = 0; press < 25; press += 1) {
      await page.keyboard.press("Tab");
      expect(
        await page.evaluate(
          () => (document.activeElement?.closest(".x-timeline-wrap") ?? null) !== null,
        ),
      ).toBe(false);
    }
  });

  test("play, then a click on a pass pauses on it; Home and End jump to the ends", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await globe.timelinePlay.click();
    await globe.expectTimelinePlaying(true);
    // Quiet while it plays, announced once the user takes over.
    await expect(globe.timelineAnnouncer).toHaveAttribute("aria-live", "off");
    await globe.timelinePasses("base").first().click();
    await globe.expectTimelinePlaying(false);
    await expect(globe.timelineAnnouncer).toHaveAttribute("aria-live", "polite");
    await expect(globe.timelineReadout).toHaveText("Pass 1 of 5 · 14 Jul 2026");

    await page.keyboard.press("End");
    await expect(globe.timelineReadout).toHaveText("Pass 5 of 5 · 11 Nov 2026");
    await page.keyboard.press("Home");
    await expect(globe.timelineReadout).toHaveText("Pass 1 of 5 · 14 Jul 2026");
  });

  test("dragging along the track scrubs to the nearest pass", async ({ page }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    const track = await globe.timelineTrack.boundingBox();
    if (track === null) throw new Error("the track is on screen");
    const y = track.y + track.height / 2;
    await page.mouse.move(track.x + 2, y);
    await page.mouse.down();
    await expect(globe.timelineReadout).toHaveText("Pass 1 of 5 · 14 Jul 2026");
    await page.mouse.move(track.x + track.width * 0.62, y, { steps: 8 });
    await page.mouse.up();
    await expect(globe.timelineReadout).not.toHaveText("Pass 1 of 5 · 14 Jul 2026");
    await globe.expectScene((scene) => expect(scene.drape?.url ?? "").not.toContain("2026-07-14"));
  });

  test("ground motion steps through pairs: one live pair, no event line", async () => {
    await globe.mockExplorations({ first: insarView() });
    await globe.mockInsarPairs();
    await globe.goto(`?frame=${LIVE_FRAME.id}&lens=insar&pair=${KUMAMOTO_PAIR}`);

    await expect(globe.timeline).toHaveAttribute("data-mode", "intervals");
    await expect(globe.timelinePair(0)).toHaveAttribute("aria-current", "true");
    await expect(globe.timelinePair(0)).toHaveText("24 D");
    await expect(globe.timelineReadout).toHaveText("Pair 1 of 1 · 21 Jul → 14 Aug 2026");
    await expect(globe.timelineSub).toHaveText("1 MEASURED PAIR · NEWEST FIRST");
    await expect(globe.timelineEvent).toHaveCount(0);
    await expect(globe.timelinePlay).toHaveCount(0);
    await expect(globe.stamp).toHaveText("21 JUL 2026 → 14 AUG 2026INTERVAL 1 OF 1 · 24 DAYS");
  });

  test("a case with no image per pass keeps its change map and offers no play", async () => {
    await globe.goto("?case=qadirabad");

    await expect(globe.timelinePlay).toHaveCount(0);
    await expect(globe.timelineSpeed).toHaveCount(0);
    await expect(globe.timelineGaps.first()).toHaveText("12 D");
    await globe.timelineStepNext.click();
    await expect(globe.timelineReadout).toHaveText("Pass 5 of 8 · 7 Aug 2026");
    await globe.expectScene((scene) => expect(scene.drape?.url).toContain("qadirabad-change"));
    // DEMO dates over a change map: no stamp claims it is one pass.
    await expect(globe.stamp).toHaveCount(0);
  });
});

test(
  "on the real globe, Play walks the five passes in order with each date in the stamp, and stops without Loop",
  { tag: "@globe" },
  async ({ page }) => {
    const globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await globe.timelinePasses("base").first().click();
    await globe.timelineLoop.click();
    await expect(globe.timelineReadout).toHaveText("Pass 1 of 5 · 14 Jul 2026");

    // Real time, not page.clock: a fake clock also drives requestAnimationFrame and makes Cesium
    // render far too many SwiftShader frames. The page records every change, however slow the test.
    await page.evaluate(() => {
      const text = (id: string) =>
        document.querySelector(`[data-testid="${id}"]`)?.textContent ?? "";
      const label = () =>
        document.querySelector('[data-testid="timeline-play"]')?.getAttribute("aria-label") ?? "";
      const now = () => ({
        line: text("timeline-readout"),
        stamp: text("timelapse-stamp"),
        play: label(),
        at: performance.now(),
      });
      const steps = [now()];
      new MutationObserver(() => {
        const step = now();
        const last = steps.at(-1);
        if (last?.line !== step.line || last.stamp !== step.stamp || last.play !== step.play)
          steps.push(step);
      }).observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });
      Object.assign(window, { playSteps: steps });
    });
    type Step = { line: string; stamp: string; play: string; at: number };
    const recorded = () =>
      page.evaluate(() => (window as unknown as { playSteps: Step[] }).playSteps);

    // The readout and the stamp update one render apart; keep the moments where they agree.
    const settled = (all: Step[]) =>
      all
        .filter((step) => step.stamp.startsWith(step.line.split(" · ")[1]?.toUpperCase() ?? "-"))
        .filter(
          (step, index, list) =>
            index === 0 ||
            list[index - 1]?.line !== step.line ||
            list[index - 1]?.play !== step.play,
        );

    await globe.timelinePlay.click();
    await expect.poll(async () => settled(await recorded()).length, { timeout: 30_000 }).toBe(7);

    const steps = settled(await recorded());
    expect(steps.map(({ line, stamp, play }) => [line, stamp, play])).toEqual([
      ["Pass 1 of 5 · 14 Jul 2026", "14 JUL 2026PASS 1 OF 5 · REFERENCE", "Play"],
      ["Pass 1 of 5 · 14 Jul 2026", "14 JUL 2026PASS 1 OF 5 · REFERENCE", "Pause"],
      ["Pass 2 of 5 · 19 Aug 2026", "19 AUG 2026PASS 2 OF 5 · 36 DAYS AFTER PASS 1", "Pause"],
      ["Pass 3 of 5 · 12 Sep 2026", "12 SEP 2026PASS 3 OF 5 · 24 DAYS AFTER PASS 2", "Pause"],
      ["Pass 4 of 5 · 18 Oct 2026", "18 OCT 2026PASS 4 OF 5 · 36 DAYS AFTER PASS 3", "Pause"],
      ["Pass 5 of 5 · 11 Nov 2026", "11 NOV 2026PASS 5 OF 5 · 24 DAYS AFTER PASS 4", "Pause"],
      ["Pass 5 of 5 · 11 Nov 2026", "11 NOV 2026PASS 5 OF 5 · 24 DAYS AFTER PASS 4", "Play"],
    ]);
    // Each step lands after the one before it (order, not wall-clock: SwiftShader frames are too uneven
    // for a timing bound; the 1.6 s step is covered by the `stepMs` unit test).
    const times = steps.map(({ at }) => at);
    for (let index = 1; index < times.length; index += 1)
      expect(times[index] ?? 0).toBeGreaterThan(times[index - 1] ?? 0);
  },
);
