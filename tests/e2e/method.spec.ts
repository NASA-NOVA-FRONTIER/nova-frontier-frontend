import { expect, test } from "@playwright/test";

import { MethodPage } from "./pom/MethodPage";

test.describe("Method page", () => {
  test("the sections read in the v8 order, with no landslides section", async ({ page }) => {
    const method = new MethodPage(page);
    await method.goto();
    await expect(page.getByTestId("method-intro-kicker")).toHaveText(
      "Method · What the radar measures",
    );
    // The satellite and the Qadirabad sequence come first, unnumbered, as in the reference.
    const lead = await page
      .locator(
        "[data-testid=method-satellite], [data-testid=method-sequence], [data-testid=method-pipeline]",
      )
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
    expect(lead).toEqual(["method-satellite", "method-sequence", "method-pipeline"]);
    await expect(method.kickers).toHaveText([
      "01 · From a click to an answer",
      "02 · Reading the band chart",
      "03 · Lenses are questions",
      "04 · WHAT THE ECHO SAYS",
      "05 · THE LENGTH OF THE WAVE",
      "06 · TWO PASSES, ONE PHASE",
      "07 · Where it works, where it fails",
      "08 · Experimental models",
      "09 · Colours belong to the data",
    ]);
    await expect(page.getByTestId("method-landslides")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(
      /No measured case yet|pending|coming soon/i,
    );
  });

  test("reduced motion: the teardown cuts from step to step with the scroll, without a loop", async ({
    page,
  }) => {
    const method = new MethodPage(page);
    await method.goto();
    await expect(method.satellite).toHaveAttribute("data-variant", "stage");
    const model = method.satellite.getByTestId("nisar-satellite");
    const live = method.satellite.getByTestId("sat-live");
    await expect(live).toHaveAttribute("aria-live", "polite");

    // One step per sixth of the track: the reflector rests at 2/6.
    await method.scrollSatelliteTo(2 / 6);
    await expect(model).toHaveAttribute("data-status", "ready");
    await expect(method.satStep(3)).toHaveAttribute("aria-current", "step");
    await expect(method.satStep(3)).toContainText("12 m reflector");
    await expect(method.satStep(3)).toContainText("Gold-plated wire mesh");
    await expect(method.satStep(3).getByRole("link").first()).toHaveAttribute(
      "href",
      "https://science.nasa.gov/mission/nisar/about-the-satellite/",
    );
    await expect(live).toHaveText("03 / 07 · REFLECTOR. 12 m reflector");
    // Only the active step opens its text.
    await expect(method.satStep(2)).not.toContainText("A 12 m reflector on a 9 m boom.");
    // Taken apart, the step names the piece and the hotspot rings stay hidden.
    await expect(model.getByTestId("nisar-hotspot-reflector")).toHaveCSS("opacity", "0");
    await expect(model).toHaveAttribute("data-running", "false");

    // The last step puts the model back together: deployed, rings back.
    await method.scrollSatelliteTo(1);
    await expect(method.satStep(7)).toHaveAttribute("aria-current", "step");
    await expect(method.satStep(7)).toContainText("LOOKING SIDEWAYS");
    await expect(model.getByTestId("nisar-hotspot-reflector")).toHaveCSS("opacity", "1");
    await expect(model).toHaveAttribute("data-running", "false");
  });

  test("the keyboard walks the teardown: each step kicker is a button", async ({ page }) => {
    const method = new MethodPage(page);
    await method.goto();
    await method.scrollSatelliteTo(0);
    await expect(method.satStep(1)).toHaveAttribute("aria-current", "step");
    await method.satGo(4).focus();
    await page.keyboard.press("Tab");
    await expect(method.satGo(5)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(method.satStep(5)).toHaveAttribute("aria-current", "step");
    await expect(method.satStep(5)).toContainText("L-band radar · 24 cm");
    await expect(method.satStep(5)).toContainText("S-band radar · 9.4 cm");
    await expect(method.satellite.getByTestId("sat-live")).toContainText("05 / 07 · RADARS");
    await expect(method.satGo(5)).toBeFocused();
  });

  test("phones read the teardown as a list with photos, no 3D model", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const method = new MethodPage(page);
    await method.goto();
    await expect(method.satellite).toHaveAttribute("data-variant", "list");
    await expect(method.satellite.locator("li")).toHaveCount(7);
    await expect(method.satellite.locator("canvas")).toHaveCount(0);
    await expect(method.satellite.locator("img")).toHaveCount(2);
    await expect(method.satStep(6)).toContainText("Spacecraft bus");
    await expect(method.satStep(6)).toContainText("Solar array");
    for (let n = 1; n <= 7; n++) {
      await expect(method.satStep(n).getByRole("link").first()).toHaveAttribute(
        "href",
        /^https:\/\/science\.nasa\.gov\//,
      );
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });

  test("the echo simulator switches surface with the arrow keys", async ({ page }) => {
    await new MethodPage(page).goto();
    const echo = page.getByTestId("method-echo");
    await echo.getByTestId("echo-surface-water").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(echo.getByTestId("echo-surface-city")).toBeFocused();
    await expect(echo.getByTestId("echo-surface-city")).toHaveAttribute("aria-checked", "true");
    await expect(echo.getByTestId("echo-title")).toHaveText(
      "Wall and street send it straight back.",
    );
    await expect(echo.getByTestId("echo-value-hh")).toHaveText("−3 dB");
    await expect(echo.getByTestId("echo-value-hv")).toHaveText("−12 dB");
    await expect(echo.getByTestId("echo-chip")).toHaveText("TYPICAL VALUES · ILLUSTRATIVE");
    await expect(echo.getByTestId("prov-real")).toHaveCount(0);
  });

  test("interferometry and the colour key state the 12 cm path-length rule", async ({ page }) => {
    await new MethodPage(page).goto();
    const stat = page.getByTestId("insar-stat");
    await expect(stat).toContainText("39,584");
    await expect(stat).toContainText(
      "of 62,500 cells kept their phase at the 0.35 coherence threshold",
    );
    await expect(page.getByTestId("insar-chip")).toHaveText(
      "REAL · KUMAMOTO · 21 JUL → 14 AUG 2026 · RUN 12 NOV 2026",
    );
    const palettes = page.getByTestId("method-palettes");
    await expect(palettes).toContainText("Backscatter, HH and HV");
    await expect(palettes).toContainText("Coherence");
    await expect(palettes).toContainText("One full cycle is about 12 cm of change in path length.");
  });

  test("the hero asks one question and the Qadirabad frames read in order", async ({ page }) => {
    const method = new MethodPage(page);
    await method.goto();
    await expect(method.heading).toHaveText("One honest question, asked of real radar.");
    // Reduced motion: no pin, all five frames stacked.
    await expect(method.sequence.getByRole("heading", { level: 2 })).toHaveText([
      "First, this place's normal echo.",
      "Then, how it changed on 26 July.",
      "The cells that crossed the line.",
      "A second witness, a week later.",
      "Agreement, and where it breaks.",
    ]);
    await expect(method.sequence.getByTestId("contrast-bars")).toContainText("332 / 516");
  });

  test("the lenses section lists the five questions", async ({ page }) => {
    const method = new MethodPage(page);
    await method.goto();
    await expect(method.lenses).toHaveCount(5);
    await expect(method.lenses).toContainText([
      "Did it flood?",
      "Did vegetation disappear?",
      "Did fire scar it?",
      "Did a field change?",
      "Did the ground keep its echo?",
    ]);
  });

  test("works and fails cards show the real shares", async ({ page }) => {
    const method = new MethodPage(page);
    await method.goto();
    await expect(method.evidence("matam")).toContainText("17.8%");
    await expect(method.evidence("matam")).toContainText("1.1%");
    await expect(method.evidence("barh")).toContainText("32.6%");
    await expect(method.evidence("kumamoto")).toContainText("39,584 of 62,500");
    await expect(method.evidence("kumamoto").getByTestId("prov-real")).toHaveText(
      "REAL · KUMAMOTO · 21 JUL → 14 AUG 2026 · RUN 12 NOV 2026",
    );
  });

  // P0 copy pass: a fringe is path length, never a displacement in centimetres.
  test("the page states what the radar returns", async ({ page }) => {
    const method = new MethodPage(page);
    await method.goto();
    await expect(page.locator("body")).not.toContainText("centimetres the ground");
    await expect(page.locator("body")).not.toContainText("waits too");
    await expect(page.locator("body")).toContainText("Up to five real passes");
    await expect(page.getByTestId("site-footer")).toContainText(
      "WHAT L-BAND INTERFEROMETRY IS USED FOR",
    );
  });

  test("the metrics chart flags development data and Technical reveals all four metrics", async ({
    page,
  }) => {
    const method = new MethodPage(page);
    await method.goto();
    await expect(method.metrics).toContainText("Development data · no independent test yet");
    await expect(method.metrics.getByText("Experimental", { exact: true })).toHaveCount(3);
    // Plain: F1 only, plus precision and recall for the one test without an F1.
    await expect(method.metricRows("iou")).toHaveCount(0);
    await expect(method.metricRows("f1")).toHaveCount(4);

    await method.pickMode("technical");
    await expect(method.modeButton("technical")).toHaveAttribute("aria-pressed", "true");
    for (const id of ["precision", "recall", "f1", "iou"] as const) {
      await expect(method.metricRows(id)).toHaveCount(5);
    }
    // Missing scores are labelled, never drawn as 0.
    await expect(method.metrics.getByText("Not reported", { exact: true })).toHaveCount(4);
  });
});
