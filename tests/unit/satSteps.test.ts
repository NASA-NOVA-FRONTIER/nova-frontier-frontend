import { describe, expect, it } from "vitest";

import { SATELLITE_PARTS } from "@/features/satellite/satelliteParts";
import { SAT_STAGE } from "@/pages/method/methodContent";
import {
  SAT_STEPS,
  satStagePose,
  satStepIndex,
  satStepProgress,
  stepBlend,
} from "@/pages/method/satSteps";

const textOf = (i: number): string =>
  SAT_STEPS[i]?.items.map(({ title, body }) => `${title} ${body}`).join(" ") ?? "";

describe("teardown steps", () => {
  it("runs launch → deployed → reflector → boom → radars → bus + solar → looking sideways", () => {
    expect(SAT_STEPS.map(({ kicker }) => kicker)).toEqual([
      "STOWED FOR LAUNCH",
      "DEPLOYED IN ORBIT",
      "REFLECTOR",
      "BOOM",
      "RADARS",
      "BUS + SOLAR ARRAY",
      "LOOKING SIDEWAYS",
    ]);
    expect(SAT_STEPS.map(({ shape }) => shape.focus)).toEqual([
      null,
      null,
      ["reflector"],
      ["boom"],
      ["radars"],
      ["bus", "solar"],
      null,
    ]);
  });

  it("names each part with its role, verbatim from the hotspot and stage copy", () => {
    const approved = new Set([
      ...SATELLITE_PARTS.map(({ title, body }) => `${title}|${body}`),
      ...SAT_STAGE.steps.map(({ title, body }) => `${title}|${body}`),
    ]);
    for (const step of SAT_STEPS) {
      for (const { title, body } of step.items) {
        expect(approved.has(`${title}|${body}`), title).toBe(true);
      }
    }
    // The reflector step, the spec's example: 12 m of gold mesh focusing the radar.
    expect(textOf(2)).toContain("12 m reflector");
    expect(textOf(2)).toContain("Gold-plated wire mesh");
  });

  it("links every step to a NASA, JPL or ISRO page over https", () => {
    for (const step of SAT_STEPS) {
      expect(step.sources.length, step.kicker).toBeGreaterThan(0);
      for (const { href } of step.sources) {
        expect(new URL(href).protocol).toBe("https:");
        expect(new URL(href).hostname, href).toMatch(/(^|\.)(nasa\.gov|isro\.gov\.in)$/);
      }
    }
  });

  it("states centimetres only as wavelengths, never as motion from coherence", () => {
    const all = SAT_STEPS.map((_, i) => textOf(i)).join(" ");
    expect(all.match(/[\d.]+\s?cm/g)).toEqual(["24 cm", "9.4 cm"]);
    expect(all).not.toMatch(/coheren/i);
    expect(all).not.toMatch(/centimet/i);
  });
});

describe("step progress", () => {
  it("shows the nearest step and puts each one at rest at index / 6", () => {
    expect(satStepIndex(0)).toBe(0);
    expect(satStepIndex(1 / 12 - 0.001)).toBe(0);
    expect(satStepIndex(1 / 12 + 0.001)).toBe(1);
    expect(satStepIndex(2 / 6)).toBe(2);
    expect(satStepIndex(1)).toBe(6);
    expect(satStepIndex(1.4)).toBe(6);
    for (let i = 0; i < SAT_STEPS.length; i++) expect(satStepIndex(satStepProgress(i))).toBe(i);
  });

  it("holds each step still at both ends and eases between", () => {
    expect(stepBlend(0.1)).toBe(0);
    expect(stepBlend(0.9)).toBe(1);
    expect(stepBlend(0.5)).toBeCloseTo(0.5);
  });
});

describe("satStagePose", () => {
  it("starts stowed, then deploys, then pulls the reflector out and fades the rest", () => {
    expect(satStagePose(0, false)).toMatchObject({ deploy: 0, explode: 0 });
    expect(satStagePose(satStepProgress(1), false)).toMatchObject({ deploy: 1, explode: 0 });
    const reflector = satStagePose(satStepProgress(2), false);
    expect(reflector.explode).toBe(1);
    expect(reflector.parts).toEqual({
      reflector: 1,
      boom: 0.15,
      radars: 0.15,
      bus: 0.15,
      solar: 0.15,
    });
    expect(reflector.look.from).toBe("reflector");
  });

  it("ends assembled with the beam on", () => {
    expect(satStagePose(1, false)).toMatchObject({ beam: 1, explode: 0, deploy: 1 });
    expect(Object.values(satStagePose(1, false).parts)).toEqual([1, 1, 1, 1, 1]);
  });

  it("blends between steps, but reduced motion cuts at the halfway point", () => {
    const between = satStepProgress(1) + 0.5 / 6;
    expect(satStagePose(between, false).explode).toBeCloseTo(0.5);
    expect(satStagePose(between - 0.01, true).explode).toBe(0);
    expect(satStagePose(between + 0.001, true).explode).toBe(1);
    expect(satStagePose(between + 0.001, true).deploy).toBe(1);
  });
});
