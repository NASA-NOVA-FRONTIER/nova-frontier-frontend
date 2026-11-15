import {
  Cartesian3,
  EasingFunction,
  Rectangle,
  SceneTransforms,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  type Cartesian2,
  type Entity,
  type ImageryLayer,
  type Viewer,
} from "cesium";
import { useEffect, useRef, useState } from "react";

import type { Case } from "@/features/cases/cases";
import type { BBox, Frame, LonLat } from "@/features/frames/frame.types";
import { frameUnder } from "@/features/frames/frames";
import { wrapBox } from "@/features/geo/longitude";
import { addCaseMarker, MARKER_PREFIX } from "@/features/globe/caseMarkers";
import { createViewer, pickLonLat } from "@/features/globe/cesium";
import {
  addChipOutline,
  addDrapeLayer,
  addFrameEntities,
  addPointEntity,
  crossfadeLayers,
  HOVER_COLOR,
  INK,
  removeEntities,
  removeLayer,
  type ChipOutline,
  type Drape,
} from "@/features/globe/frameEntities";
import { framedBox, viewInsets, type GlobeView as View } from "@/features/globe/framing";
import {
  GlobeTooltip,
  StampLabel,
  type GlobeStamp,
  type TooltipContent,
} from "@/features/globe/GlobeTooltip";
import { SquareOverlay } from "@/features/globe/SquareOverlay";
import { caseTooltip, frameTooltip } from "@/features/globe/tooltipText";

const HOME = Cartesian3.fromDegrees(-20, 18, 21_000_000); // the Atlantic: four of the five cases
const ARRIVAL = Cartesian3.fromDegrees(-20, 18, 32_000_000);
const ARRIVAL_SECONDS = 2.4;
const FLY_SECONDS = 1.8;
const HOME_SECONDS = 1.6;
const SPIN_RADIANS_PER_TICK = -0.0005;

// Where the camera should look; `key` changes when the subject changes, not on every render.
// `seconds` overrides the flight time (the story's region view flies a little slower).
export type CameraTarget = { key: string; box: BBox; zoom: number; seconds?: number };

export type { GlobeStamp };

// The placed square (v9 step 2): the backend's AOI_SIDE_KM square around `centre`.
export type GlobeSquare = { centre: LonLat; sideKm: number; movable: boolean };

export type GlobeScene = {
  target: CameraTarget | undefined;
  outline: ChipOutline | undefined;
  point: LonLat | undefined;
  frame: Frame | undefined;
  selectedCaseId: string | undefined;
  drape: Drape | undefined;
  drapeAlpha: number;
  stamp: GlobeStamp | undefined;
  square: GlobeSquare | undefined;
};

export type GlobeViewProps = {
  frames: Frame[];
  cases: Case[];
  scene: GlobeScene;
  view: View;
  reduceMotion: boolean;
  // Bumped by the "Whole globe" button: fly home even when nothing is open.
  homeRequest: number;
  onOpenCase: (item: Case) => void;
  // Any clicked point on the globe, land or ocean: the square goes there (coverage answers later).
  onPlace: (point: LonLat) => void;
  // A drag released, or an arrow key: the square's new centre.
  onMoveSquare: (centre: LonLat) => void;
  onUnavailable: () => void;
  // Hands the viewer out for the PNG download; undefined once it is destroyed.
  onViewer?: (viewer: Viewer | undefined) => void;
};

type Hover = { content: TooltipContent; x: number; y: number; frame?: Frame };

export const GlobeView = ({
  frames,
  cases,
  scene,
  view,
  reduceMotion,
  homeRequest,
  onOpenCase,
  onPlace,
  onMoveSquare,
  onUnavailable,
  onViewer,
}: GlobeViewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Viewer>();
  const [hover, setHover] = useState<Hover>();
  const [isSpinning, setIsSpinning] = useState(true);
  const hadTarget = useRef(false);

  // Cesium handlers are registered once, so they read the latest props through a ref.
  const latest = useRef({ frames, cases, onOpenCase, onPlace, reduceMotion });
  useEffect(() => {
    latest.current = { frames, cases, onOpenCase, onPlace, reduceMotion };
  });

  useEffect(() => {
    if (containerRef.current === null) return;
    let instance: Viewer;
    try {
      instance = createViewer(containerRef.current);
    } catch {
      onUnavailable();
      return;
    }
    const lost = instance.scene.renderError.addEventListener(() => onUnavailable());
    // The planet arrives from deep space, unless motion is reduced.
    if (latest.current.reduceMotion) instance.camera.setView({ destination: HOME });
    else {
      instance.camera.setView({ destination: ARRIVAL });
      instance.camera.flyTo({
        destination: HOME,
        duration: ARRIVAL_SECONDS,
        easingFunction: EasingFunction.QUARTIC_OUT,
      });
    }
    setViewer(instance);
    onViewer?.(instance);
    return () => {
      onViewer?.(undefined);
      lost();
      instance.destroy();
    };
    // onUnavailable and onViewer only store a flag or a ref; the viewer must be created once.
    // oxlint-disable-next-line react/exhaustive-deps
  }, []);

  useEffect(() => {
    if (viewer === undefined) return;
    const caseAt = (position: Cartesian2): Case | undefined => {
      const picked: unknown = viewer.scene.pick(position);
      const id = (picked as { id?: Entity } | undefined)?.id?.id;
      if (typeof id !== "string" || !id.startsWith(MARKER_PREFIX)) return undefined;
      return latest.current.cases.find((item) => `${MARKER_PREFIX}${item.id}` === id);
    };

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(({ endPosition }: ScreenSpaceEventHandler.MotionEvent) => {
      const { x, y } = endPosition;
      const item = caseAt(endPosition);
      if (item !== undefined) {
        setHover({ content: caseTooltip(item), x, y });
        return;
      }
      const point = pickLonLat(viewer, endPosition);
      const frame = point && frameUnder(latest.current.frames, point);
      if (point === undefined || frame === undefined) {
        setHover(undefined);
        return;
      }
      setHover({ content: frameTooltip(frame, point), x, y, frame });
    }, ScreenSpaceEventType.MOUSE_MOVE);
    handler.setInputAction(({ position }: ScreenSpaceEventHandler.PositionedEvent) => {
      const item = caseAt(position);
      if (item !== undefined) {
        latest.current.onOpenCase(item);
        return;
      }
      const point = pickLonLat(viewer, position);
      if (point !== undefined) latest.current.onPlace(point);
    }, ScreenSpaceEventType.LEFT_CLICK);
    // Any manual navigation stops the idle spin for good.
    handler.setInputAction(() => setIsSpinning(false), ScreenSpaceEventType.LEFT_DOWN);
    handler.setInputAction(() => setIsSpinning(false), ScreenSpaceEventType.WHEEL);
    return () => handler.destroy();
  }, [viewer]);

  // A placed square needs a still globe under the hand.
  const hasSquare = scene.square !== undefined;
  useEffect(() => {
    if (hasSquare) setIsSpinning(false);
  }, [hasSquare]);

  const hasTarget = scene.target !== undefined;
  useEffect(() => {
    if (viewer === undefined || !isSpinning || reduceMotion || hasTarget) return;
    return viewer.clock.onTick.addEventListener(() =>
      viewer.camera.rotate(Cartesian3.UNIT_Z, SPIN_RADIANS_PER_TICK),
    );
  }, [viewer, isSpinning, reduceMotion, hasTarget]);

  useEffect(() => {
    if (viewer === undefined) return;
    const markers = cases.map((item) =>
      addCaseMarker(viewer, item, item.id === scene.selectedCaseId),
    );
    return () => removeEntities(viewer, markers);
  }, [viewer, cases, scene.selectedCaseId]);

  const hoveredFrame = hover?.frame;
  useEffect(() => {
    if (viewer === undefined || hoveredFrame === undefined) return;
    const entities = addFrameEntities(viewer, hoveredFrame, HOVER_COLOR);
    return () => removeEntities(viewer, entities);
  }, [viewer, hoveredFrame]);

  const { frame, outline, point } = scene;
  useEffect(() => {
    if (viewer === undefined || frame === undefined) return;
    const entities = addFrameEntities(viewer, frame, INK, { width: 1, alpha: 0.45, fill: 0.03 });
    return () => removeEntities(viewer, entities);
  }, [viewer, frame]);

  const outlineKey = outline && `${outline.ring.join(";")}|${outline.label}|${outline.processing}`;
  useEffect(() => {
    if (viewer === undefined || outline === undefined) return;
    const entities = addChipOutline(viewer, outline);
    return () => removeEntities(viewer, entities);
    // outlineKey stands in for the outline object, which is rebuilt on every render.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [viewer, outlineKey]);

  const pointKey = point?.join(",");
  useEffect(() => {
    if (viewer === undefined || point === undefined) return;
    const entity = addPointEntity(viewer, point);
    return () => removeEntities(viewer, [entity]);
    // oxlint-disable-next-line react/exhaustive-deps
  }, [viewer, pointKey]);

  const layerRef = useRef<ImageryLayer>(undefined);
  const [fading, setFading] = useState(false);
  const drapeKey = scene.drape && `${scene.drape.url}|${scene.drape.bounds.join(",")}`;
  const alphaRef = useRef(scene.drapeAlpha);
  alphaRef.current = scene.drapeAlpha;
  // One drape at a time; a change crossfades from the previous one (instant under reduced motion).
  useEffect(() => {
    if (viewer === undefined) return;
    const previous = layerRef.current;
    const alpha = alphaRef.current;
    const instant = previous === undefined || latest.current.reduceMotion;
    const next =
      scene.drape === undefined
        ? undefined
        : addDrapeLayer(viewer, scene.drape, instant ? alpha : 0);
    layerRef.current = next;
    if (instant) {
      if (previous !== undefined) removeLayer(viewer, previous);
      return;
    }
    setFading(true);
    return crossfadeLayers(viewer, previous, next, alpha, () => setFading(false));
    // drapeKey stands in for the drape object, which is rebuilt on every render.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [viewer, drapeKey]);

  useEffect(
    () => () => {
      if (viewer !== undefined && layerRef.current !== undefined)
        removeLayer(viewer, layerRef.current);
      layerRef.current = undefined;
    },
    [viewer],
  );

  // The stamp follows the footprint's south edge as the camera moves, without a React render per frame.
  const stampRef = useRef<HTMLParagraphElement>(null);
  const stampKey = scene.stamp?.box.join(",");
  useEffect(() => {
    const box = scene.stamp?.box;
    if (viewer === undefined || box === undefined) return;
    const [west, south, east] = box;
    const anchor = Cartesian3.fromDegrees((west + east) / 2, south);
    const place = () => {
      const element = stampRef.current;
      const at = SceneTransforms.worldToWindowCoordinates(viewer.scene, anchor);
      if (element === null) return;
      element.style.visibility = at === undefined ? "hidden" : "visible";
      if (at !== undefined)
        element.style.transform = `translate(${at.x}px, ${at.y}px) translateX(-50%)`;
    };
    place();
    return viewer.scene.postRender.addEventListener(place);
    // stampKey stands in for the box, which is rebuilt on every render.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [viewer, stampKey]);

  // The slider only changes alpha: re-adding the layer would flash the base map.
  useEffect(() => {
    if (layerRef.current !== undefined) layerRef.current.alpha = scene.drapeAlpha;
  }, [scene.drapeAlpha]);

  const { target } = scene;
  const targetKey = target && `${target.key}|${view}`;
  useEffect(() => {
    if (viewer === undefined) return;
    const duration = reduceMotion ? 0 : (target?.seconds ?? FLY_SECONDS);
    // Closing the selection flies back out, so nobody is stranded close to the ground.
    if (target === undefined) {
      if (hadTarget.current)
        viewer.camera.flyTo({ destination: HOME, duration: reduceMotion ? 0 : HOME_SECONDS });
      hadTarget.current = false;
      return;
    }
    hadTarget.current = true;
    const { clientWidth: width, clientHeight: height } = viewer.canvas;
    const box = framedBox(target.box, viewInsets(view, width, height), width, height, target.zoom);
    viewer.camera.flyTo({
      destination: Rectangle.fromDegrees(...wrapBox(box)),
      duration,
      easingFunction: EasingFunction.QUADRATIC_IN_OUT,
    });
    // targetKey stands in for the target object; motion settings don't re-fly the camera.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [viewer, targetKey]);

  useEffect(() => {
    if (viewer === undefined || homeRequest === 0) return;
    viewer.camera.flyTo({
      destination: HOME,
      duration: latest.current.reduceMotion ? 0 : HOME_SECONDS,
    });
  }, [viewer, homeRequest]);

  return (
    <div
      className="x-globe"
      data-testid="globe"
      data-crossfade={fading ? "on" : undefined}
      onMouseLeave={() => setHover(undefined)}
    >
      <div ref={containerRef} className="x-globe" />
      {viewer !== undefined && scene.square !== undefined && (
        <SquareOverlay
          viewer={viewer}
          centre={scene.square.centre}
          movable={scene.square.movable}
          onMove={onMoveSquare}
        />
      )}
      {scene.stamp !== undefined && <StampLabel stamp={scene.stamp} ref={stampRef} />}
      {hover !== undefined && <GlobeTooltip content={hover.content} x={hover.x} y={hover.y} />}
    </div>
  );
};
