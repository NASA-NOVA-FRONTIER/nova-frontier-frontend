import "@/pages/method/sections/sections.css";

import type { CSSProperties } from "react";

import { WAVES, WAVES_COPY } from "@/pages/method/sections/sectionsContent";
import {
  scaleBarWidth,
  WAVE_VIEW_WIDTH,
  wavePath,
  waveShift,
} from "@/pages/method/sections/sectionsLogic";

export const Wavelengths = () => (
  <section
    className="m-section"
    data-section
    aria-labelledby="waves-heading"
    data-testid="method-waves"
  >
    <div className="m-section__head" data-reveal>
      <p className="m-kicker">{WAVES_COPY.kicker}</p>
      <h2 id="waves-heading" className="m-h2">
        {WAVES_COPY.title}
      </h2>
      <p className="m-lead">{WAVES_COPY.lead}</p>
    </div>
    <div className="m-waves" data-reveal>
      {WAVES.map((wave) => {
        const motion = {
          "--m-wave-shift": waveShift(wave.cm),
          "--m-wave-loop": `${wave.loopSeconds}s`,
        } as CSSProperties;
        return (
          <div key={wave.band} className="m-wave" data-testid={`wave-${wave.band.toLowerCase()}`}>
            <div className="m-wave__name">
              <span className="m-wave__band">{wave.band}</span>
              <span className="m-wave__len" style={{ color: wave.colour }}>
                {wave.len}
              </span>
            </div>
            <div className="m-wave__track">
              <svg
                viewBox={`0 0 ${WAVE_VIEW_WIDTH} 64`}
                preserveAspectRatio="none"
                className="m-wave__svg"
                style={motion}
                aria-hidden="true"
              >
                <path d={wavePath(wave.cm)} fill="none" stroke={wave.colour} strokeWidth={2.5} />
              </svg>
              <div className="m-wave__scale">
                <span
                  className="m-wave__scale-bar"
                  style={{ width: scaleBarWidth(wave.cm) }}
                  data-testid="wave-scale-bar"
                />
                <span className="m-wave__scale-label">{wave.len}</span>
              </div>
            </div>
            <div className="m-wave__reach">
              <span className="m-wave__reach-text">{wave.reach}</span>
              <span className="m-wave__who">{wave.who}</span>
            </div>
          </div>
        );
      })}
      <p className="m-waves__note">{WAVES_COPY.footnote}</p>
    </div>
  </section>
);
