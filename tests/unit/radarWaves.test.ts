import { describe, expect, it } from "vitest";

import {
  advanceTime,
  ariaLabel,
  BANDS,
  BEAM_HALF,
  beamDistance,
  buildScene,
  clampIncidence,
  echoDotStep,
  echoStrength,
  inBeam,
  INCIDENCE,
  MAX_STEP_S,
  POLS,
  pulseGeometry,
  RADAR_WAVES_COPY,
  readout,
  rovingNext,
  SAT_MIN_X,
  waveAmp,
  wavePx,
  type BandId,
} from "@/pages/learn/radarWaves";

const DESKTOP = buildScene(700, 438);
const PHONE = buildScene(318, 199);
const IDS: BandId[] = ["L", "S", "C"];

describe("radar waves: band facts", () => {
  it("uses NISAR's sourced wavelengths, L 24 cm and S 9.4 cm, never 23 cm", () => {
    expect(BANDS.map(({ id, cm }) => `${id} ${cm}`)).toEqual(["L 24", "S 9.4", "C 5.6"]);
    expect(BANDS.map((band) => band.label)).toEqual([
      "L-band · 24 cm",
      "S-band · 9.4 cm",
      "C-band · 5.6 cm",
    ]);
    expect(JSON.stringify(BANDS)).not.toContain("23 cm");
  });

  it("never claims the pulse stops, reaches the ground or sees under the canopy", () => {
    const text = JSON.stringify({ BANDS, RADAR_WAVES_COPY }).toLowerCase();
    for (const claim of ["stops", "reaches the ground", "under forest canopy", "weaker"]) {
      expect(text, claim).not.toContain(claim);
    }
    expect(BANDS.map((band) => band.reachLabel)).toEqual([
      "REACHES DEEPEST",
      "SCATTERS IN THE BRANCHES",
      "SCATTERS AT THE LEAVES",
    ]);
  });

  it("offers HH and HV and the 33–47° range", () => {
    expect(POLS.map((pol) => pol.label)).toEqual(["HH · sent H, heard H", "HV · sent H, heard V"]);
    expect(INCIDENCE).toEqual({ min: 33, max: 47, step: 1, initial: 40 });
    expect(clampIncidence(20)).toBe(33);
    expect(clampIncidence(50.4)).toBe(47);
    expect(clampIncidence(40.6)).toBe(41);
  });
});

describe("radar waves: readout and label", () => {
  it("adds an angle line only at the ends of the range", () => {
    expect(readout("L", "HH", 40)).toEqual({
      title: "The long wave reaches deepest",
      body: "At 24 cm the pulse goes deeper into a tree canopy than shorter waves and interacts more with large branches and trunks. In HH the echo returns in the same horizontal plane it was sent.",
    });
    expect(readout("S", "HV", 38).body).toBe(
      "At 9.4 cm the pulse responds more to leaves, small branches and the tops of crops. In HV the echo comes back twisted to vertical, which mostly happens inside vegetation. A steeper angle looks more straight down and sees more of the ground.",
    );
    expect(readout("C", "HH", 43).body).toMatch(/A shallower angle crosses more canopy/);
    expect(readout("C", "HH", 42).body).not.toMatch(/angle/);
  });

  it("describes the drawing for screen readers", () => {
    expect(ariaLabel("S", "HV", 45)).toBe(
      "Diagram: S-band · 9.4 cm pulse at 45 degrees, HV echo. The middle wave scatters in the branches.",
    );
  });
});

describe("radar waves: roving tabindex", () => {
  it("moves with the arrows, wraps, and jumps with Home/End", () => {
    expect(rovingNext("ArrowRight", 0, 3)).toBe(1);
    expect(rovingNext("ArrowDown", 2, 3)).toBe(0);
    expect(rovingNext("ArrowLeft", 0, 3)).toBe(2);
    expect(rovingNext("ArrowUp", 1, 2)).toBe(0);
    expect(rovingNext("Home", 2, 3)).toBe(0);
    expect(rovingNext("End", 0, 3)).toBe(2);
    expect(rovingNext("Enter", 0, 3)).toBeUndefined();
    expect(rovingNext("Tab", 0, 3)).toBeUndefined();
  });
});

describe("radar waves: scene and geometry", () => {
  it("builds the same forest for the same size", () => {
    expect(buildScene(700, 438)).toEqual(DESKTOP);
    expect(DESKTOP.trees).toHaveLength(15);
    expect(DESKTOP.pts.filter((p) => p.depth === 0).length).toBe(1560);
  });

  it("scatters each band at its depth: L at the ground, S 45 %, C 14 % into the canopy", () => {
    const { canopyTop, canopyH, groundY } = DESKTOP;
    expect(pulseGeometry(DESKTOP, "L", 40).hitY).toBe(groundY + 2);
    expect(pulseGeometry(DESKTOP, "S", 40).hitY).toBeCloseTo(canopyTop + canopyH * 0.45);
    expect(pulseGeometry(DESKTOP, "C", 40).hitY).toBeCloseTo(canopyTop + canopyH * 0.14);
  });

  it("aims NISAR along the incidence angle when it isn't clamped", () => {
    for (const inc of [33, 40, 47]) {
      const g = pulseGeometry(DESKTOP, "C", inc);
      const drawn = (Math.atan2(g.hx - g.sx, g.hitY - g.sy) * 180) / Math.PI;
      expect(g.sx).toBeGreaterThan(SAT_MIN_X);
      expect(drawn).toBeCloseTo(inc, 6);
    }
  });

  it("keeps NISAR at x ≥ 112 on a phone at the shallowest angle", () => {
    for (const band of IDS) expect(pulseGeometry(PHONE, band, 47).sx).toBeGreaterThanOrEqual(112);
  });

  it("gives a unit beam vector with its normal", () => {
    const g = pulseGeometry(DESKTOP, "S", 41);
    expect(Math.hypot(g.ux, g.uy)).toBeCloseTo(1);
    expect(g.ux * g.nx + g.uy * g.ny).toBeCloseTo(0);
    expect(beamDistance(g, g.hx, g.hitY)).toBeCloseTo(0);
  });

  it("lights only front particles inside the beam and above the band's reach", () => {
    for (const band of IDS) {
      const g = pulseGeometry(DESKTOP, band, 40);
      const lit = DESKTOP.pts.filter((p) => inBeam(DESKTOP, g, band, p));
      expect(lit.length, band).toBeGreaterThan(0);
      for (const p of lit) {
        expect(p.depth).toBe(0);
        expect(beamDistance(g, p.x, p.y)).toBeLessThan(BEAM_HALF);
        expect(p.y).toBeLessThanOrEqual(band === "L" ? DESKTOP.groundY : g.hitY + 6);
      }
    }
    // C scatters at the top, so nothing below its hit point lights up.
    const c = pulseGeometry(DESKTOP, "C", 40);
    const deepest = Math.max(
      ...DESKTOP.pts.filter((p) => inBeam(DESKTOP, c, "C", p)).map((p) => p.y),
    );
    expect(deepest).toBeLessThanOrEqual(c.hitY + 6);
  });
});

describe("radar waves: waves", () => {
  it("draws every band with the same cm → px factor, so they stay to scale", () => {
    expect(wavePx(24, 900) / wavePx(9.4, 900)).toBeCloseTo(24 / 9.4);
    expect(wavePx(24, 900)).toBeCloseTo(57.6);
    expect(wavePx(5.6, 300)).toBe(10);
  });

  it("caps the amplitude and spaces HV dots at least half a wavelength apart", () => {
    expect(waveAmp(200)).toBe(11);
    expect(waveAmp(10)).toBeCloseTo(5.2);
    expect(echoDotStep(57.6)).toBeCloseTo(28.8);
    expect(echoDotStep(12)).toBe(10);
  });

  it("draws HV fainter than HH and shorter bands fainter than longer ones", () => {
    for (const band of IDS) expect(echoStrength(band, "HV")).toBeLessThan(echoStrength(band, "HH"));
    expect(echoStrength("L", "HH")).toBeGreaterThan(echoStrength("S", "HH"));
    expect(echoStrength("S", "HH")).toBeGreaterThan(echoStrength("C", "HH"));
  });

  it("resumes time where it stopped instead of jumping after a pause", () => {
    expect(advanceTime(2, undefined, 5000)).toBe(2);
    expect(advanceTime(2, 1000, 1016)).toBeCloseTo(2.016);
    expect(advanceTime(2, 1000, 60_000)).toBeCloseTo(2 + MAX_STEP_S);
    expect(advanceTime(2, 1000, 900)).toBe(2);
  });
});
