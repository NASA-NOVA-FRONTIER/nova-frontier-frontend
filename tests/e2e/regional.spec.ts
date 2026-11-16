import type { Page, Route } from "@playwright/test";

import { expect, test } from "./fixtures";
import { runningView, succeededView } from "./pom/explorationMock";
import { GlobePage, LIVE_FRAME } from "./pom/GlobePage";

// The regional job the launch answers with; its own id keeps its polling off the main run's mock.
const REGIONAL_ID = "exp_regional_e2e";

// Counts the launches (POST …/analysis) and answers each with `answer`.
const mockAnalysis = async (page: Page, answer: (route: Route) => Promise<void>) => {
  const posts: string[] = [];
  await page.route("**/api/v1/explorations/*/analysis", (route) => {
    posts.push(route.request().method());
    return answer(route);
  });
  return posts;
};

test.describe("More information: regional analysis lives in the Technical view", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
    await globe.mockExplorations({ first: succeededView() });
  });

  test("Plain mounts nothing and asks nothing; Technical shows the chip and the note", async ({
    page,
  }) => {
    const posts = await mockAnalysis(page, (route) => route.fulfill({ status: 503, json: {} }));
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await globe.moreInfo.click();

    const regional = globe.sheet.getByRole("region", { name: "Regional analysis" });
    await expect(globe.sheet.getByTestId("read-plain")).toHaveAttribute("aria-pressed", "true");
    await expect(globe.sheet.getByTestId("sheet-technical")).toHaveCount(0);
    await expect(regional).toHaveCount(0);

    await globe.sheet.getByTestId("read-technical").click();
    await expect(regional).toBeVisible();
    await expect(regional.getByTestId("prov-experimental")).toHaveText("EXPERIMENTAL");
    await expect(regional).toContainText("Archive reads can take several minutes.");
    await expect(regional.getByRole("button", { name: "Run regional analysis" })).toBeVisible();
    expect(posts).toHaveLength(0);

    await regional.getByRole("button", { name: "Run regional analysis" }).click();
    await expect(regional.getByRole("alert")).toContainText("Analysis capacity is limited");
    await expect(regional.getByRole("button", { name: "Retry regional analysis" })).toBeVisible();
    expect(posts).toEqual(["POST"]);
  });

  test("a running job survives Plain and back, with exactly one launch", async ({ page }) => {
    const regionalView = runningView({ id: REGIONAL_ID });
    await page.route(`**/api/v1/explorations/${REGIONAL_ID}`, (route) =>
      route.fulfill({ json: regionalView }),
    );
    const posts = await mockAnalysis(page, (route) => route.fulfill({ json: regionalView }));
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await globe.moreInfo.click();
    await globe.sheet.getByTestId("read-technical").click();

    const regional = globe.sheet.getByRole("region", { name: "Regional analysis" });
    await regional.getByRole("button", { name: "Run regional analysis" }).click();
    const status = regional.getByText("Reading and analysing the regional sample…");
    await expect(status).toBeVisible();

    await globe.sheet.getByTestId("read-plain").click();
    const block = globe.sheet.getByTestId("sheet-technical");
    await expect(block).toBeHidden();
    await expect(block).toHaveAttribute("inert", "");
    await expect(regional).toHaveCount(0);

    await globe.sheet.getByTestId("read-technical").click();
    await expect(status).toBeVisible();
    await expect(regional.getByRole("button", { name: /regional analysis/ })).toHaveCount(0);
    expect(posts).toEqual(["POST"]);
  });
});
