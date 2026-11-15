import { useEffect, useReducer, type Dispatch } from "react";

import {
  initPlayer,
  playerReducer,
  stepMs,
  type PlayerEvent,
  type PlayerInit,
  type PlayerState,
} from "@/features/timeline/sequencePlayer";

// Images fetched ahead stay referenced here so the browser keeps them in its cache.
const prefetched = new Set<string>();

const prefetch = (urls: string[]): void => {
  for (const url of urls) {
    if (prefetched.has(url)) continue;
    prefetched.add(url);
    const image = new Image();
    image.decoding = "async";
    image.src = url;
  }
};

// The player plus what only the browser knows: the timer, a hidden tab, and the next image.
export const usePassPlayer = (
  init: PlayerInit,
  nextImages: (index: number) => string[],
): [PlayerState, Dispatch<PlayerEvent>] => {
  const [state, dispatch] = useReducer(playerReducer, init, initPlayer);

  // One timeout per step, so a step never comes early after a seek or a speed change.
  useEffect(() => {
    if (!state.playing) return;
    const timer = window.setTimeout(() => dispatch({ type: "tick" }), stepMs(state.speed));
    return () => window.clearTimeout(timer);
  }, [state.playing, state.index, state.speed]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: "pause" });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    prefetch(nextImages(state.index));
  }, [state.index, nextImages]);

  return [state, dispatch];
};
