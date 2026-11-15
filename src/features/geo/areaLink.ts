import type { LonLat } from "@/features/frames/frame.types";
import type { Ring } from "@/features/geo/geo.types";
import { MAX_VERTICES, MIN_VERTICES } from "@/features/geo/limits";
import { normalizeLon, unwrapRing } from "@/features/geo/longitude";

// Shared links: ?point=lon,lat is the exact point a live question ran on. ?bbox=west,south,east,north
// (east below west crosses ±180°) and ?geo=lon,lat_lon,lat_… are links from the old area tools: since
// v9 there is one 10.24 km square, so they come back as the square's centre, placed but not run.
export const BBOX_PARAM = "bbox";
export const GEO_PARAM = "geo";
export const POINT_PARAM = "point";

const DECIMALS = 5;
const VERTEX_SEPARATOR = "_";
const FULL_TURN = 360;

const trimmed = (value: number): string => String(Number(value.toFixed(DECIMALS)));

const pairOf = ([lon, lat]: LonLat): string => `${trimmed(normalizeLon(lon))},${trimmed(lat)}`;

const isLon = (value: number): boolean => Number.isFinite(value) && Math.abs(value) <= 180;
const isLat = (value: number): boolean => Number.isFinite(value) && Math.abs(value) <= 90;

export const pointToParams = (point: LonLat): Record<string, string> => ({
  [POINT_PARAM]: pairOf(point),
});

const parsePoint = (text: string): LonLat | undefined => {
  const parts = text.split(",");
  if (parts.length !== 2 || parts.some((part) => part.trim() === "")) return undefined;
  const [lon, lat] = parts.map(Number);
  return lon !== undefined && lat !== undefined && isLon(lon) && isLat(lat)
    ? [lon, lat]
    : undefined;
};

const bboxCentre = (text: string): LonLat | undefined => {
  const values = text.split(",").map(Number);
  if (values.length !== 4) return undefined;
  const [west, south, rawEast, north] = values as [number, number, number, number];
  if (![west, rawEast].every(isLon) || ![south, north].every(isLat) || south >= north)
    return undefined;
  if (west === rawEast) return undefined;
  const east = rawEast < west ? rawEast + FULL_TURN : rawEast;
  return [normalizeLon((west + east) / 2), (south + north) / 2];
};

// The mean of the corners, with longitudes made continuous first so a polygon over ±180° stays put.
const geoCentre = (text: string): LonLat | undefined => {
  const vertices = text.split(VERTEX_SEPARATOR).map((pair): LonLat | undefined => {
    const [lon, lat, ...extra] = pair.split(",").map(Number);
    return lon !== undefined && lat !== undefined && extra.length === 0 && isLon(lon) && isLat(lat)
      ? [lon, lat]
      : undefined;
  });
  if (vertices.length < MIN_VERTICES || vertices.length > MAX_VERTICES) return undefined;
  if (!vertices.every((vertex) => vertex !== undefined)) return undefined;
  const ring: Ring = unwrapRing(vertices as Ring);
  const lon = ring.reduce((sum, [value]) => sum + value, 0) / ring.length;
  const lat = ring.reduce((sum, [, value]) => sum + value, 0) / ring.length;
  return [normalizeLon(lon), lat];
};

// The point a shared live question ran on.
export const pointFromParams = (params: URLSearchParams): LonLat | undefined => {
  const point = params.get(POINT_PARAM);
  return point === null ? undefined : parsePoint(point);
};

// Where an old area link places the square: the bbox centre, else the polygon's centre.
export const squareFromParams = (params: URLSearchParams): LonLat | undefined => {
  const bbox = params.get(BBOX_PARAM);
  if (bbox !== null) return bboxCentre(bbox);
  const geo = params.get(GEO_PARAM);
  return geo === null ? undefined : geoCentre(geo);
};
