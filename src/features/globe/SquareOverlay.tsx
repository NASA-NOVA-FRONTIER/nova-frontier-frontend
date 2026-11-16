import { Cartesian2, Cartesian3, SceneTransforms, type Viewer } from "cesium";
import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import { SQUARE } from "@/content/copyV9";
import type { LonLat } from "@/features/frames/frame.types";
import { AOI_SIDE_KM } from "@/features/geo/limits";
import { squareAround } from "@/features/geo/square";
import { moveSquare, nudgeSquare } from "@/features/geo/squareMove";
import { pickLonLat } from "@/features/globe/cesium";

// Arrow keys move the square 1 km, with Shift 5 km.
const STEP_KM = 1;
const SHIFT_STEP_KM = 5;
const ARROWS: Record<string, [east: number, north: number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, 1],
  ArrowDown: [0, -1],
};

type Drag = { pointerId: number; grab: LonLat; grabCentre: LonLat };

type SquareOverlayProps = {
  viewer: Viewer;
  centre: LonLat;
  // Before "Use this square" it can be dragged and moved with the keys; after, it only shows.
  movable: boolean;
  // The window an analysis measures at the centre (Earthquake: 5 km), drawn inside the square.
  innerKm?: number | undefined;
  onMove: (centre: LonLat) => void;
};

/*
 * The placed square (SPECS-flow-v9 §1.2) as DOM over the canvas, the way the prototype draws it:
 * its corners are projected every frame and written straight to the SVG, without a React render.
 * Pointer events land here, never on the canvas, so dragging the square never spins the globe.
 */
export const SquareOverlay = ({ viewer, centre, movable, innerKm, onMove }: SquareOverlayProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const shapeRef = useRef<SVGPolygonElement>(null);
  const innerRef = useRef<SVGPolygonElement>(null);
  const innerLabelRef = useRef<HTMLParagraphElement>(null);
  const labelRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  // The centre being drawn: the prop, or the preview while a drag is under way.
  const centreRef = useRef(centre);
  const dragRef = useRef<Drag>(undefined);

  // The draw loop reads the window through a ref; a change asks for one more frame.
  const innerKmRef = useRef(innerKm);
  useEffect(() => {
    innerKmRef.current = innerKm;
    viewer.scene.requestRender();
  }, [innerKm, viewer]);

  const centreKey = centre.join(",");
  useEffect(() => {
    if (dragRef.current === undefined) centreRef.current = centre;
    // centreKey stands in for the centre array, which is rebuilt on every render.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [centreKey]);

  useEffect(() => {
    // The inner window, projected the same way; its label sits above its north-west corner.
    const placeInner = () => {
      const inner = innerRef.current;
      const km = innerKmRef.current;
      if (inner === null || km === undefined) return;
      const corners = squareAround(centreRef.current, km).map(([lon, lat]) =>
        SceneTransforms.worldToWindowCoordinates(viewer.scene, Cartesian3.fromDegrees(lon, lat)),
      );
      if (!corners.every((corner) => corner !== undefined)) return;
      inner.setAttribute("points", corners.map(({ x, y }) => `${x},${y}`).join(" "));
      const northWest = corners[3];
      if (innerLabelRef.current !== null && northWest !== undefined)
        innerLabelRef.current.style.transform = `translate(${northWest.x}px, ${northWest.y}px) translateY(-100%)`;
    };
    const place = () => {
      const svg = svgRef.current;
      const shape = shapeRef.current;
      if (svg === null || shape === null) return;
      const corners = squareAround(centreRef.current, AOI_SIDE_KM).map(([lon, lat]) =>
        SceneTransforms.worldToWindowCoordinates(viewer.scene, Cartesian3.fromDegrees(lon, lat)),
      );
      const visible = corners.every((corner) => corner !== undefined);
      svg.style.visibility = visible ? "visible" : "hidden";
      for (const element of [labelRef.current, hintRef.current, innerLabelRef.current])
        if (element !== null) element.style.visibility = visible ? "visible" : "hidden";
      if (!visible) return;
      shape.setAttribute("points", corners.map(({ x, y }) => `${x},${y}`).join(" "));
      placeInner();
      svg.querySelectorAll<SVGRectElement>("[data-handle]").forEach((handle, index) => {
        const corner = corners[index];
        if (corner === undefined) return;
        handle.setAttribute("x", String(corner.x - 5));
        handle.setAttribute("y", String(corner.y - 5));
      });
      // Corners run south-west, south-east, north-east, north-west.
      const [southWest, southEast, northEast, northWest] = corners;
      if (labelRef.current !== null && southWest !== undefined && southEast !== undefined) {
        const lowest = Math.max(southWest.y, southEast.y);
        labelRef.current.style.transform = `translate(${Math.min(southWest.x, southEast.x)}px, ${lowest}px)`;
      }
      if (
        hintRef.current !== null &&
        southWest !== undefined &&
        northEast !== undefined &&
        southEast !== undefined &&
        northWest !== undefined
      ) {
        const x = (southWest.x + southEast.x + northEast.x + northWest.x) / 4;
        const y = (southWest.y + southEast.y + northEast.y + northWest.y) / 4;
        hintRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      }
    };
    place();
    return viewer.scene.postRender.addEventListener(place);
  }, [viewer]);

  // Where the pointer is on the globe; undefined off the planet (the last good centre is kept).
  const lonLatOf = (event: ReactPointerEvent): LonLat | undefined => {
    const box = viewer.canvas.getBoundingClientRect();
    return pickLonLat(viewer, new Cartesian2(event.clientX - box.left, event.clientY - box.top));
  };

  const onPointerDown = (event: ReactPointerEvent<SVGPolygonElement>) => {
    if (!movable || event.button !== 0 || dragRef.current !== undefined) return;
    const grab = lonLatOf(event);
    if (grab === undefined) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, grab, grabCentre: centreRef.current };
    svgRef.current?.setAttribute("data-dragging", "true");
  };

  const onPointerMove = (event: ReactPointerEvent<SVGPolygonElement>) => {
    const drag = dragRef.current;
    if (drag === undefined || drag.pointerId !== event.pointerId) return;
    const pointer = lonLatOf(event);
    if (pointer === undefined) return;
    centreRef.current = moveSquare(drag.grabCentre, drag.grab, pointer);
    viewer.scene.requestRender();
  };

  // One move per drag reaches the explorer: on release, or back to the start if the drag is lost.
  const endDrag = (event: ReactPointerEvent<SVGPolygonElement>, keep: boolean) => {
    const drag = dragRef.current;
    if (drag === undefined || drag.pointerId !== event.pointerId) return;
    dragRef.current = undefined;
    svgRef.current?.removeAttribute("data-dragging");
    if (!keep) centreRef.current = drag.grabCentre;
    else if (centreRef.current.join(",") !== drag.grabCentre.join(",")) onMove(centreRef.current);
  };

  const onKeyDown = (event: ReactKeyboardEvent<SVGPolygonElement>) => {
    const arrow = ARROWS[event.key];
    if (!movable || arrow === undefined) return;
    event.preventDefault();
    const step = event.shiftKey ? SHIFT_STEP_KM : STEP_KM;
    onMove(nudgeSquare(centreRef.current, arrow[0] * step, arrow[1] * step));
  };

  // The square covers the globe it sits on: the wheel still zooms through it.
  const onWheel = (event: ReactWheelEvent<SVGPolygonElement>) => {
    viewer.canvas.dispatchEvent(new WheelEvent("wheel", event.nativeEvent));
  };

  return (
    <>
      <svg
        ref={svgRef}
        className="x-square"
        data-testid="square"
        data-centre={centreKey}
        data-movable={movable}
        aria-hidden={!movable}
      >
        <polygon
          ref={shapeRef}
          className="x-square__shape"
          tabIndex={movable ? 0 : -1}
          role={movable ? "button" : undefined}
          aria-label={movable ? `${SQUARE.placedTitle} · ${SQUARE.dragHint}` : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => endDrag(event, true)}
          onPointerCancel={(event) => endDrag(event, false)}
          onKeyDown={onKeyDown}
          onWheel={onWheel}
        />
        {innerKm !== undefined && (
          <polygon ref={innerRef} className="x-square__inner" data-testid="square-inner" />
        )}
        {movable &&
          ["sw", "se", "ne", "nw"].map((corner) => (
            <rect
              key={corner}
              data-handle={corner}
              className="x-square__handle"
              width={10}
              height={10}
              rx={2}
            />
          ))}
      </svg>
      <p ref={labelRef} className="x-square__label" data-testid="square-label">
        {SQUARE.squareLabel}
      </p>
      {innerKm !== undefined && (
        <p ref={innerLabelRef} className="x-square__inner-label" data-testid="square-inner-label">
          {SQUARE.insarWindow}
        </p>
      )}
      {movable && (
        <p ref={hintRef} className="x-square__hint">
          {SQUARE.dragHint}
        </p>
      )}
    </>
  );
};
