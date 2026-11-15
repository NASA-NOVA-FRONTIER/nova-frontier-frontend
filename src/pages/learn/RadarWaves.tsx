import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { createRenderLoop } from "@/features/satellite/renderLoop";
import { pixelRatioFor } from "@/features/satellite/satelliteMotion";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { drawFrame, drawStatic } from "@/pages/learn/drawRadarWaves";
import {
  advanceTime,
  ariaLabel,
  BANDS,
  bandById,
  buildScene,
  clampIncidence,
  INCIDENCE,
  POLS,
  pulseGeometry,
  RADAR_WAVES_COPY,
  readout,
  rovingNext,
  type BandId,
  type PolId,
  type Scene,
} from "@/pages/learn/radarWaves";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

type RadioGroupProps<T extends string> = {
  labelId: string;
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  testId: string;
};

// A radiogroup with a roving tabindex: Tab lands on the checked option, the arrows move the choice
// and the focus together (WAI-ARIA radio group pattern).
const RadioGroup = <T extends string>({
  labelId,
  label,
  options,
  value,
  onChange,
  testId,
}: RadioGroupProps<T>) => {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = rovingNext(event.key, index, options.length);
    const option = next === undefined ? undefined : options[next];
    if (next === undefined || option === undefined) return;
    event.preventDefault();
    onChange(option.id);
    buttons.current[next]?.focus();
  };
  return (
    <div className="lr-waves__field">
      <p id={labelId} className="lr-waves__label">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="lr-waves__radios">
        {options.map((option, index) => {
          const checked = option.id === value;
          return (
            <button
              key={option.id}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              className="lr-waves__radio"
              onClick={() => onChange(option.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              data-testid={`${testId}-${option.id}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

type Controls = { band: BandId; pol: PolId; inc: number };

// v9 Radar Waves (#33): a technical cross-section on a canvas. It animates only while on screen and
// the tab is visible; under reduced motion it draws one static frame per change of the controls.
export const RadarWaves = () => {
  const [band, setBand] = useState<BandId>("L");
  const [pol, setPol] = useState<PolId>("HH");
  const [inc, setInc] = useState<number>(INCIDENCE.initial);
  const reduced = useMediaQuery(REDUCED_MOTION);

  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useRef<Controls>({ band, pol, inc });
  const invalidate = useRef<() => void>(() => {});

  // The loop reads the controls from a ref, so changing them never rebuilds it.
  useEffect(() => {
    controls.current = { band, pol, inc };
    invalidate.current();
  }, [band, pol, inc]);

  useEffect(() => {
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const g = canvas?.getContext("2d");
    if (!frame || !canvas || !g) return;

    const monoFont =
      getComputedStyle(canvas).getPropertyValue("--mono").trim() || "ui-monospace, monospace";
    const layer = document.createElement("canvas");
    let scene: Scene | undefined;
    let layerKey = "";
    let t = 0;
    let last: number | undefined;
    let frames = 0;

    const draw = () => {
      const dpr = pixelRatioFor(window.devicePixelRatio);
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (W === 0 || H === 0) return;
      const width = Math.round(W * dpr);
      const height = Math.round(H * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      if (scene?.W !== W || scene.H !== H) scene = buildScene(W, H);
      const key = `${width}x${height}`;
      const lg = layer.getContext("2d");
      if (layerKey !== key && lg) {
        layer.width = width;
        layer.height = height;
        lg.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawStatic(lg, scene);
        layerKey = key;
      }
      const now = performance.now();
      if (!reduced) t = advanceTime(t, last, now);
      last = now;
      const state = controls.current;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFrame(g, scene, layer, pulseGeometry(scene, state.band, state.inc), {
        ...state,
        t,
        reduced,
        monoFont,
      });
      frames += 1;
      canvas.dataset.frames = String(frames);
    };

    const loop = createRenderLoop(draw, {
      continuous: !reduced,
      onRunningChange: (running) => {
        // A paused loop restarts its clock, so time picks up where it stopped.
        if (!running) last = undefined;
        canvas.dataset.running = String(running);
      },
    });
    invalidate.current = loop.invalidate;

    let onScreen = false;
    const sync = () => loop.setVisible(onScreen && !document.hidden);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? false;
      sync();
    });
    io.observe(frame);
    document.addEventListener("visibilitychange", sync);
    const ro = new ResizeObserver(() => loop.invalidate());
    ro.observe(canvas);

    return () => {
      invalidate.current = () => {};
      loop.stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [reduced]);

  const copy = RADAR_WAVES_COPY;
  const text = readout(band, pol, inc);

  return (
    <section
      className="lr-waves"
      data-section
      aria-labelledby="learn-waves-heading"
      data-testid="learn-waves"
    >
      <div className="lr-waves__intro" data-reveal>
        <p className="s-mono-label lr-waves__kicker">{copy.kicker}</p>
        <h2 id="learn-waves-heading" className="lr-waves__title">
          {copy.heading}
        </h2>
        <p className="lr-waves__lede">{copy.lede}</p>
      </div>
      <div className="lr-waves__body">
        <div ref={frameRef} className="lr-waves__figure">
          <div className="lr-waves__stage">
            <canvas
              ref={canvasRef}
              className="lr-waves__canvas"
              role="img"
              aria-label={ariaLabel(band, pol, inc)}
              data-testid="learn-waves-canvas"
            />
          </div>
          <span className="lr-waves__chip">{copy.chip}</span>
          <span className="lr-waves__legend" aria-hidden="true">
            <span className="lr-waves__key">
              <span className="lr-waves__swatch lr-waves__swatch--sent" />
              {copy.sent}
            </span>
            <span className="lr-waves__key">
              <span className={`lr-waves__swatch lr-waves__swatch--${pol.toLowerCase()}`} />
              {copy.echo[pol]}
            </span>
          </span>
        </div>
        <div className="lr-waves__controls">
          <div className="lr-waves__group">
            <RadioGroup
              labelId="learn-waves-band"
              label={copy.bandLabel}
              options={BANDS}
              value={band}
              onChange={setBand}
              testId="learn-waves-band"
            />
            <p className="lr-waves__meta" data-testid="learn-waves-meta">
              {bandById(band).meta}
            </p>
          </div>
          <RadioGroup
            labelId="learn-waves-pol"
            label={copy.polLabel}
            options={POLS}
            value={pol}
            onChange={setPol}
            testId="learn-waves-pol"
          />
          <div className="lr-waves__field">
            <span className="lr-waves__label lr-waves__label--split">
              <label htmlFor="learn-waves-incidence">{copy.incidenceLabel}</label>
              <span className="lr-waves__mono" aria-hidden="true">{`${inc}°`}</span>
            </span>
            <input
              id="learn-waves-incidence"
              type="range"
              className="lr-waves__range"
              min={INCIDENCE.min}
              max={INCIDENCE.max}
              step={INCIDENCE.step}
              value={inc}
              onChange={(event) => setInc(clampIncidence(Number(event.target.value)))}
              aria-valuetext={`${inc}°`}
              data-testid="learn-waves-incidence"
            />
            <span className="lr-waves__ends" aria-hidden="true">
              <span>{copy.steeper}</span>
              <span>{copy.shallower}</span>
            </span>
          </div>
          <div className="lr-waves__readout" aria-live="polite" data-testid="learn-waves-readout">
            <p className="lr-waves__readout-title">{text.title}</p>
            <p className="lr-waves__readout-body">{text.body}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
