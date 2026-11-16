import { LANDSLIDE } from "@/content/copyV8";
import { Prov } from "@/features/case-panel/Prov";
import type { PassChannel } from "@/features/cases/cases";
import { formatDay } from "@/features/timeline/timelineLayout";
import { SOURCE } from "@/features/case-panel/verdicts";
import { legendFor, type DrapeKind } from "@/pages/explorer/drapeLegend";

import { tr } from "@/i18n/translate";
const API_SOON = "Served by the backend API soon";

// A case with an image per pass: the timeline's pass in focus, in either channel (v9 sequence).
export type DockPass = {
  on: boolean;
  channel: PassChannel;
  date: string | undefined;
  onPass: () => void;
  onChannel: (channel: PassChannel) => void;
};

const PASS_RAMP = "linear-gradient(90deg,#000,#fff)";

type LayerDockProps = {
  kind: DrapeKind;
  // The open case, when its layers read differently from the flood reports.
  caseId?: string;
  opacity: number;
  onKind: (kind: DrapeKind) => void;
  onOpacity: (opacity: number) => void;
  pass?: DockPass;
};

// Only the report's real crops go on the globe; HV and HH−HV wait for the API instead of a fake.
export const LayerDock = ({ kind, caseId, opacity, onKind, onOpacity, pass }: LayerDockProps) => {
  const report = legendFor(kind, caseId);
  const onPass = pass?.on === true;
  // A pass image reads on the fixed −30 to 0 dB gray, the same one the More information panel uses.
  const legend = onPass
    ? {
        ...report,
        ramp: PASS_RAMP,
        scale: [LANDSLIDE.grayScale[0], "", LANDSLIDE.grayScale[1]] as const,
        text:
          pass.date === undefined
            ? report.text
            : LANDSLIDE.passText(formatDay(pass.date), pass.channel),
      }
    : report;
  return (
    <section
      className="x-dock x-glass"
      aria-label={tr("Radar on the globe")}
      data-testid="layer-dock"
    >
      <p className="x-kicker">{tr("Radar on the globe")}</p>
      <div role="group" aria-label={tr("Layer")} className="x-switch x-switch--full">
        {pass !== undefined && (
          <button
            type="button"
            aria-pressed={onPass}
            onClick={pass.onPass}
            data-testid="layer-pass"
          >
            {LANDSLIDE.viewPass}
          </button>
        )}
        {(["change", "baseline"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={!onPass && kind === value}
            onClick={() => onKind(value)}
            data-testid={`layer-${value}`}
          >
            {value === "change" ? "Change" : "Baseline"}
          </button>
        ))}
      </div>
      <div role="group" aria-label={tr("Channel")} className="x-chans">
        {onPass ? (
          (["HH", "HV"] as const).map((channel) => (
            <button
              key={channel}
              type="button"
              aria-pressed={pass.channel === channel}
              onClick={() => pass.onChannel(channel)}
              data-testid={`channel-${channel}`}
            >
              {channel}
            </button>
          ))
        ) : (
          <>
            <button type="button" aria-pressed="true" data-testid="channel-HH">
              HH
            </button>
            <button type="button" disabled title={API_SOON} data-testid="channel-HV">
              HV
            </button>
          </>
        )}
        {!onPass && kind === "baseline" && (
          <button type="button" disabled title={API_SOON} data-testid="channel-ratio">
            HH−HV
          </button>
        )}
      </div>
      {!onPass && (
        <p className="x-dock__hint">{tr("HV and HH−HV: served by the backend API soon.")}</p>
      )}
      <div className="x-dock__legend">
        <span className="x-dock__ramp" style={{ background: legend.ramp }} />
        <span className="x-dock__scale">
          {legend.scale.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </span>
        <p className="x-dock__grey">
          <i aria-hidden="true" />
          {tr("Grey: no measurement. White: no change.")}
        </p>
      </div>
      <label className="x-dock__opacity">
        {tr("Opacity")}
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
      <p className="x-dock__text">{legend.text}</p>
      <p className="x-dock__prov">
        <Prov kind="real" source={legend.origin?.source ?? SOURCE.crop} />
        {legend.origin?.label ?? "Backend report figure"}
      </p>
    </section>
  );
};
