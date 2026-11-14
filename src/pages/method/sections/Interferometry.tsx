import "@/features/charts/charts.css";
import "@/pages/method/sections/sections.css";

import { ProvenanceChip } from "@/lib/ProvenanceChip";
import { INSAR_COPY, INSAR_FIGURES } from "@/pages/method/sections/sectionsContent";

export const Interferometry = () => (
  <section
    className="m-section"
    data-section
    aria-labelledby="insar-heading"
    data-testid="method-insar"
  >
    <div className="m-section__head m-section__head--wide" data-reveal>
      <p className="m-kicker">{INSAR_COPY.kicker}</p>
      <h2 id="insar-heading" className="m-h2">
        {INSAR_COPY.title}
      </h2>
      <p className="m-lead">{INSAR_COPY.lead}</p>
    </div>
    <div className="m-insar" data-reveal>
      {INSAR_FIGURES.map((figure) => (
        <figure
          key={figure.id}
          className="m-insar__figure"
          data-testid={`insar-figure-${figure.id}`}
        >
          <div className="m-insar__frame">
            <img
              src={figure.img}
              alt={figure.alt}
              className="m-insar__img"
              width={357}
              height={357}
              loading="lazy"
              decoding="async"
            />
            <span className="m-insar__tag">{figure.tag}</span>
          </div>
          <figcaption className="m-insar__caption">
            <span className="m-insar__bar" style={{ background: figure.bar }} />
            <span className="m-insar__ends">
              <span>{figure.left}</span>
              <span>{figure.right}</span>
            </span>
            <span className="m-insar__text">{figure.caption}</span>
          </figcaption>
        </figure>
      ))}
    </div>
    <div className="m-insar__stat" data-reveal data-testid="insar-stat">
      <span className="m-insar__stat-num">{INSAR_COPY.stat}</span>
      <span className="m-insar__stat-text">{INSAR_COPY.statText}</span>
      <span className="m-insar__spacer" />
      <span data-testid="insar-chip">
        <ProvenanceChip kind="real" label={INSAR_COPY.chip} source={INSAR_COPY.chipTitle} />
      </span>
    </div>
    <p className="m-insar__note" data-reveal>
      {INSAR_COPY.footnote}
    </p>
  </section>
);
