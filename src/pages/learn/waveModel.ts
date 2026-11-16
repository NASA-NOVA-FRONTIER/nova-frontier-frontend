import { tr } from "@/i18n/translate";
import { localized } from "@/i18n/localized";
// The Learn "Play with the wave" cross-section (#33): strings, band facts and the pure geometry of
// the drawing, ported from the v9 handoff `reference/Radar Waves.dc.html` so it can be tested
// without a canvas. Drawing lives in drawRadarWaves.ts, the loop in RadarWaves.tsx. This file's name
// differs from the component's by more than case, so Windows resolves `@/pages/learn/RadarWaves` to
// the component and not to this file.
//
// Sources (read 2026-11-15):
// - NASA Science, About the NISAR satellite (https://science.nasa.gov/mission/nisar/about-the-satellite/):
//   "24 cm wavelength L-SAR and 9.4 cm wavelength S-SAR", a 12 m reflector, side-looking L-SAR.
//   NASA's Mission overview and Get to know SAR pages give the same 24 / 9.4 cm. (ASF's NISAR intro
//   says 9.3 cm for S; we follow NASA.) Learn used to draw L at 23 cm: that is NASA Earthdata's line
//   for L-band in general ("about 23 cm"), not NISAR's radar.
// - Frequencies: ASF NISAR intro (https://nisar-docs.asf.alaska.edu/nisar-intro), L centre 1257.5 MHz;
//   eoPortal NISAR table (https://www.eoportal.org/satellite-missions/nisar), S 3.2 GHz. C-band about
//   5.6 cm / 5.4 GHz: NASA Earthdata SAR band table (C = 3.8–7.5 cm).
// - Canopy: NASA Earthdata SAR (https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/sar):
//   L-band penetrates "more deeply through a tree canopy" with "more interaction … with large branches
//   and tree trunks"; C-band "penetrates only into the top layers of the canopy"; canopy volume
//   scattering "is most sensitive to cross-polarized data like VH or HV". No source says NISAR "sees
//   under forest canopy", so the L text says only what Earthdata says.
// - Incidence 33–47°: eoPortal NISAR table ("33º-47º"); the NASA/JPL pages we read don't state it, so
//   no visible string calls it NISAR's range.

export type BandId = "L" | "S" | "C";
export type PolId = "HH" | "HV";

export type Band = {
  id: BandId;
  label: string;
  cm: number;
  meta: string;
  /** How far down the canopy the pulse scatters, 0 = canopy top, 1 = the ground. */
  reach: number;
  /** The label on the dashed reach line in the canvas. */
  reachLabel: string;
  title: string;
  body: string;
};

// COPY-flow-v9 §8 verbatim, except where a decision (Cristian, 15 Nov) says otherwise:
// "SCATTERS" replaces "STOPS" (the pulse isn't stopped), "REACHES DEEPEST" replaces "REACHES THE
// GROUND", the L body is softened to the Earthdata source and the HV clause is trimmed to it.
export const RADAR_WAVES_COPY = localized({
  kicker: "PLAY WITH THE WAVE",
  heading: "Change the wave, change what comes back.",
  lede: "Pick a wavelength, a polarization and an angle. The pulse and its echo move in real time.",
  bandLabel: "Wavelength",
  polLabel: "Polarization",
  incidenceLabel: "Incidence angle",
  steeper: "33° · STEEPER",
  shallower: "47° · SHALLOWER",
  chip: "ILLUSTRATIVE · WAVELENGTHS TO SCALE",
  // New (PR #60 review): the chip's tooltip says what the drawing is and where its numbers come from.
  chipSource:
    "A diagram, not a measurement. Wavelengths: L-band 24 cm and S-band 9.4 cm from NASA Science's NISAR pages; C-band about 5.6 cm from NASA Earthdata.",
  sent: "SENT",
  echo: { HH: "ECHO · HH", HV: "ECHO · HV" } satisfies Record<PolId, string>,
  scaleBar: "24 cm",
  nisar: "NISAR",
  nisarSub: "12 m REFLECTOR · SIDE-LOOKING",
  leaves: "LEAVES",
  branches: "BRANCHES",
  soil: "SOIL",
  pol: {
    HH: " In HH the echo returns in the same horizontal plane it was sent.",
    HV: " In HV the echo comes back twisted to vertical, which mostly happens inside vegetation.",
  } satisfies Record<PolId, string>,
  steeperText: " A steeper angle looks more straight down and sees more of the ground.",
  shallowerText: " A shallower angle crosses more canopy on the way down.",
} as const);

const L_BAND: Band = {
  id: "L",
  label: "L-band · 24 cm",
  cm: 24,
  meta: "1.26 GHz · NISAR (NASA/JPL), also SAOCOM",
  reach: 1,
  reachLabel: "REACHES DEEPEST",
  title: "The long wave reaches deepest",
  body: "At 24 cm the pulse goes deeper into a tree canopy than shorter waves and interacts more with large branches and trunks.",
};

export const BANDS: readonly Band[] = localized([
  L_BAND,
  {
    id: "S",
    label: "S-band · 9.4 cm",
    cm: 9.4,
    meta: "3.2 GHz · NISAR (ISRO)",
    reach: 0.45,
    reachLabel: "SCATTERS IN THE BRANCHES",
    title: "The middle wave scatters in the branches",
    body: "At 9.4 cm the pulse responds more to leaves, small branches and the tops of crops.",
  },
  {
    id: "C",
    label: "C-band · 5.6 cm",
    cm: 5.6,
    meta: "≈ 5.4 GHz · Sentinel-1, RADARSAT Constellation",
    reach: 0.14,
    reachLabel: "SCATTERS AT THE LEAVES",
    title: "The short wave scatters at the leaves",
    body: "At about 5.6 cm most of the echo comes from the top of the canopy.",
  },
]);

export const POLS: readonly { id: PolId; label: string }[] = localized([
  { id: "HH", label: "HH · sent H, heard H" },
  { id: "HV", label: "HV · sent H, heard V" },
]);

export const INCIDENCE = localized({ min: 33, max: 47, step: 1, initial: 40 } as const);

export const bandById = (id: BandId): Band => BANDS.find((band) => band.id === id) ?? L_BAND;

export const clampIncidence = (deg: number): number =>
  Math.min(INCIDENCE.max, Math.max(INCIDENCE.min, Math.round(deg)));

// The readout adds one line about the angle only at the ends of the range.
export const readout = (band: BandId, pol: PolId, inc: number): { title: string; body: string } => {
  const { title, body } = bandById(band);
  const incText =
    inc <= 38 ? RADAR_WAVES_COPY.steeperText : inc >= 43 ? RADAR_WAVES_COPY.shallowerText : "";
  return { title, body: body + RADAR_WAVES_COPY.pol[pol] + incText };
};

export const ariaLabel = (band: BandId, pol: PolId, inc: number): string =>
  tr("Diagram: {{label}} pulse at {{inc}} degrees, {{pol}} echo. {{title}}.", {
    label: bandById(band).label,
    inc,
    pol,
    title: bandById(band).title,
  });

// Roving tabindex: arrows move (and wrap), Home/End jump. Anything else isn't ours.
export const rovingNext = (key: string, index: number, count: number): number | undefined => {
  if (key === "ArrowRight" || key === "ArrowDown") return (index + 1) % count;
  if (key === "ArrowLeft" || key === "ArrowUp") return (index - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return undefined;
};

// --- Scene -----------------------------------------------------------------------------------

export type Tree = {
  x: number;
  cy: number;
  trunkTop: number;
  scale: number;
  /** 0 = front row, 1 = back row (dimmer, never lit). */
  depth: 0 | 1;
  branches: { d: number; y: number }[];
};

export type Particle = { x: number; y: number; r: number; a: number; tw: number; depth: 0 | 1 };

export type Scene = {
  W: number;
  H: number;
  groundY: number;
  canopyTop: number;
  canopyH: number;
  trees: Tree[];
  pts: Particle[];
  grains: { x: number; y: number; a: number }[];
  stars: { x: number; y: number; r: number; a: number }[];
};

// A fixed seed, so a given size always draws the same forest (and resizes don't reshuffle it).
const seededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
};

export const buildScene = (W: number, H: number): Scene => {
  const rnd = seededRandom(11);
  const groundY = H * 0.8;
  const canopyTop = H * 0.5;
  const canopyH = groundY - canopyTop;
  const trees: Tree[] = [];
  const pts: Particle[] = [];
  const add = (x: number, scale: number, depth: 0 | 1) => {
    const cy = canopyTop + canopyH * (0.3 + (1 - scale) * 0.25);
    const rx = (W / 15) * scale;
    const ry = canopyH * 0.34 * scale;
    const trunkTop = cy + ry * 0.5;
    const branchPlan: [number, number][] = [
      [-1, 0.7],
      [1, 0.55],
      [-1, 0.38],
      [1, 0.25],
    ];
    trees.push({
      x,
      cy,
      trunkTop,
      scale,
      depth,
      branches: branchPlan.map(([d, k]) => ({ d, y: groundY - (groundY - trunkTop) * k })),
    });
    const n = Math.round(260 * scale * (depth ? 0.6 : 1));
    for (let i = 0; i < n; i++) {
      const th = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd());
      pts.push({
        x: x + Math.cos(th) * r * rx * (0.8 + rnd() * 0.3),
        y: cy + Math.sin(th) * r * ry,
        r: (depth ? 0.7 : 0.9) + rnd() * 0.9,
        a: depth ? 0.22 + rnd() * 0.2 : 0.45 + rnd() * 0.45,
        tw: rnd() * Math.PI * 2,
        depth,
      });
    }
  };
  for (let i = 0; i < 9; i++) add(((i + 0.1) * W) / 8.5, 0.75, 1);
  for (let i = 0; i < 6; i++) add(((i + 0.5) * W) / 6, 1, 0);
  const grains = Array.from({ length: 160 }, () => ({
    x: rnd() * W,
    y: groundY + 6 + rnd() * (H - groundY - 8),
    a: 0.1 + rnd() * 0.25,
  }));
  const stars = Array.from({ length: 60 }, () => ({
    x: rnd() * W,
    y: rnd() * H * 0.38,
    r: 0.3 + rnd() * 0.8,
    a: 0.12 + rnd() * 0.3,
  }));
  return { W, H, groundY, canopyTop, canopyH, trees, pts, grains, stars };
};

// --- Pulse geometry --------------------------------------------------------------------------

/** NISAR never slides further left than this, so its wing and label stay inside the frame. */
export const SAT_MIN_X = 112;
/** Half the beam's width at the hit point; particles closer than this to the ray light up. */
export const BEAM_HALF = 26;
/** The echo runs on a parallel line this far from the sent wave. */
export const ECHO_OFFSET = 18;

export type PulseGeometry = {
  /** Hit point. */
  hx: number;
  hitY: number;
  /** Satellite body. */
  sx: number;
  sy: number;
  /** Where the pulse leaves the reflector. */
  ex: number;
  ey: number;
  /** Unit vector along the beam and its normal. */
  ux: number;
  uy: number;
  nx: number;
  ny: number;
  length: number;
};

export const hitDepthY = (scene: Scene, band: BandId): number =>
  band === "L" ? scene.groundY + 2 : scene.canopyTop + scene.canopyH * bandById(band).reach;

export const pulseGeometry = (scene: Scene, band: BandId, incDeg: number): PulseGeometry => {
  const hitY = hitDepthY(scene, band);
  const inc = (incDeg * Math.PI) / 180;
  const hx = scene.W * 0.6;
  const sy = scene.H * 0.2;
  const sx = Math.max(SAT_MIN_X, hx - Math.tan(inc) * (hitY - sy));
  const ex = sx + 30;
  const ey = sy - 10;
  const length = Math.hypot(hx - ex, hitY - ey);
  const ux = (hx - ex) / length;
  const uy = (hitY - ey) / length;
  return { hx, hitY, sx, sy, ex, ey, ux, uy, nx: -uy, ny: ux, length };
};

/** Distance of a point from the beam's centre line. */
export const beamDistance = (geometry: PulseGeometry, x: number, y: number): number =>
  Math.abs((x - geometry.ex) * geometry.nx + (y - geometry.ey) * geometry.ny);

// Front-row particles inside the beam, down to the band's reach, light up gold. Shorter bands light
// only a slice just above where they scatter.
export const inBeam = (
  scene: Scene,
  geometry: PulseGeometry,
  band: BandId,
  p: Particle,
): boolean => {
  if (p.depth) return false;
  if (beamDistance(geometry, p.x, p.y) >= BEAM_HALF) return false;
  if (band === "L") return p.y <= scene.groundY;
  const top = scene.canopyTop + scene.canopyH * (bandById(band).reach - 0.25);
  return p.y <= geometry.hitY + 6 && p.y >= top;
};

// --- Waves -----------------------------------------------------------------------------------

/** The shortest band (C, 5.6 cm) never draws under this many pixels per wavelength. */
export const MIN_WAVE_PX = 10;

// One cm → px factor for every band and the 24 cm bar. The floor goes on this shared factor, not
// on each band, so L : S : C stay 24 : 9.4 : 5.6 at every width (a per-band floor made S and C
// identical on phones).
export const pxPerCm = (W: number): number => Math.max(2.4 * (W / 900), MIN_WAVE_PX / 5.6);

/** Screen pixels per wavelength. */
export const wavePx = (cm: number, W: number): number => cm * pxPerCm(W);

export const waveAmp = (px: number): number => Math.min(11, 4 + px * 0.12);

/** Spacing of the HV echo's dots: at least half a wavelength and never closer than 10 px. */
export const echoDotStep = (px: number): number => Math.max(10, px / 2);

// How bright the echo is drawn (0–1). Illustrative only: never shown as a number. HV is always
// fainter than HH, and shorter waves fainter than longer ones.
const ECHO: Record<PolId, Record<BandId, number>> = {
  HH: { L: 0.85, S: 0.65, C: 0.5 },
  HV: { L: 0.6, S: 0.45, C: 0.32 },
};
export const echoStrength = (band: BandId, pol: PolId): number => ECHO[pol][band];

// Wave time only moves while frames run; a long gap (tab hidden, scrolled away) resumes where it
// stopped instead of jumping.
export const MAX_STEP_S = 1 / 15;
export const advanceTime = (t: number, lastMs: number | undefined, nowMs: number): number =>
  lastMs === undefined ? t : t + Math.min(MAX_STEP_S, Math.max(0, (nowMs - lastMs) / 1000));
