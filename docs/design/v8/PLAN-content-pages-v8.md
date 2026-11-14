# Plan: content pages v8 + scientific copy pass

For Claude Code, working in `NASA-NOVA-FRONTIER/nova-frontier-frontend`. Backend of record: `NASA-NOVA-FRONTIER/nova-frontier-backend`. Science: `NASA-NOVA-FRONTIER/nova-frontier-model`. Explorer v8 is already built; this plan covers Landing, Method, Cases, a new Learn page and a copy pass across the app.

## 0. Copy principle (applies everywhere)

Say what the product measures, in the present tense, and what that measurement is good for. No roadmap talk in the UI: no "yet", "not yet", "coming soon", "we don't apply", "waiting for". Limits are stated as properties of the measurement, not as missing features.

| Instead of | Write |
| --- | --- |
| "…needs corrections we don't apply yet." | "Coherence shows where the ground kept the same echo between two passes. The wrapped phase draws the change as fringes; one fringe is one cycle of NISAR's 24 cm wave." |
| "Did the ground move?" | "Did the ground keep its echo?" (lens chip) · "Interferometric pair" (layer name) |
| "No measurement until InSAR corrections pass" (Chocó) | "Coherence 0.247 between two passes. Low coherence: the surface changed or vegetation decorrelated the echo." |
| "Displacement: not shown / null" | Drop the empty row. Show what is measured: coherence, phase, pair dates, grid. |
| "Landslides are next." | "Landslides: the radar checks whether passes bracket the event and whether the slope kept its echo." Or remove the section. |
| "S-band coming soon" | "L-band, 24 cm." (remove the S option from the switch until it ships) |
| "Pending" | Name the actual state: "Coherence only", "Event context". |

Rule of thumb: if a sentence describes something the backend does not return, delete it; if it describes what it does return, say it plainly.

## P0 · Scientific copy pass (do first, small PR)

| File | Now | Change |
| --- | --- | --- |
| `src/pages/method/teardownSteps.ts:86` | "…reveals how many centimetres the ground moved. That is what the explorer shows." | "NISAR returns to each spot on the same orbit. Comparing the phase of two echoes shows where the ground kept the same echo and draws the change as fringes, one per 24 cm wave cycle. The explorer shows coherence and wrapped phase for any pair you pick." |
| `src/features/cases/cases.ts:109`, `src/content/copyV8.ts:290` | "Did the ground move?" | "Did the ground keep its echo?" |
| `src/features/cases/cases.ts:406` | "…not how far the ground moved." | "We show where the radar echo stayed steady between two passes." |
| `src/pages/method/methodContent.ts:91` | "Up to six real passes" | "Up to five real passes" (backend `ScenePlanner`: five images, about 30 days apart, last five months) |
| `src/pages/method/methodContent.ts:14,36` | viridis baseline ramp | fixed gray −30…0 dB for HH/HV (same as Explorer v8) |
| `src/pages/method/methodContent.ts:241-243` | "Coherent fringes, but no displacement we can stand behind… Chocó waits too." | "Coherent fringes over Kumamoto: 1,614 coherent phase cells in the wide window. We publish coherence and wrapped phase." |
| `src/pages/method/MethodPage.tsx:324` "Why ground motion matters" (Nevado del Ruiz) | framed as our capability | Frame as a NISAR application: "What L-band interferometry is used for" + one line that the explorer measures coherence and phase over volcanoes like this one. |
| Cases / Landing / StartCard: Chocó "Pending", "EVENT CONTEXT · NO MEASUREMENT YET" | | "Coherence only · 0.247" with its coherence layer |
| `src/pages/cases/CasesPage.tsx:182-185` "Landslides are next." | | Rewrite per §0 or remove |
| `src/features/live/liveQuestion.ts:49` LIVE_EMPTIES (Cause, Probability, Hectares, Displacement) | empty rows | Keep the rule in code; in the UI replace the empty list with one line under the result: "Measured radar evidence: no cause, probability or area is inferred." |
| `README.md` (front) | cases table "Did the ground move?", "the five lenses" | Match the above; four lenses + interferometric pair |
| Explorer L \| S switch | "S coming soon" | Show L-band only |

Acceptance: `grep -riE "not yet|coming soon|we don't|waits too|ground move|centimetres the ground|six real passes"` over `src/` returns nothing user-facing. Unit tests for `cases.ts` updated.

## P1 · Faithful satellite (`.glb`)

- Replace the primitive model in `teardownScene.ts` with a `.glb` built to the official dimensions: 12 m gold-plated wire-mesh reflector with a rim truss (drum, not a deep dish), 9 m boom, octagonal L/S instrument structure, ISRO bus, solar array, Ka-band antenna. References: NASA "About the NISAR Satellite", JPL press-kit gallery, NASA SVS turntable (Feb 2026).
- Budget: < 2 MB with Draco/Meshopt, PBR materials, named parts (`bus`, `solar`, `radars`, `boom`, `reflector`) so the existing teardown steps keep working.
- Design will deliver the `.glb` + a parts map; Claude Code swaps the loader (GLTFLoader + DRACOLoader) and keeps `render(p)`, `drag(dx)`, reduced motion.

## P2 · Method v8

1. Satellite you can touch: drag to rotate; hotspots on reflector, boom, L-band and S-band feeds; "Deploy" replays the reflector unfolding; scale comparison (12 m reflector vs a person / tennis court).
2. Echo simulator: pick a surface (calm water, forest, field, city) and watch the pulse return in HH and HV. Explains the flood rule and the vegetation lens.
3. Wavelength ruler on scroll: L 24 cm, S 9.4 cm, C ~5.6 cm against a tree canopy; links to SAOCOM (L-band) and RCM (C-band) as other radar missions.
4. Qadirabad sequence (exists) with gray scale.
5. Interferometry: Dani's real Kumamoto figure (`docs/images/interferometry.png`, ask for unaxed crops) with the copy from P0.
6. Experimental models (exists) + optional UMAP "galaxy" (3,764 histories as InstancedMesh; hover draws its HH/HV curve), labelled EXPERIMENTAL. Needs points JSON from Dani.
7. Possible drivers as hypothesis (same rules as Explorer v8).

## P3 · Landing additions (keep the globe and scroll story)

- "Clouds part": the cloud layer peels away on scroll and a real radar layer appears beneath (needs a real NISAR tile; check GIBS `NISAR_L2_Geocoded_Polarimetric_Covariance` with Dani, else a case crop).
- Regions atlas on the globe: Dani's `global_surface_atlas` tiles placed at their real locations, hover to enlarge, EXPERIMENTAL chip ("learned representation, not land cover").
- Primary CTA: "Ask any place" → `/explore`; measured cases become the secondary row.
- Keep the radar vs optical compare slider.

## P4 · Cases

- Five cards: four measured + Chocó "Coherence only".
- Card detail: Dani's `surface_behavior_v05` style panel (HH/HV change + trajectory) where available.
- Filters by question match the four lenses + "Interferometric pair".

## P5 · Learn (new page `/learn`, or the last section of Method)

Path, not a link dump: Understand (Intro to Remote Sensing, Intro to SAR, NISAR StoryMaps) → Practise (ARSET, English and Spanish; CSA SAR Python tutorial) → Get the data (Earthdata Search, ASF Vertex, NISAR Data User Guide) → Apply (NISAR Applications White Papers, UAVSAR Postcards). Other radars: SAOCOM (CONAE, L-band), RCM and RADARSAT-1 (CSA, C-band). Include the NASA non-endorsement notice from the challenge page.

## P6 · Motion and performance rules

- GSAP + ScrollTrigger + Lenis (existing). Use SplitText/Flip for headings and state changes. One hero moment per section.
- 3D lazy-loads when in view; 60 fps target; total 3D < 3 MB.
- `prefers-reduced-motion` and Help → Reduce motion: every animation has a static frame.
- Every real number carries its chip and source; every simulation says it is one.
- No NASA/ISRO logos; credit imagery "NASA/JPL-Caltech" etc.

## Asks for Daniel

1. Unaxed PNG crops of `global_surface_atlas`, `interferometry`, `surface_behavior_v05`.
2. UMAP points + histories as JSON (for the galaxy), or a no.
3. Confirm whether NISAR GCOV is served as a GIBS layer usable on the Landing.
4. Chocó coherence layer in `/v2/cases`.

## Order

P0 (copy, 1 PR) → P1 (glb) → P2 (Method) → P3 (Landing) → P4 (Cases) → P5 (Learn). P0 ships before the judging demo regardless of the rest.


## Copy rules (agreed 2026-11-14)
- Interferometry: each fringe ≈ 12 cm of change in the radar's path length (half of the 24 cm wavelength, two-way travel). Never write a displacement in cm for a result.
- Wavelengths: L-band 24 cm (1.26 GHz), S-band 9.4 cm (3.2 GHz), C-band ~5.6 cm (~5.4 GHz).
- Every number on a content page carries a chip with its source and run date; numbers with no traceable source are removed.
- Scales: HH/HV fixed gray −30…0 dB · change diverging −8…+8 dB · coherence cividis 0–1 · wrapped phase cyclic.

## P0 rows (updated)
| File | Before | After |
|---|---|---|
| src/pages/method/teardownSteps.ts:86 | "…reveals how many centimetres the ground moved." | "NISAR returns to each spot on the same orbit. Comparing the phase of two echoes shows where the ground kept the same echo, and draws the change as fringes: each fringe is about 12 cm of change in the radar's path length. The explorer shows coherence and wrapped phase for any pair you pick." |
| teardownSteps.ts (S-band step) | "10 cm" | "9.4 cm" |
| src/pages/method/methodContent.ts:241-243 | "Coherent fringes, but no displacement…" | "Kumamoto, 21 Jul → 14 Aug 2026: 62,500 coherent cells in a 5 km window, 39,584 with phase at the 0.35 threshold." + REAL chip (backend run, 12 Nov 2026) |

## Built in v8 design files
- Landing v8: interactive 3D NISAR (nisar-satellite.js), global surface atlas accordion (docs/atlas/*), no "pending" states.
- Method v8: scroll-driven satellite deploy + beam, "What the echo says" surface simulator, wavelength comparison, real Kumamoto interferometry, gray HH baseline, landslides removed.
- Cases v8: landslide teaser replaced with "Ask the radar" CTA.
- Learn v8: new page from the challenge resource list (Understand · Practise · Get the data · Apply · Other radars).
