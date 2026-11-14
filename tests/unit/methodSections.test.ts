import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EchoSimulator } from "@/pages/method/sections/EchoSimulator";
import { Interferometry } from "@/pages/method/sections/Interferometry";
import {
  ECHO_COPY,
  INSAR_COPY,
  INSAR_FIGURES,
  SURFACE_IDS,
  SURFACES,
  WAVES,
  WAVES_COPY,
} from "@/pages/method/sections/sectionsContent";
import {
  barWidth,
  formatDb,
  nextSurface,
  scaleBarWidth,
  wavePath,
  wavePeriod,
  waveShift,
} from "@/pages/method/sections/sectionsLogic";
import { Wavelengths } from "@/pages/method/sections/Wavelengths";

describe("echo simulator", () => {
  it("places dB on the fixed −30…0 axis and clamps outside it", () => {
    expect(barWidth(-3)).toBe("90.0%");
    expect(barWidth(-12)).toBe("60.0%");
    expect(barWidth(-30)).toBe("0.0%");
    expect(barWidth(-35)).toBe("0.0%");
    expect(barWidth(4)).toBe("100.0%");
    expect(formatDb(-3)).toBe("−3 dB");
  });

  it("keeps the reference's typical values", () => {
    const values = SURFACE_IDS.map((id) => [id, SURFACES[id].hh, SURFACES[id].hv]);
    expect(values).toEqual([
      ["water", -25, -30],
      ["forest", -8, -13],
      ["field", -12, -20],
      ["city", -3, -12],
    ]);
  });

  it("moves with arrow keys, wraps both ways and jumps with Home/End", () => {
    expect(nextSurface("water", "ArrowRight")).toBe("forest");
    expect(nextSurface("city", "ArrowRight")).toBe("water");
    expect(nextSurface("water", "ArrowLeft")).toBe("city");
    expect(nextSurface("field", "ArrowUp")).toBe("forest");
    expect(nextSurface("forest", "ArrowDown")).toBe("field");
    expect(nextSurface("field", "Home")).toBe("water");
    expect(nextSurface("water", "End")).toBe("city");
    expect(nextSurface("water", "Enter")).toBeNull();
  });

  it("renders City with its title, bars and the illustrative chip (never REAL)", () => {
    const html = renderToStaticMarkup(createElement(EchoSimulator, { initialSurface: "city" }));
    expect(html).toContain("Wall and street send it straight back.");
    expect(html).toMatch(/data-testid="echo-value-hh"[^>]*>−3 dB/);
    expect(html).toMatch(/data-testid="echo-value-hv"[^>]*>−12 dB/);
    expect(html).toContain("width:90.0%");
    expect(html).toContain("width:60.0%");
    expect(html).toContain(ECHO_COPY.chip);
    expect(html).not.toContain("c-prov--real");
    expect(html).toContain('aria-checked="true"');
    expect(html.match(/role="radio"/g)).toHaveLength(4);
  });
});

describe("wavelengths", () => {
  it("draws every band at one scale (1 cm = 10 units)", () => {
    expect(WAVES.map((w) => wavePeriod(w.cm))).toEqual([240, 94, 56]);
    expect(WAVES.map((w) => w.loopSeconds)).toEqual([7, 5, 4]);
    expect(scaleBarWidth(24)).toBe("40.00%");
  });

  it("loops by exactly one wavelength, so the loop has no seam", () => {
    expect(waveShift(24)).toBe("-20.0000%");
    // The path repeats after one period: the y at x = 0 equals the y at x = period.
    const path = wavePath(24);
    expect(path.startsWith("M0,32.0")).toBe(true);
    expect(path).toContain(" L240,32.0 ");
  });

  it("states the frequencies of the common note", () => {
    expect(WAVES_COPY.footnote).toContain("L-band 24 cm (1.26 GHz)");
    expect(WAVES_COPY.footnote).toContain("S-band 9.4 cm (3.2 GHz)");
    expect(WAVES_COPY.footnote).toContain("C-band about 5.6 cm (5.4 GHz)");
    const html = renderToStaticMarkup(createElement(Wavelengths));
    expect(html.match(/data-testid="wave-[lsc]-band"/g)).toHaveLength(3);
  });
});

describe("interferometry", () => {
  it("never calls the 62,500 window cells coherent (common note §1)", () => {
    expect(INSAR_COPY.statText).toBe(
      "of 62,500 cells kept their phase at the 0.35 coherence threshold",
    );
    expect(JSON.stringify(INSAR_COPY)).not.toContain("coherent cells");
    expect(INSAR_COPY.chip).toBe("REAL · KUMAMOTO · 21 JUL → 14 AUG 2026 · RUN 12 NOV 2026");
  });

  it("speaks of path length, never of centimetres of displacement", () => {
    const all = JSON.stringify([INSAR_COPY, INSAR_FIGURES, WAVES_COPY, SURFACES, ECHO_COPY]);
    expect(all).not.toMatch(/centimet|displacement/i);
    expect(INSAR_COPY.lead).toContain("about 12 cm of change in the radar's path length");
  });

  it("keeps the report's magma legend and caption on the coherence crop", () => {
    const coherence = INSAR_FIGURES.find((f) => f.id === "coherence");
    expect(coherence?.bar).toContain("#000004");
    expect(coherence?.bar).toContain("#fcfdbf");
    expect(coherence?.caption).toContain("Report figure colours.");
    // The figure is the report's ≈ 20 km crop, not the 5 km stat window.
    const captions = INSAR_FIGURES.map((f) => f.caption).join(" ") + INSAR_COPY.footnote;
    expect(captions).not.toContain("5 km");
  });

  it("renders both figures from public/insar and the REAL stat chip", () => {
    const html = renderToStaticMarkup(createElement(Interferometry));
    expect(html).toContain('src="/insar/kumamoto-wrapped-phase.png"');
    expect(html).toContain('src="/insar/kumamoto-coherence.png"');
    expect(html).toContain("c-prov--real");
    expect(html).toContain("39,584");
  });
});
