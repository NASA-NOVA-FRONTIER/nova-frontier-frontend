import "@/pages/landing/atlas.css";

import { useState } from "react";

import { ATLAS_DEFAULT_ID, ATLAS_TILE_PX, ATLAS_TILES } from "@/pages/landing/atlasTiles";

import { tr } from "@/i18n/translate";
const CHIP_TITLE =
  "nova-frontier-model, global surface atlas: a fixed colour projection of a learned representation. Regional examples, not a validated classifier.";

export const SurfaceAtlas = () => {
  const [openId, setOpenId] = useState(ATLAS_DEFAULT_ID);

  return (
    <section
      className="s-section l-atlas"
      data-section
      aria-labelledby="atlas-heading"
      data-testid="surface-atlas"
    >
      <div className="s-container l-atlas__inner">
        <div className="l-atlas__head">
          <div className="l-atlas__intro">
            <p className="s-mono-label" data-reveal>
              {tr("SIX CONTINENTS OF REAL NISAR DATA")}
            </p>
            <h2 id="atlas-heading" className="l-atlas__heading" data-reveal>
              {tr("How each place's echo behaves over time.")}
            </h2>
            <p className="l-atlas__body" data-reveal>
              {tr(
                "Months of measured passes compressed into colour by one shared model. Similar colours mean similar radar histories, not the same land cover.",
              )}
            </p>
          </div>
          {/* ProvenanceChip only says "EXPERIMENTAL"; the source name rides on the same chip style. */}
          <span
            className="c-prov c-prov--experimental l-atlas__chip"
            title={CHIP_TITLE}
            data-testid="atlas-chip"
            data-reveal
          >
            {tr("EXPERIMENTAL · NOVA-FRONTIER-MODEL")}
          </span>
        </div>
        <div className="l-atlas__strip" data-reveal>
          {ATLAS_TILES.map(({ id, name, meta, img, fallback }) => {
            const open = id === openId;
            const pick = () => setOpenId(id);
            return (
              <button
                key={id}
                type="button"
                className="l-atlas__tile"
                aria-expanded={open}
                aria-label={`${name}, ${meta}`}
                data-testid={`atlas-tile-${id}`}
                onMouseEnter={pick}
                onFocus={pick}
                onClick={pick}
              >
                <picture>
                  <source srcSet={img} type="image/webp" />
                  <img
                    className="l-atlas__img"
                    src={fallback}
                    alt=""
                    width={ATLAS_TILE_PX}
                    height={ATLAS_TILE_PX}
                    loading="lazy"
                    decoding="async"
                    data-testid={`atlas-img-${id}`}
                  />
                </picture>
                <span className="l-atlas__label" aria-hidden={!open}>
                  <span className="l-atlas__name">{name}</span>
                  <span className="l-atlas__meta">{meta}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
