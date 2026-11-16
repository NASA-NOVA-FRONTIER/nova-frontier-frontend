import { describe, expect, it, vi } from "vitest";

import {
  hasSeenMusicHint,
  MUSIC_WANTED_KEY,
  readMusicWanted,
  type KeyValueStorage,
} from "@/features/music/musicPreference";
import {
  createMusicStore,
  displayState,
  hintVisible,
  isRunning,
  type MusicSnapshot,
} from "@/features/music/musicStore";

const memoryStorage = (): KeyValueStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
};

const snapshot = (changes: Partial<MusicSnapshot> = {}): MusicSnapshot => ({
  wanted: true,
  unlocked: true,
  hidden: false,
  track: "landing",
  engine: "playing",
  hintSeen: true,
  ...changes,
});

describe("createMusicStore", () => {
  it("starts a first visit with sound off and the hint showing", () => {
    // Arrange / Act
    const store = createMusicStore(memoryStorage());
    const state = store.getSnapshot();

    // Assert
    expect(state.wanted).toBe(false);
    expect(displayState(state)).toBe("off");
    expect(hintVisible(state)).toBe(true);
  });

  it("turning sound on unlocks it, hides the hint and remembers the choice", () => {
    // Arrange
    const storage = memoryStorage();
    const store = createMusicStore(storage);

    // Act
    store.toggle();

    // Assert
    const state = store.getSnapshot();
    expect(state.wanted).toBe(true);
    expect(state.unlocked).toBe(true);
    expect(hintVisible(state)).toBe(false);
    expect(readMusicWanted(storage)).toBe(true);
    expect(hasSeenMusicHint(storage)).toBe(true);
  });

  it("gives a returning listener no hint and waits for the first gesture", () => {
    // Arrange
    const storage = memoryStorage();
    storage.data.set(MUSIC_WANTED_KEY, "on");

    // Act
    const store = createMusicStore(storage);
    const before = store.getSnapshot();
    store.markUnlocked();

    // Assert
    expect(before.wanted).toBe(true);
    expect(before.unlocked).toBe(false);
    expect(displayState(before)).toBe("waiting");
    expect(hintVisible(before)).toBe(false);
    expect(store.getSnapshot().unlocked).toBe(true);
  });

  it("keeps the hint away for good once sound was turned on and off", () => {
    // Arrange
    const storage = memoryStorage();
    const store = createMusicStore(storage);

    // Act
    store.toggle();
    store.toggle();

    // Assert
    const state = store.getSnapshot();
    expect(state.wanted).toBe(false);
    expect(hintVisible(state)).toBe(false);
    expect(readMusicWanted(storage)).toBe(false);
    expect(hintVisible(createMusicStore(storage).getSnapshot())).toBe(false);
  });

  it("remembers a dismissed hint on the next visit", () => {
    // Arrange
    const storage = memoryStorage();
    const store = createMusicStore(storage);

    // Act
    store.dismissHint();

    // Assert
    expect(hintVisible(store.getSnapshot())).toBe(false);
    expect(hintVisible(createMusicStore(storage).getSnapshot())).toBe(false);
  });

  it("pauses while the tab is hidden and resumes when it is back", () => {
    // Arrange
    const store = createMusicStore(memoryStorage());
    store.toggle();
    store.setEngine("playing");

    // Act
    store.setHidden(true);
    const hidden = store.getSnapshot();
    store.setHidden(false);

    // Assert
    expect(displayState(hidden)).toBe("paused");
    expect(isRunning(hidden)).toBe(false);
    expect(displayState(store.getSnapshot())).toBe("playing");
    expect(isRunning(store.getSnapshot())).toBe(true);
  });

  it("follows the route's track", () => {
    // Arrange
    const store = createMusicStore(memoryStorage());

    // Act
    store.setTrack("globe");

    // Assert
    expect(store.getSnapshot().track).toBe("globe");
  });

  it("notifies only when something changed, with a stable snapshot otherwise", () => {
    // Arrange
    const store = createMusicStore(memoryStorage());
    const listener = vi.fn();
    store.subscribe(listener);
    const first = store.getSnapshot();

    // Act
    store.setHidden(false);
    store.setTrack(first.track);
    store.setEngine(first.engine);
    const unchanged = store.getSnapshot();
    store.setHidden(true);

    // Assert
    expect(unchanged).toBe(first);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", () => {
    // Arrange
    const store = createMusicStore(memoryStorage());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    // Act
    unsubscribe();
    store.toggle();

    // Assert
    expect(listener).not.toHaveBeenCalled();
  });

  it("works without storage", () => {
    // Arrange
    const store = createMusicStore(null);

    // Act
    store.toggle();

    // Assert
    expect(store.getSnapshot().wanted).toBe(true);
  });
});

describe("displayState", () => {
  it.each([
    ["off", snapshot({ wanted: false, unlocked: false }), "off"],
    ["waiting for a gesture", snapshot({ unlocked: false }), "waiting"],
    ["hidden tab", snapshot({ hidden: true }), "paused"],
    ["a download that failed", snapshot({ engine: "error" }), "error"],
    ["a track that is loading", snapshot({ engine: "loading" }), "loading"],
    ["nothing started yet", snapshot({ engine: "idle" }), "loading"],
    ["playing", snapshot(), "playing"],
  ] as const)("is %s -> %s", (_name, state, expected) => {
    expect(displayState(state)).toBe(expected);
  });

  it("shows off even when the engine still holds an old error", () => {
    expect(displayState(snapshot({ wanted: false, engine: "error" }))).toBe("off");
  });
});

describe("hintVisible", () => {
  it("shows only on an unseen first visit with sound off", () => {
    expect(hintVisible(snapshot({ wanted: false, hintSeen: false }))).toBe(true);
    expect(hintVisible(snapshot({ wanted: false, hintSeen: true }))).toBe(false);
    expect(hintVisible(snapshot({ wanted: true, hintSeen: false }))).toBe(false);
  });
});

describe("isRunning", () => {
  it("needs the wish, the gesture and a visible tab", () => {
    expect(isRunning(snapshot())).toBe(true);
    expect(isRunning(snapshot({ wanted: false }))).toBe(false);
    expect(isRunning(snapshot({ unlocked: false }))).toBe(false);
    expect(isRunning(snapshot({ hidden: true }))).toBe(false);
  });
});
