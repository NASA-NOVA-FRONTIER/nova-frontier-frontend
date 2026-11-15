import { describe, expect, it } from "vitest";

import * as copy from "@/content/copyV9";
import {
  CONFIRM,
  CONFIRM_NOTES,
  EARTHQUAKE_SETTINGS,
  EMPTY_GLOBE,
  INFO_TIP,
  LAYERS,
  LOOK,
  MEASURED_CASE,
  PHENOMENA,
  PHENOMENON_LABEL,
  PRESET_NAME,
  PROCESSING,
  RESULT,
  RESULT_CARD,
  statOf,
  TIMELINE,
  TIPS,
} from "@/content/copyV9";

const LENS_IDS = ["flood_wetland", "insar", "vegetation_disturbance", "wildfire"];

// Every visible string in the module, templates filled with a placeholder value.
const strings = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (typeof value === "function")
    return strings((value as (...args: unknown[]) => unknown)("1", "1", "1", "1", "1", "1", "1"));
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === "object" && value !== null) return Object.values(value).flatMap(strings);
  return [];
};

// The handoff text the 15 Nov corrections replace (validation.md C2–C14 and the decisions).
const FORBIDDEN: readonly (string | RegExp)[] = [
  /ALL STRADDLE/i, // C2: Kumamoto is a chain of intervals
  "79 of 4,096", // C3: High Plains, the stable control
  "show what is ready", // C8: a stopped job has no result
  /vs first|since first|than the first pass|versus the first pass/i, // C9
  /USGS/, // C12: no event catalogue
  "28 Jul", // C2/C12: invented event date
  "07-28",
  /around the event/i, // C2/C11
  "Event ± 60 days", // decision: "Last 5 months" for every GCOV lens
  "45 days before",
  /\d–\d+ min/, // C7: one p80, never a range
  /STAND-IN|PROTOTYPE/, // C6
  "correction-input", // C14
  /landslide|agricultur/i, // C1
  "Each fringe is about 12 cm", // C13: lives in the phase ⓘ instead
  "Orange dots", // decision: FIRMS counts only
  "reference perimeter", // decision: live squares have no perimeter
  "fire start",
];

const ALL = strings(copy);

describe("forbidden handoff strings", () => {
  it("collects the module's strings", () => {
    expect(ALL.length).toBeGreaterThan(150);
  });

  it.each(FORBIDDEN.map((rule) => [String(rule), rule] as const))("never says %s", (_, rule) => {
    const hits = ALL.filter((text) =>
      typeof rule === "string" ? text.includes(rule) : rule.test(text),
    );
    expect(hits).toEqual([]);
  });

  it("mentions the event only in the sourced-event templates (C2)", () => {
    const eventOnly = [
      MEASURED_CASE.passLineEvent,
      RESULT_CARD.insar.body.event,
      TIMELINE.eventMarker,
      TIMELINE.straddle,
    ].flatMap(strings);
    expect(ALL.filter((text) => /\bevent\b/i.test(text) && !eventOnly.includes(text))).toEqual([]);
  });

  it("never calls Rowe Creek deforestation (C3)", () => {
    expect(ALL.filter((text) => /rowe creek/i.test(text) && /deforestation/i.test(text))).toEqual(
      [],
    );
  });

  it("says 12 cm only in the phase ⓘ, as not a displacement (C13)", () => {
    expect(ALL.filter((text) => text.includes("12 cm"))).toEqual([TIPS.layer.phase]);
    expect(TIPS.layer.phase).toContain("not a displacement");
  });
});

describe("lens keys (C1)", () => {
  it("uses the four live lens ids everywhere", () => {
    for (const record of [PHENOMENON_LABEL, PRESET_NAME, LOOK, LAYERS, RESULT_CARD])
      expect(Object.keys(record).sort()).toEqual(LENS_IDS);
    expect([...PHENOMENA].sort()).toEqual(LENS_IDS);
  });

  it("keeps COPY's chip order", () => {
    expect(PHENOMENA.map((lens) => PHENOMENON_LABEL[lens])).toEqual([
      "Earthquake",
      "Wildfire",
      "Deforestation",
      "Flood",
    ]);
  });

  it("uses the corrected presets", () => {
    expect(PRESET_NAME).toEqual({
      flood_wetland: "Last 5 months",
      wildfire: "Last 5 months",
      vegetation_disturbance: "Last 5 months",
      insar: "The 5 most recent passes",
    });
  });

  it("opens each lens on its first layer", () => {
    expect(LAYERS.flood_wetland.map((layer) => layer.label)).toEqual([
      "HH",
      "Change vs baseline median",
      "Darkening signature",
    ]);
    expect(LAYERS.insar.map((layer) => layer.id)).toEqual(["coh", "phase"]);
  });
});

describe("templates", () => {
  it("has the InfoTip label", () => {
    expect(INFO_TIP.label).toBe("What is this?");
  });

  it("fills the empty globe and confirm panel", () => {
    expect(EMPTY_GLOBE.casesKicker(12)).toBe("12 MEASURED CASES");
    expect(CONFIRM.preset(PRESET_NAME.insar)).toBe("PRESET · THE 5 MOST RECENT PASSES");
    expect(CONFIRM.passLine(1234, 7, "112", "descending")).toBe(
      "1,234 NISAR passes here · 7 in range · 5 will be read · track 112 descending",
    );
    expect(CONFIRM.passLineShort(4, 4, "24", "ascending")).toBe(
      "4 NISAR passes here · 4 in range · track 24 ascending",
    );
    expect(CONFIRM.stripLabel("insar")).toBe("Which passes to compare");
    expect(CONFIRM.stripLabel("wildfire")).toBe("Which passes to read");
    expect(CONFIRM.waitLineOnline).toBe("Computed live · we stop at 8 min");
  });

  it("fills the notes, with singular and plural passes", () => {
    expect(CONFIRM_NOTES.fewBody(1)).toBe(
      "Only 1 pass fall in this range. An analysis needs at least 4 to compare against the place's own history.",
    );
    expect(CONFIRM_NOTES.fewBody(3)).toContain("Only 3 passes fall");
    expect(CONFIRM_NOTES.noPairBody(1)).toBe(
      "Only 1 pass in this range. A pair needs two passes from the same orbit.",
    );
    expect(CONFIRM_NOTES.widen("10 Jun", "7 Nov 2026", 9)).toBe(
      "Widen to 10 Jun → 7 Nov 2026 (9 passes)",
    );
    expect(CONFIRM_NOTES.fourBody("2 Aug", "26 Aug")).toBe(
      "The sequence will show 4 measured passes with their real gaps, not 5. NISAR has no pass here between 2 Aug and 26 Aug.",
    );
    expect(CONFIRM_NOTES.noDataBody("27 Nov 2026", "112", "descending")).toContain(
      "next one on 27 Nov 2026 (track 112, descending).",
    );
  });

  it("fills the earthquake settings", () => {
    expect(EARTHQUAKE_SETTINGS.pairLine("26 Jul", "7 Aug", 12)).toBe(
      "Pair 26 Jul → 7 Aug · 12 days · tap an arc to change",
    );
    expect(EARTHQUAKE_SETTINGS.summary("26 Jul", "7 Aug", "0.35")).toBe(
      "Pair 26 Jul → 7 Aug · threshold 0.35",
    );
    expect(EARTHQUAKE_SETTINGS.thresholdDefault("0.35")).toBe("0.35 · default");
  });

  it("adds the straddle tail only on request (C2)", () => {
    expect(MEASURED_CASE.passLine(4, "24", "ascending")).toBe("4 passes · track 24 ascending");
    expect(MEASURED_CASE.passLineEvent(4, "24", "ascending", 2)).toBe(
      "4 passes · track 24 ascending · 2 pairs straddle the event",
    );
    expect(MEASURED_CASE.kicker("Kumamoto")).toBe("MEASURED CASE · KUMAMOTO");
  });

  it("writes the estimate from one p80 (C7)", () => {
    expect(PROCESSING.estimate("4 min")).toBe("Usually under 4 min");
    expect(PROCESSING.estimateExceeded("4 min")).toBe("Estimate was under 4 min");
    expect(PROCESSING.stepRead(2, 5)).toBe("2 of 5 read");
    expect(PROCESSING.factCounter(3)).toBe("FACT 3 OF 10");
    expect(PROCESSING.factSource("NASA Earthdata · SAR")).toBe("Source: NASA Earthdata · SAR");
  });

  it("fills the result stamp, range and stat", () => {
    expect(RESULT.stampFirst("10 JUN 2026", 5)).toBe("10 JUN 2026 · PASS 1 OF 5 · REFERENCE");
    expect(RESULT.stamp("22 JUN 2026", 2, 5, 12)).toBe(
      "22 JUN 2026 · PASS 2 OF 5 · 12 DAYS AFTER PASS 1",
    );
    expect(RESULT.stampQuake("9 JUL", "21 JUL 2026", 1, 3, 12)).toBe(
      "9 JUL → 21 JUL 2026 · INTERVAL 1 OF 3 · 12 DAYS",
    );
    expect(RESULT.rangeLine("10 Jun", "7 Nov 2026", 5)).toBe("10 JUN → 7 NOV 2026 · 5 PASSES");
    expect(RESULT.rangeLineQuake(1, "9 Jul", "21 Jul 2026")).toBe("1 PAIR · 9 JUL → 21 JUL 2026");
    expect(RESULT.originTitle("24")).toBe("NISAR, track 24");
    expect(statOf(1911, 16384)).toBe("1,911 of 16,384");
  });

  it("fills the earthquake card (C2, C14)", () => {
    expect(RESULT_CARD.insar.body.pair("9 Jul", "21 Jul")).toBe(
      "The pair 9 Jul → 21 Jul kept its phase in parts of the square. The phase is wrapped and uncorrected for the atmosphere, so it shows a pattern of change, not a distance.",
    );
    expect(RESULT_CARD.insar.statLabel("0.35")).toBe("window cells with phase above 0.35");
  });

  it("fills the timeline", () => {
    expect(TIMELINE.title(2, 5, "22 Jun 2026")).toBe("Pass 2 of 5 · 22 Jun 2026");
    expect(TIMELINE.sub(5, "10 Jun", "7 Nov 2026", "24", "asc")).toBe(
      "5 MEASURED PASSES · 10 JUN → 7 NOV 2026 · TRACK 24 ASC",
    );
    expect(TIMELINE.subQuake(1)).toBe("1 MEASURED PAIR · NEWEST FIRST");
    expect(TIMELINE.subQuakeCase(3)).toBe("3 MEASURED PAIRS");
    expect(TIMELINE.eventMarker("16 Apr 2016")).toBe("EVENT · 16 APR 2016");
    expect(TIMELINE.gap(24)).toBe("24 D");
    expect(TIMELINE.fewer(3, "36 days", "2 Aug", "7 Sep")).toBe(
      "Pass 3 of 4 · 4 MEASURED PASSES · 36 days with no pass between 2 Aug and 7 Sep",
    );
  });
});
