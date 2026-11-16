import { expect, test } from "@playwright/test";

import { GlobePage } from "./pom/GlobePage";

// #24: Niscemi, the measured landslide case. Its numbers are REAL, its landslide reading EXPERIMENTAL.
test.describe("Explorer: the landslide case", () => {
  let globe: GlobePage;

  test.beforeEach(async () => {
    test.slow();
  });

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.mockObservationPlan();
  });

  test("the panel says what was measured, that it is aftermath only, and draws real dates", async ({
    page,
  }) => {
    await globe.goto("?case=niscemi-aftermath");
    await expect(globe.panelTitle).toHaveText("Niscemi, Italy");
    await expect(globe.panelMeta).toContainText("Measured case · Landslide · 25 Jan 2026");
    await expect(globe.verdict).toHaveAttribute("data-verdict", "measured");
    await expect(globe.verdict).toContainText("all after the 25 Jan landslide");
    await expect(globe.panelStat).toContainText("+2.17 dB");
    await expect(
      page.getByTestId("landslide-reading").getByTestId("prov-experimental"),
    ).toBeVisible();
    // No live lens is pressed: the case's question isn't one of them.
    await expect(globe.lens("flood_wetland")).toHaveAttribute("aria-pressed", "false");
    await expect(globe.timeline.getByTestId("prov-real-dates")).toBeVisible();
    await expect(globe.timeline.getByTestId("prov-demo-dates")).toHaveCount(0);
    await expect(globe.panel.getByTestId("prov-demo")).toHaveCount(0);
    await expect(page.getByTestId("layer-dock")).toContainText("Model's published layer");
  });

  test("More information shows every pass, the out-of-band share and the shift, from the series", async ({
    page,
  }) => {
    await globe.goto("?case=niscemi-aftermath");
    await globe.moreInfo.click();
    const panel = page.getByTestId("landslide-panel");
    await expect(panel.getByTestId("landslide-aftermath")).toContainText(
      "the first is on 24 Jun 2026, 150 days later",
    );
    await expect(
      panel.getByTestId("landslide-aftermath").getByTestId("prov-experimental"),
    ).toBeVisible();

    // The pass slider and the before/after compare start on the target pass.
    const slider = panel.getByTestId("landslide-date");
    await expect(slider).toHaveAttribute("aria-valuetext", "22 Oct 2026, assessment");
    await expect(panel.getByTestId("compare-split")).toBeVisible();

    // A bar picks its pass; the image follows it.
    await panel.getByTestId("landslide-outside-2026-09-16").click();
    await expect(panel.getByTestId("landslide-outside-2026-09-16")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(panel.getByTestId("landslide-outside-2026-09-16")).toContainText(
      "46.2% 7,564 of 16,384 cells",
    );
    await expect(slider).toHaveAttribute("aria-valuetext", "16 Sep 2026, assessment");
    await slider.focus();
    await page.keyboard.press("Home");
    await expect(slider).toHaveAttribute("aria-valuetext", "24 Jun 2026, baseline");

    // The change view has a channel switch; a colour composite has none.
    await panel.getByTestId("landslide-view-change").click();
    await panel.getByTestId("landslide-channel-HV").click();
    await expect(panel.getByTestId("landslide-image")).toHaveAttribute(
      "src",
      "/cases/niscemi/change-HV.png",
    );
    await panel.getByTestId("landslide-view-three-dates").click();
    await expect(panel.getByTestId("landslide-channel-HH")).toBeDisabled();

    await expect(panel.getByTestId("landslide-shift-HH")).toContainText("+2.17 dB");
    await expect(panel.getByTestId("landslide-shift-HV")).toContainText("Marker pixel: +1.36 dB");
    await expect(panel.getByTestId("landslide-history")).toBeVisible();

    // No toggle on a case: the values by pass wait, closed, in the technical detail at the end.
    await expect(globe.sheet.getByTestId("read-regional")).toHaveCount(0);
    const detail = globe.sheet.getByTestId("sheet-technical-detail");
    await expect(detail).not.toHaveAttribute("open", "");
    await expect(page.getByTestId("landslide-table")).toBeHidden();
    await detail.getByText("Technical detail").click();
    await expect(detail.getByTestId("landslide-table")).toBeVisible();
    await expect(detail.getByTestId("landslide-table")).toContainText("2026-06-24");
    await expect(panel.getByTestId("landslide-how")).toContainText("1.4826 × MAD");
    // A measured case has no verdict cards and no generic job steps.
    await expect(page.getByTestId("sheet-verdict-departure")).toHaveCount(0);
    await expect(globe.sheet).toContainText("Terrain shadow or layover");
  });

  test("fits a phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await globe.goto("?case=niscemi-aftermath");
    await globe.moreInfo.click();
    await expect(page.getByTestId("landslide-panel")).toBeVisible();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBe(390);
  });

  test("the search finds it as an instant case and the report prints its series", async ({
    page,
  }) => {
    await globe.goto();
    await globe.searchInput.click();
    await globe.searchInput.fill("Niscemi");
    await globe.mockPlaces({ mock: "places-open-ocean" });
    await globe.searchInput.press("Enter");
    await expect(globe.searchMenu.getByRole("option", { name: /Niscemi, Italy/ })).toBeVisible();

    await page.goto("/report?case=niscemi-aftermath");
    const table = page.getByTestId("report-landslide");
    await expect(table).toContainText("2026-10-22");
    await expect(table).toContainText("32.6%");
    await expect(page.getByTestId("prov-experimental").first()).toBeVisible();
    await expect(page.getByTestId("report-title")).toHaveText("Niscemi, Sicily, Italy");
  });
});
