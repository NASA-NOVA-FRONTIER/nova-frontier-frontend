import "@/features/result/result.css";

import { useRef, type KeyboardEvent } from "react";

import { STEP_4 } from "@/content/copyV8";
import { INFO_TIP, LEGEND, RESULT, TIPS, type V9LayerId } from "@/content/copyV9";
import type { DockPick } from "@/features/explore/exploreDock";
import { RAMP, type LayerOption } from "@/features/result/resultLayers";
import { InfoTip } from "@/lib/InfoTip";

type Props = {
  options: LayerOption[];
  selected: V9LayerId | undefined;
  opacity: number;
  onPick: (pick: DockPick) => void;
  onOpacity: (opacity: number) => void;
};

// The v9 legend card (SPECS-flow-v9 §3): the lens's layer switch, then the ramp on its fixed v8 scale,
// its two ends and one line of what it shows. A layer the answer lacks is a disabled radio.
export const LegendCard = ({ options, selected, opacity, onPick, onOpacity }: Props) => {
  const groupRef = useRef<HTMLDivElement>(null);
  const enabled = options.filter((option) => option.pick !== undefined);
  // Roving tabindex: arrows move between the layers the answer has, as a radiogroup does.
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined || enabled.length === 0) return;
    event.preventDefault();
    const at = enabled.findIndex((option) => option.id === selected);
    const next = enabled[(at + step + enabled.length) % enabled.length];
    if (next === undefined) return;
    onPick(next.pick);
    groupRef.current?.querySelector<HTMLButtonElement>(`[data-layer="${next.id}"]`)?.focus();
  };
  const legend = selected === undefined ? undefined : LEGEND[selected];
  return (
    <section
      className="x-dock x-legend x-glass"
      aria-label={RESULT.layerLabel}
      data-testid="legend-card"
      data-layer={selected ?? ""}
    >
      <p className="x-kicker">{RESULT.layerLabel}</p>
      <div
        ref={groupRef}
        role="radiogroup"
        tabIndex={-1}
        aria-label={RESULT.layerLabel}
        className="x-legend__switch"
        onKeyDown={onKey}
        data-testid="layer-switch"
      >
        {options.map((option) => {
          const on = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on || (selected === undefined && option === enabled[0]) ? 0 : -1}
              disabled={option.pick === undefined}
              onClick={() => onPick(option.pick)}
              data-layer={option.id}
              data-testid={`layer-radio-${option.id}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {selected !== undefined && legend !== undefined && (
        <div className="x-dock__legend" data-testid="legend-ramp">
          <span className="x-dock__ramp" style={{ background: RAMP[selected] }} />
          <p className="x-dock__scale" data-testid="legend-ends">
            <span>{legend.left}</span>
            <span>{legend.right}</span>
          </p>
          <p className="x-dock__text" data-testid="legend-what">
            {legend.what}
          </p>
          {/* The phase tip carries the 12 cm line with "not a displacement" (C13); nowhere else does. */}
          <InfoTip
            label={INFO_TIP.label}
            title={options.find((option) => option.id === selected)?.label ?? RESULT.layerLabel}
            text={TIPS.layer[selected]}
            testId="legend-tip"
          />
        </div>
      )}
      <p className="x-dock__grey">
        <i />
        {STEP_4.dockGrey}
      </p>
      <label className="x-dock__opacity">
        {STEP_4.dockOpacity}
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={(event) => onOpacity(Number(event.target.value))}
          data-testid="layer-opacity"
        />
        <span>{opacity}%</span>
      </label>
    </section>
  );
};
