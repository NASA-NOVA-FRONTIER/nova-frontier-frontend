import { describe, expect, it } from "vitest";

import {
  BASE_STEP_MS,
  initPlayer,
  playerReducer,
  stepMs,
  type PlayerEvent,
  type PlayerState,
} from "@/features/timeline/sequencePlayer";

const playing = (overrides: Partial<PlayerState> = {}): PlayerState => ({
  ...initPlayer({ n: 5, index: 2, canPlay: true, reducedMotion: false }),
  ...overrides,
});

const run = (state: PlayerState, ...events: PlayerEvent[]): PlayerState =>
  events.reduce(playerReducer, state);

describe("sequence player", () => {
  it("autoplays from the first step unless the user prefers reduced motion", () => {
    expect(initPlayer({ n: 5, index: 3, canPlay: true, reducedMotion: false })).toMatchObject({
      index: 0,
      playing: true,
      speed: 1,
      loop: true,
    });
    // Reduced motion opens paused on the pass the result is about (Cristian, T7).
    expect(initPlayer({ n: 5, index: 3, canPlay: true, reducedMotion: true })).toMatchObject({
      index: 3,
      playing: false,
    });
  });

  it("never plays one step, or a sequence with no images of its own", () => {
    expect(initPlayer({ n: 1, index: 0, canPlay: true, reducedMotion: false })).toMatchObject({
      playing: false,
      canPlay: false,
    });
    const caseWithoutImages = initPlayer({ n: 8, index: 3, canPlay: false, reducedMotion: false });
    expect(caseWithoutImages).toMatchObject({ index: 3, playing: false });
    expect(run(caseWithoutImages, { type: "toggle" }).playing).toBe(false);
  });

  it("steps forward and loops back to the first pass", () => {
    expect(run(playing(), { type: "tick" }).index).toBe(1);
    expect(run(playing({ index: 4 }), { type: "tick" })).toMatchObject({ index: 0, playing: true });
  });

  it("with Loop off, stops on the last pass and Play starts over", () => {
    const stopped = run(playing({ index: 4, loop: false }), { type: "tick" });
    expect(stopped).toMatchObject({ index: 4, playing: false });
    expect(run(stopped, { type: "toggle" })).toMatchObject({ index: 0, playing: true });
  });

  it("ignores ticks while paused", () => {
    const paused = playing({ playing: false });
    expect(run(paused, { type: "tick" })).toBe(paused);
  });

  it("previous, next and scrubbing pause; previous and next wrap around", () => {
    expect(run(playing({ index: 4 }), { type: "next" })).toMatchObject({
      index: 0,
      playing: false,
    });
    expect(run(playing({ index: 0 }), { type: "prev" })).toMatchObject({
      index: 4,
      playing: false,
    });
    expect(run(playing(), { type: "seek", index: 3 })).toMatchObject({ index: 3, playing: false });
    expect(run(playing(), { type: "seek", index: 99 }).index).toBe(4);
  });

  it("a hidden tab or a map interaction pauses; speed and loop keep it playing", () => {
    expect(run(playing(), { type: "pause" }).playing).toBe(false);
    expect(run(playing(), { type: "speed", speed: 2 })).toMatchObject({ speed: 2, playing: true });
    expect(run(playing(), { type: "loop" })).toMatchObject({ loop: false, playing: true });
  });

  it("follows a date the explorer picked without pausing", () => {
    expect(run(playing({ index: 1 }), { type: "sync", index: 3 })).toMatchObject({
      index: 3,
      playing: true,
    });
  });

  it("waits 1.6 s per step at 1×, half at 2×, double at 0.5×", () => {
    expect(stepMs(1)).toBe(BASE_STEP_MS);
    expect(stepMs(2)).toBe(800);
    expect(stepMs(0.5)).toBe(3200);
  });
});
