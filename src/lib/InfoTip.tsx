import "@/lib/infoTip.css";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { createPortal } from "react-dom";

import {
  INFO_TIP_MARGIN,
  INFO_TIP_MAX_WIDTH,
  placeInfoTip,
  type InfoTipPlacement,
} from "@/lib/infoTipPlacement";

// Same grace as the prototype: moving from the button to a neighbour doesn't flicker.
const CLOSE_DELAY_MS = 80;

// Only one ⓘ is open at a time: opening one closes whichever was open before.
let closeOpenTip: (() => void) | null = null;

type InfoTipProps = {
  /** Accessible name of the button (copyV9 INFO_TIP.label); the component has no copy of its own. */
  label: string;
  title: string;
  text: string;
  testId?: string;
};

const startWidth = (): number =>
  Math.min(INFO_TIP_MAX_WIDTH, window.innerWidth - 2 * INFO_TIP_MARGIN);

export const InfoTip = ({ label, title, text, testId = "info-tip" }: InfoTipProps) => {
  const tipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [placement, setPlacement] = useState<InfoTipPlacement | null>(null);

  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    setOpen(false);
    setPinned(false);
    setPlacement(null);
  }, []);

  const show = useCallback(
    (pin: boolean) => {
      window.clearTimeout(timer.current);
      if (closeOpenTip !== close) closeOpenTip?.();
      closeOpenTip = close;
      setOpen(true);
      if (pin) setPinned(true);
    },
    [close],
  );

  const closeSoon = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(close, CLOSE_DELAY_MS);
  };

  // Touch has no hover: a tap only toggles, so its synthetic enter/leave must not open or close it.
  const onPointerEnter = (event: PointerEvent) => {
    if (event.pointerType !== "touch") show(false);
  };
  const onPointerLeave = (event: PointerEvent) => {
    if (event.pointerType !== "touch" && !pinned) closeSoon();
  };
  const onClick = () => {
    if (open && pinned) close();
    else show(true);
  };

  const place = useCallback(() => {
    const button = buttonRef.current;
    const pop = popRef.current;
    if (!button || !pop) return;
    const r = button.getBoundingClientRect();
    setPlacement(
      placeInfoTip({
        anchor: { left: r.left, top: r.top, width: r.width, height: r.height },
        tipHeight: pop.offsetHeight,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      }),
    );
  }, []);

  // Measured before paint, so the popover never shows at its unplaced spot.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, title, text, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    // A pinned tip closes on a tap anywhere else (iOS doesn't blur a tapped button).
    const onDown = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && buttonRef.current?.contains(event.target)) return;
      close();
    };
    // Capture catches the scroll of any panel, not only the window.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, place, close]);

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (closeOpenTip === close) closeOpenTip = null;
    },
    [close],
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="s-infotip"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        data-testid={testId}
        data-pinned={pinned}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onFocus={() => show(false)}
        onBlur={closeSoon}
        onClick={onClick}
      >
        <span aria-hidden="true">i</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            id={tipId}
            role="tooltip"
            className="s-infotip-pop"
            data-testid={`${testId}-pop`}
            data-placed={placement !== null}
            data-side={placement?.side}
            style={{
              left: placement?.left ?? 0,
              top: placement?.top ?? 0,
              width: placement?.width ?? startWidth(),
            }}
          >
            <p className="s-infotip-pop__title">{title}</p>
            <p className="s-infotip-pop__text">{text}</p>
          </div>,
          document.body,
        )}
    </>
  );
};
