// The satellite's render loop, kept apart from three.js so its pause rules are testable: it only
// schedules frames while the stage is visible, and without motion it draws once per change.

export type FrameScheduler = {
  request: (callback: () => void) => number;
  cancel: (id: number) => void;
};

const browserScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

export type RenderLoop = {
  setVisible: (visible: boolean) => void;
  /** Asks for one frame (drawn as soon as the stage is visible). */
  invalidate: () => void;
  stop: () => void;
  frames: () => number;
  running: () => boolean;
};

type LoopOptions = {
  /** Draw every frame (motion allowed) or only after `invalidate` (reduced motion). */
  continuous: boolean;
  scheduler?: FrameScheduler;
  onRunningChange?: (running: boolean) => void;
};

export const createRenderLoop = (draw: () => void, options: LoopOptions): RenderLoop => {
  const scheduler = options.scheduler ?? browserScheduler;
  let visible = false;
  let stopped = false;
  let dirty = true;
  let pending: number | undefined;
  let frames = 0;

  let reported = false;

  // Reports only real changes, not the gap between one frame and the next.
  const sync = () => {
    const running = pending !== undefined;
    if (running === reported) return;
    reported = running;
    options.onRunningChange?.(running);
  };

  const wanted = () => !stopped && visible && (options.continuous || dirty);

  const tick = () => {
    pending = undefined;
    if (wanted()) {
      dirty = false;
      frames += 1;
      draw();
      schedule();
    }
    sync();
  };

  const schedule = () => {
    if (pending !== undefined || !wanted()) return;
    pending = scheduler.request(tick);
  };

  const cancel = () => {
    if (pending === undefined) return;
    scheduler.cancel(pending);
    pending = undefined;
  };

  return {
    setVisible: (next) => {
      visible = next;
      if (visible) schedule();
      else cancel();
      sync();
    },
    invalidate: () => {
      dirty = true;
      schedule();
      sync();
    },
    stop: () => {
      stopped = true;
      cancel();
      sync();
    },
    frames: () => frames,
    running: () => pending !== undefined,
  };
};

/**
 * Average fps over `windowMs` of running frames after a `warmupMs` start, reported once; a pause
 * restarts the warm-up.
 */
export const createFpsMeter = (warmupMs: number, windowMs: number) => {
  let first: number | undefined;
  let start: number | undefined;
  let count = 0;
  let done = false;
  return {
    tick: (now: number): number | undefined => {
      if (done) return undefined;
      first ??= now;
      if (now - first < warmupMs) return undefined;
      if (start === undefined) {
        start = now;
        count = 0;
        return undefined;
      }
      count += 1;
      const elapsed = now - start;
      if (elapsed < windowMs) return undefined;
      done = true;
      return (count * 1000) / elapsed;
    },
    reset: () => {
      first = undefined;
      start = undefined;
    },
  };
};
