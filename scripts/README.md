# scripts

One-off builders for static files the app ships. Run them from the repo root. Each file's header says
where its source comes from.

| Script                   | Writes                         | Run with                   |
| ------------------------ | ------------------------------ | -------------------------- |
| `crop-atlas.py`          | `public/atlas/*.webp`, `*.png` | see below                  |
| `crop-insar.py`          | `public/insar/`                | see its header             |
| `build-baseline-gray.ts` | Method HH baseline image       | `pnpm cases:baseline`      |
| `fetch-frames.ts`        | `public/data/frames.json`      | `pnpm frames:fetch`        |
| `check-no-globe-stub.ts` | nothing (fails a stub build)   | `pnpm check:no-stub [dir]` |
| `render-architecture.ts` | architecture PNG               | `pnpm diagram`             |

## Surface atlas tiles (`crop-atlas.py`)

The landing's "How each place's echo behaves over time." strip shows the seven panels of
nova-frontier-model's `docs/images/global_surface_atlas.png` (commit `4f7ba4a`, 2099 × 1315).

```bash
GH_TOKEN=$(gh auth token -u cris-eci) gh api \
  repos/NASA-NOVA-FRONTIER/nova-frontier-model/contents/docs/images/global_surface_atlas.png \
  -H "Accept: application/vnd.github.raw" > /tmp/global_surface_atlas.png
python3 scripts/crop-atlas.py /tmp/global_surface_atlas.png
```

Needs Pillow with WebP support. It prints each panel's box and how much of it the grid explains.

What it does, the same way for every panel:

1. Finds the seven framed panels (4 on top, 3 below, in the order of `IDS`) and stops on any other layout.
2. Reads one colour per model cell at the cell centre. Each panel is the model's 128 × 128 `learned_rgb`
   grid that matplotlib drew about 3.3× with soft cell edges; reading centres gets the cells back.
3. Stops if the grid explains less than 90% of the panel's pixels, so a re-render with another grid is
   caught instead of resampled.
4. Enlarges the grid by exactly 8× to 1024 × 1024 by repeating each cell (no resampling filter) and
   writes a lossless WebP (about 43–56 KB) and a PNG fallback (about 69–79 KB).

Every output pixel is a measured model cell's colour: the tiles are sharp, not more detailed. 128 cells
is all the data the figure has; a finer tile needs the model team to render `learned_rgb` on a finer
grid. The app keeps `image-rendering: pixelated` so the browser never smooths the cells either.
`ATLAS_TILE_PX` in `src/pages/landing/atlasTiles.ts` must match the output size.
