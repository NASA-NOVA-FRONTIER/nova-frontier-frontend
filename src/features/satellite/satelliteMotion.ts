// Pure motion rules of the NISAR model, ported from the design reference nisar-satellite.js so the
// deploy sequence, camera and hotspot rules can be tested without WebGL.

export const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

export const smoothstep = (from: number, to: number, value: number): number => {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

export const MAX_PIXEL_RATIO = 2;
export const pixelRatioFor = (devicePixelRatio: number | undefined): number =>
  Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);

/** Scroll progress 0–1 through a track taller than the viewport (0 when it doesn't scroll). */
export const trackProgress = (
  rect: { top: number; height: number },
  viewportHeight: number,
): number => clamp(-rect.top / Math.max(1, rect.height - viewportHeight));

export type PoseInputs = {
  deploy: number;
  beam: number;
  scrollDriven: boolean;
  progress: number;
  reduced: boolean;
};

export type SatellitePose = {
  deploy: number;
  beam: number;
  zoom: number;
  /** z rotation of each of the four boom segments (all 0 when unfolded). */
  boomAngles: [number, number, number, number];
  /** Radial scale of the mesh dish: furled 0.08 → open 1. */
  dishScale: number;
  /** Reflector travel from stowed (0) to its place at the boom tip (1). */
  reflectorT: number;
};

// First-segment angle that folds the boom flat against the bus; the others fold back on each other.
const FIRST_FOLD = 0.6435;
const SEGMENT_FOLD = 3.08;

// Reduced motion shows the satellite deployed and still: no scroll scrub, so zoom stays at rest.
export const satellitePose = ({
  deploy,
  beam,
  scrollDriven,
  progress,
  reduced,
}: PoseInputs): SatellitePose => {
  let dep = reduced ? 1 : clamp(deploy);
  let bm = clamp(beam);
  let zoom = 1;
  if (scrollDriven && !reduced) {
    dep = smoothstep(0.05, 0.45, progress);
    bm = smoothstep(0.55, 0.8, progress);
    zoom = 0.62 + 0.38 * smoothstep(0.05, 0.5, progress);
  }
  const fold = 1 - smoothstep(0, 0.55, dep);
  return {
    deploy: dep,
    beam: bm,
    zoom,
    boomAngles: [fold * FIRST_FOLD, fold * SEGMENT_FOLD, -fold * SEGMENT_FOLD, fold * SEGMENT_FOLD],
    dishScale: 0.08 + 0.92 * smoothstep(0.62, 1, dep),
    reflectorT: smoothstep(0.5, 0.8, dep),
  };
};

export type Orbit = { yaw: number; pitch: number };

export const PITCH_MIN = -0.5;
export const PITCH_MAX = 1.1;
export const INITIAL_ORBIT: Orbit = { yaw: -0.5, pitch: 0.22 };
export const AUTOROTATE_STEP = 0.0016;

export const orbitByDrag = (orbit: Orbit, dx: number, dy: number): Orbit => ({
  yaw: orbit.yaw - dx * 0.006,
  pitch: clamp(orbit.pitch + dy * 0.004, PITCH_MIN, PITCH_MAX),
});

/** The orbit after an arrow key, or undefined for any other key. */
export const orbitByKey = (orbit: Orbit, key: string): Orbit | undefined => {
  switch (key) {
    case "ArrowLeft":
      return { ...orbit, yaw: orbit.yaw + 0.2 };
    case "ArrowRight":
      return { ...orbit, yaw: orbit.yaw - 0.2 };
    case "ArrowUp":
      return { ...orbit, pitch: clamp(orbit.pitch + 0.1, PITCH_MIN, PITCH_MAX) };
    case "ArrowDown":
      return { ...orbit, pitch: clamp(orbit.pitch - 0.1, PITCH_MIN, PITCH_MAX) };
    default:
      return undefined;
  }
};

// The camera glides towards the target orbit; without motion it jumps, so one frame shows the end.
export const easeOrbit = (current: Orbit, target: Orbit, reduced: boolean): Orbit => {
  const k = reduced ? 1 : 0.1;
  return {
    yaw: current.yaw + (target.yaw - current.yaw) * k,
    pitch: current.pitch + (target.pitch - current.pitch) * k,
  };
};

export type Vec3 = [number, number, number];

export const cameraPose = (
  orbit: Orbit,
  zoom: number,
  beam: number,
): { position: Vec3; target: Vec3 } => {
  const target: Vec3 = [3.5 + 2.5 * zoom, 3.5 + 3 * zoom - 2.5 * beam, 0];
  const d = (30 + 14 * zoom) * (1 + 0.35 * beam);
  const { yaw, pitch } = orbit;
  return {
    position: [
      target[0] + d * Math.sin(yaw) * Math.cos(pitch),
      target[1] + d * Math.sin(pitch),
      target[2] + d * Math.cos(yaw) * Math.cos(pitch),
    ],
    target,
  };
};

/** Hotspots appear only once the mesh is (almost) open. */
export const HOTSPOT_MIN_DEPLOY = 0.92;
const EDGE = 8;

export const hotspotVisible = (
  show: boolean,
  point: { x: number; y: number; z: number },
  width: number,
  height: number,
): boolean =>
  show &&
  point.z < 1 &&
  point.x > EDGE &&
  point.x < width - EDGE &&
  point.y > EDGE &&
  point.y < height - EDGE;

/** Projected NDC (−1…1) to pixels in a box of width × height. */
export const toScreen = (
  ndc: { x: number; y: number },
  width: number,
  height: number,
): { x: number; y: number } => ({
  x: ((ndc.x + 1) / 2) * width,
  y: ((1 - ndc.y) / 2) * height,
});

const TIP_WIDTH = 250;

/** Tooltip top-left beside a hotspot, flipped left when it would leave the box. */
export const tipPosition = (
  x: number,
  y: number,
  width: number,
  height: number,
): { left: number; top: number } => ({
  left: x + TIP_WIDTH + 20 > width ? x - TIP_WIDTH - 18 : x + 18,
  top: clamp(y - 40, EDGE, Math.max(EDGE, height - 120)),
});
