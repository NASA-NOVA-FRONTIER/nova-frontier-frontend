import { useEffect, useId, useRef } from "react";

import { STEP_3 } from "@/content/copyV8";
import { Icon } from "@/features/case-panel/icons";
import type { ExplorationView } from "@/features/explore/exploreSchemas";
import { formatClock } from "@/features/explore/exploreTiming";
import { queueAhead, waitBar, waitSteps } from "@/features/explore/exploreWait";
import { FactsCarousel } from "@/features/facts/FactsCarousel";
import { useNow } from "@/lib/useNow";

const PERCENT = 100;

type JobModalProps = {
  placeName: string;
  // Undefined until the backend has answered the first request.
  view: ExplorationView | undefined;
  receivedAt: number;
  reduceMotion: boolean;
  onKeepExploring: () => void;
  onCancel: () => void;
};

const percent = (fraction: number): string => `${(fraction * PERCENT).toFixed(1)}%`;

/*
 * The v8 waiting panel (SPECS-v8 §3): elapsed time on a 0–5 min bar whose shaded band is the
 * backend's own estimate, the four steps as far as the backend reports them, the queue line, and a
 * sourced fact. Never a countdown. It doesn't block the globe; "Keep exploring" leaves the job
 * running in the panel (decision 9).
 */
export const JobModal = ({
  placeName,
  view,
  receivedAt,
  reduceMotion,
  onKeepExploring,
  onCancel,
}: JobModalProps) => {
  const titleId = useId();
  const keepRef = useRef<HTMLButtonElement>(null);
  const now = useNow(true);

  useEffect(() => {
    const previous = document.activeElement;
    keepRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  const bar = waitBar(view, receivedAt, now);
  const steps = waitSteps(view);
  const ahead = queueAhead(view);
  return (
    <section
      className="x-jobmodal x-glass"
      role="dialog"
      aria-labelledby={titleId}
      data-testid="job-modal"
    >
      <header className="x-jobmodal__head">
        <p className="x-kicker" data-testid="job-kicker">
          {STEP_3.kicker(placeName.toUpperCase())}
        </p>
        <h2 id={titleId} className="x-jobmodal__title">
          {STEP_3.title}
        </h2>
      </header>

      <div className="x-jobmodal__timer">
        <span className="x-jobmodal__clock" data-testid="job-elapsed">
          {formatClock(bar.elapsedSeconds)}
        </span>
        <span className="x-jobmodal__note">
          {STEP_3.timerNote}
          <br />
          {STEP_3.timerNoteQueue}
        </span>
      </div>
      <div
        className="x-jobmodal__bar"
        role="progressbar"
        aria-label="Elapsed time, 0 to 5 minutes"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={Math.min(5, Math.floor(bar.elapsedSeconds / 60))}
        aria-valuetext={`${formatClock(bar.elapsedSeconds)} elapsed`}
        data-overdue={bar.overdue}
        data-reduce={reduceMotion}
        data-testid="job-bar"
      >
        <span
          className="x-jobmodal__band"
          style={{ left: percent(bar.band.from), width: percent(bar.band.to - bar.band.from) }}
          data-estimated={bar.estimated}
          data-testid="job-band"
        />
        <span className="x-jobmodal__fill" style={{ width: percent(bar.fraction) }} />
      </div>
      <div className="x-jobmodal__axis" aria-hidden="true">
        {STEP_3.axis.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      {bar.overdue && (
        <p className="x-jobmodal__late" data-testid="job-late">
          The radar archive can be slow. Your answer will appear here as soon as it is ready.
        </p>
      )}

      {ahead !== undefined && (
        <p className="x-jobmodal__queue" role="status" data-testid="job-queue">
          <span className="x-jobmodal__queue-n">{STEP_3.queuePosition(ahead)}</span>
          {STEP_3.queueNote}
        </p>
      )}

      <ol className="x-wsteps" data-testid="job-stages">
        {steps.map((step) => (
          <li key={step.id} className="x-wstep" data-state={step.state} data-step={step.id}>
            <span className="x-wstep__dot" data-reduce={reduceMotion}>
              <Icon name="tick" size={10} />
            </span>
            <span className="x-wstep__text">
              <span className="x-wstep__label">{step.label}</span>
              {step.line !== "" && <span className="x-wstep__line">{step.line}</span>}
            </span>
          </li>
        ))}
      </ol>

      <FactsCarousel reduceMotion={reduceMotion} />

      <div className="x-jobmodal__actions">
        <button
          ref={keepRef}
          type="button"
          className="x-primary x-primary--small"
          onClick={onKeepExploring}
          data-testid="job-keep"
        >
          Keep exploring
        </button>
        <button type="button" className="x-ghost" onClick={onCancel} data-testid="job-cancel">
          {STEP_3.cancel}
        </button>
      </div>
    </section>
  );
};
