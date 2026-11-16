# Downloads (#37)

The explorer's Download menu (top bar). For analysis the two formats are **CSV** (the data) and
**PDF** (the readable report). The globe PNG and the JSON are kept as they were.

## Where each file is made: in the browser

Both are built in the browser, on purpose:

- A measured case is static data in the app (`src/features/cases/`), and a live answer is already in
  memory: the explorer fetched it from `GET /api/v1/explorations/{id}`. Nothing new is asked of the
  backend, nothing waits on the gateway and no file passes through a server.
- The PDF is the printable report page (`/report?case=<id>` or `/report?exploration=<id>`), saved with
  the browser's own "Save as PDF". It needs no PDF library, keeps text selectable, and the page and
  the file show the same blocks.

## CSV: `dataCsv.ts`

`nisar-hazard-watch_<case or exploration-id>_<YYYY-MM-DD>.csv`, UTF-8 with a byte-order mark so Excel
reads "·" and "−", CRLF line ends.

- **Header:** `#` lines: the place or exploration, question or lens, mode (OFFLINE / ONLINE),
  provenance, result, headline and its source, quality, **scientific status**, every **limit**,
  what is never reported (cause, probability, hectares, depth, displacement), every **source** with
  its link, and the day it was saved. A newline inside a value is folded, so no note can start a
  row.
- **Case rows** (`date, role, hh_point_db, hv_point_db, hh_area_median_db, hv_area_median_db,
cells_outside_band, cells_eligible, outside_band_pct, demo`): a case with its own series
  (Niscemi) gives every pass with real values and `demo=false`. A case whose timeline is still the
  12-day demo gives its dates with `demo=true` and **no values**, so no illustrative number can be
  analysed. Its measured numbers are in the header. Planned passes are left out: they are not data.
- **Live rows** (`date, role, status, reason, hh_point_db, hv_point_db, hh_valid_cells,
hv_valid_cells, sensing_start_utc, granule_id`): one per date the service read, sorted, with its
  role (baseline, target, assessment). A masked channel is an empty cell, never zero.

The menu disables CSV, with the reason, until there is something to write: no case open, an answer
still running, or a case with no per-pass values (Chocó).

## PDF: the report pages

- The page title is the file name (`nisar-hazard-watch_<id>_<YYYY-MM-DD>`), which the browser offers
  when saving.
- **Case:** the question, the result, the mode (OFFLINE) and the scientific status. Then the
  measured images (change and baseline, with the same legend text as on the globe) or the report
  figure, the point series, the quality, the limits with their alternatives, and the sources.
- **Live:** the same blocks from the backend's answer. It adds the measured images (the lens's
  change or coherence layer and the target pass), a table of the values at the point by date, and
  the scenes read.
- **Errors:** while the answer loads the page says so. If it can't be loaded it says so with **Try
  again**, and an unknown or unfinished id names the problem. "Save as PDF" appears only once there
  is a result.

## Sizes

A file holds one result: a few dozen rows and lines, a few kilobytes. Nothing is streamed or capped,
because no single result is large. The live report draws at most two images, each a single PNG of the
measured window.
