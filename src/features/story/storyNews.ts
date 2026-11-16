// Chapter 5 news (#29): articles on the July 2026 Chenab flood that name Qadirabad, each opened and
// checked on 15 Nov 2026. Only the headline and the link are used, never the article's text.
export type StoryNews = { headline: string; outlet: string; date: string; href: string };

export const STORY_NEWS: readonly StoryNews[] = [
  {
    headline: "High flood levels in River Chenab amid rainfall",
    outlet: "The Express Tribune",
    date: "23 Jul 2026",
    href: "https://tribune.com.pk/story/2619759/high-flood-levels-in-river-chenab-amid-rainfall",
  },
  {
    headline: "NDMA warns of critical 48 hours as Chenab River swells",
    outlet: "The Express Tribune",
    date: "25 Jul 2026",
    href: "https://tribune.com.pk/story/2620224/ndma-warns-of-critical-48-hours-as",
  },
  {
    headline: "Moderate-level flooding recorded in River Chenab",
    outlet: "Radio Pakistan",
    date: "25 Jul 2026",
    href: "https://radio.gov.pk/25-07-2026/moderate-level-flooding-recorded-in-river-chenab",
  },
];
