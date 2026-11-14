// HH/HV backscatter on the fixed gray scale every v8 view shares: −30 dB black, 0 dB white.
export const GRAY_DB_RANGE: readonly [number, number] = [-30, 0];

// Linear power (sigma0/gamma0) to dB; the baseline tif is already in dB, so this runs only if its
// metadata says otherwise.
export const powerToDb = (power: number): number => 10 * Math.log10(power);

// One dB value to a 0–255 gray level, clipped to the range; NaN has no gray (the caller makes it
// transparent, since a gap is not a value).
export const dbToGray = (db: number, [low, high] = GRAY_DB_RANGE): number | undefined => {
  if (!Number.isFinite(db)) return undefined;
  const t = Math.min(1, Math.max(0, (db - low) / (high - low)));
  return Math.round(t * 255);
};
