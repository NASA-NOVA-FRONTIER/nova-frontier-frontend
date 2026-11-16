import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { LEARN_COPY } from "@/pages/learn/learnResources";

import { tr } from "@/i18n/translate";
const KEY_STEP = 5;

// Kept off the very edges so the handle never leaves the frame.
const clamp = (value: number): number => Math.max(2, Math.min(98, value));

// Optical on the left of the split, radar on the right (the landing slider is the other way round,
// so this one reads "eyes, then radar"). It never moves by itself, so reduced motion needs nothing.
export const RadarCompare = () => {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [split, setSplit] = useState(50);

  const splitAt = (clientX: number) => {
    const frame = frameRef.current;
    if (frame === null) return;
    const { left, width } = frame.getBoundingClientRect();
    setSplit(clamp(((clientX - left) / width) * 100));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    splitAt(event.clientX);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) splitAt(event.clientX);
  };

  const onPointerEnd = () => {
    dragging.current = false;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next: Record<string, (value: number) => number> = {
      ArrowLeft: (value) => value - KEY_STEP,
      ArrowDown: (value) => value - KEY_STEP,
      ArrowRight: (value) => value + KEY_STEP,
      ArrowUp: (value) => value + KEY_STEP,
      Home: () => 2,
      End: () => 98,
    };
    const step = next[event.key];
    if (step === undefined) return;
    event.preventDefault();
    setSplit((value) => clamp(Math.round(step(value))));
  };

  const value = Math.round(split);

  return (
    <section className="lr-compare" aria-label={tr("See like a radar")} data-testid="learn-compare">
      <div
        ref={frameRef}
        className="lr-compare__frame"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <img
          src="/landing/radar-north-dakota.jpg"
          alt={tr("NISAR radar view of farmland in North Dakota")}
          width={2048}
          height={1103}
          draggable={false}
        />
        <img
          src="/landing/optical-north-dakota.jpg"
          alt={tr("Optical view of the same farmland")}
          width={1580}
          height={851}
          draggable={false}
          style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
        />
        <div className="lr-compare__line" style={{ left: `${split}%` }}>
          <div
            className="lr-compare__handle"
            role="slider"
            tabIndex={0}
            aria-label={tr("Optical and radar split")}
            aria-valuemin={2}
            aria-valuemax={98}
            aria-valuenow={value}
            aria-valuetext={`${value}% optical`}
            onKeyDown={onKeyDown}
            data-testid="learn-compare-slider"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
            </svg>
          </div>
        </div>
        <span className="lr-compare__tag lr-compare__tag--left">{LEARN_COPY.compareEyes}</span>
        <span className="lr-compare__tag lr-compare__tag--right">{LEARN_COPY.compareRadar}</span>
      </div>
      <p className="lr-compare__caption">{LEARN_COPY.compareCaption}</p>
    </section>
  );
};
