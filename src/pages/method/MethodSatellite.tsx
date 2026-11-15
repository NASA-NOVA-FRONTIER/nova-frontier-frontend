import { useCallback, useRef, useState } from "react";

import { NisarSatellite } from "@/features/satellite/NisarSatellite";
import { MOBILE_MAX_PX } from "@/features/satellite/mobileFallback";
import { SATELLITE_COPY, SATELLITE_FALLBACK_IMAGE } from "@/features/satellite/satelliteParts";
import { prefersReducedMotion } from "@/lib/motion";
import { SAT_STAGE } from "@/pages/method/methodContent";
import {
  SAT_STEPS,
  type SatStep,
  satStagePose,
  satStepIndex,
  satStepProgress,
} from "@/pages/method/satSteps";

// Phones get no 3D model: the same steps read as a list beside two NASA/JPL photos.
const isPhone = (): boolean => window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches;

const counter = (index: number): string =>
  `${String(index + 1).padStart(2, "0")} / ${String(SAT_STEPS.length).padStart(2, "0")}`;

const StepBody = ({ step }: { step: SatStep }) => (
  <>
    {step.items.map((item) => (
      <div key={item.title} className="m-sat__item">
        <h3 className="m-sat__step-title">{item.title}</h3>
        <p className="m-sat__step-body">{item.body}</p>
      </div>
    ))}
    <p className="m-sat__sources">
      {step.sources.map((source) => (
        <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer">
          {source.label} →
        </a>
      ))}
    </p>
  </>
);

const SatList = () => (
  <section
    className="m-sat-list"
    aria-labelledby="sat-heading"
    data-testid="method-satellite"
    data-variant="list"
  >
    <p id="sat-heading" className="m-sat__kicker">
      {SAT_STAGE.kicker}
    </p>
    <figure className="m-sat-list__photo">
      <img
        src={SATELLITE_FALLBACK_IMAGE}
        alt={SATELLITE_COPY.fallbackAlt}
        width={1280}
        height={989}
        loading="lazy"
      />
      <figcaption>{SAT_STAGE.photoCaption}</figcaption>
    </figure>
    <ol className="m-sat-list__steps">
      {SAT_STEPS.map((step, i) => (
        <li key={step.kicker} className="m-sat__step" data-testid={`sat-step-${i + 1}`}>
          <p className="m-sat__step-kicker">
            {counter(i)} · {step.kicker}
          </p>
          <StepBody step={step} />
          {/* The second photo sits with the deployment it was taken during. */}
          {i === 1 && (
            <figure className="m-sat-list__photo">
              <img
                src={SAT_STAGE.deployPhoto.src}
                alt={SAT_STAGE.deployPhoto.alt}
                width={1600}
                height={1065}
                loading="lazy"
              />
              <figcaption>{SAT_STAGE.deployPhoto.caption}</figcaption>
            </figure>
          )}
        </li>
      ))}
    </ol>
  </section>
);

// Desktop: a tall track with a sticky stage. The model comes apart as the page scrolls; the left
// column names the piece in focus and what it does. Every step is a button, so the keyboard can
// walk the teardown, and a live region announces the step that the scroll lands on.
const SatStage = () => {
  const section = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  // Re-render only when the step changes, not on every scroll frame.
  const onProgress = useCallback((progress: number) => setStep(satStepIndex(progress)), []);

  const goTo = (index: number) => {
    const element = section.current;
    if (element === null) return;
    const travel = element.offsetHeight - window.innerHeight;
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top + satStepProgress(index) * travel,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  const current = SAT_STEPS[step];

  return (
    <section
      ref={section}
      className="m-sat"
      data-sat-track
      aria-labelledby="sat-heading"
      data-testid="method-satellite"
      data-variant="stage"
    >
      <div className="m-sat__stage">
        <NisarSatellite
          className="m-sat__model"
          scrollDriven
          hotspots
          offsetX={0.16}
          earth="/landing/earth-day.jpg"
          caption={SAT_STAGE.photoCaption}
          onProgress={onProgress}
          stage={satStagePose}
        />
        <div className="m-sat__text">
          <p id="sat-heading" className="m-sat__kicker">
            {SAT_STAGE.kicker}
          </p>
          <ol className="m-sat__steps">
            {SAT_STEPS.map((item, i) => (
              <li
                key={item.kicker}
                className={i === step ? "m-sat__step m-sat__step--on" : "m-sat__step"}
                aria-current={i === step ? "step" : undefined}
                data-testid={`sat-step-${i + 1}`}
              >
                <button
                  type="button"
                  className="m-sat__step-kicker"
                  onClick={() => goTo(i)}
                  data-testid={`sat-go-${i + 1}`}
                >
                  <span aria-hidden="true" />
                  {counter(i)} · {item.kicker}
                </button>
                {i === step && <StepBody step={item} />}
              </li>
            ))}
          </ol>
          <p className="m-sat__live" aria-live="polite" data-testid="sat-live">
            {current !== undefined &&
              `${counter(step)} · ${current.kicker}. ${current.items.map((it) => it.title).join(". ")}`}
          </p>
        </div>
        <p className="m-sat__foot">{SAT_STAGE.footnote}</p>
      </div>
    </section>
  );
};

export const MethodSatellite = () => {
  const [phone] = useState(isPhone);
  return phone ? <SatList /> : <SatStage />;
};
