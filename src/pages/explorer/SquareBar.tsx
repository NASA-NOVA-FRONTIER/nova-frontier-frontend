import { SQUARE } from "@/content/copyV9";

type SquareBarProps = {
  onCancel: () => void;
  onUse: () => void;
};

// SPECS-flow-v9 §1.2: the square is placed and nothing runs until the user goes on.
// The ⓘ next to the title (TIPS.square) waits for the InfoTip component (T2).
export const SquareBar = ({ onCancel, onUse }: SquareBarProps) => (
  <section className="x-square-bar" aria-label={SQUARE.placedTitle} data-testid="square-bar">
    <div className="x-square-bar__text">
      <p className="x-square-bar__title">{SQUARE.placedTitle}</p>
      <p className="x-square-bar__meta">{SQUARE.placedMeta}</p>
    </div>
    <button
      type="button"
      className="x-square-bar__quiet"
      onClick={onCancel}
      data-testid="square-cancel"
    >
      {SQUARE.cancel}
    </button>
    <button type="button" className="x-square-bar__use" onClick={onUse} data-testid="square-use">
      {SQUARE.useSquare}
    </button>
  </section>
);
