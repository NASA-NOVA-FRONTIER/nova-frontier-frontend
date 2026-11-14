import { useSyncExternalStore } from "react";

// The explorer's phone layout (SPECS-v8 Mobile); CSS uses the same width.
export const PHONE_QUERY = "(max-width: 760px)";

// Whether a media query matches now, kept current as the window resizes or rotates.
export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
