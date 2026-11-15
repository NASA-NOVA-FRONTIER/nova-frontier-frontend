import { STEP_8, TOP_BAR } from "@/content/copyV8";
import { DIRECTION_CHOICE_READY } from "@/features/explore/exploreApi";
import type { ExplorationView } from "@/features/explore/exploreSchemas";
import { quotaOf, resetOf, resetText, type Limits } from "@/features/limits/limitsApi";
import { NETWORK_ERROR } from "@/lib/api/apiClient";

/*
 * SPECS-v8 §8: backend-agnostic categories, each with its actions. Every backend reasonCode (and
 * HTTP status, when a request failed) lands in one of them; the raw text is never shown, except
 * for a reason we have no copy for.
 */
export type ProblemCategory =
  | "quotaLow"
  | "quotaOut"
  | "queueFull"
  | "rateLimited"
  | "timeout"
  | "serverDown"
  | "catalog"
  | "failed"
  | "noData"
  | "partial"
  | "cancelled"
  | "other";

// The design's tones: the icon ring and its ink (Error States.dc.html).
export type ProblemTone = "info" | "block" | "wait" | "error" | "empty" | "warn";

export type ProblemAction =
  "analyze" | "knownCase" | "retry" | "runAgain" | "showPartial" | "otherDirection";

export type ExplorationProblem = {
  category: ProblemCategory;
  tone: ProblemTone;
  // The category label ("QUEUE FULL"); absent for the few reasons the design has no category for.
  kicker?: string;
  title: string;
  body: string;
  // Asking again can work (capacity, a slow archive); otherwise a different place or case is needed.
  retry: boolean;
  primary?: ProblemAction;
  secondary?: ProblemAction;
  // Used up: the known cases are listed, they open instantly and don't count.
  cases?: boolean;
};

export type ProblemInput = {
  reasonCode: string;
  detail: string;
  // The HTTP status of a failed request; 0 or absent when the job itself carries the reason.
  status?: number;
  // The plan's status: a `ready` plan that ended with no data had passes but no valid pixels.
  planStatus?: string | null;
  limits?: Limits;
  now?: Date;
};

const TOO_MANY_REQUESTS = 429;
const SERVICE_UNAVAILABLE = 503;
const GATEWAY_TIMEOUT = 504;
const SERVER_ERROR = 500;
const SECONDS_PER_MINUTE = 60;
// The backend states its deadline in the detail: "did not finish within 240 s".
const DEADLINE_IN_DETAIL = /within (\d+(?:\.\d+)?) s/;

const deadlineMinutes = (detail: string): number | undefined => {
  const seconds = Number(DEADLINE_IN_DETAIL.exec(detail)?.[1]);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.max(1, Math.round(seconds / SECONDS_PER_MINUTE))
    : undefined;
};

const knownCaseSecondary = { secondary: "knownCase" } as const;

export const quotaOutProblem = (limits: Limits | undefined, now: Date): ExplorationProblem => {
  const { at, wait } = resetText(resetOf(limits?.resetsAt, now), now);
  return {
    category: "quotaOut",
    tone: "block",
    kicker: STEP_8.quotaOutCat,
    title: STEP_8.quotaOutTitle,
    body: STEP_8.quotaOutBody(at, wait),
    retry: false,
    primary: "knownCase",
    cases: true,
  };
};

export const quotaLowProblem = (remaining: number): ExplorationProblem => ({
  category: "quotaLow",
  tone: "info",
  kicker: STEP_8.quotaLowCat,
  title: STEP_8.quotaLowTitle(remaining),
  body: STEP_8.quotaLowBody,
  retry: true,
  primary: "analyze",
  ...knownCaseSecondary,
});

const serverDown = (title: string, body: string): ExplorationProblem => ({
  category: "serverDown",
  tone: "error",
  kicker: STEP_8.restartedCat,
  title,
  body,
  retry: true,
  primary: "runAgain",
});

export const explorationProblem = ({
  reasonCode,
  detail,
  status = 0,
  planStatus,
  limits,
  now = new Date(),
}: ProblemInput): ExplorationProblem => {
  // SPECS-v8 §8 "used up": a 429 or nothing left. The per-minute limit (RATE_LIMITED) is only "used
  // up" when the limits say so; any other 429 is the daily cap (backend #2).
  const usedUp = quotaOf(limits, now).kind === "out";
  if (status === TOO_MANY_REQUESTS && (reasonCode !== "RATE_LIMITED" || usedUp))
    return quotaOutProblem(limits, now);
  switch (reasonCode) {
    case "QUEUE_FULL":
      return {
        category: "queueFull",
        tone: "wait",
        kicker: STEP_8.queueFullCat,
        title: STEP_8.queueFullTitle,
        body: STEP_8.queueFullBody,
        retry: true,
        primary: "retry",
        ...knownCaseSecondary,
      };
    case "RATE_LIMITED":
      return {
        category: "rateLimited",
        tone: "wait",
        title: "You're asking quickly",
        body: "Wait a minute, then ask again.",
        retry: true,
        primary: "retry",
        ...knownCaseSecondary,
      };
    case "TIMEOUT_PARTIAL":
      return {
        category: "timeout",
        tone: "error",
        kicker: STEP_8.timeoutCat,
        title: STEP_8.timeoutTitle,
        body: STEP_8.timeoutBody(deadlineMinutes(detail)),
        retry: true,
        primary: "retry",
        ...knownCaseSecondary,
      };
    // The job is gone: the server restarted between two polls and lost it.
    case "NOT_FOUND":
      return serverDown(STEP_8.restartedTitle, STEP_8.restartedBody);
    case "UPSTREAM_CATALOG_ERROR":
      // SPECS-v8 §8: covered by the server-down copy, with the catalog named.
      return {
        ...serverDown(
          "We couldn't reach the radar archive",
          "The NASA archive didn't answer. Nothing is wrong with this place.",
        ),
        category: "catalog",
      };
    case NETWORK_ERROR:
    case "INTERNAL_ERROR":
    case "UPSTREAM_ML_ERROR":
      return serverDown(
        "We couldn't reach the service",
        "Check the connection and try again. The globe still works.",
      );
    case "ANALYSIS_FAILED":
      return {
        category: "failed",
        tone: "error",
        title: "The analysis didn't finish",
        body: "The radar service couldn't produce a result for this spot. Try again, or pick a measured case.",
        retry: true,
        primary: "runAgain",
        ...knownCaseSecondary,
      };
    case "NO_COVERAGE":
      // A ready plan had passes, but none held valid pixels at this point.
      if (planStatus === "ready")
        return {
          category: "noData",
          tone: "empty",
          kicker: STEP_8.noDataCat,
          title: STEP_8.noDataTitle,
          body: STEP_8.noDataBody(DIRECTION_CHOICE_READY),
          retry: false,
          // The direction choice isn't sent yet (DIRECTION_CHOICE_READY), so it isn't offered.
          ...(DIRECTION_CHOICE_READY
            ? { primary: "otherDirection", secondary: "knownCase" }
            : { primary: "knownCase" }),
        };
      return {
        category: "noData",
        tone: "empty",
        kicker: STEP_8.noDataCat,
        title: "No NISAR passes cover this place",
        body: "The archive holds no L-band scene over this spot in the last five months.",
        retry: false,
        primary: "knownCase",
      };
    case "INSUFFICIENT_HISTORY":
      return {
        category: "noData",
        tone: "empty",
        kicker: STEP_8.noDataCat,
        title: "Not enough radar history here yet",
        body: "The band needs a latest pass and at least three earlier ones from the same series. Try a measured case or another spot.",
        retry: false,
        primary: "knownCase",
      };
    case "CANCELLED":
      return {
        category: "cancelled",
        tone: "empty",
        title: "Request cancelled",
        body: "Nothing was measured. Ask again when you like.",
        retry: true,
        primary: "retry",
        ...knownCaseSecondary,
      };
    default:
      break;
  }
  if (status === SERVICE_UNAVAILABLE)
    return explorationProblem({ reasonCode: "QUEUE_FULL", detail });
  if (status === GATEWAY_TIMEOUT)
    return explorationProblem({ reasonCode: "TIMEOUT_PARTIAL", detail });
  if (status >= SERVER_ERROR) return explorationProblem({ reasonCode: "INTERNAL_ERROR", detail });
  return {
    category: "other",
    tone: "error",
    title: "We couldn't answer this question",
    body: detail,
    retry: false,
    primary: "knownCase",
  };
};

// SPECS-v8 §8 "Partial result": only when passes are missing; a lens that lacked a baseline on
// every pass it read keeps its own "Not enough data" reasons instead.
export const partialProblem = (view: ExplorationView): ExplorationProblem | undefined => {
  if (view.status !== "partial" || view.result === null) return undefined;
  const read = view.progress?.scenesRead ?? null;
  const total = view.progress?.scenesTotal ?? 0;
  if (read === null || total === 0 || read >= total) return undefined;
  return {
    category: "partial",
    tone: "warn",
    kicker: STEP_8.partialCat,
    title: STEP_8.partialTitle(read, total),
    body: STEP_8.partialBody(total - read),
    retry: true,
    primary: "showPartial",
    secondary: "retry",
  };
};

// The label of each action button.
export const actionLabel = (action: ProblemAction): string => {
  switch (action) {
    case "analyze":
      return STEP_8.analyze;
    case "knownCase":
      return STEP_8.knownCase;
    case "retry":
      return STEP_8.tryAgain;
    case "runAgain":
      return STEP_8.runAgain;
    case "showPartial":
      return STEP_8.showPartial;
    case "otherDirection":
      return STEP_8.tryDirection(TOP_BAR.descending);
  }
};
