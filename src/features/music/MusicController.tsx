import { useEffect } from "react";

import { isRunning } from "@/features/music/musicStore";
import {
  musicEngine,
  musicStore,
  TOGGLE_SELECTOR,
  unlockMusic,
  useMusicSnapshot,
} from "@/features/music/musicRuntime";
import { TRACKS, trackIdForRoute } from "@/features/music/tracks";
import { usePathname } from "@/lib/navigation";

const GESTURES = ["click", "keydown", "touchend"] as const;

// Mounted once in App: it keeps the music in step with the route, the tab and the first gesture.
// It renders nothing and makes no audio context until someone asks for sound.
export const MusicController = () => {
  const pathname = usePathname();
  const state = useMusicSnapshot();
  const trackId = trackIdForRoute({ pathname, search: window.location.search });
  const running = isRunning(state);

  useEffect(() => musicStore.setTrack(trackId), [trackId]);

  useEffect(() => {
    const sync = () => musicStore.setHidden(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  // A remembered "on" starts with the first gesture anywhere on the page.
  useEffect(() => {
    if (!state.wanted || state.unlocked) return;
    const unlock = (event: Event) => {
      if (event.target instanceof Element && event.target.closest(TOGGLE_SELECTOR) !== null) return;
      unlockMusic();
    };
    for (const name of GESTURES) window.addEventListener(name, unlock, { capture: true });
    return () => {
      for (const name of GESTURES) window.removeEventListener(name, unlock, { capture: true });
    };
  }, [state.wanted, state.unlocked]);

  useEffect(() => {
    musicEngine.setRunning(running);
    if (running) void musicEngine.play(trackId === null ? null : TRACKS[trackId]);
  }, [running, trackId]);

  return null;
};
