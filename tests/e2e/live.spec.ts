import { expect, test } from "./fixtures";
import {
  agricultureView,
  INSAR_PAIRS,
  insarView,
  noCoverageView,
  runningView,
  sanMarcosView,
  succeededView,
  wildfireView,
  withFireContext,
} from "./pom/explorationMock";
import { GlobePage, layerIdOf, LIVE_FRAME } from "./pom/GlobePage";

const FIRE_AVAILABLE = {
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
};

const CARD_ORDER = [
  "lens-head",
  "lens-slot-extra",
  "lens-pixel",
  "lens-why-two",
  // #22: the real answer has no optical snapshot, so the OPERA witness says UNAVAILABLE.
  "lens-slot-witness",
  "lens-surroundings",
  "more-info",
];

test.describe("Explorer: lens buttons and the lens result card", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("the flood card reads in the binding order, from the answer's own fields", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    const card = page.getByTestId("lens-card");
    await expect(card).toBeVisible();
    const order = await card
      .locator(":scope > [data-rv]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
    expect(order).toEqual(CARD_ORDER);
    await expect(page.getByTestId("lens-witness")).toHaveAttribute("data-state", "unavailable");
    await expect(page.getByTestId("lens-witness-text")).toHaveText(
      "No OPERA snapshot with enough clear cells within 4 days of the radar dates. The radar result stands on its own.",
    );
    // No ready optical comparison, so no driver can be weighed.
    await expect(page.getByTestId("lens-slot-drivers")).toHaveCount(0);

    await expect(card.getByTestId("lens-head")).toContainText("LENS · FLOOD & WETLAND");
    await expect(card.getByTestId("lens-head")).toContainText("Did water appear here?");
    await expect(globe.verdict).toContainText("Within its usual range");
    await expect(page.getByTestId("lens-headline")).toHaveText(
      "No new water at the exact spot you clicked. Around it, about a tenth of the area darkened the way calm new water does.",
    );
    await expect(page.getByTestId("lens-rule-count")).toHaveText("208,344 of 1,048,576 cells");
    await expect(page.getByTestId("lens-rule-caption")).toHaveText(
      "HH fell 3 dB or more and HV 1.5 dB or more on 11 Nov 2026, against each cell's own median of 4 earlier passes. Another 128,837 cells brightened. Cells meeting a rule, not flooded area.",
    );
    await expect(page.getByTestId("lens-rule-thumb")).toHaveCount(0);
    await expect(page.getByTestId("lens-rule-toggle")).toHaveCount(0);
    await expect(page.getByTestId("lens-delta-HH")).toContainText("−1.2 dB");
    await expect(page.getByTestId("lens-delta-HH")).toContainText("band ±3.0 dB · inside");
    await expect(page.getByTestId("lens-delta-HV")).toContainText("−0.8 dB");
    await expect(page.getByTestId("lens-delta-HV")).toContainText("band ±5.8 dB · inside");
    await expect(page.getByTestId("lens-surroundings")).toContainText(
      "The 60 m patch around your pixel did not darken more than matched cells 120–300 m away. 115 cells in the patch, compared with 115 matched cells out of 2,376 around it.",
    );
    await expect(page.getByTestId("lens-reasons")).toHaveCount(0);
    // Tabs above the card, 400 px panel.
    await expect(page.getByTestId("lens-tabs")).toBeVisible();
    expect((await globe.panel.boundingBox())?.width).toBe(400);
  });

  test("the agriculture card on the real Texas answer: the patch against its neighbours, no optical", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: agricultureView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}&lens=agriculture`);

    const card = page.getByTestId("lens-card");
    await expect(card).toHaveAttribute("data-lens", "agriculture");
    const order = await card
      .locator(":scope > [data-rv]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
    expect(order).toEqual([
      "lens-head",
      "lens-slot-extra",
      "lens-pixel",
      "lens-why-two",
      "more-info",
    ]);

    await expect(card.getByTestId("lens-head")).toContainText("LENS · AGRICULTURE");
    await expect(globe.verdict).toContainText("Within its usual range");
    await expect(page.getByTestId("lens-headline")).toHaveText(
      "No clear difference between this field and its neighbours on 28 Oct 2026.",
    );
    await expect(page.getByTestId("lens-rule")).toContainText("WHAT THIS LENS COMPARES");
    await expect(page.getByTestId("lens-neighbours-counts")).toHaveText(
      "112 cells in the patch, compared with 112 matched cells out of 2,379 around it.",
    );
    const contrasts = page.getByTestId("lens-contrast");
    await expect(contrasts).toHaveCount(3);
    await expect(contrasts.nth(0)).toContainText("+0.3 dB");
    await expect(contrasts.nth(0)).toContainText("No difference beyond ±1 dB");
    await expect(contrasts.nth(1)).toContainText("Too uncertain to say");
    await expect(contrasts.nth(2)).toContainText("HV − HH");
    await expect(page.getByTestId("lens-rule-caption")).toContainText(
      "Patch cells minus matched cells, 112 pairs · 95% spatial interval",
    );
    await expect(page.getByTestId("lens-rule-toggle")).toBeVisible();
    await expect(page.getByTestId("lens-why-two")).toContainText("Crops change through the season");

    // No optical witness for this lens, no drivers, no area, no demo.
    await expect(page.getByTestId("lens-slot-witness")).toHaveCount(0);
    await expect(page.getByTestId("lens-slot-drivers")).toHaveCount(0);
    await expect(card).not.toContainText(/hectare|probability|caused by/i);
    await expect(globe.panel.getByTestId("prov-demo")).toHaveCount(0);
  });

  test("Nova answers from the lens card's visible fields and names them", async ({ page }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(page.getByTestId("lens-card")).toBeVisible();

    await page.getByTestId("nova-bubble").click();
    const nova = page.getByTestId("nova");
    await expect(nova).toContainText("Did water appear here? · Within its usual range");
    await nova
      .getByTestId("nova-suggestion")
      .filter({ hasText: "What happened at my pixel?" })
      .click();
    const reply = nova.getByTestId("nova-answer").last();
    await expect(reply).toContainText("HH −1.2 dB (band ±3.0 dB · inside)");
    await expect(reply.getByTestId("nova-fields")).toHaveText(
      "On screen · AT THE PIXEL YOU CLICKED",
    );

    await nova.getByTestId("nova-input").fill("Were there fires?");
    await nova.getByTestId("nova-send").click();
    await expect(nova.getByTestId("nova-nodata").last()).toContainText("I can't say");
  });

  test("on a phone the 48 px Nova bubble sits above the result sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(page.getByTestId("lens-card")).toBeVisible();

    const bubble = page.getByTestId("nova-bubble");
    await expect(async () => {
      const box = await bubble.boundingBox();
      const sheet = await globe.panel.boundingBox();
      expect(box?.width).toBe(48);
      expect((box?.y ?? Infinity) + (box?.height ?? 0)).toBeLessThanOrEqual(sheet?.y ?? 0);
    }).toPass();
    await bubble.click();
    await expect(page.getByTestId("nova")).toBeVisible();
  });

  test("the OPERA witness reads a real ready answer, and only the flood lens asks for it", async ({
    page,
  }) => {
    const api = await globe.mockExplorations({
      answers: [
        sanMarcosView(),
        runningView({ lens: "agriculture" }),
        runningView({ lens: "vegetation_disturbance" }),
      ],
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    const witness = page.getByTestId("lens-witness");
    await expect(witness).toHaveAttribute("data-state", "ready");
    await expect(page.getByTestId("lens-witness-status")).toHaveText("READY · REAL");
    await expect(page.getByTestId("lens-witness-lead")).toHaveText(
      /^Optical images show no new open water between 24 Sep and 19 Oct; 12 of 221 cells that stayed dry meet the radar rule\.$/,
    );
    await expect(page.getByTestId("lens-witness-snapshots")).toHaveText(
      "Sentinel-2C 24 Sep 2026 → Sentinel-2A 19 Oct 2026",
    );
    const bars = witness.getByTestId("contrast-bars");
    // Every share shows its denominator (k / n).
    await expect(bars).toContainText("Stayed dry");
    await expect(bars).toContainText("12 / 221");
    await expect(bars).toContainText("Mixed or partial");
    await expect(bars).toContainText("0 / 17");
    await expect(bars).not.toContainText("New open water");
    await expect(witness.getByTestId("matched-whisker")).toHaveCount(0);
    await expect(page.getByTestId("lens-witness-point")).toHaveText(
      "At your pixel's optical cell: stayed dry.",
    );
    // 5.4 % of the stayed-dry cells meet the rule and no cell is water: no driver's rule fires.
    await expect(page.getByTestId("lens-slot-drivers")).toHaveCount(0);
    await expect(page.getByTestId("prov-demo")).toHaveCount(0);
    await expect(page.getByTestId("lens-card")).not.toContainText(/hectare|probability|caused by/i);

    await globe.lens("agriculture").click();
    await expect(page.getByTestId("lens-running")).toBeVisible();
    await globe.lens("vegetation_disturbance").click();
    await expect.poll(() => api.posts.length).toBe(3);
    expect(api.posts[0]).toMatchObject({ lens: "flood_wetland", opticalEvidence: true });
    expect(api.posts[1]).toMatchObject({ lens: "agriculture" });
    expect(api.posts[1]).not.toHaveProperty("opticalEvidence");
    expect(api.posts[2]).toMatchObject({ lens: "vegetation_disturbance" });
    expect(api.posts[2]).not.toHaveProperty("opticalEvidence");
  });

  test("a question link picks its lens exactly like its button", async ({ page }) => {
    const api = await globe.mockExplorations({
      answers: [runningView(), runningView({ lens: "vegetation_disturbance" })],
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await page.getByTestId("job-keep").click();

    await page.getByTestId("lens-ask-vegetation_disturbance").click();
    await expect(globe.lens("vegetation_disturbance")).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/lens=vegetation_disturbance/);
    const byLink = page.url();
    expect(api.posts.at(-1)).toMatchObject({ lens: "vegetation_disturbance" });

    await page.getByTestId("lens-ask-flood_wetland").click();
    const floodByLink = page.url();
    await page.getByTestId("lens-vegetation_disturbance").click();
    await expect(page).toHaveURL(byLink);
    expect(api.posts.at(-1)).toMatchObject({ lens: "vegetation_disturbance" });
    await page.getByTestId("lens-flood_wetland").click();
    await expect(page).toHaveURL(floodByLink);
  });

  test("a lens switch runs in the compact row; the modal is only for the area's first run", async ({
    page,
  }) => {
    const api = await globe.mockExplorations({
      answers: [
        withFireContext("wildfire", FIRE_AVAILABLE),
        runningView({ elapsedSeconds: 75, etaSeconds: 120 }),
      ],
      running: runningView({ elapsedSeconds: 75, etaSeconds: 120 }),
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}&lens=wildfire`);
    await expect(page.getByTestId("lens-card")).toBeVisible();
    // Wildfire's second witness (FIRMS) arrives through the witness slot.
    await expect(page.getByTestId("lens-slot-witness").getByTestId("fire-context")).toBeVisible();

    // Date.now stands still, so the row shows the server's elapsed time exactly.
    await page.clock.setFixedTime(new Date("2026-11-13T12:00:00Z"));
    await globe.lens("flood_wetland").click();

    const row = page.getByTestId("lens-running");
    await expect(row).toContainText("Running the Flood & wetland lens");
    await expect(page.getByTestId("lens-running-elapsed")).toHaveText("1:15 elapsed");
    await expect(globe.lens("flood_wetland")).toHaveAttribute("data-running", "true");
    await expect(globe.jobModal).toBeHidden();
    await expect(globe.jobProgress).toHaveCount(0);
    // The other lenses stay usable.
    await expect(globe.lens("agriculture")).toBeEnabled();

    await page.clock.resume();
    api.complete();
    await expect(page.getByTestId("lens-headline")).toContainText("No new water", {
      timeout: 15_000,
    });
    await expect(row).toBeHidden();
  });

  test("Cancel in the compact row stops the lens run", async ({ page }) => {
    const api = await globe.mockExplorations({
      answers: [succeededView(), runningView({ lens: "agriculture" })],
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(page.getByTestId("lens-card")).toBeVisible();
    await globe.lens("agriculture").click();
    await page.getByTestId("lens-running-cancel").click();
    await expect(globe.jobError).toContainText("Request cancelled");
    expect(api.cancelled).toBe(true);
  });

  test("ground motion stays a visible entry, marked as a measurement, and opens the pair picker", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.mockInsarPairs();
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.lens("insar")).toContainText("measured, not a verdict");
    await globe.lens("insar").click();
    await expect(page.getByTestId("pair-picker")).toBeVisible();
    await expect(globe.lens("insar")).toHaveAttribute("aria-pressed", "true");
  });

  test("a lens with no verdict lists its reasons in plain words, never the code", async ({
    page,
  }) => {
    const real = succeededView();
    const result = real["result"] as Record<string, unknown>;
    const lens = result["lens"] as Record<string, unknown>;
    await globe.mockExplorations({
      first: {
        ...real,
        result: {
          ...result,
          lens: { ...lens, status: "insufficient_data", reason: "pixel_masked", point: null },
        },
      },
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.verdict).toContainText("Not enough data");
    await expect(page.getByTestId("lens-reasons")).toContainText(
      "The clicked pixel has no usable value on at least one pass.",
    );
    await expect(page.getByTestId("lens-reasons")).not.toContainText("pixel_masked");
    await expect(page.getByTestId("lens-pixel")).toHaveCount(0);
  });
});

test.describe("Explorer: live exploration", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("a frame link asks the backend, and the answer is real: verdict, normal range, counts, no demo chip", async ({
    page,
  }) => {
    const api = await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.verdict).toHaveAttribute("data-verdict", "within");
    await expect(globe.verdict.getByTestId("prov-real")).toBeVisible();
    // The passes are NASA's Observation Plan, the answer is the backend's.
    await expect(globe.planPasses).toContainText("39 passes in the plan");
    await expect(globe.planPasses.getByTestId("prov-real")).toBeVisible();
    await expect(globe.normalRange).toContainText("−1.2 dB");
    await expect(globe.normalRange).toContainText("−0.8 dB");
    await expect(globe.panel.getByTestId("prov-demo")).toHaveCount(0);
    await expect(globe.panel.getByTestId("prov-demo-dates")).toHaveCount(0);
    await expect(globe.panelMeta).toContainText(`Live question · ${LIVE_FRAME.title}`);
    await expect(page).toHaveURL(new RegExp(`frame=${LIVE_FRAME.id}`));
    expect(api.posts).toEqual([
      {
        lens: "flood_wetland",
        geometry: { type: "Point", coordinates: expect.any(Array) },
        source: "L",
        // The flood lens asks for the OPERA second witness too.
        opticalEvidence: true,
      },
    ]);
  });

  test("while it runs, the v8 panel shows elapsed time, the steps and a sourced fact; the result replaces it", async ({
    page,
  }) => {
    const api = await globe.mockExplorations();
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.jobModal).toBeVisible();
    // While the job runs the footprint is a gold dash (processing); it turns solid with the answer.
    await globe.expectScene((scene) => expect(scene.outline?.processing).toBe(true));
    await expect(page.getByTestId("job-kicker")).toHaveText(/^LIVE ANALYSIS · /);
    await expect(globe.jobModal).toContainText("Reading NISAR passes for this spot");
    // Elapsed, never a countdown.
    await expect(globe.jobElapsed).toHaveText(/^\d+:\d{2}$/);
    await expect(globe.jobModal).not.toContainText(" left");
    await expect(page.getByTestId("job-band")).toHaveAttribute("data-estimated", "true");
    await expect(
      page.getByRole("progressbar", { name: "Elapsed time, 0 to 5 minutes" }),
    ).toBeVisible();
    await expect(page.getByTestId("job-stages")).toContainText("Searching the catalog");
    await expect(page.getByTestId("job-stages")).toContainText("Reading passes");
    await expect(page.getByTestId("fact-count")).toHaveText(/^DID YOU KNOW\? · 1 OF \d+$/);
    await expect(page.getByTestId("fact-title")).toHaveText("Radar sees through clouds");
    await expect(page.getByTestId("fact-text")).not.toBeEmpty();
    await expect(page.getByTestId("fact-source")).toHaveAttribute("href", /^https:\/\//);

    const before = await page.getByTestId("fact-text").textContent();
    await page.getByRole("button", { name: "Next fact" }).click();
    await expect(page.getByTestId("fact-text")).not.toHaveText(before ?? "");

    api.complete();
    await expect(globe.verdict).toBeVisible({ timeout: 15_000 });
    await expect(globe.jobModal).toBeHidden();
    await globe.expectScene((scene) => expect(scene.outline?.processing).toBe(false));
  });

  test("closing the modal keeps the job running; the answer still arrives; Esc closes it too", async ({
    page,
  }) => {
    const api = await globe.mockExplorations();
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(globe.jobModal).toBeVisible();

    await page.getByTestId("job-keep").click();
    await expect(globe.jobModal).toBeHidden();
    await expect(globe.jobProgress).toContainText("Asking the radar");
    await expect(globe.panel).toBeVisible();

    await page.getByTestId("job-details").click();
    await expect(globe.jobModal).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(globe.jobModal).toBeHidden();
    await expect(globe.panel).toBeVisible();

    api.complete();
    await expect(globe.verdict).toBeVisible({ timeout: 15_000 });
    await expect(globe.jobModal).toBeHidden();
  });

  test("past the estimate the modal says it is taking longer", async ({ page }) => {
    await globe.mockExplorations({
      running: runningView({ etaSeconds: 5, etaRemainingSeconds: 0, elapsedSeconds: 30 }),
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(page.getByTestId("job-late")).toBeVisible();
    await expect(page.getByTestId("job-bar")).toHaveAttribute("data-overdue", "true");
  });

  test("a full queue says so and Try again asks again", async ({ page }) => {
    const api = await globe.mockExplorations({
      startProblems: [
        { status: 503, reasonCode: "QUEUE_FULL", detail: "5 explorations are running" },
      ],
      first: succeededView(),
    });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.jobError).toContainText("Analyses are already in line");
    await globe.jobError.getByRole("button", { name: "Try again" }).click();
    await expect(globe.verdict).toBeVisible();
    expect(api.posts).toHaveLength(2);
    await expect(page.getByTestId("job-error")).toBeHidden();
  });

  test("a place with no NISAR coverage says so and offers measured cases, not a retry", async () => {
    await globe.mockExplorations({ first: noCoverageView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.jobError).toContainText("No NISAR passes cover this place");
    await expect(globe.jobError).toContainText("No scene covers the area.");
    await expect(globe.jobError.getByRole("button", { name: "Try again" })).toHaveCount(0);
    await globe.jobError.getByRole("button", { name: "Open a known case" }).click();
    await expect(globe.startCard).toBeVisible();
  });

  test("Cancel analysis asks the backend to stop and goes back to the spot (step 2)", async ({
    page,
  }) => {
    await globe.mockCoverage();
    const api = await globe.mockExplorations();
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(globe.jobModal).toBeVisible();

    await page.getByTestId("job-cancel").click();

    await expect(globe.placeCard).toBeVisible();
    await expect(globe.placeAnalyse).toBeVisible();
    await expect(globe.jobModal).toBeHidden();
    await expect(globe.panel).toBeHidden();
    await expect.poll(() => api.cancelled).toBe(true);
  });

  test("a failing Observation Plan never hides the exploration's answer", async ({ page }) => {
    // Routes registered later win, so this replaces the plan mock of beforeEach.
    await globe.mockObservationPlan({ status: 502, failures: 5 });
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.verdict).toBeVisible();
    await expect(page.getByTestId("plan-error")).toContainText(
      "We couldn't reach the radar archive",
    );
  });

  test(
    "the layers come from the answer: the pass's HH opens first, the other layers stay a click away",
    { tag: "@globe" },
    async ({ page }) => {
      await globe.mockExplorations({ first: succeededView() });
      await globe.goto(`?frame=${LIVE_FRAME.id}`);

      await expect(globe.liveLayerDock).toBeVisible();
      const hh = page.getByTestId("dock-row-hh");
      // #21 follow-up: the brightening flags no longer open first; the newest HH image does.
      await expect(hh).toHaveAttribute("aria-pressed", "true");
      const signature = page.getByTestId(
        "layer-option-display_flood_signature_flags_co_pol_brightening",
      );
      await expect(signature).toHaveAttribute("aria-pressed", "false");
      await expect(globe.liveLayerDock).toContainText("HH on 12 Sep 2026, fixed −30 to 0 dB gray.");
      await signature.click();
      await expect(signature).toHaveAttribute("aria-pressed", "true");
      await expect(hh).toHaveAttribute("aria-pressed", "false");
      await signature.click();
      await expect(signature).toHaveAttribute("aria-pressed", "false");
    },
  );

  test("the timeline shows the scenes the service read as real dates and the plan's future passes as planned", async () => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.timeline).toBeVisible();
    await expect(globe.timeline.getByTestId("prov-real-dates")).toBeVisible();
    await expect(globe.timeline.getByTestId("prov-demo")).toHaveCount(0);
    await expect(globe.timeline.getByTestId("prov-demo-dates")).toHaveCount(0);
    await expect(globe.timelinePasses("target")).toHaveCount(1);
    await expect(globe.timelinePasses("base")).toHaveCount(4);
    for (const planned of await globe.timelinePasses("plan").all())
      await expect(planned).toBeDisabled();
  });

  test("More information shows the real measurement, the stages the service timed and its limits", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await globe.moreInfo.click();

    await expect(globe.sheet).toContainText("What the radar measured at your point");
    await expect(globe.sheet.getByTestId("normal-range")).toBeVisible();
    // The whole-area share (any channel) and its bars live here, not in the lens card.
    await expect(globe.sheet).toContainText("32.9%");
    await expect(globe.sheet.getByTestId("contrast-bars")).toBeVisible();
    await expect(page.getByTestId("sheet-compute")).toContainText(
      "Measuring against the normal range",
    );
    await expect(globe.sheet).toContainText("not a validated classifier");
    await expect(globe.sheet).toContainText("Independent optical measurements are unavailable");
    await expect(globe.sheet.getByTestId("prov-demo")).toHaveCount(0);
    await expect(globe.sheet.getByTestId("prov-demo-dates")).toHaveCount(0);
  });

  for (const mobile of [false, true]) {
    test(`the measured sheet links views and preserves a rectangular image on ${mobile ? "mobile" : "desktop"}`, async ({
      page,
    }, testInfo) => {
      if (mobile) await page.setViewportSize({ width: 390, height: 844 });
      const base = succeededView();
      const result = base.result as Record<string, unknown>;
      const observations = result.observations as { date: string; status: string }[];
      const target = observations.at(-1)?.date;
      const grid = {
        epsg: 32643,
        bounds_native: [100000, 200000, 100240, 200160],
        width: 12,
        height: 8,
        pixel_spacing_m: [20, 20],
      };
      const bounds = [73.72, 32.31, 73.73, 32.32];
      const root = `/api/v1/explorations/${String(base.id)}`;
      const original = {
        id: `display_${target}_HH`,
        title: "HH radar return",
        kind: "observed",
        units: "dB",
        crs: "EPSG:4326",
        grid,
        bounds,
        legend: null,
        colormap: "gray",
        valueRange: [-30, 0],
        url: `${root}/layers/original`,
        dates: [target],
      };
      const signature = {
        ...original,
        id: "display_flood_signature_flags_dual_darkening",
        title: "Joint darkening",
        kind: "diagnostic",
        units: "diagnostic mask",
        colormap: "diagnostic_categories",
        legend: { "0": "absent", "1": "present" },
        valueRange: [0, 1],
        url: `${root}/layers/signature`,
      };
      await globe.mockExplorations({
        first: succeededView({
          result: {
            ...result,
            observations: observations.map((row, index) => ({
              ...row,
              grid,
              point_db: { HH: -12 - index, HV: -23 - index },
              valid_pixel_count_by_pol: { HH: 96, HV: 96 },
            })),
            layers: [original, signature],
            products: { visualizations: [], assets: [], previews: [] },
          },
        }),
      });
      await page.route("**/layers/signature", (route) =>
        route.fulfill({
          contentType: "image/png",
          // An SVG is unnecessary here: the mock uses a transparent rectangular PNG.
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAwAAAAICAYAAADN5B7xAAAADklEQVR4nGNgGAWDAQAAAYgAAfJhrFEAAAAASUVORK5CYII=",
            "base64",
          ),
        }),
      );
      await page.route("**/analysis", (route) => route.fulfill({ status: 503, json: {} }));
      await globe.goto(`?frame=${LIVE_FRAME.id}`);
      await globe.moreInfo.click();
      const split = globe.sheet.getByTestId("compare-split");
      await expect(split).toBeVisible();
      const box = await split.boundingBox();
      expect(box?.width).toBeGreaterThan(0);
      expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(1.5, 1);
      await split.focus();
      await split.press("ArrowRight");
      await expect(split).toHaveAttribute("aria-valuenow", "55");
      if (mobile && box) {
        const session = await page.context().newCDPSession(page);
        const visible = await split.boundingBox();
        const x = (visible?.x ?? box.x) + box.width * 0.25;
        const y = (visible?.y ?? box.y) + box.height * 0.5;
        await session.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x, y }],
        });
        await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await expect(split).toHaveAttribute("aria-valuenow", "25");
      }
      await expect(
        globe.sheet.getByText("Polarization trajectory", { exact: false }),
      ).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath("measured-sheet.png") });
      const heatmap = globe.sheet.getByRole("region", { name: "Date-by-channel heatmap" });
      await heatmap.getByRole("button").first().click();
      await expect(globe.sheet.getByRole("slider", { name: "Acquisition date" })).toHaveAttribute(
        "aria-valuetext",
        observations[0]?.date ?? "",
      );
      await expect(
        globe.sheet.getByText("No image is available for this acquisition."),
      ).toBeVisible();
      await globe.sheet.getByRole("button", { name: "Run regional analysis" }).click();
      await expect(globe.sheet.getByRole("alert")).toContainText("Analysis capacity is limited");
      await expect(
        globe.sheet.getByRole("button", { name: "Retry regional analysis" }),
      ).toBeVisible();
    });
  }

  // P0 copy pass: the explorer reads L-band only and says so, with no S button.
  test("the band control states L-band only", async ({ page }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto();

    await expect(page.getByTestId("source-L")).toHaveText("L-band, 24 cm.");
    await expect(page.getByTestId("source-S")).toHaveCount(0);
    await expect(page.getByTestId("source-switch")).not.toContainText("coming soon");
  });

  test("the downloads carry the real answer: JSON and one CSV row per scene", async ({ page }) => {
    await globe.mockExplorations({ first: succeededView() });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(globe.verdict).toBeVisible();

    await page.getByTestId("download-button").click();
    await expect(page.getByTestId("download-json")).toContainText("Result data · JSON");
    const json = page.waitForEvent("download");
    await page.getByTestId("download-json").click();
    expect((await json).suggestedFilename()).toMatch(/^nisar-exploration-exp_.*\.json$/);

    await page.getByTestId("download-button").click();
    const csv = page.waitForEvent("download");
    await page.getByTestId("download-csv").click();
    expect((await csv).suggestedFilename()).toMatch(/-passes\.csv$/);
  });

  test.describe("ground motion (InSAR pair)", () => {
    const NEWEST_PAIR = String(INSAR_PAIRS.pairs[0]?.["pairId"]);
    const SECOND_PAIR = String(INSAR_PAIRS.pairs[1]?.["pairId"]);

    test("the lens lists the pairs over the spot and asks nothing of the radar until one is chosen", async ({
      page,
    }) => {
      const api = await globe.mockExplorations({ first: succeededView() });
      await globe.mockInsarPairs();
      await globe.goto(`?frame=${LIVE_FRAME.id}`);
      await expect(globe.verdict).toBeVisible();
      api.posts.length = 0;

      await globe.lens("insar").click();

      await expect(globe.pairPicker).toBeVisible();
      await expect(page.locator('[data-testid^="pair-option-"]')).toHaveCount(
        INSAR_PAIRS.pairs.length,
      );
      await expect(page.getByTestId(`pair-option-${NEWEST_PAIR}`)).toBeChecked();
      await expect(globe.pairPicker).toContainText("20 Oct 2026");
      expect(globe.pairRequests).toHaveLength(1);
      expect(api.posts).toEqual([]);
    });

    test("measuring a pair sends it with the threshold; the answer is a measurement with no verdict and no displacement", async ({
      page,
    }) => {
      const api = await globe.mockExplorations({ first: insarView() });
      await globe.mockInsarPairs();
      await globe.goto(`?frame=${LIVE_FRAME.id}&lens=insar`);
      await globe.pairPicker.waitFor();

      await page.getByTestId(`pair-option-${SECOND_PAIR}`).check();
      await page.getByTestId("coherence-threshold").fill("0.5");
      await expect(page.getByTestId("coherence-value")).toHaveText("0.50");
      await globe.pairMeasure.click();

      await expect(globe.verdict).toHaveAttribute("data-verdict", "measured");
      await expect(globe.verdict).toContainText("Measured, not a verdict");
      await expect(globe.insarCard).toContainText("Median coherence");
      await expect(globe.insarCard).toContainText("0.43");
      await expect(globe.insarCard).toContainText("Wrapped phase at the point");
      await expect(page.getByTestId("insar-displacement")).toContainText("Not reported");
      await expect(page.getByTestId("panel-stat")).toContainText("63.3%");
      await expect(globe.panel.getByTestId("prov-demo")).toHaveCount(0);
      await expect(globe.panel.getByTestId("prov-demo-dates")).toHaveCount(0);
      await expect(globe.normalRange).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`pair=${SECOND_PAIR}`));
      await expect(page).toHaveURL(/coherence=0\.5/);
      expect(api.posts).toEqual([
        {
          lens: "insar",
          geometry: { type: "Point", coordinates: expect.any(Array) },
          source: "L",
          pairId: SECOND_PAIR,
          coherenceThreshold: 0.5,
        },
      ]);
    });

    test(
      "the globe offers the coherence and the wrapped phase, and the phase says its colours repeat",
      { tag: "@globe" },
      async ({ page }) => {
        await globe.mockExplorations({ first: insarView() });
        await globe.mockInsarPairs();
        await globe.goto(`?frame=${LIVE_FRAME.id}&lens=insar&pair=${NEWEST_PAIR}`);
        await expect(globe.verdict).toBeVisible();

        await expect(globe.liveLayerDock).toContainText("Interferometric coherence");
        await expect(globe.liveLayerDock).toContainText("Wrapped phase");
        await page.getByTestId("layer-option-display_wrapped_phase_rad_wrapped_phase_rad").click();

        await expect(page.getByTestId("phase-note")).toContainText("repeat every 2π");
        await expect(page.getByTestId("layer-scale")).toHaveText("−π to +π rad");
      },
    );

    test("a shared link with the pair measures straight away, without the picker", async () => {
      const api = await globe.mockExplorations({ first: insarView() });
      await globe.mockInsarPairs();
      await globe.goto(`?frame=${LIVE_FRAME.id}&lens=insar&pair=${NEWEST_PAIR}&coherence=0.6`);

      await expect(globe.verdict).toHaveAttribute("data-verdict", "measured");
      await expect(globe.pairPicker).toHaveCount(0);
      expect(globe.pairRequests).toEqual([]);
      expect(api.posts).toEqual([
        expect.objectContaining({ lens: "insar", pairId: NEWEST_PAIR, coherenceThreshold: 0.6 }),
      ]);
    });

    test("a spot with no pair says so and keeps the way back; a catalog outage can be retried", async ({
      page,
    }) => {
      await globe.mockExplorations({ first: succeededView() });
      await globe.mockInsarPairs({ failures: 1 });
      await globe.goto(`?frame=${LIVE_FRAME.id}&lens=insar`);

      await expect(globe.jobError).toContainText("We couldn't reach the radar archive");
      await page.getByRole("button", { name: "Run it again" }).click();
      await expect(globe.pairPicker).toBeVisible();
    });

    test("no pair over the spot is explained, not left blank", async ({ page }) => {
      await globe.mockExplorations({ first: succeededView() });
      await globe.mockInsarPairs({ empty: true });
      await globe.goto(`?frame=${LIVE_FRAME.id}&lens=insar`);

      await expect(page.getByTestId("pairs-empty")).toContainText("No NISAR pair covers this spot");
      await expect(globe.pairPicker).toHaveCount(0);
    });
  });

  test.describe("wildfire card", () => {
    test("the real Seattle answer: headline, HV rule rows, pixel line and FIRMS as the second witness", async ({
      page,
    }) => {
      await globe.mockExplorations({ first: wildfireView() });
      await globe.goto(`?frame=${LIVE_FRAME.id}&lens=wildfire`);

      const card = page.getByTestId("lens-card");
      await expect(card).toHaveAttribute("data-lens", "wildfire");
      const order = await card
        .locator(":scope > [data-rv]")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-testid")));
      expect(order).toEqual([
        "lens-head",
        "lens-slot-extra",
        "lens-pixel",
        "lens-why-two",
        "lens-slot-witness",
        "more-info",
      ]);
      await expect(card.getByTestId("lens-head")).toContainText("LENS · WILDFIRE");
      await expect(page.getByTestId("lens-headline")).toHaveText(
        "This lens needs at least two passes after the baseline. This spot has one.",
      );
      await expect(page.getByTestId("lens-rule")).toContainText("WHAT THIS LENS COMPARES");
      await expect(page.getByTestId("lens-rule-count")).toHaveText("96,043 of 1,048,312 cells");
      await expect(page.getByTestId("lens-rule-row")).toContainText(
        "with HV below its band on 24 Oct 2026",
      );
      await expect(page.getByTestId("lens-rule-caption")).toContainText(
        "At your pixel: HV below its band on 0 of 1 pass after the baseline.",
      );
      await expect(page.getByTestId("lens-rule-toggle")).toBeVisible();
      await expect(page.getByTestId("lens-why-two")).toContainText("Burning removes the canopy");

      const witness = page.getByTestId("lens-witness");
      await expect(witness).toContainText("SECOND WITNESS · NASA FIRMS");
      await expect(page.getByTestId("lens-witness-status")).toHaveText("READY · REAL");
      await expect(witness).toContainText("No active-fire detections between the two passes");
      await expect(witness).toContainText("does not rule a fire out");

      // FIRMS never feeds the verdict; no burned area, hectares or cause anywhere on the card.
      // "burned area" only appears negated, like flood's "not flooded area".
      await expect(card).not.toContainText(/hectare|(?<!not )burned area|caused by|probability/i);
      await expect(page.getByTestId("lens-slot-drivers")).toHaveCount(0);
      await expect(globe.panel.getByTestId("prov-demo")).toHaveCount(0);
    });

    test("an available context sits apart from the radar verdict, with its dates and the FIRMS source", async ({
      page,
    }) => {
      await globe.mockExplorations({ first: withFireContext("wildfire", FIRE_AVAILABLE) });
      await globe.goto(`?frame=${LIVE_FRAME.id}&lens=wildfire`);

      await expect(globe.verdict).toHaveAttribute("data-verdict", "within");
      const fire = globe.panel.getByTestId("fire-context");
      await expect(page.getByTestId("lens-witness")).toContainText("SECOND WITNESS · NASA FIRMS");
      await expect(fire).toContainText("3 active-fire detections between the two passes");
      await expect(fire).toContainText("2 Nov 2026");
      await expect(fire).toContainText("9.5 MW");
      await expect(fire).toContainText("separate from the radar");
      await expect(page.getByTestId("lens-witness").getByTestId("prov-real")).toBeVisible();
      await expect(globe.panel.getByTestId("prov-demo")).toHaveCount(0);
      await expect(globe.panel.getByTestId("prov-demo-dates")).toHaveCount(0);

      await globe.moreInfo.click();
      await expect(page.getByRole("link", { name: /FIRMS active fire data/ })).toBeVisible();
    });

    test("without a FIRMS key the panel says the answer is radar-only and shows no numbers", async () => {
      await globe.mockExplorations({
        first: withFireContext("wildfire", {
          ...FIRE_AVAILABLE,
          status: "notConfigured",
          detections: null,
          lowConfidenceExcluded: null,
          firstDetection: null,
          lastDetection: null,
          peakFrpMw: null,
          satellites: [],
          products: [],
          note: "Fire context is not configured on this server, so the verdict is radar-only.",
        }),
      });
      await globe.goto(`?frame=${LIVE_FRAME.id}&lens=wildfire`);

      const fire = globe.panel.getByTestId("fire-context");
      await expect(fire).toHaveAttribute("data-status", "notConfigured");
      await expect(fire).toContainText("Fire context not configured");
      await expect(fire).toContainText("radar-only");
      await expect(globe.panel.getByTestId("lens-witness-status")).toHaveText("UNAVAILABLE");
      await expect(globe.panel.getByTestId("lens-witness").getByTestId("prov-real")).toHaveCount(0);
      await expect(globe.verdict).toHaveAttribute("data-verdict", "within");
    });

    test("other lenses show no fire context", async () => {
      await globe.mockExplorations({ first: succeededView() });
      await globe.goto(`?frame=${LIVE_FRAME.id}`);

      await expect(globe.verdict).toBeVisible();
      await expect(globe.panel.getByTestId("fire-context")).toHaveCount(0);
    });
  });
});

test.describe("Report: live answer", () => {
  test("/report?exploration=<id> prints the backend's answer with its data blocks and no demo chip", async ({
    page,
  }) => {
    const globe = new GlobePage(page);
    await globe.mockExplorations({ first: succeededView() });
    await page.goto("/report?exploration=exp_761b80c9a2d74538");

    await expect(page.getByTestId("report-title")).toContainText("32.33° N");
    await expect(page.getByTestId("report-summary")).toContainText("Not AI-written");
    await expect(page.getByTestId("normal-range")).toContainText("−1.2 dB");
    await expect(page.getByTestId("report-stat")).toContainText("32.9%");
    await expect(page.getByTestId("report-scenes").getByRole("listitem")).toHaveCount(5);
    await expect(page.getByTestId("prov-demo")).toHaveCount(0);
    await expect(page.getByTestId("prov-demo-dates")).toHaveCount(0);
  });

  test("a wildfire report adds the fire context as its own block, apart from the radar data", async ({
    page,
  }) => {
    const globe = new GlobePage(page);
    const answer = withFireContext("wildfire", FIRE_AVAILABLE);
    await globe.mockExplorations({ first: answer, final: answer });
    await page.goto("/report?exploration=exp_761b80c9a2d74538");

    const fire = page.getByTestId("fire-context");
    await expect(fire).toContainText("3 active-fire detections between the two passes");
    await expect(page.getByTestId("report")).toContainText("Independent fire context");
    await expect(page.getByTestId("report-summary")).toContainText("separate from the radar");
  });

  test("a ground-motion report shows what the pair measured and never calls it a verdict", async ({
    page,
  }) => {
    const globe = new GlobePage(page);
    const answer = insarView();
    await globe.mockExplorations({ first: answer, final: answer });
    await page.goto("/report?exploration=exp_0bb9bf27928a4959");

    await expect(page.getByTestId("insar-card")).toContainText("Median coherence");
    await expect(page.getByTestId("insar-displacement")).toContainText("Not reported");
    await expect(page.getByTestId("report-summary")).toContainText("No displacement is reported");
    await expect(page.getByTestId("report-summary")).not.toContainText("Verdict:");
    await expect(page.getByTestId("report")).toContainText("Measured, not a verdict");
    await expect(page.getByTestId("prov-demo")).toHaveCount(0);
    await expect(page.getByTestId("prov-demo-dates")).toHaveCount(0);
  });

  test("an answer that does not exist says so and keeps the way back", async ({ page }) => {
    await page.route(/\/api\/v1\/explorations\/[^/]+$/, (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/problem+json",
        body: JSON.stringify({
          title: "Not found",
          detail: "no such exploration",
          reasonCode: "NOT_FOUND",
        }),
      }),
    );
    await page.goto("/report?exploration=exp_missing");

    await expect(page.getByTestId("report-empty")).toContainText(
      "No finished answer called “exp_missing”",
    );
    await expect(page.getByRole("link", { name: "Back to the explorer" })).toBeVisible();
  });
});

test.describe("Explorer: raw passes, layer dock and the time-lapse (#20)", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
    await globe.mockExplorations({ first: succeededView() });
  });

  test("the timeline reads the selected pass; a click or an arrow key moves it, with no compare mode", async ({
    page,
  }) => {
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(globe.timelineReadout).toHaveText("Pass 3 of 5 · 12 Sep 2026");
    // The globe drapes the selected pass's own HH image.
    await globe.expectScene((scene) =>
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_2026-09-12_HH"),
    );
    await expect(globe.timelineCompare).toHaveCount(0);
    await expect(globe.timeline).toContainText("BASELINE · 4 PASSES");
    const first = globe.timelinePasses("base").first();
    await first.click();
    await expect(globe.timelineReadout).toHaveText("Pass 1 of 5 · 14 Jul 2026");
    await globe.expectScene((scene) =>
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_2026-07-14_HH"),
    );
    await page.keyboard.press("ArrowRight");
    await expect(globe.timelineReadout).toHaveText("Pass 2 of 5 · 19 Aug 2026");
    await globe.timelinePasses("target").click();
    await expect(globe.timelineReadout).toHaveText("Pass 5 of 5 · 11 Nov 2026");
  });

  test("the dock follows the pass: a missing image is disabled and an empty tile, never another date", async ({
    page,
  }) => {
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await expect(page.getByTestId("raw-kicker")).toHaveText(
      "RAW RADAR · 12 SEP 2026 · PASS 3 OF 5",
    );
    await expect(page.getByTestId("raw-thumbs").getByTestId("prov-real-dates")).toBeVisible();
    await expect(page.getByTestId("dock-row-hh")).toBeEnabled();
    await expect(page.getByTestId("dock-row-hv")).toBeDisabled();
    await expect(page.getByTestId("dock-row-hv")).toContainText("No HV image for this pass");
    await expect(page.getByTestId("raw-empty-hv")).toHaveText("No image");
    await expect(page.getByTestId("dock-row-change")).toBeDisabled();
    await expect(page.getByTestId("dock-row-rule")).toBeDisabled();
    await expect(page.getByTestId("dock-row-coherence")).toContainText("NO PAIR");
    await expect(page.getByTestId("dock-row-landCover")).toBeDisabled();
    await expect(page.getByTestId("dock-row-landCover").getByTestId("prov-todo")).toBeVisible();

    await globe.timelinePasses("base").nth(3).click();
    await expect(page.getByTestId("dock-row-hh")).toBeDisabled();
    await expect(page.getByTestId("dock-row-hv")).toBeDisabled();
    await expect(page.getByTestId("raw-empty-hh")).toBeVisible();
    await expect(globe.liveLayerDock.getByTestId("prov-demo")).toHaveCount(0);
    await expect(globe.liveLayerDock.getByTestId("prov-demo-dates")).toHaveCount(0);
  });

  test("the Coherence row with no pair opens the ground-motion pair picker", async ({ page }) => {
    await globe.mockInsarPairs();
    await globe.goto(`?frame=${LIVE_FRAME.id}`);

    await page.getByTestId("dock-row-coherence").click();
    await expect(page).toHaveURL(/lens=insar/);
  });

  test("a manual pass pick stops the player and keeps that pass", async () => {
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await globe.timelinePlay.click();
    await expect(globe.timelinePlay).toHaveAttribute("aria-label", "Pause");
    await globe.timelinePasses("base").nth(1).click();
    await expect(globe.timelinePlay).toHaveAttribute("aria-label", "Play");
    await expect(globe.timelineReadout).toHaveText("Pass 2 of 5 · 19 Aug 2026");
    // Stopped on the picked pass: it stays draped and the stamp names it.
    await globe.expectScene((scene) => {
      expect(scene.stamp?.date).toBe("19 AUG 2026");
      expect(layerIdOf(scene.drape?.url ?? "")).toBe("display_2026-08-19_HH");
    });
  });

  test(
    "under reduced motion the globe swaps layers with no crossfade",
    { tag: "@globe" },
    async ({ page }) => {
      await globe.goto(`?frame=${LIVE_FRAME.id}`);
      await expect(page.getByTestId("dock-row-hh")).toHaveAttribute("aria-pressed", "true");

      await globe.timelinePasses("base").first().click();
      await page.getByTestId("dock-row-hv").click();
      await expect(page.getByTestId("dock-row-hv")).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("globe")).not.toHaveAttribute("data-crossfade", "on");
    },
  );

  test("on a phone the strip keeps previous, play and next, without speed or loop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await expect(globe.verdict).toBeVisible();
    await expect(page.getByTestId("timeline-play")).toBeVisible();
    await expect(page.getByTestId("timeline-prev")).toBeVisible();
    await expect(page.getByTestId("timeline-step-next")).toBeVisible();
    await expect(page.getByTestId("timeline-speed")).toBeHidden();
    await expect(page.getByTestId("timeline-loop")).toBeHidden();
  });
});
