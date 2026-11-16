import { expect, test, type Page } from "@playwright/test";

import { GlobePage } from "./pom/GlobePage";

// #31: Nova answers with Claude through the backend, and with its rules whenever Claude doesn't.
const ASSISTANT = "**/api/v1/assistant";

const sse = (...blocks: [string, unknown][]): string =>
  blocks.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");

const mockAssistant = async (page: Page, answer: string): Promise<unknown[]> => {
  const asked: unknown[] = [];
  await page.route(ASSISTANT, (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: { available: true, model: "claude-opus-5-5" } });
    asked.push(route.request().postDataJSON());
    return route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
      body: answer,
    });
  });
  return asked;
};

test.describe("Nova with Claude", () => {
  let globe: GlobePage;

  test.beforeEach(async ({ page }) => {
    globe = new GlobePage(page);
    await globe.mockObservationPlan();
    await globe.skipOnboarding();
  });

  test("labels Claude's answers, streams them from the result on screen and cites the case", async ({
    page,
  }) => {
    const asked = await mockAssistant(
      page,
      sse(
        ["delta", { text: "Both radar channels darkened on 26 Jul 2026, " }],
        ["delta", { text: "against 3 earlier passes. Existing water darkened too." }],
        ["done", { stopReason: "end_turn", model: "claude-opus-5-5" }],
      ),
    );
    await globe.goto("?case=qadirabad");
    await page.getByTestId("nova-bubble").click();
    const nova = page.getByTestId("nova");
    await expect(nova.getByTestId("nova-rule")).toHaveAttribute("data-engine", "claude");
    await expect(nova.getByTestId("nova-rule")).toContainText("Answers by Claude");
    await expect(nova.getByTestId("prov-experimental")).toBeVisible();
    await expect(nova.getByTestId("prov-demo")).toHaveCount(0);

    await nova.getByTestId("nova-input").fill("What does this mean?");
    await nova.getByTestId("nova-send").click();
    const answer = nova.getByTestId("nova-ai-answer");
    await expect(answer).toHaveAttribute("data-done", "true");
    await expect(answer).toContainText(
      "Both radar channels darkened on 26 Jul 2026, against 3 earlier passes.",
    );
    await expect(answer.getByTestId("nova-ai-by")).toHaveText(
      "Written by Claude from the result on screen",
    );
    await expect(answer.locator("a").first()).toHaveAttribute("href", /^https:\/\//);

    // The backend gets the question and the screen as data: case, question, limits, sources.
    expect(asked[0]).toMatchObject({
      message: "What does this mean?",
      history: [],
      context: {
        kind: "case",
        title: "Qadirabad, Chenab River, Pakistan",
        question: "Did it flood?",
      },
    });

    // Impact questions stay No data from the rules and never reach the model.
    await nova.getByTestId("nova-input").fill("How many people were affected?");
    await nova.getByTestId("nova-send").click();
    await expect(nova.getByTestId("nova-nodata")).toContainText("I don't have impact figures");
    expect(asked).toHaveLength(1);
  });

  test("a declined answer is replaced by the rule-based one, and says so", async ({ page }) => {
    await mockAssistant(
      page,
      sse(["delta", { text: "Partial" }], ["error", { reasonCode: "ASSISTANT_DECLINED" }]),
    );
    await globe.goto("?case=qadirabad");
    await page.getByTestId("nova-bubble").click();
    const nova = page.getByTestId("nova");
    await expect(nova.getByTestId("nova-rule")).toHaveAttribute("data-engine", "claude");
    await nova.getByTestId("nova-suggestion").filter({ hasText: "What does this mean?" }).click();
    const reply = nova.getByTestId("nova-answer").last();
    await expect(reply).toContainText("Changed beyond its normal range");
    await expect(reply.getByTestId("nova-fallback")).toBeVisible();
    await expect(nova).not.toContainText("Partial");
  });

  test("without a key the chat stays the labelled rule-based demo", async ({ page }) => {
    await page.route(ASSISTANT, (route) =>
      route.fulfill({ json: { available: false, model: null } }),
    );
    await globe.goto("?case=qadirabad");
    await page.getByTestId("nova-bubble").click();
    const nova = page.getByTestId("nova");
    await expect(nova.getByTestId("nova-rule")).toHaveText(
      "Rule-based assistant · not an AI model yet",
    );
    await expect(nova.getByTestId("prov-demo")).toBeVisible();
    await nova.getByTestId("nova-suggestion").filter({ hasText: "What does this mean?" }).click();
    await expect(nova.getByTestId("nova-answer").last()).toContainText(
      "Changed beyond its normal range",
    );
  });
});
