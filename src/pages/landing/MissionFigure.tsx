import { useCallback, useState } from "react";

import { NisarSatellite } from "@/features/satellite/NisarSatellite";
import { Link } from "@/lib/Link";
import { missionFallback } from "@/features/satellite/mobileFallback";

import { localized } from "@/i18n/localized";
// SPECS-content-pages-v8 §2 "08 Mission"; the link text is the reference's (Landing v8.dc.html).
const MISSION_COPY = localized({
  heading: "Twelve metres of gold mesh.",
  modelCaption:
    "Interactive model built to NASA/JPL published dimensions. The gold strip is the radar's swath on the ground.",
  photoCaption: "Artist's concept, NASA/JPL-Caltech.",
  photoAlt:
    "Artist's concept of NISAR above Earth, its 12 m gold mesh reflector open on a long boom",
  link: "See how it works →",
} as const);

const hasWebGL = (): boolean => {
  try {
    const canvas = document.createElement("canvas");
    return (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) !== null;
  } catch {
    return false;
  }
};

export const MissionFigure = () => {
  // The photo is never called a model: its caption is the NASA/JPL credit.
  const [photo, setPhoto] = useState(() => !hasWebGL());
  // One slow reading on a phone swaps in the photo for the rest of the visit (no flicker back).
  const onFps = useCallback((fps: number) => {
    if (missionFallback(window.innerWidth, fps)) setPhoto(true);
  }, []);

  return (
    <>
      <figure
        className="l-mission__figure"
        data-reveal
        data-testid="mission-figure"
        data-mode={photo ? "photo" : "model"}
      >
        {photo ? (
          <img
            src="/landing/nisar-concept.jpg"
            alt={MISSION_COPY.photoAlt}
            width={1280}
            height={989}
            loading="lazy"
          />
        ) : (
          <NisarSatellite
            className="l-mission__model"
            deploy={1}
            beam={0.7}
            offsetX={0.14}
            autorotate
            hotspots
            noHint
            earth="/landing/earth-day.jpg"
            onFps={onFps}
          />
        )}
        <h2 id="mission-heading" className="l-mission__heading">
          {MISSION_COPY.heading}
        </h2>
        <Link to="/method" className="l-mission__link" testId="mission-method-link">
          {MISSION_COPY.link}
        </Link>
      </figure>
      <p className="s-caption l-mission__caption" data-testid="mission-caption">
        {photo ? MISSION_COPY.photoCaption : MISSION_COPY.modelCaption}
      </p>
    </>
  );
};
