import {
  DEFAULT_LANGUAGE,
  QUERY_PARAM,
  STORAGE_KEY,
  languageByCode,
  matchLanguage,
} from "@/i18n/languages";
import type { LanguageCode } from "@/i18n/languages";

type Source = {
  search: string;
  stored: string | null;
  preferences: readonly string[];
};

// A shared link wins (`?lang=es`), then the visitor's last choice, then the browser, then English.
export const pickLanguage = ({ search, stored, preferences }: Source): LanguageCode => {
  const asked = new URLSearchParams(search).get(QUERY_PARAM);
  for (const code of [asked, stored]) {
    if (code !== null) {
      const known = languageByCode(code);
      if (known !== undefined) return known.code as LanguageCode;
    }
  }
  return matchLanguage(preferences) ?? DEFAULT_LANGUAGE;
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
  pickLanguage({
    search: window.location.search,
    stored: readStored(),
    preferences: window.navigator.languages ?? [window.navigator.language],
  });
