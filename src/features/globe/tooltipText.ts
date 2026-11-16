import { coherenceOnlyLabel, findLens, type Case } from "@/features/cases/cases";
import type { Frame, LonLat } from "@/features/frames/frame.types";
import type { TooltipContent } from "@/features/globe/GlobeTooltip";
import { formatLonLat } from "@/features/live/liveQuestion";

// Hover text over a NISAR frame. Shared with the E2E stub globe, so both say the same thing.
export const frameTooltip = (frame: Frame, point: LonLat): TooltipContent => ({
  title: `Track ${frame.track} · Frame ${frame.frame} · ${frame.hasCrossPol ? "HH+HV" : "HH only"}`,
  sub: `${formatLonLat(point)} · NISAR frame ~240 km · click to ask the radar`,
});

// Hover text over a measured case's marker.
export const caseTooltip = (item: Case): TooltipContent => ({
  title: item.name,
  sub:
    item.coherenceOnly === true
      ? coherenceOnlyLabel(item)
      : `Measured case · ${findLens(item.lens)?.chip ?? ""}`,
});
