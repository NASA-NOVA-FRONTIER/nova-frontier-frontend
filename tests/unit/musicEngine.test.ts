import { describe, expect, it, vi } from "vitest";

import type {
  AudioBufferLike,
  AudioContextLike,
  AudioParamLike,
  GainNodeLike,
  SourceNodeLike,
} from "@/features/music/audioTypes";
import { crossfadeFor } from "@/features/music/loopSchedule";
import {
  createMusicEngine,
  LOOKAHEAD_SECONDS,
  MUTE_FADE_SECONDS,
  ROUTE_CROSSFADE_SECONDS,
  type EngineStatus,
  type PlayableTrack,
} from "@/features/music/musicEngine";

const TRACK_SECONDS = 100;
const CROSSFADE = crossfadeFor(TRACK_SECONDS);
const PASS_SECONDS = TRACK_SECONDS - CROSSFADE;
const COVERAGE_STEP = 0.05;
// A background tab slows its timers to about once a second, so a pass must be queued far
// earlier than that. A fixed number, not the engine's own constant, so the test can catch a regression.
const MIN_LEAD_SECONDS = 10;
const STARFIRE: PlayableTrack = { id: "landing", src: "/assets/starfire.mp3", gain: 0.4 };
const SOLACE: PlayableTrack = { id: "globe", src: "/assets/solace.mp3", gain: 0.25 };

type ParamCall = {
  method:
    "setValueAtTime" | "linearRampToValueAtTime" | "setValueCurveAtTime" | "cancelScheduledValues";
  time: number;
  value?: number;
  duration?: number;
};

class FakeParam implements AudioParamLike {
  value = 1;
  calls: ParamCall[] = [];

  setValueAtTime(value: number, time: number) {
    this.value = value;
    this.calls.push({ method: "setValueAtTime", time, value });
  }

  linearRampToValueAtTime(value: number, time: number) {
    this.value = value;
    this.calls.push({ method: "linearRampToValueAtTime", time, value });
  }

  setValueCurveAtTime(_values: Float32Array, time: number, duration: number) {
    this.calls.push({ method: "setValueCurveAtTime", time, duration });
  }

  cancelScheduledValues(time: number) {
    this.calls.push({ method: "cancelScheduledValues", time });
  }
}

class FakeGain implements GainNodeLike {
  gain = new FakeParam();
  connected: unknown[] = [];
  disconnected = false;

  connect(node: unknown) {
    this.connected.push(node);
  }

  disconnect() {
    this.disconnected = true;
  }
}

class FakeSource implements SourceNodeLike {
  buffer: AudioBufferLike | null = null;
  onended: (() => void) | null = null;
  connectedTo: FakeGain | null = null;
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  leadSeconds: number | null = null;
  private readonly clock: () => number;

  constructor(clock: () => number) {
    this.clock = clock;
  }

  connect(node: unknown) {
    this.connectedTo = node as FakeGain;
  }

  disconnect() {}

  start(when: number) {
    this.startedAt = when;
    this.leadSeconds = when - this.clock();
  }

  stop(when?: number) {
    this.stoppedAt = when ?? this.clock();
  }
}

type Timer = { due: number; interval: number | null; callback: () => void };

const createFakeAudio = () => {
  let nowMilliseconds = 0;
  const timers = new Set<Timer>();
  const clock = () => nowMilliseconds / 1000;
  const gains: FakeGain[] = [];
  const sources: FakeSource[] = [];
  const state = { resumed: 0, suspended: 0, created: 0 };

  const context: AudioContextLike = {
    get currentTime() {
      return clock();
    },
    state: "running",
    destination: { kind: "destination" },
    createGain: () => {
      const gain = new FakeGain();
      gains.push(gain);
      return gain;
    },
    createBufferSource: () => {
      const source = new FakeSource(clock);
      sources.push(source);
      return source;
    },
    decodeAudioData: async () => ({ duration: TRACK_SECONDS }),
    resume: async () => {
      state.resumed += 1;
    },
    suspend: async () => {
      state.suspended += 1;
    },
  };

  const schedule = (callback: () => void, milliseconds: number, repeat: boolean) => {
    const timer: Timer = {
      due: nowMilliseconds + milliseconds,
      interval: repeat ? milliseconds : null,
      callback,
    };
    timers.add(timer);
    return () => void timers.delete(timer);
  };

  const advance = (seconds: number) => {
    const end = nowMilliseconds + seconds * 1000;
    while (nowMilliseconds < end) {
      nowMilliseconds = Math.min(nowMilliseconds + 50, end);
      for (const timer of [...timers]) {
        if (!timers.has(timer) || timer.due > nowMilliseconds) continue;
        if (timer.interval === null) timers.delete(timer);
        else timer.due += timer.interval;
        timer.callback();
      }
    }
  };

  return {
    context,
    gains,
    sources,
    state,
    advance,
    now: clock,
    every: (callback: () => void, milliseconds: number) => schedule(callback, milliseconds, true),
    after: (callback: () => void, milliseconds: number) => schedule(callback, milliseconds, false),
  };
};

type FetchTrack = (url: string) => Promise<ArrayBuffer>;

const setup = (fetchTrack = vi.fn<FetchTrack>(async () => new ArrayBuffer(8))) => {
  const audio = createFakeAudio();
  const statuses: EngineStatus[] = [];
  const createContext = vi.fn(() => {
    audio.state.created += 1;
    return audio.context;
  });
  const engine = createMusicEngine({
    createContext,
    fetchTrack,
    every: audio.every,
    after: audio.after,
    onStatus: (status) => statuses.push(status),
  });
  const master = () => audio.gains[0];
  const voiceGains = () => audio.gains.filter((gain) => gain.connected.includes(master()));
  const sourcesOf = (voice: FakeGain) =>
    audio.sources.filter((source) => (source.connectedTo?.connected ?? []).includes(voice));
  return { audio, engine, statuses, createContext, fetchTrack, master, voiceGains, sourcesOf };
};

const lastCall = (param: FakeParam | undefined, method: ParamCall["method"]) =>
  param?.calls.filter((call) => call.method === method).at(-1);

describe("createMusicEngine", () => {
  it("makes no audio context until sound is asked for", async () => {
    // Arrange
    const { engine, createContext } = setup();

    // Act
    engine.setRunning(false);
    await engine.play(null);

    // Assert
    expect(createContext).not.toHaveBeenCalled();
  });

  it("unlock creates and resumes the context once, inside the gesture", () => {
    // Arrange
    const { engine, createContext, audio } = setup();

    // Act
    engine.unlock();
    engine.unlock();

    // Assert
    expect(createContext).toHaveBeenCalledTimes(1);
    expect(audio.state.resumed).toBeGreaterThanOrEqual(1);
  });

  it("reports loading, then playing, and downloads a track once", async () => {
    // Arrange
    const { engine, statuses, fetchTrack } = setup();

    // Act
    await engine.play(STARFIRE);
    await engine.play(STARFIRE);

    // Assert
    expect(statuses.slice(0, 2)).toEqual(["loading", "playing"]);
    expect(statuses.at(-1)).toBe("playing");
    expect(fetchTrack).toHaveBeenCalledTimes(1);
    expect(fetchTrack).toHaveBeenCalledWith(STARFIRE.src);
  });

  it("starts the first pass at once and fades the voice in to the track's volume", async () => {
    // Arrange
    const { engine, audio, voiceGains } = setup();

    // Act
    await engine.play(STARFIRE);

    // Assert
    const [voice] = voiceGains();
    expect(audio.sources).toHaveLength(1);
    expect(audio.sources[0]?.startedAt).toBeLessThan(0.5);
    expect(lastCall(voice?.gain, "setValueAtTime")?.value).toBe(0);
    expect(lastCall(voice?.gain, "linearRampToValueAtTime")?.value).toBe(STARFIRE.gain);
  });

  it("does nothing when the same track is played again", async () => {
    // Arrange
    const { engine, audio, voiceGains } = setup();
    await engine.play(STARFIRE);
    const before = audio.sources.length;

    // Act
    await engine.play(STARFIRE);

    // Assert
    expect(voiceGains()).toHaveLength(1);
    expect(audio.sources).toHaveLength(before);
  });

  it("overlaps each pass with the next by the crossfade", async () => {
    // Arrange
    const { engine, audio } = setup();
    await engine.play(STARFIRE);

    // Act
    audio.advance(PASS_SECONDS * 3);

    // Assert
    const starts = audio.sources.map((source) => source.startedAt ?? Number.NaN);
    expect(starts.length).toBeGreaterThanOrEqual(4);
    starts.slice(1).forEach((start, index) => {
      expect(start - (starts[index] ?? 0)).toBeCloseTo(PASS_SECONDS, 6);
    });
  });

  it("keeps a pass sounding at every instant over several loops", async () => {
    // Arrange
    const { engine, audio } = setup();
    await engine.play(STARFIRE);
    audio.advance(PASS_SECONDS * 3 + 30);
    const from = audio.sources[0]?.startedAt ?? 0;
    const to = from + PASS_SECONDS * 3;
    const silent: number[] = [];

    // Act
    for (let time = from; time < to; time += COVERAGE_STEP) {
      const sounding = audio.sources.some(
        (source) =>
          (source.startedAt ?? Number.POSITIVE_INFINITY) <= time &&
          time < (source.stoppedAt ?? Number.NEGATIVE_INFINITY),
      );
      if (!sounding) silent.push(time);
    }

    // Assert
    expect(silent).toEqual([]);
  });

  it("fades each later pass in and every pass out over the crossfade", async () => {
    // Arrange
    const { engine, audio } = setup();
    await engine.play(STARFIRE);

    // Act
    audio.advance(PASS_SECONDS * 2);

    // Assert
    audio.sources.slice(0, 3).forEach((source, index) => {
      const curves =
        source.connectedTo?.gain.calls.filter((call) => call.method === "setValueCurveAtTime") ??
        [];
      const fadeOut = curves.at(-1);
      expect(fadeOut?.time).toBeCloseTo((source.stoppedAt ?? 0) - CROSSFADE, 6);
      expect(fadeOut?.duration).toBe(CROSSFADE);
      if (index === 0) expect(curves).toHaveLength(1);
      else {
        expect(curves).toHaveLength(2);
        expect(curves[0]?.time).toBe(source.startedAt);
        expect(curves[0]?.duration).toBe(CROSSFADE);
      }
    });
  });

  it("schedules passes well ahead of time and never in the past", async () => {
    // Arrange
    const { engine, audio } = setup();
    await engine.play(STARFIRE);

    // Act
    audio.advance(PASS_SECONDS * 3);

    // Assert
    const leads = audio.sources.slice(1).map((source) => source.leadSeconds ?? Number.NaN);
    expect(leads.length).toBeGreaterThanOrEqual(3);
    expect(Math.min(...leads)).toBeGreaterThanOrEqual(MIN_LEAD_SECONDS);
    expect(Math.max(...leads)).toBeLessThanOrEqual(LOOKAHEAD_SECONDS);
  });

  it("crossfades to the new track on a route change and retires the old one", async () => {
    // Arrange
    const { engine, audio, voiceGains, sourcesOf } = setup();
    await engine.play(STARFIRE);
    audio.advance(10);
    const changedAt = audio.now();

    // Act
    await engine.play(SOLACE);

    // Assert
    const [oldVoice, newVoice] = voiceGains();
    expect(voiceGains()).toHaveLength(2);
    const fadeOut = lastCall(oldVoice?.gain, "linearRampToValueAtTime");
    expect(fadeOut?.value).toBe(0);
    expect(fadeOut?.time).toBeCloseTo(changedAt + ROUTE_CROSSFADE_SECONDS, 6);
    const fadeIn = lastCall(newVoice?.gain, "linearRampToValueAtTime");
    expect(fadeIn?.value).toBe(SOLACE.gain);
    expect(fadeIn?.time).toBeCloseTo(changedAt + ROUTE_CROSSFADE_SECONDS, 6);

    audio.advance(ROUTE_CROSSFADE_SECONDS + 1);
    expect(oldVoice?.disconnected).toBe(true);
    expect(oldVoice && sourcesOf(oldVoice).every((source) => source.stoppedAt !== null)).toBe(true);
    expect(newVoice?.disconnected).toBe(false);
  });

  it("lets a newer track win over a slower earlier download", async () => {
    // Arrange
    let finishFirst: (data: ArrayBuffer) => void = () => {};
    const fetchTrack = vi.fn((url: string) =>
      url === STARFIRE.src
        ? new Promise<ArrayBuffer>((resolve) => (finishFirst = resolve))
        : Promise.resolve(new ArrayBuffer(8)),
    );
    const { engine, voiceGains, audio } = setup(fetchTrack);

    // Act
    const slow = engine.play(STARFIRE);
    await engine.play(SOLACE);
    finishFirst(new ArrayBuffer(8));
    await slow;

    // Assert
    expect(voiceGains()).toHaveLength(1);
    expect(
      audio.sources.every((source) => source.connectedTo?.connected.includes(voiceGains()[0])),
    ).toBe(true);
  });

  it("fades out and goes idle when there is no track", async () => {
    // Arrange
    const { engine, statuses, voiceGains, audio } = setup();
    await engine.play(STARFIRE);

    // Act
    await engine.play(null);

    // Assert
    expect(statuses.at(-1)).toBe("idle");
    expect(lastCall(voiceGains()[0]?.gain, "linearRampToValueAtTime")?.value).toBe(0);
    audio.advance(ROUTE_CROSSFADE_SECONDS + 1);
    expect(voiceGains()[0]?.disconnected).toBe(true);
  });

  it("fades out and suspends when stopped, then resumes when started", async () => {
    // Arrange
    const { engine, audio, master } = setup();
    await engine.play(STARFIRE);
    const resumedBefore = audio.state.resumed;

    // Act
    engine.setRunning(false);
    const fadeOut = lastCall(master()?.gain, "linearRampToValueAtTime");
    const suspendedAtOnce = audio.state.suspended;
    audio.advance(MUTE_FADE_SECONDS + 0.5);
    engine.setRunning(true);

    // Assert
    expect(fadeOut?.value).toBe(0);
    expect(suspendedAtOnce).toBe(0);
    expect(audio.state.suspended).toBe(1);
    expect(audio.state.resumed).toBe(resumedBefore + 1);
    expect(lastCall(master()?.gain, "linearRampToValueAtTime")?.value).toBe(1);
  });

  it("does not suspend when it is started again before the fade ends", async () => {
    // Arrange
    const { engine, audio } = setup();
    await engine.play(STARFIRE);

    // Act
    engine.setRunning(false);
    audio.advance(MUTE_FADE_SECONDS / 2);
    engine.setRunning(true);
    audio.advance(MUTE_FADE_SECONDS + 1);

    // Assert
    expect(audio.state.suspended).toBe(0);
  });

  it("reports an error when the download fails and tries again on the next play", async () => {
    // Arrange
    const fetchTrack = vi
      .fn<(url: string) => Promise<ArrayBuffer>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(new ArrayBuffer(8));
    const { engine, statuses, audio } = setup(fetchTrack);

    // Act
    await engine.play(STARFIRE);
    const afterFailure = statuses.at(-1);
    await engine.play(STARFIRE);

    // Assert
    expect(afterFailure).toBe("error");
    expect(fetchTrack).toHaveBeenCalledTimes(2);
    expect(statuses.at(-1)).toBe("playing");
    expect(audio.sources).toHaveLength(1);
  });
});
