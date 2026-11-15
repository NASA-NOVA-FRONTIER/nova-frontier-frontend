# SPECS v9 · Explorer analysis flow + Learn waves (#33)

Status: approved 15 Nov 2026. Delta on v8. Look and honesty rules unchanged.
Reference designs (open in a browser): `reference/Explorer Flow v9.dc.html` (clickable prototype), `reference/Explorer Flow v9 Frames.dc.html` (1440 × 900 and 390 × 844 frames), `reference/Radar Waves.dc.html`, `reference/Tour v9 Ejecutivo.dc.html`.
Strings: `COPY-flow-v9.md`. Copy is in the prototype's logic class (`copy`, `TIPS`, `PTIP`, `LOOK`, `RS`): use it verbatim.

## 0. Contract with the backend (nothing invented)
| UI need | Endpoint |
|---|---|
| Passes over the square | `GET /api/v1/coverage?lon&lat&startDate&endDate` (#18 adds dates and must return **all** available passes + the 5 chosen) |
| Earthquake pairs | `GET /api/v1/insar/pairs?lon&lat&startDate&endDate` |
| Start | `POST /api/v1/explorations {lens, geometry, pairId?, coherenceThreshold?}` |
| Progress | `GET /api/v1/explorations/{id}` (status, stage, elapsedSeconds, etaSeconds, plan, result) |
| Cases | `GET /api/v1/cases`, `GET /api/v1/cases/{id}` |
- The square is the backend's 10.24 km UTM square (`AOI_SIDE_KM`). The UI says "10 × 10 km".
- Lens map: Flood → `flood`, Wildfire → `wildfire`, Deforestation → `vegetation`, Earthquake → `insar`. Landslides are not offered.
- There is no event catalogue for now (decision 15 Nov). The USGS catalogue is a later issue.

## 1. Flow (5 states)
1. **Empty globe.** "Click any land to place a 10 × 10 km square". A cases panel shows 4 featured cases (one per phenomenon: Qadirabad · Bug Fire · Rowe Creek · Kumamoto) and the other 8 in a list.
2. **Square placed.** A dashed square with handles; drag to move (pointer capture, touch-action none). Bar: "Square placed · nothing runs yet" · Cancel · Use this square.
3. **Confirm panel** (right, 400 px; bottom sheet ≤ 62 % on phones). Four blocks:
   - Title "What should the radar look for?" + one line `10 × 10 km · {lat, lon} · Move`.
   - 4 phenomenon chips (radiogroup) + a fixed line `LOOK[phen]` + ⓘ.
   - **Passes strip**: summary `"{n} passes · {start} → {end}"` + ⓘ + Change.
     - GCOV lenses: one dot per pass. The **chosen passes are gold dots joined by a gold line**. The date range is a soft band.
     - Earthquake: every possible pair is an **arc** joining its two passes. The chosen arc is solid gold; tap another arc to choose it. Below it: `Pair {a} → {b} · {d} days · tap an arc to change` + link `Advanced · threshold 0.35` (0.2 / 0.35 / 0.5 / 0.7).
     - Change opens Start/End buttons plus chips of **real pass dates only**, plus "Reset to preset".
   - Note (only when needed), then a **sticky footer**: mode chip + wait line + ⓘ, the block reason in orange when Start is disabled, Start analysis · Cancel.
4. **Processing** (top right, collapsible; bottom sheet on phones). Elapsed time (never a countdown), the backend range as a band on a 0–5 min bar, 4 steps, "taking longer" after the ETA, a hard stop at 8 min (partial). 10 facts drawn from the pool of 40. OFFLINE: steps already done, no facts.
5. **Result.** Square layer + date stamp; legend card (top left); timeline (bottom); result card (right).

## 2. Presets and rules
| Lens | Preset | Rule |
|---|---|---|
| Flood | Event ± 60 days | 5 passes closest to 5 evenly spaced dates, de-duplicated |
| Wildfire | 45 days before, 90 after | same |
| Deforestation | Last 5 months | same |
| Earthquake (your square) | The 5 most recent passes | pairs: consecutive + skip-one, newest first; default = newest |
| Measured case | From the manifest | phenomenon locked, OFFLINE |
- 5 passes = normal. 4 = allowed, and the note names the largest gap. ≤ 3 = Start disabled ("Not enough history here", with a one-tap widen). 0 = "NISAR hasn't measured this square yet" plus the next planned pass from the Observation Plan.
- Earthquake with < 2 passes in range: "No pass pair in this range", Start disabled.

## 3. Result
- Layer switch per lens (reset to the first layer when the lens changes):
  - Flood: HH (gray −30…0 dB) · Change since first (−8…+8 dB, blue weaker / red stronger) · Darkening signature (gray/blue).
  - Wildfire: HV (gray) · HV decline (diverging) + NASA FIRMS dots (orange, white ring), legend "NASA FIRMS fire detection".
  - Deforestation: HV · HV decline.
  - Earthquake: Coherence (cividis 0–1) · Wrapped phase (cyclic −π…π).
- The legend card shows the ramp, its ends, a one-line "what am I seeing" and an ⓘ.
- Timeline: prev · play/pause · next · title `Pass i of n · date` + sub `n MEASURED PASSES · start → end · TRACK t DIR` + ⓘ · speed 0.5/1/2× · Loop. Ticks sit at their **real dates** with gap labels in days. Earthquake: one bar per pair; measured cases add the event line and "ALL STRADDLE THE EVENT".
- Result card (6 pieces): chips `ONLINE|OFFLINE` + `MEASURED|DEMO DATA` + ⓘ · lens icon + place · title (what was measured, no event date) + mono range line · stat `N of M` + label + ⓘ · `Could also be:` · `Not shown:` · text link "Place a new square →".
- Never show hectares, depth, probability, cm displacement or a cause stated as fact.

## 4. Tooltips (ⓘ)
- Floating popover, 280 px: title in gold mono + 1–2 plain sentences. It opens on hover and on focus; tap toggles it (pinned).
- It is positioned in the component's root layer (it must escape the panel scroll), flips above when there is no room, and is clamped horizontally.
- Placement: phenomenon, passes strip, mode, threshold, cases, square, wait, steps, chips, stat, layer, timeline.

## 5. Reduced motion
- The timeline opens paused. Frames swap without fades.
- Facts don't rotate on their own; "Next fact" swaps with no fade.
- No square pulse, globe spin or animated dashes.
- Learn waves draw one static frame that updates with the controls.

## 6. Learn · Radar Waves (#33)
A canvas technical cross-section; `prefers-reduced-motion` gives a static frame. It pauses off screen (IntersectionObserver) and when the tab is hidden (visibilitychange). DPR ≤ 2.
- Background: night gradient, a 32 px blueprint grid (alpha 0.035), faint stars, a soft glow at the top right.
- Canopy: particle clouds (2 depths, cached per size). **Particles inside the beam light up gold** down to the band's reach: L reaches the ground, S the branches (~45 %), C the top of the canopy (~14 %). Trunks and branches are hairlines.
- Soil: a dashed hatch section + grains.
- NISAR is a line drawing (wing, gold bus, boom, reflector with mesh) rotated to aim along the incidence direction. Clamp x ≥ 112.
- Waves use additive glow. Sent wave in gold. The echo runs on a parallel line offset 18 px: HH orange, HV blue dots spaced ≥ px/2. A scatter flash at the hit point.
- Labels: mono 10 px on dark backings (NISAR label, LEAVES / BRANCHES / SOIL leaders, reach line label, angle, 24 cm scale bar).
- Controls: band radiogroup (arrow keys, roving tabindex), polarization radiogroup, native range 33–47°.

## 7. Acceptance
- [ ] No UI string mentions an event date for user squares; the event line exists only in measured cases.
- [ ] Only real pass dates can be chosen; the strip matches `/coverage`.
- [ ] The confirm CTA is always visible (sticky footer) at 1440 × 900 and 390 × 844.
- [ ] Every ⓘ works with the mouse, the keyboard and touch.
- [ ] HH/HV, change, coherence and phase use the fixed v8 scales.
- [ ] Learn waves hold 60 fps on a mid-range laptop, pause off screen and when hidden, and reduced motion is static.

## 8. Open items
Backend #18 (dates + full pass list) · a PNG per pass in `layers[]` · real HV layers for Bug Fire / Rowe Creek · real dates for the Kumamoto pairs and event · facts 11–40 verified and ~20 images · the USGS catalogue later.
