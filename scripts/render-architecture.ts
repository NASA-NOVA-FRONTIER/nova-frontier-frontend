// Renders docs/architecture/architecture.html to a 2× PNG for the READMEs.
// Run with: pnpm diagram (needs network: fonts and icons come from pinned CDNs).

import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const SOURCE = new URL("../docs/architecture/architecture.html", import.meta.url);
const OUTPUT = fileURLToPath(new URL("../docs/architecture/architecture.png", import.meta.url));

const main = async (): Promise<void> => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1250 },
      deviceScaleFactor: 2,
    });
    await page.goto(SOURCE.href, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    // A missing icon or font would ship silently in the PNG, so fail instead.
    const broken = await page
      .locator("img")
      .evaluateAll((images: HTMLImageElement[]) =>
        images.filter((image) => image.naturalWidth === 0).map((image) => image.src),
      );
    if (broken.length > 0) throw new Error(`Icons did not load: ${broken.join(", ")}`);
    const fontsLoaded = await page.evaluate(() => document.fonts.check('700 22px "Albert Sans"'));
    if (!fontsLoaded) throw new Error("Albert Sans did not load");
    await page.locator("#diagram").screenshot({ path: OUTPUT });
    process.stdout.write(`Wrote ${OUTPUT}\n`);
  } finally {
    await browser.close();
  }
};

await main();
