import type { Source } from "@/features/cases/cases";

/*
 * What a measured landslide case can show honestly (#24): the radar return of every pass, how much of
 * the area left its own earlier range, and the shift on the last pass. There is no landslide lens in
 * the model, so this is descriptive (lens `observed_dynamics`) and every reading of it is EXPERIMENTAL.
 */

export type Channel = "HH" | "HV";
export const CHANNELS: readonly Channel[] = ["HH", "HV"];

// The median and interquartile range of the measured cells, in dB.
export type Spread = { median: number; iqr: [number, number] };

export type LandslidePass = {
  date: string;
  role: "baseline" | "assessment";
  // The marker pixel at the case point.
  point: Record<Channel, number>;
  // Every cell measured in all passes and both channels.
  area: Record<Channel, Spread>;
  // Assessment passes only: cells where either channel left its own baseline band.
  outsideCells?: number;
};

export type LandslideView = {
  id: string;
  title: string;
  src: string;
  // Which dates the image is made from.
  dates: string[];
  // A continuous colour scale; the RGB composites have none, their scale words name the bands.
  ramp?: string;
  scale: [string, string];
  text: string;
};

export type LandslideEvidence = {
  event: { date: string; label: string };
  // The one radar series every pass belongs to, and where its layers ship (public/).
  series: string;
  folder: string;
  passes: LandslidePass[];
  target: string;
  cells: number;
  gridKm: number;
  postingM: number;
  // The rule behind outsideCells, as the model states it.
  band: string;
  // Target pass minus the cell-wise median of the baseline passes.
  shift: { area: Record<Channel, Spread>; point: Record<Channel, number> };
  views: LandslideView[];
  source: Source;
};

const DAY = 86_400_000;

export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY);

export const baselinePasses = (evidence: LandslideEvidence): LandslidePass[] =>
  evidence.passes.filter((pass) => pass.role === "baseline");

export const assessmentPasses = (evidence: LandslideEvidence): LandslidePass[] =>
  evidence.passes.filter((pass) => pass.role === "assessment");

// Aftermath only: no pass sees the slope before the event, so nothing compares before with after.
export const isAftermathOnly = (evidence: LandslideEvidence): boolean =>
  evidence.passes.every((pass) => pass.date > evidence.event.date);

export const outsidePercent = (pass: LandslidePass, cells: number): number | undefined =>
  pass.outsideCells === undefined || cells === 0 ? undefined : (100 * pass.outsideCells) / cells;

// The assessment pass with the largest share outside its band; ties keep the earlier pass.
export const peakPass = (evidence: LandslideEvidence): LandslidePass | undefined =>
  assessmentPasses(evidence).reduce<LandslidePass | undefined>(
    (best, pass) =>
      best === undefined || (pass.outsideCells ?? 0) > (best.outsideCells ?? 0) ? pass : best,
    undefined,
  );

// "+2.17 dB" / "−0.40 dB", with a real minus sign so it reads like the rest of the app.
export const formatDb = (value: number): string =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(2)} dB`;

export const formatIqr = ([low, high]: [number, number]): string =>
  `${formatDb(low)} to ${formatDb(high)}`;

// The radar image of one channel on one pass; every pass of a case ships both channels.
export const passImage = (evidence: LandslideEvidence, date: string, channel: Channel): string =>
  `${evidence.folder}/${date}-${channel}.png`;

export const baselineImage = (evidence: LandslideEvidence, channel: Channel): string =>
  `${evidence.folder}/baseline-${channel}.png`;

// A view drawn per channel names it as {channel} in its path; the colour composites have one image.
export const viewImage = (view: LandslideView, channel: Channel): string =>
  view.src.replace("{channel}", channel);

export const isPerChannel = (view: LandslideView): boolean => view.src.includes("{channel}");
