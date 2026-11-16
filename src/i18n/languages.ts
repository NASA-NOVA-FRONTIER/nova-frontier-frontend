// The languages of the interface. Adding one is an entry here plus a catalog at
// `src/locales/<code>.json` (see src/i18n/README.md); no other code changes.

export type Direction = "ltr" | "rtl";

export type Language = {
  // The code used in storage, `?lang=` and the catalog file name.
  code: string;
  // The two letters on the switcher button.
  short: string;
  // The language in its own script, as the menu shows it.
  nativeName: string;
  dir: Direction;
  // `<html lang>`: pt-BR and zh-Hans tell fonts and screen readers which variant to use.
  htmlLang: string;
  // The locale that `Intl` formats numbers and dates with.
  intl: string;
  // The voice language of the speech synthesis (issue #54).
  speech: string;
  // Google Fonts family loaded on demand when the script is not covered by Albert Sans.
  webFont: string | null;
};

export const LANGUAGES = [
  {
    code: "en",
    short: "EN",
    nativeName: "English",
    dir: "ltr",
    htmlLang: "en",
    intl: "en-US",
    speech: "en-US",
    webFont: null,
  },
  {
    code: "es",
    short: "ES",
    nativeName: "Español",
    dir: "ltr",
    htmlLang: "es",
    intl: "es",
    speech: "es-ES",
    webFont: null,
  },
  {
    code: "fr",
    short: "FR",
    nativeName: "Français",
    dir: "ltr",
    htmlLang: "fr",
    intl: "fr",
    speech: "fr-FR",
    webFont: null,
  },
  {
    code: "de",
    short: "DE",
    nativeName: "Deutsch",
    dir: "ltr",
    htmlLang: "de",
    intl: "de",
    speech: "de-DE",
    webFont: null,
  },
  {
    code: "pt",
    short: "PT",
    nativeName: "Português",
    dir: "ltr",
    htmlLang: "pt-BR",
    intl: "pt-BR",
    speech: "pt-BR",
    webFont: null,
  },
  {
    code: "ja",
    short: "JA",
    nativeName: "日本語",
    dir: "ltr",
    htmlLang: "ja",
    intl: "ja",
    speech: "ja-JP",
    webFont: "Noto+Sans+JP:wght@400;500;600",
  },
  {
    code: "zh",
    short: "ZH",
    nativeName: "中文",
    dir: "ltr",
    htmlLang: "zh-Hans",
    intl: "zh-CN",
    speech: "zh-CN",
    webFont: "Noto+Sans+SC:wght@400;500;600",
  },
  {
    code: "ar",
    short: "AR",
    nativeName: "العربية",
    dir: "rtl",
    htmlLang: "ar",
    intl: "ar",
    speech: "ar-SA",
    webFont: "Noto+Sans+Arabic:wght@400;500;600",
  },
  {
    code: "hi",
    short: "HI",
    nativeName: "हिन्दी",
    dir: "ltr",
    htmlLang: "hi",
    intl: "hi",
    speech: "hi-IN",
    webFont: "Noto+Sans+Devanagari:wght@400;500;600",
  },
] as const satisfies readonly Language[];

export type LanguageEntry = (typeof LANGUAGES)[number];
export type LanguageCode = LanguageEntry["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "en";
export const STORAGE_KEY = "nova.language";
export const QUERY_PARAM = "lang";

export const languageByCode = (code: string): Language | undefined =>
  LANGUAGES.find((language) => language.code === code);
