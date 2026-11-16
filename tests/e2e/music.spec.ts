import { MUSIC_HINT_KEY, MUSIC_WANTED_KEY } from "@/features/music/musicPreference";
import { expect, test, type Locator, type Page } from "./fixtures";
import { GlobePage } from "./pom/GlobePage";

declare global {
  // Global augmentation only works with an interface.
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Window {
    __audioContexts: AudioContext[];
  }
}

// Decoding and starting a track takes a moment on a cold build.
const AUDIO_START = { timeout: 20_000 };
// A cold build loads the landing's 3D Earth slowly; wait for the page, not for the clock.
const PAGE_READY = { timeout: 30_000 };
// The site bar's side gutter at each width: 16 px as designed, 12 px on 320 px phones (site.css).
const PHONES = [
  { width: 390, gutter: 16 },
  { width: 320, gutter: 12 },
];
const PHONE_HEIGHT = 844;

// Wraps AudioContext to record every one the page makes, and its state, without playing aloud.
const watchAudio = async (page: Page): Promise<string[]> => {
  const downloads: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes(".mp3")) downloads.push(request.url());
  });
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    window.__audioContexts = contexts;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor(options?: AudioContextOptions) {
        super(options);
        contexts.push(this);
      }
    };
  });
  return downloads;
};

const contextStates = (page: Page): Promise<string[]> =>
  page.evaluate(() => window.__audioContexts.map((context) => context.state));

const stored = (page: Page, key: string): Promise<string | null> =>
  page.evaluate((name) => window.localStorage.getItem(name), key);

const setTabVisibility = (page: Page, state: "hidden" | "visible"): Promise<void> =>
  page.evaluate((next) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => next });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);

// A click on the page's empty left margin: a user gesture that touches nothing.
const clickElsewhere = (page: Page): Promise<void> => page.mouse.click(2, 300);

const open = async (page: Page, path = "/"): Promise<void> => {
  await page.goto(path);
  await expect(page.getByTestId("sound-toggle")).toBeVisible(PAGE_READY);
};

const turnOn = async (toggle: Locator): Promise<void> => {
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-state", "playing", AUDIO_START);
};

test.describe("Background music", () => {
  let downloads: string[];
  let toggle: Locator;
  let hint: Locator;

  test.beforeEach(async ({ page }) => {
    downloads = await watchAudio(page);
    toggle = page.getByTestId("sound-toggle");
    hint = page.getByTestId("sound-hint");
  });

  test("a first visit stays silent, downloads nothing and shows the hint", async ({ page }) => {
    await open(page);

    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(toggle).toHaveAttribute("data-state", "off");
    await expect(hint).toBeVisible();
    await clickElsewhere(page);

    expect(await contextStates(page)).toEqual([]);
    expect(downloads).toEqual([]);
  });

  test("turning it on plays the landing track, hides the hint and remembers the choice", async ({
    page,
  }) => {
    await open(page);

    await turnOn(toggle);

    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveAttribute("data-track", "landing");
    await expect(hint).toBeHidden();
    expect(await stored(page, MUSIC_WANTED_KEY)).toBe("on");
    expect(await contextStates(page)).toEqual(["running"]);
    expect(downloads).toHaveLength(1);
  });

  test("a returning listener hears nothing until the first gesture, and sees no hint", async ({
    page,
  }) => {
    await open(page);
    await turnOn(toggle);

    await page.reload();

    await expect(toggle).toHaveAttribute("data-state", "waiting");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(hint).toBeHidden();
    expect(await contextStates(page)).toEqual([]);
    await clickElsewhere(page);
    await expect(toggle).toHaveAttribute("data-state", "playing", AUDIO_START);
  });

  test("turning it off suspends the audio and stays off on the next visit", async ({ page }) => {
    await open(page);
    await turnOn(toggle);

    await toggle.click();

    await expect(toggle).toHaveAttribute("data-state", "off");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(await stored(page, MUSIC_WANTED_KEY)).toBe("off");
    await expect.poll(() => contextStates(page)).toEqual(["suspended"]);
    await page.reload();
    await expect(toggle).toHaveAttribute("data-state", "off");
    await expect(hint).toBeHidden();
  });

  test("the hint goes away on its own and does not come back", async ({ page }) => {
    await page.clock.install();
    await open(page);
    await expect(hint).toBeVisible();

    await page.clock.fastForward(30_000);

    await expect(hint).toBeHidden();
    expect(await stored(page, MUSIC_HINT_KEY)).toBe("1");
    await page.reload();
    await expect(hint).toBeHidden();
  });

  test("the toggle works from the keyboard", async ({ page }) => {
    await open(page);

    await toggle.focus();
    await page.keyboard.press("Space");

    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveAttribute("data-state", "playing", AUDIO_START);
  });

  test("the music follows the route: landing, then globe, then landing again", async ({ page }) => {
    const globe = new GlobePage(page);
    await globe.mockObservationPlan();
    await globe.skipOnboarding();
    await open(page);
    await turnOn(toggle);
    await expect(toggle).toHaveAttribute("data-track", "landing");

    await page.getByTestId("nav-explore").click();

    await expect(toggle).toHaveAttribute("data-track", "globe");
    await expect(toggle).toHaveAttribute("data-state", "playing", AUDIO_START);
    await page.locator(".x-pill--mark").click();
    await expect(toggle).toHaveAttribute("data-track", "landing");
    await expect(toggle).toHaveAttribute("data-state", "playing", AUDIO_START);
    // Each track is downloaded once, however often the route changes.
    expect(downloads).toHaveLength(2);
    expect(await contextStates(page)).toEqual(["running"]);
  });

  test("it pauses while the tab is hidden and plays again when it is back", async ({ page }) => {
    await open(page);
    await turnOn(toggle);

    await setTabVisibility(page, "hidden");

    await expect(toggle).toHaveAttribute("data-state", "paused");
    await expect.poll(() => contextStates(page)).toEqual(["suspended"]);
    await setTabVisibility(page, "visible");
    await expect(toggle).toHaveAttribute("data-state", "playing", AUDIO_START);
    await expect.poll(() => contextStates(page)).toEqual(["running"]);
  });

  for (const width of [1120, 1280, 1440]) {
    test(`the explorer's top bar keeps every control on screen at ${width} px`, async ({
      page,
    }) => {
      const globe = new GlobePage(page);
      await globe.mockObservationPlan();
      await globe.skipOnboarding();
      await page.setViewportSize({ width, height: 900 });

      await globe.goto("?case=qadirabad");

      await expect(toggle).toBeInViewport({ ratio: 1 });
      await expect(page.getByTestId("help-button")).toBeInViewport({ ratio: 1 });
      await expect(page.locator(".x-top__fullscreen")).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    });
  }

  test("the About page credits both tracks under their license", async ({ page }) => {
    await page.goto("/about");

    const credits = page.getByTestId("music-credits");
    await credits.scrollIntoViewIfNeeded();

    await expect(page.getByTestId("music-credit-landing")).toContainText(
      "'Starfire' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au",
    );
    await expect(page.getByTestId("music-credit-globe")).toContainText(
      "'Solace' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au",
    );
    await expect(credits).toContainText("Trimmed to a loop and re-encoded");
    await expect(credits.getByRole("link", { name: /Starfire/ })).toHaveAttribute(
      "href",
      "https://www.scottbuckley.com.au/library/starfire/",
    );
    await expect(credits.getByRole("link", { name: /Solace/ })).toHaveAttribute(
      "href",
      "https://www.scottbuckley.com.au/library/solace/",
    );
    await expect(
      credits.getByRole("link", { name: /CC BY 4\.0 license/i }).first(),
    ).toHaveAttribute("href", "https://creativecommons.org/licenses/by/4.0/");
  });
});

test.describe("Background music on a phone", () => {
  for (const { width, gutter } of PHONES) {
    test(`the site bar still fits ${width} px with the toggle and its hint`, async ({ page }) => {
      await page.setViewportSize({ width, height: PHONE_HEIGHT });
      await open(page);

      const soundToggle = page.getByTestId("sound-toggle");
      await expect(soundToggle).toBeInViewport({ ratio: 1 });
      await expect(page.getByTestId("sound-hint")).toBeInViewport({ ratio: 1 });
      await expect(page.getByTestId("nav-menu")).toBeInViewport({ ratio: 1 });
      const pill = page.getByTestId("nav-explore");
      await expect(pill).toBeInViewport({ ratio: 1 });
      const edge = await pill.evaluate((el) => el.getBoundingClientRect().right);
      expect(edge).toBeLessThanOrEqual(width - gutter);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
    });
  }

  test("the explorer's top bar keeps the toggle on screen at 390 px", async ({ page }) => {
    const globe = new GlobePage(page);
    await globe.mockObservationPlan();
    await globe.skipOnboarding();
    await page.setViewportSize({ width: 390, height: PHONE_HEIGHT });

    await globe.goto();

    await expect(page.getByTestId("sound-toggle")).toBeInViewport({ ratio: 1 });
  });
});
