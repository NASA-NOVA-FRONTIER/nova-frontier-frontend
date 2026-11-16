import { VERDICT } from "@/features/case-panel/verdicts";
import {
  CASES,
  LENSES,
  OBSERVED_DYNAMICS,
  type Case,
  type CaseLensId,
  type IconId,
  type CaseVerdict,
} from "@/features/cases/cases";

// Copy for the backend's three outcomes plus ground motion's "measured"; the glyph shape tells them
// apart, never colour alone.
export const VERDICT_LABEL: Record<CaseVerdict, string> = {
  departure: VERDICT.departure.label,
  within: VERDICT.within.label,
  insufficient: VERDICT.insufficient.label,
  measured: VERDICT.measured.label,
};

export type CaseFilter = CaseLensId | "all";

export type FilterOption = { id: CaseFilter; label: string; icon?: IconId; count: number };

export const filterCases = (cases: Case[], filter: CaseFilter): Case[] =>
  filter === "all" ? cases : cases.filter((item) => item.lens === filter);

// Every lens stays listed, even with no case yet, so the page shows what the radar can be asked. The
// landslide question has no live lens, so it is listed only while a case asks it.
export const filterOptions = (cases: Case[] = CASES): FilterOption[] => {
  const observed = filterCases(cases, "observed_dynamics").length;
  return [
    { id: "all", label: "All", count: cases.length },
    ...LENSES.map((lens) => ({
      id: lens.id,
      label: lens.chip,
      icon: lens.icon,
      count: filterCases(cases, lens.id).length,
    })),
    ...(observed === 0
      ? []
      : [
          {
            id: "observed_dynamics" as const,
            label: OBSERVED_DYNAMICS.chip,
            icon: OBSERVED_DYNAMICS.icon,
            count: observed,
          },
        ]),
  ];
};

// "Chenab River, Pakistan" → "Pakistan": the carousel names the case by place and country.
export const caseCountry = (item: Case): string =>
  item.place.split(",").at(-1)?.trim() ?? item.place;

// A coherence-only case leads with what its coherence means, not with a bare number.
export const caseSummary = (item: Case): string =>
  item.coherenceOnly === true ? item.verdictLine : `${item.stat} ${item.statLine}`;

export const caseHref = (item: Case): string => `/explore?case=${item.id}`;

// Where a card's headline number comes from (SPECS §7), for the REAL chip's tooltip. The first
// listed source can be the event bulletin, which has no radar numbers in it.
export const statSource = (item: Case): string =>
  item.statSource ?? "nova-frontier-model · flood_pilot_summary.json and FLOOD_CHARACTERIZATION.md";

// The bottom card's icons: the four questions a live point answers (ground motion asks for a pair,
// observed_dynamics is offline only).
export const QUESTION_ICONS: { id: IconId; label: string }[] = LENSES.filter(
  ({ id }) => id !== "insar" && id !== "observed_dynamics",
).map(({ icon, chip }) => ({ id: icon, label: chip }));
