import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { pickLanguage } from "@/i18n/detect";
import { formatDate, formatNumber } from "@/i18n/format";
import { changeLanguage, initI18n } from "@/i18n/i18n";
import { LANGUAGES, languageByCode, matchLanguage } from "@/i18n/languages";
import { localized } from "@/i18n/localized";
import { i18next, tr } from "@/i18n/translate";

describe("language detection", () => {
  it("prefers a shared link, then the stored choice, then the browser, then English", () => {
    expect(pickLanguage({ search: "?lang=fr", stored: "de", preferences: ["ja"] })).toBe("fr");
    expect(pickLanguage({ search: "", stored: "de", preferences: ["ja"] })).toBe("de");
    expect(pickLanguage({ search: "", stored: null, preferences: ["ja-JP", "en"] })).toBe("ja");
    expect(pickLanguage({ search: "", stored: null, preferences: ["sw", "ko"] })).toBe("en");
    expect(pickLanguage({ search: "?lang=xx", stored: "yy", preferences: [] })).toBe("en");
  });

  it("matches regional preferences to the supported language", () => {
    expect(matchLanguage(["pt-BR"])).toBe("pt");
    expect(matchLanguage(["zh-Hans-CN"])).toBe("zh");
    expect(matchLanguage(["sw", "ar-EG"])).toBe("ar");
    expect(matchLanguage(["sw"])).toBeUndefined();
  });
});

describe("the language registry", () => {
  it("has nine unique languages, two-letter buttons and a right-to-left Arabic only", () => {
    expect(LANGUAGES.map((language) => language.code)).toEqual([
      "en",
      "es",
      "fr",
      "de",
      "pt",
      "ja",
      "zh",
      "ar",
      "hi",
    ]);
    for (const language of LANGUAGES) expect(language.short).toMatch(/^[A-Z]{2}$/);
    expect(
      LANGUAGES.filter((language) => language.dir === "rtl").map((language) => language.code),
    ).toEqual(["ar"]);
    expect(languageByCode("zh")?.htmlLang).toBe("zh-Hans");
  });
});

describe("translating", () => {
  beforeAll(async () => {
    await initI18n("en");
    i18next.addResourceBundle(
      "es",
      "translation",
      { "Search a place": "Busca un lugar", "{{n}} cells": "{{n}} celdas" },
      true,
      true,
    );
  });

  afterEach(async () => {
    await i18next.changeLanguage("en");
  });

  it("returns the English text, with its values, when there is no translation", () => {
    expect(tr("Search a place")).toBe("Search a place");
    expect(tr("{{n}} cells", { n: 5 })).toBe("5 cells");
    expect(tr("Never translated {{x}}", { x: "ok" })).toBe("Never translated ok");
  });

  it("switches live: the same call answers in the new language", async () => {
    await i18next.changeLanguage("es");
    expect(tr("Search a place")).toBe("Busca un lugar");
    expect(tr("{{n}} cells", { n: 5 })).toBe("5 celdas");
    expect(tr("Missing in Spanish")).toBe("Missing in Spanish");
  });

  it("translates copy objects when they are read, and keeps their identity and functions", async () => {
    const copy = localized({
      search: "Search a place",
      kind: "polygon",
      nested: { label: "Search a place" },
      list: ["Search a place"],
      count: (n: number) => tr("{{n}} cells", { n }),
    });
    expect(copy.search).toBe("Search a place");
    await i18next.changeLanguage("es");
    expect(copy.search).toBe("Busca un lugar");
    expect(copy.nested.label).toBe("Busca un lugar");
    expect(copy.list[0]).toBe("Busca un lugar");
    expect(copy.count(3)).toBe("3 celdas");
    expect(copy.kind).toBe("polygon");
    expect(copy.nested).toBe(copy.nested);
    expect(localized(copy)).toBe(copy);
  });

  it("changes the language without a reload and remembers nothing outside a browser", async () => {
    await changeLanguage("en");
    expect(i18next.language).toBe("en");
  });

  it("formats numbers and dates in the active language with Latin digits", async () => {
    expect(formatNumber(5513)).toBe("5,513");
    expect(
      formatDate(Date.UTC(2026, 10, 14), { day: "numeric", month: "short", timeZone: "UTC" }),
    ).toBe("14 Nov");
    await i18next.changeLanguage("de");
    expect(formatNumber(5513.5, { maximumFractionDigits: 1 })).toBe("5.513,5");
    await i18next.changeLanguage("ar");
    expect(formatNumber(5513)).toMatch(/^5\D?513$/u);
    expect(formatNumber(5513)).not.toMatch(/[٠-٩]/u);
    await i18next.changeLanguage("en");
  });
});
