import type { Ref } from "react";

import type { BBox } from "@/features/frames/frame.types";

const CURSOR_OFFSET_PX = 16;

export type TooltipContent = { title: string; sub: string };

// The stamp under the footprint: the timeline step in focus (COPY-flow-v9 §5).
export type GlobeStamp = { date: string; pass: string; target: boolean; box: BBox };

type GlobeTooltipProps = { content: TooltipContent; x: number; y: number };

export const GlobeTooltip = ({ content, x, y }: GlobeTooltipProps) => (
  <div
    data-testid="globe-tooltip"
    className="x-tooltip"
    style={{ transform: `translate(${x + CURSOR_OFFSET_PX}px, ${y + CURSOR_OFFSET_PX}px)` }}
  >
    <p>{content.title}</p>
    <p className="x-tooltip__sub">{content.sub}</p>
  </div>
);

type StampLabelProps = { stamp: GlobeStamp; ref?: Ref<HTMLParagraphElement> };

// The real globe moves it with the camera through `ref`; the stub leaves it where it is.
export const StampLabel = ({ stamp, ref }: StampLabelProps) => (
  <p className="x-stamp" ref={ref} data-testid="timelapse-stamp">
    <span className="x-stamp__date">{stamp.date}</span>
    <span className="x-stamp__pass" data-target={stamp.target}>
      {stamp.pass}
    </span>
  </p>
);
