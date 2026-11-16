import "@/features/music/music.css";

import { MUSIC_COPY } from "@/content/copyMusic";
import { creditLine, TRACK_LIST } from "@/features/music/tracks";

// CC BY asks for the author, the license, a link and a note on what was changed.
export const MusicCredits = () => (
  <section
    className="mu-credits"
    aria-labelledby="music-credits-heading"
    data-testid="music-credits"
  >
    <h2 id="music-credits-heading" className="mu-credits__title">
      {MUSIC_COPY.creditsHeading}
    </h2>
    <p className="mu-credits__note">{MUSIC_COPY.creditsIntro}</p>
    <ul className="mu-credits__list">
      {TRACK_LIST.map((track) => (
        <li key={track.id} data-testid={`music-credit-${track.id}`}>
          <a href={track.sourceUrl}>{creditLine(track)}</a> {MUSIC_COPY.creditsChange}{" "}
          <a href={track.licenseUrl}>{MUSIC_COPY.licenseLink}</a>
        </li>
      ))}
    </ul>
  </section>
);
