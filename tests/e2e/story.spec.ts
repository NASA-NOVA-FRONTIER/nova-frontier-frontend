import { readFile } from "node:fs/promises";

import { expect, test } from "./fixtures";
import { GlobePage } from "./pom/GlobePage";

test.describe("Explorer: guided story", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.mockObservationPlan();
  });

  test("?story=1 opens chapter 1; Next and → advance; Esc exits to explore", async ({ page }) => {
    await globe.goto("?story=1");
    const story = page.getByTestId("story");
    await expect(story).toHaveAttribute("data-chapter", "1");
    await expect(page.getByTestId("story-count")).toHaveText(
      "Chapter 1 of 6 · Chenab flood, Pakistan",
    );
    await expect(page.getByTestId("story-caption")).toHaveAttribute("aria-live", "polite");
    await expect(page.getByTestId("mode-tour")).toHaveAttribute("aria-pressed", "true");
    // Chapter 1's impact facts are TO FILL slots, never invented numbers.
    await expect(page.getByTestId("story-card").getByTestId("prov-todo").first()).toBeVisible();

    await page.getByTestId("story-next").click();
    await expect(story).toHaveAttribute("data-chapter", "2");
    await page.keyboard.press("ArrowRight");
    await expect(story).toHaveAttribute("data-chapter", "3");
    await page.keyboard.press("ArrowLeft");
    await expect(story).toHaveAttribute("data-chapter", "2");

    await page.keyboard.press("Escape");
    await expect(story).toBeHidden();
    await expect(globe.startCard).toBeVisible();
    await expect(page.getByTestId("mode-explore")).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/\/explore$/);
  });

  test("chapter 5 keeps photos as slots and links real news; chapter 6 opens Qadirabad", async ({
    page,
  }) => {
    await globe.goto("?story=1");
    await page.getByTestId("story-segment-5").click();
    await expect(page.getByTestId("story-photo-slot")).toContainText("Credited photo goes here");
    const news = page.getByTestId("story-news");
    await expect(news).toHaveCount(3);
    for (const item of await news.all()) {
      await expect(item.getByRole("link")).toHaveAttribute("href", /^https:\/\//);
      await expect(item.getByRole("link")).toHaveAttribute("target", "_blank");
    }
    await expect(news.first()).toContainText("The Express Tribune · 23 Jul 2026");

    await page.getByTestId("story-segment-6").click();
    await expect(page.getByTestId("story-next")).toHaveText("Explore");
    await page.getByTestId("story-explore").click();
    await expect(page.getByTestId("story")).toBeHidden();
    await expect(globe.panelTitle).toHaveText("Qadirabad, Pakistan");
    await expect(page).toHaveURL(/\?case=qadirabad$/);
  });

  test("the start card and the Guided tour switch both start the story", async ({ page }) => {
    await globe.skipOnboarding();
    await globe.goto();
    await page.getByTestId("story-start").click();
    await expect(page.getByTestId("story")).toHaveAttribute("data-chapter", "1");
    await expect(page).toHaveURL(/\?story=1$/);
    await page.getByTestId("story-exit").click();
    await expect(page.getByTestId("story")).toBeHidden();

    await page.getByTestId("mode-tour").click();
    await expect(page.getByTestId("story")).toBeVisible();
    await page.getByTestId("mode-explore").click();
    await expect(page.getByTestId("story")).toBeHidden();
  });

  // Where the link goes is enough here: "?story=1 opens chapter 1" covers what it opens.
  test("the landing CTA opens the story", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("cta-story")).toHaveAttribute("href", "/explore?story=1");
  });
});

test.describe("Explorer: quick onboarding", () => {
  test("shows on the first visit only; Help replays it", async ({ page }) => {
    const globe = new GlobePage(page);
    await globe.mockObservationPlan();
    await globe.goto();
    const onboarding = page.getByTestId("onboarding");
    await expect(onboarding).toHaveAttribute("data-step", "1");
    await expect(page.getByTestId("onboarding-count")).toHaveText("1 / 4");
    await page.getByTestId("onboarding-next").click();
    await expect(onboarding).toHaveAttribute("data-step", "2");
    await page.keyboard.press("Escape");
    await expect(onboarding).toBeHidden();

    // Step 2 opened Qadirabad; a fresh plain visit must not show the tour again.
    await globe.goto();
    await expect(globe.startCard).toBeVisible();
    await expect(onboarding).toBeHidden();

    await globe.helpButton.click();
    await page.getByTestId("replay-tour").click();
    await expect(onboarding).toHaveAttribute("data-step", "1");
    await page.getByTestId("onboarding-skip").click();
    await expect(onboarding).toBeHidden();
  });
});

test.describe("Explorer: Nova and downloads", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.mockObservationPlan();
    await globe.skipOnboarding();
  });

  test("Nova is a labelled demo and answers impact questions with NO DATA", async ({ page }) => {
    await globe.goto("?case=qadirabad");
    await page.getByTestId("nova-bubble").click();
    const nova = page.getByTestId("nova");
    await expect(nova.getByTestId("nova-rule")).toHaveText(
      "Rule-based assistant · not an AI model yet",
    );
    await expect(nova.getByTestId("prov-demo")).toBeVisible();
    await nova.getByTestId("nova-input").fill("How many people were affected?");
    await nova.getByTestId("nova-send").click();
    await expect(nova.getByTestId("nova-nodata")).toContainText("No data");
    await expect(nova.getByTestId("nova-nodata")).toContainText("I don't have impact figures");

    await nova.getByTestId("nova-suggestion").filter({ hasText: "What does this mean?" }).click();
    await expect(nova.getByTestId("nova-answer").last()).toContainText(
      "Changed beyond its normal range",
    );
    await page.keyboard.press("Escape");
    await expect(nova).toBeHidden();
    await expect(globe.panel).toBeVisible();
  });

  test("the sheet's Ask Nova link opens Nova", async ({ page }) => {
    await globe.goto("?case=qadirabad");
    await globe.moreInfo.click();
    await page.getByTestId("ask-nova").click();
    await expect(page.getByTestId("nova")).toBeVisible();
  });

  test("the Download menu lists 4 items; timeline data needs a case", async ({ page }) => {
    await globe.goto();
    await page.getByTestId("download-button").click();
    const menu = page.getByTestId("download-menu");
    await expect(menu.getByRole("menuitem")).toHaveCount(4);
    await expect(menu.getByTestId("download-json")).toHaveAttribute("aria-disabled", "true");
    await expect(menu.getByTestId("download-csv")).toHaveAttribute("aria-disabled", "true");
    await expect(menu.getByTestId("download-csv")).toContainText("Open a case first");
    await expect(menu.getByTestId("download-pdf")).toHaveAttribute("aria-disabled", "true");
  });

  test("with a case open, the CSV says where it comes from and leaves demo rows empty", async ({
    page,
  }) => {
    await globe.goto("?case=qadirabad");
    await page.getByTestId("download-button").click();
    await expect(page.getByTestId("download-csv")).toContainText("Data · CSV");
    const downloading = page.waitForEvent("download");
    await page.getByTestId("download-csv").click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(
      /^nisar-hazard-watch_qadirabad_\d{4}-\d{2}-\d{2}\.csv$/,
    );
    const text = await readFile(await download.path(), "utf8");
    const lines = text.replace(/^﻿/, "").split("\r\n");
    expect(lines[0]).toMatch(/^# NISAR Hazard Watch: Qadirabad/);
    expect(lines).toContain("# Scientific status: diagnostic evidence, not a validated classifier");
    const at = lines.findIndex((line) => !line.startsWith("#"));
    expect(lines[at]).toBe(
      "date,role,hh_point_db,hv_point_db,hh_area_median_db,hv_area_median_db,cells_outside_band,cells_eligible,outside_band_pct,demo",
    );
    expect(lines[at + 1]).toMatch(/^\d{4}-\d{2}-\d{2},baseline,,,,,,,,true$/);
  });

  test("the PNG download carries the context strip", { tag: "@globe" }, async ({ page }) => {
    await globe.goto("?case=qadirabad");
    await page.getByTestId("download-button").click();
    const downloading = page.waitForEvent("download");
    await page.getByTestId("download-png").click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("nisar-qadirabad-view.png");
    const png = await readFile(await download.path());
    // PNG signature, and the image is taller than the viewport because of the strip.
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(20)).toBeGreaterThan(900);
  });
});

test.describe("Report page", () => {
  test("/report?case=qadirabad shows the real share and a labelled template summary", async ({
    page,
  }) => {
    await page.goto("/report?case=qadirabad");
    await expect(page.getByTestId("report-title")).toContainText("Qadirabad");
    await expect(page.getByTestId("report-stat")).toContainText("64.3%");
    await expect(page.locator("body")).toContainText(
      "Measured radar evidence: no cause, probability or area is inferred.",
    );
    await expect(page.locator("body")).not.toContainText("Left empty");
    await expect(page.getByTestId("report-summary")).toContainText(
      "Summary · written from the data above (template)",
    );
  });

  test("an unknown case lists the measured ones", async ({ page }) => {
    await page.goto("/report?case=nowhere");
    await expect(page.getByTestId("report-empty")).toContainText("No measured case");
  });
});
