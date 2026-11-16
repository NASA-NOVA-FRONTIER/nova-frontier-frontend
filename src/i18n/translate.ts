import i18next from "i18next";

import { DEFAULT_LANGUAGE } from "@/i18n/languages";
import type { LanguageCode } from "@/i18n/languages";

// Before init (and in plain unit tests) the text is returned as written, with its values filled in.
const interpolate = (text: string, values: Record<string, unknown> | undefined): string =>
  values === undefined
    ? text
    : text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) =>
        name in values ? String(values[name]) : match,
      );

// The one translation call outside React hooks: copy modules and helpers use it. English is the
// source: the text in the code is the key, so a missing translation shows the English text.
// Components that call it re-render with their page when the language changes (the app root
// subscribes through `useLanguage`).
export const tr = (text: string, values?: Record<string, unknown>): string =>
  i18next.isInitialized
    ? i18next.t(text, { defaultValue: text, ...values })
    : interpolate(text, values);

export const currentLanguage = (): LanguageCode =>
  (i18next.language as LanguageCode | undefined) ?? DEFAULT_LANGUAGE;

export { i18next };
