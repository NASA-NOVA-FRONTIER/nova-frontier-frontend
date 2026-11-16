/*
 * An endless loop with no quiet moment: each pass of a track starts before the previous one ends,
 * and the two cross over a short span on equal-power curves (sine in, cosine out, so the summed
 * power stays constant: no dip, no surge). The tracks are trimmed before their own fade-out, so
 * the seam never crosses silence, and the ramps hide the few milliseconds of encoder padding.
 */

export const LOOP_CROSSFADE_SECONDS = 6;

const CURVE_POINTS = 64;

const buildCurves = () => {
  const fadeIn = new Float32Array(CURVE_POINTS);
  const fadeOut = new Float32Array(CURVE_POINTS);
  for (let point = 0; point < CURVE_POINTS; point += 1) {
    const angle = (point / (CURVE_POINTS - 1)) * (Math.PI / 2);
    fadeIn[point] = Math.sin(angle);
    fadeOut[point] = Math.cos(angle);
  }
  return { fadeIn, fadeOut };
};

export const EQUAL_POWER_CURVES = buildCurves();

// A very short track gets a shorter crossfade so its two fades can never overlap each other.
export const crossfadeFor = (duration: number): number =>
  Math.min(LOOP_CROSSFADE_SECONDS, duration / 4);

export type LoopPass = {
  start: number;
  stopAt: number;
  // The first pass starts at full level (the voice fades in as a whole), later ones fade in.
  fadeInAt: number | null;
  fadeOutAt: number;
};

type PassRequest = { index: number; firstStart: number; duration: number };

export const planPass = ({ index, firstStart, duration }: PassRequest): LoopPass => {
  const crossfade = crossfadeFor(duration);
  const start = firstStart + index * (duration - crossfade);
  return {
    start,
    stopAt: start + duration,
    fadeInAt: index === 0 ? null : start,
    fadeOutAt: start + duration - crossfade,
  };
};
