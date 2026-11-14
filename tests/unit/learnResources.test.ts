import { describe, expect, it } from "vitest";

import {
  allLearnLinks,
  LEARN_STEPS,
  OTHER_RADARS,
  resourceCount,
} from "@/pages/learn/learnResources";

// The design reference's homepage placeholders, which the exact challenge links replace.
const PLACEHOLDERS = [
  "https://nisar.jpl.nasa.gov/",
  "https://uavsar.jpl.nasa.gov/",
  "https://arset.gsfc.nasa.gov/",
  "https://www.asc-csa.gc.ca/eng/satellites/radarsat/",
  "https://www.asc-csa.gc.ca/eng/satellites/radarsat1/",
  "https://www.argentina.gob.ar/ciencia/conae/misiones-espaciales/saocom",
];

describe("learn resources", () => {
  it("links only to exact https pages, never a placeholder", () => {
    const links = allLearnLinks();
    expect(links).toHaveLength(15);
    for (const href of links) {
      expect(href, href).toMatch(/^https:\/\/[^#\s]+$/);
      expect(PLACEHOLDERS, href).not.toContain(href);
    }
  });

  it("has four steps with unique anchors, numbered in order", () => {
    expect(LEARN_STEPS.map((step) => step.n)).toEqual(["01", "02", "03", "04"]);
    expect(new Set(LEARN_STEPS.map((step) => step.anchor)).size).toBe(4);
    for (const step of LEARN_STEPS) expect(step.items.length).toBeGreaterThan(0);
  });

  it("counts each step's resources for the hero index", () => {
    expect(LEARN_STEPS.map(resourceCount)).toEqual([
      "3 RESOURCES",
      "2 RESOURCES",
      "3 RESOURCES",
      "2 RESOURCES",
    ]);
  });

  it("lists the three partner radars with their bands", () => {
    expect(OTHER_RADARS.map(({ name, band }) => `${name} ${band}`)).toEqual([
      "SAOCOM L",
      "RADARSAT Constellation C",
      "RADARSAT-1 archive C",
    ]);
  });
});
