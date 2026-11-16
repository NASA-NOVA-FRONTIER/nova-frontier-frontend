import {
  hasSeenMusicHint,
  markMusicHintSeen,
  readMusicWanted,
  writeMusicWanted,
  type KeyValueStorage,
} from "@/features/music/musicPreference";
import type { EngineStatus } from "@/features/music/musicEngine";
import type { TrackId } from "@/features/music/tracks";

export type MusicSnapshot = {
  // What the listener chose; the toggle shows this.
  wanted: boolean;
  // Browsers only start audio after a gesture, so a remembered "on" waits for one.
  unlocked: boolean;
  hidden: boolean;
  track: TrackId | null;
  engine: EngineStatus;
  hintSeen: boolean;
};

export type MusicDisplayState = "off" | "waiting" | "paused" | "loading" | "playing" | "error";

export const isRunning = (state: MusicSnapshot): boolean =>
  state.wanted && state.unlocked && !state.hidden;

export const displayState = (state: MusicSnapshot): MusicDisplayState => {
  if (!state.wanted) return "off";
  if (!state.unlocked) return "waiting";
  if (state.hidden) return "paused";
  if (state.engine === "error") return "error";
  return state.engine === "playing" ? "playing" : "loading";
};

// Only the first visit, and never while the sound is on.
export const hintVisible = (state: MusicSnapshot): boolean => !state.hintSeen && !state.wanted;

export const createMusicStore = (storage: KeyValueStorage | null) => {
  let state: MusicSnapshot = {
    wanted: readMusicWanted(storage),
    unlocked: false,
    hidden: false,
    track: null,
    engine: "idle",
    hintSeen: hasSeenMusicHint(storage),
  };
  const listeners = new Set<() => void>();

  // Keeps the same snapshot object when nothing changed, as useSyncExternalStore requires.
  const update = (changes: Partial<MusicSnapshot>): void => {
    const next = { ...state, ...changes };
    const keys = Object.keys(next) as (keyof MusicSnapshot)[];
    if (keys.every((key) => next[key] === state[key])) return;
    state = next;
    listeners.forEach((listener) => listener());
  };

  return {
    getSnapshot: (): MusicSnapshot => state,
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    // The click that turns sound on is itself the gesture that unlocks audio.
    toggle: (): void => {
      const wanted = !state.wanted;
      writeMusicWanted(storage, wanted);
      markMusicHintSeen(storage);
      update({ wanted, unlocked: state.unlocked || wanted, hintSeen: true });
    },
    dismissHint: (): void => {
      markMusicHintSeen(storage);
      update({ hintSeen: true });
    },
    markUnlocked: (): void => update({ unlocked: true }),
    setHidden: (hidden: boolean): void => update({ hidden }),
    setTrack: (track: TrackId | null): void => update({ track }),
    setEngine: (engine: EngineStatus): void => update({ engine }),
  };
};

export type MusicStore = ReturnType<typeof createMusicStore>;
