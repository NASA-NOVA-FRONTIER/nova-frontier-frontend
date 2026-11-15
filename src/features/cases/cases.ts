import { NISCEMI } from "@/features/cases/niscemi";
import type { LonLat } from "@/features/frames/frame.types";
import type { LandslideEvidence } from "@/features/landslide/landslideEvidence";

/*
 * Measured cases from the science backend (github.com/NASA-NOVA-FRONTIER/nova-frontier-model). Every number here
 * is copied from its reports; DATA_PROVENANCE in design_handoff_v7 says where each one comes from.
 * Pass dates on the timeline are DEMO (12-day spacing) until the backend serves the real ones,
 * except where a case marks them `realDates` (Niscemi, copied from its series).
 */

export type LensId =
  "flood_wetland" | "vegetation_disturbance" | "wildfire" | "agriculture" | "insar";
// A measured case can also be read without a lens of its own: the model's descriptive
// observed_dynamics (Niscemi). It is never a live lens, so it stays out of LENSES and LensId.
export type CaseLensId = LensId | "observed_dynamics";
export type HazardId = "earthquake" | "wildfire" | "deforestation" | "flood" | "landslide";
export type IconId = HazardId | "agriculture";

// The backend's three outcomes: observed_departure, within_observed_baseline, insufficient_data.
export type Verdict = "departure" | "within" | "insufficient";
// Ground-motion cases report what the pair measured, not a verdict (as live InSAR answers do).
export type CaseVerdict = Verdict | "measured";

export type ContrastRow = { label: string; k: number; n: number; color: string };
export type ContrastGroup = { title: string; sub: string; rows: ContrastRow[] };

export type Matched = {
  title: string;
  n: string;
  v: number;
  ci: [number, number];
  line: string;
};

export type QualityItem = { k: string; v: string; why: string };
export type Source = { label: string; href: string };

export type PassKind = "base" | "target" | "meas" | "plan";
export type TimelinePass = { date: string; kind: PassKind; outsidePct?: number };
export type TimelineData = {
  passes: TimelinePass[];
  start: string;
  end: string;
  today: string;
  onset?: { date: string; label: string };
  optical: Array<{ date: string; label: string }>;
  opticalNote: string;
  // The dates and "% outside range" come from the case's own series, not the 12-day demo.
  realDates?: boolean;
};

// Optical and signature exist only where the case had an optical stage (the flood cases).
export type Crops = { base: string; change: string; optical?: string; signature?: string };

export type Case = {
  id: string;
  lens: CaseLensId;
  hazard: HazardId;
  name: string;
  place: string;
  region: string;
  focus: LonLat;
  chipKm?: number;
  when: string;
  target?: string;
  verdict: CaseVerdict;
  verdictLine: string;
  // Which demo series the band chart draws; undefined when the lens has no band (InSAR).
  band?: Verdict;
  reason?: string;
  stat: string;
  statLine: string;
  groups?: ContrastGroup[];
  matched?: Matched;
  witness?: { label: string; note: string };
  quality: QualityItem[];
  plainLimit: string;
  techLimit: string;
  alternatives: string[];
  empties: string[];
  sources: Source[];
  figure?: string;
  crops?: Crops;
  timeline?: TimelineData;
  // Where the headline number comes from, for its REAL chip, when it isn't the lens's usual report.
  statSource?: string;
  // Coherence only (Chocó): a measured median but no case layer, timeline or report.
  coherenceOnly?: boolean;
  tour?: boolean;
  // A landslide case: its per-pass series and layers for the More information panel (#24).
  landslide?: LandslideEvidence;
};

export type Lens = { id: LensId; chip: string; icon: IconId; compares: string };

export const LENSES: Lens[] = [
  {
    id: "flood_wetland",
    chip: "Did it flood?",
    icon: "flood",
    compares: "Both channels darkening, checked against OPERA optical water",
  },
  {
    id: "vegetation_disturbance",
    chip: "Did vegetation disappear?",
    icon: "deforestation",
    compares: "Radar change where optical data show loss, against matched cells",
  },
  {
    id: "wildfire",
    chip: "Did fire scar it?",
    icon: "wildfire",
    compares: "HV staying below its earlier range across several passes",
  },
  {
    id: "agriculture",
    chip: "Did a field change?",
    icon: "agriculture",
    compares: "A 60 m patch against its 120–300 m surroundings",
  },
  {
    id: "insar",
    chip: "Did the ground keep its echo?",
    icon: "earthquake",
    compares: "Where the echo kept or lost coherence between two passes",
  },
];

// Docs/design/v8 PLAN-content-pages-v8 §0: "the radar checks whether passes bracket the event and
// whether the slope kept its echo".
export const OBSERVED_DYNAMICS = {
  chip: "Did the slope keep its echo?",
  icon: "landslide",
  compares: "Every pass against the median of the first four, all after the event",
} as const satisfies Omit<Lens, "id">;

export const findLens = (id: CaseLensId): Omit<Lens, "id"> | undefined =>
  id === "observed_dynamics" ? OBSERVED_DYNAMICS : LENSES.find((lens) => lens.id === id);

// OPERA's optical classes (Okabe–Ito), so the colours match the backend legend.
export const OPTICAL = {
  newWater: "#0072b2",
  stableWater: "#56b4e9",
  dry: "#a8997a",
  loss: "#e69f00",
  mixed: "#cc79a7",
  unsupported: "#62666d",
} as const;

const EMPTY_FLOOD = ["Flood depth", "Probability", "Cause", "Validated extent"];
const MODELING = "https://github.com/NASA-NOVA-FRONTIER/nova-frontier-model/blob/main/docs";

const pass = (date: string, kind: PassKind, outsidePct?: number): TimelinePass =>
  outsidePct === undefined ? { date, kind } : { date, kind, outsidePct };

const crops = (id: string): Crops => ({
  base: `/cases/${id}-base.png`,
  change: `/cases/${id}-change.png`,
  optical: `/cases/${id}-optical.png`,
  signature: `/cases/${id}-signature.png`,
});

export const CASES: Case[] = [
  {
    id: "qadirabad",
    lens: "flood_wetland",
    hazard: "flood",
    name: "Qadirabad",
    place: "Chenab River, Pakistan",
    region: "Punjab · Chenab",
    focus: [73.713, 32.329],
    chipKm: 5.12,
    when: "Jul 2026",
    target: "2026-07-26",
    verdict: "departure",
    verdictLine:
      "At the marked point both channels darkened on 26 Jul 2026, against 3 earlier passes.",
    band: "departure",
    stat: "64.3% vs 1.0%",
    statLine: "of new-water cells flagged, against dry land. Existing water: 17.0%.",
    groups: [
      {
        title: "Flagged by the radar rule",
        sub: "first assessment minus the baseline median",
        rows: [
          { label: "New water (optical)", k: 332, n: 516, color: OPTICAL.newWater },
          { label: "Already water (optical)", k: 748, n: 4393, color: OPTICAL.stableWater },
          { label: "Stayed dry (optical)", k: 38, n: 3866, color: OPTICAL.dry },
        ],
      },
    ],
    matched: {
      title: "Matched pairs · HH, new water minus dry land",
      n: "463 pairs with similar radar before the flood",
      v: -4.93,
      ci: [-5.63, -3.88],
      line: "Spatial resampling puts it between −5.63 and −3.88 dB. The interval excludes zero.",
    },
    witness: { label: "OPERA DSWx-HLS · 17 Jul → 2 Aug", note: "Optical 3 and 7 days from radar" },
    quality: [
      { k: "Status", v: "Complete", why: "Full radar support and 100% usable optical coverage." },
      { k: "Passes", v: "3 + 5", why: "Three baseline passes, five assessment passes." },
      {
        k: "Mixed",
        v: "7,609 cells",
        why: "Mixed or partial optical cells stay out of the comparison.",
      },
    ],
    plainLimit:
      "Water that was already there darkened too, so the rule also flagged 17% of existing water.",
    techLimit:
      "Against the optical proxy: precision 29.7%, recall 64.3%, IoU 25.5% on 8,775 cells, using the multi-date baseline median. Sensitivity check: the comparator changes the result a lot. Comparing with only the last baseline pass gives 90.4% / 45.5%. That check was added after seeing the results, so it is not an alternative score.",
    alternatives: ["Existing open water", "Wet soil", "Crops"],
    empties: EMPTY_FLOOD,
    sources: [
      {
        label: "PMD / FFD · Chenab flood bulletin, 22–24 Jul 2026",
        href: "https://ffd.pmd.gov.pk/b/eacdcd80-11ca-4316-a9e9-e337e5c7d8fd",
      },
      {
        label: "nova-frontier-model · flood characterization",
        href: `${MODELING}/FLOOD_CHARACTERIZATION.md`,
      },
      {
        label: "OPERA DSWx-HLS · PO.DAAC",
        href: "https://podaac.jpl.nasa.gov/dataset/OPERA_L3_DSWX-HLS_V1",
      },
    ],
    figure: "/cases/figures/qadirabad_flood_evidence.png",
    crops: crops("qadirabad"),
    tour: true,
    timeline: {
      passes: [
        pass("2026-06-20", "base"),
        pass("2026-07-02", "base"),
        pass("2026-07-14", "base"),
        pass("2026-07-26", "target", 11.2),
        pass("2026-08-07", "meas", 8.4),
        pass("2026-08-19", "meas", 5.1),
        pass("2026-08-31", "meas", 3.3),
        pass("2026-09-12", "meas", 2.0),
        pass("2026-11-16", "plan"),
        pass("2026-11-28", "plan"),
      ],
      start: "2026-06-10",
      end: "2026-12-05",
      today: "2026-11-08",
      onset: { date: "2026-07-22", label: "Bulletin 22 Jul" },
      optical: [
        { date: "2026-07-17", label: "OPERA · pre · 17 Jul" },
        { date: "2026-08-02", label: "OPERA · post · 2 Aug" },
      ],
      opticalNote: "Optical check: OPERA 17 Jul → 2 Aug",
    },
  },
  {
    id: "chokwe",
    lens: "flood_wetland",
    hazard: "flood",
    name: "Chókwè",
    place: "Limpopo River, Mozambique",
    region: "Gaza · Limpopo",
    focus: [32.99, -24.52],
    chipKm: 5.12,
    when: "Jan 2026",
    target: "2026-01-17",
    verdict: "departure",
    verdictLine:
      "New-water cells darkened against matched dry cells, but only one assessment pass exists.",
    band: "departure",
    stat: "37.3% vs 0.7%",
    statLine: "of new-water cells flagged, against dry land.",
    groups: [
      {
        title: "Flagged by the radar rule",
        sub: "first assessment minus the baseline median",
        rows: [
          { label: "New water (optical)", k: 164, n: 440, color: OPTICAL.newWater },
          { label: "Stayed dry (optical)", k: 20, n: 2881, color: OPTICAL.dry },
        ],
      },
    ],
    matched: {
      title: "Matched pairs · HH, new water minus dry land",
      n: "382 pairs with similar radar before the flood",
      v: -4.34,
      ci: [-5.08, -3.47],
      line: "Spatial resampling puts it between −5.08 and −3.47 dB.",
    },
    witness: {
      label: "OPERA DSWx-HLS · 7 Jan → 22 Jan",
      note: "Only 22.8% of cells had usable optical views",
    },
    quality: [
      { k: "Status", v: "Partial", why: "Cloud gaps: 22.8% joint optical support." },
      { k: "Passes", v: "4 + 1", why: "One assessment pass, so persistence can't be measured." },
      { k: "Product", v: "Beta", why: "Beta GCOV calibration and a wet-season baseline." },
    ],
    plainLimit:
      "Clouds hid most of the area from the optical satellite, and the radar looked only once after the flood.",
    techLimit:
      "The strict new-water group's median HH change is −2.35 dB, below the 3 dB diagnostic threshold. Temporal persistence or signal return can't be measured from one assessment.",
    alternatives: ["Wet-season soil moisture", "Crops", "Cloud-hidden water"],
    empties: EMPTY_FLOOD,
    sources: [
      {
        label: "nova-frontier-model · flood characterization",
        href: `${MODELING}/FLOOD_CHARACTERIZATION.md`,
      },
      { label: "nova-frontier-model · flood validation", href: `${MODELING}/FLOOD_VALIDATION.md` },
    ],
    figure: "/cases/figures/chokwe_flood_evidence.png",
    crops: crops("chokwe"),
    timeline: {
      passes: [
        pass("2025-11-30", "base"),
        pass("2025-12-12", "base"),
        pass("2025-12-24", "base"),
        pass("2026-01-05", "base"),
        pass("2026-01-17", "target", 17.6),
      ],
      start: "2025-11-20",
      end: "2026-02-10",
      today: "2026-02-10",
      optical: [
        { date: "2026-01-07", label: "OPERA · pre · 7 Jan" },
        { date: "2026-01-22", label: "OPERA · post · 22 Jan" },
      ],
      opticalNote: "Optical check: OPERA 7 Jan → 22 Jan · 22.8% joint coverage",
    },
  },
  {
    id: "richmond",
    lens: "flood_wetland",
    hazard: "flood",
    name: "Richmond",
    place: "Indiana, USA",
    region: "Indiana · flash flood",
    focus: [-84.89, 39.83],
    chipKm: 5.12,
    when: "Aug 2026",
    target: "2026-08-16",
    verdict: "insufficient",
    verdictLine:
      "The radar looked three days after the 12–13 Aug flash flood, and optical views found no new water to compare.",
    band: "within",
    reason:
      "No new-water group was resolved on the 13.2% of cells with usable optical views. That doesn't mean no flood happened.",
    stat: "0 cells",
    statLine: "of new water resolved by the optical snapshots, so there's nothing to score.",
    witness: { label: "OPERA DSWx-HLS · 22 Jul → 21 Aug", note: "13.2% joint optical support" },
    quality: [
      { k: "Status", v: "Partial", why: "Partial native radar support; small optical subset." },
      {
        k: "Timing",
        v: "+3 days",
        why: "First radar pass came after the reported flood interval.",
      },
      { k: "Dry land", v: "0.15% flagged", why: "8 of 5,249 stable dry cells." },
    ],
    plainLimit:
      "A short flash flood can be gone before the satellite returns. Missing evidence isn't proof nothing happened.",
    techLimit:
      "Recall is null because there are no positives. Optical support is reported against the 40,390 radar-supported cells, not the full 65,536-cell grid.",
    alternatives: ["Flood receded before the pass", "Cloud-hidden water", "Urban surfaces"],
    empties: EMPTY_FLOOD,
    sources: [
      {
        label: "NWS Wilmington · 13 Aug 2026 flash flooding",
        href: "https://www.weather.gov/iln/20260813",
      },
      {
        label: "nova-frontier-model · flood characterization",
        href: `${MODELING}/FLOOD_CHARACTERIZATION.md`,
      },
    ],
    figure: "/cases/figures/richmond_flood_evidence.png",
    crops: crops("richmond"),
    timeline: {
      passes: [
        pass("2026-06-29", "base"),
        pass("2026-07-11", "base"),
        pass("2026-07-23", "base"),
        pass("2026-08-04", "base"),
        pass("2026-08-16", "target", 0.4),
        pass("2026-08-28", "meas", 0.3),
        pass("2026-09-09", "meas", 0.2),
        pass("2026-09-21", "meas", 0.2),
        pass("2026-11-14", "plan"),
      ],
      start: "2026-06-20",
      end: "2026-11-25",
      today: "2026-11-08",
      onset: { date: "2026-08-12", label: "Flash flood 12–13 Aug" },
      optical: [
        { date: "2026-07-22", label: "OPERA · pre · 22 Jul" },
        { date: "2026-08-21", label: "OPERA · post · 21 Aug" },
      ],
      opticalNote: "Optical check: OPERA 22 Jul → 21 Aug · 13.2% joint coverage",
    },
  },
  {
    id: "kumamoto",
    lens: "insar",
    hazard: "earthquake",
    name: "Kumamoto",
    place: "Kyushu, Japan",
    region: "Earthquake · 28 Jul 2026",
    focus: [130.65, 32.65],
    when: "Jul 2026",
    target: "2026-08-14",
    verdict: "measured",
    verdictLine:
      "Cells in a 5 km window that kept their phase at the 0.35 coherence threshold, 21 Jul → 14 Aug 2026. Published as coherence and wrapped phase.",
    reason:
      "The phase is wrapped and not corrected for troposphere or ionosphere, so no displacement is reported.",
    // Backend run (README "Measured on 2026-11-12"): windowCells 62,500, phaseCells 39,584.
    stat: "39,584 of 62,500",
    statLine: "cells kept their phase at the 0.35 coherence threshold.",
    statSource:
      "nova-frontier-backend README: Kumamoto, track 24, 21 Jul → 14 Aug 2026, 5 km window, measured 12 Nov 2026",
    witness: { label: "GSI multi-mission analysis (external)", note: "Credited, not our result" },
    quality: [
      {
        k: "Measured",
        v: "Coherence + phase",
        why: "Coherence and wrapped phase from the backend run of 12 Nov 2026.",
      },
      { k: "Pair", v: "21 Jul → 14 Aug", why: "The interval brackets the 28 Jul earthquake." },
      {
        k: "Fringe",
        v: "≈ 12 cm path",
        why: "Half of the 24 cm wave, because the pulse travels there and back.",
      },
    ],
    plainLimit: "We show where the radar echo stayed steady between two passes.",
    techLimit:
      "Each fringe is about 12 cm of change in the radar's path length, not a ground displacement. The interval mixes coseismic, postseismic and atmospheric signal.",
    alternatives: ["Atmospheric phase", "Ionosphere", "Unwrapping error"],
    empties: ["Displacement", "Magnitude", "Probability"],
    sources: [
      {
        label: "GSI · 2026 Kumamoto earthquake analysis",
        href: "https://www.gsi.go.jp/uchusokuchi/20260728kumamoto-e.html",
      },
      {
        label: "NISAR L2 GUNW · ASF product guide",
        href: "https://nisar-docs.asf.alaska.edu/gunw/",
      },
      {
        label: "nova-frontier-backend · Kumamoto run, 12 Nov 2026",
        href: "https://github.com/NASA-NOVA-FRONTIER/nova-frontier-backend",
      },
    ],
    figure: "/cases/figures/interferometry.png",
    timeline: {
      passes: [
        pass("2026-07-09", "meas"),
        pass("2026-07-21", "base"),
        pass("2026-08-14", "target"),
        pass("2026-08-26", "meas"),
        pass("2026-09-07", "meas"),
        pass("2026-11-20", "plan"),
      ],
      start: "2026-07-01",
      end: "2026-11-28",
      today: "2026-11-08",
      onset: { date: "2026-07-28", label: "Earthquake 28 Jul" },
      optical: [],
      opticalNote: "InSAR pair · no optical stage",
    },
  },
  NISCEMI,
  {
    id: "choco",
    lens: "insar",
    hazard: "earthquake",
    name: "Chocó",
    place: "Colombia",
    region: "Earthquake · 10 Aug 2026",
    focus: [-76.65, 5.69],
    when: "Aug 2026",
    verdict: "measured",
    verdictLine:
      "Coherence 0.247 between two passes. Low coherence: the surface changed or vegetation decorrelated the echo.",
    reason:
      "science_status is not_displacement_ready: coherence is published, displacement stays null.",
    stat: "0.247",
    statLine: "median interferometric coherence (0–1) · not_displacement_ready",
    statSource: "Median coherence, fixed 0–1 scale. Confirmed by Daniel, 11 Nov.",
    quality: [
      { k: "Status", v: "Coherence only", why: "not_displacement_ready from the API." },
      { k: "Coherence", v: "0.247", why: "Median, fixed 0–1 scale. Confirmed by Daniel, 11 Nov." },
      { k: "SGC", v: "[Report]", why: "Servicio Geológico Colombiano report." },
    ],
    plainLimit:
      "Coherence 0.247 is low: the echo changed between the two passes, so its phase can't be read as ground motion.",
    techLimit:
      "The phase is wrapped and not corrected for troposphere or ionosphere, so no displacement is reported.",
    alternatives: [],
    empties: ["Displacement", "Magnitude", "Casualties"],
    sources: [{ label: "Servicio Geológico Colombiano", href: "https://www.sgc.gov.co" }],
    coherenceOnly: true,
  },
];

// PLAN-content-pages-v8 §0: name the actual state, never "Pending". The median is the case stat.
export const coherenceOnlyLabel = (item: Case): string => `Coherence only · ${item.stat}`;

export const findCase = (id: string | null): Case | undefined =>
  CASES.find((item) => item.id === id);

export const percent = (k: number, n: number): number => (n === 0 ? 0 : (k / n) * 100);

// Two decimals only for tiny shares (8 of 5,249 is 0.15%); 38 of 3,866 still reads 1.0%.
export const formatPercent = (value: number): string =>
  `${value > 0 && value < 0.95 ? value.toFixed(2) : value.toFixed(1)}%`;
