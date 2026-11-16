import { DEFAULT_LANGUAGE, QUERY_PARAM, STORAGE_KEY, languageByCode } from "@/i18n/languages";
import type { LanguageCode } from "@/i18n/languages";

type Source = {
  search: string;
  stored: string | null;
};

// English unless the visitor chose otherwise: a link (`?lang=es`) or the language picked in the menu.
// The browser's language is never consulted.
export const pickLanguage = ({ search, stored }: Source): LanguageCode => {
  const asked = new URLSearchParams(search).get(QUERY_PARAM);
  for (const code of [asked, stored]) {
    if (code !== null) {
      const known = languageByCode(code);
      if (known !== undefined) return known.code as LanguageCode;
    }
  }
  return DEFAULT_LANGUAGE;
};

export const readStored = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const writeStored = (code: LanguageCode): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private mode or a full disk: the choice then lasts until the tab closes.
  }
};

export const detectLanguage = (): LanguageCode =>
  pickLanguage({ search: window.location.search, stored: readStored() });
