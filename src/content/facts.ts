// #25: the pool the waiting panel draws ten facts from. Every fact has a title, a short text that its
// source states, the source with its link, and an image with alt text. `pixel` keeps a small measured
// layer crisp when it is scaled up. `credit` names whoever made an image that isn't ours (#29); our
// own case, InSAR and atlas images need none. Images are illustrations, never evidence of the text.
export type Fact = {
  id: string;
  title: string;
  text: string;
  source: { label: string; href: string };
  image: { src: string; alt: string; pixel: boolean; credit?: string };
};

// Read 2026-11-16: archived at ASF and open; provisional L-band data released 20 July 2026; tracks
// disasters, ecosystems and crops, glaciers and ice sheets.
const NASA_MISSION = {
  label: "NASA Science · NISAR",
  href: "https://science.nasa.gov/mission/nisar/",
};
// Read 2026-11-16: clouds and light rain, day and night (not smoke); first joint NASA-ISRO mission;
// both radars on one spacecraft "a first"; moisture, roughness and motion; glaciers and ice sheets.
const FIVE_THINGS = {
  label: "NASA · 5 things to know about NISAR",
  href: "https://www.nasa.gov/missions/nisar/5-things-to-know-about-powerful-new-u-s-india-satellite-nisar/",
};
// Read 2026-11-15: 12 m reflector of gold-plated wire mesh on a 9 m boom, stowed like an umbrella,
// used by both radars.
export const ANTENNA = {
  label: "NASA Science · the antenna reflector blooms",
  href: "https://science.nasa.gov/blogs/nisar/2025/08/15/giant-radar-antenna-reflector-on-nasa-isro-satellite-in-full-bloom/",
};
export const LAUNCH = {
  label: "NASA Science · NISAR lifts off",
  href: "https://science.nasa.gov/earth/earth-observatory/advanced-us-india-radar-mission-lifts-off-154617/",
};
// Read 2026-11-14: the 24 cm L-band, and calm water appearing black as the pulse reflects away.
// Read 2026-11-16: rough surfaces brighter; features near the wavelength's size scatter strongly;
// buildings aligned with the flight direction very bright; SAR needs the radar moving in a line.
export const GET_TO_KNOW_SAR = {
  label: "NASA Science · NISAR, get to know SAR",
  href: "https://science.nasa.gov/mission/nisar/get-to-know-sar/",
};
// Read 2026-11-15: 12 m gold-plated wire-mesh reflector on a 9 m boom, 242 km (more than 240 km)
// swaths, side-looking 24 cm L-SAR by JPL, 9.4 cm S-SAR by ISRO, ISRO bus, 3.5 Gbps Ka-band
// telecom, solar arrays folded for launch, the stowed configuration.
export const ABOUT_SATELLITE = {
  label: "NASA Science · About the NISAR satellite",
  href: "https://science.nasa.gov/mission/nisar/about-the-satellite/",
};
// Read 2026-11-15: launched on ISRO's GSLV Mark II, 12-day exact repeat cycle, 24 / 9.4 cm.
// Read 2026-11-16: about 6 days' average revisit with both orbit directions, 6 AM / 6 PM nodal
// crossings, orbit control under 500 m, 3-year baseline, 3–10 m resolution, ASF and Bhoonidhi,
// science operations from early January 2026.
export const MISSION_OVERVIEW = {
  label: "NASA Science · NISAR mission overview",
  href: "https://science.nasa.gov/mission/nisar/mission-overview/",
};
// Read 2026-11-14: observations repeat every 12 days. Read 2026-11-16: the fringe bands repeat every
// half wavelength, 12 cm for L-band.
const INTERFEROMETRY = {
  label: "NASA Science · NISAR interferometry",
  href: "https://science.nasa.gov/mission/nisar/interferometry/",
};
// Read 2026-11-14: coherence runs from 0.0 (total decorrelation) to 1.0 (perfectly coherent).
// Read 2026-11-16: atmospheric delay adds phase that looks like motion; shorter waves decorrelate
// faster from small changes such as vegetation growth.
const ASF_INSAR = {
  label: "ASF HyP3 · InSAR product guide",
  href: "https://hyp3-docs.asf.alaska.edu/guides/insar_product_guide/",
};

// Read 2026-11-16: speckle; rough-surface, volume (HV) and double-bounce (HH) scattering; layover and
// shadow; a longer antenna gives finer resolution; pulses respond to structure and soil moisture.
const EARTHDATA_SAR = {
  label: "NASA Earthdata · Synthetic aperture radar",
  href: "https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/sar",
};
// Read 2026-11-16: GCOV on the UTM zone grid at 10 or 20 m pixel spacing.
const ASF_GCOV = {
  label: "ASF · NISAR GCOV product guide",
  href: "https://nisar-docs.asf.alaska.edu/gcov/",
};

// The images, with their alt text and the credit of any that isn't ours (as the landing footer credits
// them). public/facts holds 640 px WebP copies of the landing photos, about a tenth of their weight.
const JPL = "NASA/JPL-Caltech";
const NORTH_DAKOTA = {
  src: "/facts/radar-north-dakota.webp",
  alt: "NISAR's first radar image, farmland in North Dakota",
  pixel: false,
  credit: `NISAR image · ${JPL}`,
};
const CONCEPT = {
  src: "/facts/nisar-concept.webp",
  alt: "Artist's concept of the NISAR satellite with its large round reflector",
  pixel: false,
  credit: `Artist's concept · ${JPL}`,
};
const REFLECTOR = {
  src: "/facts/reflector-deployment.webp",
  alt: "Mission control room during NISAR's reflector deployment",
  pixel: false,
  credit: `Mission operations · ${JPL}`,
};
const EARTH = {
  src: "/facts/earth-day.webp",
  alt: "Earth seen from space",
  pixel: false,
  credit: "Blue Marble · NASA Visible Earth",
};
const CLOUDS = {
  src: "/facts/earth-clouds.webp",
  alt: "Clouds over the whole Earth",
  pixel: false,
  credit: "Cloud imagery · NASA Visible Earth",
};
const ours = (src: string, alt: string) => ({ src, alt, pixel: true });
const QADIRABAD_GRAY = ours(
  "/cases/qadirabad-base-gray.png",
  "Gray radar image of the Chenab River at Qadirabad, Pakistan",
);
const KUMAMOTO_PHASE = ours(
  "/insar/kumamoto-wrapped-phase.png",
  "Wrapped interferometric phase over Kumamoto, Japan, in repeating colour bands",
);
const KUMAMOTO_COHERENCE = ours(
  "/insar/kumamoto-coherence.png",
  "Coherence over Kumamoto, Japan: bright where two passes agree, dark where they don't",
);
const atlas = (id: string, place: string) =>
  ours(`/atlas/${id}.webp`, `Surface atlas panel of ${place}, from our model's radar history`);

// Every fact names where it comes from and says only what that page says. Nothing here is a number
// from our own analysis.
const FACTS: Fact[] = [
  {
    id: "clouds",
    title: "Radar sees through clouds",
    text: "NISAR sends its own microwave pulses and listens for the echo, so it sees through clouds and light rain, day and night.",
    image: NORTH_DAKOTA,
    source: FIVE_THINGS,
  },
  {
    id: "wave",
    title: "A 24 cm wave",
    text: "NISAR's L-band radar uses a wavelength of about 24 cm. It passes leaves and reaches branches, trunks and the ground below.",
    image: CONCEPT,
    source: GET_TO_KNOW_SAR,
  },
  {
    id: "water",
    title: "Calm water looks dark",
    text: "Smooth water reflects the pulse away from the satellite like a mirror, so new water shows up as a drop in the echo.",
    image: ours(
      "/cases/qadirabad-change.png",
      "Radar change at Qadirabad: blue where the echo dropped, red where it rose",
    ),
    source: GET_TO_KNOW_SAR,
  },
  {
    id: "twelve",
    title: "Every 12 days",
    text: "NISAR repeats the same orbit every 12 days, so a place builds its own history of echoes to compare against.",
    image: ours(
      "/cases/chokwe-base.png",
      "Baseline radar image of the Limpopo River at Chókwè, Mozambique",
    ),
    source: INTERFEROMETRY,
  },
  {
    id: "coherence",
    title: "Coherence, 0 to 1",
    text: "Coherence says how alike two echoes from the same spot are. Near 1 the ground looked the same; near 0 something changed.",
    image: KUMAMOTO_COHERENCE,
    source: ASF_INSAR,
  },
  {
    id: "launch",
    title: "Launched in July 2025",
    text: "NISAR, a joint NASA and ISRO satellite, launched on 30 July 2025 from the Satish Dhawan Space Centre in Sriharikota, India.",
    image: EARTH,
    source: LAUNCH,
  },
  {
    id: "antenna",
    title: "A 12 m reflector",
    text: "The radar antenna reflector is about 12 metres (39 feet) wide, the largest radar reflector NASA has sent into space; it unfurled from 0.6 metres in 37 minutes.",
    image: REFLECTOR,
    source: ANTENNA,
  },
  {
    id: "open",
    title: "Open to everyone",
    text: "NISAR data is archived by the Alaska Satellite Facility DAAC and is openly available to the public.",
    image: atlas("chenab", "the Chenab River, Pakistan"),
    source: NASA_MISSION,
  },
  {
    id: "purpose",
    title: "Land, ice, water and plants",
    text: "The mission's goal is to measure and understand changes in Earth's land, ice, water and vegetation.",
    image: CLOUDS,
    source: NASA_MISSION,
  },
  {
    id: "swath",
    title: "Wide swath",
    text: "Each NISAR pass images a strip of ground more than 240 km (150 miles) wide.",
    image: NORTH_DAKOTA,
    source: ABOUT_SATELLITE,
  },
  {
    id: "two-radars",
    title: "Two radars",
    text: "NISAR carries two radars: NASA's L-band with a 24 cm wave and ISRO's S-band with a 9.4 cm wave.",
    image: CONCEPT,
    source: ABOUT_SATELLITE,
  },
  {
    id: "sideways",
    title: "Looking sideways",
    text: "NISAR's radar doesn't look straight down: it looks to one side of its path, to the left.",
    image: CONCEPT,
    source: MISSION_OVERVIEW,
  },
  {
    id: "gslv",
    title: "Launched from India",
    text: "NISAR launched on ISRO's GSLV Mark II rocket from the Satish Dhawan Space Centre.",
    image: EARTH,
    source: MISSION_OVERVIEW,
  },
  {
    id: "first-joint",
    title: "A first for two agencies",
    text: "NISAR is the first joint satellite mission between NASA and the Indian Space Research Organisation (ISRO).",
    image: REFLECTOR,
    source: FIVE_THINGS,
  },
  {
    id: "first-two",
    title: "Two radars on one spacecraft",
    text: "Carrying both an L-band and an S-band radar on one spacecraft is a first, which makes NISAR more capable than earlier radar missions.",
    image: CONCEPT,
    source: FIVE_THINGS,
  },
  {
    id: "attributes",
    title: "Moisture, roughness, motion",
    text: "Each of NISAR's radars is sensitive to features of different sizes and detects attributes such as moisture content, surface roughness and motion.",
    image: QADIRABAD_GRAY,
    source: FIVE_THINGS,
  },
  {
    id: "ice",
    title: "Ice on the move",
    text: "NISAR's data help determine how quickly glaciers and ice sheets are changing, with unprecedented coverage of Antarctica.",
    image: CLOUDS,
    source: FIVE_THINGS,
  },
  {
    id: "six-days",
    title: "About every 6 days",
    text: "Using both its northbound and southbound passes, NISAR samples Earth's land and ice on average every 6 days.",
    image: atlas("okavango", "the Okavango Delta, Botswana"),
    source: MISSION_OVERVIEW,
  },
  {
    id: "dawn-dusk",
    title: "Dawn and dusk",
    text: "NISAR crosses the equator at about 6 AM going north and 6 PM going south.",
    image: EARTH,
    source: MISSION_OVERVIEW,
  },
  {
    id: "three-years",
    title: "A three-year mission",
    text: "NISAR's baseline mission is planned to last three years.",
    image: atlas("forest-river", "Forest River, USA"),
    source: MISSION_OVERVIEW,
  },
  {
    id: "resolution",
    title: "3 to 10 metres",
    text: "NISAR's radar sees details from 3 to 10 metres across, depending on how each pass is acquired.",
    image: NORTH_DAKOTA,
    source: MISSION_OVERVIEW,
  },
  {
    id: "orbit-control",
    title: "A tightly kept orbit",
    text: "NISAR's orbit is controlled to within 500 metres of its planned path.",
    image: EARTH,
    source: MISSION_OVERVIEW,
  },
  {
    id: "two-archives",
    title: "Two archives",
    text: "L-band data are served by the Alaska Satellite Facility; S-band data, and L-band over India and a few other sites, by ISRO's Bhoonidhi.",
    image: atlas("murray", "the Murray Basin, Australia"),
    source: MISSION_OVERVIEW,
  },
  {
    id: "science-phase",
    title: "Science since January 2026",
    text: "NISAR entered its science operations phase in early January 2026, starting routine long-term data collection.",
    image: NORTH_DAKOTA,
    source: MISSION_OVERVIEW,
  },
  {
    id: "provisional",
    title: "First data release",
    text: "NISAR's provisional L-band data products came out on 20 July 2026, fully calibrated and validated at a limited number of sites.",
    image: atlas("amazon", "an Amazon floodplain, Brazil"),
    source: NASA_MISSION,
  },
  {
    id: "crops",
    title: "Crops and ecosystems",
    text: "NISAR is helping to track disasters, monitor ecosystems and crops, and study glaciers and ice sheets.",
    image: atlas("forest-river", "Forest River, USA"),
    source: NASA_MISSION,
  },
  {
    id: "rough",
    title: "Rough looks bright",
    text: "Rough surfaces look brighter in radar: they scatter the pulse in all directions, so more of it comes back to the antenna.",
    image: QADIRABAD_GRAY,
    source: GET_TO_KNOW_SAR,
  },
  {
    id: "size",
    title: "Size matters",
    text: "Surface features close to the radar's wavelength in size scatter strongly; a longer wave bounces off boulders and trunks rather than clods and leaves.",
    image: ours(
      "/cases/niscemi/2026-10-22-HH.png",
      "HH radar image of the hills around Niscemi, Sicily",
    ),
    source: GET_TO_KNOW_SAR,
  },
  {
    id: "buildings",
    title: "Buildings shine",
    text: "Buildings lined up at right angles to the satellite's flight direction send back very bright echoes.",
    image: ours("/cases/richmond-base.png", "Baseline radar image around Richmond, Indiana"),
    source: GET_TO_KNOW_SAR,
  },
  {
    id: "synthetic",
    title: "A moving antenna",
    text: "Synthetic aperture radar gets fine-resolution images from a radar of limited resolution by moving it in a straight line, on a plane or in orbit.",
    image: CONCEPT,
    source: GET_TO_KNOW_SAR,
  },
  {
    id: "fringes",
    title: "Fringes every 12 cm",
    text: "In an interferogram the colour bands repeat every half wavelength: 12 cm for NISAR's L-band.",
    image: KUMAMOTO_PHASE,
    source: INTERFEROMETRY,
  },
  {
    id: "speckle",
    title: "Speckle",
    text: "The grainy look of radar images is speckle: each pixel holds more scatterers than the radar can tell apart.",
    image: QADIRABAD_GRAY,
    source: EARTHDATA_SAR,
  },
  {
    id: "canopy-hv",
    title: "Leaves in HV",
    text: "The echo from leaves and branches in a forest canopy shows best in cross-polarized data, HV or VH.",
    image: ours(
      "/cases/niscemi/2026-10-22-HV.png",
      "HV radar image of the hills around Niscemi, Sicily",
    ),
    source: EARTHDATA_SAR,
  },
  {
    id: "double-hh",
    title: "Double bounce in HH",
    text: "Buildings, tree trunks and flooded vegetation bounce the pulse twice, an echo HH picks up best.",
    image: ours(
      "/cases/niscemi/polarization-rgb.png",
      "HH, HV and their balance shown in colour around Niscemi, Sicily",
    ),
    source: EARTHDATA_SAR,
  },
  {
    id: "layover",
    title: "Layover and shadow",
    text: "On steep terrain radar images can show layover and shadow, depending on the viewing geometry.",
    image: atlas("niscemi", "the hills of Niscemi, Italy"),
    source: EARTHDATA_SAR,
  },
  {
    id: "antenna-length",
    title: "Longer antenna, sharper image",
    text: "For a given wavelength, the longer the radar's antenna, the finer the detail it can resolve.",
    image: REFLECTOR,
    source: EARTHDATA_SAR,
  },
  {
    id: "soil-moisture",
    title: "Structure and moisture",
    text: "A radar image comes from how the pulse meets physical structures, like mountains and forests, and conditions like soil moisture.",
    image: ours("/cases/chokwe-change.png", "Radar change around Chókwè, Mozambique"),
    source: EARTHDATA_SAR,
  },
  {
    id: "atmosphere",
    title: "Weather in the phase",
    text: "The atmosphere can delay the radar signal, adding phase differences that look like ground motion but aren't.",
    image: KUMAMOTO_PHASE,
    source: ASF_INSAR,
  },
  {
    id: "short-waves",
    title: "Short waves forget fast",
    text: "Shorter wavelengths lose coherence faster from small changes such as vegetation growth; longer ones like L-band suit slower processes.",
    image: KUMAMOTO_COHERENCE,
    source: ASF_INSAR,
  },
  {
    id: "gcov",
    title: "On a map grid",
    text: "NISAR's GCOV backscatter products are projected to their UTM zone with 10 or 20 metre pixels, ready for maps.",
    image: ours(
      "/cases/niscemi/baseline-HH.png",
      "Baseline HH radar image of Niscemi on its map grid",
    ),
    source: ASF_GCOV,
  },
];

// The seam for dynamic facts later: callers only ask for a list.
export const getFacts = (): Fact[] => FACTS;
