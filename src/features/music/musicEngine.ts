import type {
  AudioBufferLike,
  AudioContextLike,
  AudioParamLike,
  GainNodeLike,
  SourceNodeLike,
} from "@/features/music/audioTypes";
import { crossfadeFor, EQUAL_POWER_CURVES, planPass } from "@/features/music/loopSchedule";

export type EngineStatus = "idle" | "loading" | "playing" | "error";

export type PlayableTrack = { id: string; src: string; gain: number };

export const FIRST_FADE_SECONDS = 2;
export const ROUTE_CROSSFADE_SECONDS = 2.5;
export const MUTE_FADE_SECONDS = 0.5;
export const RESUME_FADE_SECONDS = 1;
// Passes are queued this far ahead, so a late timer tick (a busy tab) never opens a gap.
export const LOOKAHEAD_SECONDS = 20;
export const TICK_MILLISECONDS = 500;

const START_DELAY_SECONDS = 0.05;
const RETIRE_MARGIN_SECONDS = 0.2;

export type MusicEngineDeps = {
  createContext: () => AudioContextLike;
  fetchTrack: (url: string) => Promise<ArrayBuffer>;
  every: (callback: () => void, milliseconds: number) => () => void;
  after: (callback: () => void, milliseconds: number) => () => void;
  onStatus: (status: EngineStatus) => void;
};

export type MusicEngine = {
  // Makes and resumes the audio context; call it inside a user gesture (Safari insists).
  unlock: () => void;
  // false fades out and suspends the context, true resumes it; no context yet means nothing to do.
  setRunning: (running: boolean) => void;
  // Crossfades to the track from whatever plays; null fades the music out.
  play: (track: PlayableTrack | null) => Promise<void>;
};

type Pass = { source: SourceNodeLike; envelope: GainNodeLike };

type Voice = {
  track: PlayableTrack;
  buffer: AudioBufferLike;
  gain: GainNodeLike;
  firstStart: number;
  passes: number;
  live: Set<Pass>;
};

const fadeTo = (param: AudioParamLike, target: number, now: number, seconds: number): void => {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(target, now + seconds);
};

export const createMusicEngine = (deps: MusicEngineDeps): MusicEngine => {
  let context: AudioContextLike | null = null;
  let master: GainNodeLike | null = null;
  let voice: Voice | null = null;
  let latestRequest = 0;
  let cancelTicker: (() => void) | null = null;
  let cancelSuspend: (() => void) | null = null;
  const buffers = new Map<string, Promise<AudioBufferLike>>();

  const audio = (): { context: AudioContextLike; master: GainNodeLike } => {
    if (context === null || master === null) {
      context = deps.createContext();
      master = context.createGain();
      master.connect(context.destination);
    }
    return { context, master };
  };

  const load = (track: PlayableTrack, audioContext: AudioContextLike): Promise<AudioBufferLike> => {
    const known = buffers.get(track.src);
    if (known !== undefined) return known;
    const pending = deps.fetchTrack(track.src).then((data) => audioContext.decodeAudioData(data));
    buffers.set(track.src, pending);
    // A failed download is forgotten so the next play tries again.
    pending.catch(() => buffers.delete(track.src));
    return pending;
  };

  const schedulePass = (audioContext: AudioContextLike, active: Voice): void => {
    const { duration } = active.buffer;
    const crossfade = crossfadeFor(duration);
    const pass = planPass({ index: active.passes, firstStart: active.firstStart, duration });
    const source = audioContext.createBufferSource();
    source.buffer = active.buffer;
    const envelope = audioContext.createGain();
    source.connect(envelope);
    envelope.connect(active.gain);
    if (pass.fadeInAt !== null) {
      envelope.gain.setValueCurveAtTime(EQUAL_POWER_CURVES.fadeIn, pass.fadeInAt, crossfade);
    }
    envelope.gain.setValueCurveAtTime(EQUAL_POWER_CURVES.fadeOut, pass.fadeOutAt, crossfade);
    const live: Pass = { source, envelope };
    active.live.add(live);
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();
      active.live.delete(live);
    };
    source.start(pass.start);
    source.stop(pass.stopAt);
    active.passes += 1;
  };

  const scheduleDue = (): void => {
    if (context === null || voice === null) return;
    const { duration } = voice.buffer;
    const nextStart = () =>
      planPass({ index: voice?.passes ?? 0, firstStart: voice?.firstStart ?? 0, duration }).start;
    while (voice !== null && nextStart() - context.currentTime <= LOOKAHEAD_SECONDS) {
      schedulePass(context, voice);
    }
  };

  const dispose = (old: Voice): void => {
    for (const { source, envelope } of old.live) {
      source.stop();
      source.disconnect();
      envelope.disconnect();
    }
    old.live.clear();
    old.gain.disconnect();
  };

  const retire = (old: Voice, audioContext: AudioContextLike, seconds: number): void => {
    fadeTo(old.gain.gain, 0, audioContext.currentTime, seconds);
    deps.after(() => dispose(old), (seconds + RETIRE_MARGIN_SECONDS) * 1000);
  };

  const startVoice = (
    nodes: { context: AudioContextLike; master: GainNodeLike },
    track: PlayableTrack,
    buffer: AudioBufferLike,
    fadeSeconds: number,
  ): void => {
    const gain = nodes.context.createGain();
    gain.connect(nodes.master);
    const now = nodes.context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(track.gain, now + fadeSeconds);
    voice = {
      track,
      buffer,
      gain,
      firstStart: now + START_DELAY_SECONDS,
      passes: 0,
      live: new Set(),
    };
    scheduleDue();
    cancelTicker ??= deps.every(scheduleDue, TICK_MILLISECONDS);
  };

  return {
    unlock: () => {
      void audio().context.resume();
    },

    setRunning: (running) => {
      cancelSuspend?.();
      cancelSuspend = null;
      if (context === null || master === null) return;
      const audioContext = context;
      const now = audioContext.currentTime;
      if (running) {
        void audioContext.resume();
        fadeTo(master.gain, 1, now, RESUME_FADE_SECONDS);
        return;
      }
      fadeTo(master.gain, 0, now, MUTE_FADE_SECONDS);
      cancelSuspend = deps.after(
        () => {
          cancelSuspend = null;
          void audioContext.suspend();
        },
        (MUTE_FADE_SECONDS + RETIRE_MARGIN_SECONDS) * 1000,
      );
    },

    play: async (track) => {
      latestRequest += 1;
      const request = latestRequest;
      if (track === null) {
        if (voice !== null && context !== null) retire(voice, context, ROUTE_CROSSFADE_SECONDS);
        voice = null;
        deps.onStatus("idle");
        return;
      }
      if (voice?.track.id === track.id) {
        deps.onStatus("playing");
        return;
      }
      const nodes = audio();
      if (!buffers.has(track.src)) deps.onStatus("loading");
      let buffer: AudioBufferLike;
      try {
        buffer = await load(track, nodes.context);
      } catch {
        if (request === latestRequest) deps.onStatus("error");
        return;
      }
      // A newer request (another route, or off) replaced this one while it downloaded.
      if (request !== latestRequest) return;
      const previous = voice;
      if (previous !== null) retire(previous, nodes.context, ROUTE_CROSSFADE_SECONDS);
      startVoice(
        nodes,
        track,
        buffer,
        previous === null ? FIRST_FADE_SECONDS : ROUTE_CROSSFADE_SECONDS,
      );
      deps.onStatus("playing");
    },
  };
};
