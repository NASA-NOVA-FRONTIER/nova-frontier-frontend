import type { Source } from "@/features/cases/cases";

/*
 * What a measured wildfire case can show honestly (#21): the radar return of every pass, the
 * wildfire lens's cross-pol (HV) decline history, and how that decline sits inside and outside an
 * independent fire perimeter. It never states burned area, severity, probability or cause: a
 * perimeter can enclose unburned cells, and HV can drop for reasons other than fire.
 */

export type Channel = "HH" | "HV";
export const CHANNELS: readonly Channel[] = ["HH", "HV"];

// The median and interquartile range of the measured cells, in dB.
export type Spread = { median: number; iqr: [number, number] };

export type WildfirePass = {
  date: string;
  role: "baseline" | "assessment";
  // The marker pixel at the case point.
  point: Record<Channel, number>;
  // Every cell measured in all passes and both channels.
  area: Record<Channel, Spread>;
  // Assessment passes only: cells where either channel left its own baseline band.
  outsideCells?: number;
};

// lens_report.radar.cross_pol_history: HV below its negative median/MAD bound, pass by pass.
export type CrossPolHistory = {
  rule: string;
  samples: { date: string; declineCells: number; medianChangeDb: number }[];
  declineOnLastTwoCells: number;
  returnWithinBandCells: number;
};

// area_readout.external_perimeter_comparison: the same cells split by the reference perimeter.
export type PerimeterSide = {
  cells: number;
  // Target minus baseline median, per channel.
  shift: Record<Channel, number>;
  declineBothDatesCells: number;
};

export type FireReference = {
  label: string;
  source: Source;
  ignition: string;
  containment: string;
};

export type WildfireView = {
  id: string;
  title: string;
  src: string;
  // Which dates the image is made from.
  dates: string[];
  // A continuous colour scale; the RGB composites and the pattern have none.
  ramp?: string;
  scale: [string, string];
  text: string;
};

export type WildfireEvidence = {
  series: string;
  folder: string;
  passes: WildfirePass[];
  target: string;
  cells: number;
  gridKm: number;
  postingM: number;
  // The rule behind outsideCells, as the model states it.
  band: string;
  // Target pass minus the cell-wise median of the baseline passes.
  shift: { area: Record<Channel, Spread>; point: Record<Channel, number> };
  crossPol: CrossPolHistory;
  perimeter: { inside: PerimeterSide; outside: PerimeterSide };
  reference: FireReference;
  // NASA FIRMS detections are not in the model's case; until they are added the panel says so.
  firms: { status: "unavailable"; note: string };
  views: WildfireView[];
  limitation: string;
  source: Source;
};

const DAY = 86_400_000;

export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY);

export const passImage = (evidence: WildfireEvidence, date: string, channel: Channel): string =>
  `${evidence.folder}/${date}-${channel}.png`;

// The share of cells, in percent with one decimal, so "127 of 1,737" can also read "7.3 %".
export const sharePercent = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;
