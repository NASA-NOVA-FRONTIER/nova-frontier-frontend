import type { Case, TimelineData } from "@/features/cases/cases";
import {
  outsidePercent,
  passImage,
  type LandslideEvidence,
  type LandslidePass,
} from "@/features/landslide/landslideEvidence";

import { localized } from "@/i18n/localized";
/*
 * Niscemi (Sicily), the landslide of 25 January 2026: the model's only landslide case
 * (nova-frontier-model release events-20261115, case niscemi-aftermath, lens observed_dynamics).
 * Every number is copied from its series (gateway /v2/cases/niscemi-aftermath/series, read
 * 2026-11-15) and every image is one of its published layers, in public/cases/niscemi.
 */

const FOLDER = "/cases/niscemi";
const CELLS = 16_384;

const RELEASE = {
  label: "nova-frontier-model · measured phenomena cases (release events-20261115)",
  href: "https://github.com/NASA-NOVA-FRONTIER/nova-frontier-model/releases/tag/events-20261115",
};

const pass = (
  date: string,
  role: LandslidePass["role"],
  point: [number, number],
  hh: [number, number, number],
  hv: [number, number, number],
  outsideCells?: number,
): LandslidePass => ({
  date,
  role,
  point: { HH: point[0], HV: point[1] },
  area: {
    HH: { median: hh[0], iqr: [hh[1], hh[2]] },
    HV: { median: hv[0], iqr: [hv[1], hv[2]] },
  },
  ...(outsideCells !== undefined && { outsideCells }),
});

// observations (marker pixel), observed_groups.all_common_cells and diagnostic_band_timeline.
export const NISCEMI_EVIDENCE: LandslideEvidence = localized({
  event: { date: "2026-01-25", label: "Landslide 25 Jan" },
  series: "144_A_020_2005_DHDH",
  folder: FOLDER,
  passes: [
    pass(
      "2026-06-24",
      "baseline",
      [-11.84, -16.54],
      [-12.52, -14.6, -10.27],
      [-20.09, -21.93, -17.44],
    ),
    pass(
      "2026-07-06",
      "baseline",
      [-10.01, -16.05],
      [-12.2, -14.42, -9.84],
      [-20.11, -22.03, -17.18],
    ),
    pass(
      "2026-07-18",
      "baseline",
      [-11.0, -17.27],
      [-12.65, -14.8, -10.36],
      [-20.65, -22.59, -17.67],
    ),
    pass(
      "2026-08-11",
      "baseline",
      [-10.22, -16.37],
      [-11.98, -14.07, -9.8],
      [-20.52, -22.29, -17.64],
    ),
    pass(
      "2026-08-23",
      "assessment",
      [-10.69, -16.87],
      [-11.84, -13.96, -9.67],
      [-20.64, -22.42, -17.72],
      481,
    ),
    pass(
      "2026-09-04",
      "assessment",
      [-10.57, -17.42],
      [-11.99, -14.07, -9.78],
      [-20.51, -22.27, -17.62],
      446,
    ),
    pass(
      "2026-09-16",
      "assessment",
      [-9.73, -15.62],
      [-9.23, -11.43, -7.0],
      [-18.28, -20.41, -15.94],
      7564,
    ),
    pass(
      "2026-10-22",
      "assessment",
      [-9.37, -15.1],
      [-9.8, -11.55, -7.86],
      [-19.1, -20.78, -16.65],
      5349,
    ),
  ],
  target: "2026-10-22",
  cells: CELLS,
  gridKm: 10.24,
  postingM: 80,
  band: "Either channel beyond max(3, 3 × max(1.4826 × MAD, 1)) dB of the median of the four baseline passes, cell by cell.",
  // area_readout.delta_db and point_readout.delta_db.
  shift: {
    area: {
      HH: { median: 2.17, iqr: [1.24, 3.5] },
      HV: { median: 0.82, iqr: [0.14, 1.7] },
    },
    point: { HH: 1.24, HV: 1.36 },
  },
  views: [
    {
      id: "change",
      title: "Change vs baseline median",
      src: `${FOLDER}/change-{channel}.png`,
      dates: ["2026-10-22"],
      ramp: "linear-gradient(90deg,#053061,#f7f7f7,#67001f)",
      scale: ["−8 dB darker", "+8 dB brighter"],
      text: "22 Oct 2026 minus the median of the four baseline passes, cell by cell.",
    },
    {
      id: "variability",
      title: "Variability, all passes",
      src: `${FOLDER}/variability-{channel}.png`,
      dates: [],
      ramp: "linear-gradient(90deg,#000004,#b5367a,#fcfdbf)",
      scale: ["0 dB", "8 dB"],
      text: "Scaled median absolute deviation over the eight passes: how much each cell varied.",
    },
    {
      id: "three-dates",
      title: "Three dates in colour",
      src: `${FOLDER}/three-dates-HH.png`,
      dates: ["2026-06-24", "2026-08-11", "2026-10-22"],
      scale: ["Red 24 Jun · green 11 Aug", "blue 22 Oct"],
      text: "HH of three passes as red, green and blue (−25 to 0 dB). Cells that kept the same return read grey.",
    },
    {
      id: "polarization",
      title: "Polarization colour, 22 Oct",
      src: `${FOLDER}/polarization-rgb.png`,
      dates: ["2026-10-22"],
      scale: ["Red HH · green HV", "blue HV − HH"],
      text: "Red HH (−25 to 0 dB), green HV (−32 to −5 dB), blue HV − HH (−18 to −2 dB). Roughness, structure, moisture and viewing geometry all shape these.",
    },
  ],
  source: RELEASE,
});

// The timeline draws the real pass dates and out-of-band shares, with the event far before them.
const timeline = (evidence: LandslideEvidence): TimelineData => ({
  passes: evidence.passes.map((item) => {
    const kind =
      item.role === "baseline" ? "base" : item.date === evidence.target ? "target" : "meas";
    const share = outsidePercent(item, evidence.cells);
    // Every pass ships both channels (public/cases/niscemi), so the sequence player can step them.
    const images = {
      HH: passImage(evidence, item.date, "HH"),
      HV: passImage(evidence, item.date, "HV"),
    };
    return share === undefined
      ? { date: item.date, kind, images }
      : { date: item.date, kind, outsidePct: share, images };
  }),
  start: "2026-01-15",
  end: "2026-11-25",
  today: "2026-11-15",
  onset: { date: evidence.event.date, label: evidence.event.label },
  optical: [],
  opticalNote: "Radar only · every pass is after the 25 Jan landslide",
  realDates: true,
});

export const NISCEMI: Case = localized({
  id: "niscemi-aftermath",
  lens: "observed_dynamics",
  hazard: "landslide",
  name: "Niscemi",
  place: "Sicily, Italy",
  region: "Landslide · 25 Jan 2026",
  focus: [14.38, 37.15],
  chipKm: 10.24,
  when: "Jan 2026",
  target: "2026-10-22",
  verdict: "measured",
  verdictLine:
    "Eight passes from 24 Jun to 22 Oct 2026, all after the 25 Jan landslide. On 22 Oct the area's median HH return was 2.17 dB above its first four passes.",
  reason:
    "No pass sees the slope before the landslide, so the radar can't compare before with after.",
  stat: "+2.17 dB",
  statLine: "median HH change per cell on 22 Oct 2026 against 24 Jun – 11 Aug, over 16,384 cells.",
  statSource:
    "nova-frontier-model · niscemi-aftermath series, area_readout.delta_db (release events-20261115)",
  witness: {
    label: "Protezione Civile · update of 30 Jan 2026",
    note: "Reports the 25 Jan landslide. Context, not our measurement",
  },
  quality: [
    {
      k: "Status",
      v: "Aftermath only",
      why: "All 8 passes are after the 25 Jan 2026 landslide; the first one 150 days later.",
    },
    {
      k: "Passes",
      v: "4 + 4",
      why: "Four baseline passes (24 Jun – 11 Aug), four assessment passes (23 Aug – 22 Oct).",
    },
    {
      k: "Support",
      v: "16,384 cells",
      why: "Every cell of the 128 × 128 grid at 80 m has both channels on all 8 passes.",
    },
  ],
  plainLimit:
    "The passes start five months after the landslide, so they show how the slope behaved afterwards, not the landslide itself.",
  techLimit:
    "Radar intensity is not displacement: ground motion needs interferometric phase, pixel offsets or a geodetic survey, and the terrain's visibility to the radar. A slope's echo also changes with soil moisture, roughness, vegetation and viewing geometry.",
  // nova-frontier-model characterization.py, the landslides theme.
  alternatives: [
    "Surface roughness or vegetation removal",
    "Soil moisture",
    "Terrain shadow or layover",
  ],
  empties: ["Displacement", "Landslide extent", "Probability", "Cause"],
  sources: [
    {
      label: "Protezione Civile · Niscemi landslide update, 30 Jan 2026",
      href: "https://www.protezionecivile.gov.it/en/notizia/niscemi-landslide-national-service-efforts-continue/index.html",
    },
    RELEASE,
    {
      label: "nova-frontier-model · what the radar can say about landslides",
      href: "https://github.com/NASA-NOVA-FRONTIER/nova-frontier-model/blob/main/contracts/phenomena-catalog.json",
    },
    { label: "ASF · NISAR L2 GCOV product guide", href: "https://nisar-docs.asf.alaska.edu/gcov/" },
  ],
  crops: { base: `${FOLDER}/baseline-HH.png`, change: `${FOLDER}/change-HH.png` },
  timeline: timeline(NISCEMI_EVIDENCE),
  landslide: NISCEMI_EVIDENCE,
});
