/*
 * What the listener chose, kept in localStorage, which can throw (private mode, blocked storage):
 * every access is guarded, and without storage the choice simply does not last.
 */

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export const MUSIC_WANTED_KEY = "nhw-music";
export const MUSIC_HINT_KEY = "nhw-music-hint-seen";

const ON = "on";
const OFF = "off";
const SEEN = "1";

export const browserStorage = (): KeyValueStorage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const read = (storage: KeyValueStorage | null, key: string): string | null => {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
};

const write = (storage: KeyValueStorage | null, key: string, value: string): void => {
  try {
    storage?.setItem(key, value);
  } catch {
    // Nothing to do: the choice just does not last.
  }
};

export const readMusicWanted = (storage: KeyValueStorage | null): boolean =>
  read(storage, MUSIC_WANTED_KEY) === ON;

export const writeMusicWanted = (storage: KeyValueStorage | null, wanted: boolean): void =>
  write(storage, MUSIC_WANTED_KEY, wanted ? ON : OFF);

export const hasSeenMusicHint = (storage: KeyValueStorage | null): boolean =>
  read(storage, MUSIC_HINT_KEY) === SEEN;

export const markMusicHintSeen = (storage: KeyValueStorage | null): void =>
  write(storage, MUSIC_HINT_KEY, SEEN);
