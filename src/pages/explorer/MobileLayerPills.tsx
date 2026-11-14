import { STEP_4 } from "@/content/copyV8";
import type { DockPick, DockRow } from "@/features/explore/exploreDock";

type MobileLayerPillsProps = {
  // The dock's own rows (exploreDock.dockRows), so a pill never offers a layer the answer lacks.
  rows: DockRow[];
  // Rule joins only on the lens result (step 6).
  withRule: boolean;
  onPick: (pick: DockPick) => void;
};

const SHORT: Partial<Record<DockRow["key"], string>> = {
  hh: STEP_4.pillHH,
  hv: STEP_4.pillHV,
  change: STEP_4.pillChange,
  rule: STEP_4.pillRule,
};

/*
 * Phones, steps 4–6 (SPECS-v8 Mobile): the layer dock as pills under the search. Desktop keeps the
 * dock; CSS shows these only below 760 px. A pill without an image is disabled with its reason.
 */
export const MobileLayerPills = ({ rows, withRule, onPick }: MobileLayerPillsProps) => {
  const pills = rows.filter(
    (row) => SHORT[row.key] !== undefined && (row.key !== "rule" || withRule),
  );
  if (pills.length === 0) return null;
  return (
    <div
      role="group"
      aria-label={STEP_4.pillsAria}
      className="x-source x-layerpills"
      data-testid="layer-pills"
    >
      {pills.map((row) => {
        const { action } = row;
        return (
          <button
            key={row.key}
            type="button"
            aria-pressed={row.on}
            aria-label={row.label}
            disabled={!row.enabled}
            title={row.why ?? row.label}
            onClick={() =>
              action !== undefined && action.kind !== "pair" && onPick(row.on ? undefined : action)
            }
            data-testid={`layer-pill-${row.key}`}
          >
            {SHORT[row.key]}
          </button>
        );
      })}
    </div>
  );
};
