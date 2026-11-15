import type { Locator, Page } from "@playwright/test";

export class MethodPage {
  private readonly page: Page;
  readonly heading: Locator;
  readonly lenses: Locator;
  readonly sequence: Locator;
  readonly metrics: Locator;
  readonly satellite: Locator;
  readonly kickers: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.lenses = page.getByTestId("method-lens");
    this.sequence = page.getByTestId("method-sequence");
    this.metrics = page.getByTestId("metrics-chart");
    this.satellite = page.getByTestId("method-satellite");
    this.kickers = page.locator("main .m-kicker");
  }

  async goto(): Promise<void> {
    await this.page.goto("/method");
  }

  satStep(n: number): Locator {
    return this.page.getByTestId(`sat-step-${n}`);
  }

  /** The step's kicker button, which scrolls the teardown to that step. */
  satGo(n: number): Locator {
    return this.page.getByTestId(`sat-go-${n}`);
  }

  // Scrolls so the satellite track has run `share` of its length (what the stage reads as progress).
  async scrollSatelliteTo(share: number): Promise<void> {
    await this.satellite.evaluate((track, at) => {
      const rect = track.getBoundingClientRect();
      window.scrollTo(0, rect.top + window.scrollY + at * (rect.height - window.innerHeight));
    }, share);
  }

  evidence(id: string): Locator {
    return this.page.getByTestId(`evidence-${id}`);
  }

  metricRows(id: "precision" | "recall" | "f1" | "iou"): Locator {
    return this.metrics.getByTestId(`metric-${id}`);
  }

  async pickMode(mode: "plain" | "technical"): Promise<void> {
    await this.page.getByTestId(`method-mode-${mode}`).click();
  }

  modeButton(mode: "plain" | "technical"): Locator {
    return this.page.getByTestId(`method-mode-${mode}`);
  }
}
