import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { STEP_4 } from "@/content/copyV8";
import { TIMELINE } from "@/content/copyV9";

import { Icon } from "@/features/case-panel/icons";
import { Prov } from "@/features/case-panel/Prov";
import { SOURCE } from "@/features/case-panel/verdicts";
import type { TimelineData } from "@/features/cases/cases";
import {
  nearestStep,
  sequenceOf,
  sequenceReadout,
  stepView,
  type StepView,
} from "@/features/timeline/sequence";
import { SPEEDS } from "@/features/timeline/sequencePlayer";
import {
  layoutTimeline,
  passAria,
  formatDay,
  passCount,
  readoutOf,
  type LaidPass,
} from "@/features/timeline/timelineLayout";
import { usePassPlayer, usePauseWhen } from "@/features/timeline/usePassPlayer";
import { prefersReducedMotion } from "@/lib/motion";
import { ProvenanceChip } from "@/lib/ProvenanceChip";

// Pixels from the top of the track: bars grow up from just above the radar axis.
const BAR_BASE_PX = 34;
// Interval rows (ground motion): one bar per pair, stacked.
const PAIR_ROW_PX = 22;

// A live answer drives the dock and the globe from the explorer, so the selected date lives there:
// the player asks for each step with `onPick`, and the explorer can pull another date in.
export type LiveTimelineControl = {
  date: string | undefined;
  onPick: (date: string) => void;
};

// `demo` is true for a measured case (its pass dates are illustrative) and false for a live result.
// `onStep` labels the globe for the step in focus; a new `pauseSignal` value pauses (a globe drag).
// `reduceMotion` is the explorer's switch: it opens paused, and pauses when it turns on.
type PassTimelineProps = {
  data: TimelineData;
  demo?: boolean;
  live?: LiveTimelineControl;
  onStep?: (step: StepView | undefined) => void;
  pauseSignal?: number;
  reduceMotion?: boolean;
};

const passClass = (item: LaidPass, comparing: boolean, selected: boolean): string => {
  const kind =
    item.kind === "plan"
      ? "plan"
      : comparing && item.kind === "target"
        ? "target"
        : comparing && item.kind === "base"
          ? "base"
          : "meas";
  return `x-tl__dot x-tl__dot--${kind}${item.next ? " x-tl__dot--next" : ""}${selected ? " x-tl__dot--on" : ""}`;
};

// SPECS-flow-v9 §3: the sequence player over the v8 lanes (measured, compared, planned, optical).
export const PassTimeline = ({
  data,
  demo = true,
  live,
  onStep,
  pauseSignal = 0,
  reduceMotion = prefersReducedMotion(),
}: PassTimelineProps) => {
  const layout = useMemo(() => layoutTimeline(data), [data]);
  const sequence = useMemo(() => sequenceOf(data, layout), [data, layout]);
  const { steps } = sequence;
  const trackRef = useRef<HTMLDivElement>(null);
  const hasTarget = layout.targetIndex >= 0;
  const stepOfPass = (passIndex: number) => steps.findIndex((step) => step.passIndex === passIndex);
  const liveIndex = live === undefined ? -1 : steps.findIndex((step) => step.date === live.date);
  const startIndex =
    live !== undefined
      ? Math.max(0, liveIndex)
      : hasTarget
        ? stepOfPass(layout.targetIndex)
        : steps.length - 1;
  const nextImages = useCallback(
    (index: number) => steps[(index + 1) % Math.max(1, steps.length)]?.images ?? [],
    [steps],
  );
  const [player, dispatch] = usePassPlayer(
    {
      n: steps.length,
      index: startIndex,
      canPlay: sequence.canPlay,
      reducedMotion: reduceMotion,
    },
    nextImages,
  );
  // Turning it on pauses where it is; turning it off never resumes on its own.
  usePauseWhen(reduceMotion, dispatch);
  // A live answer has no compare mode (Cristian, #20): the selected pass is always in focus.
  const [comparing, setComparing] = useState(hasTarget && live === undefined);
  const isComparing = comparing && hasTarget && live === undefined && !player.playing;
  const step = steps[player.index];
  const currentPass = step?.passIndex ?? -1;

  // Live: the explorer owns the date. Pull a date it changed (a dock pick), then push our own steps;
  // `requested` keeps the two from echoing each other.
  const requested = useRef(live?.date);
  const liveDate = live?.date;
  useEffect(() => {
    if (liveDate === requested.current) return;
    requested.current = liveDate;
    if (liveIndex >= 0) dispatch({ type: "sync", index: liveIndex });
  }, [liveDate, liveIndex, dispatch]);
  const onPick = live?.onPick;
  useEffect(() => {
    if (onPick === undefined || sequence.mode !== "passes" || step === undefined) return;
    if (step.date === requested.current) return;
    requested.current = step.date;
    onPick(step.date);
  }, [onPick, sequence.mode, step]);

  const view = useMemo(
    () => stepView(sequence, layout, player.index),
    [sequence, layout, player.index],
  );
  useEffect(() => {
    onStep?.(view);
  }, [onStep, view]);
  useEffect(() => () => onStep?.(undefined), [onStep]);

  // Skip the first value: only a change means "the user touched the map".
  const pausedAt = useRef(pauseSignal);
  useEffect(() => {
    if (pauseSignal === pausedAt.current) return;
    pausedAt.current = pauseSignal;
    dispatch({ type: "pause" });
  }, [pauseSignal, dispatch]);

  const seek = (index: number) => {
    setComparing(false);
    dispatch({ type: "seek", index });
  };
  const move = (type: "prev" | "next") => {
    setComparing(false);
    dispatch({ type });
  };

  // ← → Home End walk the measured passes and keep focus on the picked one.
  const onPassKey = (event: KeyboardEvent<HTMLButtonElement>, at: number) => {
    const target =
      event.key === "ArrowRight"
        ? at + 1
        : event.key === "ArrowLeft"
          ? at - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? steps.length - 1
              : undefined;
    if (target === undefined || target < 0 || target >= steps.length) return;
    event.preventDefault();
    seek(target);
    const id =
      sequence.mode === "passes"
        ? `timeline-pass-${steps[target]?.passIndex ?? 0}`
        : `timeline-pair-${target}`;
    trackRef.current?.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)?.focus();
  };

  // Scrubbing: dragging along the track jumps to the nearest step.
  const lefts =
    sequence.mode === "passes"
      ? steps.map((item) => layout.passes[item.passIndex ?? 0]?.left ?? 0)
      : sequence.bars.map((bar) => bar.left + bar.width / 2);
  const scrub = (event: PointerEvent<HTMLDivElement>) => {
    const box = trackRef.current?.getBoundingClientRect();
    if (box === undefined || box.width === 0 || steps.length === 0) return;
    const pct = ((event.clientX - box.left) / box.width) * 100;
    const index = nearestStep(lefts, pct);
    if (index !== player.index || player.playing) seek(index);
  };

  const readout = isComparing
    ? readoutOf(data, layout, true, layout.targetIndex)
    : sequenceReadout(data, layout, sequence, player.index);
  const showBracket = isComparing || live !== undefined;
  const target = layout.passes[layout.targetIndex];
  const hasOptical = data.optical.length > 0;
  const many = steps.length > 1;
  const passes = sequence.mode === "passes";

  return (
    <section
      className="x-timeline x-glass"
      aria-label="Pass timeline"
      data-testid="timeline"
      data-mode={sequence.mode}
      data-playing={player.playing}
    >
      <div className="x-tl__head">
        <div className="x-tl__controls">
          <button
            type="button"
            className="x-tl__step"
            onClick={() => move("prev")}
            disabled={!many}
            aria-label={TIMELINE.previous}
            title={TIMELINE.previous}
            data-testid="timeline-prev"
          >
            <Icon name="collapse" size={14} />
          </button>
          {player.canPlay && (
            <button
              type="button"
              className="x-tl__play x-tl__play--v8"
              onClick={() => dispatch({ type: "toggle" })}
              aria-label={player.playing ? TIMELINE.pause : TIMELINE.play}
              title={player.playing ? TIMELINE.pause : TIMELINE.play}
              data-testid="timeline-play"
            >
              <Icon name={player.playing ? "pause" : "play"} size={15} filled />
            </button>
          )}
          <button
            type="button"
            className="x-tl__step"
            onClick={() => move("next")}
            disabled={!many}
            aria-label={TIMELINE.next}
            title={TIMELINE.next}
            data-testid="timeline-step-next"
          >
            <Icon name="expand" size={14} />
          </button>
        </div>
        {/* Announced when the user moves it, not every step while it plays. */}
        <div className="x-tl__readout" aria-live={player.playing ? "off" : "polite"}>
          <span className="x-tl__line" data-testid="timeline-readout">
            {readout.line}
          </span>
          <span className="x-tl__sub" data-testid="timeline-sub">
            {readout.sub}
          </span>
        </div>
        {demo ? (
          <ProvenanceChip kind="demoDates" source={SOURCE.timeline} />
        ) : (
          <Prov kind="realDates" source={SOURCE.liveTimeline} />
        )}
        {player.canPlay && (
          <div className="x-tl__options">
            <div
              className="x-tl__speed"
              role="group"
              aria-label={TIMELINE.speed}
              data-testid="timeline-speed"
            >
              {SPEEDS.map((speed, index) => (
                <button
                  key={speed}
                  type="button"
                  aria-pressed={player.speed === speed}
                  onClick={() => dispatch({ type: "speed", speed })}
                  data-testid={`timeline-speed-${speed}`}
                >
                  {TIMELINE.speeds[index]}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="x-tl__loop"
              aria-pressed={player.loop}
              onClick={() => dispatch({ type: "loop" })}
              data-testid="timeline-loop"
            >
              <Icon name="loop" size={13} />
              {TIMELINE.loop}
            </button>
          </div>
        )}
        {hasTarget && live === undefined && (
          <button
            type="button"
            className="x-tl__compare"
            aria-pressed={isComparing}
            onClick={() => {
              dispatch({ type: "pause" });
              setComparing(!isComparing);
            }}
            data-testid="timeline-compare"
          >
            Baseline ↔ Target
          </button>
        )}
      </div>

      <div
        className={passes ? "x-tl__track" : "x-tl__track x-tl__track--pairs"}
        ref={trackRef}
        style={passes ? undefined : { height: `${steps.length * PAIR_ROW_PX + 28}px` }}
        onPointerDown={(event) => {
          if (event.button === 0) scrub(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) scrub(event);
        }}
        data-testid="timeline-track"
      >
        {passes ? (
          <>
            <span className="x-tl__lane x-tl__lane--bars">
              Outside
              <br />
              range
            </span>
            <span className="x-tl__lane x-tl__lane--radar">Radar</span>
            <span className="x-tl__lane x-tl__lane--optical" data-off={!hasOptical}>
              Optical
            </span>
            <div className="x-tl__axis" style={{ width: `${layout.today}%` }} />
            <div className="x-tl__axis x-tl__axis--planned" style={{ left: `${layout.today}%` }} />
            <div className="x-tl__optical-axis" data-off={!hasOptical} />
            {layout.onset !== undefined && (
              <>
                <div className="x-tl__onset" style={{ left: `${layout.onset.left}%` }} />
                <span className="x-tl__onset-label" style={{ left: `${layout.onset.left}%` }}>
                  {layout.onset.label}
                </span>
              </>
            )}
            <div className="x-tl__today" style={{ left: `${layout.today}%` }} />
            <span className="x-tl__today-label" style={{ left: `${layout.today}%` }}>
              Today
            </span>
            {layout.baseline !== undefined && showBracket && (
              <>
                <div
                  className="x-tl__bracket"
                  style={{ left: `${layout.baseline.left}%`, width: `${layout.baseline.width}%` }}
                />
                <span className="x-tl__bracket-label" style={{ left: `${layout.baseline.left}%` }}>
                  {live === undefined
                    ? `Baseline · ${passCount(layout.baseline.count)}`
                    : STEP_4.timelineBaseline(layout.baseline.count)}
                </span>
              </>
            )}
            {layout.next !== undefined && (
              <span
                className="x-tl__planned-label"
                style={{ left: `${layout.next.left}%` }}
                data-testid="timeline-next"
              >
                Next
              </span>
            )}
            {sequence.gaps.map(
              (gap) =>
                gap.show && (
                  <span
                    key={gap.left}
                    className="x-tl__gap"
                    style={{ left: `${gap.left}%` }}
                    data-testid="timeline-gap"
                  >
                    {gap.label}
                  </span>
                ),
            )}
            {layout.passes.map((item) => {
              const selected = !isComparing && item.index === currentPass;
              const lit = selected || (isComparing && item.kind === "target");
              const at = stepOfPass(item.index);
              return (
                <span key={item.date}>
                  {item.bar > 0 && (
                    <span
                      className="x-tl__bar"
                      data-kind={item.kind}
                      data-lit={lit}
                      style={{
                        left: `${item.left}%`,
                        top: `${BAR_BASE_PX - item.bar}px`,
                        height: `${item.bar}px`,
                      }}
                    />
                  )}
                  <button
                    type="button"
                    className="x-tl__pass"
                    style={{ left: `${item.left}%` }}
                    aria-label={passAria(item)}
                    title={passAria(item)}
                    disabled={!item.clickable}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => {
                      if (at >= 0) seek(at);
                    }}
                    onKeyDown={(event) => {
                      if (at >= 0) onPassKey(event, at);
                    }}
                    data-testid={`timeline-pass-${item.index}`}
                    data-kind={item.kind}
                    data-next={item.next || undefined}
                  >
                    <span className={passClass(item, isComparing, selected)} />
                  </button>
                </span>
              );
            })}
            {target !== undefined && (
              <span className="x-tl__target-label" style={{ left: `${target.left}%` }}>
                Target
              </span>
            )}
            {layout.optical.map((item) => (
              <span
                key={item.label}
                className="x-tl__optical"
                style={{ left: `${item.left}%` }}
                title={item.label}
              />
            ))}
          </>
        ) : (
          <>
            {sequence.bars.map((bar, index) => (
              <button
                key={bar.aria}
                type="button"
                className="x-tl__pair"
                style={{
                  left: `${bar.left}%`,
                  width: `${bar.width}%`,
                  top: `${index * PAIR_ROW_PX}px`,
                }}
                aria-label={bar.aria}
                title={bar.aria}
                aria-current={index === player.index ? "true" : undefined}
                onClick={() => seek(index)}
                onKeyDown={(event) => onPassKey(event, index)}
                data-testid={`timeline-pair-${index}`}
              >
                {bar.label}
              </button>
            ))}
            {sequence.event !== undefined && (
              <>
                <div
                  className="x-tl__event"
                  style={{ left: `${sequence.event.left}%` }}
                  title={TIMELINE.straddle}
                />
                <span
                  className="x-tl__event-label"
                  style={{ left: `${sequence.event.left}%` }}
                  data-testid="timeline-event"
                >
                  {sequence.event.label}
                </span>
              </>
            )}
          </>
        )}
        {layout.months.map((month) => (
          <span key={month.left} className="x-tl__month" style={{ left: `${month.left}%` }}>
            {month.label}
          </span>
        ))}
      </div>

      {passes && (
        <div className="x-tl__legend">
          <span>
            <i className="x-tl__key x-tl__key--meas" />
            Measured
          </span>
          <span>
            <i className="x-tl__key x-tl__key--target" />
            Compared
          </span>
          <span data-testid="timeline-planned-legend">
            <i className="x-tl__key x-tl__key--plan" />
            Planned · a promise, not data
            {layout.next !== undefined && ` · next ${formatDay(layout.next.date, false)}`}
          </span>
          <span data-off={!hasOptical}>
            <i className="x-tl__key x-tl__key--optical" />
            OPERA optical
          </span>
          <span className="x-tl__source">NISAR Observation Plan · 12-day repeat</span>
        </div>
      )}
    </section>
  );
};
