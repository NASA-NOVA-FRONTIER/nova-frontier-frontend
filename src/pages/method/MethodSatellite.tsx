import { useCallback, useState } from "react";

import { NisarSatellite } from "@/features/satellite/NisarSatellite";
import { SAT_STAGE } from "@/pages/method/methodContent";
import { MOBILE_MAX_PX } from "@/features/satellite/mobileFallback";
import { satStepIndex } from "@/pages/method/satSteps";

// Phones stack the text over the model: no room to shift it right, and the reading-level switch
// sits where the drag hint would go.
const isPhone = (): boolean => window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches;

export const MethodSatellite = () => {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [phone] = useState(isPhone);
  // Re-render only when the step changes, not on every scroll frame.
  const onProgress = useCallback((progress: number) => setStep(satStepIndex(progress)), []);

  return (
    <section
      className="m-sat"
      data-sat-track
      aria-labelledby="sat-heading"
      data-testid="method-satellite"
    >
      <div className="m-sat__stage">
        <NisarSatellite
          className="m-sat__model"
          scrollDriven
          hotspots
          offsetX={phone ? 0 : 0.16}
          noHint={phone}
          earth="/landing/earth-day.jpg"
          caption={SAT_STAGE.photoCaption}
          onProgress={onProgress}
        />
        <div className="m-sat__text">
          <p id="sat-heading" className="m-sat__kicker">
            {SAT_STAGE.kicker}
          </p>
          <ol className="m-sat__steps">
            {SAT_STAGE.steps.map((item, i) => (
              <li
                key={item.kicker}
                className={i === step ? "m-sat__step m-sat__step--on" : "m-sat__step"}
                aria-current={i === step ? "step" : undefined}
                data-testid={`sat-step-${i + 1}`}
              >
                <p className="m-sat__step-kicker">
                  <span aria-hidden="true" />
                  {item.kicker}
                </p>
                <h3 className="m-sat__step-title">{item.title}</h3>
                <p className="m-sat__step-body">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
        <p className="m-sat__foot">{SAT_STAGE.footnote}</p>
      </div>
    </section>
  );
};
