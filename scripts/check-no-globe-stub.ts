// Fails when a build contains the E2E stub globe. CI runs it on the production dist/ after `pnpm build`.
// Run with: pnpm check:no-stub [dir]   (the stub build, dist-e2e-stub, must fail it)

import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const DIR = process.argv[2] ?? "dist";
// Markers that only GlobeView.stub.tsx puts in a bundle (".__globe", not the "x-top__globe" class).
const MARKERS = ['"data-globe"', "data-globe=", ".__globe"];
const TEXT = new Set([".html", ".js", ".mjs", ".css"]);

const files = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? files(path) : Promise.resolve([path]);
    }),
  );
  return nested.flat();
};

const all = (await files(DIR)).filter((path) => TEXT.has(extname(path)));
const hits: string[] = [];
for (const path of all) {
  const text = await readFile(path, "utf8");
  for (const marker of MARKERS) if (text.includes(marker)) hits.push(`${path}: ${marker}`);
}

if (hits.length > 0) {
  process.stderr.write(`The E2E stub globe is in ${DIR}:\n${hits.join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`No E2E stub globe in ${DIR} (${all.length} files checked).\n`);
