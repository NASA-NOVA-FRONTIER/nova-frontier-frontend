// Hotspot copy verbatim from SPECS-content-pages-v8 §1 (and design reference nisar-satellite.js).
export const SATELLITE_PARTS = [
  {
    id: "reflector",
    title: "12 m reflector",
    body: "Gold-plated wire mesh stretched on a ring truss. It focuses the radar into a swath more than 240 km wide.",
  },
  {
    id: "boom",
    title: "9 m boom",
    body: "Holds the reflector away from the spacecraft. It unfolded in orbit after launch.",
  },
  {
    id: "lband",
    title: "L-band radar · 24 cm",
    body: "Built by NASA/JPL. The long wave passes leaves and reaches branches, trunks and soil.",
  },
  {
    id: "sband",
    title: "S-band radar · 9.4 cm",
    body: "Built by ISRO. A shorter wave that responds more to leaves and the top of crops.",
  },
  {
    id: "bus",
    title: "Spacecraft bus",
    body: "Provided by ISRO, carrying NASA's 3.5 Gbps Ka-band link that sends the data down.",
  },
  {
    id: "solar",
    title: "Solar array",
    body: "Keeps both radars and the recorder powered around the orbit.",
  },
] as const;

export type SatellitePartId = (typeof SATELLITE_PARTS)[number]["id"];

// UI strings of the design reference nisar-satellite.js; the fallback alt describes the NASA/JPL
// artist's concept photo.
export const SATELLITE_COPY = {
  loading: "LOADING NISAR…",
  hint: "DRAG TO ROTATE",
  canvasLabel: "3D model of the NISAR satellite. Drag to rotate.",
  fallbackAlt:
    "Artist's concept of NISAR above Earth, its 12 m gold mesh reflector open on a long boom",
} as const;

export const SATELLITE_FALLBACK_IMAGE = "/landing/nisar-concept.jpg";
