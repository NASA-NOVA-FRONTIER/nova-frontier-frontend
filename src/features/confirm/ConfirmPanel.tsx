import { useState } from "react";

import {
  CONFIRM,
  CONFIRM_NOTES,
  EARTHQUAKE_SETTINGS,
  INFO_TIP,
  MEASURED_CASE,
  PRESET_NAME,
  PROCESSING,
  RESULT,
  SQUARE,
  TIPS,
  type V9LensId,
} from "@/content/copyV9";
import type { Case } from "@/features/cases/cases";
import {
  arcStrip,
  chosenDates,
  confirmWait,
  defaultPairId,
  directionWord,
  pairGroups,
  passState,
  seriesOf,
  startBlock,
  type PassState,
  type StartBlock,
} from "@/features/confirm/confirmView";
import { GcovStrip, QuakeStrip } from "@/features/confirm/PassStrip";
import { QuakeSettings } from "@/features/confirm/QuakeSettings";
import { PhenomenonChips } from "@/features/confirm/PhenomenonChips";
import "@/features/confirm/confirm.css";
import {
  explorationProblem,
  quotaLowProblem,
  quotaOutProblem,
} from "@/features/explore/exploreProblems";
import type { Frame } from "@/features/frames/frame.types";
import { nextPlannedPass } from "@/features/frames/nextPlannedPass";
import {
  DEFAULT_COHERENCE,
  listInsarPairs,
  type InsarChoice,
  type InsarPair,
} from "@/features/insar/insarApi";
import type { Limits, Quota } from "@/features/limits/limitsApi";
import { LiveProblem } from "@/features/live/LiveStatus";
import { formatLonLat } from "@/features/live/liveQuestion";
import { useFramePlan } from "@/features/live/useFramePlan";
import type { Place } from "@/features/search/placesApi";
import type { Coverage } from "@/features/spot/coverageApi";
import type { Nearest } from "@/features/spot/spot";
import { formatDay } from "@/features/timeline/timelineLayout";
import { ApiError } from "@/lib/api/apiClient";
import { InfoTip } from "@/lib/InfoTip";
import { useAsync, type AsyncState } from "@/lib/useAsync";

type ConfirmPanelProps = {
  place: Place;
  coverage: AsyncState<Coverage> | undefined;
  // The Observation Plan frame under the square, for the next planned pass when nothing is measured.
  frame: Frame | undefined;
  lens: V9LensId;
  nearest: Nearest | undefined;
  // SPECS-v8 §8: the quota line shows only at 3 or fewer left, or when used up.
  quota: Quota;
  limits: Limits | undefined;
  now: number;
  cases: readonly Case[];
  onLens: (lens: V9LensId) => void;
  onRetryCoverage: () => void;
  // The only place a request to the radar starts: nothing is POSTed before this.
  onStart: (lens: V9LensId, insar: InsarChoice | undefined) => void;
  // Back to placing: the square can move again.
  onMove: () => void;
  onCancel: () => void;
  onOpenCase: (item: Case) => void;
};

const day = (iso: string): string => formatDay(iso, false);

const problemOf = (error: Error, fallback: string) =>
  explorationProblem(
    error instanceof ApiError
      ? { reasonCode: error.reasonCode, detail: error.message, status: error.status }
      : { reasonCode: fallback, detail: error.message },
  );

const REASON: Record<Exclude<StartBlock, "loading" | undefined>, string> = {
  none: CONFIRM_NOTES.noDataTitle,
  few: CONFIRM_NOTES.fewTitle,
  noPair: CONFIRM_NOTES.noPairTitle,
};

const Loading = () => (
  <p className="x-place__note" role="status" data-testid="confirm-loading">
    {PROCESSING.steps[0]}…
  </p>
);

/*
 * Step 3 of the v9 flow (SPECS-flow-v9 §1.3): what the radar should look for on the locked square,
 * the passes it will read and why Start may be off. Coverage comes from /coverage (asked by the
 * page on "Use this square"); the pair list is asked here, once, the first time Earthquake is picked.
 */
export const ConfirmPanel = ({
  place,
  coverage,
  frame,
  lens,
  nearest,
  quota,
  limits,
  now,
  cases,
  onLens,
  onRetryCoverage,
  onStart,
  onMove,
  onCancel,
  onOpenCase,
}: ConfirmPanelProps) => {
  // Kept once asked, so switching back to Earthquake doesn't ask again.
  const [askedPairs, setAskedPairs] = useState(lens === "insar");
  const { state: pairs, retry: retryPairs } = useAsync(
    (signal) => listInsarPairs(place.point, signal),
    askedPairs ? place.id : undefined,
  );
  const [pairId, setPairId] = useState<string>();
  const [threshold, setThreshold] = useState(DEFAULT_COHERENCE);

  const covered = coverage?.status === "success" ? coverage.data : undefined;
  const passes = covered && passState(covered);
  const noData = lens !== "insar" && passes?.kind === "none";
  // Read only when nothing is measured here: the note names the next planned pass.
  const { plan } = useFramePlan(noData ? frame : undefined, "confirm");
  const next =
    plan?.status === "success"
      ? nextPlannedPass(plan.data, new Date(now).toISOString().slice(0, 10))
      : undefined;

  const allPairs = pairs?.status === "success" ? pairs.data.pairs : [];
  const groups = pairGroups(allPairs);
  const chosen: InsarPair | undefined =
    allPairs.find((pair) => pair.pairId === pairId) ??
    allPairs.find((pair) => pair.pairId === defaultPairId(allPairs));
  const group = groups.find((entry) => entry.seriesKey === chosen?.seriesKey);
  const pairChosen = pairs?.status === "success" ? chosen !== undefined : undefined;
  const block: StartBlock =
    covered === undefined ? "loading" : startBlock(lens, passes, pairChosen);
  const wait = covered === undefined ? undefined : confirmWait(lens, block, covered);
  const offline = wait?.offline ?? false;

  const chooseLens = (id: V9LensId) => {
    if (id === "insar") setAskedPairs(true);
    onLens(id);
  };

  const coords = formatLonLat(place.point);
  const state =
    coverage === undefined || coverage.status === "loading"
      ? "loading"
      : coverage.status === "error"
        ? "error"
        : lens === "insar"
          ? pairs === undefined || pairs.status === "loading"
            ? "loading"
            : pairs.status === "error"
              ? "error"
              : chosen === undefined
                ? "nopair"
                : "ready"
          : (passes?.kind ?? "loading");

  const waitLine = wait?.line ?? "";
  const reason = block === undefined || block === "loading" ? undefined : REASON[block];

  return (
    <section
      className="x-place x-glass x-confirm"
      aria-label={CONFIRM.title}
      data-testid="confirm-panel"
      data-state={state}
      data-lens={lens}
    >
      <div className="x-confirm__body">
        <header className="x-confirm__head">
          <p className="x-kicker">{CONFIRM.kicker}</p>
          <h2 className="x-confirm__title" data-testid="confirm-title">
            {CONFIRM.title}
          </h2>
          <p className="x-place__note">{CONFIRM.area}</p>
          <p className="x-place__meta" data-testid="confirm-place">
            {place.name === coords ? coords : `${place.name} · ${coords}`}
          </p>
        </header>

        <PhenomenonChips lens={lens} onLens={chooseLens} />

        {(coverage === undefined || coverage.status === "loading") && <Loading />}

        {coverage?.status === "error" && (
          <div className="x-problem" role="alert" data-testid="confirm-error">
            <p className="x-problem__title">{problemOf(coverage.error, "").title}</p>
            <p>{problemOf(coverage.error, "").body}</p>
            <div className="x-problem__actions">
              <button
                type="button"
                className="x-primary x-primary--small"
                onClick={onRetryCoverage}
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {covered !== undefined && lens !== "insar" && passes !== undefined && (
          <GcovPasses
            lens={lens}
            coverage={covered}
            passes={passes}
            next={
              next !== undefined && frame !== undefined
                ? {
                    date: formatDay(next.date),
                    track: String(frame.track),
                    direction: directionWord(frame.pass),
                  }
                : undefined
            }
            nearest={nearest}
            onOpenCase={onOpenCase}
          />
        )}

        {covered !== undefined && lens === "insar" && (
          <>
            {(pairs === undefined || pairs.status === "loading") && <Loading />}
            {pairs?.status === "error" && (
              <LiveProblem
                problem={problemOf(pairs.error, "NETWORK_ERROR")}
                reasonCode={
                  pairs.error instanceof ApiError ? pairs.error.reasonCode : "NETWORK_ERROR"
                }
                onAction={(action) => (action === "knownCase" ? onCancel() : retryPairs())}
                testId="confirm-error"
              />
            )}
            {pairs?.status === "success" && group === undefined && (
              <div className="x-confirm__note" role="status" data-testid="confirm-note">
                <p className="x-confirm__note-title">{CONFIRM_NOTES.noPairTitle}</p>
              </div>
            )}
            {chosen !== undefined && group !== undefined && (
              <div className="x-confirm__block">
                <p className="x-kicker x-kicker--split">
                  <span className="x-confirm__label">
                    {CONFIRM.stripLabel("insar")}
                    <InfoTip
                      label={INFO_TIP.label}
                      title={CONFIRM.stripLabel("insar")}
                      text={TIPS.strip.insar}
                      testId="tip-strip"
                    />
                  </span>
                  <span>{CONFIRM.preset(PRESET_NAME.insar)}</span>
                </p>
                <QuakeStrip
                  strip={arcStrip(group, chosen)}
                  chosenId={chosen.pairId}
                  label={CONFIRM.stripLabel("insar")}
                  onChoose={setPairId}
                />
                <p className="x-confirm__line" data-testid="confirm-series">
                  {MEASURED_CASE.passLine(group.dates.length, group.track, group.direction)}
                </p>
                <p className="x-confirm__line" data-testid="confirm-pair">
                  {EARTHQUAKE_SETTINGS.pairLine(
                    day(chosen.referenceDate),
                    day(chosen.secondaryDate),
                    chosen.temporalBaselineDays,
                  )}
                </p>
                <p className="x-confirm__line" data-testid="confirm-insar-window">
                  {SQUARE.insarWindow}
                </p>
                <QuakeSettings
                  groups={groups}
                  chosenId={chosen.pairId}
                  threshold={threshold}
                  onChoose={setPairId}
                  onThreshold={setThreshold}
                />
              </div>
            )}
          </>
        )}

        {covered !== undefined && quota.kind === "low" && (
          <LiveProblem
            problem={quotaLowProblem(quota.remaining)}
            reasonCode=""
            onAction={() => undefined}
            actions={false}
            testId="spot-quota"
          />
        )}
        {covered !== undefined && quota.kind === "out" && (
          <LiveProblem
            problem={quotaOutProblem(limits, new Date(now))}
            reasonCode=""
            onAction={onCancel}
            actions={false}
            cases={cases}
            onOpenCase={onOpenCase}
            testId="spot-quota"
          />
        )}
      </div>

      <footer className="x-confirm__foot" data-testid="confirm-footer">
        {covered !== undefined && (
          <p className="x-confirm__mode">
            <span
              className="x-confirm__mode-chip"
              data-mode={offline ? "offline" : "online"}
              data-testid="confirm-mode"
            >
              {offline ? RESULT.offline : RESULT.online}
            </span>
            <InfoTip
              label={INFO_TIP.label}
              title={offline ? RESULT.offline : RESULT.online}
              text={TIPS.mode}
              testId="tip-mode"
            />
            <span data-testid="confirm-wait">{waitLine}</span>
            <InfoTip label={INFO_TIP.label} title={waitLine} text={TIPS.wait} testId="tip-wait" />
          </p>
        )}
        {reason !== undefined && (
          <p className="x-confirm__reason" data-testid="confirm-reason">
            {reason}
          </p>
        )}
        <div className="x-confirm__actions">
          {quota.kind !== "out" && (
            <button
              type="button"
              className="x-primary x-confirm__start"
              disabled={block !== undefined}
              onClick={() =>
                onStart(
                  lens,
                  lens === "insar" && chosen !== undefined
                    ? { pairId: chosen.pairId, threshold }
                    : undefined,
                )
              }
              data-testid="confirm-start"
            >
              {offline ? CONFIRM.startCase : CONFIRM.startAnalysis}
            </button>
          )}
          <button type="button" className="x-ghost" onClick={onMove} data-testid="confirm-move">
            {CONFIRM.edit}
          </button>
          <button type="button" className="x-text" onClick={onCancel} data-testid="confirm-cancel">
            {CONFIRM.cancel}
          </button>
        </div>
      </footer>
    </section>
  );
};

type GcovPassesProps = {
  lens: Exclude<V9LensId, "insar">;
  coverage: Coverage;
  passes: PassState;
  next: { date: string; track: string; direction: string } | undefined;
  nearest: Nearest | undefined;
  onOpenCase: (item: Case) => void;
};

// The image lenses: the passes /coverage chose, and the note for 4, 3 or fewer, or none.
// The full pass total ("{n} NISAR passes here · …") waits for backend #18, so it is not drawn.
const GcovPasses = ({ lens, coverage, passes, next, nearest, onOpenCase }: GcovPassesProps) => {
  if (passes.kind === "none")
    return (
      <div className="x-confirm__note" role="status" data-testid="confirm-note">
        <p className="x-confirm__note-title">{CONFIRM_NOTES.noDataTitle}</p>
        {next !== undefined && (
          <p>{CONFIRM_NOTES.noDataBody(next.date, next.track, next.direction)}</p>
        )}
        {nearest !== undefined && (
          <button
            type="button"
            className="x-ghost"
            onClick={() => onOpenCase(nearest.item)}
            data-testid="spot-nearest"
          >
            {CONFIRM_NOTES.noDataAction}
          </button>
        )}
      </div>
    );
  const dates = chosenDates(coverage);
  const series = seriesOf(coverage.plan.seriesKey);
  return (
    <>
      <div className="x-confirm__block">
        <p className="x-kicker x-kicker--split">
          <span className="x-confirm__label">
            {CONFIRM.stripLabel(lens)}
            <InfoTip
              label={INFO_TIP.label}
              title={CONFIRM.stripLabel(lens)}
              text={TIPS.strip.gcov}
              testId="tip-strip"
            />
          </span>
          <span>{CONFIRM.preset(PRESET_NAME[lens])}</span>
        </p>
        <GcovStrip dates={dates} />
        {series !== undefined && (
          <p className="x-confirm__line" data-testid="confirm-series">
            {MEASURED_CASE.passLine(dates.length, series.track, series.direction)}
          </p>
        )}
      </div>
      {passes.kind === "four" && (
        <div className="x-confirm__note" role="status" data-testid="confirm-note">
          <p className="x-confirm__note-title">{CONFIRM_NOTES.fourTitle}</p>
          <p>{CONFIRM_NOTES.fourBody(day(passes.gap[0]), day(passes.gap[1]))}</p>
        </div>
      )}
      {passes.kind === "few" && (
        <div className="x-confirm__note" role="status" data-testid="confirm-note">
          <p className="x-confirm__note-title">{CONFIRM_NOTES.fewTitle}</p>
          <p>{CONFIRM_NOTES.fewBody(passes.count)}</p>
        </div>
      )}
    </>
  );
};
