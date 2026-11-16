import "@/features/result/result.css";

import { STEP_6, STEP_7 } from "@/content/copyV8";
import { RESULT, RESULT_CARD, statOf, type V9LensId } from "@/content/copyV9";
import { Icon } from "@/features/case-panel/icons";
import { VerdictGlyph } from "@/features/case-panel/Verdict";
import type { Subject } from "@/features/case-panel/subject";
import { HazardIcon } from "@/features/cases/HazardIcon";
import { findLens, type TimelinePass } from "@/features/cases/cases";
import {
  ACTIVE_STATUSES,
  lensEvaluationOf,
  type ExplorationView,
} from "@/features/explore/exploreSchemas";
import type { LonLat } from "@/features/frames/frame.types";
import { floodDrivers } from "@/features/lenses/drivers";
import { FirmsWitness } from "@/features/lenses/FirmsWitness";
import { OpticalWitness } from "@/features/lenses/OpticalWitness";
import { witnessOf } from "@/features/lenses/opticalWitnessView";
import { PossibleDrivers } from "@/features/lenses/PossibleDrivers";
import { lensReasons } from "@/features/lenses/reasons";
import { surroundingsRow } from "@/features/lenses/surroundings";
import { SurroundingsBlock } from "@/features/lenses/SurroundingsBlock";
import { VERDICT_LABEL } from "@/features/lenses/verdictLabel";
import { formatLonLat } from "@/features/live/liveQuestion";
import { originOf, rangeLineOf, resultBody, resultStat } from "@/features/result/resultStat";
import { ProvenanceChip } from "@/lib/ProvenanceChip";

const ACTIVE: readonly string[] = ACTIVE_STATUSES;

type Props = {
  lens: V9LensId;
  view: ExplorationView;
  subject: Subject;
  point: LonLat;
  passes: TimelinePass[];
  onNewSquare: () => void;
  onMore: () => void;
};

/*
 * The v9 result card (SPECS-flow-v9 §3, with the 15 Nov corrections): chips · lens and place · title
 * and range · stat N of M · could also be / not shown · place a new square. The v8 evidence the card
 * doesn't draw (OPERA witness, surroundings, flood drivers) stays one tap away, closed by default.
 */
export const ResultCard = ({ lens, view, subject, point, passes, onNewSquare, onMore }: Props) => {
  const result = view.result;
  if (result === null) return null;
  const copy = RESULT_CARD[lens];
  const origin = originOf(view);
  const stat = resultStat(lens, result);
  const range = rangeLineOf(lens, result, passes);
  const evaluation = lensEvaluationOf(result);
  const witness =
    lens === "flood_wetland" ? witnessOf(evaluation, ACTIVE.includes(view.status)) : undefined;
  const drivers = lens === "flood_wetland" ? floodDrivers(evaluation) : undefined;
  const surroundings = surroundingsRow(evaluation);
  // A lens the backend couldn't evaluate claims nothing: its title gives way to the v8 "Not enough
  // data" line and its reasons. Ground motion has no verdict at all, so it never takes this path.
  const insufficient = lens !== "insar" && subject.verdict === "insufficient";
  const hasEvidence = witness !== undefined || drivers !== undefined || surroundings !== undefined;
  return (
    <div className="x-result" data-testid="result-card" data-lens={lens}>
      <p className="x-result__chips" data-testid="result-chips">
        <span className="x-result__chip" data-testid="result-origin" data-origin={origin}>
          {origin === "offline" ? RESULT.offline : RESULT.online}
        </span>
        {result.isDemo ? (
          <ProvenanceChip kind="demo" />
        ) : (
          <span className="x-result__chip" data-testid="result-measured">
            {RESULT.measured}
          </span>
        )}
        {/* TODO(#59): InfoTip title={RESULT.measured} text={TIPS.chips} */}
      </p>

      <div className="x-result__place">
        <span className="x-lcard__icon">
          <HazardIcon id={findLens(lens)?.icon ?? "flood"} size={18} />
        </span>
        <div>
          <p className="x-kicker" data-testid="result-phen">
            {copy.phen}
          </p>
          <p className="x-result__where" data-testid="result-place">
            {RESULT.placeYourSquare(formatLonLat(point))}
          </p>
        </div>
      </div>

      <div className="x-result__head">
        {insufficient ? (
          <>
            <h3 className="x-result__title" data-testid="verdict" data-verdict="insufficient">
              <VerdictGlyph verdict="insufficient" />
              {VERDICT_LABEL.insufficient}
            </h3>
            <ul className="x-lcard__reasons" data-testid="lens-reasons">
              {lensReasons(result.lens?.reason).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </>
        ) : (
          <h3 className="x-result__title" data-testid="result-title">
            {copy.title}
          </h3>
        )}
        {range !== undefined && (
          <p className="x-result__range" data-testid="result-range">
            {range}
          </p>
        )}
        {!insufficient && (
          <p className="x-result__body" data-testid="result-body">
            {resultBody(lens, result)}
          </p>
        )}
      </div>

      {stat !== undefined && (
        <p className="x-result__stat" data-testid="result-stat">
          <span className="x-result__k">{statOf(stat.k, stat.n)}</span>
          <span className="x-result__label">{stat.label}</span>
          {/* TODO(#59): InfoTip title={RESULT.measured} text={TIPS.stat} */}
        </p>
      )}

      <dl className="x-result__lines">
        <div data-testid="result-could-be">
          <dt>{RESULT.couldBeLabel}</dt>
          <dd>{copy.couldBe}</dd>
        </div>
        {/* Names what is not shown; the honesty scan skips it on purpose. */}
        <div data-testid="result-not-shown" data-negation>
          <dt>{RESULT.notShownLabel}</dt>
          <dd>{copy.notShown}</dd>
        </div>
      </dl>

      {lens === "wildfire" && subject.fireContext !== undefined && (
        <FirmsWitness context={subject.fireContext} />
      )}

      {hasEvidence && (
        <details className="x-result__evidence" data-testid="result-evidence">
          <summary data-testid="result-evidence-toggle">{STEP_7.evidenceTitle}</summary>
          <div className="x-result__evidence-body">
            {witness !== undefined && (
              <section className="x-lcard__slot" data-testid="lens-slot-witness">
                <OpticalWitness witness={witness} />
              </section>
            )}
            {surroundings !== undefined && <SurroundingsBlock row={surroundings} />}
            {drivers !== undefined && (
              <section className="x-lcard__slot" data-testid="lens-slot-drivers">
                <PossibleDrivers view={drivers} />
              </section>
            )}
          </div>
        </details>
      )}

      <button
        type="button"
        className="x-result__new"
        onClick={onNewSquare}
        data-testid="result-new-square"
      >
        {RESULT.newSquare}
        <Icon name="arrow" size={12} />
      </button>
      <button type="button" className="x-primary" onClick={onMore} data-testid="more-info">
        {STEP_6.moreInfo}
        <Icon name="arrow" size={14} />
      </button>
    </div>
  );
};
