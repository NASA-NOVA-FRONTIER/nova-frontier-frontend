// Visible strings of design v8 (docs/design/v8/COPY-v8.md), verbatim. Components read them from here.
// `{x}` placeholders are small functions; callers pass values from the API, never invented ones.
// §6.5 possible drivers are DRIVERS (#22). §8 errors are STEP_8 (v8-data.js ERRORS, #4).

import type { LensId } from "@/features/cases/cases";

import { tr } from "@/i18n/translate";
import { localized } from "@/i18n/localized";
// Counts are always en-US ("5,513"), whatever the browser's locale.
export const formatCount = (value: number): string => value.toLocaleString("en-US");

// COPY-v8 "Chips".
export const CHIP_COPY = localized({
  real: "REAL",
  realDates: "REAL DATES",
  demo: "DEMO DATA",
  demoDates: "DEMO DATES",
  todo: "TO FILL",
  pending: "PENDING",
  unavailable: "UNAVAILABLE",
  experimental: "EXPERIMENTAL",
  hypothesis: "HYPOTHESIS · NOT A RESULT",
  instant: "INSTANT",
  // Issue #28 (new copy): a demo case computed ahead of time, never a live question.
  offline: "OFFLINE",
  // SPECS-content-pages-v8 §0: typical values drawn for teaching, never a measurement.
  illustrative: "TYPICAL VALUES · ILLUSTRATIVE",
} as const);

// Shared templates used by several steps.
export const passOf = (k: number, n: number): string => tr("PASS {{k}} OF {{n}}", { k, n });
export const cellsOf = (n: number, m: number): string =>
  tr("{{n}} of {{m}} cells", { n: formatCount(n), m: formatCount(m) });

// Top bar
export const TOP_BAR = localized({
  wordmark: "NISAR Hazard Watch",
  searchPlaceholder: "Search a place or paste coordinates",
  searchPlaceholderMobile: "Search a place",
  // COPY writes `{lat}° N, {lon}° E`; callers pass formatLonLat, whose hemisphere letters follow
  // the sign (#24), so a southern or western point never reads "−25° N".
  searchLiveSub: (coordinates: string) => tr("{{coordinates}} · live analysis", { coordinates }),
  searchCaseSub: (hazard: string, monthYear: string) =>
    tr("Known case · {{hazard}} · {{monthYear}}", { hazard, monthYear }),
  // The kind line of a pasted point on the place card (#24, new copy).
  coordinatesKind: "coordinates",
  // Before a job starts there is no backend estimate (decision 8 governs the waiting bar), so the
  // search keeps COPY's tag.
  tagLive: "1–4 MIN",
  tagInstant: "INSTANT",
  ascending: "Ascending",
  descending: "Descending",
  ascendingMobile: "Asc",
  descendingMobile: "Desc",
  modeTour: "Guided tour",
  modeExplore: "Explore",
  linkCases: "Cases",
  linkMethod: "Method",
  wholeGlobe: "Whole globe",
  help: "Help",
  download: "Download",
  fullScreen: "Full screen",
} as const);

// Issue #28 (new copy): a demo case keeps the analysis it was computed with.
export const CASE_LOCK = localized({
  chipTitle:
    "Demo case computed ahead of time: its analysis is fixed and the live service isn't asked.",
  note: (lens: string) =>
    tr(
      "Demo case, computed offline: its analysis is fixed to “{{lens}}”. Search a place or click the globe to ask the radar live.",
      { lens },
    ),
  buttonWhy: "Fixed for this demo case",
} as const);

// Phones (SPECS-v8 §1 Mobile). The pill labels are the short labels of `Explorer v8 v2.dc.html`;
// the sheet handle's labels are new copy, needed because the handle is a button.
export const MOBILE = localized({
  pillsLabel: "Layer on the globe",
  pillHH: "HH",
  pillHV: "HV",
  pillChange: "Δ dB",
  pillRule: "Rule",
  sheetExpand: "Show more of the panel",
  sheetShrink: "Show more of the globe",
} as const);

// 1 · Find a place
export const STEP_1 = localized({
  kicker: "KNOWN CASES · OPEN INSTANTLY",
  title: "What did the radar see?",
  body: "Start with a measured case, or search a place and click any land to read its NISAR passes live.",
  caseName: (name: string, country: string) => `${name}, ${country}`,
  caseSub: (hazard: string, monthYear: string) => `${hazard} · ${monthYear}`,
  caseTag: "INSTANT",
  chocoSub: "Coherence only · Aug 2026",
  // Decision 8 (docs/design/README.md) overrides fixed waits: the UI shows the backend's estimate.
  hint: "Click any land to analyze a 10 km spot live. It reads up to 5 recent passes and takes 1–4 minutes.",
  storyButton: "Watch the 1-minute story",
  globeAria: "Globe. Click any land to analyze a spot.",
} as const);

// 2 · Pick a spot
export const STEP_2 = localized({
  kicker: "NEW SPOT · LIVE ANALYSIS",
  areaLabel: "AREA",
  areaValue: (km: string) => tr("{{km}} km square", { km }),
  areaSub: (posting: string, cells: number) =>
    tr("{{posting}} grid · {{cells}} cells", { posting, cells: formatCount(cells) }),
  waitLabel: "EXPECTED WAIT",
  // Decision 8 (docs/design/README.md) overrides fixed waits: the UI shows the backend's estimate.
  // #25 (decision 8, v9 C7): the card shows the backend's estimate (spot.ts spotWait), not this.
  waitValue: "1–4 min",
  waitSub: "plus any queue",
  catalogLabel: (direction: string) => tr("IN THE CATALOG · {{direction}}", { direction }),
  // #25: the backend's series key didn't say the direction, so none is printed.
  catalogLabelPlain: "IN THE CATALOG",
  catalogWindow: "LAST 5 MONTHS",
  // Only when a gap longer than 24 days exists.
  gapNote: (n: number, date: string) =>
    tr("Only dates NISAR actually measured. The {{n}}-day gap after {{date}} is real.", {
      n,
      date,
    }),
  primary: "Analyze this spot",
  secondary: "Open a known case instead · instant",
  noDataKicker: "CLICKED POINT · NO COVERAGE",
  noDataTitle: "No NISAR data here",
  noDataBody:
    "The catalog has no compatible passes at this point. Over open ocean NISAR data isn't analyzed here.",
  noDataNearest: (km: string) => tr("Nearest known case · about {{km}} km", { km }),
  noDataButton: "Pick another spot",
} as const);

// 3 · Wait
export const STEP_3 = localized({
  kicker: (place: string) => tr("LIVE ANALYSIS · {{place}}", { place }),
  title: "Reading NISAR passes for this spot",
  // Decision 8 (docs/design/README.md) overrides fixed waits: the UI shows the backend's estimate.
  timerNote: "usually 1–4 min",
  timerNoteQueue: "plus any queue",
  axis: ["0", "1 MIN", "2", "3", "4 MIN", "5"],
  queuePosition: (n: number) => `#${n}`,
  queueNote: "One analysis is ahead of yours. Yours starts as soon as it ends.",
  stepSearch: "Searching the catalog",
  stepSearchDone: (n: number, direction: string, from: string, to: string) =>
    tr("{{n}} passes found · {{direction}} · {{from}} → {{to}}", { n, direction, from, to }),
  stepRead: "Reading passes",
  stepReadDone: (k: number, n: number) => tr("{{k}} of {{n}} read", { k, n }),
  stepReadRunning: (k: number, n: number) =>
    tr("{{k}} of {{n}} read · each appears on the timeline", { k, n }),
  stepMeasure: "Measuring change",
  stepMeasureDone: "Target minus baseline median",
  stepDraw: "Drawing layers",
  stepDrawDone: "HH, HV and change",
  stepPending: "waiting",
  stepCurrent: "in progress",
  didYouKnow: (i: number, n: number) => tr("DID YOU KNOW? · {{i}} OF {{n}}", { i, n }),
  cancel: "Cancel analysis",
  compactTitle: (lens: string) => tr("Running the {{lens}} lens", { lens }),
  compactSub: (elapsed: string, n: number) =>
    tr("{{elapsed}} elapsed · on the {{n}} passes already read", { elapsed, n }),
} as const);

// 4 · Raw observations
export const STEP_4 = localized({
  kicker: (date: string, k: number, n: number) =>
    tr("RAW RADAR · {{date}} · {{k}}", { date, k: passOf(k, n) }),
  thumbHH: "HH",
  thumbHHScale: "−30…0 dB",
  thumbHV: "HV",
  thumbHVScale: "−30…0 dB",
  thumbChange: "Change",
  thumbChangeScale: "target − median",
  legendHH: (date: string) => tr("HH on {{date}}, fixed −30 to 0 dB gray.", { date }),
  legendHV: (date: string) =>
    tr("HV on {{date}}, same fixed gray as HH so both read alike.", { date }),
  legendChange: "Target minus baseline median, signed dB, HH.",
  legendChangeLow: "−8 darker",
  legendChangeMid: "0",
  legendChangeHigh: "+8 brighter",
  legendRule: "Cells where HH ≤ −3 dB and HV ≤ −1.5 dB against their own baseline.",
  legendRuleMeets: "Meets rule",
  legendRuleNot: "Doesn't",
  legendCoherence: "Interferometric coherence, fixed 0–1, cividis. Not displacement.",
  dockTitle: "RADAR ON THE GLOBE",
  dockHH: "HH backscatter",
  dockHV: "HV backscatter",
  dockChange: "Change",
  dockRule: "Flood rule cells",
  dockCoherence: "Coherence",
  dockNoPair: "NO PAIR",
  dockLandCover: "Land cover",
  dockGrey: "Grey: no measurement",
  dockOpacity: "Opacity",
  // Not in COPY-v8: approved by Cristian for #20, where a pass has no image for a channel.
  noImage: "No image",
  noPassImage: (pol: "HH" | "HV") => tr("No {{pol}} image for this pass", { pol }),
  lensTitle: "LOOK THROUGH A LENS",
  lensOrAsk: "Or ask",
  // Decision 2 (docs/design/README.md) overrides "no lens": ground motion stays a visible entry.
  lensFooter:
    "Ground motion has no lens. Where an interferometric pair exists, coherence (0–1) appears as a raw layer.",
  // "measured" is not in COPY-v8: Cristian approved it (#20) for a pass that is neither baseline nor target.
  timelinePass: (date: string, role: "target" | "baseline" | "measured", k: number, n: number) =>
    tr("{{date}} · {{role}} · pass {{k}} of {{n}}", { date, role, k, n }),
  timelineWindow: (direction: string, from: string, to: string) =>
    tr("{{direction}} · {{from}} – {{to}} · ONLY MEASURED DATES", { direction, from, to }),
  timelineBaseline: (n: number) => tr("BASELINE · {{n}} PASSES", { n }),
  timelineToday: "TODAY",
  timelineArriving: (k: number, n: number) => tr("Passes arriving · {{k}} of {{n}} read", { k, n }),
  timelineArrivingSub: "Each pass appears here as soon as it is read",
  playAria: (n: number) => tr("Play the {{n}} passes", { n }),
  pauseAria: "Pause time-lapse",
  playStampPass: (k: number, n: number, role: "BASELINE" | "TARGET") => `${passOf(k, n)} · ${role}`,
  footprint: (km: string, posting: string) =>
    tr("ANALYSIS AREA · {{km}} km · {{posting}} GRID", { km, posting }),
  footprintMobile: (km: string, posting: string) => `${km} km · ${posting}`,
} as const);

// 5 · Lenses. Ground motion (`insar`) is not in the handoff's table (decision 2 keeps it apart).
export type V8LensId = Exclude<LensId, "insar">;

export type LensCopy = { label: string; question: string; rule: string };

export const LENS_COPY: Record<V8LensId, LensCopy> = localized({
  flood_wetland: {
    label: "Flood & wetland",
    question: "Did water appear here?",
    rule: "HH ≤ −3 dB and HV ≤ −1.5 dB vs this spot's baseline",
  },
  vegetation_disturbance: {
    label: "Vegetation disturbance",
    question: "Was vegetation lost?",
    rule: "Radar change where optical shows loss, against matched cells",
  },
  wildfire: {
    label: "Wildfire",
    question: "Did the fire spread?",
    rule: "HV below its baseline band on two or more passes",
  },
  agriculture: {
    label: "Agriculture",
    question: "Did this field change differently from its neighbours?",
    rule: "A 60 m patch against matched cells 120–300 m away",
  },
});

// 6 · Lens result
export const STEP_6 = localized({
  verdictDeparture: "Departure observed",
  verdictWithin: "Within its usual range",
  verdictNotEnough: "Not enough data",
  floodHeadline: (newWater: boolean, fraction: string) =>
    tr(
      "{{v0}} at the exact spot you clicked. Around it, {{fraction}} of the area darkened the way calm new water does.",
      { v0: newWater ? "New water" : "No new water", fraction },
    ),
  ruleTitle: "WHERE THE FLOOD RULE IS MET",
  ruleCount: cellsOf,
  ruleToggleOn: "On the globe",
  ruleToggleOff: "Show on globe",
  ruleCaption: (date: string, n: number, k: number) =>
    tr(
      "Dark navy cells: HH fell 3 dB or more and HV 1.5 dB or more on {{date}}, against each cell's own median of {{n}} earlier passes. Another {{k}} cells brightened. Cells meeting a rule, not flooded area.",
      { date, n, k: formatCount(k) },
    ),
  pixelTitle: "AT THE PIXEL YOU CLICKED",
  pixelHH: "HH",
  pixelHV: "HV",
  pixelDelta: (signed: string) => `${signed} dB`,
  pixelBand: (x: string, inside: boolean) =>
    tr("band ±{{x}} dB · {{v1}}", { x, v1: inside ? "inside" : "outside" }),
  whyTwoTitle: "WHY TWO",
  whyTwo: {
    flood_wetland:
      "HH mostly bounces off surfaces; HV comes from echoes scattered inside leaves and branches. Calm water mirrors the pulse away, so it darkens both. That is why the rule asks for both.",
    vegetation_disturbance:
      "HV comes mostly from leaves and branches. When trees are cleared HV drops more than HH, so the lens watches HV first.",
    wildfire:
      "Burning removes the canopy that scatters HV. A drop in HV that stays low on later passes is the radar trace of a burn scar.",
    agriculture:
      "Crops change through the season in both channels. Comparing a field with its neighbours on the same dates separates one field's change from the season's.",
  } satisfies Record<V8LensId, string>,
  opticalTitle: "SECOND WITNESS · OPERA OPTICAL",
  opticalPending: "PENDING",
  opticalReady: "READY · REAL",
  opticalUnavailable: "UNAVAILABLE",
  opticalAgree: (n: number) =>
    tr(
      "Optical images agree: {{n}} in 10 cells that turned to water also meet the radar rule. Cells that stayed dry almost never do.",
      { n },
    ),
  // When fewer than 5 in 10 agree.
  opticalPartly: (n: number) =>
    tr(
      "Optical images partly agree: {{n}} in 10 cells that turned to water also meet the radar rule.",
      { n },
    ),
  opticalPendingText: (d1: string, d2: string) =>
    tr(
      "Looking for optical snapshots within 4 days of {{d1}} and {{d2}}. The radar result doesn't wait for it.",
      { d1, d2 },
    ),
  opticalUnavailableText:
    "No OPERA snapshot with enough clear cells within 4 days of the radar dates. The radar result stands on its own.",
  whiskerCaption: (n: number) =>
    tr("New-water cells minus matched dry cells, {{n}} pairs · 95% spatial interval", {
      n: formatCount(n),
    }),
  opticalPoint: (state: string) => tr("At your pixel's optical cell: {{state}}.", { state }),
  // Gate 2 (Cristian, 14 Nov 2026): the lead when no cell turned to water; Claude Design may reword it.
  opticalNoNewWater: (d1: string, d2: string, k: number, n: number) =>
    tr(
      "Optical images show no new open water between {{d1}} and {{d2}}; {{k}} of {{n}} cells that stayed dry {{v4}} the radar rule.",
      { d1, d2, k: formatCount(k), n: formatCount(n), v4: k === 1 ? "meets" : "meet" },
    ),
  surroundingsTitle: "THIS SPOT VS ITS SURROUNDINGS",
  surroundingsInsufficient: (n: number, posting: string, k: number) =>
    tr("The 60 m patch holds {{n}} cell on this {{posting}} grid; the comparison needs {{k}}.", {
      n,
      posting,
      k,
    }),
  moreInfo: "More information",
} as const);

// Lens result card (#21): §3 and §6 strings with their numbers filled from the answer, plus the lines
// Cristian approved on 13 Nov 2026 (surroundings, ground-motion entry). Verbatim where COPY has them.
export const LENS_CARD = localized({
  kicker: (label: string) => tr("LENS · {{toUpperCase}}", { toUpperCase: label.toUpperCase() }),
  // SPECS-v8 §6: the share of cells meeting the rule, in words.
  fewCells: "a few cells",
  aboutATenth: "about a tenth",
  aQuarter: "a quarter",
  aThird: "a third",
  aboutHalf: "about half",
  most: "most",
  // §6 caption; "Dark navy cells: " only when the rule thumbnail is on screen to point at.
  ruleCaption: (thumb: boolean, co: string, cross: string, date: string, n: number, k: number) =>
    tr(
      "{{v0}}HH fell {{co}} dB or more and HV {{cross}} dB or more on {{date}}, against each cell's own median of {{n}} earlier passes. Another {{k}} cells brightened. Cells meeting a rule, not flooded area.",
      { v0: thumb ? "Dark navy cells: " : "", co, cross, date, n, k: formatCount(k) },
    ),
  // §3 compact row without "on the {n} passes already read": a lens switch is a new run (decision 5).
  runningSub: (elapsed: string) => tr("{{elapsed}} elapsed", { elapsed }),
  cancelLens: "Cancel lens",
  // Decision 2: ground motion stays a visible entry, in the app's existing words.
  groundMotion: "Did the ground keep its echo?",
  groundMotionNote: "measured, not a verdict",
  surroundingsSame: "Did not darken more",
  surroundingsDarker: "Darkened more",
  surroundingsNotEnough: "Not enough data",
  surroundingsSameLine: (r: number, a: number, b: number) =>
    tr(
      "The {{r}} m patch around your pixel did not darken more than matched cells {{a}}–{{b}} m away.",
      { r, a, b },
    ),
  surroundingsDarkerLine: (r: number, a: number, b: number, co: string, cross: string) =>
    tr(
      "The {{r}} m patch around your pixel darkened more than matched cells {{a}}–{{b}} m away: by {{co}} dB or more in HH and {{cross}} dB or more in HV.",
      { r, a, b, co, cross },
    ),
  surroundingsCounts: (f: number, c: number, s: number) =>
    tr("{{f}} cells in the patch, compared with {{c}} matched cells out of {{s}} around it.", {
      f: formatCount(f),
      c: formatCount(c),
      s: formatCount(s),
    }),
  // §6 insufficient template with the patch radius and the plural from the answer.
  surroundingsInsufficient: (r: number, n: number, posting: string, k: number) =>
    tr(
      "The {{r}} m patch holds {{n}} {{v2}} on this {{posting}} grid; the comparison needs {{k}}.",
      { r, n: formatCount(n), v2: n === 1 ? "cell" : "cells", posting, k: formatCount(k) },
    ),
} as const);

// Wildfire card (#27). `oneAssessmentLine`, `comparesTitle` and `note` are verbatim from
// `reference/Lens Result v2.dc.html` (OTHER.wildfire, the non-flood section). The rest
// was approved by the team on 13 Nov 2026; the FIRMS title follows decision 6 and the OPERA title.
export const WILDFIRE_CARD = localized({
  oneAssessmentLine: "This lens needs at least two passes after the baseline. This spot has one.",
  comparesTitle: "WHAT THIS LENS COMPARES",
  note: "Counts on how many sampled passes HV stayed below its band, and whether it came back.",
  declineRow: (date: string) => tr("with HV below its band on {{date}}", { date }),
  pixelLine: (n: number, m: number) =>
    tr("At your pixel: HV below its band on {{n}} of {{m}} {{v2}} after the baseline.", {
      n,
      m,
      v2: m === 1 ? "pass" : "passes",
    }),
  cellsNote: "Cells below a band, not burned area.",
  // Decision 6: FIRMS in the place of OPERA.
  witnessTitle: "SECOND WITNESS · NASA FIRMS",
} as const);

// Agriculture card (#28). `insufficientLine`, `comparesTitle`, `note`, `patchTooSmall` and
// `radarOnly` are verbatim from `reference/Lens Result v2.dc.html` (OTHER.agriculture). The rest
// was approved by the team on 13 Nov 2026.
export const AGRICULTURE_CARD = localized({
  insufficientLine: "The 60 m patch has too few cells on this grid to compare with its neighbours.",
  comparesTitle: "WHAT THIS LENS COMPARES",
  note: "Compares the median level inside 60 m with matched cells 120–300 m away, pass by pass.",
  patchTooSmall: (n: number, r: number, k: number) =>
    tr("{{n}} {{v1}} in the {{r}} m patch; needs {{k}}", {
      n: formatCount(n),
      v1: n === 1 ? "cell" : "cells",
      r,
      k: formatCount(k),
    }),
  radarOnly: "Radar only: no optical check for this lens",
  // Headlines for an evaluated patch, from the per-channel contrast states.
  likeNeighbours: (date: string) =>
    tr("This field changed like its neighbours on {{date}}.", { date }),
  unclear: (date: string) =>
    tr("No clear difference between this field and its neighbours on {{date}}.", { date }),
  // Per-channel state labels.
  stateAbsent: (db: string) => tr("No difference beyond ±{{db}} dB", { db }),
  stateInsufficient: "Too uncertain to say",
  // After STEP_6.whiskerCaption.
  whiskerCaption: (n: number) =>
    tr("Patch cells minus matched cells, {{n}} pairs · 95% spatial interval", {
      n: formatCount(n),
    }),
} as const);

// §6 second witness (#22). Group labels are v8-data.js `LIVE.optical.groups`; "Open water receded",
// the snapshot line (with its dates-only form) and the point-state words were approved at gate 2
// (14 Nov 2026) and still wait for a COPY check.
export const WITNESS = localized({
  groupNewWater: "New open water",
  groupStableWater: "Water on both dates",
  groupStayedDry: "Stayed dry",
  groupReceded: "Open water receded",
  groupMixed: "Mixed or partial",
  snapshots: (preSensor: string, preDate: string, postSensor: string, postDate: string) =>
    `${preSensor} ${preDate} → ${postSensor} ${postDate}`,
  snapshotDates: (preDate: string, postDate: string) => `${preDate} → ${postDate}`,
  whiskerTitle: "HH",
  whiskerInterval: (low: string, high: string) =>
    tr("Between {{low}} and {{high}} dB.", { low, high }),
  // `point_group_code` in words; no optical cell under the pixel reads as not enough clear view.
  pointGroup: {
    0: "stayed dry",
    1: "new open water",
    2: "water on both dates",
    3: "open water receded",
    4: "mixed or partial",
  } as Record<number, string>,
  pointNoCell: "not enough clear view",
} as const);

// §6.5 possible drivers (flood). FOR/AGAINST are COPY-v8's Barh lines with the API's numbers as
// parameters; Barh-only words that no field backs ("in the monsoon", "Barh sits on the Ganges",
// "river channel, ponds", "changed less than the new-water cells") are left out.
export const DRIVERS = localized({
  kicker: "POSSIBLE DRIVERS",
  intro: "What could make the echo change like this, weighed against the evidence above.",
  forLabel: "FOR",
  againstLabel: "AGAINST",
  fit: { fitsBest: "FITS BEST", partly: "PARTLY", weak: "WEAK" },
  flooding: {
    title: "River flooding",
    for: (n: number, d1: string, d2: string, pct: number) =>
      tr(
        "Optical shows {{n}} cells turned to open water between {{d1}} and {{d2}}; {{pct}}% of them meet the radar rule.",
        { n: formatCount(n), d1, d2, pct },
      ),
    against: "No river-gauge or flood-bulletin record was checked.",
  },
  existingWater: {
    title: "Water that was already there",
    for: (n: number) => tr("{{n}} cells were water on both optical dates.", { n: formatCount(n) }),
    against: (k: number) => tr("Only {{k}} of them meet the rule.", { k: formatCount(k) }),
  },
  // Gate 2 (14 Nov 2026): both lines cite a returned number (SPECS §6.5); Claude Design may reword.
  wetSoil: {
    title: "Wet soil or crops after rain",
    for: (k: number) =>
      tr("Radar darkened {{k}} {{v1}} that optical shows stayed dry.", {
        k: formatCount(k),
        v1: k === 1 ? "cell" : "cells",
      }),
    against: (pct: string) => tr("That is {{pct}}% of the stayed-dry cells.", { pct }),
  },
  footerSettle: "A river gauge, rain record or field report would settle it.",
  footerNotChecked: (...items: string[]) =>
    tr("Not checked here: {{join}}.", { join: items.join(", ") }),
  // `confounders[].id` in words; existing water and rain are the driver cards themselves.
  confounder: {
    wind: "wind on water",
    incidence_and_track: "look angle",
    speckle_and_noise: "speckle",
    layover_or_shadow: "terrain shadow",
    freeze_thaw: "freeze and thaw",
  } as Record<string, string>,
} as const);

// 7 · More information
export const STEP_7 = localized({
  kicker: (
    place: string,
    lens: string,
    lat: string,
    lon: string,
    n: number,
    from: string,
    to: string,
  ) =>
    tr("{{place}} · {{lens}} · {{lat}}, {{lon}} · {{n}} PASSES, {{from}} – {{to}}", {
      place,
      lens,
      lat,
      lon,
      n,
      from,
      to,
    }),
  title: (place: string) => tr("What the radar measured at {{place}}", { place }),
  tabSummary: "Summary",
  tabDetail: "More detail",
  switchPlain: "Plain",
  switchTechnical: "Technical",
  questionTitle: "01 · THE QUESTION",
  questionWhere: "WHERE",
  questionWhen: "WHEN",
  questionWhat: "QUESTION",
  measurementTitle: "02 · THE MEASUREMENT",
  sliderBaseline: (n: number) => tr("BASELINE MEDIAN · {{n}} PASSES", { n }),
  sliderTarget: (date: string) => tr("TARGET · {{date}}", { date }),
  sliderCaption: "Drag to compare HH before and after, both on the same fixed −30 to 0 dB gray.",
  tileChangeHH: "Change HH",
  tileChangeHV: "Change HV",
  tileRule: "Flood rule cells",
  tileOptical: "Optical groups",
  plainTitle: "03 · IN PLAIN WORDS",
  howTitle: "HOW THIS WAS COMPUTED",
  howSteps: [
    { title: "Finding NISAR passes over this point", sub: "catalog · compatible series" },
    { title: "Choosing one radar series", sub: "same track, frame, polarizations" },
    {
      title: (n: number) => tr("Reading {{n}} passes", { n }),
      sub: (posting: string) => tr("GCOV · HH and HV · {{posting}}", { posting }),
    },
    {
      title: "Building this spot's normal range",
      sub: (n: number) => tr("median ± MAD of {{n}} earlier passes", { n }),
    },
    { title: "Comparing the target pass", sub: "signed dB, common cells" },
    { title: "Looking for optical water", sub: "OPERA DSWx · within 4 days" },
  ],
  evidenceTitle: "EVIDENCE AND QUALITY",
  sourcesTitle: "SOURCES",
  historiesTitle: "01 · CHANNEL HISTORIES",
  balanceTitle: "02 · POLARIZATION BALANCE · HV − HH",
  patchesTitle: "03 · SPATIAL STRUCTURE · PATCHES",
  historicalTitle: "04 · HISTORICAL BEHAVIOUR",
  gpUnavailable: (n: number) =>
    tr("Model fit (GP) unavailable: needs 6 passes, this spot has {{n}}.", { n }),
} as const);

// 8 · Errors and limits (v8-data.js ERRORS). Decision 8 (docs/design/README.md): no daily number is
// hardcoded, so the handoff's "12" sentences go and every count comes from GET /api/v1/limits.
export const STEP_8 = localized({
  quotaLowCat: "Quota · few left",
  quotaLowTitle: (n: number) =>
    tr("{{n}} live {{v1}} left today", { n, v1: n === 1 ? "analysis" : "analyses" }),
  // Decision 8: "The app shares 12 live analyses a day across everyone." dropped with its number.
  quotaLowBody: "Known cases and repeat spots don't use one.",
  quotaOutCat: "Quota · used up",
  quotaOutTitle: "Today's live analyses are used up",
  // Decision 8: "All 12 for the app are taken." dropped; the reset comes from the backend or 00:00 UTC.
  quotaOutBody: (at: string, wait: string) =>
    tr("They reset at {{at}} UTC, in {{wait}}. Known cases open instantly and don't count.", {
      at,
      wait,
    }),
  resetIn: (h: number, m: number) => tr("{{h}} h {{m}} min", { h, m }),
  queueFullCat: "Queue full",
  // The handoff's "Two analyses" and "One runs at a time and one can wait." assume a capacity the
  // backend doesn't report (it is configurable), so no count is printed.
  queueFullTitle: "Analyses are already in line",
  queueFullBody: "Try again in a few minutes.",
  timeoutCat: "Time ran out",
  timeoutTitle: "The analysis ran out of time",
  // "(about 4 minutes)" only when the backend states its own limit.
  timeoutBody: (minutes: number | undefined) =>
    tr(
      "Reading the passes took longer than the server allows{{v0}}. Try again, or open a known case.",
      { v0: minutes === undefined ? "" : ` (about ${minutes} minutes)` },
    ),
  restartedCat: "Server down or restarted",
  restartedTitle: "The server restarted and lost this job",
  restartedBody: "It's back up. Running the same spot again starts a new job.",
  noDataCat: "No data",
  noDataTitle: "NISAR has no usable pass here yet",
  noDataBody: (otherDirection: boolean) =>
    tr("The catalog lists passes, but none had valid pixels at this point. {{v0}}", {
      v0: otherDirection ? "Try the other pass direction or a known case." : "Try a known case.",
    }),
  partialCat: "Partial result",
  partialTitle: (k: number, n: number) => tr("{{k}} of {{n}} passes arrived", { k, n }),
  partialBody: (missing: number) =>
    tr("{{v0}} couldn't be read. Lenses that need a 3-pass baseline may say Not enough data.", {
      v0: missing === 1 ? "One pass" : `${missing} passes`,
    }),
  analyze: "Analyze this spot",
  knownCase: "Open a known case",
  tryAgain: "Try again",
  runAgain: "Run it again",
  tryDirection: (direction: string) => tr("Try {{direction}}", { direction }),
  showPartial: "Show what arrived",
  instant: "INSTANT",
} as const);

// Not in COPY-v8: Nova answered by Claude (#31). Rule-based stays the label whenever Claude isn't
// answering, so the chat never claims more than it is.
export const NOVA_AI = localized({
  ruleLine: "Rule-based assistant · not an AI model yet",
  aiLine: "Answers by Claude from the result on screen · check numbers against the panel",
  aiChip: (model: string) =>
    tr(
      "Written by Claude ({{model}}) from the result on screen. It can be wrong: every number is on the panel with its source.",
      { model },
    ),
  ruleChip:
    "Rule-based answers from the data on screen. Real version: a language model that cites the case sources",
  writing: "Nova is writing…",
  by: "Written by Claude from the result on screen",
  fallback: "Claude couldn't answer this, so here is the rule-based answer.",
} as const);

// Not in COPY-v8: the landslide More information panel (#24). Niscemi's passes all follow the
// event, so the copy says what the radar measured afterwards and never what the landslide did.
export const LANDSLIDE = localized({
  kicker: "Landslide reading",
  aftermathTitle: "Aftermath only",
  aftermathBody: (event: string, first: string, days: number) =>
    tr(
      "Every pass is after the {{event}} landslide; the first is on {{first}}, {{days}} days later. The radar shows how the slope behaved afterwards, not the landslide itself.",
      { event, first, days },
    ),
  imagery: "Radar image",
  view: "View",
  viewPass: "One pass",
  channel: "Channel",
  pass: "Pass",
  baselineRole: "baseline",
  assessmentRole: "assessment",
  passText: (date: string, channel: string) =>
    tr(
      "{{channel}} return on {{date}}, fixed −30 to 0 dB gray. Left of the handle: the baseline median of the same channel.",
      { channel, date },
    ),
  compareLeft: "Baseline median",
  grayScale: ["−30 dB", "0 dB"] as [string, string],
  history: "The area's return, pass by pass",
  historyText:
    "Median of the 16,384 cells (solid) and the marker pixel at the case point (dashed). The shaded months are the baseline.",
  areaHH: "Area median HH",
  areaHV: "Area median HV",
  pointHH: "Marker HH",
  pointHV: "Marker HV",
  outside: "Cells outside their own baseline band",
  outsideText: "Share of the 16,384 cells on a fixed 0–100% axis.",
  outsideRow: (cells: string, total: string) =>
    tr("{{cells}} of {{total}} cells", { cells, total }),
  shift: (date: string) => tr("Shift on {{date}}, against the baseline median", { date }),
  shiftArea: "Median change per cell",
  shiftIqr: (range: string) => tr("Middle half of the cells: {{range}}", { range }),
  shiftPoint: (value: string) => tr("Marker pixel: {{value}}", { value }),
  table: "Values by pass",
  tableDate: "Date",
  tableRole: "Role",
  tableArea: (channel: string) => tr("Area median {{channel}}", { channel }),
  tablePoint: (channel: string) => tr("Marker {{channel}}", { channel }),
  tableOutside: "Outside band",
  how: "How it was measured",
  howSteps: (series: string, baseline: string, target: string, grid: string) => [
    `One NISAR L2 GCOV series (${series}), HH and HV, on a ${grid} grid.`,
    `Baseline: the cell-wise median of the four passes ${baseline}.`,
    `Target: ${target} minus that median, for every cell and at the marker.`,
  ],
  bandRule: "Out-of-band rule",
  experimentalWhy:
    "No validated landslide lens exists: these are measured returns, read as candidate evidence only.",
} as const);

// Not in COPY-v8: the printable reports and their PDF (#37).
export const REPORT = localized({
  offline: "OFFLINE · measured ahead of time",
  online: "ONLINE · computed live from NISAR L-band scenes",
  scientificStatus: "Diagnostic evidence, not a validated classifier",
  imagesKicker: "The measured images",
  changeAlt: (name: string) => tr("Radar change layer at {{name}}", { name }),
  baselineAlt: (name: string) => tr("Radar baseline layer at {{name}}", { name }),
  figureAlt: (name: string) => tr("Backend report figure for {{name}}", { name }),
  alternatives: "Other things that change radar like this:",
  valuesKicker: "Measured values by date, at the point",
  valuesNote: "gamma-zero dB at the measured point; an empty cell is a masked channel, never zero.",
  limitsAll: "Limits the radar service states for this answer",
  retry: "Try again",
  loadFailed: "We couldn't load this answer",
  loadFailedBody:
    "The server didn't answer. Try again, or ask the question again from the explorer once it is done.",
} as const);
