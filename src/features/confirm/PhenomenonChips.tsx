import { useRef, type KeyboardEvent } from "react";

import {
  CONFIRM,
  INFO_TIP,
  LOOK,
  PHENOMENA,
  PHENOMENON_LABEL,
  TIPS,
  type V9LensId,
} from "@/content/copyV9";
import { InfoTip } from "@/lib/InfoTip";

type PhenomenonChipsProps = {
  lens: V9LensId;
  onLens: (lens: V9LensId) => void;
};

const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

// SPECS-flow-v9 §1.3: the four phenomenon chips, a radiogroup with arrow keys and a roving tabindex.
export const PhenomenonChips = ({ lens, onLens }: PhenomenonChipsProps) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = STEP[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + PHENOMENA.length) % PHENOMENA.length;
    const id = PHENOMENA[next];
    if (id === undefined) return;
    onLens(id);
    refs.current[next]?.focus();
  };

  return (
    <div className="x-confirm__block">
      <p className="x-kicker" id="x-confirm-phen">
        {CONFIRM.phenLabel}
        <InfoTip
          label={INFO_TIP.label}
          title={CONFIRM.phenLabel}
          text={TIPS.phen}
          testId="tip-phen"
        />
      </p>
      <div
        className="x-confirm__chips"
        role="radiogroup"
        aria-labelledby="x-confirm-phen"
        data-testid="confirm-phenomena"
      >
        {PHENOMENA.map((id, index) => (
          <button
            key={id}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={id === lens}
            tabIndex={id === lens ? 0 : -1}
            className="x-confirm__chip"
            onClick={() => onLens(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            data-testid={`phenomenon-${id}`}
          >
            {PHENOMENON_LABEL[id]}
          </button>
        ))}
      </div>
      <p className="x-confirm__look" data-testid="confirm-look">
        {LOOK[lens]}
      </p>
    </div>
  );
};
