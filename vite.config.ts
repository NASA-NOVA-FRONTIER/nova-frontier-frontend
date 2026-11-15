/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const CESIUM_BUILD = "node_modules/cesium/Build/Cesium";

// E2E only (`pnpm build:e2e-stub`): a stub replaces the Cesium globe so UI tests skip its boot.
// Production builds never set the flag; Vercel refuses it outright.
const GLOBE_STUB = process.env.VITE_E2E_GLOBE === "stub";
if (GLOBE_STUB && process.env.VERCEL !== undefined)
  throw new Error("VITE_E2E_GLOBE=stub is for E2E builds only, never a Vercel deploy");
const SRC = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Cesium fetches workers and assets at runtime, so they must be served as static files.
    viteStaticCopy({
      targets: ["Workers", "ThirdParty", "Assets", "Widgets"].map((dir) => ({
        src: `${CESIUM_BUILD}/${dir}`,
        dest: "cesium",
        rename: { stripBase: 4 }, // drops node_modules/cesium/Build/Cesium
      })),
    }),
  ],
  resolve: {
    // Order matters: the stub's exact match must come before the "@" prefix.
    alias: [
      ...(GLOBE_STUB
        ? [
            {
              find: /^@\/features\/globe\/GlobeView$/,
              replacement: `${SRC}/features/globe/GlobeView.stub.tsx`,
            },
          ]
        : []),
      { find: "@", replacement: SRC },
    ],
  },
  // /api reaches a local backend while developing; production proxies it through Vercel.
  server: {
    port: 5173,
    proxy: { "/api": process.env.VITE_DEV_API_TARGET ?? "http://localhost:8000" },
  },
  test: { include: ["tests/unit/**/*.test.ts"] },
});
