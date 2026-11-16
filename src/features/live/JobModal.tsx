import { useEffect, useId, useMemo, useRef, useState } from "react";

import { STEP_3 } from "@/content/copyV8";
import { PROCESSING, RESULT, TIPS } from "@/content/copyV9";
import { getFacts } from "@/content/facts";
import { Icon } from "@/features/case-panel/icons";
import type { ExplorationView } from "@/features/explore/exploreSchemas";
import { formatClock } from "@/features/explore/exploreTiming";
import {
  drawFacts,
  estimateLine,
  queueAhead,
  waitBar,
  waitMode,
  waitSteps,
} from "@/features/explore/exploreWait";
import { FactsCarousel } from "@/features/facts/FactsCarousel";
import { useNow } from "@/lib/useNow";

const PERCENT = 100;

type JobModalProps = {
  placeName: string;
  // Undefined until the backend has answered the first request.
  view: ExplorationView | undefined;
  receivedAt: number;
  // The run's key: the ten facts are drawn from it, so they differ between runs and stay put in one.
  runKey: string;
  reduceMotion: boolean;
  onKeepExploring: () => void;
  onCancel: () => void;
};

const percent = (fraction: number): string => `${(fraction * PERCENT).toFixed(1)}%`;

/*
 * The processing panel (SPECS-v8 §3, v9 §1.4, #25): at the top right so it never covers the square
 * (a bottom sheet on phones), collapsible. Elapsed time on a 0–5 min bar whose shaded band ends on the
 * backend's own estimate, the mode, the four steps as far as the backend reports them, the queue line
 * and ten sourced facts drawn for this run. Never a countdown. OFFLINE shows the steps done and no
 * facts. "Keep exploring" leaves the job running in the case panel (decision 9).
 */
export const JobModal = ({
  placeName,
  view,
  receivedAt,
  runKey,
  reduceMotion,
  onKeepExploring,
  onCancel,
}: JobModalProps) => {
  const titleId = useId();
  const keepRef = useRef<HTMLButtonElement>(null);
  const now = useNow(true);
  const [collapsed, setCollapsed] = useState(false);
  const facts = useMemo(() => drawFacts(getFacts(), runKey), [runKey]);

  useEffect(() => {
    const previous = document.activeElement;
    // The panel opens at its top (kicker and title), not scrolled to the focused button.
    keepRef.current?.focus({ preventScroll: true });
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  const bar = waitBar(view, receivedAt, now);
  const steps = waitSteps(view);
  const ahead = queueAhead(view);
  const mode = waitMode(view);
  const current = steps.find((step) => step.state === "current") ?? steps.at(-1);
  return (
    <section
      className="x-jobmodal x-glass"
      role="dialog"
      aria-labelledby={titleId}
      data-collapsed={collapsed}
      data-mode={mode}
      data-testid="job-modal"
    >
      <header className="x-jobmodal__head">
        <p className="x-kicker x-kicker--split" data-testid="job-kicker">
          <span>{STEP_3.kicker(placeName.toUpperCase())}</span>
          <span className="x-jobmodal__mode" title={TIPS.mode} data-testid="job-mode">
            {mode === "offline" ? RESULT.offline : RESULT.online}
          </span>
        </p>
        <div className="x-jobmodal__titlerow">
          <h2 id={titleId} className="x-jobmodal__title">
            {mode === "offline" ? PROCESSING.titleOffline : PROCESSING.titleOnline}
          </h2>
          <button
            type="button"
            className="x-ghost x-jobmodal__collapse"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
            data-testid="job-collapse"
          >
            {collapsed ? PROCESSING.expand : PROCESSING.collapse}
          </button>
        </div>
      </header>

      <div className="x-jobmodal__timer">
        <span className="x-jobmodal__clock" data-testid="job-elapsed">
          {formatClock(bar.elapsedSeconds)}
          <span className="x-jobmodal__elapsed"> {PROCESSING.elapsedLabel}</span>
        </span>
        <span className="x-jobmodal__note" data-testid="job-estimate">
          {collapsed ? current?.label : estimateLine(view, bar)}
        </span>
      </div>
      {!collapsed && (
        <>
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
              {PROCESSING.lateBody}
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

          {mode === "online" && <FactsCarousel reduceMotion={reduceMotion} facts={facts} />}
        </>
      )}

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
          {PROCESSING.cancel}
        </button>
      </div>
    </section>
  );
};
