import { useEffect, useReducer, type Dispatch } from "react";

import {
  initPlayer,
  playerReducer,
  stepMs,
  type PlayerEvent,
  type PlayerInit,
  type PlayerState,
} from "@/features/timeline/sequencePlayer";

// The next pass's image, fetched ahead so its drape comes from the HTTP cache. Cesium 1.146 loads a
// SingleTileImageryProvider through a CORS XHR (blob → ImageBitmap), not through an <img>, so what it
// reuses is the HTTP cache entry, not this element. `crossOrigin = "anonymous"` makes this a CORS request
// too, so that entry (with its CORS headers) serves Cesium's request. The elements stay referenced
// here so the browser doesn't drop a fetch it hasn't finished.
const prefetched = new Map<string, HTMLImageElement>();

const prefetch = (urls: string[]): void => {
  for (const url of urls) {
    if (prefetched.has(url)) continue;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.src = url;
    prefetched.set(url, image);
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
