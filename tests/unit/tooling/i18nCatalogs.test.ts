import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { extractKeys, placeholders } from "../../../scripts/i18n/extract";
import { unwrappedText } from "../../../scripts/i18n/wrap";

const ROOT = join(__dirname, "..", "..", "..");
const LOCALES = join(ROOT, "src", "locales");
const SOURCE_LANGUAGE = "en";
const TRANSLATED_LANGUAGES = ["es", "fr", "de", "pt", "ja", "zh", "ar", "hi"];

const readCatalog = (code: string) =>
  JSON.parse(readFileSync(join(LOCALES, `${code}.json`), "utf8")) as Record<string, string>;

describe("the catalogs", () => {
  const keys = extractKeys();

  it("has a catalog file for every language", () => {
    const files = readdirSync(LOCALES);
    for (const code of [SOURCE_LANGUAGE, ...TRANSLATED_LANGUAGES]) {
      expect(files).toContain(`${code}.json`);
    }
  });

  // A missing key is not an error: the English text shows until someone translates it.
  for (const code of TRANSLATED_LANGUAGES) {
    it(`${code} keeps the placeholders of every string it translates`, () => {
      const catalog = readCatalog(code);
      const broken = keys.filter(
        (key) =>
          catalog[key] !== undefined &&
          placeholders(catalog[key]).join() !== placeholders(key).join(),
      );
      expect(broken.slice(0, 5)).toEqual([]);
    });
  }
});

describe("new interface text", () => {
  const files = (directory: string): string[] =>
    readdirSync(directory).flatMap((name) => {
      const path = join(directory, name);
      if (
        relative(ROOT, path).startsWith(join("src", "i18n")) ||
        relative(ROOT, path).startsWith(join("src", "pages", "e2e"))
      )
        return [];
      return statSync(path).isDirectory() ? files(path) : path.endsWith(".tsx") ? [path] : [];
    });

  it("is wrapped in tr(): no JSX text or text attribute is left in English only", () => {
    const left = files(join(ROOT, "src")).flatMap((file) =>
      unwrappedText(file, readFileSync(file, "utf8")).map(
        (text) => `${relative(ROOT, file)}: ${text}`,
      ),
    );
    expect(left).toEqual([]);
  });
});
