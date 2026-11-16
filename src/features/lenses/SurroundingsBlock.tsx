import { STEP_6 } from "@/content/copyV8";
import { Prov } from "@/features/case-panel/Prov";
import { VerdictGlyph } from "@/features/case-panel/Verdict";
import type { SurroundingsRow } from "@/features/lenses/surroundings";

const SURROUNDINGS_GLYPH = {
  same: "within",
  darker: "departure",
  insufficient: "insufficient",
} as const;

const SOURCE_SURROUNDINGS =
  "Exploration API → result.lens.evaluation.surrounding_comparison (focal patch against matched cells)";

// THIS SPOT VS ITS SURROUNDINGS: the v8 lens card's row, also mounted in the v9 evidence section.
export const SurroundingsBlock = ({ row }: { row: SurroundingsRow }) => (
  <section
    className="x-lcard__section x-lsurround"
    data-rv
    data-testid="lens-surroundings"
    data-state={row.state}
  >
    <p className="x-kicker x-kicker--split">
      <span>{STEP_6.surroundingsTitle}</span>
      <Prov kind="real" source={SOURCE_SURROUNDINGS} />
    </p>
    <p className="x-lsurround__label">
      <VerdictGlyph verdict={SURROUNDINGS_GLYPH[row.state]} />
      {row.label}
    </p>
    <p className="x-lsurround__line">{row.sentence}</p>
  </section>
);
