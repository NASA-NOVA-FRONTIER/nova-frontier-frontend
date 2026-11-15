import { describe, expect, it } from "vitest";

import { CASES, coherenceOnlyLabel, LENSES } from "@/features/cases/cases";
import {
  caseCountry,
  caseHref,
  caseSummary,
  filterCases,
  filterOptions,
  QUESTION_ICONS,
  statSource,
  VERDICT_LABEL,
} from "@/pages/cases/casesView";
import { reportSummary } from "@/pages/report/reportSummary";

describe("cases page filter", () => {
  it("keeps only the cases that ask the chosen question", () => {
    const floods = filterCases(CASES, "flood_wetland");
    expect(floods.map(({ id }) => id)).toEqual(["qadirabad"]);
    expect(filterCases(CASES, "all")).toHaveLength(CASES.length);
  });

  it("lists every lens with its count: one demo case each (issue #28)", () => {
    const options = filterOptions();
    // The landslide question has no live lens; it is listed because Niscemi asks it.
    expect(options.map(({ id }) => id)).toEqual([
      "all",
      ...LENSES.map(({ id }) => id),
      "observed_dynamics",
    ]);
    expect(options.find(({ id }) => id === "all")?.count).toBe(CASES.length);
    for (const option of options.filter(({ id }) => id !== "all"))
      expect(option.count, option.id).toBe(1);
    const total = options.filter(({ id }) => id !== "all").reduce((sum, o) => sum + o.count, 0);
    expect(total).toBe(CASES.length);
  });
});

describe("case card copy", () => {
  it("links every case to the explorer", () => {
    for (const item of CASES) expect(caseHref(item)).toBe(`/explore?case=${item.id}`);
  });

  it("names the country after the place", () => {
    const qadirabad = CASES.find(({ id }) => id === "qadirabad");
    expect(qadirabad && caseCountry(qadirabad)).toBe("Pakistan");
  });

  // P0 copy pass: a coherence-only case names its state and what the coherence means, never "Pending".
  it("explains a coherence-only case instead of showing a bare stat", () => {
    const choco = CASES.find(({ id }) => id === "choco");
    expect(choco && caseSummary(choco)).not.toMatch(/Pending/);
    expect(choco && caseSummary(choco)).toBe(
      "Coherence 0.247 between two passes. Low coherence: the surface changed or vegetation decorrelated the echo.",
    );
    expect(choco && coherenceOnlyLabel(choco)).toBe("Coherence only · 0.247");
  });

  it("asks the interferometric question about the echo, not about ground motion", () => {
    expect(LENSES.find(({ id }) => id === "insar")?.chip).toBe("Did the ground keep its echo?");
  });

  it("sources Chocó's median to the confirmation it came from", () => {
    const choco = CASES.find(({ id }) => id === "choco");
    expect(choco && statSource(choco)).toBe(
      "Median coherence, fixed 0–1 scale. Confirmed by Daniel, 11 Nov.",
    );
  });
});

describe("ground-motion case verdict", () => {
  // Regression: "Not enough radar yet" sat next to "39,584 of 62,500 cells kept their phase".
  it("labels Chocó as measured, not as missing radar", () => {
    const insar = CASES.filter(({ lens }) => lens === "insar");
    expect(insar.map(({ id, verdict }) => `${id} ${verdict}`)).toEqual(["choco measured"]);
    expect(VERDICT_LABEL.measured).toBe("Measured, not a verdict");
  });

  it("writes no verdict into a measured case's report summary", () => {
    const choco = CASES.find(({ id }) => id === "choco");
    const summary = choco === undefined ? "" : reportSummary(choco);
    expect(summary).toContain("was asked “Did the ground keep its echo?” Coherence 0.247");
    expect(summary).not.toContain("Verdict:");
    expect(summary).not.toContain("Not enough radar yet");
  });
});

describe("ask-the-radar card icons", () => {
  it("shows the four live questions, with no landslide and no earthquake", () => {
    expect(QUESTION_ICONS.map(({ id }) => id)).toEqual([
      "flood",
      "deforestation",
      "wildfire",
      "agriculture",
    ]);
    expect(QUESTION_ICONS.map(({ label }) => label)).toContain("Did it flood?");
  });
});
