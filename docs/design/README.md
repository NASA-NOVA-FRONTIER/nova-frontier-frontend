# Design handoffs

The specs every frontend issue labelled `v8` or `v9` builds from. Read them before writing UI.

| Folder | What |
|---|---|
| `v9/` | **Explorer flow v9**, on top of v8: place a 10.24 km square, pick what to look for, confirm the passes, watch the processing panel, read the result with its sequence timeline. Start with `v9/README.md`, then `SPECS-flow-v9.md` (screens and acceptance criteria) and `COPY-flow-v9.md` (strings). `reference/` holds the clickable prototype (`Explorer Flow v9`), its frames, `Radar Waves` and the executive tour. Read it together with "Where the product differs from the v9 handoff" below: those corrections win. Everything v9 doesn't draw stays as v8. |
| `v8/` | **Explorer v8, states v2** (the didactic version the team chose). Start with `v8/README.md`, then `SPECS-v8.md` (what changes, screen by screen, and the data each element needs), `COPY-v8.md` (every visible string, use verbatim) and `DATA_PROVENANCE-v8.md` (which chip each value carries until its data ships). `reference/` holds the design files and their shared content (`v8-data.js` has the facts carousel and the error copy). |
| `v7/` | The v7 specs v8 builds on: tokens, type, glass cards, band chart, contrast bars, pass timeline, provenance chips. Where v8 says "as in v7", this is the file. `DESIGN.md` at the repo root describes v7 as built. |

The handoff files are kept verbatim (Prettier skips `docs/design`). The `.dc.html` files are design
references, not code: they need the design tool's `support.js`, which isn't included, so read their
markup and the specs rather than opening them. Rebuild everything as React components in `src/`,
reusing the v7 tokens and components.

## Where the product differs from the handoff

The handoff was drawn against the science API (`/v2`) before the live pipeline existed. These team
decisions win over the handoff:

1. **One API path.** The frontend talks only to the backend (`/api/v1`, Railway). Every `/v2` field the
   specs name is relayed by the backend; ask in the backend repo when one is missing.
2. ~~**Ground motion stays a visible entry** next to the four lenses ("Did the ground keep its echo?", renamed on 14 Nov by the copy pass), marked as a
   measurement, not a verdict. It opens the pair picker; the dock's Coherence row opens it too. Coherence 0–1,
   cividis; never centimetres.~~ **Superseded by v9:** ground motion is the Earthquake chip in the lens
   picker (lens id `insar`), opened from the placed square.
3. ~~**Area tools stay.** Point, rectangle and polygon remain, restyled to v8 (dashed gold footprint, dark
   border on light ground).~~ **Superseded by v9:** one click places the backend's 10.24 km square
   (`AOI_SIDE_KM`, shown as "10 × 10 km"), which can be moved (#15).
4. **L-band only** (updated 14 Nov 2026, replaces "L | S stays disabled" of 12 Nov). The switch shows one label,
   "L-band, 24 cm.", with no S option: the content-pages design (`v8/PLAN-content-pages-v8.md` §0) drops roadmap copy
   such as "coming soon", and S-band is out of scope, so a disabled S button only promised something the backend
   doesn't return. Ascending / Descending sits next to it.
5. **Lens before the job, for now.** "Analyze this spot" runs the selected lens and the raw passes come
   with the answer; switching lens is a new short wait (as step 5 already shows).
6. **Wildfire's second witness is NASA FIRMS**, in the place of the OPERA section.
7. **Possible drivers** ship for flood only, always with HYPOTHESIS · NOT A RESULT; other lenses wait for
   their thresholds.
8. **Limits come from the backend.** Never hardcode a daily number (the handoff was drawn for 12/day). The
   waiting bar shades the backend's own estimate (`etaSeconds`), not a fixed 1–4 min band.
9. **Keep what's already live.** Shared links (`?bbox=`, `?geo=`, `&pair=`, `&lens=`), the live report
   (`/report?exploration=`), downloads, "Keep exploring" and background polling aren't drawn in the handoff;
   the restyle keeps them. Until per-date point values reach the frontend, the pixel block keeps
   `NormalRangeCard` instead of a demo band chart, and the facts carousel keeps each fact's source.

## Where the product differs from the v9 handoff

The v9 handoff was checked against the backend (BE = `nova-frontier-backend/src/nisar_hazard_watch`), this
repo and the model repo (MD = `nova-frontier-model`) on 15 Nov 2026. Port the corrected version, never the
handoff's. The v8 decisions above still apply unless marked superseded.

Corrections to the handoff:

- **Lens ids** are `flood_wetland`, `wildfire`, `vegetation_disturbance`, `insar` (BE `constants/explorations.py:4-9`).
  No landslide lens; agriculture stays out of the live selector.
- **Kumamoto is a chain of intervals**: 07-09→07-21→08-14→08-26 (MD `docs/results/kumamoto_stack_wide.json`).
  Never "ALL STRADDLE THE EVENT" (`v9/COPY-flow-v9.md:131`), no invented pairs (07-09→08-02, 07-21→08-26), no
  invented event date (07-28). Draw an event line only for a case with a sourced event date.
- **"79 of 4,096" is High Plains**, the stable control, not deforestation. **Rowe Creek** is the Rowe Creek Complex
  Fire area: label it VEGETATION DISTURBANCE, never "deforestation" (`v9/COPY-flow-v9.md:26`).
- **Agriculture cases are not deforestation**: the prototype maps them that way; don't.
- **Case extents are not 10 × 10 km**: they range 0.64–15 km (MD `events.index.json` grid). Live InSAR measures a
  5 km window at the centre (BE `constants/insar.py:14`): draw an inner 5 × 5 km box + "Measured: 5 × 5 km at the
  centre".
- **No stand-in images**: never port the prototype's "STAND-IN IMAGE FROM ANOTHER CASE" frames
  (`v9/reference/Explorer Flow v9.dc.html:562`).
- **ETA wording**: the backend sends one p80 (`etaSeconds`) and nothing before Start. Before Start: "Computed live
  · we stop at 8 min", no number. After: "Usually under {p80}"; the band ends at p80 (replaces "Usually
  {from}–{to} min", `v9/COPY-flow-v9.md:57,105`).
- **8-min stop is a partial with no result**: drop "and show what is ready" (`v9/COPY-flow-v9.md:107`); show the
  partial state with retry + "Open a measured case".
- **Change layer = target − baseline median**: label it "Change vs baseline median", not "Change vs first"
  (`v9/COPY-flow-v9.md:123`, `v9/SPECS-flow-v9.md:46`).
- **Flood title has no event date**: `SPECS-flow-v9.md` §3/§7 win over COPY's "after {event date}"
  (`v9/COPY-flow-v9.md:138`).
- **Earthquake preset is "The 5 most recent passes"** (pairs, `v9/SPECS-flow-v9.md:39`), not "The pairs around the
  event" (`v9/COPY-flow-v9.md:52`).
- **No params the backend doesn't accept**: don't ship the prototype's `PTIP.event`, `EVENT_OPTS` ("28 Jul 2026 ·
  USGS", `v9/reference/Explorer Flow v9.dc.html:473`), `PTIP.ref`, `PTIP.fire`, `PTIP.ctx`.
- **The 12 cm line goes in the ⓘ**: "Each fringe is about 12 cm…" (`v9/COPY-flow-v9.md:143`) moves to the phase
  layer's ⓘ, with "not a displacement".
- **Live InSAR stat** is coherent / phase / window cells (BE `models/insar_summary.py`), not "correction-input
  checks" (`v9/COPY-flow-v9.md:142`).

Team decisions (Cristian, 15 Nov 2026):

- **No event-date presets**: every GCOV lens uses "Last 5 months" (≈ BE `WINDOW_DAYS` 152) until an event catalogue
  exists (replaces the Flood / Wildfire presets in `v9/COPY-flow-v9.md:52`).
- **OFFLINE** = a prepared case or a cache hit; the origin chip comes from `isDemo` (pending JAPV's OK on #30).
- **FIRMS**: counts card only, no dots until the backend relays detection points.
- **Keep the v8 pieces**: "L-band, 24 cm." and read-only track / direction; shared links, report, downloads, More
  information, story, Nova and onboarding stay even though v9 doesn't draw them.
- **Cases are not our scope**: someone else keeps them in the frontend (no cache work).
- **Backend work** goes to DASarria as specs in his issues; this repo implements the frontend only.

Backend facts to respect today:

- **`POST /explorations` forbids unknown fields** (`extra="forbid"`): sending `startDate` gives 422. Don't send it
  until the backend ships it.
- **`/coverage`** returns `plan.dates` (≤ 5 chosen), `seriesKey` and `precomputedCase`; no full pass list, no ETA yet.
- **`/insar/pairs`** accepts `startDate` / `endDate`; arcs come from it, grouped by `seriesKey` (several tracks).
- **Image limits**: `MAX_IMAGES` 5, `MIN_IMAGES` 4; 5 = normal, 4 = allowed, ≤ 3 blocked, 0 = no coverage.
