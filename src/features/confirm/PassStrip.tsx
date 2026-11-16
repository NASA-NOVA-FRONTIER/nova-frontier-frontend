import { useRef, type KeyboardEvent } from "react";

import { PASS_STRIP, TIMELINE } from "@/content/copyV9";
import { arcPath, stripX, type ArcStrip } from "@/features/confirm/confirmView";
import { formatDay } from "@/features/timeline/timelineLayout";

// The strip is drawn in its own units and scales with the panel; dots keep their real-date spacing.
const WIDTH = 340;
const PAD = 14;
const DOT = 5;

const day = (iso: string): string => formatDay(iso, false);

const Ends = ({ dates }: { dates: readonly string[] }) => {
  const first = dates[0];
  const last = dates.at(-1);
  if (first === undefined || last === undefined) return null;
  return (
    <p className="x-confirm__ends" data-testid="strip-ends">
      <span>{formatDay(first)}</span>
      {first !== last && <span>{formatDay(last)}</span>}
    </p>
  );
};

type GcovStripProps = { dates: readonly string[] };

// Image lenses: one dot per pass /coverage chose; every one is read, so all are gold and joined.
export const GcovStrip = ({ dates }: GcovStripProps) => {
  const height = 40;
  const y = 22;
  const xs = dates.map((date) => stripX(date, dates, WIDTH, PAD));
  const first = xs[0] ?? 0;
  const last = xs.at(-1) ?? 0;
  return (
    <div className="x-confirm__strip" data-testid="pass-strip" data-kind="gcov">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="x-confirm__svg" role="list">
        <rect
          className="x-confirm__band"
          x={first - 8}
          y={y - 10}
          width={last - first + 16}
          height={20}
          rx={10}
        />
        <polyline className="x-confirm__read-line" points={xs.map((x) => `${x},${y}`).join(" ")} />
        {dates.map((date, index) => (
          <circle
            key={date}
            role="listitem"
            aria-label={TIMELINE.passAria(index + 1, day(date))}
            className="x-confirm__dot x-confirm__dot--read"
            cx={xs[index]}
            cy={y}
            r={DOT}
            data-testid="strip-pass"
            data-date={date}
          />
        ))}
      </svg>
      <Ends dates={dates} />
      <p className="x-confirm__legend" aria-hidden="true">
        <span className="x-confirm__key x-confirm__key--read">{PASS_STRIP.legendWillBeRead}</span>
        <span className="x-confirm__key x-confirm__key--band">{PASS_STRIP.legendYourRange}</span>
      </p>
    </div>
  );
};

type ArcStripProps = {
  strip: ArcStrip;
  chosenId: string | undefined;
  label: string;
  onChoose: (pairId: string) => void;
};

const ARC_STEP: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

// Earthquake: every real pair is an arc between its two passes; tap or arrow to another to choose it.
export const QuakeStrip = ({ strip, chosenId, label, onChoose }: ArcStripProps) => {
  const refs = useRef<(SVGGElement | null)[]>([]);
  const height = 76;
  const baseline = 62;
  const x = (date: string) => stripX(date, strip.dates, WIDTH, PAD);
  const focusable = strip.arcs.some((arc) => arc.pairId === chosenId)
    ? chosenId
    : strip.arcs[0]?.pairId;

  const onKeyDown = (event: KeyboardEvent<SVGGElement>, index: number) => {
    const step = ARC_STEP[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + strip.arcs.length) % strip.arcs.length;
    const arc = strip.arcs[next];
    if (arc === undefined) return;
    onChoose(arc.pairId);
    refs.current[next]?.focus();
  };

  return (
    <div className="x-confirm__strip" data-testid="pass-strip" data-kind="insar">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="x-confirm__svg"
        role="radiogroup"
        aria-label={label}
      >
        <line className="x-confirm__axis" x1={PAD} x2={WIDTH - PAD} y1={baseline} y2={baseline} />
        {strip.arcs.map((arc, index) => {
          const d = arcPath(x(arc.referenceDate), x(arc.secondaryDate), baseline, baseline - 8);
          const chosen = arc.pairId === chosenId;
          return (
            <g
              key={arc.pairId}
              ref={(element) => {
                refs.current[index] = element;
              }}
              role="radio"
              aria-checked={chosen}
              aria-label={TIMELINE.pairAria(
                index + 1,
                day(arc.referenceDate),
                day(arc.secondaryDate),
              )}
              tabIndex={arc.pairId === focusable ? 0 : -1}
              className="x-confirm__arc"
              data-chosen={chosen}
              data-testid="strip-arc"
              data-pair={arc.pairId}
              onClick={() => onChoose(arc.pairId)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              <path className="x-confirm__arc-hit" d={d} />
              <path className="x-confirm__arc-line" d={d} />
            </g>
          );
        })}
        {strip.dates.map((date) => (
          <circle
            key={date}
            className="x-confirm__dot"
            cx={x(date)}
            cy={baseline}
            r={DOT - 1}
            data-testid="strip-pass"
            data-date={date}
          />
        ))}
      </svg>
      <Ends dates={strip.dates} />
      <p className="x-confirm__legend" aria-hidden="true">
        <span className="x-confirm__key x-confirm__key--chosen">{PASS_STRIP.legendChosenPair}</span>
        <span className="x-confirm__key x-confirm__key--other">{PASS_STRIP.legendOtherPair}</span>
      </p>
    </div>
  );
};
