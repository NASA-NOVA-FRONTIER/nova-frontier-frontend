import { RESULT, RESULT_CARD, type V9LensId } from "@/content/copyV9";
import type { TimelinePass } from "@/features/cases/cases";
import { measuredPasses } from "@/features/explore/exploreDock";
import {
  crossPolHistoryOf,
  lensEvaluationOf,
  type ExplorationResult,
  type ExplorationView,
} from "@/features/explore/exploreSchemas";
import { formatDay } from "@/features/timeline/timelineLayout";

/*
 * The numbers of the v9 result card (SPECS-flow-v9 §3), each straight from the answer. Pure. When the
 * backend sends no count, there is no stat: no number beats an invented one.
 */

export type ResultStat = { k: number; n: number; label: string };

const counted = (k: number | undefined | null, n: number | undefined | null, label: string) =>
  k == null || n == null || n <= 0 ? undefined : { k, n, label };

export const resultStat = (lens: V9LensId, result: ExplorationResult): ResultStat | undefined => {
  if (lens === "insar") {
    const insar = result.insar;
    if (insar == null) return undefined;
    return counted(
      insar.phaseCells,
      insar.windowCells,
      RESULT_CARD.insar.statLabel(String(insar.coherenceThreshold)),
    );
  }
  if (lens === "flood_wetland") {
    const signature = lensEvaluationOf(result)?.dualDarkening;
    return counted(
      signature?.signatureCells,
      signature?.supportedCells,
      RESULT_CARD.flood_wetland.statLabel,
    );
  }
  // "Repeated" needs the backend's own count over the last two assessed passes.
  const history = crossPolHistoryOf(result);
  if (history?.status !== "evaluated") return undefined;
  return counted(history.declineOnLastTwoCells, history.commonCells, RESULT_CARD[lens].statLabel);
};

// OFFLINE = prepared ahead of time: a cache hit (decision 15 Nov).
export const originOf = (view: ExplorationView): "online" | "offline" =>
  view.cache === "hit" ? "offline" : "online";

// The mono range line: the measured passes' real dates, or the pair's two dates. Never an event date.
export const rangeLineOf = (
  lens: V9LensId,
  result: ExplorationResult,
  passes: TimelinePass[],
): string | undefined => {
  if (lens === "insar")
    return RESULT.rangeLineQuake(1, formatDay(result.windowStart), formatDay(result.windowEnd));
  const measured = measuredPasses(passes);
  const first = measured[0];
  const last = measured.at(-1);
  if (first === undefined || last === undefined) return undefined;
  return RESULT.rangeLine(formatDay(first.date), formatDay(last.date), measured.length);
};

export const resultBody = (lens: V9LensId, result: ExplorationResult): string =>
  lens === "insar"
    ? RESULT_CARD.insar.body.pair(formatDay(result.windowStart), formatDay(result.windowEnd))
    : RESULT_CARD[lens].body;
