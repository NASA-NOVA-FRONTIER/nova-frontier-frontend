# SPECS v8: content pages (Landing · Method · Cases · Learn)

Delta on v7. Explorer is covered by `SPECS-v8.md`. **About stays exactly as v7**; the only change there is adding "Learn" to the shared nav.

Reference designs (open in a browser): `reference/Landing v8.dc.html`, `Method v8.dc.html`, `Cases v8.dc.html`, `Learn v8.dc.html`, plus `reference/nisar-satellite.js`.
Copy rules and P0 copy rows: `PLAN-content-pages-v8.md` (applies to every page below).

---

## 0. Shared

**Nav (all pages):** Cases · Method · **Learn (new)** · About · [Explorer] (pill CTA). `aria-current="page"` on the active link.

**Libraries**
- GSAP 3.12 + ScrollTrigger (already used): entrance (`[data-intro]`) and section reveals (`[data-reveal]`, `top 80%`, once).
- three.js 0.160: only inside the `<NisarSatellite>` component.
- Respect `prefers-reduced-motion`: no scroll-scrub, satellite shown deployed, no autorotate, no looping waves.

**Chips (provenance):** every number shows a chip with its source and run date.
- `REAL · <place> · <window> · RUN <date>`: solid 1px border, ink #d4d2cc
- `TYPICAL VALUES · ILLUSTRATIVE`: amber, rgba(245,158,11,.18) / #fcd34d
- `EXPERIMENTAL · NOVA-FRONTIER-MODEL`: dashed border
- A number without a traceable source gets removed, not chipped.

**Scales (never vary per page):** HH/HV gray −30…0 dB · change diverging −8…+8 dB · coherence cividis 0–1 · wrapped phase cyclic −π…π.

**Remove everywhere:** "pending", "no measurement yet", "don't apply yet", "coming soon", "displacement: empty", the landslide teaser and any cm displacement claim.

---

## 1. `<NisarSatellite>` component (new, shared)

Source: `reference/nisar-satellite.js` (web component; port to a React component wrapping three.js).

**Geometry, built to published NASA/JPL dimensions**
- 12 m gold wire-mesh reflector: shallow paraboloid (F ≈ 6.5 m), 24 radial ribs, ring truss (drum) ~0.95 m deep
- 9 m boom: 4 hinged truss segments (triangular, diagonal bracing, hinge joints)
- Octagonal instrument structure (NASA): L-band feed tile array (4×3) and S-band feed
- ISRO bus: gold foil, radiator, Ka-band dish
- One solar wing: 3 panels on a yoke
- Earth (equirect texture `public/landing/earth-day.jpg`), fresnel atmosphere, star field

**Props**
| Prop | Type | Default | Meaning |
|---|---|---|---|
| `deploy` | 0–1 | 1 | 0 stowed → boom unfolds (0–0.55) → reflector moves out (0.5–0.8) → mesh opens (0.62–1) |
| `beam` | 0–1 | 0 | Side-looking beam cone + gold swath on the ground |
| `scrollDriven` | bool | false | Maps the scroll progress of the nearest `[data-sat-track]` to deploy/beam/zoom |
| `hotspots` | bool | false | Gold rings on parts (shown when deploy > 0.92) |
| `autorotate` | bool | false | Slow yaw until the user drags |
| `offsetX` | 0–1 | 0 | Shifts the model right (camera view offset) to leave room for text |
| `noHint` | bool | false | Hides "DRAG TO ROTATE" |
| `earth` | url | – | Earth texture |
| events | `progress(p)`, `part(id)` | | Scroll progress 0–1; pinned hotspot id |

**Interaction:** pointer drag orbits (yaw free, pitch −0.5…1.1), arrow keys orbit, hotspots are focusable buttons with tooltip. Pause the render loop off-screen (IntersectionObserver). DPR ≤ 2.

**Hotspot copy (verbatim)**
- 12 m reflector: "Gold-plated wire mesh stretched on a ring truss. It focuses the radar into a swath more than 240 km wide."
- 9 m boom: "Holds the reflector away from the spacecraft. It unfolded in orbit after launch."
- L-band radar · 24 cm: "Built by NASA/JPL. The long wave passes leaves and reaches branches, trunks and soil."
- S-band radar · 9.4 cm: "Built by ISRO. A shorter wave that responds more to leaves and the top of crops."
- Spacecraft bus: "Provided by ISRO, carrying NASA's 3.5 Gbps Ka-band link that sends the data down."
- Solar array: "Keeps both radars and the recorder powered around the orbit."

**Where it appears**
- Method §1: the scroll-driven story (main home).
- Landing §08 Mission: deployed, autorotate, hotspots, beam 0.7, offsetX 0.14, `noHint`. A short hook that sends people to Method. If performance is tight on mobile, Landing falls back to the static image `public/landing/nisar-concept.jpg`.

---

## 2. Landing v8

Sections: 01 Story · 02 Compare · 03 Pipeline · 04 Events · 05 Honesty · **06 Atlas (new)** · 07 Sources · 08 Mission · 09 Close.

- **04 Events:** chip logic `coherenceOnly ? "COHERENCE ONLY · 0.247" : "MEASURED CASE · ESRI WORLD IMAGERY"` (no "pending" state).
- **06 Atlas (new):** "SIX CONTINENTS OF REAL NISAR DATA" / "How each place's echo behaves over time." / "Months of measured passes compressed into colour by one shared model. Similar colours mean similar radar histories, not the same land cover." Chip `EXPERIMENTAL · NOVA-FRONTIER-MODEL`.
  - Accordion of 7 tiles, height clamp(300px,34vw,460px). Hover/focus/click expands one (flex 5 vs 1, 700 ms cubic-bezier(.2,.8,.2,1)); collapsed tiles zoom 1.6 and hide their label. `image-rendering: pixelated`.
  - Tiles (name · meta): Forest River, USA · 10 DATES · FIELDS / Deliblato, Serbia · 8 DATES · SANDS & FARMS / Chenab River, Pakistan · 8 DATES · RIVER PLAIN / Niscemi, Italy · 8 DATES · HILLS / Okavango, Botswana · 8 DATES · DELTA / Amazon floodplain, Brazil · 8 DATES · HOLDOUT / Murray Basin, Australia · 16 DATES · HOLDOUT. Default open: Chenab.
  - Assets: `docs/atlas/*.png` (crops of nova-frontier-model `global_surface_atlas.png`).
- **08 Mission:** the static image becomes `<NisarSatellite>` (see §1). Overlay H2 "Twelve metres of gold mesh." Caption: "Interactive model built to NASA/JPL published dimensions. The gold strip is the radar's swath on the ground." Remove the parallax on the old image.

## 3. Method v8

Order: Intro · 01 The satellite · 02 One answer, step by step · 03 Lenses · **04 What the echo says (new)** · **05 Length of the wave (new)** · **06 Interferometry (new)** · 07 Where it works / fails · 08 Experimental models · 09 Colours. Landslides section removed.

- **Intro:** kicker "METHOD · WHAT THE RADAR MEASURES". Lede: "Every answer is a measurement, compared with the place's own history and checked against a second satellite."
- **01 The satellite (replaces the Satellite Teardown):** a 340vh track with a sticky 100vh stage; `<NisarSatellite scrollDriven hotspots offsetX=0.16>`. Left column (max 380px): 3 steps, active at opacity 1 + gold kicker, others at 0.28. Steps change at p < 0.12 / < 0.55 / ≥ 0.55.
  1. STOWED FOR LAUNCH · "Folded into a nose cone." · "The reflector and its boom travel packed against the spacecraft on ISRO's GSLV rocket."
  2. DEPLOYED IN ORBIT · "A 12 m reflector on a 9 m boom." · "The boom unfolds, then the gold wire mesh opens like an umbrella. NISAR's L-band (NASA) and S-band (ISRO) radars share it."
  3. LOOKING SIDEWAYS · "A swath more than 240 km wide." · "NISAR looks to one side, not straight down. Every 12 days it passes the same place on the same orbit, so each spot builds its own history."
  Footnote: "MODEL BUILT TO NASA/JPL PUBLISHED DIMENSIONS · TOUCH THE GOLD RINGS".
- **02 Pipeline:** step 03 reads "Up to five real passes" / "Read from NASA's archive, about a month apart, from the last five months." / `≤ 5 dates · 80 m blocks, power averaged before dB`. The HH baseline image uses the fixed gray (`docs/cases/qadirabad-base-gray.png`, ramp black→white, −30…0 dB).
- **04 What the echo says (new):** a segmented control of 4 surfaces + an animated SVG scene (pulse in gold, HH return orange #e8894a, HV blue #6fb3e8, dashed strokes animated with `stroke-dashoffset`) + HH/HV bars on −30…0 dB + amber chip. Bars ease their width over 600 ms.
  | Surface | Mechanism | HH | HV | Title |
  |---|---|---|---|---|
  | Calm water | SPECULAR · MIRROR | −25 | −30 | The pulse glances off and leaves. |
  | Forest | VOLUME · INSIDE THE CANOPY | −8 | −13 | Leaves and branches scatter it everywhere. |
  | Field | SURFACE · ROUGH SOIL | −12 | −20 | Rough ground sends part of it back. |
  | City | DOUBLE BOUNCE · WALL AND STREET | −3 | −12 | Wall and street send it straight back. |
  Body copy per surface: see `reference/Method v8.dc.html` (logic `S` object), verbatim.
- **05 Length of the wave (new):** three rows drawn to the same scale (1 cm = 10 units), with sine waves scrolling continuously: L-band 24 cm (gold, 7 s loop, "Reaches branches, trunks and soil", NISAR · NASA/JPL · also SAOCOM) · S-band 9.4 cm (ink, 5 s, "Responds to leaves and crop tops", NISAR · ISRO) · C-band ≈ 5.6 cm (gray, 4 s, "Mostly the top of the canopy", Sentinel-1 · RADARSAT Constellation). Footnote with GHz values.
- **06 Interferometry (new):** H2 "Fringes draw how the radar's path changed." Body copy uses the 12 cm path-length rule (verbatim in reference). Two figures: wrapped phase (−π…π) and coherence (0…1). Stat row "39,584 of 62,500 coherent cells kept their phase at the 0.35 threshold" + REAL chip (backend run, Kumamoto, 5 km window, 21 Jul → 14 Aug 2026, 12 Nov 2026).
  - ⚠ The current images are crops of Daniel's report figure (`docs/insar/*`). **Ask Daniel for clean exports** with the official scales (coherence in cividis, phase cyclic) and swap them in. See ISSUES-for-Daniel.
- **07 Where it works:** the Kumamoto card is now "works": "The echo kept its phase across the earthquake pair", stat "39,584 of 62,500", link "Backend run, 12 Nov 2026 →" to the backend repo.
- **09 Colours:** HH/HV fixed gray −30…0 dB (one entry), + Coherence (cividis), wrapped phase "One full cycle is about 12 cm of change in path length."

## 4. Cases v8

- The Kumamoto case data (`cases` content): chip "Did the ground keep its echo?"; limits rewritten (12 cm path rule); quality rows MEASURED "Coherence + phase" · PAIR "21 Jul → 14 Aug" · FRINGE "≈ 12 cm path"; no "empty" chips.
- The bottom card replaces the landslide teaser: kicker "ANY PLACE ON LAND", H2 "Your place isn't here? Ask the radar.", body "Search any place in the explorer and read its last five NISAR passes in one to four minutes, through the same four questions." It shows 4 hazard icons (no landslide, no earthquake) + a gold CTA "Open the explorer".
- Optional (agreed earlier): a Chocó card labelled "coherence only".

## 5. Learn v8 (new page)

Sections: Hero "Learn to read radar." · See like a radar (interactive visual intro) · 4 steps · Other radars · Closing CTA.
- Hero: kicker "LEARN · FROM THE APP TO YOUR OWN ANALYSIS", lede "Four steps from the free courses and tools NASA and its partners publish. By the end you can download a NISAR scene and measure change yourself." It includes an index list of the 4 steps (anchors).
- Steps (sticky big numeral + title + why on the left, resource cards on the right; cards lift 3px and get a gold border on hover):
  1. **Understand:** Intro to Remote Sensing · Intro to SAR · NISAR StoryMaps
  2. **Practise:** NASA ARSET (EN/ES) · CSA SAR tutorial in Python and QGIS
  3. **Get the data:** Earthdata Search · ASF Vertex · NISAR Data User Guide
  4. **Apply:** NISAR Applications white papers · UAVSAR postcards
- Other radars: SAOCOM (L, CONAE) · RADARSAT Constellation (C, CSA) · RADARSAT-1 archive (C, CSA), plus the NASA non-endorsement disclaimer **verbatim**.
- Images used: `public/landing/reflector-deployment.jpg`, `optical-/radar-north-dakota.jpg`, `docs/cases/qadirabad-base-gray.png`, `chokwe-change.png`, `docs/insar/kumamoto-wrapped-phase.png`.
- ⚠ Replace these homepage links with the exact URLs from the challenge resource list: StoryMaps, white papers, UAVSAR postcards, CSA tutorial, SAOCOM catalogue + registration.

## 6. About

**No changes vs v7** except the nav (adds Learn). Ignore `reference/About v8.dc.html` if present.

---

## Acceptance

- [ ] No string in the UI claims ground displacement in cm; grep for `centimet`, `ground moved`, `pending`, `not yet`, `don't apply` returns nothing.
- [ ] Every number on Landing/Method/Cases/Learn has a chip with its source.
- [ ] HH/HV images use the same gray −30…0 dB on every page.
- [ ] The satellite loads lazily, pauses off-screen, holds ≥ 50 fps on a mid laptop, and has a static fallback.
- [ ] Reduced motion: no scrub or loops, and all content is still readable.
- [ ] Keyboard: hotspots, surface picker and atlas tiles are focusable with a visible focus ring.
- [ ] Mobile (≤ 720px): two-column grids stack, the satellite stage text goes over the model at the bottom, the atlas becomes a horizontal scroll.
