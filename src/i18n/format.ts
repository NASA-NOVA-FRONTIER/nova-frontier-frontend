import { currentLanguage } from "@/i18n/translate";
import { languageByCode } from "@/i18n/languages";

const intlLocale = (): string => languageByCode(currentLanguage())?.intl ?? "en-US";

// Digits stay Latin in every language (also Arabic and Hindi): the numbers are measurements and
// the same figure must read the same in a screenshot or a report.
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string =>
  value.toLocaleString(intlLocale(), { numberingSystem: "latn", ...options });

// English keeps the day-month-year order the interface always used.
export const formatDate = (value: Date | number, options: Intl.DateTimeFormatOptions): string => {
  const code = currentLanguage();
  const locale = code === "en" ? "en-GB" : (languageByCode(code)?.intl ?? "en-GB");
  return new Date(value).toLocaleDateString(locale, { numberingSystem: "latn", ...options });
};
