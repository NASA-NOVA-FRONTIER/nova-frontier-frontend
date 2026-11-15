// `title` and `image` come with the v8 facts (docs/design/v8/reference/v8-data.js FACTS); the older
// facts are text only. `pixel` keeps a small measured layer crisp when it is scaled up.
export type Fact = {
  id: string;
  text: string;
  source: { label: string; href: string };
  title?: string;
  image?: { src: string; pixel: boolean };
};

const NASA_MISSION = {
  label: "NASA Science · NISAR",
  href: "https://science.nasa.gov/mission/nisar/",
};
const FIVE_THINGS = {
  label: "NASA · 5 things to know about NISAR",
  href: "https://www.nasa.gov/missions/nisar/5-things-to-know-about-powerful-new-u-s-india-satellite-nisar/",
};
const ANTENNA = {
  label: "NASA Science · the antenna reflector blooms",
  href: "https://science.nasa.gov/blogs/nisar/2025/08/15/giant-radar-antenna-reflector-on-nasa-isro-satellite-in-full-bloom/",
};
const LAUNCH = {
  label: "NASA Science · NISAR lifts off",
  href: "https://science.nasa.gov/earth/earth-observatory/advanced-us-india-radar-mission-lifts-off-154617/",
};
// Read 2026-11-14: the 24 cm L-band, and calm water appearing black as the pulse reflects away.
const GET_TO_KNOW_SAR = {
  label: "NASA Science · NISAR, get to know SAR",
  href: "https://science.nasa.gov/mission/nisar/get-to-know-sar/",
};
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
    image: { src: "/landing/radar-north-dakota.jpg", pixel: false },
    source: FIVE_THINGS,
  },
  {
    id: "wave",
    title: "A 24 cm wave",
    text: "NISAR's L-band radar uses a wavelength of about 24 cm. It passes leaves and reaches branches, trunks and the ground below.",
    image: { src: "/landing/nisar-concept.jpg", pixel: false },
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
];

// The seam for dynamic facts later: callers only ask for a list.
export const getFacts = (): Fact[] => FACTS;
