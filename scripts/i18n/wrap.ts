// Wraps the visible English text of the interface in `tr()` so it can be translated.
//
//   pnpm i18n:wrap            wraps JSX text and text attributes in src/**/*.tsx, and the copy objects
//                             and template strings of the copy modules (see COPY_FILES).
//
// It is safe to run again (wrapped text is skipped), so a teammate can run it after merging main
// to catch the strings added since. Mixed text such as `Hello <b>you</b>` is wrapped fragment by
// fragment; anything the script cannot reach stays English until someone wraps it by hand.
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = join(ROOT, "src");
const SKIP_DIRS = ["src/i18n", "src/pages/e2e", "src/locales"];
const SKIP_PARENTS = new Set(["code", "kbd", "pre", "style", "script", "samp", "var", "svg"]);
const TEXT_ATTRIBUTES = new Set([
  "title",
  "alt",
  "placeholder",
  "aria-label",
  "aria-description",
  "aria-roledescription",
  "aria-valuetext",
]);
// Modules made of copy: their exported objects and arrays are wrapped in `localized(...)`.
const COPY_FILES: readonly string[] = (process.env.I18N_COPY_FILES ?? "")
  .split(",")
  .filter(Boolean);

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  middot: "·",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  times: "×",
  rarr: "→",
  larr: "←",
  deg: "°",
  minus: "−",
  laquo: "«",
  raquo: "»",
};
const decode = (raw: string): string =>
  raw.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, name: string) => {
    if (name.startsWith("#x")) return String.fromCodePoint(parseInt(name.slice(2), 16));
    if (name.startsWith("#")) return String.fromCodePoint(parseInt(name.slice(1), 10));
    return ENTITIES[name] ?? match;
  });

// JSX collapses the whitespace of multi-line text; this does the same to get the real string.
const collapse = (raw: string): string => {
  const lines = raw.split(/\r\n|\n|\r/);
  const kept = lines
    .map((line, index) => {
      let text = line.replace(/\t/g, " ");
      if (index > 0) text = text.replace(/^ +/, "");
      if (index < lines.length - 1) text = text.replace(/ +$/, "");
      return text;
    })
    .filter((line) => line.length > 0);
  return kept.join(" ");
};

const hasWords = (text: string): boolean => /[A-Za-z]{3,}/.test(text);

// Text a person reads, not a code, a path, a unit or an identifier.
export const looksLikeCopy = (text: string): boolean => {
  const trimmed = text.trim();
  if (!hasWords(trimmed)) return false;
  if (/^(https?:|\/|\.\/|#|@|mailto:)/.test(trimmed)) return false;
  if (/^[a-z0-9_\-.:/#@[\]]+$/.test(trimmed)) return false;
  if (/^[\w-]+\.\w{2,5}$/.test(trimmed)) return false;
  return true;
};

// Inside data objects a lowercase single token is an identifier (a kind, an id), never copy.
export const looksLikeObjectCopy = (text: string): boolean =>
  looksLikeCopy(text) && (/\s/.test(text) || /^[A-Z]/.test(text));

const TEXT_PROPERTIES = new Set([
  "label",
  "title",
  "sub",
  "subtitle",
  "description",
  "placeholder",
  "caption",
  "text",
  "heading",
  "body",
  "note",
  "message",
  "hint",
  "kicker",
  "summary",
  "detail",
  "tooltip",
  "short",
]);

type Edit = { start: number; end: number; text: string };

const quote = (text: string): string => JSON.stringify(text);

const parentName = (node: ts.Node): string | undefined => {
  for (let parent: ts.Node | undefined = node.parent; parent; parent = parent.parent) {
    if (ts.isJsxElement(parent)) return parent.openingElement.tagName.getText();
    if (ts.isJsxSelfClosingElement(parent)) return parent.tagName.getText();
  }
  return undefined;
};

const placeholderName = (expression: ts.Expression, taken: Set<string>, index: number): string => {
  const pick = (node: ts.Node): string | undefined => {
    if (ts.isIdentifier(node)) return node.text;
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    if (ts.isCallExpression(node)) {
      for (const argument of node.arguments) {
        const found = pick(argument);
        if (found !== undefined) return found;
      }
      return pick(node.expression);
    }
    if (ts.isNonNullExpression(node) || ts.isParenthesizedExpression(node))
      return pick(node.expression);
    return undefined;
  };
  let name = pick(expression) ?? `v${index}`;
  if (!/^[A-Za-z_]\w*$/.test(name)) name = `v${index}`;
  let candidate = name;
  for (let n = 2; taken.has(candidate); n += 1) candidate = `${name}${n}`;
  taken.add(candidate);
  return candidate;
};

// `a ${x} b` -> tr("a {{x}} b", { x })
const templateToTr = (node: ts.TemplateExpression, source: ts.SourceFile): string => {
  const taken = new Set<string>();
  let text = node.head.text;
  const values: string[] = [];
  node.templateSpans.forEach((span, index) => {
    const name = placeholderName(span.expression, taken, index);
    text += `{{${name}}}` + span.literal.text;
    const code = span.expression.getText(source);
    values.push(name === code ? name : `${name}: ${code}`);
  });
  return `tr(${quote(text)}, { ${values.join(", ")} })`;
};

const alreadyTranslated = (node: ts.Node): boolean => {
  const parent = node.parent;
  return ts.isCallExpression(parent) && parent.expression.getText() === "tr";
};

const collectJsx = (source: ts.SourceFile, edits: Edit[]): void => {
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) {
      const raw = node.getText(source);
      const parent = parentName(node);
      if (parent !== undefined && SKIP_PARENTS.has(parent)) return;
      const text = decode(collapse(raw));
      if (!looksLikeCopy(text)) return;
      const leading = /^[ \t]+(?=\S)/.exec(raw)?.[0] ?? "";
      const trailing = /(?<=\S)[ \t]+$/.exec(raw)?.[0] ?? "";
      edits.push({
        start: node.getStart(source),
        end: node.getEnd(),
        text: `${leading}{tr(${quote(text)})}${trailing}`,
      });
    } else if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    ) {
      const name = node.name.getText(source);
      if (TEXT_ATTRIBUTES.has(name) && looksLikeCopy(node.initializer.text)) {
        edits.push({
          start: node.initializer.getStart(source),
          end: node.initializer.getEnd(),
          text: `{tr(${quote(node.initializer.text)})}`,
        });
      }
    } else if (
      ts.isJsxExpression(node) &&
      node.expression &&
      (ts.isStringLiteral(node.expression) ||
        ts.isNoSubstitutionTemplateLiteral(node.expression)) &&
      ts.isJsxElement(node.parent) &&
      looksLikeCopy(node.expression.text) &&
      !alreadyTranslated(node.expression)
    ) {
      edits.push({
        start: node.expression.getStart(source),
        end: node.expression.getEnd(),
        text: `tr(${quote(node.expression.text)})`,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
};

const insideFunction = (node: ts.Node): boolean => {
  for (let parent: ts.Node | undefined = node.parent; parent; parent = parent.parent)
    if (ts.isFunctionLike(parent)) return true;
  return false;
};

const topLevelLiteral = (node: ts.Node): ts.Expression | undefined => {
  let current: ts.Node = node;
  while (current.parent && !ts.isSourceFile(current.parent)) current = current.parent;
  if (!ts.isVariableStatement(current)) return undefined;
  const initializer = current.declarationList.declarations[0]?.initializer;
  if (initializer === undefined) return undefined;
  let literal: ts.Expression = initializer;
  while (
    ts.isAsExpression(literal) ||
    ts.isSatisfiesExpression(literal) ||
    ts.isParenthesizedExpression(literal)
  )
    literal = literal.expression;
  return ts.isObjectLiteralExpression(literal) || ts.isArrayLiteralExpression(literal)
    ? initializer
    : undefined;
};

// Text kept in data objects of a component file: `label: "Cases"`. Inside a function it becomes a
// `tr` call; in a constant outside any function the whole constant is wrapped in `localized(...)`.
const collectProperties = (source: ts.SourceFile, edits: Edit[]): void => {
  const wrapped = new Set<ts.Expression>();
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ["tr", "localized"].includes(node.expression.getText(source)))
      return;
    if (
      ts.isPropertyAssignment(node) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
    ) {
      const name = ts.isIdentifier(node.name) ? node.name.text : node.name.text;
      const value = node.initializer;
      if (
        TEXT_PROPERTIES.has(name) &&
        (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) &&
        looksLikeObjectCopy(value.text)
      ) {
        if (insideFunction(node)) {
          edits.push({
            start: value.getStart(source),
            end: value.getEnd(),
            text: `tr(${quote(value.text)})`,
          });
        } else {
          const literal = topLevelLiteral(node);
          if (
            literal !== undefined &&
            !wrapped.has(literal) &&
            !literal.getText(source).startsWith("localized(")
          ) {
            wrapped.add(literal);
            edits.push({
              start: literal.getStart(source),
              end: literal.getStart(source),
              text: "localized(",
            });
            edits.push({ start: literal.getEnd(), end: literal.getEnd(), text: ")" });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
};

// In a copy module, a function that returns a template string becomes a `tr` call with names.
const collectTemplates = (source: ts.SourceFile, edits: Edit[]): void => {
  const visit = (node: ts.Node): void => {
    if (
      ts.isTemplateExpression(node) &&
      !alreadyTranslated(node) &&
      hasWords(node.head.text + node.templateSpans.map((span) => span.literal.text).join(" ")) &&
      (ts.isArrowFunction(node.parent) ||
        ts.isReturnStatement(node.parent) ||
        ts.isParenthesizedExpression(node.parent))
    ) {
      edits.push({
        start: node.getStart(source),
        end: node.getEnd(),
        text: templateToTr(node, source),
      });
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
};

// `export const X = { ... }` -> `export const X = localized({ ... })`
const collectCopyObjects = (source: ts.SourceFile, edits: Edit[]): void => {
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    if (!statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword))
      continue;
    for (const declaration of statement.declarationList.declarations) {
      const initializer = declaration.initializer;
      if (initializer === undefined) continue;
      let literal: ts.Expression = initializer;
      while (
        ts.isAsExpression(literal) ||
        ts.isSatisfiesExpression(literal) ||
        ts.isParenthesizedExpression(literal)
      )
        literal = literal.expression;
      if (!ts.isObjectLiteralExpression(literal) && !ts.isArrayLiteralExpression(literal)) continue;
      if (initializer.getText(source).startsWith("localized(")) continue;
      edits.push({
        start: initializer.getStart(source),
        end: initializer.getStart(source),
        text: "localized(",
      });
      edits.push({ start: initializer.getEnd(), end: initializer.getEnd(), text: ")" });
    }
  }
};

const SOURCE_OF: Record<string, string> = {
  tr: "@/i18n/translate",
  localized: "@/i18n/localized",
};

// The visible text a file still has outside `tr()`: the guard test fails when there is any.
export const unwrappedText = (file: string, code: string): string[] => {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.ES2023, true, ts.ScriptKind.TSX);
  const edits: Edit[] = [];
  collectJsx(source, edits);
  return edits.map((edit) => edit.text.replace(/^\s*\{tr\(|\)\}\s*$/g, ""));
};

const ensureImport = (code: string, names: string[]): string => {
  const missing = names.filter(
    (name) => !new RegExp(`import[^;]*\\b${name}\\b[^;]*from "@/i18n`).test(code),
  );
  if (missing.length === 0) return code;
  const statement = missing
    .map((name) => `import { ${name} } from "${SOURCE_OF[name]}";\n`)
    .join("");
  const imports = [...code.matchAll(/^import[\s\S]*?;\s*$/gm)];
  const last = imports.at(-1);
  if (last === undefined || last.index === undefined) return statement + code;
  const at = last.index + last[0].length;
  return `${code.slice(0, at)}\n${statement.trimEnd()}${code.slice(at)}`;
};

const applyEdits = (code: string, edits: Edit[]): string =>
  [...edits]
    .sort((a, b) => b.start - a.start || b.end - a.end)
    .reduce(
      (result, edit) => result.slice(0, edit.start) + edit.text + result.slice(edit.end),
      code,
    );

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (SKIP_DIRS.some((skip) => relative(ROOT, path).startsWith(skip))) return [];
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const main = (): void => {
  const report: string[] = [];
  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file);
    const isTsx = file.endsWith(".tsx");
    const isCopy = COPY_FILES.includes(rel);
    if (!isTsx && !isCopy) continue;
    const code = readFileSync(file, "utf8");
    if (/\btr\b\s*[:=]/.test(code.replace(/\btr\(/g, ""))) {
      report.push(`skipped (an identifier named tr exists): ${rel}`);
      continue;
    }
    const source = ts.createSourceFile(
      file,
      code,
      ts.ScriptTarget.ES2023,
      true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const edits: Edit[] = [];
    if (isTsx) {
      collectJsx(source, edits);
      collectProperties(source, edits);
    }
    if (isCopy) {
      collectTemplates(source, edits);
      collectCopyObjects(source, edits);
    }
    if (edits.length === 0) continue;
    const used = [
      edits.some((edit) => edit.text.includes("tr(")) ? "tr" : "",
      edits.some((edit) => edit.text === "localized(") ? "localized" : "",
    ].filter(Boolean);
    writeFileSync(file, ensureImport(applyEdits(code, edits), used));
    report.push(`${String(edits.length).padStart(4)} edits  ${rel}`);
  }
  process.stdout.write(`${report.join("\n")}\n`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
