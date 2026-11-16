import type { LonLat } from "@/features/frames/frame.types";
import { AOI_SIDE_KM } from "@/features/geo/limits";
import { continueLon, normalizeLon } from "@/features/geo/longitude";

/*
 * The placed square as pure maths: the globe hands in lon/lat under the pointer, this decides where
 * the square's centre goes. The backend builds the real UTM square from the centre, so the centre
 * is the only thing kept; the side is always AOI_SIDE_KM.
 */

const KM_PER_DEGREE = 111.32;
const POLE_COS = 1e-6;
// The square's half side in degrees of latitude: the centre stays this far from a pole, so the
// square never folds over it.
const HALF_SIDE_DEG = AOI_SIDE_KM / 2 / KM_PER_DEGREE;
const MAX_CENTRE_LAT = 90 - HALF_SIDE_DEG;

const clampLat = (lat: number): number => Math.max(-MAX_CENTRE_LAT, Math.min(MAX_CENTRE_LAT, lat));

// Longitude back inside ±180°, latitude far enough from a pole for the whole square.
export const clampCentre = ([lon, lat]: LonLat): LonLat => [normalizeLon(lon), clampLat(lat)];

// A drag keeps the offset between the grab and the centre: the square follows the hand, it does
// not jump so its centre sits under the pointer. Longitudes stay continuous across ±180°.
export const moveSquare = (grabCentre: LonLat, grab: LonLat, pointer: LonLat): LonLat => {
  const lon = continueLon(grab[0], pointer[0]);
  return clampCentre([grabCentre[0] + lon - grab[0], grabCentre[1] + pointer[1] - grab[1]]);
};

// The arrow keys: a step east and north in kilometres, whatever the latitude.
export const nudgeSquare = ([lon, lat]: LonLat, eastKm: number, northKm: number): LonLat => {
  const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), POLE_COS);
  return clampCentre([lon + eastKm / (KM_PER_DEGREE * cosLat), lat + northKm / KM_PER_DEGREE]);
};
