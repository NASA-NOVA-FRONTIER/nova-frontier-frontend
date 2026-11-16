import { VERDICT } from "@/features/case-panel/verdicts";
import { findLens, type Case } from "@/features/cases/cases";
import { gridMetres } from "@/features/live/liveQuestion";

/*
 * The report's summary block. It is NOT AI-written yet: a fixed template filled with the case's own
 * fields, so every number in it also appears in a DATA block below and can be checked there.
 */

export const SUMMARY_LABEL = "Summary · written from the data above (template)";

export const areaOf = (item: Case): string =>
  item.chipKm === undefined
    ? "No processed area yet"
    : `${item.chipKm} km · ${item.chipGridM ?? gridMetres(item.chipKm)} m grid`;

export const reportSummary = (item: Case): string => {
  const question = findLens(item.lens)?.chip ?? item.lens;
  // A measured case has no verdict to state, as in the live report.
  const verdict = item.verdict === "measured" ? "" : ` Verdict: ${VERDICT[item.verdict].label}.`;
  const area = item.chipKm === undefined ? "the area" : `the ${item.chipKm} km area`;
  const stat =
    item.coherenceOnly === true ? "" : ` Across ${area}, ${item.stat} ${item.statLine}`.trimEnd();
  const reason = item.reason === undefined ? "" : ` ${item.reason}`;
  return `${item.name} (${item.place}) was asked “${question}”${verdict} ${item.verdictLine}${stat}${reason} ${item.plainLimit}`;
};
