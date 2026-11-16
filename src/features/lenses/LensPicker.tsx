import { useEffect, useRef } from "react";

import { CASE_LOCK, LENS_CARD, LENS_COPY, STEP_3, STEP_4 } from "@/content/copyV8";
import { Icon } from "@/features/case-panel/icons";
import { HazardIcon } from "@/features/cases/HazardIcon";
import { findLens, type CaseLensId, type LensId } from "@/features/cases/cases";
import { countdown, formatClock } from "@/features/explore/exploreTiming";
import type { ExplorationView } from "@/features/explore/exploreSchemas";
import type { CardLens } from "@/features/lenses/lensSlots";
import { useNow } from "@/lib/useNow";

import { tr } from "@/i18n/translate";
const CARD_LENSES = Object.keys(LENS_COPY) as CardLens[];

const iconOf = (lens: LensId) => findLens(lens)?.icon ?? "flood";

export type LensRun = {
  lens: CardLens;
  // Undefined until the backend has answered the first request of this run.
  view: ExplorationView | undefined;
  receivedAt: number;
};

type RowProps = { run: LensRun; onCancel: () => void };

// SPECS-v8 §5: a compact row under the grid while a lens switch runs; the other lenses stay usable.
const LensRunningRow = ({ run, onCancel }: RowProps) => {
  const now = useNow(true);
  const elapsed =
    run.view === undefined ? 0 : countdown(run.view, run.receivedAt, now).elapsedSeconds;
  return (
    <div className="x-lrun" role="status" aria-live="polite" data-testid="lens-running">
      <span className="x-lrun__dot" aria-hidden="true" />
      <div className="x-lrun__text">
        <p className="x-lrun__title">{STEP_3.compactTitle(LENS_COPY[run.lens].label)}</p>
        <p className="x-lrun__sub" data-testid="lens-running-elapsed">
          {LENS_CARD.runningSub(formatClock(elapsed))}
        </p>
      </div>
      <button
        type="button"
        className="x-round"
        onClick={onCancel}
        aria-label={LENS_CARD.cancelLens}
        title={LENS_CARD.cancelLens}
        data-testid="lens-running-cancel"
      >
        <Icon name="close" size={13} />
      </button>
    </div>
  );
};

type Props = {
  // The open case's own lens can be one no button asks (Niscemi's observed_dynamics).
  lens: CaseLensId;
  // Tabs above a lens result; the full grid otherwise.
  tabs: boolean;
  running: LensRun | undefined;
  // A demo case (issue #28): why its analysis is fixed. Only its own lens stays on.
  locked?: string | undefined;
  onLens: (lens: LensId) => void;
  onCancel: () => void;
};

// The four lenses, their questions and ground motion (decision 2): every control picks a lens the
// same way, so a question link and its button ask the same run and write the same shared link.
export const LensPicker = ({ lens, tabs, running, locked, onLens, onCancel }: Props) => {
  // A locked picker never offers another lens: a demo case can't turn into a live question.
  const off = (id: LensId) => locked !== undefined && id !== lens;
  const why = (id: LensId) => (off(id) ? CASE_LOCK.buttonWhy : undefined);
  // On a phone the tabs are one scrolling row: bring the active tab into it (ground motion is last).
  // Scrolls the row only, never the sheet or the page, as scrollIntoView would.
  const rowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const row = rowRef.current;
    if (row === null) return;
    const active = row.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (active === null) return;
    const box = row.getBoundingClientRect();
    const tab = active.getBoundingClientRect();
    // The fade and the padding cover 32 px at the end; keep the tab clear of them.
    const edge = 32;
    if (tab.right > box.right - edge) row.scrollLeft += tab.right - (box.right - edge);
    else if (tab.left < box.left) row.scrollLeft -= box.left - tab.left;
  }, [lens, tabs]);
  const ground = (
    <button
      type="button"
      className={tabs ? "x-ltab x-ltab--ground" : "x-lground"}
      aria-pressed={lens === "insar"}
      disabled={off("insar")}
      title={why("insar")}
      onClick={() => onLens("insar")}
      data-testid="lens-insar"
    >
      <HazardIcon id={iconOf("insar")} size={tabs ? 13 : 16} />
      <span>{LENS_CARD.groundMotion}</span>
      <span className="x-lground__note">{LENS_CARD.groundMotionNote}</span>
    </button>
  );
  if (tabs)
    return (
      <div
        ref={rowRef}
        role="group"
        aria-label={tr("Lens")}
        className="x-ltabs"
        data-testid="lens-tabs"
      >
        {CARD_LENSES.map((id) => (
          <button
            key={id}
            type="button"
            className="x-ltab"
            aria-pressed={id === lens}
            disabled={off(id)}
            title={why(id)}
            onClick={() => onLens(id)}
            data-testid={`lens-${id}`}
          >
            <HazardIcon id={iconOf(id)} size={13} />
            {LENS_COPY[id].label}
          </button>
        ))}
        {ground}
      </div>
    );
  return (
    <div className="x-lpick" data-testid="lens-picker" data-locked={locked !== undefined}>
      <p className="x-kicker x-lpick__title">{STEP_4.lensTitle}</p>
      {locked !== undefined && (
        <p className="x-lpick__lock" role="note" data-testid="lens-locked">
          {locked}
        </p>
      )}
      <div role="group" aria-label={tr("Lens")} className="x-lgrid">
        {CARD_LENSES.map((id) => (
          <button
            key={id}
            type="button"
            className="x-lbtn"
            aria-pressed={id === lens}
            data-running={running?.lens === id || undefined}
            disabled={off(id)}
            title={why(id)}
            onClick={() => onLens(id)}
            data-testid={`lens-${id}`}
          >
            <HazardIcon id={iconOf(id)} size={18} />
            <span>{LENS_COPY[id].label}</span>
          </button>
        ))}
      </div>
      {running !== undefined && <LensRunningRow run={running} onCancel={onCancel} />}
      <div className="x-lask">
        <p className="x-lask__title">{STEP_4.lensOrAsk}</p>
        {CARD_LENSES.map((id) => (
          <button
            key={id}
            type="button"
            className="x-lask__q"
            onClick={() => onLens(id)}
            data-testid={`lens-ask-${id}`}
          >
            <span aria-hidden="true">→</span>
            {LENS_COPY[id].question}
          </button>
        ))}
      </div>
      {ground}
    </div>
  );
};
