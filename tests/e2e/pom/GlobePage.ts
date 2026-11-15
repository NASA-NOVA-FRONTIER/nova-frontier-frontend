import { readFileSync } from "node:fs";

import { expect, test, type Locator, type Page } from "@playwright/test";

import type { BBox, LonLat } from "@/features/frames/frame.types";
import { OBSERVATION_PLAN_QUERY_URL } from "@/features/frames/observationPlanApi";
import type { DrawEvent, Pointer } from "@/features/geo/drawMachine";
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
  outline?: { ring: LonLat[]; label: string; processing: boolean; spot?: boolean };
  point?: LonLat;
  frame?: { id: string };
  selectedCaseId?: string;
  drape?: { url: string; bounds: BBox };
  drapeAlpha: number;
  stamp?: { date: string; pass: string; target: boolean; box: BBox };
};

// Stub twins of the pixel clicks: same outcome as the pixel they replace on the real globe.
const LAND: LonLat = [-74.75, 2.89]; // inside frame 47-3, where clickLand lands with 47-3 open
const OCEAN: LonLat = [-20, 18]; // the home view's centre, open ocean
// Roughly what one pixel spans: at the whole-globe view (21,000 km up) and framed on a 10 km chip.
const DEG_PER_PX_HOME = 0.1;
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
  readonly dock: Locator;
  readonly jobError: Locator;
  readonly planPasses: Locator;
  readonly wholeGlobe: Locator;
  readonly helpButton: Locator;
  readonly areaTools: Locator;
  readonly areaGuide: Locator;
  readonly areaSize: Locator;
  readonly areaNotice: Locator;
  readonly useSquare: Locator;
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
    this.dock = page.getByTestId("layer-dock");
    this.jobError = page.getByTestId("job-error");
    this.planPasses = page.getByTestId("plan-passes");
    this.wholeGlobe = page.getByTestId("whole-globe");
    this.helpButton = page.getByTestId("help-button");
    this.areaTools = page.getByTestId("area-tools");
    this.areaGuide = page.getByTestId("area-guide");
    this.areaSize = page.getByTestId("area-size");
    this.areaNotice = page.getByTestId("area-notice");
    this.useSquare = page.getByTestId("area-use-square");
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

  tool(id: "point" | "rectangle" | "polygon"): Locator {
    return this.page.getByTestId(`tool-${id}`);
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
  private async stubClick([lon, lat]: LonLat, px?: Pointer["px"]): Promise<void> {
    await this.page.evaluate((at) => window.__globe?.click(at.lon, at.lat, at.px), {
      lon,
      lat,
      px,
    });
  }

  private async stubHover([lon, lat]: LonLat): Promise<void> {
    await this.page.evaluate((at) => window.__globe?.hover(at.lon, at.lat), { lon, lat });
  }

  // The lon/lat under a pixel offset from the free-screen centre, as the camera would frame it.
  private async lonLatAt({ dx, dy }: Offset): Promise<LonLat> {
    const { target } = await this.scene();
    if (target === undefined)
      return [OCEAN[0] + dx * DEG_PER_PX_HOME, OCEAN[1] - dy * DEG_PER_PX_HOME];
    const [west, south, east, north] = target.box;
    const centre: LonLat = [(west + east) / 2, (south + north) / 2];
    return [centre[0] + dx * DEG_PER_PX_CLOSE, centre[1] - dy * DEG_PER_PX_CLOSE];
  }

  private async pointerAt(offset: Offset): Promise<Pointer> {
    return {
      lonLat: await this.lonLatAt(offset),
      px: [FREE_CENTRE.x + offset.dx, FREE_CENTRE.y + offset.dy],
    };
  }

  private async stubDraw(events: DrawEvent[]): Promise<void> {
    await this.page.evaluate((list) => window.__globe?.draw(list), events);
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

  // Drawing offsets are in pixels from the free-screen centre, where a close-up chip sits.
  async dragFromCentre(from: Offset, to: Offset): Promise<void> {
    if (this.stub) {
      const start = await this.pointerAt(from);
      const end = await this.pointerAt(to);
      return this.stubDraw([
        { type: "down", pointer: start },
        { type: "move", pointer: end },
        { type: "up", pointer: end },
      ]);
    }
    const { mouse } = this.page;
    await mouse.move(FREE_CENTRE.x + from.dx, FREE_CENTRE.y + from.dy);
    await mouse.down();
    await mouse.move(FREE_CENTRE.x + to.dx, FREE_CENTRE.y + to.dy, { steps: 6 });
    await mouse.up();
  }

  async press(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  async clickFromCentre({ dx, dy }: Offset): Promise<void> {
    if (this.stub) {
      const { lonLat, px } = await this.pointerAt({ dx, dy });
      return this.stubClick(lonLat, px);
    }
    await this.page.mouse.click(FREE_CENTRE.x + dx, FREE_CENTRE.y + dy);
  }

  // On the stub: the last corner's click, then the finish a double-click sends.
  async doubleClickFromCentre({ dx, dy }: Offset): Promise<void> {
    if (this.stub) {
      await this.clickFromCentre({ dx, dy });
      return this.stubDraw([{ type: "finish" }]);
    }
    await this.page.mouse.dblclick(FREE_CENTRE.x + dx, FREE_CENTRE.y + dy);
  }
}
