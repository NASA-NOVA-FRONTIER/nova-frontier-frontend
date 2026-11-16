import { describe, expect, it } from "vitest";

import { initI18n } from "@/i18n/i18n";
import { i18next, tr } from "@/i18n/translate";

// A file of its own: it needs an i18next that nothing has initialised yet, as on the first page load.
describe("starting in another language", () => {
  it("loads the catalog before the first render when the link or the browser asks for it", async () => {
    await initI18n("ja");

    expect(i18next.language).toBe("ja");
    expect(tr("Open the explorer")).not.toBe("Open the explorer");
  });
});
