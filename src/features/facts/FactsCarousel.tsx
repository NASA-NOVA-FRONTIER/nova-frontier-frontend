import { useEffect, useRef, useState } from "react";

import { STEP_3 } from "@/content/copyV8";
import { getFacts } from "@/content/facts";

// SPECS-v8 §3: "auto-advance every 7 s".
const ROTATE_MS = 7000;

type FactsCarouselProps = { reduceMotion: boolean };

// While the radar works: one sourced fact at a time. It rotates until the reader hovers or focuses
// anywhere inside it, or presses Pause; under reduced motion it never moves on its own.
export const FactsCarousel = ({ reduceMotion }: FactsCarouselProps) => {
  const facts = getFacts();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [held, setHeld] = useState(false);
  const paused = hovered || focused || held || reduceMotion;
  const rootRef = useRef<HTMLElement>(null);

  // Hovering or focusing anywhere inside pauses it (the whole card, not only its buttons).
  useEffect(() => {
    const root = rootRef.current;
    if (root === null) return;
    const enter = () => setHovered(true);
    const leave = () => setHovered(false);
    const focusIn = () => setFocused(true);
    const focusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node) || !root.contains(event.relatedTarget))
        setFocused(false);
    };
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointerleave", leave);
    root.addEventListener("focusin", focusIn);
    root.addEventListener("focusout", focusOut);
    return () => {
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointerleave", leave);
      root.removeEventListener("focusin", focusIn);
      root.removeEventListener("focusout", focusOut);
    };
  }, []);

  useEffect(() => {
    if (paused || facts.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((value) => (value + 1) % facts.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [paused, facts.length]);

  const fact = facts[index];
  if (fact === undefined) return null;
  const step = (delta: number) =>
    setIndex((value) => (value + delta + facts.length) % facts.length);
  return (
    <section
      ref={rootRef}
      className="x-facts-carousel"
      aria-label="Did you know"
      data-testid="facts-carousel"
      data-paused={paused}
    >
      <div className="x-facts-carousel__head">
        <p className="x-kicker x-facts-carousel__kicker" data-testid="fact-count">
          {STEP_3.didYouKnow(index + 1, facts.length)}
        </p>
        <span className="x-facts-carousel__nav">
          <button type="button" onClick={() => step(-1)} aria-label="Previous fact">
            ‹
          </button>
          <button
            type="button"
            onClick={() => setHeld((value) => !value)}
            aria-pressed={held}
            aria-label={held ? "Resume the facts" : "Pause the facts"}
            data-testid="fact-pause"
          >
            {held ? "▶" : "❚❚"}
          </button>
          <button type="button" onClick={() => step(1)} aria-label="Next fact">
            ›
          </button>
        </span>
      </div>
      <div className="x-facts-carousel__body" aria-live="polite" data-testid="fact-body">
        {fact.image !== undefined && (
          <img
            className="x-facts-carousel__img"
            src={fact.image.src}
            alt=""
            data-pixel={fact.image.pixel}
            data-testid="fact-image"
          />
        )}
        {fact.image?.credit !== undefined && (
          <p className="x-facts-carousel__credit" data-testid="fact-credit">
            {fact.image.credit}
          </p>
        )}
        {fact.title !== undefined && (
          <p className="x-facts-carousel__title" data-testid="fact-title">
            {fact.title}
          </p>
        )}
        <p className="x-facts-carousel__text" data-testid="fact-text">
          {fact.text}
        </p>
      </div>
      <p className="x-facts-carousel__source">
        <a href={fact.source.href} target="_blank" rel="noopener" data-testid="fact-source">
          {fact.source.label}
        </a>
        <span className="x-facts-carousel__dots" aria-hidden="true">
          {facts.map((item, at) => (
            <span key={item.id} className="x-facts-carousel__dot" data-on={at === index} />
          ))}
        </span>
      </p>
    </section>
  );
};
