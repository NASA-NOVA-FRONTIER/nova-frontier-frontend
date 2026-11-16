import { describe, expect, it } from "vitest";

import {
  hasSeenMusicHint,
  markMusicHintSeen,
  MUSIC_HINT_KEY,
  MUSIC_WANTED_KEY,
  readMusicWanted,
  writeMusicWanted,
  type KeyValueStorage,
} from "@/features/music/musicPreference";

const memoryStorage = (): KeyValueStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

const brokenStorage: KeyValueStorage = {
  getItem: () => {
    throw new Error("storage blocked");
  },
  setItem: () => {
    throw new Error("storage blocked");
  },
};

describe("the music preference", () => {
  it("starts off on a first visit", () => {
    expect(readMusicWanted(memoryStorage())).toBe(false);
  });

  it("remembers that sound is on", () => {
    // Arrange
    const storage = memoryStorage();

    // Act
    writeMusicWanted(storage, true);

    // Assert
    expect(storage.data.get(MUSIC_WANTED_KEY)).toBe("on");
    expect(readMusicWanted(storage)).toBe(true);
  });

  it("remembers that sound was turned off again", () => {
    // Arrange
    const storage = memoryStorage();
    writeMusicWanted(storage, true);

    // Act
    writeMusicWanted(storage, false);

    // Assert
    expect(storage.data.get(MUSIC_WANTED_KEY)).toBe("off");
    expect(readMusicWanted(storage)).toBe(false);
  });

  it("treats an unknown stored value as off", () => {
    // Arrange
    const storage = memoryStorage();
    storage.data.set(MUSIC_WANTED_KEY, "maybe");

    // Act / Assert
    expect(readMusicWanted(storage)).toBe(false);
  });

  it("survives blocked storage, reading off and writing nothing", () => {
    expect(readMusicWanted(brokenStorage)).toBe(false);
    expect(() => writeMusicWanted(brokenStorage, true)).not.toThrow();
  });

  it("survives having no storage at all", () => {
    expect(readMusicWanted(null)).toBe(false);
    expect(() => writeMusicWanted(null, true)).not.toThrow();
  });
});

describe("the first-visit hint flag", () => {
  it("is unseen until it is marked", () => {
    // Arrange
    const storage = memoryStorage();

    // Act
    const before = hasSeenMusicHint(storage);
    markMusicHintSeen(storage);

    // Assert
    expect(before).toBe(false);
    expect(storage.data.get(MUSIC_HINT_KEY)).toBe("1");
    expect(hasSeenMusicHint(storage)).toBe(true);
  });

  it("shows again on every visit when storage is blocked, never crashing", () => {
    expect(hasSeenMusicHint(brokenStorage)).toBe(false);
    expect(() => markMusicHintSeen(brokenStorage)).not.toThrow();
    expect(hasSeenMusicHint(null)).toBe(false);
  });
});
