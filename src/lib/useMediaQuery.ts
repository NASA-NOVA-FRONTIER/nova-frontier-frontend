import { useSyncExternalStore } from "react";

// The explorer's phone layout: the bottom sheet, the mobile bar and the compact timeline.
export const PHONE_QUERY = "(max-width: 760px)";

const matches = (query: string): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia(query).matches;

// Follows a media query, so React and the CSS switch layouts at the same width.
export const useMediaQuery = (query: string): boolean =>
  useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => matches(query),
    () => false,
  );
