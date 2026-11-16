import solaceUrl from "@/features/music/audio/solace.mp3?url";
import starfireUrl from "@/features/music/audio/starfire.mp3?url";

export type TrackId = "landing" | "globe";

export type Track = {
  id: TrackId;
  title: string;
  artist: string;
  // Name under src/features/music/audio; the size test reads it.
  file: string;
  src: string;
  // Output level: the landing sounds fuller, the globe stays a quiet bed under the data.
  gain: number;
  licenseName: "CC BY 4.0";
  licenseUrl: string;
  sourceUrl: string;
};

export const ARTIST_URL = "https://www.scottbuckley.com.au";
// The author asks for exactly this wording in credits.
const CREDIT_LICENSE = "CC-BY 4.0";
const CREDIT_SITE = "www.scottbuckley.com.au";
const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const LIBRARY_URL = `${ARTIST_URL}/library`;

export const TRACKS: Record<TrackId, Track> = {
  landing: {
    id: "landing",
    title: "Starfire",
    artist: "Scott Buckley",
    file: "starfire.mp3",
    src: starfireUrl,
    gain: 0.4,
    licenseName: "CC BY 4.0",
    licenseUrl: LICENSE_URL,
    sourceUrl: `${LIBRARY_URL}/starfire/`,
  },
  globe: {
    id: "globe",
    title: "Solace",
    artist: "Scott Buckley",
    file: "solace.mp3",
    src: solaceUrl,
    gain: 0.25,
    licenseName: "CC BY 4.0",
    licenseUrl: LICENSE_URL,
    sourceUrl: `${LIBRARY_URL}/solace/`,
  },
};

export const TRACK_LIST: Track[] = [TRACKS.landing, TRACKS.globe];

type Route = { pathname: string; search: string };

// Mirrors App.tsx: the explorer is /explore or any legacy link carrying ?frame=. The printable
// report is silent; every other page plays the landing track.
export const trackIdForRoute = ({ pathname, search }: Route): TrackId | null => {
  if (pathname === "/explore" || new URLSearchParams(search).has("frame")) return "globe";
  if (pathname === "/report") return null;
  return "landing";
};

export const creditLine = (track: Track): string =>
  `'${track.title}' by ${track.artist} - released under ${CREDIT_LICENSE}. ${CREDIT_SITE}`;
