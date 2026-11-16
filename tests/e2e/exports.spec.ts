import { readFile } from "node:fs/promises";

import { expect, test } from "./fixtures";
import { succeededView } from "./pom/explorationMock";
import { GlobePage } from "./pom/GlobePage";

// #37: the two exports for analysis. CSV is the data, PDF the printed report; both made in the browser.
const DATED = /_\d{4}-\d{2}-\d{2}$/;

test.describe("Exports: CSV and PDF", () => {
  test("a case with its own series downloads every pass with real values", async ({ page }) => {
    const globe = new GlobePage(page);
    await globe.mockObservationPlan();
    await globe.skipOnboarding();
    await globe.goto("?case=niscemi-aftermath");

    await page.getByTestId("download-button").click();
    const downloading = page.waitForEvent("download");
    await page.getByTestId("download-csv").click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(
      /^nisar-hazard-watch_niscemi-aftermath_\d{4}-\d{2}-\d{2}\.csv$/,
    );
    const text = await readFile(await download.path(), "utf8");
    expect(text.startsWith("﻿")).toBe(true);
    const lines = text.slice(1).trimEnd().split("\r\n");
    const rows = lines.filter((line) => /^\d{4}-\d{2}-\d{2},/.test(line));
    expect(rows).toHaveLength(8);
    expect(rows.every((line) => line.endsWith(",false"))).toBe(true);
    expect(rows.at(-1)).toMatch(/^2026-10-22,target,-9\.37,-15\.1,-9\.8,-19\.1,5349,16384,32\.6/);
    expect(lines).toContain(
      "# Mode: OFFLINE · measured ahead of time by the nova-frontier-model science backend",
    );
    expect(lines.filter((line) => line.startsWith("# Source: "))).toHaveLength(4);
  });

  test("the case report names its PDF, shows the measured images, the mode and the status", async ({
    page,
  }) => {
    await page.goto("/report?case=niscemi-aftermath");
    await expect(page.getByTestId("report-title")).toHaveText("Niscemi, Sicily, Italy");
    await expect(page).toHaveTitle(/^nisar-hazard-watch_niscemi-aftermath_\d{4}-\d{2}-\d{2}$/);
    const figures = page.getByTestId("report-figures");
    await expect(figures.locator("img")).toHaveCount(2);
    await expect(figures.locator("img").first()).toHaveAttribute(
      "src",
      "/cases/niscemi/change-HH.png",
    );
    await expect(figures).toContainText(
      "the 22 Oct 2026 pass minus the median of the four earlier passes",
    );
    await expect(page.locator(".r-facts")).toContainText("OFFLINE · measured ahead of time");
    await expect(page.locator(".r-facts")).toContainText(
      "Diagnostic evidence, not a validated classifier",
    );
    await expect(page.getByTestId("report-print")).toBeVisible();
  });

  test("the live report carries the images, the values by date and a retry when loading fails", async ({
    page,
  }) => {
    const view = succeededView();
    const id = String(view["id"]);
    let calls = 0;
    await page.route(`**/api/v1/explorations/${id}`, (route) => {
      calls += 1;
      return calls === 1
        ? route.fulfill({
            status: 503,
            contentType: "application/problem+json",
            body: '{"reasonCode":"QUEUE_FULL","detail":"busy"}',
          })
        : route.fulfill({ json: view });
    });
    await page.route("**/api/v1/explorations/*/layers/**", (route) =>
      route.fulfill({ status: 404, body: "" }),
    );

    await page.goto(`/report?exploration=${id}`);
    await expect(page.getByTestId("report-empty")).toContainText("We couldn't load this answer");
    await expect(page.getByTestId("report-print")).toHaveCount(0);
    await page.getByTestId("report-retry").click();

    await expect(page.getByTestId("report-title")).toBeVisible();
    await expect(page).toHaveTitle(DATED);
    const values = page.getByTestId("report-values");
    const observations = (view["result"] as { observations: unknown[] }).observations;
    await expect(values.locator("tbody tr")).toHaveCount(observations.length);
    await expect(values).toContainText("an empty cell is a masked channel");
    await expect(page.getByTestId("report-figures").locator("img").first()).toHaveAttribute(
      "src",
      new RegExp(`/api/v1/explorations/${id}/layers/`),
    );
    await expect(page.locator(".r-facts")).toContainText("Scientific status");
    await expect(page.getByTestId("report-print")).toBeVisible();
  });
});
