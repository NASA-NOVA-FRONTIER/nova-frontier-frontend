import { LENS_CARD, STEP_3, STEP_8 } from "@/content/copyV8";
import type { Case } from "@/features/cases/cases";
import {
  actionLabel,
  type ExplorationProblem,
  type ProblemAction,
  type ProblemTone,
} from "@/features/explore/exploreProblems";
import { caseName } from "@/features/search/searchRows";
import type { ExplorationView } from "@/features/explore/exploreSchemas";
import { formatClock } from "@/features/explore/exploreTiming";
import { waitBar } from "@/features/explore/exploreWait";
import { useNow } from "@/lib/useNow";

import { tr } from "@/i18n/translate";
type ProgressProps = {
  view: ExplorationView | undefined;
  receivedAt: number;
  onDetails: () => void;
  onCancel: () => void;
};

// In the panel while the modal is closed: where the job is, and the way back to the details.
export const LiveProgress = ({ view, receivedAt, onDetails, onCancel }: ProgressProps) => {
  const now = useNow(true);
  const bar = view === undefined ? undefined : waitBar(view, receivedAt, now);
  return (
    <div className="x-job" role="status" data-testid="job-progress">
      <p className="x-kicker x-job__title">{tr("Asking the radar…")}</p>
      <p className="x-job__foot">
        {/* SPECS-v8 §3: elapsed time, never a countdown. */}
        {bar === undefined
          ? "Choosing the passes. You can keep exploring."
          : bar.overdue
            ? "Taking longer than expected. The answer will appear here when it is ready."
            : `${LENS_CARD.runningSub(formatClock(bar.elapsedSeconds))} · You can keep exploring.`}
      </p>
      <div className="x-problem__actions">
        <button
          type="button"
          className="x-primary x-primary--small"
          onClick={onDetails}
          data-testid="job-details"
        >
          {tr("Show details")}
        </button>
        <button
          type="button"
          className="x-ghost"
          onClick={onCancel}
          data-testid="job-progress-cancel"
        >
          {STEP_3.cancel}
        </button>
      </div>
    </div>
  );
};

// The design's tone icons (Error States.dc.html), drawn in the card's ink.
const TONE_ICON: Record<ProblemTone, string> = {
  info: "M12 8v5M12 16.5h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  block: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  wait: "M4 7h16M4 12h10M4 17h6",
  error: "M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4",
  empty: "M5 19L19 5",
  warn: "M12 4l9 16H3zM12 10v4M12 17h.01",
};

type ProblemProps = {
  problem: ExplorationProblem;
  // The backend's reasonCode, kept on the card for tests and support.
  reasonCode: string;
  onAction: (action: ProblemAction) => void;
  // Used up: the known cases open instantly and don't count.
  cases?: readonly Case[];
  onOpenCase?: (item: Case) => void;
  // Notes from the plan (why no series was found, which scenes were chosen).
  notes?: string[];
  // On the spot card the card's own buttons are the actions, so none are repeated here.
  actions?: boolean;
  testId?: string;
};

// SPECS-v8 §8: one card per category, with its own actions.
export const LiveProblem = ({
  problem,
  reasonCode,
  onAction,
  cases = [],
  onOpenCase,
  notes = [],
  actions: withActions = true,
  testId = "job-error",
}: ProblemProps) => {
  const actions = withActions
    ? [problem.primary, problem.secondary].filter(
        (action): action is ProblemAction => action !== undefined,
      )
    : [];
  return (
    <div
      className="x-problem"
      role={problem.tone === "info" ? "status" : "alert"}
      data-testid={testId}
      data-reason={reasonCode}
      data-category={problem.category}
      data-tone={problem.tone}
    >
      <div className="x-problem__head">
        <span className="x-problem__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path d={TONE_ICON[problem.tone]} />
          </svg>
        </span>
        <div className="x-problem__titles">
          {problem.kicker !== undefined && (
            <p className="x-kicker x-problem__kicker" data-testid="job-error-category">
              {problem.kicker.toUpperCase()}
            </p>
          )}
          <p className="x-problem__title">{problem.title}</p>
        </div>
      </div>
      <p>{problem.body}</p>
      {notes.map((note) => (
        <p key={note} className="x-plan__count">
          {note}
        </p>
      ))}
      {problem.cases === true && onOpenCase !== undefined && (
        <ul className="x-problem__cases" data-testid="job-error-cases">
          {cases.map((item) => (
            <li key={item.id}>
              <button type="button" className="x-problem__case" onClick={() => onOpenCase(item)}>
                <span>{caseName(item)}</span>
                <span className="x-problem__instant">{STEP_8.instant}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {actions.length > 0 && (
        <div className="x-problem__actions">
          {actions.map((action, index) => (
            <button
              key={action}
              type="button"
              className={index === 0 ? "x-primary x-primary--small" : "x-ghost"}
              onClick={() => onAction(action)}
              data-testid={`job-error-${action}`}
            >
              {actionLabel(action)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
