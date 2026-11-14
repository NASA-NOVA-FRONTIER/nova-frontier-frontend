import "@/features/charts/charts.css";
import "@/pages/method/sections/sections.css";

import { useRef, useState, type KeyboardEvent } from "react";

import {
  ECHO_COPY,
  HH_COLOUR,
  HV_COLOUR,
  SURFACE_IDS,
  SURFACES,
  type SurfaceId,
} from "@/pages/method/sections/sectionsContent";
import { barWidth, formatDb, nextSurface } from "@/pages/method/sections/sectionsLogic";
import { ProvenanceChip } from "@/lib/ProvenanceChip";

type EchoSimulatorProps = {
  initialSurface?: SurfaceId;
};

export const EchoSimulator = ({ initialSurface = "water" }: EchoSimulatorProps) => {
  const [surfaceId, setSurfaceId] = useState<SurfaceId>(initialSurface);
  const optionRefs = useRef<Partial<Record<SurfaceId, HTMLButtonElement | null>>>({});
  const surface = SURFACES[surfaceId];

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextSurface(surfaceId, event.key);
    if (next === null) return;
    event.preventDefault();
    setSurfaceId(next);
    optionRefs.current[next]?.focus();
  };

  const bars = [
    { key: "HH", colour: HH_COLOUR, db: surface.hh },
    { key: "HV", colour: HV_COLOUR, db: surface.hv },
  ];

  return (
    <section
      className="m-section"
      data-section
      aria-labelledby="echo-heading"
      data-testid="method-echo"
    >
      <div className="m-section__head" data-reveal>
        <p className="m-kicker">{ECHO_COPY.kicker}</p>
        <h2 id="echo-heading" className="m-h2">
          {ECHO_COPY.title}
        </h2>
        <p className="m-lead">{ECHO_COPY.lead}</p>
      </div>
      <div className="m-echo" data-reveal>
        <div className="m-echo__stage">
          <div role="radiogroup" aria-label={ECHO_COPY.groupLabel} className="m-echo__options">
            {SURFACE_IDS.map((id) => {
              const on = id === surfaceId;
              return (
                <button
                  key={id}
                  ref={(element) => {
                    optionRefs.current[id] = element;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  className="m-echo__option"
                  onClick={() => setSurfaceId(id)}
                  onKeyDown={onKeyDown}
                  data-testid={`echo-surface-${id}`}
                >
                  {SURFACES[id].label}
                </button>
              );
            })}
          </div>
          <svg
            viewBox="0 0 600 260"
            className="m-echo__diagram"
            role="img"
            aria-label={ECHO_COPY.diagramAria(surface.label)}
            data-testid="echo-diagram"
          >
            <rect x="0" y="214" width="600" height="46" fill={surface.ground} />
            {surface.shapes.map(([d, fill, stroke]) => (
              <path key={d} d={d} fill={fill} stroke={stroke} strokeWidth={1.5} />
            ))}
            <g transform="translate(40 18)">
              <rect x="0" y="6" width="26" height="16" rx="2" fill="#c9b48b" />
              <rect x="-16" y="10" width="14" height="8" fill="#6c7686" />
              <rect x="28" y="10" width="14" height="8" fill="#6c7686" />
            </g>
            <path
              d="M66 40 L300 214"
              className="m-echo__pulse"
              fill="none"
              stroke="#c9b48b"
              strokeWidth={2.5}
              strokeDasharray="8 8"
            />
            {surface.rays.map(([d, colour, width, opacity]) => (
              <path
                key={`${surfaceId}-${d}`}
                d={d}
                className="m-echo__ray"
                fill="none"
                stroke={colour}
                strokeWidth={width}
                strokeLinecap="round"
                strokeDasharray="6 10"
                opacity={opacity}
              />
            ))}
            <text x="18" y="250" className="m-echo__caption">
              {ECHO_COPY.diagramKicker(surface.label)}
            </text>
          </svg>
        </div>
        <div className="m-echo__read" aria-live="polite">
          <p className="m-echo__mech" data-testid="echo-mech">
            {surface.mech}
          </p>
          <h3 className="m-echo__title" data-testid="echo-title">
            {surface.title}
          </h3>
          <p className="m-echo__body">{surface.body}</p>
          <div className="m-echo__bars">
            {bars.map((bar) => (
              <div
                key={bar.key}
                className="m-echo__bar"
                data-testid={`echo-bar-${bar.key.toLowerCase()}`}
              >
                <span className="m-echo__bar-key" style={{ color: bar.colour }}>
                  {bar.key}
                </span>
                <div className="m-echo__track">
                  <div
                    className="m-echo__fill"
                    style={{ width: barWidth(bar.db), background: bar.colour }}
                    data-testid={`echo-fill-${bar.key.toLowerCase()}`}
                  />
                </div>
                <span className="m-echo__value" data-testid={`echo-value-${bar.key.toLowerCase()}`}>
                  {formatDb(bar.db)}
                </span>
              </div>
            ))}
            <p className="m-echo__scale">
              <span>{ECHO_COPY.scaleMin}</span>
              <span>{ECHO_COPY.scaleMax}</span>
            </p>
          </div>
          <span className="m-echo__chip" data-testid="echo-chip">
            <ProvenanceChip kind="illustrative" source={ECHO_COPY.chipTitle} />
          </span>
        </div>
      </div>
    </section>
  );
};
