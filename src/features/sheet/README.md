# More Information evidence

Phenomenon panels provide their evidence as props. Keep the summary above the
measurement and the limitations in the normal reading order. The existing sheet
puts sources and quality in a side column on wide screens and stacks them below
the main content on narrow screens. Explorer loads the sheet when it opens.

| Component             | Props and behavior                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RadarHistory`        | `returns` is a list of dated gamma-zero dB values by channel. Supply a controlled `date` and `onDate` to link the selected date to imagery. Pass `provenance` (`"online"` for a fresh result or `"offline"` for a cache hit or measured replay), `source`, and `unavailableReason`. It shows the history, paired trajectory where supported, and a date-by-channel table with keyboard-accessible date buttons. |
| `CompareSplit`        | `left` and `right` each contain a raster URL (`src`) and an accessible `label`. Supply `aspectRatio` to preserve a rectangular frame. Use `overlay` when the second raster has transparent pixels, and `onImageError` to show retry or unavailable copy. The slider supports pointer, touch, and arrow, Home, and End keys.                                                                                     |
| `EvidenceLimitations` | `plain` is the summary limit; optional `technical` follows it when appropriate. `alternatives` lists explanations already supported by the case copy and `unavailable` says which claims or measurements are withheld.                                                                                                                                                                                          |
| `EvidenceSources`     | `sources` is a list of `{ href, label }` links. An empty list explicitly reports that no links were supplied.                                                                                                                                                                                                                                                                                                   |

`LiveSciencePanel` adapts the app's already-validated observations to
`RadarHistory`. When per-date values are absent, the unavailable state appears.
An OFFLINE panel may use the same components with observations from its measured
replay. Illustrative series belong in their separately labelled demo view.

Polarization balance is `HV − HH` for the same measured acquisition. A null or
missing channel produces a gap. The balance keeps its own dB values and is not
colored on the gamma-zero heatmap scale. A display comparison requires matching
extents, CRS, and fixed scales where the two sides show the same quantity.
