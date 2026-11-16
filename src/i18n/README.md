# Internationalisation (i18n)

The UI speaks English, Spanish, French, German, Portuguese (Brazil), Japanese, Chinese (Simplified),
Arabic (right-to-left) and Hindi. **English is the source of truth and needs no catalog**: the English text
written in the code is also the key of every translation.

## Writing UI text

| Where the text lives                                    | Write                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| Inside a component or function                          | `tr("Open the explorer")` · `tr("{{n}} passes", { n: count })`  |
| In a module-level constant (copy files, content tables) | wrap the whole constant: `localized({ title: "…", body: "…" })` |

- Import from `@/i18n/translate` (`tr`) and `@/i18n/localized` (`localized`); both are light and safe to use anywhere.
- Never build a sentence by concatenation: use one string with `{{placeholders}}` so every language can reorder it.
- Dates and numbers go through `formatDate` / `formatNumber` from `@/i18n` (Latin digits in every language).
- Ids, URLs, code and proper names are not translated; everything a person reads is.

`pnpm i18n:wrap` is a codemod that wraps the plain text it finds in JSX, in text attributes and in the copy
files. It is idempotent: run it after writing a screen with plain English and it adds the missing `tr()` calls.

## Catalogs

`src/locales/<code>.json` maps each English string to its translation. `en.json` is generated (identity map)
by `pnpm i18n:extract`; the other catalogs are written by hand or with a translator.

After adding or changing UI text:

1. `pnpm i18n:wrap` wraps any plain text you left in `tr()`; the unit tests fail while some is left outside.
2. `pnpm i18n:extract` regenerates `en.json` with the new keys.
3. Add the new keys to the other catalogs. Until then a language shows that string in English; the unit
   tests only fail when a translation changes a `{{placeholder}}`. `pnpm i18n:extract --check` lists what
   is stale or missing.

## Adding a language

1. Add an entry to `LANGUAGES` in `languages.ts` (code, two-letter `short`, native name, `dir`, `htmlLang`,
   `intl`, `speech`, and `webFont` when the script is not covered by the Latin fonts).
2. Create `src/locales/<code>.json` with every key of `en.json`.
3. If the script needs a font, add its `html:lang(<code>)` override in `i18n.css`.

The switcher, the detection order and the `lang` / `dir` attributes follow from the registry.

## Behaviour

- English is always the default. Only a link (`?lang=`) or the language the visitor picked in the menu
  (kept in `localStorage["nova.language"]`) changes it; the browser's language is never consulted.
- The switch is live: `useLanguage()` at the app root re-renders the tree; there is no reload.
- Arabic sets `dir="rtl"`. The globe, the charts, sliders and the time axis stay left to right.
- Text that comes from the backend (limitations, errors, case evidence) is not translated.
