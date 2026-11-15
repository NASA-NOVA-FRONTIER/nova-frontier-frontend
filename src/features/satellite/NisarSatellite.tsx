import "@/features/satellite/satellite.css";

import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { prefersReducedMotion } from "@/lib/motion";
import { createFpsMeter, createRenderLoop } from "@/features/satellite/renderLoop";
import {
  AUTOROTATE_STEP,
  cameraPose,
  easeOrbit,
  HOTSPOT_MIN_DEPLOY,
  hotspotVisible,
  INITIAL_ORBIT,
  type Orbit,
  orbitByDrag,
  orbitByKey,
  satellitePose,
  type StagePose,
  tipPosition,
  toScreen,
  trackProgress,
} from "@/features/satellite/satelliteMotion";
import {
  SATELLITE_COPY,
  SATELLITE_FALLBACK_IMAGE,
  SATELLITE_PARTS,
  type SatellitePartId,
} from "@/features/satellite/satelliteParts";
import type { createSatelliteScene, SatelliteScene } from "@/features/satellite/satelliteScene";

export type NisarSatelliteProps = {
  /** 0 stowed → 1 deployed (ignored when `scrollDriven`). */
  deploy?: number;
  /** 0–1 strength of the side-looking beam and its swath. */
  beam?: number;
  /** Maps the scroll progress of the nearest `[data-sat-track]` to deploy, beam and zoom. */
  scrollDriven?: boolean;
  hotspots?: boolean;
  autorotate?: boolean;
  /** 0–1 share of the width the model shifts right, to leave room for text. */
  offsetX?: number;
  noHint?: boolean;
  /** Earth texture URL. */
  earth?: string;
  /** Shown under the static image when WebGL is unavailable (the page's own caption, verbatim). */
  caption?: string;
  className?: string;
  onProgress?: (progress: number) => void;
  /** Page-driven pose for each scroll progress (the Method teardown); replaces the built-in
   * deploy/beam/zoom mapping and adds explode and focus. Omitted, the model behaves as before. */
  stage?: (progress: number, reduced: boolean) => StagePose;
  onPart?: (id: SatellitePartId | null) => void;
  /** Average fps over the first ~2 s of running frames, once (never under reduced motion). */
  onFps?: (fps: number) => void;
};

type Status = "waiting" | "loading" | "ready" | "fallback";

const LOAD_MARGIN = "200px";
const VISIBLE_MARGIN = "100px";
// The first frames compile shaders and upload the Earth texture; they'd understate the steady rate.
const FPS_WARMUP_MS = 500;
const FPS_WINDOW_MS = 2000;

const SatelliteFallback = ({ caption }: { caption: string | undefined }) => (
  <figure className="s-sat__fallback" data-testid="nisar-satellite-fallback">
    <img
      src={SATELLITE_FALLBACK_IMAGE}
      alt={SATELLITE_COPY.fallbackAlt}
      width={1280}
      height={989}
      loading="lazy"
    />
    {caption !== undefined && <figcaption>{caption}</figcaption>}
  </figure>
);

// Interactive three.js model of NISAR (SPECS-content-pages-v8 §1). three and the model load only
// when the stage nears the viewport, the loop pauses off screen, and reduced motion shows it
// deployed and still. Without WebGL it falls back to the artist's concept image.
export const NisarSatellite = (props: NisarSatelliteProps) => {
  const { hotspots = false, noHint = false, caption, className } = props;
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<SatellitePartId, HTMLButtonElement>());
  const latest = useRef(props);
  const invalidate = useRef<() => void>(() => undefined);
  const orbit = useRef<{ current: Orbit; target: Orbit; touched: boolean }>({
    current: INITIAL_ORBIT,
    target: INITIAL_ORBIT,
    touched: false,
  });
  const drag = useRef<{ x: number; y: number } | undefined>(undefined);
  const [status, setStatus] = useState<Status>("waiting");
  const [tip, setTip] = useState<SatellitePartId | null>(null);
  const [pinned, setPinned] = useState<SatellitePartId | null>(null);
  const tipFor = useRef<SatellitePartId | null>(null);
  const pinnedRef = useRef<SatellitePartId | null>(null);

  // The loop reads props from a ref, so a new deploy or beam value never rebuilds the scene.
  useLayoutEffect(() => {
    latest.current = props;
  });
  // Only what changes the picture asks for a frame: a parent re-render (new callbacks) never does.
  const { deploy, beam, offsetX, scrollDriven } = props;
  useLayoutEffect(() => {
    invalidate.current();
  }, [deploy, beam, offsetX, scrollDriven, hotspots]);
  useLayoutEffect(() => {
    tipFor.current = tip;
    pinnedRef.current = pinned;
    invalidate.current();
  }, [tip, pinned]);

  // Loading and ready are one phase, so becoming ready doesn't rebuild the scene.
  const phase = status === "loading" || status === "ready" ? "live" : status;

  // Wait until the stage nears the viewport before downloading three and building the model.
  useEffect(() => {
    const element = host.current;
    if (element === null || status !== "waiting") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setStatus("loading");
      },
      { rootMargin: LOAD_MARGIN },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [status]);

  useEffect(() => {
    const element = host.current;
    const canvas = canvasRef.current;
    if (phase !== "live" || element === null || canvas === null) return;
    const reduced = prefersReducedMotion();
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const start = (createScene: typeof createSatelliteScene) => {
      let scene: SatelliteScene;
      try {
        scene = createScene(canvas, {
          earth: latest.current.earth,
          onAssetLoad: () => invalidate.current(),
          teardown: latest.current.stage !== undefined,
        });
      } catch {
        setStatus("fallback");
        return;
      }
      const t0 = performance.now();
      const fps = createFpsMeter(FPS_WARMUP_MS, FPS_WINDOW_MS);
      let lastProgress: number | undefined;

      const readProgress = (): number => {
        const p = latest.current;
        if (!(p.scrollDriven ?? false)) return 0;
        const track = element.closest<HTMLElement>("[data-sat-track]") ?? element;
        const progress = trackProgress(track.getBoundingClientRect(), window.innerHeight || 1);
        if (progress !== lastProgress) {
          lastProgress = progress;
          p.onProgress?.(progress);
        }
        return progress;
      };

      const draw = () => {
        const p = latest.current;
        const scrollDriven = p.scrollDriven ?? false;
        const progress = readProgress();
        const pose = satellitePose({
          deploy: p.deploy ?? 1,
          beam: p.beam ?? 0,
          scrollDriven,
          progress,
          reduced,
          stage: p.stage?.(progress, reduced),
        });
        const o = orbit.current;
        if (p.autorotate && !o.touched && !reduced) {
          o.target = { ...o.target, yaw: o.target.yaw - AUTOROTATE_STEP };
        }
        o.current = easeOrbit(o.current, o.target, reduced);
        const now = performance.now();
        scene.render({
          pose,
          camera: cameraPose(o.current, pose.zoom, pose.beam),
          offsetX: p.offsetX ?? 0,
          time: reduced ? undefined : (now - t0) / 1000,
        });
        // Taken apart, the step text names each piece, so the rings wait for the assembled model.
        placeHotspots(
          scene,
          (p.hotspots ?? false) && pose.deploy > HOTSPOT_MIN_DEPLOY && pose.explode === 0,
        );
        element.dataset.frames = String(loop.frames());
        if (!reduced && p.onFps !== undefined) {
          const avg = fps.tick(now);
          if (avg !== undefined) p.onFps(avg);
        }
      };

      const placeHotspots = (s: SatelliteScene, show: boolean) => {
        const w = element.clientWidth;
        const h = element.clientHeight;
        for (const [id, button] of buttons.current) {
          const point = s.project(id);
          const { x, y } = toScreen(point, w, h);
          const visible = hotspotVisible(show, { x, y, z: point.z }, w, h);
          button.style.transform = `translate(${x}px, ${y}px)`;
          button.style.opacity = visible ? "1" : "0";
          button.style.pointerEvents = visible ? "auto" : "none";
          button.tabIndex = visible ? 0 : -1;
          if (tipFor.current === id) {
            if (!visible && pinnedRef.current !== id) setTip(null);
            const pos = tipPosition(x, y, w, h);
            if (tipRef.current !== null) {
              tipRef.current.style.transform = `translate(${pos.left}px, ${pos.top}px)`;
            }
          }
        }
      };

      const loop = createRenderLoop(draw, {
        continuous: !reduced,
        onRunningChange: (running) => {
          element.dataset.running = String(running);
          if (!running) fps.reset();
        },
      });
      element.dataset.running = "false";
      invalidate.current = loop.invalidate;

      const resize = new ResizeObserver(() => {
        scene.resize(element.clientWidth, element.clientHeight);
        loop.invalidate();
      });
      resize.observe(element);
      scene.resize(element.clientWidth, element.clientHeight);
      const visibility = new IntersectionObserver(
        ([entry]) => loop.setVisible(entry?.isIntersecting ?? false),
        { rootMargin: VISIBLE_MARGIN },
      );
      visibility.observe(element);
      // Without motion nothing scrubs, but the page can still follow the scroll through onProgress.
      // A staged model changes its pose with the scroll, so it also redraws (one frame, no loop).
      const onScroll = () => {
        if (!reduced) return;
        readProgress();
        if (latest.current.stage !== undefined) loop.invalidate();
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      const onContextLost = (event: Event) => {
        event.preventDefault();
        setStatus("fallback");
      };
      canvas.addEventListener("webglcontextlost", onContextLost);
      setStatus("ready");

      cleanup = () => {
        invalidate.current = () => undefined;
        loop.stop();
        resize.disconnect();
        visibility.disconnect();
        window.removeEventListener("scroll", onScroll);
        canvas.removeEventListener("webglcontextlost", onContextLost);
        scene.dispose();
      };
    };

    import("@/features/satellite/satelliteScene")
      .then((module) => {
        if (!cancelled) start(module.createSatelliteScene);
      })
      .catch(() => {
        if (!cancelled) setStatus("fallback");
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // The scene is built once per mount; later prop changes reach it through `latest`.
  }, [phase]);

  const hideHint = () => {
    if (hintRef.current !== null) hintRef.current.style.opacity = "0";
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    drag.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add("s-sat__canvas--drag");
    orbit.current.touched = true;
    hideHint();
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const from = drag.current;
    if (from === undefined) return;
    const o = orbit.current;
    o.target = orbitByDrag(o.target, event.clientX - from.x, event.clientY - from.y);
    drag.current = { x: event.clientX, y: event.clientY };
    invalidate.current();
  };
  const onPointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    drag.current = undefined;
    event.currentTarget.classList.remove("s-sat__canvas--drag");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const o = orbit.current;
    const next = orbitByKey(o.target, event.key);
    if (next === undefined) return;
    event.preventDefault();
    o.target = next;
    o.touched = true;
    invalidate.current();
  };

  const togglePin = (id: SatellitePartId) => {
    const next = pinned === id ? null : id;
    setPinned(next);
    setTip(next);
    latest.current.onPart?.(next);
  };
  const leave = (id: SatellitePartId) => {
    if (pinned !== id) setTip(pinned);
  };

  const shown = SATELLITE_PARTS.find((part) => part.id === tip);

  return (
    <div
      ref={host}
      className={className === undefined ? "s-sat" : `s-sat ${className}`}
      data-testid="nisar-satellite"
      data-status={status}
    >
      {status === "fallback" ? (
        <SatelliteFallback caption={caption} />
      ) : (
        <>
          {status !== "ready" && (
            <div className="s-sat__load" data-testid="nisar-satellite-loading">
              {SATELLITE_COPY.loading}
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="s-sat__canvas"
            tabIndex={0}
            aria-label={SATELLITE_COPY.canvasLabel}
            data-testid="nisar-satellite-canvas"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={onKeyDown}
          />
          {status === "ready" && hotspots && (
            <div className="s-sat__layer">
              {SATELLITE_PARTS.map(({ id, title }) => (
                <button
                  key={id}
                  ref={(el) => {
                    if (el === null) buttons.current.delete(id);
                    else buttons.current.set(id, el);
                  }}
                  type="button"
                  className="s-sat__hotspot"
                  aria-label={title}
                  aria-pressed={pinned === id}
                  tabIndex={-1}
                  data-testid={`nisar-hotspot-${id}`}
                  onPointerEnter={() => setTip(id)}
                  onPointerLeave={() => leave(id)}
                  onFocus={() => setTip(id)}
                  onBlur={() => leave(id)}
                  onClick={() => togglePin(id)}
                />
              ))}
            </div>
          )}
          <div
            ref={tipRef}
            className={shown === undefined ? "s-sat__tip" : "s-sat__tip s-sat__tip--shown"}
            role="status"
            data-testid="nisar-satellite-tip"
          >
            {shown !== undefined && (
              <>
                <b>{shown.title}</b>
                {shown.body}
              </>
            )}
          </div>
          {!noHint && status === "ready" && (
            <div ref={hintRef} className="s-sat__hint" aria-hidden="true">
              {SATELLITE_COPY.hint}
            </div>
          )}
        </>
      )}
    </div>
  );
};
