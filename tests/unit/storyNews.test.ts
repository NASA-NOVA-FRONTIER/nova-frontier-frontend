import { describe, expect, it } from "vitest";

import { STORY_NEWS } from "@/features/story/storyNews";

describe("story news", () => {
  // #29: chapter 5 lists real, linked articles, never placeholder rows.
  it("links three dated articles from named outlets", () => {
    expect(STORY_NEWS).toHaveLength(3);
    for (const news of STORY_NEWS) {
      expect(news.href, news.headline).toMatch(/^https:\/\//);
      expect(news.outlet, news.headline).not.toBe("");
      expect(news.date, news.headline).toMatch(/^\d{1,2} [A-Z][a-z]{2} 2026$/);
      expect(news.headline).not.toMatch(/^\[/);
    }
  });
});
