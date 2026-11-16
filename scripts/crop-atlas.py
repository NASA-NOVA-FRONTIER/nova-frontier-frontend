"""Crop the seven panels of nova-frontier-model's global surface atlas into public/atlas/.

Source: github.com/NASA-NOVA-FRONTIER/nova-frontier-model docs/images/global_surface_atlas.png
(commit 4f7ba4a, 2026-11-14; 2099 x 1315, sha256 66ee79d0...a734f507). Fetch it first, then run
from the repo root:

    GH_TOKEN=$(gh auth token -u cris-eci) gh api \
      repos/NASA-NOVA-FRONTIER/nova-frontier-model/contents/docs/images/global_surface_atlas.png \
      -H "Accept: application/vnd.github.raw" > /tmp/global_surface_atlas.png
    python3 scripts/crop-atlas.py /tmp/global_surface_atlas.png

Needs Pillow with WebP support. Panels are found by scanning for their framed squares, so a re-render
with the same layout still crops cleanly; anything other than 4 + 3 panels stops the script.

Each panel is the model's 128 x 128 learned_rgb grid, drawn by matplotlib a little over 3x with soft
cell edges. The script reads one colour per cell (the cell centre), checks that the grid explains the
panel, and enlarges it by an exact integer factor: every output pixel is a model cell's colour, so
the tile is sharp without inventing detail. See scripts/README.md.
"""

import sys
from pathlib import Path

from PIL import Image

# Reading order of the figure: top row left to right, then the bottom row.
IDS = ["forest-river", "deliblato", "chenab", "niscemi", "okavango", "amazon", "murray"]
MIN_PANEL = 200  # px; captions and the legend text are far narrower than a panel
GRID = 128  # model cells per side in every panel (learned_rgb of surface_dynamics.nc)
SCALE = 8  # 128 x 8 = 1024 px: covers the open tile at 1440 px and 2x pixel ratio
MIN_FIT = 0.9  # share of panel pixels that must match their cell's colour, or the grid is wrong
FIT_TOLERANCE = 24  # summed RGB difference that still counts as the same cell colour


def close(a, b, tolerance):
    return sum(abs(x - y) for x, y in zip(a, b)) <= tolerance


def runs(values):
    """Spans of consecutive non-background samples at least MIN_PANEL long."""
    found, start = [], None
    for i, filled in enumerate(values + [False]):
        if filled and start is None:
            start = i
        elif not filled and start is not None:
            if i - start >= MIN_PANEL:
                found.append((start, i - 1))
            start = None
    return found


def panel_boxes(image):
    """Inside of each panel's 1 px frame, as (left, top, right, bottom) with right/bottom exclusive."""
    px = image.load()
    width, height = image.size
    background = px[5, 5]

    def filled(x, y):
        return not close(px[x, y], background, 40)

    # Column spans from a row through the top panels, row spans from a column through the first panel.
    first_col = None
    for y in range(height):
        row = runs([filled(x, y) for x in range(width)])
        if len(row) >= 3:
            first_col = row[0]
            break
    if first_col is None:
        raise SystemExit("No panel row found")
    x_mid = (first_col[0] + first_col[1]) // 2
    boxes = []
    for top, bottom in runs([filled(x_mid, y) for y in range(height)]):
        y_mid = (top + bottom) // 2
        for left, right in runs([filled(x, y_mid) for x in range(width)]):
            boxes.append((left + 1, top + 1, right, bottom))
    return boxes


def cell_grid(image, box):
    """The GRID x GRID cell colours of one panel, read at each cell's centre."""
    left, top, right, bottom = box
    px = image.load()
    cell_w, cell_h = (right - left) / GRID, (bottom - top) / GRID
    return [
        [px[int(left + (col + 0.5) * cell_w), int(top + (row + 0.5) * cell_h)] for col in range(GRID)]
        for row in range(GRID)
    ]


def grid_fit(image, box, grid):
    """Share of the panel's pixels (away from cell edges) whose colour is their cell's colour."""
    left, top, right, bottom = box
    px = image.load()
    cell_w, cell_h = (right - left) / GRID, (bottom - top) / GRID
    hits = total = 0
    for y in range(top, bottom):
        fy = (y + 0.5 - top) / cell_h
        if abs(fy - round(fy)) < 0.25:  # antialiased seam between two cells
            continue
        for x in range(left, right):
            fx = (x + 0.5 - left) / cell_w
            if abs(fx - round(fx)) < 0.25:
                continue
            total += 1
            hits += close(px[x, y], grid[int(fy)][int(fx)], FIT_TOLERANCE)
    return hits / total


def enlarge(grid):
    """Exact nearest-neighbour enlargement by SCALE: each cell becomes a SCALE x SCALE block.

    Built from bytes instead of Image.resize, so no resampling filter can creep in.
    """
    rows = []
    for row in grid:
        line = b"".join(bytes(colour) * SCALE for colour in row)
        rows.append(line * SCALE)
    size = GRID * SCALE
    return Image.frombytes("RGB", (size, size), b"".join(rows))


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/crop-atlas.py <global_surface_atlas.png>")
    image = Image.open(sys.argv[1]).convert("RGB")
    boxes = panel_boxes(image)
    if len(boxes) != len(IDS):
        raise SystemExit(f"Expected {len(IDS)} panels, found {len(boxes)}: {boxes}")
    out = Path("public/atlas")
    out.mkdir(parents=True, exist_ok=True)
    for tile_id, box in zip(IDS, boxes):
        grid = cell_grid(image, box)
        fit = grid_fit(image, box, grid)
        if fit < MIN_FIT:
            raise SystemExit(f"{tile_id}: a {GRID} x {GRID} grid explains only {fit:.0%} of {box}")
        tile = enlarge(grid)
        tile.save(out / f"{tile_id}.webp", lossless=True, method=6)
        tile.save(out / f"{tile_id}.png", optimize=True)
        print(tile_id, box, f"grid fit {fit:.1%}")


if __name__ == "__main__":
    main()
