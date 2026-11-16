import { VERDICT } from "@/features/case-panel/verdicts";
import { findLens, type Case } from "@/features/cases/cases";
import { gridMetres } from "@/features/live/liveQuestion";
import { tr } from "@/i18n/translate";

/*
 * The report's summary block. It is NOT AI-written yet: a fixed template filled with the case's own
 * fields, so every number in it also appears in a DATA block below and can be checked there.
 */

export const summaryLabel = (): string => tr("Summary · written from the data above (template)");

export const areaOf = (item: Case): string =>
  item.chipKm === undefined
    ? tr("No processed area yet")
    : tr("{{km}} km · {{grid}} m grid", {
        km: item.chipKm,
        grid: item.chipGridM ?? gridMetres(item.chipKm),
      });

export const reportSummary = (item: Case): string => {
  const question = findLens(item.lens)?.chip ?? item.lens;
  // A measured case has no verdict to state, as in the live report.
  const verdict =
    item.verdict === "measured"
      ? ""
      : tr(" Verdict: {{label}}.", { label: VERDICT[item.verdict].label });
  const area =
    item.chipKm === undefined ? tr("the area") : tr("the {{km}} km area", { km: item.chipKm });
  const stat =
    item.coherenceOnly === true
      ? ""
      : tr(" Across {{area}}, {{stat}} {{statLine}}", {
          area,
          stat: item.stat,
          statLine: item.statLine,
        }).trimEnd();
  const reason = item.reason === undefined ? "" : ` ${item.reason}`;
  const asked = tr("{{name}} ({{place}}) was asked “{{question}}”", {
    name: item.name,
    place: item.place,
    question,
  });
  return `${asked}${verdict} ${item.verdictLine}${stat}${reason} ${item.plainLimit}`;
};
