import { localized } from "@/i18n/localized";
// `title` and `image` come with the v8 facts (docs/design/v8/reference/v8-data.js FACTS); the older
// facts are text only. `pixel` keeps a small measured layer crisp when it is scaled up. `credit`
// names whoever made an image that isn't ours (#29); our own case and InSAR crops need none.
export type Fact = {
  id: string;
  text: string;
  source: { label: string; href: string };
  title?: string;
  image?: { src: string; pixel: boolean; credit?: string };
};

const NASA_MISSION = {
  label: "NASA Science · NISAR",
  href: "https://science.nasa.gov/mission/nisar/",
};
const FIVE_THINGS = {
  label: "NASA · 5 things to know about NISAR",
  href: "https://www.nasa.gov/missions/nisar/5-things-to-know-about-powerful-new-u-s-india-satellite-nisar/",
};
// Read 2026-11-15: 12 m reflector of gold-plated wire mesh on a 9 m boom, stowed like an umbrella,
// used by both radars.
export const ANTENNA = localized({
  label: "NASA Science · the antenna reflector blooms",
  href: "https://science.nasa.gov/blogs/nisar/2025/08/15/giant-radar-antenna-reflector-on-nasa-isro-satellite-in-full-bloom/",
});
export const LAUNCH = localized({
  label: "NASA Science · NISAR lifts off",
  href: "https://science.nasa.gov/earth/earth-observatory/advanced-us-india-radar-mission-lifts-off-154617/",
});
// Read 2026-11-14: the 24 cm L-band, and calm water appearing black as the pulse reflects away.
export const GET_TO_KNOW_SAR = localized({
  label: "NASA Science · NISAR, get to know SAR",
  href: "https://science.nasa.gov/mission/nisar/get-to-know-sar/",
});
// Read 2026-11-15: 12 m gold-plated wire-mesh reflector on a 9 m boom, 242 km (more than 240 km)
// swaths, side-looking 24 cm L-SAR by JPL, 9.4 cm S-SAR by ISRO, ISRO bus, 3.5 Gbps Ka-band
// telecom, solar arrays folded for launch, the stowed configuration.
export const ABOUT_SATELLITE = localized({
  label: "NASA Science · About the NISAR satellite",
  href: "https://science.nasa.gov/mission/nisar/about-the-satellite/",
});
// Read 2026-11-15: launched on ISRO's GSLV Mark II, 12-day exact repeat cycle, 24 / 9.4 cm.
export const MISSION_OVERVIEW = localized({
  label: "NASA Science · NISAR mission overview",
  href: "https://science.nasa.gov/mission/nisar/mission-overview/",
});
// Read 2026-11-14: observations repeat every 12 days.
const INTERFEROMETRY = {
  label: "NASA Science · NISAR interferometry",
  href: "https://science.nasa.gov/mission/nisar/interferometry/",
};
// Read 2026-11-14: coherence runs from 0.0 (total decorrelation) to 1.0 (perfectly coherent).
const ASF_INSAR = {
  label: "ASF HyP3 · InSAR product guide",
  href: "https://hyp3-docs.asf.alaska.edu/guides/insar_product_guide/",
};

// Every fact names where it comes from. Nothing here is a number from our own analysis; the
// images are illustrations (two landing photos, three of our measured case crops).
const FACTS: Fact[] = [
  {
    id: "clouds",
    title: "Radar sees through clouds",
    text: "NISAR sends its own microwave pulses and listens for the echo, so it measures day or night, through cloud and smoke.",
    image: {
      src: "/landing/radar-north-dakota.jpg",
      pixel: false,
      credit: "NISAR image · NASA/JPL-Caltech",
    },
    source: FIVE_THINGS,
  },
  {
    id: "wave",
    title: "A 24 cm wave",
    text: "NISAR's L-band radar uses a wavelength of about 24 cm. It passes leaves and reaches branches, trunks and the ground below.",
    image: {
      src: "/landing/nisar-concept.jpg",
      pixel: false,
      credit: "Artist's concept · NASA/JPL-Caltech",
    },
    source: GET_TO_KNOW_SAR,
  },
  {
    id: "water",
    title: "Calm water looks dark",
    text: "Smooth water reflects the pulse away from the satellite like a mirror, so new water shows up as a drop in the echo.",
    image: { src: "/cases/qadirabad-change.png", pixel: true },
    source: GET_TO_KNOW_SAR,
  },
  {
    id: "twelve",
    title: "Every 12 days",
    text: "NISAR repeats the same orbit every 12 days, so a place builds its own history of echoes to compare against.",
    image: { src: "/cases/chokwe-base.png", pixel: true },
    source: INTERFEROMETRY,
  },
  {
    id: "coherence",
    title: "Coherence, 0 to 1",
    text: "Coherence says how alike two echoes from the same spot are. Near 1 the ground looked the same; near 0 something changed.",
    image: { src: "/insar/kumamoto-coherence.png", pixel: true },
    source: ASF_INSAR,
  },
  {
    id: "launch",
    text: "NISAR, a joint NASA and ISRO satellite, launched on 30 July 2025 from the Satish Dhawan Space Centre in Sriharikota, India.",
    source: LAUNCH,
  },
  {
    id: "antenna",
    text: "The radar antenna reflector is about 12 metres (39 feet) wide, the largest radar reflector NASA has sent into space; it unfurled from 0.6 metres in 37 minutes.",
    source: ANTENNA,
  },
  {
    id: "open",
    text: "NISAR data is archived by the Alaska Satellite Facility DAAC and is openly available to the public.",
    source: NASA_MISSION,
  },
  {
    id: "purpose",
    text: "The mission's goal is to measure and understand changes in Earth's land, ice, water and vegetation.",
    source: NASA_MISSION,
  },
  // #25, from the v9 pool (COPY-flow-v9 §7); each checked against its page on 2026-11-15.
  {
    id: "swath",
    title: "Wide swath",
    text: "Each NISAR pass images a strip of ground more than 240 km (150 miles) wide.",
    source: ABOUT_SATELLITE,
  },
  {
    id: "two-radars",
    title: "Two radars",
    text: "NISAR carries two radars: NASA's L-band with a 24 cm wave and ISRO's S-band with a 9.4 cm wave.",
    source: ABOUT_SATELLITE,
  },
  {
    id: "sideways",
    title: "Looking sideways",
    text: "NISAR's radar doesn't look straight down: it looks to one side of its path, to the left.",
    source: MISSION_OVERVIEW,
  },
  {
    id: "gslv",
    title: "Launched from India",
    text: "NISAR launched on ISRO's GSLV Mark II rocket from the Satish Dhawan Space Centre.",
    source: MISSION_OVERVIEW,
  },
];

// The seam for dynamic facts later: callers only ask for a list.
export const getFacts = (): Fact[] => FACTS;
