import { BUG_FIRE_EVIDENCE, bugFireTimeline } from "@/features/cases/bugFire";
import { NISCEMI } from "@/features/cases/niscemi";
import type { LonLat } from "@/features/frames/frame.types";
import type { LandslideEvidence } from "@/features/landslide/landslideEvidence";
import type { WildfireEvidence } from "@/features/wildfire/wildfireEvidence";

import { tr } from "@/i18n/translate";
import { localized } from "@/i18n/localized";
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
export type HazardId =
  "earthquake" | "wildfire" | "deforestation" | "flood" | "landslide" | "agriculture";
export type IconId = HazardId;

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
// A pass's own display image per channel, when the data has one (live answers today; no case yet).
export type PassImages = { HH?: string; HV?: string };
export type TimelinePass = {
  date: string;
  kind: PassKind;
  outsidePct?: number;
  images?: PassImages;
};
// One interferometric pair (ground motion): the timeline steps through these instead of passes.
export type TimelineInterval = { a: string; b: string; images?: string[] };
export type TimelineData = {
  passes: TimelinePass[];
  start: string;
  end: string;
  today: string;
  onset?: { date: string; label: string };
  optical: Array<{ date: string; label: string }>;
  opticalNote: string;
  // Ground motion only. `chain` is a measured case's sequence (never "all straddle the event").
  intervals?: { items: TimelineInterval[]; chain: boolean };
  // Only a case with a sourced event date has one (v9 correction: never an invented date).
  event?: { date: string; source: string };
  track?: number;
  direction?: string;
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
  // The grid posting in metres when the case's grid isn't 128 cells across chipKm (gridMetres).
  chipGridM?: number;
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
  // The gateway's own limitations, verbatim, when it sends more than the one in plainLimit.
  limitations?: string[];
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
  // A wildfire case: its per-pass series, lens history and layers for the More information panel (#21).
  wildfire?: WildfireEvidence;
};

export type Lens = { id: LensId; chip: string; icon: IconId; compares: string };

export const LENSES: Lens[] = localized([
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
]);

// Docs/design/v8 PLAN-content-pages-v8 §0: "the radar checks whether passes bracket the event and
// whether the slope kept its echo".
export const OBSERVED_DYNAMICS = localized({
  chip: "Did the slope keep its echo?",
  icon: "landslide",
  compares: "Every pass against the median of the first four, all after the event",
} as const satisfies Omit<Lens, "id">);

export const findLens = (id: CaseLensId): Omit<Lens, "id"> | undefined =>
  id === "observed_dynamics" ? OBSERVED_DYNAMICS : LENSES.find((lens) => lens.id === id);

// OPERA's optical classes (Okabe–Ito), so the colours match the backend legend.
export const OPTICAL = localized({
  newWater: "#0072b2",
  stableWater: "#56b4e9",
  dry: "#a8997a",
  loss: "#e69f00",
  mixed: "#cc79a7",
  unsupported: "#62666d",
} as const);

const EMPTY_FLOOD = ["Flood depth", "Probability", "Cause", "Validated extent"];
const MODELING = "https://github.com/NASA-NOVA-FRONTIER/nova-frontier-model/blob/main/docs";
const BACKEND = "https://github.com/NASA-NOVA-FRONTIER/nova-frontier-backend";

const pass = (date: string, kind: PassKind, outsidePct?: number): TimelinePass =>
  outsidePct === undefined ? { date, kind } : { date, kind, outsidePct };

const crops = (id: string): Crops => ({
  base: `/cases/${id}-base.png`,
  change: `/cases/${id}-change.png`,
  optical: `/cases/${id}-optical.png`,
  signature: `/cases/${id}-signature.png`,
});

// Issue #28: exactly one demo case per phenomenon (Case.hazard), each precomputed and shown
// OFFLINE, with its lens fixed. Phenomena without real precomputed numbers have no case.
export const CASES: Case[] = localized([
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
    id: "choco",
    lens: "insar",
    hazard: "earthquake",
    name: "Chocó",
    place: "Colombia",
    region: "Earthquake · 10 Aug 2026",
    // The gateway's measured window (events.index.json point), not the older regional marker.
    focus: [-76.256, 4.86],
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
      {
        k: "Passes",
        v: "1 + 2",
        why: "Baseline 18 Jul; assessments 11 Aug and 23 Aug 2026, as two compatible GUNW pairs.",
      },
      {
        k: "Grid",
        v: "80 m grid",
        why: "62 × 62 = 3,844 cells, all with coherence on both pairs.",
      },
      {
        k: "Common phase",
        v: "0 cells",
        why: "Common phase and correction-input support are zero, so no phase is shown.",
      },
      {
        k: "SGC",
        v: "Update · 10 Aug 2026",
        why: "Servicio Geológico Colombiano update on the San José del Palmar earthquake.",
      },
    ],
    plainLimit:
      "Coherence 0.247 is low: the echo changed between the two passes, so its phase can't be read as ground motion.",
    techLimit:
      "No cell has phase common to both pairs, so there is no phase to correct for troposphere or ionosphere, and no displacement is reported.",
    limitations: [
      "Ionosphere input eligibility is not correction accuracy or stable-ground validation.",
      "Filled flags, finite screens and positive reported uncertainty are different quality conditions; absence of a fill flag does not establish trustworthy correction.",
      "All fractions name their denominator. No correction is applied and no phase is integrated or converted into a deformation estimate.",
      "The maximum-minimum-coherence candidate is a proposed data-support location, not an independently stable reference.",
      "No earthquake detection, earthquake attribution, vertical motion or forecasting is inferred from this audit.",
      "Scattering changes and interval length affect coherence. Stable reference evidence and independently checked corrections would be needed for displacement.",
    ],
    alternatives: [],
    empties: ["Displacement", "Magnitude", "Casualties"],
    sources: [
      {
        label: "Servicio Geológico Colombiano · San José del Palmar earthquake update",
        href: "https://www2.sgc.gov.co/Noticias/Paginas/SGC-actualiza-la-informacion-sobre-el-sismo-ocurrido-en-San-Jose-del-Palmar-Choco.aspx",
      },
      { label: "nova-frontier-model · event bundles", href: `${MODELING}/EVENT_BUNDLES.md` },
    ],
    coherenceOnly: true,
  },
  // The two below come from the gateway's precomputed cases (/v2/cases, relayed by the backend at
  // /api/v1/cases/<id>), featured stops of the model's PHENOMENA_EXAMPLES.md. Neither has a
  // comparator, so there is no verdict and only the numbers the gateway returns are shown.
  {
    id: "bug-fire",
    lens: "wildfire",
    hazard: "wildfire",
    name: "Bug Fire",
    place: "Nevada, USA",
    region: "Wildfire · Nevada",
    focus: [-119.88332214, 39.83778865],
    when: "Aug 2026",
    target: "2026-08-28",
    verdict: "measured",
    verdictLine:
      "The radar read 4,096 cells on a 10 m grid in the Bug Fire vicinity: three passes before the 8 Aug 2026 ignition and two after it (28 Aug, 9 Sep).",
    reason:
      "The gateway reports radar_evaluated: dated layers and no comparison against the fire perimeter, so no verdict is given.",
    stat: "4,096 cells",
    statLine: "read by the radar on a 10 m grid · no comparison score yet",
    statSource: "Gateway case bug-fire · evidence.radarSupportCells, 64 × 64 grid at 10 m",
    quality: [
      {
        k: "Status",
        v: "Radar evaluated",
        why: "radar_evaluated from the gateway; scientific status diagnostic.",
      },
      {
        k: "Passes",
        v: "3 + 2",
        why: "Baseline 29 Jun, 11 Jul and 23 Jul; after the fire 28 Aug and 9 Sep 2026.",
      },
      { k: "Reference", v: "WFIGS perimeter", why: "Ignition 8 Aug, contained 27 Aug 2026." },
    ],
    plainLimit:
      "A perimeter can enclose unburned cells. Dated severity mapping and vegetation or field observations would help interpret the departures.",
    techLimit:
      "No radar comparator or signature policy is attached to this case yet, so no share of cells is reported.",
    alternatives: [],
    empties: ["Burned area", "Severity", "Cause"],
    sources: [
      {
        label: "WFIGS Interagency Fire Perimeters · Bug Fire",
        href: "https://services3.arcgis.com/T4QMspbfLg3qTGWY/ArcGIS/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0/61953",
      },
      { label: "nova-frontier-backend · cases relay", href: BACKEND },
    ],
    // #21: the model's own grid (64 × 64 cells at 10 m) and its HH layers, so the globe drapes them.
    chipKm: 0.64,
    chipGridM: BUG_FIRE_EVIDENCE.postingM,
    crops: {
      base: `${BUG_FIRE_EVIDENCE.folder}/baseline-HH.png`,
      change: `${BUG_FIRE_EVIDENCE.folder}/change-HH.png`,
    },
    timeline: bugFireTimeline,
    wildfire: BUG_FIRE_EVIDENCE,
  },
  {
    id: "para-event-02",
    lens: "vegetation_disturbance",
    hazard: "deforestation",
    name: "Pará event 02",
    place: "Pará, Brazil",
    region: "Deforestation · Pará",
    focus: [-55.482254302487455, -7.180578271381999],
    when: "Oct 2026",
    target: "2026-10-07",
    verdict: "measured",
    verdictLine:
      "The radar read 6,889 cells on a 20 m grid in Pará: three passes from 21 Jun to 15 Jul 2026 and two in October (7 and 19 Oct).",
    reason:
      "The gateway reports a radar-only diagnostic: dated layers and no independent vegetation reference, so no verdict is given.",
    stat: "6,889 cells",
    statLine: "read by the radar on a 20 m grid · no comparison score yet",
    statSource: "Gateway case para-event-02 · evidence.radarSupportCells, 83 × 83 grid at 20 m",
    quality: [
      {
        k: "Status",
        v: "Evaluated",
        why: "evaluated from the gateway; scientific status diagnostic.",
      },
      {
        k: "Passes",
        v: "3 + 2",
        why: "Baseline 21 Jun, 3 Jul and 15 Jul; assessments 7 Oct and 19 Oct 2026.",
      },
      {
        k: "Reference",
        v: "Weak legacy record",
        why: "Reported onsets 28 Aug to 7 Oct 2026; the curated result uses radar-only diagnostics.",
      },
    ],
    plainLimit:
      "The map shows gamma-zero change on measured support. Moisture, geometry and surface structure can affect the return. Permanent forest conversion and its cause remain unverified.",
    techLimit:
      "No radar comparator or signature policy is attached to this case yet, so no share of cells is reported.",
    alternatives: [],
    empties: ["Area lost", "Cause", "Probability"],
    sources: [
      {
        label: "nova-frontier-model · phenomena examples",
        href: `${MODELING}/PHENOMENA_EXAMPLES.md`,
      },
      { label: "nova-frontier-backend · cases relay", href: BACKEND },
    ],
  },
  // Landslide (#24): the model's only landslide case, aftermath only.
  NISCEMI,
]);

// PLAN-content-pages-v8 §0: name the actual state, never "Pending". The median is the case stat.
export const coherenceOnlyLabel = (item: Case): string =>
  tr("Coherence only · {{stat}}", { stat: item.stat });

export const findCase = (id: string | null): Case | undefined =>
  CASES.find((item) => item.id === id);

export const percent = (k: number, n: number): number => (n === 0 ? 0 : (k / n) * 100);

// Two decimals only for tiny shares (8 of 5,249 is 0.15%); 38 of 3,866 still reads 1.0%.
export const formatPercent = (value: number): string =>
  `${value > 0 && value < 0.95 ? value.toFixed(2) : value.toFixed(1)}%`;
