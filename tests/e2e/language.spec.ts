import { expect, type Page, test } from "./fixtures";

const SENTINEL = "novaNoReloadMarker";

const html = (page: Page) => page.locator("html");

async function chooseLanguage(page: Page, code: string) {
  await page.getByTestId("language-button").click();
  await page.getByTestId(`language-option-${code}`).click();
}

test.describe("Language switcher", () => {
  test("English is the default and the button shows its two letters", async ({ page }) => {
    await page.goto("/");

    await expect(html(page)).toHaveAttribute("lang", "en");
    await expect(html(page)).toHaveAttribute("dir", "ltr");
    await expect(page.getByTestId("language-button")).toHaveText("EN");
    await expect(page.locator(".s-nav__pill-long")).toHaveText("Open the explorer");
  });

  test("the menu lists the other eight languages by their own names", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("language-button").click();

    await expect(page.getByTestId("language-menu")).toBeVisible();
    await expect(page.locator("[data-testid^=language-option-]")).toHaveCount(8);
    await expect(page.getByTestId("language-option-en")).toHaveCount(0);
    await expect(page.getByTestId("language-option-es")).toContainText("Español");
    await expect(page.getByTestId("language-option-ar")).toContainText("العربية");
  });

  test("choosing a language translates the page live, without a reload", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((name) => Object.assign(window, { [name]: true }), SENTINEL);

    await chooseLanguage(page, "es");

    await expect(page.locator(".s-nav__pill-long")).toHaveText("Abrir el explorador");
    await expect(html(page)).toHaveAttribute("lang", "es");
    await expect(page.getByTestId("language-button")).toHaveText("ES");
    expect(await page.evaluate((name) => Reflect.get(window, name), SENTINEL)).toBe(true);

    await chooseLanguage(page, "en");

    await expect(page.locator(".s-nav__pill-long")).toHaveText("Open the explorer");
  });

  test("the chosen language survives a reload", async ({ page }) => {
    await page.goto("/");

    await chooseLanguage(page, "de");
    await expect(html(page)).toHaveAttribute("lang", "de");
    await page.reload();

    await expect(html(page)).toHaveAttribute("lang", "de");
    await expect(page.getByTestId("language-button")).toHaveText("DE");
  });

  test("the lang query parameter opens that language", async ({ page }) => {
    await page.goto("/?lang=fr");

    await expect(html(page)).toHaveAttribute("lang", "fr");
    await expect(page.getByTestId("language-button")).toHaveText("FR");
  });

  test("Arabic switches the page to right-to-left and back", async ({ page }) => {
    await page.goto("/");

    await chooseLanguage(page, "ar");

    await expect(html(page)).toHaveAttribute("dir", "rtl");
    await expect(html(page)).toHaveAttribute("lang", "ar");
    await expect(page.getByTestId("language-button")).toHaveText("AR");

    await chooseLanguage(page, "en");

    await expect(html(page)).toHaveAttribute("dir", "ltr");
  });

  test("the menu works with the keyboard", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("language-button").focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId("language-menu")).toBeVisible();
    await page.keyboard.press("Escape");

    await expect(page.getByTestId("language-menu")).toBeHidden();
    await expect(page.getByTestId("language-button")).toBeFocused();
  });

  test("the explorer top bar carries the switcher too", async ({ page }) => {
    await page.goto("/explore");

    await expect(page.getByTestId("language-button")).toBeVisible();
    await expect(page.getByTestId("language-button")).toHaveText("EN");
  });
});

test.describe("A browser set to another language", () => {
  test.use({ locale: "es-ES" });

  test("still opens in English: only the visitor's own choice changes it", async ({ page }) => {
    await page.goto("/");

    await expect(html(page)).toHaveAttribute("lang", "en");
    await expect(page.getByTestId("language-button")).toHaveText("EN");
    await expect(page.locator(".s-nav__pill-long")).toHaveText("Open the explorer");
  });
});
