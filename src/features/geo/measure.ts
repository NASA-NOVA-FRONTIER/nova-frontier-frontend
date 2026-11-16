import type { LonLat } from "@/features/frames/frame.types";
import type { Area, Ring } from "@/features/geo/geo.types";
import { AOI_SIDE_KM } from "@/features/geo/limits";
import { normalizeLon } from "@/features/geo/longitude";
import { squareAround } from "@/features/geo/square";

const EARTH_RADIUS_KM = 6371.0088;

const radians = (degrees: number): number => (degrees * Math.PI) / 180;

// Great-circle distance (haversine): what "about {km} km" to the nearest case measures.
export const greatCircleKm = ([lon1, lat1]: LonLat, [lon2, lat2]: LonLat): number => {
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

export const ringOf = (area: Area): Ring =>
  area.kind === "point" ? squareAround(area.point, AOI_SIDE_KM) : area.ring;

// Where the question is asked: the point itself, or the mean of the corners (a frame is ~240 km).
export const centreOf = (area: Area): LonLat => {
  if (area.kind === "point") return area.point;
  const lon = area.ring.reduce((sum, [value]) => sum + value, 0) / area.ring.length;
  const lat = area.ring.reduce((sum, [, value]) => sum + value, 0) / area.ring.length;
  return [normalizeLon(lon), lat];
};
