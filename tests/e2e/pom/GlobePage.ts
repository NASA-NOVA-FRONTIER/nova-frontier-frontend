import { readFileSync } from "node:fs";

import { expect, test, type Locator, type Page } from "@playwright/test";

import type { BBox, LonLat } from "@/features/frames/frame.types";
import { OBSERVATION_PLAN_QUERY_URL } from "@/features/frames/observationPlanApi";
import "@/features/globe/globeHooks";
import { ONBOARDING_KEY } from "@/features/onboarding/onboardingState";
import { ExplorationMock, INSAR_PAIRS } from "./explorationMock";

// Frame 47-3 (ascending, HH+HV, over Colombia); its mocked plan lists 39 dates.
export const LIVE_FRAME = { id: "47-3", title: "Track 47 · Frame 3" };

const PLACES_URL = "**/api/v1/places**";
const COVERAGE_URL = "**/api/v1/coverage**";
const LIMITS_URL = "**/api/v1/limits";

const readMock = (name: string): string =>
  readFileSync(new URL(`../mocks/${name}.json`, import.meta.url), "utf8");

const PLAN_MOCK = readFileSync(
  new URL("../mocks/observation-plan-47-3.json", import.meta.url),
  "utf8",
);

// With a selection open, the camera centres the chip in the free area right of the 392 px panel,
// left of the 288 px dock and above the 200 px timeline (1440 × 900 viewport).
const FREE_CENTRE = { x: 392 + (1440 - 392 - 288) / 2, y: 72 + (900 - 72 - 200) / 2 };
// Far enough from the centre to miss the point and marker, still inside the same NISAR frame.
const OFF_CENTRE_PX = 90;

type Offset = { dx: number; dy: number };

// What the stub globe shows in data-scene: GlobeView's `scene` prop as JSON (undefined keys drop out).
export type SceneJson = {
  target?: { key: string; box: BBox; zoom: number };
  outline?: { ring: LonLat[]; label: string; processing: boolean };
  point?: LonLat;
  frame?: { id: string };
  selectedCaseId?: string;
  drape?: { url: string; bounds: BBox };
  drapeAlpha: number;
  stamp?: { date: string; pass: string; target: boolean; box: BBox };
  square?: { centre: LonLat; sideKm: number; movable: boolean };
};

// Stub twins of the pixel clicks: same outcome as the pixel they replace on the real globe.
const LAND: LonLat = [-74.75, 2.89]; // inside frame 47-3, where clickLand lands with 47-3 open
const OCEAN: LonLat = [-20, 18]; // the home view's centre, open ocean
// Roughly what one pixel spans with the camera framed on a 10 km square.
const DEG_PER_PX_CLOSE = 0.0005;

// The last path segment of a layer URL, e.g. ".../display_2026-09-12_HH" → "display_2026-09-12_HH".
export const layerIdOf = (url: string): string =>
  new URL(url, "http://x").pathname.split("/").filter(Boolean).at(-1) ?? "";

export class GlobePage {
  private readonly page: Page;
  readonly startCard: Locator;
  readonly framesStatus: Locator;
  readonly tooltip: Locator;
  readonly panel: Locator;
  readonly panelTitle: Locator;
  readonly panelMeta: Locator;
  readonly panelClose: Locator;
  readonly panelStat: Locator;
  readonly verdict: Locator;
  readonly moreInfo: Locator;
  readonly pending: Locator;
  readonly sheet: Locator;
  readonly techLimit: Locator;
  readonly timeline: Locator;
  readonly timelineCompare: Locator;
  readonly timelineReadout: Locator;
  readonly timelineSub: Locator;
  readonly timelinePlay: Locator;
  readonly timelinePrev: Locator;
  readonly timelineStepNext: Locator;
  readonly timelineLoop: Locator;
  readonly timelineSpeed: Locator;
  readonly timelineTrack: Locator;
  readonly timelineGaps: Locator;
  readonly timelineEvent: Locator;
  readonly stamp: Locator;
  readonly dock: Locator;
  readonly jobError: Locator;
  readonly planPasses: Locator;
  readonly wholeGlobe: Locator;
  readonly helpButton: Locator;
  readonly squareBar: Locator;
  readonly squareCancel: Locator;
  readonly useSquare: Locator;
  // The real globe's square overlay; the stub globe draws nothing.
  readonly square: Locator;
  readonly searchPill: Locator;
  readonly searchMenu: Locator;
  readonly searchInput: Locator;
  readonly searchError: Locator;
  readonly placeCard: Locator;
  readonly spotNearest: Locator;
  readonly placeAnalyse: Locator;
  // Every place search the page sent, in order.
  readonly placeRequests: string[] = [];
  readonly coverageRequests: string[] = [];
  readonly jobModal: Locator;
  readonly jobElapsed: Locator;
  readonly jobProgress: Locator;
  readonly normalRange: Locator;
  readonly liveLayerDock: Locator;
  readonly pairPicker: Locator;
  readonly pairMeasure: Locator;
  readonly insarCard: Locator;
  // Every pair list the page asked for, in order.
  readonly pairRequests: string[] = [];

  constructor(page: Page) {
    this.page = page;
    this.startCard = page.getByTestId("start-card");
    this.framesStatus = page.getByTestId("frames-status");
    this.tooltip = page.getByTestId("globe-tooltip");
    this.panel = page.getByTestId("case-panel");
    this.panelTitle = page.getByTestId("panel-title");
    this.panelMeta = page.getByTestId("panel-meta");
    this.panelClose = page.getByTestId("panel-close");
    this.panelStat = page.getByTestId("panel-stat");
    this.verdict = page.getByTestId("verdict");
    this.moreInfo = page.getByTestId("more-info");
    this.pending = page.getByTestId("pending");
    this.sheet = page.getByTestId("sheet");
    this.techLimit = page.getByTestId("tech-limit");
    this.timeline = page.getByTestId("timeline");
    this.timelineCompare = page.getByTestId("timeline-compare");
    this.timelineReadout = page.getByTestId("timeline-readout");
    this.timelineSub = page.getByTestId("timeline-sub");
    this.timelinePlay = page.getByTestId("timeline-play");
    this.timelinePrev = page.getByTestId("timeline-prev");
    this.timelineStepNext = page.getByTestId("timeline-step-next");
    this.timelineLoop = page.getByTestId("timeline-loop");
    this.timelineSpeed = page.getByTestId("timeline-speed");
    this.timelineTrack = page.getByTestId("timeline-track");
    this.timelineGaps = page.getByTestId("timeline-gap");
    this.timelineEvent = page.getByTestId("timeline-event");
    this.stamp = page.getByTestId("timelapse-stamp");
    this.dock = page.getByTestId("layer-dock");
    this.jobError = page.getByTestId("job-error");
    this.planPasses = page.getByTestId("plan-passes");
    this.wholeGlobe = page.getByTestId("whole-globe");
    this.helpButton = page.getByTestId("help-button");
    this.squareBar = page.getByTestId("square-bar");
    this.squareCancel = page.getByTestId("square-cancel");
    this.useSquare = page.getByTestId("square-use");
    this.square = page.getByTestId("square");
    this.searchPill = page.getByTestId("place-search");
    this.searchMenu = page.getByTestId("search-menu");
    this.searchInput = page.getByTestId("place-input");
    this.searchError = page.getByTestId("place-error");
    this.placeCard = page.getByTestId("place-card");
    this.spotNearest = page.getByTestId("spot-nearest");
    this.placeAnalyse = page.getByTestId("place-analyse");
    this.jobModal = page.getByTestId("job-modal");
    this.jobElapsed = page.getByTestId("job-elapsed");
    this.jobProgress = page.getByTestId("job-progress");
    this.normalRange = page.getByTestId("normal-range");
    this.liveLayerDock = page.getByTestId("live-layer-dock");
    this.pairPicker = page.getByTestId("pair-picker");
    this.pairMeasure = page.getByTestId("pair-measure");
    this.insarCard = page.getByTestId("insar-card");
  }

  // Plays the backend's exploration API (see ExplorationMock); returns it to drive and inspect.
  async mockExplorations(
    options: ConstructorParameters<typeof ExplorationMock>[0] = {},
  ): Promise<ExplorationMock> {
    const mock = new ExplorationMock(options);
    await mock.install(this.page);
    return mock;
  }

  // Answers every pair list with the real recorded one, an empty one, or `failures` 502s first.
  async mockInsarPairs({ empty = false, failures = 0 } = {}): Promise<void> {
    await this.page.route("**/api/v1/insar/pairs**", (route) => {
      this.pairRequests.push(route.request().url());
      if (this.pairRequests.length <= failures)
        return route.fulfill({
          status: 502,
          contentType: "application/problem+json",
          body: JSON.stringify({
            title: "Scene catalog unavailable",
            detail: "the GUNW pair catalog is unavailable",
            reasonCode: "UPSTREAM_CATALOG_ERROR",
            status: 502,
          }),
        });
      return route.fulfill({
        json: empty ? { ...INSAR_PAIRS, pairs: [] } : INSAR_PAIRS,
      });
    });
  }

  placeOption(index: number): Locator {
    return this.page.getByTestId(`place-option-${index}`);
  }

  // Answers every place search with a recorded answer; `failures` problem+json 502s come first.
  // Answers every coverage check with a real recorded answer; `failures` 502s come first.
  async mockCoverage({ mock = "coverage-qadirabad", failures = 0 } = {}): Promise<void> {
    await this.page.route(COVERAGE_URL, (route) => {
      this.coverageRequests.push(route.request().url());
      const failing = this.coverageRequests.length <= failures;
      return route.fulfill({
        status: failing ? 502 : 200,
        contentType: failing ? "application/problem+json" : "application/json",
        body: failing
          ? JSON.stringify({
              title: "Scene catalog unavailable",
              detail: "the scene catalog did not answer",
              reasonCode: "UPSTREAM_CATALOG_ERROR",
              status: 502,
            })
          : readMock(mock),
      });
    });
  }

  async mockPlaces({ mock = "places-qadirabad", failures = 0 } = {}): Promise<void> {
    await this.page.route(PLACES_URL, (route) => {
      this.placeRequests.push(route.request().url());
      const failing = this.placeRequests.length <= failures;
      return route.fulfill({
        status: failing ? 502 : 200,
        contentType: failing ? "application/problem+json" : "application/json",
        body: failing
          ? JSON.stringify({
              title: "Place search unavailable",
              detail: "the place search did not answer correctly",
              reasonCode: "UPSTREAM_GEOCODER_ERROR",
              status: 502,
            })
          : readMock(mock),
      });
    });
  }

  caseRow(id: string): Locator {
    return this.page.getByTestId(`case-row-${id}`);
  }

  lens(id: string): Locator {
    return this.page.getByTestId(`lens-${id}`);
  }

  timelinePasses(kind: "base" | "target" | "meas" | "plan"): Locator {
    return this.timeline.locator(`[data-testid^="timeline-pass-"][data-kind="${kind}"]`);
  }

  // One measured pass on the track, by its order in the run (0 = the reference pass).
  timelinePass(index: number): Locator {
    return this.page.getByTestId(`timeline-pass-${index}`);
  }

  timelinePair(index: number): Locator {
    return this.page.getByTestId(`timeline-pair-${index}`);
  }

  timelineSpeedOption(speed: 0.5 | 1 | 2): Locator {
    return this.page.getByTestId(`timeline-speed-${speed}`);
  }

  // "true" while the sequence player runs.
  async expectTimelinePlaying(playing: boolean): Promise<void> {
    await expect(this.timeline).toHaveAttribute("data-playing", String(playing));
  }

  // A zoom of the globe itself (not the square), which pauses the timeline.
  async grabGlobe(): Promise<void> {
    if (this.stub) {
      await this.page.evaluate(() => window.__globe?.interact());
      return;
    }
    await this.page.mouse.move(FREE_CENTRE.x, FREE_CENTRE.y);
    await this.page.mouse.wheel(0, 120);
  }

  // Answers every plan query with frame 47-3's dates; `failures` HTTP errors come first.
  async mockObservationPlan({ status = 200, failures = 0 } = {}): Promise<void> {
    let calls = 0;
    await this.page.route(`${OBSERVATION_PLAN_QUERY_URL}**`, (route) => {
      calls += 1;
      const failing = status !== 200 && calls <= Math.max(failures, 1);
      return route.fulfill({
        status: failing ? status : 200,
        contentType: "application/json",
        body: failing ? "{}" : PLAN_MOCK,
      });
    });
  }

  // Backend #2's daily limits. Without this mock every page gets the fixture's 404 (the endpoint
  // isn't deployed yet, see fixtures.ts) and the quota line stays hidden.
  async mockLimits(limits: {
    remainingApp: number | null;
    remainingClient: number | null;
    resetsAt?: string;
  }): Promise<void> {
    await this.page.route(LIMITS_URL, (route) => route.fulfill({ json: limits }));
  }

  // "stub" in the ui project's stub build, "real" for @globe tests and on pushes to main.
  get stub(): boolean {
    return test.info().project.metadata["globe"] === "stub";
  }

  // GlobeView's scene as the stub globe received it.
  async scene(): Promise<SceneJson> {
    const json = await this.page.getByTestId("globe").getAttribute("data-scene");
    return JSON.parse(json ?? "{}") as SceneJson;
  }

  // Asserts what the app asked the globe to show. Only the stub exposes it; on the real globe the
  // @globe tests and the main-branch run cover the picture, so this is noted and skipped.
  async expectScene(check: (scene: SceneJson) => void): Promise<void> {
    if (!this.stub) {
      test
        .info()
        .annotations.push({ type: "scene", description: "checked on the stub globe only" });
      return;
    }
    await expect(async () => check(await this.scene())).toPass({ timeout: 10_000 });
  }

  // The stub globe's test hooks (GlobeView.stub.tsx); each calls the callback a real gesture would.
  private async stubClick([lon, lat]: LonLat): Promise<void> {
    await this.page.evaluate((at) => window.__globe?.click(at.lon, at.lat), { lon, lat });
  }

  private async stubHover([lon, lat]: LonLat): Promise<void> {
    await this.page.evaluate((at) => window.__globe?.hover(at.lon, at.lat), { lon, lat });
  }

  // Marks the quick tour as seen before the page loads, as on any visit after the first.
  async skipOnboarding(): Promise<void> {
    await this.page.addInitScript((key) => window.localStorage.setItem(key, "1"), ONBOARDING_KEY);
  }

  // Hover and live questions need the frames snapshot, so every test waits for it.
  async goto(query = ""): Promise<void> {
    await this.page.goto(`/explore${query}`);
    await this.page.locator('main[data-frames="success"]').waitFor({ timeout: 30_000 });
    if (this.stub) await this.page.waitForFunction(() => window.__globe !== undefined);
  }

  async hoverLand(): Promise<void> {
    if (this.stub) return this.stubHover(LAND);
    await this.page.mouse.move(FREE_CENTRE.x + OFF_CENTRE_PX, FREE_CENTRE.y);
  }

  // With nothing open the camera rests over the Atlantic (−20°, 18°): its centre is open ocean.
  async clickOcean(): Promise<void> {
    if (this.stub) return this.stubClick(OCEAN);
    await this.page.mouse.click(FREE_CENTRE.x, FREE_CENTRE.y);
  }

  async clickLand(): Promise<void> {
    if (this.stub) return this.stubClick(LAND);
    await this.page.mouse.click(FREE_CENTRE.x + OFF_CENTRE_PX, FREE_CENTRE.y);
  }

  // A click on land, then the step 2 bar: the square is placed and nothing has run.
  async placeSquare(): Promise<void> {
    await this.clickLand();
    await expect(this.squareBar).toBeVisible();
  }

  // The square's centre as the explorer holds it (stub) or as the overlay draws it (real globe).
  async squareCentre(): Promise<LonLat | undefined> {
    if (this.stub) return (await this.scene()).square?.centre;
    const text = await this.square.getAttribute("data-centre");
    const [lon, lat] = (text ?? "").split(",").map(Number);
    return lon === undefined || lat === undefined ? undefined : [lon, lat];
  }

  // Real globe: a mouse drag from the middle of the square, by pixels. Stub: the centre that drag
  // would give at a close-up (east is +dx, north is −dy).
  async dragSquare({ dx, dy }: Offset): Promise<void> {
    if (this.stub) {
      const centre = (await this.scene()).square?.centre;
      if (centre === undefined) throw new Error("no square to drag");
      const to: LonLat = [centre[0] + dx * DEG_PER_PX_CLOSE, centre[1] - dy * DEG_PER_PX_CLOSE];
      await this.page.evaluate((at) => window.__globe?.dragSquare(at[0], at[1]), to);
      return;
    }
    const box = await this.square.locator("polygon").boundingBox();
    if (box === null) throw new Error("the square is not on screen");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const { mouse } = this.page;
    await mouse.move(x, y);
    await mouse.down();
    await mouse.move(x + dx, y + dy, { steps: 8 });
    await mouse.up();
  }

  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }
}
