import { useSyncExternalStore } from "react";

import { browserStorage } from "@/features/music/musicPreference";
import { createMusicEngine } from "@/features/music/musicEngine";
import { createMusicStore, displayState, type MusicSnapshot } from "@/features/music/musicStore";
import { TRACKS } from "@/features/music/tracks";

// The one store and engine of the page: the toggles, in different bars, share them.
const fetchTrack = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The music download answered ${response.status}`);
  return response.arrayBuffer();
};

export const musicStore = createMusicStore(browserStorage());

export const musicEngine = createMusicEngine({
  createContext: () => new AudioContext(),
  fetchTrack,
  every: (callback, milliseconds) => {
    const id = window.setInterval(callback, milliseconds);
    return () => window.clearInterval(id);
  },
  after: (callback, milliseconds) => {
    const id = window.setTimeout(callback, milliseconds);
    return () => window.clearTimeout(id);
  },
  onStatus: musicStore.setEngine,
});

// A click on the toggle is handled by the toggle itself, so the page-wide "first gesture" listener skips it.
export const TOGGLE_MARKER = "data-sound-toggle";
export const TOGGLE_SELECTOR = `[${TOGGLE_MARKER}]`;

export const useMusicSnapshot = (): MusicSnapshot =>
  useSyncExternalStore(musicStore.subscribe, musicStore.getSnapshot, musicStore.getSnapshot);

// Browsers start audio only after a gesture, so every caller runs inside one.
export const unlockMusic = (): void => {
  musicStore.markUnlocked();
  musicEngine.unlock();
};

// A failed download is retried by pressing the toggle again; otherwise it turns the music on or off.
export const toggleMusic = (): void => {
  const state = musicStore.getSnapshot();
  if (displayState(state) === "error") {
    void musicEngine.play(state.track === null ? null : TRACKS[state.track]);
    return;
  }
  musicStore.toggle();
  if (!state.wanted) musicEngine.unlock();
};
