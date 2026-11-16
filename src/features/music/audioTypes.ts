/*
 * The slice of the Web Audio API the engine uses. The browser's own classes fit it, and the unit
 * tests drive the engine with a fake clock and fake nodes instead of a real audio device.
 */

export type AudioParamLike = {
  value: number;
  setValueAtTime(value: number, time: number): unknown;
  linearRampToValueAtTime(value: number, time: number): unknown;
  setValueCurveAtTime(values: Float32Array, time: number, duration: number): unknown;
  cancelScheduledValues(time: number): unknown;
};

export type GainNodeLike = {
  readonly gain: AudioParamLike;
  connect(node: unknown): unknown;
  disconnect(): void;
};

export type AudioBufferLike = { readonly duration: number };

export type SourceNodeLike = {
  buffer: AudioBufferLike | null;
  onended: ((event: Event) => void) | null;
  connect(node: unknown): unknown;
  disconnect(): void;
  start(when: number): void;
  stop(when?: number): void;
};

export type AudioContextLike = {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: unknown;
  createGain(): GainNodeLike;
  createBufferSource(): SourceNodeLike;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBufferLike>;
  resume(): Promise<void>;
  suspend(): Promise<void>;
};
