import {
  ABOUT_SATELLITE,
  ANTENNA,
  GET_TO_KNOW_SAR,
  LAUNCH,
  MISSION_OVERVIEW,
} from "@/content/facts";
import {
  clamp,
  type StagePose,
  TEARDOWN_PARTS,
  type TeardownPart,
} from "@/features/satellite/satelliteMotion";
import { SATELLITE_PARTS, type SatellitePartId } from "@/features/satellite/satelliteParts";
import { SAT_STAGE } from "@/pages/method/methodContent";

import { localized } from "@/i18n/localized";
type Source = { label: string; href: string };
type StepText = { title: string; body: string };

type Shape = {
  deploy: number;
  beam: number;
  zoom: number;
  explode: number;
  /** Pieces in focus (the rest fade); null keeps the whole model lit. */
  focus: readonly TeardownPart[] | null;
};

export type SatStep = {
  kicker: string;
  /** One block of text, or one per part when a step shows two (L + S, bus + solar). */
  items: readonly StepText[];
  sources: readonly Source[];
  shape: Shape;
};

const part = (id: SatellitePartId): StepText => {
  const found = SATELLITE_PARTS.find((p) => p.id === id);
  return { title: found?.title ?? id, body: found?.body ?? "" };
};
const [STOWED, DEPLOYED, SIDEWAYS] = SAT_STAGE.steps;
const stage = (step: (typeof SAT_STAGE.steps)[number] | undefined): StepText => ({
  title: step?.title ?? "",
  body: step?.body ?? "",
});

const ASSEMBLED: Shape = { deploy: 1, beam: 0, zoom: 1, explode: 0, focus: null };
const apart = (focus: readonly TeardownPart[]): Shape => ({ ...ASSEMBLED, explode: 1, focus });

// The teardown: launch, deployment, then each piece pulled out and named with what it does for
// the measurement, then the whole spacecraft looking sideways. Copy is the SAT_STAGE text and the
// hotspot copy (SPECS-content-pages-v8 §1, §3) verbatim; the part kickers come from the approved
// v5 teardown. Every step links the NASA pages its facts were checked against.
export const SAT_STEPS: readonly SatStep[] = localized([
  {
    kicker: STOWED?.kicker ?? "",
    items: [stage(STOWED)],
    sources: [ABOUT_SATELLITE, LAUNCH],
    shape: { deploy: 0, beam: 0, zoom: 0.62, explode: 0, focus: null },
  },
  {
    kicker: DEPLOYED?.kicker ?? "",
    items: [stage(DEPLOYED)],
    sources: [ANTENNA],
    shape: ASSEMBLED,
  },
  {
    kicker: "REFLECTOR",
    items: [part("reflector")],
    sources: [ABOUT_SATELLITE, ANTENNA],
    shape: apart(["reflector"]),
  },
  {
    kicker: "BOOM",
    items: [part("boom")],
    sources: [ABOUT_SATELLITE, ANTENNA],
    shape: apart(["boom"]),
  },
  {
    kicker: "RADARS",
    items: [part("lband"), part("sband")],
    sources: [ABOUT_SATELLITE, GET_TO_KNOW_SAR],
    shape: apart(["radars"]),
  },
  {
    kicker: "BUS + SOLAR ARRAY",
    items: [part("bus"), part("solar")],
    sources: [ABOUT_SATELLITE],
    shape: apart(["bus", "solar"]),
  },
  {
    kicker: SIDEWAYS?.kicker ?? "",
    items: [stage(SIDEWAYS)],
    sources: [ABOUT_SATELLITE, MISSION_OVERVIEW],
    shape: { ...ASSEMBLED, beam: 1, zoom: 1 },
  },
]);

const LAST = SAT_STEPS.length - 1;

/** The step whose text shows at a track progress (0–1): the nearest one. */
export const satStepIndex = (progress: number): number => Math.round(clamp(progress) * LAST);

/** Track progress (0–1) that puts a step at rest. */
export const satStepProgress = (index: number): number => clamp(index / LAST);

// Each step holds still around its rest point; the move to the next eases through the middle
// half, so the text (nearest step) switches when the model is halfway there.
export const stepBlend = (raw: number): number => {
  if (raw < 0.25) return 0;
  if (raw > 0.75) return 1;
  const x = (raw - 0.25) / 0.5;
  return x * x * (3 - 2 * x);
};

const FADED = 0.15;
const weights = (focus: Shape["focus"]): Record<TeardownPart, number> => {
  const out = { reflector: 1, boom: 1, radars: 1, bus: 1, solar: 1 };
  if (focus !== null) for (const p of TEARDOWN_PARTS) out[p] = focus.includes(p) ? 1 : FADED;
  return out;
};
const mix = (a: number, b: number, t: number): number => a + (b - a) * t;

/** The model's pose at a track progress; reduced motion cuts from one step to the next. */
export const satStagePose = (progress: number, reduced: boolean): StagePose => {
  const p = clamp(progress) * LAST;
  const i = Math.min(Math.floor(p), LAST - 1);
  const raw = p - i;
  const t = reduced ? (raw >= 0.5 ? 1 : 0) : stepBlend(raw);
  const a = SAT_STEPS[i]?.shape ?? ASSEMBLED;
  const b = SAT_STEPS[i + 1]?.shape ?? a;
  const wa = weights(a.focus);
  const wb = weights(b.focus);
  const parts = { ...wa };
  for (const k of TEARDOWN_PARTS) parts[k] = mix(wa[k], wb[k], t);
  return {
    deploy: mix(a.deploy, b.deploy, t),
    beam: mix(a.beam, b.beam, t),
    zoom: mix(a.zoom, b.zoom, t),
    explode: mix(a.explode, b.explode, t),
    parts,
    look: { from: a.focus?.[0] ?? null, to: b.focus?.[0] ?? null, t },
  };
};
