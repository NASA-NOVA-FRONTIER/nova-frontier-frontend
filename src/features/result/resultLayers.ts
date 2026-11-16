import { LAYERS, PHENOMENA, type V9LayerId, type V9LensId } from "@/content/copyV9";
import type { CaseLensId, TimelinePass } from "@/features/cases/cases";
import { measuredPasses, type DockPick, type DockView } from "@/features/explore/exploreDock";
import { passLayer, type LiveLayer, type Pol } from "@/features/explore/exploreLayers";

/*
 * The v9 layer switch (SPECS-flow-v9 §3): which backend layer each lens's layer reads, as a DockPick
 * so the globe drape, the stamp and the timeline keep working on T7's pick. Pure.
 */

export const isV9Lens = (lens: CaseLensId): lens is V9LensId =>
  (PHENOMENA as readonly CaseLensId[]).includes(lens);

// Matched by id, never by `kind`: older answers carry kinds the backend has since corrected
// (display_change_HH as "observed"). Ids from BE constants/explorations.py LAYER_KINDS and MD explore.py.
const LAYER_ID: Record<Exclude<V9LayerId, "hh" | "hv">, (id: string) => boolean> = {
  // Target minus the median of the earlier passes; display_change_* is later minus earlier.
  change: (id) => id === "display_baseline_change_HH",
  sig: (id) => id === "display_flood_signature_flags_dual_darkening",
  hvdrop: (id) => id === "display_baseline_change_HV",
  // Exact: display_coherence_contrast_1/2 exist too.
  coh: (id) => id === "display_coherence_coherence",
  phase: (id) => id.startsWith("display_wrapped_phase"),
};

const PASS_POL: Partial<Record<V9LayerId, Pol>> = { hh: "HH", hv: "HV" };

const PASS_IMAGE = /^display_\d{4}-\d{2}-\d{2}_(HH|HV)$/;

export type LayerOption = {
  id: V9LayerId;
  label: string;
  // What the globe drapes; undefined when the answer has no such layer.
  pick: DockPick;
};

export const layerOptions = (lens: V9LensId, layers: LiveLayer[]): LayerOption[] =>
  LAYERS[lens].map(({ id, label }) => {
    const pol = PASS_POL[id];
    if (pol !== undefined) {
      const any = layers.some((layer) => PASS_IMAGE.exec(layer.id)?.[1] === pol);
      return { id, label, pick: any ? { kind: "pass", pol } : undefined };
    }
    const match = LAYER_ID[id as keyof typeof LAYER_ID];
    const layer = layers.find((item) => match(item.id));
    return { id, label, pick: layer === undefined ? undefined : { kind: "layer", id: layer.id } };
  });

const samePick = (a: DockPick, b: DockPick): boolean =>
  a !== undefined &&
  b !== undefined &&
  (a.kind === "pass" ? b.kind === "pass" && a.pol === b.pol : b.kind === "layer" && a.id === b.id);

export const selectedOption = (options: LayerOption[], pick: DockPick): LayerOption | undefined =>
  options.find((option) => samePick(option.pick, pick));

// The lens's first layer (SPECS §3: reset to it on a lens change), else the first one the answer has.
// A pass channel opens on the target, else the newest pass with that image.
export const defaultResultView = (
  lens: V9LensId,
  layers: LiveLayer[],
  passes: TimelinePass[],
): DockView => {
  const measured = measuredPasses(passes);
  const target = measured.find((item) => item.kind === "target");
  const fallbackDate = target?.date ?? measured.at(-1)?.date;
  const pick = layerOptions(lens, layers).find((option) => option.pick !== undefined)?.pick;
  if (pick?.kind !== "pass") return { pick, date: fallbackDate };
  const withImage = [...(target === undefined ? [] : [target]), ...measured.toReversed()].find(
    (item) => passLayer(layers, item.date, pick.pol) !== undefined,
  );
  return { pick, date: withImage?.date ?? fallbackDate };
};

// Fixed v8 scales (SPECS §7): one ramp per layer, whatever colormap name the backend sends.
const GRAY = "linear-gradient(90deg,#000,#fff)";
const DIVERGING = "linear-gradient(90deg,#2166ac,#92c5de,#f7f7f7,#f4a582,#b2182b)";

export const RAMP: Record<V9LayerId, string> = {
  hh: GRAY,
  hv: GRAY,
  change: DIVERGING,
  hvdrop: DIVERGING,
  // Two classes: gray where the rule isn't met, blue where it is.
  sig: "linear-gradient(90deg,#62666d 0 50%,#2f6db5 50% 100%)",
  coh: "linear-gradient(90deg,#00224e,#35456c,#666970,#948e77,#c8b866,#fee838)",
  phase:
    "linear-gradient(90deg,#e2d9e2,#8bb0c9,#5f6bb5,#4a2d86,#2f1437,#82305f,#c4684d,#d9b09a,#e2d9e2)",
};
