/*
 * Which v8 step the phone's bottom sheet shows (SPECS-v8 "Mobile": steps 2–6 and 8). Pure: the
 * explorer publishes the answer on <main data-sheet>, and CSS sizes the sheet, the compact timeline
 * and Nova from it, so the panels themselves stay the same components as on desktop.
 */
export type SheetStep =
  | "find"
  | "case"
  | "spot"
  | "nodata"
  | "wait"
  | "raw"
  | "lensrun"
  | "result"
  | "error"
  // The guided story and the More information sheet own the whole screen on phones.
  | "none";

export type SheetInput = {
  // The guided story or step 7's sheet is open.
  fullScreen: boolean;
  view: "start" | "spot" | "case" | "live";
  // The spot's coverage check answered noCoverage.
  noCoverage: boolean;
  live?: {
    running: boolean;
    // A lens switch runs in the compact row, not in the wait view (decision 5).
    lensSwitch: boolean;
    failed: boolean;
    // The lens result card is on screen.
    result: boolean;
  };
};

export const sheetStep = ({ fullScreen, view, noCoverage, live }: SheetInput): SheetStep => {
  if (fullScreen) return "none";
  if (view === "start") return "find";
  if (view === "spot") return noCoverage ? "nodata" : "spot";
  if (view === "case" || live === undefined) return "case";
  if (live.failed) return "error";
  if (live.running) return live.lensSwitch ? "lensrun" : "wait";
  return live.result ? "result" : "raw";
};

// The share of an 844 px phone the design gives each step's sheet (Explorer v8 v2, sheetFrac).
export const SHEET_FRACTION: Record<SheetStep, number> = {
  find: 0.46,
  case: 0.56,
  spot: 0.5,
  nodata: 0.42,
  wait: 0.46,
  raw: 0.44,
  lensrun: 0.44,
  result: 0.46,
  error: 0.56,
  none: 0,
};

// The compact timeline sits above the sheet while a live answer has passes to show.
export const hasCompactTimeline = (step: SheetStep): boolean =>
  step === "wait" || step === "raw" || step === "lensrun" || step === "result";

// HH, HV, Δ dB and Rule pills under the search, on steps 4–6 only.
export const hasLayerPills = (step: SheetStep): boolean =>
  step === "raw" || step === "lensrun" || step === "result";
