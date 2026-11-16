import "@/features/music/music.css";

import { useEffect } from "react";

import { MUSIC_COPY } from "@/content/copyMusic";
import { displayState, hintVisible, type MusicDisplayState } from "@/features/music/musicStore";
import {
  musicStore,
  toggleMusic,
  TOGGLE_MARKER,
  useMusicSnapshot,
} from "@/features/music/musicRuntime";

// The hint is a nudge, not a notice: it fades away by itself and never returns.
export const HINT_VISIBLE_MS = 15_000;
const HINT_ID = "sound-hint";

const TITLES: Record<MusicDisplayState, string> = {
  off: MUSIC_COPY.titleOff,
  waiting: MUSIC_COPY.titleWaiting,
  paused: MUSIC_COPY.titleOn,
  loading: MUSIC_COPY.titleLoading,
  playing: MUSIC_COPY.titleOn,
  error: MUSIC_COPY.titleError,
};

const Speaker = ({ on }: { on: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 9.5v5h3.5l4.5 4v-13l-4.5 4z" />
    {on ? (
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" />
    ) : (
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    )}
  </svg>
);

type SoundToggleProps = {
  // The site bar draws its own round button; the explorer reuses its icon-button style.
  variant: "site" | "explorer";
};

export const SoundToggle = ({ variant }: SoundToggleProps) => {
  const state = useMusicSnapshot();
  const shown = displayState(state);
  const showHint = hintVisible(state);

  useEffect(() => {
    if (!showHint) return;
    const timer = window.setTimeout(musicStore.dismissHint, HINT_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [showHint]);

  return (
    <span className="mu-wrap" {...{ [TOGGLE_MARKER]: "" }}>
      <button
        type="button"
        className={variant === "explorer" ? "x-icon-button mu-toggle" : "mu-toggle mu-toggle--site"}
        aria-label={MUSIC_COPY.toggleLabel}
        aria-pressed={state.wanted}
        aria-busy={shown === "loading"}
        aria-describedby={showHint ? HINT_ID : undefined}
        title={TITLES[shown]}
        data-testid="sound-toggle"
        data-state={shown}
        data-track={state.track ?? "none"}
        onClick={toggleMusic}
      >
        <Speaker on={state.wanted} />
      </button>
      {showHint && (
        <span id={HINT_ID} role="status" className="mu-hint" data-testid="sound-hint">
          {MUSIC_COPY.hint}
        </span>
      )}
    </span>
  );
};
