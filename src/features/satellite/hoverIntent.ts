// Long enough to cover a pointer grazing the edge of a hotspot, short enough to feel immediate.
export const HOVER_CLOSE_DELAY_MS = 150;

export type HoverIntent<T> = {
  /** The pointer reached `id`: shows it now and cancels a pending close. */
  enter: (id: T) => void;
  /** The pointer left `id`: hides it after the delay unless something is entered again. */
  leave: (id: T) => void;
  /** Drops a pending close (on unmount). */
  cancel: () => void;
};

/**
 * Which hotspot the pointer is on, with a short close delay so the card doesn't blink when the
 * pointer slips off the target for a moment. `onChange` gets the new id (or null) and the previous one.
 */
export const createHoverIntent = <T>(
  onChange: (id: T | null, previous: T | null) => void,
  delayMs: number = HOVER_CLOSE_DELAY_MS,
): HoverIntent<T> => {
  let current: T | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  return {
    enter: (id) => {
      cancel();
      if (current === id) return;
      const previous = current;
      current = id;
      onChange(id, previous);
    },
    leave: (id) => {
      if (current !== id) return;
      cancel();
      timer = setTimeout(() => {
        timer = undefined;
        current = null;
        onChange(null, id);
      }, delayMs);
    },
    cancel,
  };
};
