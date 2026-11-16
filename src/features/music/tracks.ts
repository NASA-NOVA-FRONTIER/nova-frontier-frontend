import starfireUrl from "@/features/music/audio/starfire.mp3?url";
import theSpacesBetweenUrl from "@/features/music/audio/the-spaces-between.mp3?url";

export type TrackId = "landing" | "globe";

export type Track = {
  id: TrackId;
  title: string;
  artist: string;
  // Name under src/features/music/audio; the size test reads it.
  file: string;
  src: string;
  // Integrated loudness of the shipped file in LUFS (ffmpeg's ebur128), which is why the gains differ.
  lufs: number;
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
    lufs: -15.1,
    gain: 0.4,
    licenseName: "CC BY 4.0",
    licenseUrl: LICENSE_URL,
    sourceUrl: `${LIBRARY_URL}/starfire/`,
  },
  globe: {
    id: "globe",
    title: "The Spaces Between",
    artist: "Scott Buckley",
    file: "the-spaces-between.mp3",
    src: theSpacesBetweenUrl,
    lufs: -21.3,
    gain: 0.6,
    licenseName: "CC BY 4.0",
    licenseUrl: LICENSE_URL,
    sourceUrl: `${LIBRARY_URL}/the-spaces-between/`,
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
