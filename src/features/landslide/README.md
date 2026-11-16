# Landslide panel (#24)

The More information panel of a measured landslide case. The model has no landslide lens: its one
landslide case, Niscemi (`niscemi-aftermath`, release `events-20261115`), is read through the
descriptive `observed_dynamics` lens. So the panel shows measured radar returns (REAL) and labels any
reading of them as landslide evidence EXPERIMENTAL. It never states displacement, extent, probability
or cause.

## Files

| File                   | What it holds                                                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `landslideEvidence.ts` | The `LandslideEvidence` type and pure helpers (dB formatting, out-of-band share, images per pass)                                                              |
| `LandslidePanel.tsx`   | The panel: aftermath note, image per pass with a before/after slider, area and marker series, out-of-band bars, shift on the target pass, values table, method |
| `landslide.css`        | Its styles (`x-ls` prefix)                                                                                                                                     |
| `../cases/niscemi.ts`  | Niscemi's data, copied from the model series, and its `Case` entry                                                                                             |

## The data a landslide case needs

All of it comes from one case of the model's release: `GET /v2/cases/<id>` (layers and
visualizations) and `GET /v2/cases/<id>/series`. The backend relays the first as
`/api/v1/cases/<id>`; it does not relay the series yet, so the numbers are copied into the case file.

| Field                              | Model source                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event`                            | `reference.event_date` and the event source in `configs/phenomena_examples.json`                                                                                                          |
| `series`                           | `series_key` of the case                                                                                                                                                                  |
| `passes[].point`                   | `series.observations[]` (`gamma0_db` per date and polarization at the marker pixel)                                                                                                       |
| `passes[].area`                    | `series.observed_groups[]` where `group` is `all_common_cells` (median and spatial IQR)                                                                                                   |
| `passes[].outsideCells`, `cells`   | `series.diagnostic_band_timeline[]` (`outside_cells`, `eligible_cells`)                                                                                                                   |
| `shift.area`, `shift.point`        | `series.area_readout.channels[].delta_db` and `series.point_readout.channels[].delta_db`                                                                                                  |
| `band`                             | The out-of-band rule of `surface_features.from_db`: either channel beyond max(3, 3 × max(1.4826 × MAD, 1)) dB                                                                             |
| Images in `public/cases/<folder>/` | Layers `display_<date>_<pol>`, `baseline_median_<pol>`, `display_baseline_change_<POL>` and visualizations `view_temporal_mad_*`, `view_three_date_rgb_hh`, `view_polarization_rgb_hh_hv` |

Every image is a 128 × 128 PNG of the 80 m grid, shipped with the app so the panel paints at once
(OFFLINE) without waiting for the gateway.

## Adding a landslide case

1. Copy the series values and the layers above into a `cases/<name>.ts` file and `public/cases/<name>/`.
2. Give the `Case` `lens: "observed_dynamics"`, `hazard: "landslide"`, `verdict: "measured"` and
   `landslide: <evidence>`; mark its timeline `realDates: true`.
3. `tests/unit/landslide.test.ts` checks the shape: dates in order, the headline equal to the
   series, every image shipped, and the event before or after the passes.
