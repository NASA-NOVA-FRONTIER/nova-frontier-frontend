# Background music

Two looping tracks and one toggle (issue #36): **Starfire** on the landing and its tabs (`/`,
`/cases`, `/method`, `/learn`, `/about`), **The Spaces Between** on the globe (`/explore`), nothing on the
printable `/report`. Sound is off until the listener turns it on.

## How it fits together

| File                                   | Job                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `tracks.ts`                            | The two tracks, their license data, `trackIdForRoute` and `creditLine`                |
| `loopSchedule.ts`                      | The pure maths of the endless loop (equal-power crossfade between passes)             |
| `musicEngine.ts` + `audioTypes.ts`     | Web Audio playback: voices, loop scheduling, route crossfade, fade and suspend        |
| `musicStore.ts` + `musicPreference.ts` | What the listener chose (kept in `localStorage`), the first-visit hint, display state |
| `musicRuntime.ts`                      | The page's one store and engine, wired to the browser                                 |
| `MusicController.tsx`                  | Mounted once in `App.tsx`: follows the route, the tab and the first gesture           |
| `SoundToggle.tsx`, `MusicCredits.tsx`  | The toggle (site bar and explorer top bar) with its hint, and the About credits       |

## Autoplay and the first-visit hint

Browsers refuse audible audio until the page has had a user gesture, so nothing starts by itself.

- First visit: sound is off, the toggle shows a small "Turn on the music" hint for 15 s, and
  nothing is downloaded or created (no `AudioContext`, no MP3 request).
- Turning it on is the gesture: the toggle creates and resumes the audio context in the click,
  downloads the route's track once and fades it in.
- A remembered "on" waits for the first click, key press or touch anywhere (`MusicController`),
  then starts. The hint never shows while sound is on, and never again after it was used or dismissed.
- A hidden tab fades out and suspends the context; it resumes when the tab is back.
- A failed download shows `data-state="error"`; pressing the toggle retries.

## The endless loop

Both tracks end by fading out to silence, so crossfading over their own ending would dip. They
are trimmed to the part before it (The Spaces Between where its tail matches the loudness of its
head to about 1 dB), and each pass starts before the previous one ends:
the two cross over 6 s on sine/cosine curves, so the summed power stays constant (no dip, no
surge) and the few milliseconds of MP3 encoder padding fall where both ramps are near zero. Passes
are queued 20 s ahead, so a late timer in a busy tab never leaves a gap. `loopSchedule.test.ts`
proves the constant power; `musicEngine.test.ts` proves a pass sounds at every instant.

## License and credits

Both tracks are by Scott Buckley, released under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); the About page credits them in the
author's wording. The files are modified (trimmed to a loop, re-encoded to MP3 at 64 and 96 kbps),
and the credits say so. The MP3s live in `audio/` and are imported with `?url`, so Vite emits them under
`/assets/` (which `vercel.json` does not rewrite) and nothing is fetched before sound is turned on.

The two files have different loudness (Starfire -15.1 LUFS, The Spaces Between -21.3 LUFS, both
measured with ffmpeg's `ebur128` and kept in `tracks.ts`), so each track has its own `gain`: the
landing plays at about -23 LUFS and the globe a notch quieter, at about -26.

To rebuild a file from the original (`ffmpeg`, stereo):

```bash
ffmpeg -ss 0.82 -t 325.18 -i Starfire.mp3 -map_metadata -1 -c:a libmp3lame -b:a 64k -ac 2 starfire.mp3
ffmpeg -ss 1.35 -t 238.65 -i sb_monomyth_6_thespacesbetween.mp3 -map_metadata -1 -c:a libmp3lame -b:a 96k -ac 2 the-spaces-between.mp3
```

Sources: <https://www.scottbuckley.com.au/library/starfire/> and
<https://www.scottbuckley.com.au/library/the-spaces-between/>.

## Tests

- Unit: `musicTracks`, `musicPreference`, `musicStore`, `loopSchedule`, `musicEngine`
  (a fake clock and fake audio nodes stand in for the audio device).
- E2E: `tests/e2e/music.spec.ts` (first visit, hint, persistence, routes, hidden tab, credits,
  390 and 320 px).
