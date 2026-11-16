// Visible strings of the v9 explorer flow (docs/design/v9/COPY-flow-v9.md + the prototype's copy, TIPS, PTIP,
// LOOK, RS and legend strings), verbatim except where a comment names a correction from "Where the product
// differs from the v9 handoff" in docs/design/README.md (C1–C14 = tickets/v9-validation/validation.md).
// `{x}` placeholders are small functions; callers pass values from the API, never invented ones.
// Dates, coordinates and directions arrive formatted (coordinates via formatLonLat, as in copyV8).
// Not here on purpose: per-case lines (cases are kept elsewhere), the 40 facts (facts.ts, T6b) and the
// Radar Waves strings (radarWaves.ts, T11).

import { formatCount, passOf } from "@/content/copyV8";
import type { LensId } from "@/features/cases/cases";

// C1: the four live lenses; agriculture stays out of the selector and there is no landslide lens.
export type V9LensId = Exclude<LensId, "agriculture">;

// COPY order: Earthquake · Wildfire · Deforestation · Flood.
export const PHENOMENA: readonly V9LensId[] = [
  "insar",
  "wildfire",
  "vegetation_disturbance",
  "flood_wetland",
];

// C1: Deforestation is the vegetation_disturbance lens, Flood is flood_wetland.
export const PHENOMENON_LABEL: Record<V9LensId, string> = {
  insar: "Earthquake",
  wildfire: "Wildfire",
  vegetation_disturbance: "Deforestation",
  flood_wetland: "Flood",
};

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

// Prototype: the ⓘ button's aria-label (T2).
export const INFO_TIP = { label: "What is this?" } as const;

// §1 Empty globe
export const EMPTY_GLOBE = {
  hintDesktop: "Click any land to place a 10 × 10 km square",
  hintPhone: "Tap any land to place a square",
  casesKicker: (n: number) => `${formatCount(n)} MEASURED CASES`,
  casesTitle: "Start with a measured case",
  casesBody: "Prepared from real NISAR passes. Opens in about a second.",
  moreCases: "MORE MEASURED CASES",
} as const;

// §2 Square placed
export const SQUARE = {
  dragHint: "Drag to move",
  squareLabel: "10 × 10 KM · 105 KM²",
  placedTitle: "Square placed",
  placedMeta: "10 × 10 km · about 105 km² · nothing runs yet",
  useSquare: "Use this square",
  cancel: "Cancel",
  // C5: live InSAR measures a 5 km window at the centre of the square (BE constants/insar.py).
  insarWindow: "Measured: 5 × 5 km at the centre",
  basemapAlt: "Satellite basemap around the square",
} as const;

// C2 + C11 + decision 15 Nov: "Last 5 months" for every GCOV lens until an event catalogue exists;
// the event presets ("Event ± 60 days", "45 days before, 90 after", "The pairs around the event") never ship.
export const PRESET_NAME: Record<V9LensId, string> = {
  flood_wetland: "Last 5 months",
  wildfire: "Last 5 months",
  vegetation_disturbance: "Last 5 months",
  insar: "The 5 most recent passes",
};

// §3 Confirm panel
export const CONFIRM = {
  kicker: "CONFIRM THE ANALYSIS",
  title: "What should the radar look for?",
  area: "10 × 10 km square · 105 km²",
  coords: (coordinates: string) => coordinates,
  edit: "Move",
  phenLabel: "What do you want to look for?",
  datesLabel: "Dates",
  start: "Start",
  end: "End",
  // Prototype: the strip's label depends on the lens.
  stripLabel: (lens: V9LensId) =>
    lens === "insar" ? "Which passes to compare" : "Which passes to read",
  preset: (name: string) => `PRESET · ${name.toUpperCase()}`,
  customRange: "CUSTOM RANGE",
  passLine: (total: number, inRange: number, track: string, direction: string) =>
    `${formatCount(total)} NISAR passes here · ${formatCount(inRange)} in range · 5 will be read · track ${track} ${direction}`,
  passLineShort: (total: number, inRange: number, track: string, direction: string) =>
    `${formatCount(total)} NISAR passes here · ${formatCount(inRange)} in range · track ${track} ${direction}`,
  paramsLabel: "Settings",
  noParams: "No settings needed for this phenomenon.",
  // C7: before Start the backend sends no estimate, so the ONLINE line carries no number.
  modeOnline: "ONLINE · Computed live from the NISAR archive · we stop at 8 min",
  modeOffline: "OFFLINE · Prepared ahead of time · Opens in about a second",
  modeLineOnline: "Computed live from the NISAR archive",
  modeLineOffline: "Prepared ahead of time",
  // C7: was "Computed live · usually 1–3 min".
  waitLineOnline: "Computed live · we stop at 8 min",
  waitLineOffline: "Prepared · opens in about a second",
  waitLineBlocked: "Nothing to compute yet",
  startAnalysis: "Start analysis",
  startCase: "Show the result",
  cancel: "Cancel",
} as const;

// §3 Passes strip
export const PASS_STRIP = {
  title: "NISAR PASSES OVER THIS SQUARE",
  legendPass: "Pass",
  legendWillBeRead: "Will be read",
  legendYourRange: "Your range",
  legendChosenPair: "Chosen pair",
  legendOtherPair: "Other pair you can pick",
  pickFirst: "Pick the first pass to include:",
  pickLast: "Pick the last pass to include:",
  resetPreset: (name: string) => `Reset to preset · ${name}`,
} as const;

// §3 Settings: only what POST /explorations accepts (pairId, coherenceThreshold).
// C12: PTIP.event / ref / fire / ctx and the event options are not shipped.
export const EARTHQUAKE_SETTINGS = {
  pairName: "Pass pair",
  pairHelp: "Two NISAR passes compared with each other, newest first.",
  thresholdName: "Coherence threshold",
  thresholdHelp: "Cells below it are left out of the phase.",
  thresholdDefault: (value: string) => `${value} · default`,
  pairOption: (a: string, b: string, days: number) => `${a} → ${b} · ${days} d`,
  noPairInRange: "No pair in this range",
  pairLine: (a: string, b: string, days: number) =>
    `Pair ${a} → ${b} · ${days} days · tap an arc to change`,
  advanced: (threshold: string) => `Advanced · threshold ${threshold}`,
  hideAdvanced: "Hide advanced",
  summary: (a: string, b: string, threshold: string) => `Pair ${a} → ${b} · threshold ${threshold}`,
  summaryNoPair: (threshold: string) => `No pair yet · threshold ${threshold}`,
} as const;

// §3 Notes
export const CONFIRM_NOTES = {
  noDataTitle: "NISAR hasn't measured this square yet",
  noDataBody: (date: string, track: string, direction: string) =>
    `No passes in the archive for this square. The Observation Plan schedules the next one on ${date} (track ${track}, ${direction}).`,
  noDataAction: "Open a measured case",
  noDataWait: "Nothing to compute",
  fourTitle: "4 passes in this range",
  fourBody: (a: string, b: string) =>
    `The sequence will show 4 measured passes with their real gaps, not 5. NISAR has no pass here between ${a} and ${b}.`,
  fewTitle: "Not enough history here",
  fewBody: (n: number) =>
    `Only ${n} ${plural(n, "pass", "passes")} fall in this range. An analysis needs at least 4 to compare against the place's own history.`,
  widen: (start: string, end: string, k: number) => `Widen to ${start} → ${end} (${k} passes)`,
  noPairTitle: "No pass pair in this range",
  noPairBody: (n: number) =>
    `Only ${n} ${plural(n, "pass", "passes")} in this range. A pair needs two passes from the same orbit.`,
  noPairAction: "Reset to the preset",
} as const;

// §3 Measured case (phenomenon locked)
export const MEASURED_CASE = {
  kicker: (place: string) => `MEASURED CASE · ${place.toUpperCase()}`,
  lockedWhy:
    "This case was measured for one phenomenon. Place your own square to look for another.",
  // C2: the straddle tail only for a case with a sourced event date.
  passLine: (n: number, track: string, direction: string) =>
    `${n} passes · track ${track} ${direction}`,
  passLineEvent: (n: number, track: string, direction: string, k: number) =>
    `${n} passes · track ${track} ${direction} · ${k} pairs straddle the event`,
} as const;

// §4 Processing
export const PROCESSING = {
  titleOnline: "Analysing your square",
  titleOffline: "Opening the prepared result",
  elapsedLabel: "elapsed",
  // C7: the backend sends one p80 (`etaSeconds`); the band ends at it. Was "Usually {from}–{to} min".
  estimate: (p80: string) => `Usually under ${p80}`,
  // C7: was "Estimate was {from}–{to} min".
  estimateExceeded: (p80: string) => `Estimate was under ${p80}`,
  // C8: a stopped job has no result, so "and show what is ready" is dropped.
  lateBody: "Taking longer than the estimate. It keeps running; at 8 minutes we stop.",
  offlineEstimate: "Prepared ahead of time",
  whyLabel: "Why a range and not a countdown?",
  whyLabelOffline: "Why so fast?",
  stepsHeading: "What is happening",
  steps: ["Finding passes", "Reading passes", "Measuring change", "Drawing the layers"],
  stepPasses: (n: number, direction: string, first: string, last: string) =>
    `${n} passes · ${direction} · ${first} → ${last}`,
  stepPair: (a: string, b: string) => `Reading the pair ${a} → ${b}`,
  stepRead: (k: number, n: number) => `${k} of ${n} read`,
  inProgress: "In progress",
  waiting: "Waiting",
  done: "Done",
  collapse: "Collapse",
  expand: "Expand",
  factCounter: (i: number) => `FACT ${i} OF 10`,
  nextFact: "Next fact",
  factSource: (label: string) => `Source: ${label}`,
  cancel: "Cancel analysis",
} as const;

// §5 Result: layers per lens. Prototype ids; the first one is the default.
export type V9LayerId = "hh" | "change" | "sig" | "hv" | "hvdrop" | "coh" | "phase";

export const LAYERS: Record<V9LensId, readonly { id: V9LayerId; label: string }[]> = {
  flood_wetland: [
    { id: "hh", label: "HH" },
    // C9: the change layer is target − baseline median. Was "Change since first" / "Change vs first".
    { id: "change", label: "Change vs baseline median" },
    { id: "sig", label: "Darkening signature" },
  ],
  wildfire: [
    { id: "hv", label: "HV" },
    { id: "hvdrop", label: "HV decline" },
  ],
  vegetation_disturbance: [
    { id: "hv", label: "HV" },
    { id: "hvdrop", label: "HV decline" },
  ],
  insar: [
    { id: "coh", label: "Coherence" },
    { id: "phase", label: "Wrapped phase" },
  ],
};

// Legend card: the ramp's two ends and a one-line "what am I seeing".
export const LEGEND: Record<V9LayerId, { left: string; right: string; what: string }> = {
  hh: { left: "−30 dB", right: "0 dB", what: "How strongly the ground echoes (HH)" },
  hv: { left: "−30 dB", right: "0 dB", what: "How strongly vegetation echoes (HV)" },
  // C9: was "… than the first pass".
  change: {
    left: "−8 dB",
    right: "+8 dB",
    what: "Blue weaker, red stronger than the baseline median",
  },
  hvdrop: { left: "−8 dB", right: "+8 dB", what: "Blue: HV fell and stayed low" },
  sig: { left: "No signal", right: "Signal met", what: "Cells where HH and HV both darkened" },
  coh: { left: "0 · changed", right: "1 · alike", what: "How alike the two passes are" },
  phase: { left: "−π", right: "+π", what: "Fringes of change between the passes" },
};

// COPY-flow-v9 §5 stamp, split into its date and pass parts (see RESULT.stamp*).
const stampPass = (i: number, n: number, days: number) =>
  `${passOf(i, n)} · ${days} DAYS AFTER PASS ${i - 1}`;
const stampFirstPass = (n: number) => `${passOf(1, n)} · REFERENCE`;
const stampQuakeDate = (a: string, b: string) => `${a} → ${b}`;
const stampQuakePass = (i: number, n: number, days: number) =>
  `INTERVAL ${i} OF ${n} · ${days} DAYS`;

export const RESULT = {
  online: "ONLINE",
  offline: "OFFLINE",
  measured: "MEASURED",
  modeTitleOnline: "Computed live for your square",
  modeTitleOffline: "Prepared ahead of time",
  // C6: the prototype hardcodes "NISAR, track 24".
  originTitle: (track: string) => `NISAR, track ${track}`,
  placeYourSquare: (coordinates: string) => `Your square · ${coordinates}`,
  layerLabel: "Layer",
  altCoherence: "Coherence for the selected pair",
  altPhase: "Wrapped phase for the selected pair",
  // The stamp draws its date and its pass part on two lines, so each string also comes as parts:
  // `stamp*` = date + " · " + `stamp*Pass` (a verbatim split, no new wording).
  stampPass,
  stampFirstPass,
  stampQuakeDate,
  stampQuakePass,
  stamp: (date: string, i: number, n: number, days: number) => `${date} · ${stampPass(i, n, days)}`,
  stampFirst: (date: string, n: number) => `${date} · ${stampFirstPass(n)}`,
  stampQuake: (a: string, b: string, i: number, n: number, days: number) =>
    `${stampQuakeDate(a, b)} · ${stampQuakePass(i, n, days)}`,
  rangeLine: (start: string, end: string, n: number) =>
    `${start} → ${end} · ${n} passes`.toUpperCase(),
  rangeLineQuake: (n: number, a: string, b: string) =>
    `${n} ${plural(n, "pair", "pairs")} · ${a} → ${b}`.toUpperCase(),
  couldBeLabel: "Could also be:",
  notShownLabel: "Not shown:",
  newSquare: "Place a new square",
} as const;

// C3: every stat is N of M from the API; the prototype's case numbers never ship.
export const statOf = (k: number, n: number): string => `${formatCount(k)} of ${formatCount(n)}`;

type ResultCardCopy = {
  phen: string;
  title: string;
  couldBe: string;
  notShown: string;
  limits: readonly string[];
};

type GcovLensId = Exclude<V9LensId, "insar">;

const QUAKE_TAIL =
  "The phase is wrapped and uncorrected for the atmosphere, so it shows a pattern of change, not a distance.";

export const RESULT_CARD: Record<
  GcovLensId,
  ResultCardCopy & { body: string; statLabel: string }
> & {
  insar: ResultCardCopy & {
    body: { pair: (a: string, b: string) => string; event: (k: number, date: string) => string };
    statLabel: (threshold: string) => string;
  };
} = {
  flood_wetland: {
    phen: "FLOOD · BOTH POLARIZATIONS",
    // C10: no event date in the title (COPY had "after {event date}").
    title: "Parts of the square darkened",
    body: "Compared with the median of earlier passes, some cells dropped in both HH and HV, the way new open water does.",
    statLabel: "analysis cells met the darkening signature",
    couldBe: "wet soil, or calm water that was already there.",
    notShown: "flood depth, hectares, probability.",
    limits: [
      "No flood depth, extent in hectares or probability.",
      "Darkening can also be wet soil or calm water that was already there.",
    ],
  },
  wildfire: {
    phen: "WILDFIRE · HV DECLINE",
    title: "HV stayed low after the fire in part of the square",
    // Decision 15 Nov (no fire-start param, C12): a live square compares with the median of earlier passes.
    body: "Compared with the median of earlier passes, HV fell and stayed below its earlier range in some cells. FIRMS detections are shown next to it, not mixed in.",
    // Decision 15 Nov: a live square has no reference perimeter. Was "cells inside the reference perimeter with …".
    statLabel: "cells with repeated HV decline",
    couldBe: "rain, harvest or drying vegetation.",
    notShown: "burned hectares, cause.",
    limits: ["No burned area in hectares and no cause.", "Rain and harvest can also lower HV."],
  },
  vegetation_disturbance: {
    phen: "DEFORESTATION · VEGETATION LENS",
    title: "Some cells lost part of their HV echo",
    body: "HV declined across several passes in some cells, the way it does when canopy is removed. Ploughing and harvest can do the same.",
    statLabel: "cells with repeated HV decline",
    couldBe: "ploughing, harvest or seasonal change.",
    notShown: "hectares of forest lost, cause.",
    limits: ["No hectares of forest lost.", "A decline is evidence of change, not a cause."],
  },
  insar: {
    phen: "EARTHQUAKE · COHERENCE",
    title: "Coherent fringes survive in parts of the square",
    body: {
      // C2: the default body names the pair; the event version only for a case with a sourced event date.
      pair: (a: string, b: string) =>
        `The pair ${a} → ${b} kept its phase in parts of the square. ${QUAKE_TAIL}`,
      event: (k: number, date: string) =>
        `${k} pass pairs straddle the ${date} event. ${QUAKE_TAIL}`,
    },
    // C14 + decision 15 Nov: live InSAR counts phase / window cells (BE models/insar_summary.py).
    // Was "common phase cells met the correction-input checks".
    statLabel: (threshold: string) => `window cells with phase above ${threshold}`,
    couldBe: "atmosphere between the passes, or unwrapping error.",
    notShown: "displacement in cm, magnitude, probability.",
    // C13: the 12 cm line moved to the phase layer's ⓘ (TIPS.layer.phase).
    limits: ["No displacement, magnitude or probability is shown."],
  },
};

// §5 Timeline
export const TIMELINE = {
  title: (i: number, n: number, date: string) => `Pass ${i} of ${n} · ${date}`,
  sub: (n: number, start: string, end: string, track: string, direction: string) =>
    `${n} MEASURED PASSES · ${start} → ${end} · TRACK ${track} ${direction}`.toUpperCase(),
  titleQuake: (i: number, n: number, a: string, b: string) => `Pair ${i} of ${n} · ${a} → ${b}`,
  subQuake: (n: number) => `${n} MEASURED ${plural(n, "PAIR", "PAIRS")} · NEWEST FIRST`,
  // C2: Kumamoto is a chain of intervals; was "{n} MEASURED PAIRS · ALL STRADDLE THE EVENT".
  subQuakeCase: (n: number) => `${n} MEASURED ${plural(n, "PAIR", "PAIRS")}`,
  // C2: only for a case with a sourced event date.
  eventMarker: (date: string) => `EVENT · ${date.toUpperCase()}`,
  straddle: "Only a pair whose two passes fall on either side of the event can show it.",
  gap: (days: number) => `${days} D`,
  play: "Play",
  pause: "Pause",
  previous: "Previous pass",
  next: "Next pass",
  speed: "Speed",
  speeds: ["0.5×", "1×", "2×"],
  loop: "Loop",
  fewer: (i: number, gap: string, a: string, b: string) =>
    `Pass ${i} of 4 · 4 MEASURED PASSES · ${gap} with no pass between ${a} and ${b}`,
  passAria: (i: number, date: string) => `Pass ${i}, ${date}`,
  pairAria: (i: number, a: string, b: string) => `Pair ${i}: ${a} to ${b}`,
} as const;

// Prototype LOOK: the fixed line under the phenomenon chips.
export const LOOK: Record<V9LensId, string> = {
  flood_wetland: "Looks for spots that darken in both HH and HV, the way new open water does.",
  wildfire: "Looks for HV dropping and staying low across several passes.",
  vegetation_disturbance:
    "Looks for HV declining across passes, the way it does when canopy is removed.",
  insar: "Compares the phase of two passes to see where the ground kept its echo.",
};

// Prototype TIPS: the ⓘ texts (SPECS §4 placement).
export const TIPS = {
  phen: "Each phenomenon reads the radar differently: floods look for darkening in both polarizations, fires and forest loss for a drop in HV, earthquakes compare the phase of two passes. Pick what you suspect happened here.",
  dates: {
    gcov: "NISAR passes over each place about every 12 days. Pick a range and we read 5 passes spread evenly across it, then play them in order.",
    insar:
      "Ground movement is read from a pair of passes. The range limits which passes can form pairs; by default we use the 5 most recent.",
  },
  strip: {
    gcov: "Each dot is a day NISAR imaged this square. The shaded band is your date range. The gold dots joined by the gold line are the passes we will read, in order.",
    insar:
      "Each dot is a day NISAR imaged this square. Each arc joins two passes into a pair; the bright gold arc is the pair we will compare. Tap another arc to change it.",
  },
  mode: "ONLINE means we compute your square now, from the NISAR archive, which takes minutes. OFFLINE means the answer was prepared ahead of time and opens at once.",
  cases:
    "Places the team already analysed with real NISAR passes. Each one opens in about a second, with its dates, sources and limits. From any case you can still place your own square.",
  square:
    "NISAR data is analysed in a fixed square of about 10 × 10 km (105 km²). It is big enough to see a pattern and small enough to compute in minutes. Drag it to the spot you care about; nothing runs until you press Start.",
  // C7 + C8: one p80 estimate, and a stopped job shows no result. Was "… we show a range based on recent
  // analyses … at 8 minutes we stop and show what is ready."
  wait: "The time depends on how busy the service is and how many passes it must download, so we show the usual time from recent analyses and count the time that has passed. If it takes longer, we say so; at 8 minutes we stop.",
  steps:
    "Finding passes: we look up which NISAR images exist for your square. Reading: we download only your 10 km piece of each one. Measuring: we compare each pass with the place's own history. Drawing: we turn the result into map layers.",
  chips:
    "ONLINE or OFFLINE says how the answer was obtained: computed now, or prepared earlier. MEASURED means it comes from real NISAR data; DEMO DATA marks anything that is an example. The last chip says what the radar was asked to look for.",
  stat: "The square is split into small analysis cells. This counts how many cells showed the signal, out of how many could be measured. We never turn it into hectares, probabilities or a cause.",
  layer: {
    hh: "HH backscatter: how strongly each spot sends the radar pulse back, on a fixed gray scale from −30 dB (black, very weak, like calm water) to 0 dB (white, very strong, like buildings).",
    // C9: was "Change versus the first pass, …".
    change:
      "Change versus the baseline median, in decibels: blue means the echo got weaker (for example new water), red that it got stronger. White means about the same.",
    sig: "Darkening signature: cells where both HH and HV dropped below their usual range at the same time, the radar pattern of new open water. Blue cells met the rule; gray did not.",
    hv: "HV backscatter: the share of the pulse that comes back twisted, which happens mostly inside leaves and branches. Bright means a lot of vegetation structure; dark means little.",
    // Decision 15 Nov (FIRMS counts only, no dots): dropped "Orange dots are NASA FIRMS fire detections …".
    hvdrop:
      "HV decline: how much HV changed compared with the passes before. Blue cells lost HV and stayed low, the radar pattern of vegetation removed by fire or cutting.",
    coh: "Coherence: how alike the two echoes are, from 0 (changed) to 1 (alike). Dark areas changed between the passes, or are water or dense forest.",
    // C13: the 12 cm line lives here, with "not a displacement" (was "not a distance").
    phase:
      "Wrapped phase: each colour cycle is about 12 cm of change in the radar's path length between the two passes. It mixes ground motion and atmosphere, so it is a pattern, not a displacement.",
  } satisfies Record<V9LayerId, string>,
  timeline: {
    gcov: "Each dot is a real NISAR pass, placed by its actual date, so uneven gaps are real gaps. Press play to watch them in order, change the speed, or click a date to jump there.",
    insar:
      "Each bar is a pair of NISAR passes, newest first. Press play to step through them, or click one.",
    // C2: Kumamoto's intervals are a chain; was "Each bar is a pair of NISAR passes that encloses the event. …".
    insarCase:
      "Each bar is a pair of NISAR passes. Press play to step through the pairs, or click one.",
  },
} as const;

// Prototype PTIP: only the settings the backend accepts (C12).
export const PARAM_TIPS = {
  pair: "The two NISAR passes we compare. If the ground moved between them, the fringes show it. Pick a pair whose dates enclose the moment you care about. Shorter pairs (12 days) keep more of the ground recognisable; longer ones mix in more unrelated change.",
  thr: "Coherence measures how alike the two echoes are, from 0 (nothing alike) to 1 (identical). Pixels below this number are too noisy to trust, so they are left out of the fringes.",
} as const;
