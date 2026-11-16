import type { Page, Route } from "@playwright/test";

import { expect, test } from "./fixtures";
import { INSAR_PAIRS, insarView, runningView, succeededView } from "./pom/explorationMock";
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

test.describe("More information: Plain | Regional analysis", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.skipOnboarding();
    await globe.mockObservationPlan();
  });

  test("Plain asks nothing; Regional analysis launches once, across views and reopening", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    const regionalView = runningView({ id: REGIONAL_ID });
    await page.route(`**/api/v1/explorations/${REGIONAL_ID}`, (route) =>
      route.fulfill({ json: regionalView }),
    );
    const posts = await mockAnalysis(page, (route) => route.fulfill({ json: regionalView }));
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await globe.moreInfo.click();

    const regional = globe.sheet.getByRole("region", { name: "Regional analysis" });
    await expect(globe.sheet.getByTestId("read-plain")).toHaveAttribute("aria-pressed", "true");
    await expect(globe.sheet.getByTestId("read-regional")).toHaveText("Regional analysis");
    await expect(regional).toHaveCount(0);
    expect(posts).toHaveLength(0);

    await globe.sheet.getByTestId("read-regional").click();
    await expect(regional).toBeVisible();
    await expect(regional.getByTestId("prov-experimental")).toHaveText("EXPERIMENTAL");
    await expect(regional).toContainText("Archive reads can take several minutes.");
    const status = regional.getByText("Reading and analysing the regional sample…");
    await expect(status).toBeVisible();
    await expect(regional.getByRole("button")).toHaveCount(0);
    await expect(globe.sheet.getByTestId("sheet-plain")).toBeHidden();
    expect(posts).toEqual(["POST"]);

    await globe.sheet.getByTestId("read-plain").click();
    await expect(regional).toHaveCount(0);
    await expect(globe.sheet.getByTestId("sheet-plain")).toBeVisible();
    await globe.sheet.getByTestId("read-regional").click();
    await expect(status).toBeVisible();
    expect(posts).toEqual(["POST"]);

    await globe.sheet.getByTestId("sheet-close").click();
    await expect(globe.sheet).toBeHidden();
    await globe.moreInfo.click();
    await expect(globe.sheet.getByTestId("read-plain")).toHaveAttribute("aria-pressed", "true");
    await globe.sheet.getByTestId("read-regional").click();
    await expect(status).toBeVisible();
    expect(posts).toEqual(["POST"]);
  });

  test("a 503 shows Retry, and only Retry launches again", async ({ page }) => {
    await globe.mockExplorations({ first: succeededView() });
    const posts = await mockAnalysis(page, (route) => route.fulfill({ status: 503, json: {} }));
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await globe.moreInfo.click();
    await globe.sheet.getByTestId("read-regional").click();

    const regional = globe.sheet.getByRole("region", { name: "Regional analysis" });
    await expect(regional.getByRole("alert")).toContainText("Analysis capacity is limited");
    const retry = regional.getByRole("button", { name: "Retry regional analysis" });
    await expect(retry).toBeVisible();
    await globe.sheet.getByTestId("read-plain").click();
    await globe.sheet.getByTestId("read-regional").click();
    await expect(retry).toBeVisible();
    expect(posts).toEqual(["POST"]);

    await retry.click();
    await expect(regional.getByRole("alert")).toContainText("Analysis capacity is limited");
    expect(posts).toEqual(["POST", "POST"]);
  });

  test("a ground-motion answer has no toggle, only Plain", async () => {
    await globe.mockExplorations({ first: insarView() });
    await globe.mockInsarPairs();
    const pair = String(INSAR_PAIRS.pairs[0]?.["pairId"]);
    await globe.goto(`?frame=${LIVE_FRAME.id}&lens=insar&pair=${pair}`);
    await globe.moreInfo.click();
    await expect(globe.sheet.getByTestId("sheet-plain")).toBeVisible();
    await expect(globe.sheet.getByTestId("read-regional")).toHaveCount(0);
  });

  test("the technical detail closes the Plain reading; published files sit inside it", async ({
    page,
  }) => {
    await globe.mockExplorations({ first: succeededView() });
    const posts = await mockAnalysis(page, (route) => route.fulfill({ status: 503, json: {} }));
    await globe.goto(`?frame=${LIVE_FRAME.id}`);
    await globe.moreInfo.click();

    const detail = globe.sheet.getByTestId("sheet-technical-detail");
    await expect(detail).not.toHaveAttribute("open", "");
    await detail.getByText("Technical detail").click();
    await expect(detail).toHaveAttribute("open", "");
    await expect(detail.getByTestId("tech-limit")).toBeVisible();
    expect(posts).toHaveLength(0);
  });
});
