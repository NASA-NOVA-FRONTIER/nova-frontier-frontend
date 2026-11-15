# COPY · Explorer flow v9 (square → confirm → process → sequence)

Verbatim strings for code. `{x}` = value from the API. Design: `Explorer Flow v9.dc.html` (prototype) and `Explorer Flow v9 Frames.dc.html` (1440 × 900 and 390 × 844 frames).
Unchanged v8 strings (COPY-v8) are not repeated here.

## Decisions taken (15 Nov 2026)
- The square is the backend's **10.24 km** UTM square; the UI says "10 × 10 km" and "about 105 km²".
- Phenomena in the selector: **Earthquake · Wildfire · Deforestation · Flood**. Landslides are not offered (no lens, no case). Deforestation uses the vegetation lens.
- Dates are **editable**, with a preset per phenomenon (backend #18 adds `startDate`/`endDate`).
- Passes: **5** normal · **4** allowed, with the gap named · **≤ 3** = not enough history, Start disabled.
- Two chips on every result: **mode** (OFFLINE / ONLINE) + **origin** (MEASURED, or DEMO DATA / DEMO DATES under the v8 rules).
- Earthquake: the timeline shows **pass pairs (intervals)** with the event marked; every pair must straddle it.
- Cases: 12 measured; one featured per phenomenon (Qadirabad · Bug Fire · Rowe Creek · Kumamoto); the other 8 in a list.

## 1 · Empty globe
| Key | String |
|---|---|
| hint (desktop) | Click any land to place a 10 × 10 km square |
| hint (phone) | Tap any land to place a square |
| casesKicker | {n} MEASURED CASES |
| casesTitle | Start with a measured case |
| casesBody | Prepared from real NISAR passes. Opens in about a second. |
| moreCases | MORE MEASURED CASES |
| featured · Qadirabad | FLOOD · Qadirabad, Pakistan · 1,911 of 16,384 cells darkened in both polarizations |
| featured · Bug Fire | WILDFIRE · Bug Fire, Nevada · HV fell in 127 of 1,737 cells inside the perimeter, 18 of 1,813 outside |
| featured · Rowe Creek | DEFORESTATION · Rowe Creek · A disturbance with ambiguous radar signatures |
| featured · Kumamoto | EARTHQUAKE · Kumamoto, Japan · 3 pass pairs around the event; 3 of 1,614 phase cells pass the checks |
| list | Chókwè, Mozambique · Richmond, Indiana · San Marcos, Colombia · Matam, Senegal · High Plains, Kansas · control · Sköllersta, Sweden · Palouse, USA · Chocó, Colombia · coherence only |

## 2 · Square placed
| Key | String |
|---|---|
| dragHint | Drag to move |
| squareLabel | 10 × 10 KM · 105 KM² |
| placedTitle | Square placed |
| placedMeta | 10 × 10 km · about 105 km² · nothing runs yet |
| useSquare | Use this square |
| cancel | Cancel |

## 3 · Confirm panel
| Key | String |
|---|---|
| kicker | CONFIRM THE ANALYSIS |
| title | What should the radar look for? |
| area | 10 × 10 km square · 105 km² |
| coords | {lat}° N, {lon}° E |
| edit | Move |
| phenLabel | What do you want to look for? |
| phen | Earthquake · Wildfire · Deforestation · Flood |
| datesLabel / start / end | Dates · Start · End |
| preset | PRESET · {PRESET NAME} |
| preset names | Flood: Event ± 60 days · Wildfire: 45 days before, 90 after · Deforestation: Last 5 months · Earthquake: The pairs around the event |
| passLine (≥ 5) | {total} NISAR passes here · {inRange} in range · 5 will be read · track {t} {direction} |
| passLine (< 5) | {total} NISAR passes here · {inRange} in range · track {t} {direction} |
| paramsLabel | Settings |
| noParams | No settings needed for this phenomenon. |
| mode ONLINE | ONLINE · Computed live from the NISAR archive · Usually {from}–{to} min · we stop at 8 min |
| mode OFFLINE | OFFLINE · Prepared ahead of time · Opens in about a second |
| start | Start analysis |
| start (case) | Show the result |

**Settings: only what the backend accepts** (`POST /api/v1/explorations`: lens, geometry, pairId, coherenceThreshold). Decision 15 Nov: no event catalogue for now.
| Phenomenon | Setting | Default | Help |
|---|---|---|---|
| Flood · Wildfire · Deforestation | none | | No settings needed for this phenomenon. |
| Earthquake | Pass pair | Newest pair from `GET /api/v1/insar/pairs` | Two NISAR passes compared with each other, newest first. |
| Earthquake | Coherence threshold | 0.35 (0.1–0.9) | Cells below it are left out of the phase. |

- Earthquake preset: "The 5 most recent passes". The strip shows pairs as bars (chosen pair solid, others outlined). There is no event line for user squares; measured cases keep their manifest event and the straddle marker.
- Wildfire: the FIRMS context is fetched by the backend automatically and shown in the result; there is no toggle.
- Settings is a one-line summary ("Pair 26 Jul → 7 Aug · threshold 0.35 · Change") that expands on demand.
- Every label carries an ⓘ popover (hover, focus or tap). The texts are in the prototype (TIPS / PTIP).

**Measured case (phenomenon locked)**
| Key | String |
|---|---|
| kicker | MEASURED CASE · {PLACE} |
| title | {case title} |
| lockedWhy | This case was measured for one phenomenon. Place your own square to look for another. |
| passLine | {n} passes · track {t} {direction} · {k} pairs straddle the event |

**No NISAR dates**
| Key | String |
|---|---|
| noteTitle | NISAR hasn't measured this square yet |
| noteBody | No passes in the archive for this square. The Observation Plan schedules the next one on {date} (track {t}, {direction}). |
| noteAction | Open a measured case |
| waitLine | Nothing to compute |

**4 passes**
| noteTitle | 4 passes in this range |
| noteBody | The sequence will show 4 measured passes with their real gaps, not 5. NISAR has no pass here between {a} and {b}. |

**3 or fewer**
| noteTitle | Not enough history here |
| noteBody | Only {n} passes fall in this range. An analysis needs at least 4 to compare against the place's own history. |
| noteAction | Widen to {start} → {end} ({k} passes) |

## 4 · Processing (top right · bottom sheet on phones · collapsible)
| Key | String |
|---|---|
| title ONLINE | Analysing your square |
| title OFFLINE | Opening the prepared result |
| elapsedLabel | elapsed |
| estimate | Usually {from}–{to} min |
| estimate (exceeded) | Estimate was {from}–{to} min |
| lateBody | Taking longer than the estimate. It keeps running; at 8 minutes we stop and show what is ready. |
| OFFLINE estimate | Prepared ahead of time |
| steps | Finding passes · Reading passes · Measuring change · Drawing the layers |
| step lines | {n} passes · {direction} · {first} → {last} · {read} of {total} read · In progress · Waiting · Done |
| collapse / expand | Collapse · Expand |
| fact counter | FACT {i} OF 10 |
| nextFact | Next fact |
| fact source | Source: {label} |
| cancel | Cancel analysis |

The bar runs 0–5 min, the shaded band is the backend range, and the clock counts up. There is never a countdown. OFFLINE shows the steps already done and no facts.

## 5 · Result
| Key | String |
|---|---|
| chips | ONLINE / OFFLINE · MEASURED (or DEMO DATA) · {PHENOMENON} · {SIGNAL} |
| layers (GCOV) | HH backscatter · Change vs first |
| layers (GUNW) | Coherence · Wrapped phase |
| legends | −30 dB → 0 dB · −8 dB → +8 dB · 0 · changed → 1 · alike · −π → +π |
| stamp | {DATE} · PASS {i} OF {n} · {d} DAYS AFTER PASS {i−1} (first: · REFERENCE) |
| stamp (quake) | {A} → {B} · INTERVAL {i} OF {n} · {d} DAYS |
| timeline title | Pass {i} of {n} · {date} |
| timeline sub | {n} MEASURED PASSES · {START} → {END} · TRACK {t} {DIR} |
| timeline title (quake) | Pair {i} of {n} · {a} → {b} |
| timeline sub (quake) | {n} MEASURED PAIRS · ALL STRADDLE THE EVENT |
| event marker | EVENT · {DATE} |
| straddle | Only a pair whose two passes fall on either side of the event can show it. |
| gap label | {d} D |
| controls | Play · Pause · Previous pass · Next pass · Speed 0.5× 1× 2× · Loop |
| fewer than five | Pass {i} of 4 · 4 MEASURED PASSES · {gap} with no pass between {a} and {b} |
| newSquare | Place a new square |
| flood title / body | Parts of the square darkened after {event date} · Compared with the median of earlier passes, some cells dropped in both HH and HV, the way new open water does. |
| flood stat | {k} of {n} · analysis cells met the darkening signature |
| flood limits | No flood depth, extent in hectares or probability. · Darkening can also be wet soil or calm water that was already there. |
| quake title / body | Coherent fringes survive in parts of the square · {k} pass pairs straddle the {date} event. The phase is wrapped and uncorrected for the atmosphere, so it shows a pattern of change, not a distance. |
| quake stat | {k} of {n} · common phase cells met the correction-input checks |
| quake limits | Each fringe is about 12 cm of change in the radar's path length. · No displacement, magnitude or probability is shown. |

## 6 · Reduced motion
- The timeline opens **paused** on the reference pass. Play still works when the user asks for it, but frames swap without crossfades and the progress bar jumps between ticks.
- Facts never change on their own. "Next fact" swaps them with no fade.
- No square pulse while processing, no globe spin, and no animated dashes.
- The Learn waves (#33) draw one static frame that still updates with the controls.

## 7 · Fun facts pool (40; 10 drawn at random per wait)
Every fact names its source. Check each number against its source before shipping. Images come from existing assets; `—` means it needs an image from the team.

| # | Title | Text | Source | Image |
|---|---|---|---|---|
| 1 | Radar sees through clouds | NISAR sends its own microwave pulses and listens for the echo, so it measures day or night, through cloud and smoke. | NASA · 5 things to know about NISAR | radar-north-dakota.jpg |
| 2 | A 24 cm wave | NISAR's L-band radar uses a wavelength of about 24 cm. It passes leaves and reaches branches, trunks and the ground. | NASA Science · get to know SAR | nisar-concept.jpg |
| 3 | Calm water looks dark | Smooth water reflects the pulse away from the satellite like a mirror, so new water shows up as a drop in the echo. | NASA Science · get to know SAR | qadirabad-base-gray.png |
| 4 | Every 12 days | NISAR repeats the same orbit every 12 days, so each place builds its own history of echoes. | NASA Science · NISAR interferometry | atlas/chenab.png |
| 5 | Coherence, 0 to 1 | Coherence says how alike two echoes from the same spot are. Near 1 the ground looked the same; near 0 something changed. | ASF HyP3 · InSAR product guide | kumamoto-coherence.png |
| 6 | A 12 m reflector | The antenna reflector is about 12 m wide, the largest radar reflector NASA has sent to space. | NASA Science · the reflector blooms | reflector-deployment.jpg |
| 7 | Fringes are 12 cm | In an interferogram, one colour cycle is about 12 cm of change in the radar's path: half the 24 cm wave, there and back. | NASA Science · NISAR interferometry | kumamoto-wrapped-phase.png |
| 8 | Change, not a picture | Red means the echo grew and blue that it shrank, compared with the same place before. | NASA Earthdata · SAR | chokwe-change.png |
| 9 | Two agencies, one satellite | NASA built the L-band radar and ISRO the S-band radar and the spacecraft. It launched on 30 July 2025 from Sriharikota. | NASA Science · NISAR lifts off | nisar-concept.jpg |
| 10 | Open to everyone | NISAR data are archived at the Alaska Satellite Facility and free for anyone to download. | NASA Science · NISAR | earth-day.jpg |
| 11 | Unfolded in orbit | The reflector unfurled from about 0.6 m to 12 m in 37 minutes. | NASA Science · the reflector blooms | reflector-deployment.jpg |
| 12 | Two radars | NISAR is the first satellite to fly both an L-band and an S-band radar. | NASA Science · NISAR | nisar-concept.jpg |
| 13 | A 9.4 cm wave | ISRO's S-band radar uses a wavelength of about 9.4 cm, more sensitive to leaves and crop tops. | NASA Science · get to know SAR | — |
| 14 | Wide swath | Each pass images a strip of ground more than 240 km wide. | NASA Science · NISAR | earth-day.jpg |
| 15 | Looking sideways | NISAR looks to one side, not straight down. Slopes facing away from it can fall into radar shadow. | NASA Earthdata · SAR | — |
| 16 | A long antenna from a short one | Synthetic aperture radar combines echoes along the orbit to act like a much longer antenna. | NASA Earthdata · SAR | — |
| 17 | HH and HV | HH sends and receives horizontally. HV listens for echoes twisted to vertical, which mostly happen inside vegetation. | NASA Earthdata · SAR | radar-north-dakota.jpg |
| 18 | Cities shine | A street and a wall form a corner that sends the pulse straight back, so buildings are among the brightest things in radar. | NASA Earthdata · SAR | — |
| 19 | Roughness matters | Rough ground scatters part of the pulse back to the satellite; smooth ground sends it away. | NASA Earthdata · SAR | — |
| 20 | Water changes the echo | Wet soil reflects more strongly than dry soil because water changes how the ground responds to microwaves. | NASA Earthdata · SAR | — |
| 21 | Night is fine | Radar brings its own light, so night passes are as useful as day passes. | NASA · 5 things to know about NISAR | — |
| 22 | Smoke is no problem | Wildfire smoke that hides the ground from cameras is transparent to the radar. | NASA · 5 things to know about NISAR | — |
| 23 | Ascending and descending | NISAR crosses each place going north and going south, giving two viewing directions. | NASA Science · NISAR | — |
| 24 | The same orbit matters | Only passes from the same orbit track can be compared pixel by pixel; we never mix them. | ASF · NISAR Data User Guide | — |
| 25 | GCOV | Our backscatter layers come from NISAR's GCOV product: calibrated echo strength on a map grid. | ASF · NISAR Data User Guide | qadirabad-base-gray.png |
| 26 | GUNW | Our earthquake layers come from NISAR's GUNW product: interferograms already on a map grid. | ASF · NISAR Data User Guide | kumamoto-wrapped-phase.png |
| 27 | Decibels | Radar brightness is measured in decibels: every 10 dB is ten times the echo power. | NASA Earthdata · SAR | — |
| 28 | Speckle | The grainy look of radar images is speckle, interference between many scatterers in one pixel. | NASA Earthdata · SAR | qadirabad-base-gray.png |
| 29 | Atmosphere in the phase | Water vapour slows the pulse slightly, which can add fringes that are not ground motion. | NASA Science · NISAR interferometry | kumamoto-wrapped-phase.png |
| 30 | Lost coherence | Fields that were ploughed, flooded or burned between two passes lose coherence and show up dark. | ASF HyP3 · InSAR product guide | kumamoto-coherence.png |
| 31 | A partner in Argentina | Argentina's SAOCOM satellites also fly an L-band radar. | CONAE · SAOCOM | — |
| 32 | Canada's radars | The RADARSAT Constellation uses C-band, about 5.6 cm, for ice, ships and disasters. | CSA · RADARSAT Constellation | — |
| 33 | Free trainings | NASA ARSET offers free SAR courses, several in Spanish. | NASA ARSET | — |
| 34 | Airborne cousin | NASA's UAVSAR flies an L-band radar on an aircraft and helped prepare for NISAR. | NASA/JPL · UAVSAR | — |
| 35 | Launched from India | NISAR launched on ISRO's GSLV rocket from the Satish Dhawan Space Centre. | NASA Science · NISAR lifts off | — |
| 36 | Land, ice, water, vegetation | The mission's goal is to measure and understand changes in Earth's land, ice, water and vegetation. | NASA Science · NISAR | earth-day.jpg |
| 37 | Ice on the move | NISAR's repeated passes let scientists track how glaciers and ice sheets move. | NASA Science · NISAR | — |
| 38 | Crops in rhythm | Fields change their echo through the season as plants grow and are harvested. | NASA Science · NISAR | atlas/chenab.png |
| 39 | A place's own history | We compare each new pass with the same place's earlier passes, not with somewhere else. | NISAR Hazard Watch · Method | atlas/chenab.png |
| 40 | Gaps stay gaps | When NISAR has no pass on a date, the timeline shows the gap; we never invent an image to fill it. | NISAR Hazard Watch · Method | — |

## 8 · Learn waves (#33): `Radar Waves.dc.html`, mounted in Learn v8 under "Play with the wave"
| Key | String |
|---|---|
| kicker / H2 / lede | PLAY WITH THE WAVE · Change the wave, change what comes back. · Pick a wavelength, a polarization and an angle. The pulse and its echo move in real time. |
| bands | L-band · 24 cm · S-band · 9.4 cm · C-band · 5.6 cm |
| band meta | 1.26 GHz · NISAR (NASA/JPL), also SAOCOM · 3.2 GHz · NISAR (ISRO) · ≈ 5.4 GHz · Sentinel-1, RADARSAT Constellation |
| pols | HH · sent H, heard H · HV · sent H, heard V |
| incidence | Incidence angle · 33° · STEEPER · 47° · SHALLOWER |
| canvas labels | REACHES THE GROUND · STOPS IN THE BRANCHES · STOPS AT THE LEAVES · SENT · ECHO · HH / ECHO · HV · 24 cm |
| chip | ILLUSTRATIVE · WAVELENGTHS TO SCALE |
| readouts | L: The long wave reaches the ground / S: The middle wave stops in the branches / C: The short wave stops at the leaves (body copy verbatim in the component) |

The animation is on a canvas at 60 fps. It pauses off screen (IntersectionObserver) and when the tab is hidden (visibilitychange). Reduced motion draws one static frame. The radio groups use arrow keys with a roving tabindex, and the angle uses a native range input.
