// Builds the English catalog from the code and checks the other catalogs against it.
//
//   pnpm i18n:extract           writes src/locales/en.json (the text of every `tr(...)` call and of
//                               the strings inside `localized(...)` objects)
//   pnpm i18n:extract --check   fails when en.json is stale or a catalog misses a key or a placeholder
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { looksLikeObjectCopy } from "./wrap";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = join(ROOT, "src");
const LOCALES = join(SRC, "locales");
const SKIP = ["src/i18n", "src/locales", "src/pages/e2e"];

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (SKIP.some((skip) => relative(ROOT, path).startsWith(skip))) return [];
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const isText = (node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral =>
  ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);

export const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1] ?? "").sort();

// The catalog keys of one file: the first argument of tr(), and the text values of localized().
const keysOf = (file: string): string[] => {
  const code = readFileSync(file, "utf8");
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.ES2023,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const keys: string[] = [];
  const inLocalized = (node: ts.Node): boolean => {
    for (let parent: ts.Node | undefined = node.parent; parent; parent = parent.parent)
      if (ts.isCallExpression(parent) && parent.expression.getText(source) === "localized")
        return true;
    return false;
  };
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === "tr") {
      const first = node.arguments[0];
      if (first !== undefined && isText(first)) keys.push(first.text);
    } else if (isText(node) && inLocalized(node)) {
      const parent = node.parent;
      const isPropertyName = ts.isPropertyAssignment(parent) && parent.name === node;
      const isCallArgumentOfTr =
        ts.isCallExpression(parent) && parent.expression.getText(source) === "tr";
      if (!isPropertyName && !isCallArgumentOfTr && looksLikeObjectCopy(node.text))
        keys.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return keys;
};

export const extractKeys = (): string[] => {
  const seen = new Set<string>();
  for (const file of walk(SRC)) {
    if (!/\.tsx?$/.test(file) || file.endsWith(".d.ts")) continue;
    for (const key of keysOf(file)) seen.add(key);
  }
  return [...seen];
};

const english = (keys: string[]): Record<string, string> =>
  Object.fromEntries(keys.map((key) => [key, key]));

const main = (): void => {
  const keys = extractKeys();
  const path = join(LOCALES, "en.json");
  const next = `${JSON.stringify(english(keys), null, 2)}\n`;
  if (process.argv.includes("--check")) {
    const problems: string[] = [];
    if (!existsSync(path) || readFileSync(path, "utf8") !== next)
      problems.push("src/locales/en.json is out of date: run pnpm i18n:extract");
    for (const name of readdirSync(LOCALES)) {
      if (name === "en.json" || !name.endsWith(".json")) continue;
      const catalog = JSON.parse(readFileSync(join(LOCALES, name), "utf8")) as Record<
        string,
        string
      >;
      const missing = keys.filter((key) => catalog[key] === undefined);
      const broken = keys.filter(
        (key) =>
          catalog[key] !== undefined &&
          placeholders(catalog[key]).join() !== placeholders(key).join(),
      );
      if (missing.length > 0)
        problems.push(
          `${name}: ${missing.length} keys missing, e.g. ${JSON.stringify(missing[0])}`,
        );
      if (broken.length > 0)
        problems.push(
          `${name}: ${broken.length} placeholders differ, e.g. ${JSON.stringify(broken[0])}`,
        );
    }
    process.stdout.write(
      problems.length === 0
        ? `i18n catalogs ok (${keys.length} keys)\n`
        : `${problems.join("\n")}\n`,
    );
    process.exit(problems.length === 0 ? 0 : 1);
  }
  writeFileSync(path, next);
  process.stdout.write(`${keys.length} keys written to src/locales/en.json\n`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
