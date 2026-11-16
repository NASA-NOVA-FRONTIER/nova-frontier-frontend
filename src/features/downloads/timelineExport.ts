import type { Case, PassKind } from "@/features/cases/cases";

/*
 * Timeline download (JSON). Pass dates and "% outside range" are DEMO until the backend
 * serves real acquisitions, so every row says so and the file names its source. A case whose
 * timeline is copied from its own series (realDates) says that instead.
 */

export type PassRow = {
  case: string;
  lens: string;
  date: string;
  role: "baseline" | "target" | "measured" | "planned";
  cells_outside_range_pct: number | null;
  measured: boolean;
  demo: boolean;
};

const ROLE: Record<PassKind, PassRow["role"]> = {
  base: "baseline",
  target: "target",
  meas: "measured",
  plan: "planned",
};

export const TIMELINE_SOURCE =
  "NISAR Hazard Watch timeline. Pass dates (12-day spacing) and cells_outside_range_pct are DEMO until the nova-frontier-model backend serves real acquisitions; planned passes are not data.";

export const REAL_TIMELINE_SOURCE =
  "NISAR Hazard Watch timeline. Pass dates and cells_outside_range_pct are copied from the case's own nova-frontier-model series; planned passes are not data.";

const sourceOf = (item: Case): string =>
  item.timeline?.realDates === true ? REAL_TIMELINE_SOURCE : TIMELINE_SOURCE;

export const timelineRows = (item: Case): PassRow[] =>
  (item.timeline?.passes ?? []).map((pass) => ({
    case: item.id,
    lens: item.lens,
    date: pass.date,
    role: ROLE[pass.kind],
    cells_outside_range_pct: pass.outsidePct ?? null,
    measured: pass.kind !== "plan",
    demo: item.timeline?.realDates !== true,
  }));

export const timelineJson = (item: Case): string =>
  JSON.stringify(
    { source: sourceOf(item), case: item.id, lens: item.lens, passes: timelineRows(item) },
    null,
    2,
  );

export const saveBlob = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  // Give the browser a moment to start the download before the URL goes away.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
