import { TOP_BAR } from "@/content/copyV8";
import { CONFIRM, CONFIRM_NOTES, type V9LensId } from "@/content/copyV9";
import type { LensId } from "@/features/cases/cases";
import type { InsarPair } from "@/features/insar/insarApi";
import type { Coverage } from "@/features/spot/coverageApi";
import { spotWait } from "@/features/spot/spot";

/*
 * The confirm panel's rules (SPECS-flow-v9 §1.3 and §2), pure so the panel and the tests read the
 * same answer. Every date comes from /coverage or /insar/pairs; nothing is filled in.
 */

const DAY_MS = 86_400_000;
// The backend's MAX_IMAGES / MIN_IMAGES: 5 is normal, 4 allowed, 3 or fewer blocked.
export const MAX_PASSES = 5;
const MIN_PASSES = 4;
// Earthquake preset "The 5 most recent passes".
const QUAKE_PRESET_PASSES = 5;

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

// Agriculture stays out of the live selector (C1): an old link asking for it opens on Flood.
export const confirmLensOf = (lens: LensId): V9LensId =>
  lens === "agriculture" ? "flood_wetland" : lens;

export type Series = { track: string; direction: string };

// The backend's series key reads `{track}_{A|D}_{frame}_…` ("084_A_018_4005_DHDH").
const SERIES_KEY = /^(\d+)_([AD])_\d+/;

export const directionWord = (letter: "A" | "D"): string =>
  (letter === "A" ? TOP_BAR.ascending : TOP_BAR.descending).toUpperCase();

export const seriesOf = (seriesKey: string | null | undefined): Series | undefined => {
  const match = seriesKey === null || seriesKey === undefined ? null : SERIES_KEY.exec(seriesKey);
  const [, track, letter] = match ?? [];
  if (track === undefined || (letter !== "A" && letter !== "D")) return undefined;
  return { track: String(Number(track)), direction: directionWord(letter) };
};

// The longest interval between two consecutive dates, any length (the 4-pass note names it).
export const largestGap = (dates: readonly string[]): [string, string] | undefined => {
  const sorted = [...dates].sort();
  let best: [string, string] | undefined;
  let bestDays = -1;
  for (let index = 1; index < sorted.length; index += 1) {
    const before = sorted[index - 1];
    const after = sorted[index];
    if (before === undefined || after === undefined) continue;
    const days = daysBetween(before, after);
    if (days > bestDays) {
      best = [before, after];
      bestDays = days;
    }
  }
  return best;
};

export type PassState =
  | { kind: "none" }
  | { kind: "few"; count: number }
  | { kind: "four"; gap: [string, string] }
  | { kind: "ready" };

// The image lenses read the passes /coverage chose (≤ 5); fewer than 4 can't be compared.
export const passState = (coverage: Coverage): PassState => {
  const dates = coverage.plan.dates;
  if (coverage.plan.status === "noCoverage" || dates.length === 0) return { kind: "none" };
  if (dates.length < MIN_PASSES) return { kind: "few", count: dates.length };
  const gap = largestGap(dates);
  if (dates.length < MAX_PASSES && gap !== undefined) return { kind: "four", gap };
  return { kind: "ready" };
};

export const chosenDates = (coverage: Coverage): string[] =>
  [...coverage.plan.dates].sort().slice(-MAX_PASSES);

const newestFirst = (a: InsarPair, b: InsarPair): number =>
  b.secondaryDate.localeCompare(a.secondaryDate) || b.referenceDate.localeCompare(a.referenceDate);

export type PairGroup = {
  seriesKey: string;
  track: string;
  direction: string;
  // Newest first.
  pairs: InsarPair[];
  // Every pass date the group's pairs use, oldest first.
  dates: string[];
};

// One group per radar series (track + direction + frame), the group with the newest pair first.
export const pairGroups = (pairs: readonly InsarPair[]): PairGroup[] => {
  const groups = new Map<string, InsarPair[]>();
  for (const pair of [...pairs].sort(newestFirst)) {
    const group = groups.get(pair.seriesKey);
    if (group === undefined) groups.set(pair.seriesKey, [pair]);
    else group.push(pair);
  }
  return [...groups.entries()].map(([seriesKey, members]) => {
    const first = members[0];
    return {
      seriesKey,
      track: String(first?.track ?? ""),
      direction: first === undefined ? "" : directionWord(first.direction),
      pairs: members,
      dates: [
        ...new Set(members.flatMap((pair) => [pair.referenceDate, pair.secondaryDate])),
      ].sort(),
    };
  });
};

// The default pair: the newest one, whatever its series.
export const defaultPairId = (pairs: readonly InsarPair[]): string | undefined =>
  [...pairs].sort(newestFirst)[0]?.pairId;

export type ArcStrip = { dates: string[]; arcs: InsarPair[] };

// The Earthquake strip: the group's 5 most recent passes (the preset), plus the chosen pair's two
// passes when it is older; an arc for each real pair whose two passes are both on the strip.
export const arcStrip = (group: PairGroup, chosen: InsarPair | undefined): ArcStrip => {
  const recent = group.dates.slice(-QUAKE_PRESET_PASSES);
  const extra =
    chosen !== undefined && chosen.seriesKey === group.seriesKey
      ? [chosen.referenceDate, chosen.secondaryDate]
      : [];
  const dates = [...new Set([...recent, ...extra])].sort();
  const shown = new Set(dates);
  const arcs = group.pairs
    .filter((pair) => shown.has(pair.referenceDate) && shown.has(pair.secondaryDate))
    .sort((a, b) => a.referenceDate.localeCompare(b.referenceDate));
  return { dates, arcs };
};

// Where a date sits on the strip, by its real date: uneven gaps stay uneven.
export const stripX = (
  date: string,
  dates: readonly string[],
  width: number,
  pad: number,
): number => {
  const first = dates[0];
  const last = dates.at(-1);
  if (first === undefined || last === undefined || first === last) return width / 2;
  return pad + ((width - 2 * pad) * daysBetween(first, date)) / daysBetween(first, last);
};

// An arc between two strip positions; longer pairs rise higher, capped so the arc stays inside.
export const arcPath = (x1: number, x2: number, baseline: number, maxRise: number): string => {
  const rise = Math.min(maxRise, Math.max(10, Math.abs(x2 - x1) * 0.6));
  return `M ${x1} ${baseline} Q ${(x1 + x2) / 2} ${baseline - rise * 2} ${x2} ${baseline}`;
};

export type StartBlock = "loading" | "none" | "few" | "noPair" | undefined;

// Why Start is disabled, if it is. Earthquake follows the pair list, not the image coverage.
export const startBlock = (
  lens: V9LensId,
  passes: PassState | undefined,
  pairChosen: boolean | undefined,
): StartBlock => {
  if (lens === "insar") {
    if (pairChosen === undefined) return "loading";
    return pairChosen ? undefined : "noPair";
  }
  if (passes === undefined) return "loading";
  if (passes.kind === "none") return "none";
  if (passes.kind === "few") return "few";
  return undefined;
};

export type ConfirmWait = { line: string; offline: boolean };

// The footer's mode and wait line. #72 (backend #5): /coverage carries the p80 of comparable runs of
// the default image lens and whether its answer is cached, so the image lenses show that estimate
// (spotWait). Earthquake runs a different pipeline (one GUNW pair), so it gets no number (v9 C7).
// precomputedCase doesn't say which lens it was prepared for, so it is OFFLINE for every lens.
export const confirmWait = (lens: V9LensId, block: StartBlock, coverage: Coverage): ConfirmWait => {
  const image = lens !== "insar";
  const offline = Boolean(coverage.precomputedCase) || (image && coverage.cache === "hit");
  if (block === "none") return { line: CONFIRM_NOTES.noDataWait, offline };
  if (block === "few" || block === "noPair") return { line: CONFIRM.waitLineBlocked, offline };
  if (offline) return { line: CONFIRM.waitLineOffline, offline };
  return { line: image ? spotWait(coverage).value : CONFIRM.waitLineOnline, offline };
};
