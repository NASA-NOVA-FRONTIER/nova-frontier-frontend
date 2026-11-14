import "@/pages/site/site.css";
import "@/pages/cases/cases.css";

import { useEffect, useRef, useState } from "react";

import {
  CASES,
  coherenceOnlyLabel,
  findLens,
  type Case,
  type CaseVerdict,
} from "@/features/cases/cases";
import { HazardIcon } from "@/features/cases/HazardIcon";
import { ContrastBars } from "@/features/charts/ContrastBars";
import { Link } from "@/lib/Link";
import { ProvenanceChip } from "@/lib/ProvenanceChip";
import {
  caseHref,
  filterCases,
  filterOptions,
  QUESTION_ICONS,
  statSource,
  VERDICT_LABEL,
  type CaseFilter,
} from "@/pages/cases/casesView";
import { useCasesMotion } from "@/pages/cases/useCasesMotion";
import { SiteFooter } from "@/pages/site/SiteFooter";
import { SiteNav } from "@/pages/site/SiteNav";

const TITLE = "Measured cases · NISAR Hazard Watch";

const OPTIONS = filterOptions();

const VerdictGlyph = ({ verdict }: { verdict: CaseVerdict }) => (
  <span className={`k-glyph k-glyph--${verdict}`} aria-hidden="true" />
);

const CaseCard = ({ item }: { item: Case }) => {
  const coherenceOnly = item.coherenceOnly === true;
  const source = item.sources[0];
  const group = item.groups?.[0];
  return (
    <article className="k-card" data-card data-testid={`case-card-${item.id}`}>
      <div className="k-card__head">
        <span className="k-icon">
          <HazardIcon id={item.hazard} size={18} />
        </span>
        <div className="k-card__titles">
          <p className="k-card__kicker">
            {item.region} · {item.when}
          </p>
          <h2 className="k-card__title">
            {item.name}, {item.place}
          </h2>
        </div>
      </div>

      <div className="k-card__chips">
        <span className="k-chip">{findLens(item.lens)?.chip}</span>
        <span className="k-chip k-chip--verdict">
          <VerdictGlyph verdict={item.verdict} />
          {VERDICT_LABEL[item.verdict]}
        </span>
        {coherenceOnly ? (
          // A real median but no layer to open: it names the state and, unlike REAL, never hides.
          <span
            className="c-prov c-prov--real"
            title={statSource(item)}
            data-testid="prov-coherence-only"
          >
            {coherenceOnlyLabel(item)}
          </span>
        ) : (
          <ProvenanceChip kind="real" source={statSource(item)} />
        )}
      </div>

      <div className="k-card__stat">
        <div>
          <p className="k-card__value">{item.stat}</p>
          <p className="k-card__line">{item.statLine}</p>
        </div>
        {item.crops !== undefined && (
          <img
            className="k-card__thumb"
            src={item.crops.change}
            alt={`Radar change map over ${item.name}, from the science team's report`}
            title="Radar change crop from the nova-frontier-model report"
            width={72}
            height={72}
            loading="lazy"
          />
        )}
      </div>

      {group !== undefined && <ContrastBars group={group} mode="plain" compact />}

      <p className="k-card__limit">{item.plainLimit}</p>

      <div className="k-card__foot">
        {source !== undefined && (
          <a href={source.href} className="k-card__source" target="_blank" rel="noopener">
            {source.label}
          </a>
        )}
        <Link to={caseHref(item)} className="k-card__cta" testId={`case-open-${item.id}`}>
          Open on the globe
        </Link>
      </div>
    </article>
  );
};

export const CasesPage = () => {
  const root = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<CaseFilter>("all");
  useCasesMotion(root, filter);

  useEffect(() => {
    const previous = document.title;
    document.title = TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  const shown = filterCases(CASES, filter);

  return (
    <div ref={root} className="site cases">
      <a href="#main" className="s-skip">
        Skip to content
      </a>
      <SiteNav page="cases" />

      <main id="main" className="k-main">
        <header className="k-intro" data-intro>
          <p className="k-intro__kicker">MEASURED CASES · REAL NISAR PASSES, PRECOMPUTED</p>
          <h1 className="k-intro__title">Four places, measured honestly.</h1>
          <p className="k-intro__lead">
            Each case compares real radar passes with the place&apos;s own history and, where it
            exists, a second witness. Numbers come from the science team&apos;s published reports.
            Open any case to see it on the globe.
          </p>
        </header>

        <div className="k-filters" role="group" aria-label="Filter by question">
          {OPTIONS.map(({ id, label, icon, count }) => (
            <button
              key={id}
              type="button"
              className="k-filter"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              data-testid={`cases-filter-${id}`}
            >
              {icon !== undefined && <HazardIcon id={icon} size={15} />}
              {label}
              <span className="k-filter__count">{count}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="k-empty" data-testid="cases-empty">
            No measured case asks this question yet. The lens works on any point in the explorer.
          </p>
        ) : (
          <div className="k-grid" data-testid="cases-grid">
            {shown.map((item) => (
              <CaseCard key={item.id} item={item} />
            ))}
          </div>
        )}

        <section className="k-ask" data-card aria-labelledby="ask-heading">
          <div className="k-ask__copy">
            <p className="k-ask__kicker">ANY PLACE ON LAND</p>
            <h2 id="ask-heading" className="k-ask__title">
              Your place isn&apos;t here? Ask the radar.
            </h2>
            <p className="k-ask__body">
              Search any place in the explorer and read its last five NISAR passes in one to four
              minutes, through the same four questions.
            </p>
          </div>
          <div className="k-ask__actions">
            <div className="k-ask__icons">
              {QUESTION_ICONS.map(({ id, label }) => (
                <span
                  key={id}
                  className="k-icon k-icon--large"
                  role="img"
                  aria-label={label}
                  title={label}
                  data-testid={`ask-icon-${id}`}
                >
                  <HazardIcon id={id} size={22} />
                </span>
              ))}
            </div>
            <Link to="/explore" className="s-button k-ask__cta" testId="cases-ask-cta">
              Open the explorer
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter
        lon={73.713}
        lat={32.329}
        coordLabel="QADIRABAD · 32.33° N, 73.71° E"
        kicker="HECHO EN COLOMBIA · MADE IN COLOMBIA"
        headline="Every number here links back to the report it came from."
      />
    </div>
  );
};
