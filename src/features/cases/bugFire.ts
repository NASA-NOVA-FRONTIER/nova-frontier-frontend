import type { TimelineData } from "@/features/cases/cases";
import {
  passImage,
  sharePercent,
  type WildfireEvidence,
  type WildfirePass,
} from "@/features/wildfire/wildfireEvidence";

import { localized } from "@/i18n/localized";
/*
 * Bug Fire (Nevada), ignited 8 Aug 2026: the wildfire demo case (#21, #28). Every number is copied
 * from the model's case bug-fire (nova-frontier-model release events-20261115, asset
 * nisar-phenomena-20261115-r1.zip: series.json, manifest.json evidence.lens_report and bundle.json,
 * read 2026-11-16), rounded to two decimals, and every image is one of its published layers, in
 * public/cases/bug-fire.
 */

const FOLDER = "/cases/bug-fire";
const CELLS = 4_096;

const RELEASE = {
  label: "nova-frontier-model · measured phenomena cases (release events-20261115)",
  href: "https://github.com/NASA-NOVA-FRONTIER/nova-frontier-model/releases/tag/events-20261115",
};

const WFIGS = {
  label: "WFIGS Interagency Fire Perimeters · Bug Fire",
  href: "https://services3.arcgis.com/T4QMspbfLg3qTGWY/ArcGIS/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0/61953",
};

const pass = (
  date: string,
  role: WildfirePass["role"],
  point: [number, number],
  hh: [number, number, number],
  hv: [number, number, number],
  outsideCells?: number,
): WildfirePass => ({
  date,
  role,
  point: { HH: point[0], HV: point[1] },
  area: {
    HH: { median: hh[0], iqr: [hh[1], hh[2]] },
    HV: { median: hv[0], iqr: [hv[1], hv[2]] },
  },
  ...(outsideCells !== undefined && { outsideCells }),
});

// series.json: observations (marker pixel), observed_groups.all_common_cells and
// diagnostic_band_timeline.
export const BUG_FIRE_EVIDENCE: WildfireEvidence = localized({
  series: "042_D_068_4005_DHDH",
  folder: FOLDER,
  passes: [
    pass(
      "2026-06-29",
      "baseline",
      [-19.48, -23.27],
      [-17.26, -19.11, -15.37],
      [-22.79, -24.73, -20.71],
    ),
    pass(
      "2026-07-11",
      "baseline",
      [-18.8, -21.72],
      [-17.31, -19.07, -15.37],
      [-22.89, -24.8, -20.83],
    ),
    pass(
      "2026-07-23",
      "baseline",
      [-16.91, -22.15],
      [-17.12, -18.82, -15.26],
      [-22.84, -24.7, -20.88],
    ),
    pass(
      "2026-08-28",
      "assessment",
      [-19.02, -21.06],
      [-17.77, -19.31, -16.08],
      [-23.18, -24.85, -21.45],
      1021,
    ),
    pass(
      "2026-09-09",
      "assessment",
      [-19.14, -21.55],
      [-17.86, -19.44, -16.1],
      [-23.32, -25.08, -21.65],
      1032,
    ),
  ],
  target: "2026-09-09",
  cells: CELLS,
  gridKm: 0.64,
  postingM: 10,
  band: "Either channel beyond max(3, 3 × max(1.4826 × MAD, 1)) dB of the median of the three baseline passes, cell by cell.",
  // area_readout.channels.*.delta_db and point_readout.channels.*.delta_db.
  shift: {
    area: {
      HH: { median: -0.54, iqr: [-2.06, 0.92] },
      HV: { median: -0.48, iqr: [-2.16, 1.03] },
    },
    point: { HH: -0.35, HV: 0.59 },
  },
  // manifest.json evidence.lens_report.radar.cross_pol_history.
  crossPol: {
    rule: "Cross-polarized change below the negative median/MAD diagnostic bound",
    samples: [
      { date: "2026-08-28", declineCells: 382, medianChangeDb: -0.34 },
      { date: "2026-09-09", declineCells: 450, medianChangeDb: -0.48 },
    ],
    declineOnLastTwoCells: 155,
    returnWithinBandCells: 224,
  },
  // series.json area_readout.external_perimeter_comparison.
  perimeter: {
    inside: { cells: 1737, shift: { HH: -1.04, HV: -1.11 }, declineBothDatesCells: 127 },
    outside: { cells: 1813, shift: { HH: -0.2, HV: -0.14 }, declineBothDatesCells: 18 },
  },
  // manifest.json evidence.independent_reference.
  reference: {
    label: "WFIGS fire perimeter",
    source: WFIGS,
    ignition: "2026-08-08",
    containment: "2026-08-27",
  },
  firms: {
    status: "unavailable",
    note: "The model's case carries no NASA FIRMS detections (fire_context unavailable).",
  },
  views: [
    {
      id: "change",
      title: "Change vs baseline median",
      src: `${FOLDER}/change-{channel}.png`,
      dates: ["2026-09-09"],
      ramp: "linear-gradient(90deg,#053061,#f7f7f7,#67001f)",
      scale: ["−8 dB darker", "+8 dB brighter"],
      text: "9 Sep 2026 minus the median of the three baseline passes, cell by cell.",
    },
    {
      id: "decline-pattern",
      title: "HV decline pattern",
      src: `${FOLDER}/decline-pattern.png`,
      dates: ["2026-08-28", "2026-09-09"],
      scale: ["No sampled decline", "Back within band after a decline"],
      text: "Where HV fell below its band on the two assessment passes, on one of them, or fell and came back.",
    },
    {
      id: "decline-count",
      title: "HV decline count",
      src: `${FOLDER}/decline-count.png`,
      dates: ["2026-08-28", "2026-09-09"],
      ramp: "linear-gradient(90deg,#440154,#21918c,#fde725)",
      scale: ["0 passes", "2 passes"],
      text: "On how many of the two assessment passes HV fell below its band.",
    },
    {
      id: "variability",
      title: "Variability, all passes",
      src: `${FOLDER}/variability-{channel}.png`,
      dates: [],
      ramp: "linear-gradient(90deg,#000004,#b5367a,#fcfdbf)",
      scale: ["0 dB", "8 dB"],
      text: "Scaled median absolute deviation over the five passes: how much each cell varied.",
    },
    {
      id: "three-dates",
      title: "Three dates in colour",
      src: `${FOLDER}/three-dates-HH.png`,
      dates: ["2026-06-29", "2026-07-23", "2026-09-09"],
      scale: ["Red 29 Jun · green 23 Jul", "blue 9 Sep"],
      text: "HH of three passes as red, green and blue (−25 to 0 dB). Cells that kept the same return read grey.",
    },
    {
      id: "polarization",
      title: "Polarization colour, 9 Sep",
      src: `${FOLDER}/polarization-rgb.png`,
      dates: ["2026-09-09"],
      scale: ["Red HH · green HV", "blue HV − HH"],
      text: "Red HH (−25 to 0 dB), green HV (−32 to −5 dB), blue HV − HH (−18 to −2 dB). Roughness, structure, moisture and viewing geometry all shape these.",
    },
    {
      id: "balance-change",
      title: "Change in polarization balance",
      src: `${FOLDER}/balance-change.png`,
      dates: ["2026-07-23", "2026-09-09"],
      ramp: "linear-gradient(90deg,#053061,#f7f7f7,#67001f)",
      scale: ["−8 dB", "+8 dB"],
      text: "HV − HH on 9 Sep minus HV − HH on 23 Jul. Either channel can drive the change.",
    },
  ],
  limitation:
    "A perimeter can enclose unburned cells. Dated severity mapping and vegetation or field observations would help interpret the departures.",
  source: RELEASE,
});

// The timeline draws the five real passes and their out-of-band shares, with the ignition between
// the last baseline pass and the first assessment. The case's target stays the first assessment
// (28 Aug), as the gateway lists it; the lens reads its change on the last pass (9 Sep).
const FIRST_ASSESSMENT = BUG_FIRE_EVIDENCE.passes.find((item) => item.role === "assessment")?.date;

export const bugFireTimeline: TimelineData = localized({
  passes: BUG_FIRE_EVIDENCE.passes.map((item) => {
    // Every pass ships both channels (public/cases/bug-fire), so the sequence player can step them.
    const images = {
      HH: passImage(BUG_FIRE_EVIDENCE, item.date, "HH"),
      HV: passImage(BUG_FIRE_EVIDENCE, item.date, "HV"),
    };
    if (item.role === "baseline") return { date: item.date, kind: "base" as const, images };
    const kind = item.date === FIRST_ASSESSMENT ? ("target" as const) : ("meas" as const);
    return item.outsideCells === undefined
      ? { date: item.date, kind, images }
      : { date: item.date, kind, outsidePct: sharePercent(item.outsideCells, CELLS), images };
  }),
  start: "2026-06-15",
  end: "2026-11-25",
  today: "2026-11-16",
  onset: { date: BUG_FIRE_EVIDENCE.reference.ignition, label: "Ignition 8 Aug" },
  optical: [],
  opticalNote: "Radar only · NASA FIRMS detections are not in this case yet",
  realDates: true,
});
