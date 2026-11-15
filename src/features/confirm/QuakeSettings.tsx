import { useState } from "react";

import { EARTHQUAKE_SETTINGS, MEASURED_CASE } from "@/content/copyV9";
import type { PairGroup } from "@/features/confirm/confirmView";
import {
  clampCoherence,
  COHERENCE_STEP,
  DEFAULT_COHERENCE,
  MAX_COHERENCE,
  MIN_COHERENCE,
} from "@/features/insar/insarApi";
import { formatDay } from "@/features/timeline/timelineLayout";

type QuakeSettingsProps = {
  groups: readonly PairGroup[];
  chosenId: string | undefined;
  threshold: number;
  onChoose: (pairId: string) => void;
  onThreshold: (value: number) => void;
};

const formatThreshold = (value: number): string => value.toFixed(2);

const day = (iso: string): string => formatDay(iso, false);

// "Advanced": the coherence threshold (0.1–0.9, the backend's bounds) and every pair, by series,
// so a track other than the newest pair's stays reachable.
export const QuakeSettings = ({
  groups,
  chosenId,
  threshold,
  onChoose,
  onThreshold,
}: QuakeSettingsProps) => {
  const [open, setOpen] = useState(false);
  const shown = formatThreshold(threshold);
  return (
    <div className="x-confirm__advanced">
      <button
        type="button"
        className="x-text"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        data-testid="confirm-advanced"
      >
        {open ? EARTHQUAKE_SETTINGS.hideAdvanced : EARTHQUAKE_SETTINGS.advanced(shown)}
      </button>
      {open && (
        <div className="x-confirm__settings" data-testid="confirm-settings">
          <label className="x-confirm__threshold">
            <span className="x-confirm__setting-name">
              {EARTHQUAKE_SETTINGS.thresholdName}{" "}
              <output data-testid="confirm-threshold-value">
                {threshold === DEFAULT_COHERENCE
                  ? EARTHQUAKE_SETTINGS.thresholdDefault(shown)
                  : shown}
              </output>
              {/* TODO(#59): InfoTip with PARAM_TIPS.thr once PR #59 merges. */}
            </span>
            <input
              type="range"
              min={MIN_COHERENCE}
              max={MAX_COHERENCE}
              step={COHERENCE_STEP}
              value={threshold}
              onChange={(event) => onThreshold(clampCoherence(Number(event.target.value)))}
              data-testid="confirm-threshold"
            />
            <small>{EARTHQUAKE_SETTINGS.thresholdHelp}</small>
          </label>
          <fieldset className="x-confirm__pairs">
            <legend className="x-confirm__setting-name">
              {EARTHQUAKE_SETTINGS.pairName}
              {/* TODO(#59): InfoTip with PARAM_TIPS.pair once PR #59 merges. */}
            </legend>
            <small>{EARTHQUAKE_SETTINGS.pairHelp}</small>
            {groups.map((group) => (
              <div key={group.seriesKey} className="x-confirm__group" data-testid="pair-group">
                <p className="x-kicker">
                  {MEASURED_CASE.passLine(group.dates.length, group.track, group.direction)}
                </p>
                {group.pairs.map((pair) => (
                  <label key={pair.pairId} className="x-confirm__pair">
                    <input
                      type="radio"
                      name="confirm-pair"
                      checked={pair.pairId === chosenId}
                      onChange={() => onChoose(pair.pairId)}
                      data-testid={`confirm-pair-${pair.pairId}`}
                    />
                    {EARTHQUAKE_SETTINGS.pairOption(
                      day(pair.referenceDate),
                      day(pair.secondaryDate),
                      pair.temporalBaselineDays,
                    )}
                  </label>
                ))}
              </div>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );
};
