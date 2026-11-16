import { useState } from "react";

import { coherenceOnlyLabel, findLens, type Case } from "@/features/cases/cases";
import { Link } from "@/lib/Link";
import { ProvenanceChip } from "@/lib/ProvenanceChip";
import { esriImageryUrl } from "@/pages/landing/eventImagery";
import { caseCountry, caseHref, caseSummary } from "@/pages/cases/casesView";

import { tr } from "@/i18n/translate";
type LandingCaseCardProps = {
  item: Case;
};

// Shows the case point from orbit. If the imagery service fails, the card keeps its text on the
// night background: no stand-in picture, so nothing looks like a result it isn't.
export const LandingCaseCard = ({ item }: LandingCaseCardProps) => {
  const [failed, setFailed] = useState(false);
  const coherenceOnly = item.coherenceOnly === true;
  const lens = findLens(item.lens);
  const meta = [item.region.toUpperCase(), item.when.toUpperCase(), lens?.chip.toUpperCase()]
    .filter((part) => part !== undefined)
    .join(" · ");

  return (
    <Link to={caseHref(item)} className="l-card" testId={`landing-case-${item.id}`}>
      {!failed && (
        <img
          src={esriImageryUrl(item.focus)}
          alt={`Satellite view around ${item.name}`}
          width={680}
          height={850}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
      <span className="l-card__marker" aria-hidden="true" />
      <span
        className={coherenceOnly ? "l-card__chip l-card__chip--coherence" : "l-card__chip"}
        data-testid={`landing-chip-${item.id}`}
      >
        {coherenceOnly
          ? coherenceOnlyLabel(item).toUpperCase()
          : "MEASURED CASE · ESRI WORLD IMAGERY"}
      </span>
      <span className="l-card__text">
        <span className="l-card__meta">
          {meta} <ProvenanceChip kind="offline" />
        </span>
        <span className="l-card__name">
          {item.name}, {caseCountry(item)}
        </span>
        <span className="l-card__summary">{caseSummary(item)}</span>
        <span className="l-card__action">{tr("Open on the globe →")}</span>
      </span>
    </Link>
  );
};
