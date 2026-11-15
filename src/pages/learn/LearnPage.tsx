import "@/pages/site/site.css";
import "@/pages/learn/learn.css";

import { useEffect, useRef, useState } from "react";

import { Link } from "@/lib/Link";
import {
  LEARN_COPY,
  LEARN_STEPS,
  OTHER_RADARS,
  resourceCount,
  type LearnResource,
  type LearnStep,
  type OtherRadar,
} from "@/pages/learn/learnResources";
import { RadarCompare } from "@/pages/learn/RadarCompare";
import { useLearnMotion } from "@/pages/learn/useLearnMotion";
import { SiteFooter } from "@/pages/site/SiteFooter";
import { SiteNav } from "@/pages/site/SiteNav";

// Sets a head tag for the page's lifetime and puts the previous value back on the way out.
const usePageHead = (title: string, description: string): void => {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousTitle = document.title;
    const previousDescription = meta?.content;
    document.title = title;
    if (meta !== null) meta.content = description;
    return () => {
      document.title = previousTitle;
      if (meta !== null && previousDescription !== undefined) meta.content = previousDescription;
    };
  }, [title, description]);
};

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="lr-arrow">
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
);

// An image another ticket adds may not be in the build yet: hide it and keep the dark tile.
const StepFigure = ({ step }: { step: LearnStep }) => {
  const [missing, setMissing] = useState(false);
  return (
    <figure className="lr-step__figure" data-reveal>
      {!missing && (
        <img
          src={step.img}
          alt={step.alt}
          loading="lazy"
          onError={() => setMissing(true)}
          data-testid={`learn-img-${step.anchor}`}
        />
      )}
      <div className="lr-step__shade" aria-hidden="true" />
      <p className="lr-step__n" aria-hidden="true">
        {step.n}
      </p>
      <figcaption className="lr-step__label">
        <h2 className="lr-step__title">{step.title}</h2>
        <p className="lr-step__cap">{step.cap}</p>
      </figcaption>
    </figure>
  );
};

// The whole card is one link (its ::after covers the card); a second link sits above that layer.
const ResourceCard = ({ item }: { item: LearnResource }) => (
  <article className="lr-card" data-reveal data-testid="learn-resource">
    <div className="lr-card__top">
      <span className="lr-card__by">{item.by}</span>
      <span className="lr-card__tags">
        {item.tags.map((tag) => (
          <span key={tag} className="lr-tag">
            {tag}
          </span>
        ))}
        {item.extra && (
          <a
            className="lr-tag lr-tag--link"
            href={item.extra.href}
            target="_blank"
            rel="noopener"
            aria-label={item.extra.ariaLabel}
          >
            {item.extra.label}
          </a>
        )}
      </span>
    </div>
    <h3 className="lr-card__name">
      <a className="lr-card__link" href={item.href} target="_blank" rel="noopener">
        {item.name}
      </a>
    </h3>
    <p className="lr-card__what">{item.what}</p>
    <span className="lr-card__cta" aria-hidden="true">
      {item.cta}
      <ArrowIcon />
    </span>
  </article>
);

const RadarCard = ({ radar }: { radar: OtherRadar }) => (
  <article
    className={`lr-card lr-radar lr-radar--${radar.band.toLowerCase()}`}
    data-reveal
    data-testid="learn-radar"
  >
    <div className="lr-radar__head">
      <span className="lr-radar__band">{radar.band}</span>
      <span className="lr-radar__wave">{radar.wave}</span>
    </div>
    <h3 className="lr-radar__name">
      <a className="lr-card__link" href={radar.href} target="_blank" rel="noopener">
        {radar.name}
      </a>
    </h3>
    <p className="lr-card__what">{radar.what}</p>
    <span className="lr-card__by">{radar.by}</span>
    {radar.extra && (
      <a
        className="lr-radar__extra"
        href={radar.extra.href}
        target="_blank"
        rel="noopener"
        aria-label={radar.extra.ariaLabel}
      >
        {radar.extra.label}
        <ArrowIcon />
      </a>
    )}
  </article>
);

export const LearnPage = () => {
  const root = useRef<HTMLDivElement>(null);
  useLearnMotion(root);
  usePageHead(LEARN_COPY.title, LEARN_COPY.lede);

  return (
    <div ref={root} className="site learn">
      <a href="#main" className="s-skip">
        Skip to content
      </a>
      <SiteNav page="learn" />

      <main id="main" className="lr-main">
        <RadarCompare />

        <header className="lr-hero">
          <div className="lr-hero__copy">
            <p className="s-mono-label lr-hero__kicker" data-intro>
              {LEARN_COPY.kicker}
            </p>
            <h1 className="lr-hero__title" data-intro>
              {LEARN_COPY.heading}
            </h1>
            <p className="lr-hero__lede" data-intro>
              {LEARN_COPY.lede}
            </p>
          </div>
          <ol className="lr-index" data-intro data-testid="learn-index">
            {LEARN_STEPS.map((step) => (
              <li key={step.anchor}>
                <a href={`#${step.anchor}`} data-testid={`learn-index-${step.anchor}`}>
                  <span className="lr-index__n">{step.n}</span>
                  <span className="lr-index__title">{step.title}</span>
                  <span className="lr-index__count">{resourceCount(step)}</span>
                </a>
              </li>
            ))}
          </ol>
        </header>

        {LEARN_STEPS.map((step) => (
          <section
            key={step.anchor}
            id={step.anchor}
            className="lr-step"
            data-section
            data-testid={`learn-step-${step.anchor}`}
          >
            <div className="lr-step__side">
              <StepFigure step={step} />
              <p className="lr-step__why" data-reveal>
                {step.why}
              </p>
            </div>
            <div className="lr-step__cards">
              {step.items.map((item) => (
                <ResourceCard key={item.href} item={item} />
              ))}
            </div>
          </section>
        ))}

        <section className="lr-others" data-section aria-labelledby="learn-others-heading">
          <div className="lr-others__intro" data-reveal>
            <p className="s-mono-label lr-others__kicker">{LEARN_COPY.othersKicker}</p>
            <h2 id="learn-others-heading" className="lr-others__title">
              {LEARN_COPY.othersHeading}
            </h2>
            <p className="lr-others__body">{LEARN_COPY.othersBody}</p>
          </div>
          <div className="lr-others__grid">
            {OTHER_RADARS.map((radar) => (
              <RadarCard key={radar.name} radar={radar} />
            ))}
          </div>
          <p className="lr-disclaimer" data-reveal data-testid="learn-disclaimer">
            {LEARN_COPY.disclaimer}
          </p>
        </section>

        <section className="lr-close" data-section>
          <h2 className="lr-close__title" data-reveal>
            {LEARN_COPY.ctaHeading}
          </h2>
          <div data-reveal>
            <Link to="/explore" className="lr-close__cta" testId="learn-cta">
              {LEARN_COPY.cta}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter
        lon={-74.07}
        lat={4.71}
        coordLabel="BOGOTÁ · 4.71° N, 74.07° W"
        kicker="HECHO EN COLOMBIA · MADE IN COLOMBIA"
        headline={LEARN_COPY.footerHeadline}
      />
    </div>
  );
};
