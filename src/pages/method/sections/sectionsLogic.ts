import { SURFACE_IDS, type SurfaceId } from "@/pages/method/sections/sectionsContent";

export const DB_MIN = -30;
export const DB_MAX = 0;

// Bar length on the fixed −30…0 dB axis; values outside it stick to the ends.
export const barWidth = (db: number): string => {
  const clamped = Math.min(DB_MAX, Math.max(DB_MIN, db));
  return `${(((clamped - DB_MIN) / (DB_MAX - DB_MIN)) * 100).toFixed(1)}%`;
};

// Typographic minus, as on the axis labels.
export const formatDb = (db: number): string => `${db < 0 ? "−" : ""}${Math.abs(db)} dB`;

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

// Radio-group keys: arrows wrap, Home/End jump; any other key leaves the choice alone (null).
export const nextSurface = (
  current: SurfaceId,
  key: string,
  ids: readonly SurfaceId[] = SURFACE_IDS,
): SurfaceId | null => {
  const last = ids.length - 1;
  if (key === "Home") return ids[0] ?? null;
  if (key === "End") return ids[last] ?? null;
  const step = STEP[key];
  if (step === undefined) return null;
  const index = ids.indexOf(current);
  return ids[(index + step + ids.length) % ids.length] ?? null;
};

// Same scale for every band: 1 cm of wavelength is 10 SVG units.
export const UNITS_PER_CM = 10;
export const WAVE_VIEW_WIDTH = 1200;
// The wave SVG is twice as wide as its row, so it can slide left without running out.
const SVG_TO_ROW = 2;

export const wavePeriod = (cm: number): number => cm * UNITS_PER_CM;

export const wavePath = (cm: number): string => {
  const period = wavePeriod(cm);
  const points: string[] = [];
  for (let x = 0; x <= WAVE_VIEW_WIDTH; x += 4) {
    points.push(`${x},${(32 + 20 * Math.sin((x / period) * Math.PI * 2)).toFixed(1)}`);
  }
  return `M${points.join(" L")}`;
};

// Scale bar under the wave: one wavelength, as a share of the row's width.
export const scaleBarWidth = (cm: number): string =>
  `${((wavePeriod(cm) / WAVE_VIEW_WIDTH) * SVG_TO_ROW * 100).toFixed(2)}%`;

// One loop slides the SVG by exactly one wavelength (a share of the SVG's own width), so the loop has no seam.
export const waveShift = (cm: number): string =>
  `-${((wavePeriod(cm) / WAVE_VIEW_WIDTH) * 100).toFixed(4)}%`;
