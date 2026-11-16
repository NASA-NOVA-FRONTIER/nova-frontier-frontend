import { useCallback } from "react";
import { useTranslation } from "react-i18next";

import { changeLanguage } from "@/i18n/i18n";
import { DEFAULT_LANGUAGE, LANGUAGES } from "@/i18n/languages";
import type { LanguageCode, LanguageEntry } from "@/i18n/languages";

type UseLanguage = {
  language: LanguageEntry;
  others: readonly LanguageEntry[];
  setLanguage: (code: LanguageCode) => Promise<void>;
};

// Re-renders its component (and everything under it) when the language changes. The app root
// calls it once, which is what makes the switch live without a reload.
export const useLanguage = (): UseLanguage => {
  const { i18n } = useTranslation();
  const code = i18n.language || DEFAULT_LANGUAGE;
  const language = LANGUAGES.find((item) => item.code === code) ?? LANGUAGES[0];
  const setLanguage = useCallback((next: LanguageCode) => changeLanguage(next), []);
  return {
    language,
    others: LANGUAGES.filter((item) => item.code !== language.code),
    setLanguage,
  };
};
