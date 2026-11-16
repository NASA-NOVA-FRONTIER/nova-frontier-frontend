// The two report layers the globe can drape, and how their colours read.
export type DrapeKind = "change" | "baseline";

export type DrapeLegend = {
  ramp: string;
  // The same ramp as colour stops, for the PNG download's legend.
  stops: string[];
  scale: [string, string, string];
  text: string;
  // Where the draped image comes from, when it is not a crop of a report figure.
  origin?: { label: string; source: string };
};

export const LEGEND: Record<DrapeKind, DrapeLegend> = {
  change: {
    ramp: "linear-gradient(90deg,#2f6db5,#f2f0eb,#c2473a)",
    stops: ["#2f6db5", "#f2f0eb", "#c2473a"],
    scale: ["−8 dB darker", "0", "+8 dB brighter"],
    text: "Signed change in HH, the first assessment minus the median of earlier passes.",
  },
  baseline: {
    ramp: "linear-gradient(90deg,#440154,#3b528b,#21918c,#5ec962,#fde725)",
    stops: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"],
    scale: ["−30 dB", "", "0 dB"],
    text: "Baseline median HH, from the backend report. Dark purple is calm water or smooth ground.",
  },
};

const NISCEMI_ORIGIN = {
  label: "Model's published layer",
  source:
    "nova-frontier-model release events-20261115, case niscemi-aftermath, layers display_baseline_change_HH and baseline_median_hh",
};

const BUG_FIRE_ORIGIN = {
  label: "Model's published layer",
  source:
    "nova-frontier-model release events-20261115, case bug-fire, layers display_baseline_change_HH and baseline_median_hh",
};

// A case whose layers read differently from the flood reports (the model's published layers).
const CASE_LEGEND: Record<string, Partial<Record<DrapeKind, DrapeLegend>>> = {
  // #21: the change layer is the lens's own, 9 Sep (the last pass) against the three before the fire.
  "bug-fire": {
    change: {
      ramp: "linear-gradient(90deg,#053061,#f7f7f7,#67001f)",
      stops: ["#053061", "#f7f7f7", "#67001f"],
      scale: ["−8 dB darker", "0", "+8 dB brighter"],
      text: "Signed change in HH, the 9 Sep 2026 pass minus the median of the three passes before the 8 Aug ignition.",
      origin: BUG_FIRE_ORIGIN,
    },
    baseline: {
      ramp: "linear-gradient(90deg,#000,#fff)",
      stops: ["#000000", "#ffffff"],
      scale: ["−30 dB", "", "0 dB"],
      text: "Baseline median HH of the three passes before the 8 Aug 2026 ignition.",
      origin: BUG_FIRE_ORIGIN,
    },
  },
  "niscemi-aftermath": {
    change: {
      ramp: "linear-gradient(90deg,#053061,#f7f7f7,#67001f)",
      stops: ["#053061", "#f7f7f7", "#67001f"],
      scale: ["−8 dB darker", "0", "+8 dB brighter"],
      text: "Signed change in HH, the 22 Oct 2026 pass minus the median of the four earlier passes.",
      origin: NISCEMI_ORIGIN,
    },
    baseline: {
      ramp: "linear-gradient(90deg,#000,#fff)",
      stops: ["#000000", "#ffffff"],
      scale: ["−30 dB", "", "0 dB"],
      text: "Baseline median HH of the four earlier passes, all after the 25 Jan landslide.",
      origin: NISCEMI_ORIGIN,
    },
  },
};

export const legendFor = (kind: DrapeKind, caseId?: string): DrapeLegend =>
  (caseId === undefined ? undefined : CASE_LEGEND[caseId]?.[kind]) ?? LEGEND[kind];
