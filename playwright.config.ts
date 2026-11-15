import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI) && process.env.CI !== "false";
// Own port and env, so tests never depend on a developer's running server or .env.local.
// E2E_PORT lets parallel worktrees run their own server.
const PORT = Number(process.env.E2E_PORT ?? 5174);
const STUB_PORT = PORT + 1;
const url = (port: number): string => `http://localhost:${port}`;
// CI shards download the builds made once by the build job, so they only serve them.
const prebuilt = process.env.E2E_PREBUILT === "1";
// UI tests run on the stub globe (dist-e2e-stub) unless E2E_GLOBE=real: pushes to main run the whole
// suite on Cesium, so a stub/real mismatch shows up within one merge. @globe tests are always real.
const STUB = process.env.E2E_GLOBE !== "real";

const serve = (dir: string, port: number, build: string) => ({
  // The production build, as deployed: no dev-server reloads mid-test.
  command: `${prebuilt ? "" : `${build} && `}pnpm preview --outDir ${dir} --port ${port} --strictPort`,
  url: url(port),
  reuseExistingServer: !isCI,
  timeout: 120_000,
});
const desktop = { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } };

export default defineConfig({
  testDir: "./tests/e2e",
  tsconfig: "./tsconfig.node.json", // resolves the @/ alias in tests
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Real-globe tests render Cesium in software WebGL; more than 2 of them starve the CPU (per project below).
  workers: STUB ? 4 : 2,
  // On CI each shard writes a blob report; the final job merges them into one HTML report.
  reporter: isCI
    ? [["list"], ["blob"]]
    : [["list"], ["html", { outputFolder: "test-results/html-report", open: "never" }]],
  outputDir: "test-results/test-output",
  // Software WebGL is slow; same budget as the work monorepo.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    // Stops the idle spin so the frame under the screen centre is predictable.
    reducedMotion: "reduce",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Headless Chromium has no GPU; SwiftShader gives Cesium a software WebGL context.
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  projects: [
    {
      name: "ui",
      grepInvert: /@globe/,
      metadata: { globe: STUB ? "stub" : "real" },
      workers: STUB ? 4 : 2,
      use: { ...desktop, baseURL: url(STUB ? STUB_PORT : PORT) },
    },
    {
      name: "globe",
      grep: /@globe/,
      metadata: { globe: "real" },
      workers: 2,
      use: { ...desktop, baseURL: url(PORT) },
    },
  ],
  webServer: [
    serve("dist", PORT, "pnpm build"),
    ...(STUB ? [serve("dist-e2e-stub", STUB_PORT, "pnpm build:e2e-stub")] : []),
  ],
});
