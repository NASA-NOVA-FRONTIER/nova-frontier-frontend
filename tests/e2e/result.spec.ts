import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import {
  INSAR_PAIRS,
  insarView,
  sanMarcosView,
  succeededView,
  wildfireView,
  withFireContext,
} from "./pom/explorationMock";
import { GlobePage, layerIdOf, LIVE_FRAME } from "./pom/GlobePage";

const PAIR = String(INSAR_PAIRS.pairs[0]?.["pairId"]);

// What the v9 result must never claim (SPECS-flow-v9 §3, honesty rules). "Not shown:" names exactly
// these things as absent, so it is marked data-negation and skipped.
const NEVER: readonly RegExp[] = [
  /hectare/i,
  /\bha\b/,
  /probab/i,
  /\bcm\b/i,
  /\bdetected\b/i,
  /\b(caused by|due to|because of)\b/i,
];

// The text of the legend card, the result card (evidence included) and the timeline.
const resultText = (page: Page): Promise<string> =>
  page.evaluate(() =>
    ["legend-card", "result-card", "timeline"]
      .map((id) => document.querySelector(`[data-testid="${id}"]`))
      .flatMap((node) => {
        if (node === null) return [];
        const copy = node.cloneNode(true) as HTMLElement;
        for (const skip of copy.querySelectorAll("[data-negation]")) skip.remove();
        return [copy.textContent ?? ""];
      })
      .join("\n"),
  );

const expectHonest = async (page: Page): Promise<void> => {
  const evidence = page.getByTestId("result-evidence");
  if ((await evidence.count()) > 0) {
    await page.getByTestId("result-evidence-toggle").click();
    await expect(evidence).toHaveAttribute("open", "");
  }
  const text = await resultText(page);
  expect(text.length).toBeGreaterThan(100);
  for (const pattern of NEVER) expect(text, String(pattern)).not.toMatch(pattern);
};

test.describe("Explorer v9: the result card, the legend card and the layer switch", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("flood: chips, place, title, real range, N of M and the evidence closed below", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    const card = globe.resultCard;
    await expect(card).toHaveAttribute("data-lens", "flood_wetland");
    // The recorded answer was a cache hit: prepared ahead of time.
    await expect(page.getByTestId("result-origin")).toHaveText("OFFLINE");
    await expect(page.getByTestId("result-measured")).toHaveText("MEASURED");
    await expect(card.getByTestId("prov-demo")).toHaveCount(0);
    await expect(page.getByTestId("result-phen")).toHaveText("FLOOD · BOTH POLARIZATIONS");
    await expect(page.getByTestId("result-place")).toHaveText(/^Your square · /);
    await expect(page.getByTestId("result-title")).toHaveText("Parts of the square darkened");
    await expect(page.getByTestId("result-range")).toHaveText(
      "14 JUL 2026 → 11 NOV 2026 · 5 PASSES",
    );
    // Anchored at the start only: the stat's ⓘ button follows the label.
    await expect(globe.resultStat).toHaveText(
      /^208,344 of 1,048,576analysis cells met the darkening signature/,
    );
    await expect(page.getByTestId("result-could-be")).toHaveText(
      "Could also be:wet soil, or calm water that was already there.",
    );
    await expect(page.getByTestId("result-not-shown")).toHaveText(
      "Not shown:flood depth, hectares, probability.",
    );
    // No event date for a user square.
    await expect(card).not.toContainText(/event/i);

    // The v8 evidence the card doesn't draw: one section, closed until asked for.
    const evidence = page.getByTestId("result-evidence");
    await expect(evidence).not.toHaveAttribute("open", "");
    await expect(page.getByTestId("lens-surroundings")).toBeHidden();
    await page.getByTestId("result-evidence-toggle").click();
    await expect(page.getByTestId("lens-witness")).toHaveAttribute("data-state", "unavailable");
    await expect(page.getByTestId("lens-surroundings")).toContainText(
      "The 60 m patch around your pixel did not darken more than matched cells 120–300 m away.",
    );
    await expect(page.getByTestId("more-info")).toBeVisible();
    expect((await globe.panel.boundingBox())?.width).toBe(400);
  });

  test("flood: the evidence keeps OPERA's k / n bars on a ready optical answer", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: sanMarcosView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await page.getByTestId("result-evidence-toggle").click();
    const witness = page.getByTestId("lens-witness");
    await expect(witness).toHaveAttribute("data-state", "ready");
    await expect(witness.getByTestId("contrast-bars")).toContainText("12 / 221");
    // No driver's rule fires on this answer (5.4 % of dry cells, no new water); none is drawn.
    await expect(page.getByTestId("lens-slot-drivers")).toHaveCount(0);
  });

  test("flood layers: HH on the pass in focus; the layers this answer lacks are disabled", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.liveLayerDock).toHaveCount(0);
    await expect(globe.layerRadio("hh")).toHaveAttribute("aria-checked", "true");
    await expect(globe.layerRadio("hh")).toHaveText("HH");
    await expect(globe.layerRadio("change")).toHaveText("Change vs baseline median");
    await expect(globe.layerRadio("change")).toBeDisabled();
    await expect(globe.layerRadio("sig")).toHaveText("Darkening signature");
    await expect(globe.layerRadio("sig")).toBeDisabled();
    await expect(page.getByTestId("legend-ends")).toHaveText("−30 dB0 dB");
    await expect(page.getByTestId("legend-what")).toHaveText("How strongly the ground echoes (HH)");
    // Reduced motion opens on the reference pass (#65); HH follows the timeline pass by pass.
    await globe.expectScene((scene) =>
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_2026-07-14_HH"),
    );
    await globe.timelinePass(2).click();
    await globe.expectScene((scene) =>
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_2026-09-12_HH"),
    );
    await globe.timelinePasses("base").first().click();
    await globe.expectScene((scene) =>
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_2026-07-14_HH"),
    );
    await expect(page.getByTestId("layer-opacity")).toBeVisible();
  });

  test("wildfire: HV, then HV decline vs the baseline median; FIRMS counts only; no stat without a repeated count", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: wildfireView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}&lens=wildfire`);

    await expect(page.getByTestId("result-phen")).toHaveText("WILDFIRE · HV DECLINE");
    await expect(page.getByTestId("result-body")).toHaveText(
      /^Compared with the median of earlier passes, HV fell/,
    );
    // Seattle assessed HV on one pass only: there is no repeated-decline count to show.
    await expect(globe.resultStat).toHaveCount(0);
    await expect(page.getByTestId("fire-context")).toContainText(
      "No active-fire detections between the two passes",
    );
    await expect(page.getByTestId("result-evidence")).toHaveCount(0);

    await expect(globe.layerRadio("hv")).toHaveAttribute("aria-checked", "true");
    // Reduced motion opens on the reference pass (#65): step to the target pass first.
    await globe.timelinePasses("target").click();
    await globe.expectScene((scene) =>
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_2026-10-24_HV"),
    );
    await globe.layerRadio("hvdrop").click();
    await expect(globe.layerRadio("hvdrop")).toHaveAttribute("aria-checked", "true");
    await globe.expectScene((scene) =>
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_baseline_change_HV"),
    );
    await expect(page.getByTestId("legend-ends")).toHaveText("−8 dB+8 dB");
    await expect(page.getByTestId("legend-what")).toHaveText("Blue: HV fell and stayed low");
  });

  test("a FIRMS answer with detections shows its counts and dates, never dots", async ({
    page,
  }) => {
    await globe.mockExplorations({
      first: withFireContext("wildfire", {
        status: "available",
        source: "NASA FIRMS · VIIRS 375 m active-fire detections",
        windowStart: "2026-10-30T02:00:00Z",
        windowEnd: "2026-11-11T02:00:00Z",
        detections: 3,
        lowConfidenceExcluded: 0,
        firstDetection: "2026-11-02T08:41:00Z",
        lastDetection: "2026-11-09T20:12:00Z",
        peakFrpMw: 9.54,
        satellites: ["N20"],
        products: ["VIIRS_NOAA20_SP"],
        note: "Independent thermal evidence, separate from the radar.",
      }),
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}&lens=wildfire`);

    await expect(page.getByTestId("fire-context")).toContainText(
      "3 active-fire detections between the two passes",
    );
    await expect(page.getByTestId("fire-context")).toContainText("2 Nov 2026");
    await expectHonest(page);
  });

  test("earthquake: the pair's range and phase cells; coherence, then wrapped phase by keyboard", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: insarView() });
    await globe.mockInsarPairs();
    await globe.goto(`?frame=${LIVE_FRAME.id}&lens=insar&pair=${PAIR}`);

    await expect(globe.resultCard).toHaveAttribute("data-lens", "insar");
    await expect(page.getByTestId("result-origin")).toHaveText("ONLINE");
    await expect(page.getByTestId("result-range")).toHaveText("1 PAIR · 21 JUL 2026 → 14 AUG 2026");
    await expect(page.getByTestId("result-body")).toHaveText(
      /^The pair 21 Jul 2026 → 14 Aug 2026 kept its phase/,
    );
    await expect(globe.resultStat).toHaveText(
      /^39,584 of 62,500window cells with phase above 0\.35/,
    );

    await expect(globe.layerRadio("coh")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("legend-ends")).toHaveText("0 · changed1 · alike");
    await globe.expectScene((scene) =>
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_coherence_coherence"),
    );
    await globe.layerRadio("coh").focus();
    await page.keyboard.press("ArrowRight");
    await expect(globe.layerRadio("phase")).toHaveAttribute("aria-checked", "true");
    await expect(globe.layerRadio("phase")).toBeFocused();
    await expect(page.getByTestId("legend-ends")).toHaveText("−π+π");
    await globe.expectScene((scene) =>
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_wrapped_phase_rad_wrapped_phase_rad"),
    );
    // The 12 cm line lives only in the phase ⓘ.
    await expect(page.locator("main")).not.toContainText("12 cm");
  });

  test("the phase ⓘ carries the 12 cm line and says it is not a displacement", async ({ page }) => {
    await globe.mockExplorations({ first: insarView() });
    await globe.mockInsarPairs();
    await globe.goto(`?frame=${LIVE_FRAME.id}&lens=insar&pair=${PAIR}`);
    await globe.layerRadio("phase").click();
    await page.getByTestId("legend-tip").click();
    const tip = page.getByTestId("legend-tip-pop");
    await expect(tip).toContainText("Wrapped phase");
    await expect(tip).toContainText("about 12 cm");
    await expect(tip).toContainText("not a displacement");
    // Only the phase layer's tip says it: coherence's doesn't.
    await page.keyboard.press("Escape");
    await globe.layerRadio("coh").click();
    await page.getByTestId("legend-tip").click();
    await expect(tip).not.toContainText("12 cm");
  });

  test("a lens change resets the layer to the new lens's first one", async ({ page }) => {
    await globe.mockExplorations({
      answers: [wildfireView(), wildfireView({ lens: "vegetation_disturbance" })],
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}&lens=wildfire`);
    await globe.layerRadio("hvdrop").click();
    await expect(globe.layerRadio("hvdrop")).toHaveAttribute("aria-checked", "true");

    await globe.lens("vegetation_disturbance").click();
    await expect(globe.resultCard).toHaveAttribute("data-lens", "vegetation_disturbance", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("result-phen")).toHaveText("DEFORESTATION · VEGETATION LENS");
    await expect(globe.layerRadio("hv")).toHaveAttribute("aria-checked", "true");
    await expect(globe.layerRadio("hvdrop")).toHaveAttribute("aria-checked", "false");
  });

  test("Place a new square goes back to the empty globe; More information, report and downloads stay", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await page.getByTestId("download-button").click();
    await expect(page.getByTestId("download-pdf")).toContainText("PDF report");
    await expect(page.getByTestId("download-json")).toContainText("Result data · JSON");
    await page.keyboard.press("Escape");

    await globe.moreInfo.click();
    await expect(globe.sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(globe.sheet).toBeHidden();

    await page.getByTestId("result-new-square").click();
    await expect(globe.panel).toHaveCount(0);
    await expect(page.getByTestId("legend-card")).toHaveCount(0);
    await expect(globe.startCard).toBeVisible();
  });

  test("honesty scan: no hectares, probability, cm, cause or 'detected' on any lens's result", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: sanMarcosView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(globe.resultCard).toBeVisible();
    await expectHonest(page);

    for (const [view, query] of [
      [succeededView(), ""],
      [wildfireView(), "&lens=wildfire"],
      [wildfireView({ lens: "vegetation_disturbance" }), "&lens=vegetation_disturbance"],
      [insarView(), `&lens=insar&pair=${PAIR}`],
    ] as const) {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await globe.mockObservationPlan();
      await globe.mockExplorations({ first: view });
      await globe.goto(`?frame=${LIVE_FRAME.id}${query}`);
      await expect(globe.resultCard).toBeVisible();
      await expect(page.getByTestId("legend-card")).toBeVisible();
      await expectHonest(page);
    }
  });
});

test.describe("Explorer v9 result on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the layer pills are the lens's v9 layers and nothing leaves the screen", async ({
    page,
  }) => {
    const globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
    await globe.mockExplorations({ first: wildfireView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}&lens=wildfire`);

    await expect(globe.resultCard).toBeVisible();
    const pills = page.getByTestId("layer-pills");
    await expect(pills.getByRole("button")).toHaveText(["HV", "HV decline"]);
    await expect(page.getByTestId("layer-pill-hv")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("layer-pill-hvdrop").click();
    await expect(page.getByTestId("layer-pill-hvdrop")).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
  });
});
