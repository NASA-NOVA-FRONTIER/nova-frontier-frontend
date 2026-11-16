import { tr } from "@/i18n/translate";
import { localized } from "@/i18n/localized";
// Every Learn link comes from the official challenge resource list or the provider's own page for that
// exact resource. Copy is from the design reference `docs/design/v8/reference/Learn v8.dc.html`.
// CHALLENGE = https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/ (read 2026-11-14).

export type LearnLink = { label: string; href: string; ariaLabel: string };

export type LearnResource = {
  by: string;
  name: string;
  what: string;
  href: string;
  tags: string[];
  cta: string;
  // A second link on the card (e.g. the Spanish course), kept out of the whole-card link.
  extra?: LearnLink;
};

export type LearnStep = {
  anchor: string;
  n: string;
  title: string;
  why: string;
  img: string;
  alt: string;
  cap: string;
  // Images another ticket adds (#50, 51B) render only once the file is in the build.
  optionalImg?: boolean;
  items: LearnResource[];
};

export type OtherRadar = {
  band: "L" | "C";
  wave: string;
  name: string;
  by: string;
  what: string;
  href: string;
  extra?: LearnLink;
};

export const LEARN_COPY = localized({
  title: "Learn · NISAR Hazard Watch by Nova Frontier",
  kicker: "LEARN · FROM THE APP TO YOUR OWN ANALYSIS",
  heading: "Learn to read radar.",
  lede: "Four steps from the free courses and tools NASA and its partners publish. By the end you can download a NISAR scene and measure change yourself.",
  compareEyes: "WHAT YOUR EYES SEE",
  compareRadar: "WHAT THE RADAR SEES",
  // The reference credits only NASA/JPL-Caltech; the optical half is Sentinel-2, credited as on the landing.
  compareCaption:
    "The same farmland in North Dakota, optical and NISAR radar. Drag to compare. Radar: NASA/JPL-Caltech. Optical: contains modified Copernicus Sentinel-2 data (2025).",
  othersKicker: "OTHER RADARS IN ORBIT",
  othersHeading: "NISAR isn't alone up there.",
  othersBody:
    "Partner agencies of the challenge fly their own radars. Comparing bands is how you learn what each wavelength sees.",
  // Verbatim from the challenge page (identical to the reference).
  disclaimer:
    "NASA does not endorse any non-U.S. Government entity and is not responsible for information contained on non-U.S. Government websites. For non-U.S. Government websites, participants must comply with any data use parameters of that specific website.",
  ctaHeading: "Now try it on a place you know.",
  cta: "Open the explorer",
  footerHeadline: "Everything here is free to learn and open to use.",
} as const);

export const resourceCount = (step: LearnStep): string =>
  tr("{{length}} RESOURCES", { length: step.items.length });

export const LEARN_STEPS: LearnStep[] = localized([
  {
    anchor: "understand",
    n: "01",
    title: "Understand",
    why: "What a radar measures, and why it sees through cloud. Start here if 'backscatter' is a new word.",
    img: "/cases/qadirabad-base-gray.png",
    alt: "A radar image of the Chenab River, Pakistan",
    cap: "RADAR ECHO · CHENAB RIVER, PAKISTAN",
    optionalImg: true,
    items: [
      {
        by: "NASA EARTHDATA",
        name: "Intro to Remote Sensing",
        what: "Instruments, resolution and processing: the basics behind every Earth-observation image.",
        // source: CHALLENGE, "Intro to Remote Sensing"
        href: "https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/remote-sensing",
        tags: ["EN"],
        cta: "Read",
      },
      {
        by: "NASA EARTHDATA",
        name: "Intro to Synthetic Aperture Radar",
        what: "Frequency and wavelength, polarization and scattering: the four ideas behind HH and HV.",
        // source: CHALLENGE, "Intro to Synthetic Aperture Radar (SAR)"
        href: "https://www.earthdata.nasa.gov/learn/earth-observation-data-basics/sar",
        tags: ["EN"],
        cta: "Read",
      },
      {
        by: "NISAR · NASA/JPL",
        name: "NISAR StoryMaps",
        what: "Interactive stories on floods, wildfires, land subsidence, oil slicks and glacier motion.",
        // source: CHALLENGE, "NISAR StoryMaps"
        href: "https://nisar.jpl.nasa.gov/applications/arcgis-storymaps/",
        tags: ["EN"],
        cta: "Explore",
      },
    ],
  },
  {
    anchor: "practise",
    n: "02",
    title: "Practise",
    why: "Guided training, from first steps to full workflows. Several courses come in Spanish.",
    img: "/cases/chokwe-change.png",
    alt: "A radar change map of Chókwè, Mozambique",
    cap: "CHANGE MAP · CHÓKWÈ, MOZAMBIQUE",
    items: [
      {
        by: "NASA ARSET",
        name: "ARSET trainings",
        what: "Online courses on disasters, agriculture, water and ecology, with introductions to SAR and NISAR.",
        // source: CHALLENGE, "NASA ARSET Trainings"
        href: "https://appliedsciences.nasa.gov/get-involved/training",
        tags: ["EN"],
        cta: "Take a course",
        extra: {
          label: "ES",
          // source: NASA Earthdata, the ARSET 2026 NISAR training part 2 in Spanish (provider's own file)
          href: "https://www.earthdata.nasa.gov/s3fs-public/2026-07/arset-2026-nisar-part2-spanish.pdf",
          ariaLabel: "ARSET NISAR training, part 2, in Spanish (PDF, opens in a new tab)",
        },
      },
      {
        by: "CSA · CANADA",
        name: "SAR tutorial in Python and QGIS",
        what: "Practical steps to open, process and visualize SAR imagery on your own computer.",
        // source: CHALLENGE, "Synthetic Aperture Radar python Tutorial"
        href: "https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial",
        tags: ["EN", "FR"],
        cta: "Follow along",
      },
    ],
  },
  {
    anchor: "data",
    n: "03",
    title: "Get the data",
    why: "The same archives our backend reads. NISAR data are free and open; downloads need a free Earthdata login.",
    img: "/insar/kumamoto-wrapped-phase.png",
    alt: "An interferogram over Kumamoto, Japan",
    cap: "INTERFEROGRAM · KUMAMOTO, JAPAN",
    optionalImg: true,
    items: [
      {
        by: "NASA EARTHDATA",
        name: "Earthdata Search",
        what: "Discover, compare and download across all of NASA's Earth science holdings.",
        // source: CHALLENGE, "NASA Earthdata Search"
        href: "https://search.earthdata.nasa.gov/search",
        tags: ["EN"],
        cta: "Search",
      },
      {
        by: "ASF DAAC",
        name: "ASF Data Search Vertex",
        what: "The NASA archive of SAR data: find NISAR GCOV and GUNW scenes by place and date.",
        // source: CHALLENGE, "ASF Data Search Vertex"
        href: "https://search.asf.alaska.edu/",
        tags: ["EN"],
        cta: "Search",
      },
      {
        by: "ASF DAAC",
        name: "NISAR Data User Guide",
        what: "Everything about NISAR products in one place: formats, layers, corrections and access.",
        // source: CHALLENGE, "NISAR Data User Guide"
        href: "https://nisar-docs.asf.alaska.edu/",
        tags: ["EN"],
        cta: "Read the guide",
      },
    ],
  },
  {
    anchor: "apply",
    n: "04",
    title: "Apply",
    why: "What NISAR is for, from the people who will use it.",
    img: "/landing/reflector-deployment.jpg",
    alt: "Mission control room during NISAR's reflector deployment",
    cap: "MISSION OPERATIONS, REFLECTOR DEPLOYMENT · NASA/JPL-CALTECH",
    items: [
      {
        by: "NISAR · NASA/JPL",
        name: "Applications white papers",
        what: "Two-page overviews of how NISAR data serve society, from past NISAR Applications Workshops.",
        // source: CHALLENGE, "NISAR Applications White Papers"
        href: "https://nisar.jpl.nasa.gov/applications/societal-benefit/",
        tags: ["EN"],
        cta: "Read",
      },
      {
        by: "UAVSAR · NASA/JPL",
        name: "UAVSAR postcards",
        what: "False-colour composites from NASA's airborne radar, showing the Earth processes NISAR now sees from orbit.",
        // source: CHALLENGE, "UAVSAR Postcards"
        href: "https://uavsar.jpl.nasa.gov/education/postcards.html",
        tags: ["EN"],
        cta: "Browse",
      },
    ],
  },
]);

export const OTHER_RADARS: OtherRadar[] = localized([
  {
    band: "L",
    // SAOCOM's L band is 1.275 GHz, about 23.5 cm (gate 2: keep the design's label).
    wave: "≈ 23 cm",
    name: "SAOCOM",
    by: "CONAE · ARGENTINA",
    what: "Argentina's L-band radar pair, the same long wave as NISAR. Catalogue access with a free ONE CLICK profile.",
    // source: CHALLENGE, "SAOCOM Catalogue"
    href: "https://catalogos.conae.gov.ar/catalogo/catalogoSatSaocomInfo.html",
    extra: {
      label: "Catalogue registration",
      // source: CHALLENGE, "SAOCOM Catalogue Registration"
      href: "https://www.argentina.gob.ar/noticias/la-informacion-saocom-cada-vez-mas-accesible",
      ariaLabel: "SAOCOM catalogue registration with a ONE CLICK profile (opens in a new tab)",
    },
  },
  {
    band: "C",
    wave: "≈ 5.6 cm",
    name: "RADARSAT Constellation",
    by: "CSA · CANADA",
    what: "Three satellites for maritime surveillance, disaster management and ecosystem monitoring, day or night.",
    // source: CHALLENGE, "Radarsat Constellation Mission (RCM) - Data"
    href: "https://donnees-data.asc-csa.gc.ca/en/dataset/rcm",
  },
  {
    band: "C",
    wave: "≈ 5.6 cm",
    name: "RADARSAT-1 archive",
    by: "CSA · CANADA",
    what: "Radar images from 1995 onward, released under an open licence: decades of history to compare against.",
    // source: CHALLENGE, "RADARSAT 1 - Data"
    href: "https://donnees-data.asc-csa.gc.ca/en/dataset/radarsat1",
  },
]);

// Every outbound link on the page, for tests and checks.
export const allLearnLinks = (): string[] => [
  ...LEARN_STEPS.flatMap((step) =>
    step.items.flatMap((item) => [item.href, ...(item.extra ? [item.extra.href] : [])]),
  ),
  ...OTHER_RADARS.flatMap((radar) => [radar.href, ...(radar.extra ? [radar.extra.href] : [])]),
];
