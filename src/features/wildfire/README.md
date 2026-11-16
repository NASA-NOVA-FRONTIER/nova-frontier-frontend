# Wildfire panel data (#21)

The data the More information panel of a measured wildfire case reads. The demo case is Bug Fire
(Nevada, ignited 8 Aug 2026), the model's `bug-fire` case read through the `wildfire` lens. The panel
shows measured radar returns and the lens's cross-pol (HV) decline next to an independent fire
perimeter. It never states burned area, severity, probability or cause.

## Files

| File                     | What it holds                                                            |
| ------------------------ | ------------------------------------------------------------------------ |
| `wildfireEvidence.ts`    | The `WildfireEvidence` type and pure helpers (image paths, shares)       |
| `../cases/bugFire.ts`    | Bug Fire's data, copied from the model's case                            |
| `public/cases/bug-fire/` | Its layers as 64 × 64 PNGs of the 10 m grid, so the panel paints OFFLINE |

## Where every field comes from

All of it comes from the model's release `events-20261115`
(`nisar-phenomena-20261115-r1.zip`, folder `bug-fire/`). The backend relays the manifest as
`/api/v1/cases/bug-fire`; it does not relay the series yet, so the numbers are copied into the case
file.

| Field                     | Model source                                                                                       |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `series`, `passes[].role` | `bundle.json` `series_key`; `manifest.json` `baseline_dates` and `assessment_dates`                |
| `passes[].point`          | `series.json` `observations[]` (`gamma0_db` per date and polarization at the marker pixel)         |
| `passes[].area`           | `series.json` `observed_groups[]` with `group: all_common_cells` (median and spatial IQR)          |
| `passes[].outsideCells`   | `series.json` `diagnostic_band_timeline[].outside_cells`                                           |
| `shift`                   | `series.json` `area_readout.channels.*.delta_db` and `point_readout.channels.*.delta_db`           |
| `crossPol`                | `manifest.json` `evidence.lens_report.radar.cross_pol_history`                                     |
| `perimeter`               | `series.json` `area_readout.external_perimeter_comparison`                                         |
| `reference`               | `manifest.json` `evidence.independent_reference` (WFIGS perimeter, ignition and containment times) |
| `firms`                   | `manifest.json` `evidence.lens_report.fire_context.status` is `unavailable`                        |
| `limitation`              | `bundle.json` `limitations[0]`                                                                     |

Images, renamed from the release:

| Shipped name                               | Release layer                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `<date>-HH.png`, `<date>-HV.png`           | `display_<date>_<pol>.png`                                              |
| `baseline-HH.png`, `baseline-HV.png`       | `baseline_median_<pol>.png`                                             |
| `change-HH.png`, `change-HV.png`           | `display_baseline_change_<POL>.png` (target minus baseline)             |
| `decline-count.png`                        | `display_cross_pol_decline_count_cross_pol_decline_count.png`           |
| `decline-pattern.png`                      | `display_cross_pol_pattern_cross_pol_pattern.png` (codes 0–3)           |
| `variability-HH.png`, `variability-HV.png` | `view_temporal_mad_<pol>.png`                                           |
| `three-dates-HH.png`                       | `view_three_date_rgb_hh.png`                                            |
| `polarization-rgb.png`                     | `view_polarization_rgb_hh_hv.png`                                       |
| `balance.png`, `balance-change.png`        | `view_cross_co_ratio_hh_hv.png`, `view_cross_co_ratio_change_hh_hv.png` |

`display_change_<POL>` is left out: the release doesn't say which pass it compares against.

## Still missing

- **NASA FIRMS detections** (list, map dots, days since the last one): not in the model's case. They
  need a one-time fetch for the fire's window (8–27 Aug 2026), or the backend relaying them (T12).
- **The perimeter polygon** (`bug.geojson`), only to draw it on the map. It is public at the WFIGS
  source above; the inside and outside counts are already computed.
- **The shared map** of #19, for the dots and the perimeter.
