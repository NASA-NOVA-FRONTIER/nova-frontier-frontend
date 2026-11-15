import type { LonLat } from "@/features/frames/frame.types";

/*
 * Measured cases from the science backend (github.com/NASA-NOVA-FRONTIER/nova-frontier-model). Every number here
 * is copied from its reports; DATA_PROVENANCE in design_handoff_v7 says where each one comes from.
 * Pass dates on the timeline are DEMO (12-day spacing) until the backend serves the real ones.
 */

export type LensId =
  "flood_wetland" | "vegetation_disturbance" | "wildfire" | "agriculture" | "insar";
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
export type TimelinePass = { date: string; kind: PassKind; outsidePct?: number };
export type TimelineData = {
  passes: TimelinePass[];
  start: string;
  end: string;
  today: string;
  onset?: { date: string; label: string };
  optical: Array<{ date: string; label: string }>;
  opticalNote: string;
};

export type Crops = { base: string; change: string; optical: string; signature: string };

export type Case = {
  id: string;
  lens: LensId;
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

export const findLens = (id: LensId): Lens | undefined => LENSES.find((lens) => lens.id === id);

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
      {
        k: "SGC",
        v: "Update · 10 Aug 2026",
        why: "Servicio Geológico Colombiano update on the San José del Palmar earthquake.",
      },
    ],
    plainLimit:
      "Coherence 0.247 is low: the echo changed between the two passes, so its phase can't be read as ground motion.",
    techLimit:
      "The phase is wrapped and not corrected for troposphere or ionosphere, so no displacement is reported.",
    alternatives: [],
    empties: ["Displacement", "Magnitude", "Casualties"],
    sources: [
      {
        label: "Servicio Geológico Colombiano · San José del Palmar earthquake update",
        href: "https://www2.sgc.gov.co/Noticias/Paginas/SGC-actualiza-la-informacion-sobre-el-sismo-ocurrido-en-San-Jose-del-Palmar-Choco.aspx",
      },
    ],
    coherenceOnly: true,
  },
  // The three below come from the gateway's precomputed cases (/v2/cases, relayed by the backend at
  // /api/v1/cases/<id>). Each is radar_evaluated: dated layers, no comparator and no verdict, so
  // only the numbers the gateway returns are shown.
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
  },
  {
    id: "rowe-creek",
    lens: "vegetation_disturbance",
    hazard: "deforestation",
    name: "Rowe Creek",
    place: "Oregon, USA",
    region: "Vegetation · Oregon",
    focus: [-120.26, 44.97],
    when: "Sep 2026",
    target: "2026-09-23",
    verdict: "measured",
    verdictLine:
      "The radar read 262,142 cells on a 10 m grid near Rowe Creek: three passes from 1 to 25 Jul 2026 and one on 23 Sep.",
    reason:
      "The gateway reports radar_evaluated: dated layers and no independent vegetation reference, so no verdict is given.",
    stat: "262,142 cells",
    statLine: "read by the radar on a 10 m grid · no comparison score yet",
    statSource: "Gateway case rowe-creek · evidence.radarSupportCells, 512 × 512 grid at 10 m",
    quality: [
      {
        k: "Status",
        v: "Radar evaluated",
        why: "radar_evaluated from the gateway; scientific status diagnostic.",
      },
      {
        k: "Passes",
        v: "3 + 1",
        why: "Baseline 1, 13 and 25 Jul; one assessment pass on 23 Sep 2026.",
      },
      {
        k: "Reference",
        v: "None",
        why: "No independent dated event or vegetation record is attached.",
      },
    ],
    plainLimit:
      "Moisture, roughness and vegetation structure all affect the channels. The native replay uses radar only. Independent dated event and vegetation evidence would help.",
    techLimit:
      "No radar comparator or signature policy is attached to this case yet, so no share of cells is reported.",
    alternatives: [],
    empties: ["Area lost", "Cause", "Probability"],
    sources: [{ label: "nova-frontier-backend · cases relay", href: BACKEND }],
  },
  {
    id: "skollersta",
    lens: "agriculture",
    hazard: "agriculture",
    name: "Sköllersta",
    place: "Rye trial, Sweden",
    region: "Agriculture · rye trial",
    focus: [15.39726192, 59.13216973],
    when: "Aug 2026",
    target: "2026-08-22",
    verdict: "measured",
    verdictLine:
      "A winter rye trial field brightened in HH against its surroundings between the 10 and 22 Aug 2026 passes, around its recorded harvest on 18 Aug.",
    reason:
      "The gateway reports radar_evaluated: the record dates the trial, not the harvested footprint, so no verdict is given.",
    stat: "+1.78 dB",
    statLine: "HH step, patch minus surroundings, 10 → 22 Aug 2026.",
    statSource: "nova-frontier-model · docs/EXPLORATION_HOLDOUT.md · Swedish crop trial records",
    quality: [
      {
        k: "Status",
        v: "Radar evaluated",
        why: "radar_evaluated from the gateway; scientific status diagnostic.",
      },
      {
        k: "Passes",
        v: "3 + 2",
        why: "Baseline 5 Jul, 17 Jul and 10 Aug; assessments 22 Aug and 3 Sep 2026.",
      },
      {
        k: "Reference",
        v: "Trial record",
        why: "Winter rye, documented at-harvest date 18 Aug 2026; footprint unresolved.",
      },
    ],
    plainLimit:
      "The independent record dates the trial. The harvested footprint, moisture and management across the full window remain unresolved.",
    techLimit:
      "Grid 64 × 64 at 20 m (4,096 cells). The step comes from the holdout report; the gateway attaches no comparator to this case.",
    alternatives: [],
    empties: ["Yield", "Crop map", "Cause"],
    sources: [
      {
        label: "Swedish crop trial record · winter rye",
        href: "https://nfts.dlbr.dk/Forms/Dokumentation.aspx?GUID=6c558a36-cd71-4531-8119-ca05278419a2&KardexID=75095&applLangID=en",
      },
      {
        label: "nova-frontier-model · geographic holdout",
        href: `${MODELING}/EXPLORATION_HOLDOUT.md`,
      },
      { label: "nova-frontier-backend · cases relay", href: BACKEND },
    ],
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
