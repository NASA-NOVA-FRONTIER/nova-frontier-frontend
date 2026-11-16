import { i18next } from "@/i18n/translate";
import { initReactI18next } from "react-i18next";

import { detectLanguage, writeStored } from "@/i18n/detect";
import "@/i18n/i18n.css";
import { loadFont } from "@/i18n/fonts";
import { DEFAULT_LANGUAGE, languageByCode } from "@/i18n/languages";
import type { LanguageCode } from "@/i18n/languages";

// English is the source: the text in the code is the key, so a missing translation shows the
// English text instead of an empty label. Every other language is a catalog loaded on demand.
const catalogs = import.meta.glob<Record<string, string>>("../locales/*.json", {
  import: "default",
});

const catalogPath = (code: string): string => `../locales/${code}.json`;

const fetchCatalog = async (code: LanguageCode): Promise<Record<string, string> | undefined> =>
  code === DEFAULT_LANGUAGE ? undefined : catalogs[catalogPath(code)]?.();

const loadCatalog = async (code: LanguageCode): Promise<void> => {
  if (code === DEFAULT_LANGUAGE || i18next.hasResourceBundle(code, "translation")) return;
  const catalog = await fetchCatalog(code);
  if (catalog !== undefined) i18next.addResourceBundle(code, "translation", catalog, true, true);
};

// `<html lang dir>` and the font follow the language, so screen readers, hyphenation and the
// reading direction are right as soon as the interface changes.
const applyToDocument = (code: LanguageCode): void => {
  const language = languageByCode(code);
  if (language === undefined || typeof document === "undefined") return;
  document.documentElement.lang = language.htmlLang;
  document.documentElement.dir = language.dir;
  loadFont(language.webFont);
};

export const initI18n = async (initial: LanguageCode = detectLanguage()): Promise<void> => {
  // The store does not exist before init, so the first catalog goes in through `resources`.
  const catalog = await fetchCatalog(initial);
  await i18next.use(initReactI18next).init({
    lng: initial,
    fallbackLng: DEFAULT_LANGUAGE,
    resources: catalog === undefined ? {} : { [initial]: { translation: catalog } },
    keySeparator: false,
    nsSeparator: false,
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  i18next.on("languageChanged", (code) => applyToDocument(code as LanguageCode));
  applyToDocument(initial);
};

// Loads the catalog first, so the whole interface switches at once and never shows half a language.
export const changeLanguage = async (code: LanguageCode): Promise<void> => {
  await loadCatalog(code);
  await i18next.changeLanguage(code);
  writeStored(code);
};

export const currentLanguage = (): LanguageCode =>
  (i18next.language as LanguageCode | undefined) ?? DEFAULT_LANGUAGE;
