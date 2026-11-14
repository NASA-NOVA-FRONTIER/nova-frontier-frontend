// A phone (≤ 720 px) gets the satellite only while it keeps up; one slow reading swaps in the photo.
export const MOBILE_MAX_PX = 720;
export const MOBILE_MIN_FPS = 40;

export const missionFallback = (widthPx: number, fps: number): boolean =>
  widthPx <= MOBILE_MAX_PX && fps < MOBILE_MIN_FPS;
