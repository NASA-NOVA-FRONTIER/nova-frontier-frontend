// Where the v9 ⓘ popover sits (SPECS-flow-v9 §4): below its button, above when there is no room
// below, clamped inside the viewport. Pure, so the flip and clamp rules are unit-tested without a DOM.

export const INFO_TIP_MAX_WIDTH = 280;
// Space between the button and the popover, and between the popover and the viewport edge.
export const INFO_TIP_GAP = 8;
export const INFO_TIP_MARGIN = 8;

export type Rect = { left: number; top: number; width: number; height: number };
export type Size = { width: number; height: number };

export type InfoTipPlacement = {
  left: number;
  top: number;
  width: number;
  side: "below" | "above";
};

type PlaceInput = {
  /** The ⓘ button, in viewport coordinates (getBoundingClientRect). */
  anchor: Rect;
  /** The popover's measured height; its width comes from the viewport. */
  tipHeight: number;
  viewport: Size;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

// The prototype assumed a fixed 180 px popover; we use the measured height, so a two-line tip
// near the bottom stays below and a long one flips.
export const placeInfoTip = ({ anchor, tipHeight, viewport }: PlaceInput): InfoTipPlacement => {
  const width = Math.max(0, Math.min(INFO_TIP_MAX_WIDTH, viewport.width - 2 * INFO_TIP_MARGIN));
  const anchorBottom = anchor.top + anchor.height;
  const roomBelow = viewport.height - INFO_TIP_MARGIN - (anchorBottom + INFO_TIP_GAP);
  const roomAbove = anchor.top - INFO_TIP_GAP - INFO_TIP_MARGIN;
  // Below wins when it fits, or when neither side fits but below has more room.
  const side = tipHeight <= roomBelow || roomBelow >= roomAbove ? "below" : "above";
  const top =
    side === "below" ? anchorBottom + INFO_TIP_GAP : anchor.top - INFO_TIP_GAP - tipHeight;
  const centre = anchor.left + anchor.width / 2;
  const left = clamp(
    centre - width / 2,
    INFO_TIP_MARGIN,
    Math.max(INFO_TIP_MARGIN, viewport.width - INFO_TIP_MARGIN - width),
  );
  return { left, top, width, side };
};
