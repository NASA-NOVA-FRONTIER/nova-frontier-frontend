import { test as base } from "@playwright/test";

export { expect, type Locator, type Page } from "@playwright/test";

// Every test imports `test` from here, so no page ever reaches a backend for backend #2's daily
// limits: it answers 404 (the endpoint isn't deployed yet) and the quota line stays hidden.
// GlobePage.mockLimits overrides it; Playwright tries the latest route first.
export const test = base.extend({
  // The second argument is named `run`, not `use`, so the React hooks lint rule leaves it alone.
  page: async ({ page }, run) => {
    await page.route("**/api/v1/limits", (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/problem+json",
        body: JSON.stringify({ title: "Not found", reasonCode: "NOT_FOUND", detail: "no route" }),
      }),
    );
    await run(page);
  },
});
