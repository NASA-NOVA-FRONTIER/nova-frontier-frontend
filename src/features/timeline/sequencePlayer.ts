/*
 * The sequence player as a pure state machine (SPECS-flow-v9 §3 and §5): play/pause, previous/next,
 * scrub, speed and loop. The hook in usePassPlayer.ts only adds the timer and the browser events.
 */

export const SPEEDS = [0.5, 1, 2] as const;
export type Speed = (typeof SPEEDS)[number];

// The prototype's step at 1×: one frame every 1.6 s.
export const BASE_STEP_MS = 1600;

export type PlayerState = {
  n: number;
  index: number;
  playing: boolean;
  speed: Speed;
  loop: boolean;
  canPlay: boolean;
};

export type PlayerEvent =
  | { type: "tick" }
  | { type: "toggle" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "seek"; index: number }
  // The data moved the playhead (a dock pick): follow it without pausing.
  | { type: "sync"; index: number }
  | { type: "speed"; speed: Speed }
  | { type: "loop" }
  // Tab hidden or any interaction with the map: stop where we are.
  | { type: "pause" };

export type PlayerInit = { n: number; index: number; canPlay: boolean; reducedMotion: boolean };

const clamp = (index: number, n: number): number => Math.max(0, Math.min(n - 1, index));

// Autoplay starts at the first step; reduced motion opens paused where the result already is.
export const initPlayer = ({ n, index, canPlay, reducedMotion }: PlayerInit): PlayerState => {
  const playable = canPlay && n > 1;
  const autoplay = playable && !reducedMotion;
  return {
    n,
    index: autoplay ? 0 : clamp(index, n),
    playing: autoplay,
    speed: 1,
    loop: true,
    canPlay: playable,
  };
};

export const stepMs = (speed: Speed): number => BASE_STEP_MS / speed;

export const playerReducer = (state: PlayerState, event: PlayerEvent): PlayerState => {
  const { n, index } = state;
  if (n === 0) return state;
  switch (event.type) {
    case "tick": {
      if (!state.playing) return state;
      if (index + 1 < n) return { ...state, index: index + 1 };
      return state.loop ? { ...state, index: 0 } : { ...state, playing: false };
    }
    case "toggle": {
      if (!state.canPlay) return state;
      if (state.playing) return { ...state, playing: false };
      const restart = index >= n - 1 && !state.loop;
      return { ...state, playing: true, index: restart ? 0 : index };
    }
    case "next":
      return { ...state, playing: false, index: (index + 1) % n };
    case "prev":
      return { ...state, playing: false, index: (index - 1 + n) % n };
    case "seek":
      return { ...state, playing: false, index: clamp(event.index, n) };
    case "sync":
      return event.index === index ? state : { ...state, index: clamp(event.index, n) };
    case "speed":
      return { ...state, speed: event.speed };
    case "loop":
      return { ...state, loop: !state.loop };
    case "pause":
      return state.playing ? { ...state, playing: false } : state;
  }
};
