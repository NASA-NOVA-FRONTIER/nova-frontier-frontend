import { MOBILE } from "@/content/copyV8";
import type { DockRow, DockRowKey } from "@/features/explore/exploreDock";

/*
 * The phone layout (SPECS-v8 §1 Mobile): which step the bottom sheet shows and how tall it is.
 * Pure, so the page, the CSS variable and the tests read the same answer.
 *
 * A live answer brings its raw passes (step 4) and its lens result (step 6) together, so `result`
 * covers both; `lensrun` is step 5, a lens switch or the pair choice of ground motion.
 */
export type SheetStep = "spot" | "wait" | "lensrun" | "result" | "error" | "case";

// Share of the screen height, from `Explorer v8 v2.dc.html` (`sheetFrac`).
export const SHEET_FRACTION: Record<SheetStep, number> = {
  spot: 0.5,
  wait: 0.46,
  lensrun: 0.44,
  result: 0.46,
  error: 0.56,
  case: 0.56,
};

// Expanded, the sheet leaves the top bar and a strip of globe visible.
export const EXPANDED_FRACTION = 0.86;

export type SheetInput = {
  story: boolean;
  // Step 7 (More information) is a full page on phones, not a sheet.
  moreInfo: boolean;
  collapsed: boolean;
  spot: boolean;
  selection: "case" | "live" | undefined;
  running: boolean;
  lensSwitch: boolean;
  needsPair: boolean;
  failed: boolean;
  done: boolean;
};

// Undefined: nothing sits at the bottom (step 1, the story, step 7 or a collapsed panel).
export const sheetStep = (input: SheetInput): SheetStep | undefined => {
  if (input.story || input.moreInfo || input.collapsed) return undefined;
  if (input.selection === undefined) return input.spot ? "spot" : undefined;
  if (input.selection === "case") return "case";
  if (input.failed) return "error";
  if (input.needsPair) return "lensrun";
  if (input.running) return input.lensSwitch ? "lensrun" : "wait";
  return input.done ? "result" : "wait";
};

export const sheetFraction = (step: SheetStep, expanded: boolean): number =>
  expanded ? EXPANDED_FRACTION : SHEET_FRACTION[step];

// Steps 4–6 put the layer pills under the search.
export const hasLayerPills = (step: SheetStep | undefined): boolean =>
  step === "lensrun" || step === "result";

const PILL_LABEL: Partial<Record<DockRowKey, string>> = {
  hh: MOBILE.pillHH,
  hv: MOBILE.pillHV,
  change: MOBILE.pillChange,
  rule: MOBILE.pillRule,
};

export type LayerPill = DockRow & { short: string };

// The dock's own rows, so pills and dock always agree. Rule shows only when the lens drew one.
export const layerPills = (rows: DockRow[]): LayerPill[] =>
  rows.flatMap((row) => {
    const short = PILL_LABEL[row.key];
    if (short === undefined || (row.key === "rule" && !row.enabled)) return [];
    return [{ ...row, short }];
  });
