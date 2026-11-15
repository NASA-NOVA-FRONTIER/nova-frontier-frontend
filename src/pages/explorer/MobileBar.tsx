import type { ReactNode } from "react";

import { MOBILE } from "@/content/copyV8";
import type { DockPick } from "@/features/explore/exploreDock";
import type { LayerPill } from "@/pages/explorer/mobileSheet";

type MobileBarProps = {
  // The Ascending / Descending switch, when the backend accepts the choice.
  direction: ReactNode | undefined;
  // Empty outside steps 4–6.
  pills: LayerPill[];
  onPick: (pick: DockPick) => void;
};

// Phones: the row under the search (SPECS-v8 §1 Mobile). Nothing renders when it would be empty.
export const MobileBar = ({ direction, pills, onPick }: MobileBarProps) => {
  if (direction === undefined && pills.length === 0) return null;
  return (
    <div className="x-mobilebar" data-testid="mobile-bar">
      {direction}
      {pills.length > 0 && (
        <div
          role="group"
          aria-label={MOBILE.pillsLabel}
          className="x-source x-pills"
          data-testid="layer-pills"
        >
          {pills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              aria-pressed={pill.on}
              aria-label={pill.label}
              disabled={!pill.enabled}
              title={pill.why ?? pill.label}
              onClick={() => {
                if (pill.action?.kind === "pass" || pill.action?.kind === "layer")
                  onPick(pill.action);
              }}
              data-testid={`layer-pill-${pill.key}`}
            >
              {pill.short}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
