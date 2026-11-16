import { tr } from "@/i18n/translate";
import { localized } from "@/i18n/localized";
/*
 * Copy and drawing data for Method §04 (echo simulator), §05 (wavelengths) and §06 (interferometry), verbatim from
 * docs/design reference "Method v8.dc.html" (its `S`, `waves` and `insar` objects), with the orchestrator's science
 * corrections (tickets/_content-pages-common.md §1–§4). Kept here, not in copyV8.ts, while #50 edits that file.
 */

export type SurfaceId = "water" | "forest" | "field" | "city";

// [path d, fill, stroke]
type Shape = readonly [string, string, string];
// [path d, colour, stroke width, opacity]
type Ray = readonly [string, string, number, number];

export type Surface = {
  label: string;
  mech: string;
  title: string;
  body: string;
  // Typical L-band backscatter in dB, rounded: illustrative, never a measurement.
  hh: number;
  hv: number;
  ground: string;
  shapes: readonly Shape[];
  rays: readonly Ray[];
};

export const SURFACE_IDS: readonly SurfaceId[] = localized(["water", "forest", "field", "city"]);

export const SURFACES: Record<SurfaceId, Surface> = localized({
  water: {
    label: "Calm water",
    mech: "SPECULAR · MIRROR",
    title: "The pulse glances off and leaves.",
    body: "Smooth water reflects the radar away from the satellite like a mirror, so almost nothing returns. That is why new water turns a radar image dark.",
    hh: -25,
    hv: -30,
    ground: "#0d2a4a",
    shapes: [],
    rays: [
      ["M300 214 L560 34", "#c9b48b", 2.5, 0.9],
      ["M300 214 L210 146", "#e8894a", 1.2, 0.35],
    ],
  },
  forest: {
    label: "Forest",
    mech: "VOLUME · INSIDE THE CANOPY",
    title: "Leaves and branches scatter it everywhere.",
    body: "The pulse bounces around inside the canopy and comes back from many directions, often twisted. That twist is HV, which is why vegetation shows up strongly in HV.",
    hh: -8,
    hv: -13,
    ground: "#1c2a1c",
    shapes: [
      ["M270 214 L270 170 M300 214 L300 160 M330 214 L330 172", "none", "#6b5a3e"],
      [
        "M250 175 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0 M278 165 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0 M308 177 a22 22 0 1 0 44 0 a22 22 0 1 0 -44 0",
        "#2f5b35",
        "#3d7445",
      ],
    ],
    rays: [
      ["M300 175 L80 52", "#e8894a", 2.5, 0.9],
      ["M300 175 L96 66", "#6fb3e8", 2.5, 0.9],
      ["M300 175 L420 90", "#c9b48b", 1.5, 0.5],
      ["M300 175 L520 150", "#c9b48b", 1.5, 0.4],
      ["M300 175 L380 40", "#6fb3e8", 1.5, 0.5],
    ],
  },
  field: {
    label: "Field",
    mech: "SURFACE · ROUGH SOIL",
    title: "Rough ground sends part of it back.",
    body: "Ploughed soil and young crops scatter some energy toward the satellite. HH returns a moderate echo; HV stays low because little of it gets twisted.",
    hh: -12,
    hv: -20,
    ground: "#3a2f22",
    shapes: [
      [
        "M150 214 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6 l10 -6 l10 6",
        "none",
        "#8a7458",
      ],
    ],
    rays: [
      ["M300 210 L82 46", "#e8894a", 2.2, 0.85],
      ["M300 210 L100 70", "#6fb3e8", 1.2, 0.45],
      ["M300 210 L520 70", "#c9b48b", 2, 0.6],
    ],
  },
  city: {
    label: "City",
    mech: "DOUBLE BOUNCE · WALL AND STREET",
    title: "Wall and street send it straight back.",
    body: "The pulse hits the street, then a wall, and returns toward the satellite. This corner reflection makes buildings among the brightest things in HH.",
    hh: -3,
    hv: -12,
    ground: "#2a2d33",
    shapes: [
      [
        "M318 214 L318 120 L372 120 L372 214 Z M386 214 L386 150 L430 150 L430 214 Z",
        "#3a3f4a",
        "#6c7686",
      ],
    ],
    rays: [
      ["M300 214 L318 200 L74 42", "#e8894a", 3, 0.95],
      ["M318 200 L92 58", "#6fb3e8", 1.4, 0.55],
    ],
  },
});

export const ECHO_COPY = localized({
  kicker: "04 · WHAT THE ECHO SAYS",
  title: "Every surface sends the pulse back differently.",
  lead: "Pick a surface. HH is the echo sent and received horizontally; HV comes back twisted, which mostly happens inside leaves and branches.",
  groupLabel: "Surface",
  scaleMin: "−30 dB",
  scaleMax: "0 dB",
  chip: "TYPICAL VALUES · ILLUSTRATIVE",
  chipTitle: "Typical L-band backscatter for each surface type, rounded; not from a specific scene",
  diagramKicker: (label: string): string =>
    tr("{{toUpperCase}} · L-BAND PULSE IN GOLD · HH ORANGE · HV BLUE", {
      toUpperCase: label.toUpperCase(),
    }),
  diagramAria: (label: string): string =>
    tr("Diagram: radar pulse over {{toLowerCase}}", { toLowerCase: label.toLowerCase() }),
} as const);

export const HH_COLOUR = "#e8894a";
export const HV_COLOUR = "#6fb3e8";

export type Wave = {
  band: string;
  len: string;
  cm: number;
  colour: string;
  reach: string;
  who: string;
  // One loop moves the wave by exactly one wavelength.
  loopSeconds: number;
};

export const WAVES: readonly Wave[] = localized([
  {
    band: "L-band",
    len: "24 cm",
    cm: 24,
    colour: "#c9b48b",
    reach: "Reaches branches, trunks and soil",
    who: "NISAR · NASA/JPL · also SAOCOM",
    loopSeconds: 7,
  },
  {
    band: "S-band",
    len: "9.4 cm",
    cm: 9.4,
    colour: "#ebe9e4",
    reach: "Responds to leaves and crop tops",
    who: "NISAR · ISRO",
    loopSeconds: 5,
  },
  {
    band: "C-band",
    len: "≈ 5.6 cm",
    cm: 5.6,
    colour: "#8d8a83",
    reach: "Mostly the top of the canopy",
    who: "Sentinel-1 · RADARSAT Constellation",
    loopSeconds: 4,
  },
]);

export const WAVES_COPY = localized({
  kicker: "05 · THE LENGTH OF THE WAVE",
  title: "Longer waves reach deeper.",
  lead: "NISAR carries two radars. Drawn here at the same scale, next to the C-band wave used by Sentinel-1 and Canada's RADARSAT Constellation.",
  footnote:
    "Wavelengths: L-band 24 cm (1.26 GHz) and S-band 9.4 cm (3.2 GHz), from NASA's NISAR mission page; C-band about 5.6 cm (5.4 GHz). Argentina's SAOCOM also flies an L-band radar.",
} as const);

export type InsarFigure = {
  id: "phase" | "coherence";
  img: string;
  alt: string;
  tag: string;
  bar: string;
  left: string;
  right: string;
  caption: string;
};

// Interim crops of nova-frontier-model docs/images/interferometry.png (≈ 20 × 20 km, not the 5 km stat window) until
// the science team sends clean exports. The coherence crop keeps the report's magma colours, so its legend is magma.
export const INSAR_FIGURES: readonly InsarFigure[] = localized([
  {
    id: "phase",
    img: "/insar/kumamoto-wrapped-phase.png",
    alt: "Wrapped interferometric phase over Kumamoto, showing curved fringes",
    tag: "WRAPPED PHASE · −π → π",
    bar: "linear-gradient(90deg,#e8e6f0,#6e5aa8,#2a1a3a,#a8433a,#e8c9a6,#e8e6f0)",
    left: "−π",
    right: "+π",
    caption: "Each colour cycle is one fringe. Dark gaps are cells where the echo lost coherence.",
  },
  {
    id: "coherence",
    img: "/insar/kumamoto-coherence.png",
    alt: "Interferometric coherence over Kumamoto",
    tag: "COHERENCE · 0 → 1",
    bar: "linear-gradient(90deg,#000004,#51127c,#b73779,#fc8961,#fcfdbf)",
    left: "0 · changed",
    right: "1 · alike",
    caption:
      "How alike the two echoes are. Fields and towns stay bright; water and steep forest go dark. Report figure colours.",
  },
]);

export const INSAR_COPY = localized({
  kicker: "06 · TWO PASSES, ONE PHASE",
  title: "Fringes draw how the radar's path changed.",
  lead: "Interferometry compares the phase of two echoes from the same orbit. Each fringe is about 12 cm of change in the radar's path length: half of the 24 cm wave, because the pulse travels there and back. The path changes when the ground moves and when the air between ground and satellite changes, so the explorer shows coherence and wrapped phase, measured as they are.",
  // Common note §1: the 62,500 cells are the whole 5 km window, not all coherent ones.
  stat: "39,584",
  statText: "of 62,500 cells kept their phase at the 0.35 coherence threshold",
  chip: "REAL · KUMAMOTO · 21 JUL → 14 AUG 2026 · RUN 12 NOV 2026",
  chipTitle:
    "nova-frontier-backend README: Kumamoto, track 24, 21 Jul → 14 Aug 2026, 5 km window, measured 12 Nov 2026",
  footnote:
    "Kumamoto, Japan, 21 Jul → 14 Aug 2026, a pair that brackets the 28 July earthquake. Figure crops from nova-frontier-model's interferometry report.",
} as const);
