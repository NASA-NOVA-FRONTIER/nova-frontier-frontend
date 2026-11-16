import { VERDICT } from "@/features/case-panel/verdicts";
import { findLens, type Case, type PassKind } from "@/features/cases/cases";
import type { ExplorationView } from "@/features/explore/exploreSchemas";
import { CHANNELS, outsidePercent } from "@/features/landslide/landslideEvidence";
import { LIVE_SOURCES } from "@/features/live/liveQuestion";

/*
 * #37: the data a person takes to a spreadsheet, as CSV built in the browser from what the app
 * already holds (a case's own numbers, or the backend's live answer). One row per pass; a header of
 * `#` lines says where it comes from, its scientific status, its limits and its sources, so the
 * file stays honest away from the app. Values the app labels DEMO are flagged in a `demo` column.
 */

// Excel reads a UTF-8 file as UTF-8 only with this mark; without it "·" and "−" come out garbled.
const BOM = "﻿";
const SCIENTIFIC_STATUS = "diagnostic evidence, not a validated classifier";
const NO_INFERENCE = "No cause, probability, area in hectares, depth or displacement is reported.";

export const csvCell = (value: string | number | boolean | null | undefined): string => {
  if (value === null || value === undefined) return "";
  const text = typeof value === "number" ? String(Number(value.toFixed(4))) : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const row = (cells: (string | number | boolean | null | undefined)[]): string =>
  cells.map(csvCell).join(",");

// Comment lines can't break the table: a newline in a value would start a fake row.
const comment = (label: string, value: string): string =>
  `# ${label}: ${value.replace(/\s+/g, " ").trim()}`;

const file = (header: string[], columns: readonly string[], rows: string[]): string =>
  `${BOM}${[...header, columns.join(","), ...rows].join("\r\n")}\r\n`;

// "nisar-hazard-watch_qadirabad_2026-11-16.csv": what it is, which result, which day it was saved.
export const exportName = (id: string, day: string, extension: string): string => {
  const safe =
    id
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "result";
  return `nisar-hazard-watch_${safe}_${day}${extension === "" ? "" : `.${extension}`}`;
};

export const CASE_COLUMNS = [
  "date",
  "role",
  "hh_point_db",
  "hv_point_db",
  "hh_area_median_db",
  "hv_area_median_db",
  "cells_outside_band",
  "cells_eligible",
  "outside_band_pct",
  "demo",
] as const;

const ROLE: Record<PassKind, string> = {
  base: "baseline",
  target: "target",
  meas: "assessment",
  plan: "planned",
};

const caseRows = (item: Case): string[] => {
  const evidence = item.landslide;
  if (evidence !== undefined)
    return evidence.passes.map((pass) =>
      row([
        pass.date,
        pass.date === evidence.target ? "target" : pass.role,
        ...CHANNELS.map((channel) => pass.point[channel]),
        ...CHANNELS.map((channel) => pass.area[channel].median),
        pass.outsideCells,
        pass.outsideCells === undefined ? undefined : evidence.cells,
        outsidePercent(pass, evidence.cells),
        false,
      ]),
    );
  const real = item.timeline?.realDates === true;
  // Planned passes are a promise, not data, so they stay out of a data file; an illustrative share
  // outside the band stays empty, so no demo number can be analysed as a measurement.
  return (item.timeline?.passes ?? [])
    .filter((pass) => pass.kind !== "plan")
    .map((pass) =>
      row([
        pass.date,
        ROLE[pass.kind],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        real ? pass.outsidePct : undefined,
        !real,
      ]),
    );
};

export const caseCsv = (item: Case, day: string): string => {
  const lens = findLens(item.lens);
  const demoRows = item.landslide === undefined && item.timeline?.realDates !== true;
  return file(
    [
      comment("NISAR Hazard Watch", `${item.name}, ${item.place} (case ${item.id})`),
      comment("Question", lens?.chip ?? item.lens),
      comment(
        "Mode",
        "OFFLINE · measured ahead of time by the nova-frontier-model science backend",
      ),
      comment("Result", `${VERDICT[item.verdict].label}. ${item.verdictLine}`),
      comment("Headline", `${item.stat} ${item.statLine}`),
      ...(item.statSource === undefined ? [] : [comment("Headline source", item.statSource)]),
      ...item.quality.map((entry) => comment(entry.k, `${entry.v} (${entry.why})`)),
      comment("Scientific status", SCIENTIFIC_STATUS),
      comment("Limit", item.plainLimit),
      comment("Technical limit", item.techLimit),
      comment("Not reported", NO_INFERENCE),
      ...(demoRows
        ? [
            comment(
              "Demo",
              "The pass dates are illustrative (12-day spacing) until the backend serves this case's own series; those rows say demo=true and carry no values. The measured numbers are the Headline and quality lines above.",
            ),
          ]
        : []),
      ...item.sources.map((source) => comment("Source", `${source.label} — ${source.href}`)),
      comment("Saved", day),
    ],
    CASE_COLUMNS,
    caseRows(item),
  );
};

export const EXPLORATION_COLUMNS = [
  "date",
  "role",
  "status",
  "reason",
  "hh_point_db",
  "hv_point_db",
  "hh_valid_cells",
  "hv_valid_cells",
  "sensing_start_utc",
  "granule_id",
] as const;

const roleOf = (date: string, target: string | undefined, baseline: Set<string>): string =>
  date === target ? "target" : baseline.has(date) ? "baseline" : "assessment";

export const explorationDataCsv = (view: ExplorationView, day: string): string => {
  const result = view.result;
  const lens = result?.lens;
  const target = lens?.target_date;
  const baseline = new Set(lens?.baseline_dates ?? []);
  const point = (result?.quality.measuredPoint as number[] | undefined) ?? undefined;
  const rows = (result?.observations ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) =>
      row([
        entry.date,
        roleOf(entry.date, target, baseline),
        entry.status,
        entry.reason,
        ...CHANNELS.map((channel) => entry.point_db?.[channel]),
        ...CHANNELS.map((channel) => entry.valid_pixel_count_by_pol?.[channel]),
        entry.sensing_start_utc,
        entry.granule_id ?? entry.granule_title,
      ]),
    );
  return file(
    [
      comment("NISAR Hazard Watch", `live exploration ${view.id}`),
      comment("Lens", view.lens),
      ...(Array.isArray(point) ? [comment("Measured point (lon, lat)", point.join(", "))] : []),
      ...(view.plan?.seriesKey ? [comment("Radar series", view.plan.seriesKey)] : []),
      comment(
        "Mode",
        `${view.cache === "hit" ? "OFFLINE · prepared earlier" : "ONLINE · computed live"} from NISAR L-band scenes`,
      ),
      comment(
        "Provenance",
        result?.isDemo === true
          ? "DEMO: the service marked this answer as a synthetic stand-in"
          : "REAL: measured by the radar service",
      ),
      comment("Status", view.status),
      comment("Scientific status", result?.scientificStatus ?? SCIENTIFIC_STATUS),
      ...(result?.limitations ?? []).map((line) => comment("Limit", line)),
      comment("Not reported", NO_INFERENCE),
      ...LIVE_SOURCES.map((source) => comment("Source", `${source.label} — ${source.href}`)),
      comment("Saved", day),
    ],
    EXPLORATION_COLUMNS,
    rows,
  );
};
