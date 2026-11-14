"""Crop the seven panels of nova-frontier-model's global surface atlas into public/atlas/.

Source: github.com/NASA-NOVA-FRONTIER/nova-frontier-model docs/images/global_surface_atlas.png
(commit 46073fa56e, 2026-11-05). Fetch it first, then run from the repo root:

    GH_TOKEN=$(gh auth token -u cris-eci) gh api \
      repos/NASA-NOVA-FRONTIER/nova-frontier-model/contents/docs/images/global_surface_atlas.png \
      -H "Accept: application/vnd.github.raw" > /tmp/global_surface_atlas.png
    python3 scripts/crop-atlas.py /tmp/global_surface_atlas.png

Needs Pillow. Panels are found by scanning for their framed squares, so a re-render with the
same layout still crops cleanly; anything other than 4 + 3 panels stops the script.
"""

import sys
from pathlib import Path

from PIL import Image

# Reading order of the figure: top row left to right, then the bottom row.
IDS = ["forest-river", "deliblato", "chenab", "niscemi", "okavango", "amazon", "murray"]
MIN_PANEL = 200  # px; captions and the legend text are far narrower than a panel
INSET = 2  # px inside the 1 px frame, so no border colour leaks into the tile


def is_background(pixel, background):
    return sum(abs(a - b) for a, b in zip(pixel, background)) <= 40


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
    px = image.load()
    width, height = image.size
    background = px[5, 5]
    # Column spans from a row through the top panels, row spans from a column through the first panel.
    first_col = None
    boxes = []
    for y in range(height):
        row = runs([not is_background(px[x, y], background) for x in range(width)])
        if len(row) >= 3:
            first_col = row[0]
            break
    if first_col is None:
        raise SystemExit("No panel row found")
    x_mid = (first_col[0] + first_col[1]) // 2
    rows = runs([not is_background(px[x_mid, y], background) for y in range(height)])
    for top, bottom in rows:
        y_mid = (top + bottom) // 2
        for left, right in runs([not is_background(px[x, y_mid], background) for x in range(width)]):
            boxes.append((left + INSET, top + INSET, right + 1 - INSET, bottom + 1 - INSET))
    return boxes


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
        image.crop(box).save(out / f"{tile_id}.png", optimize=True)
        print(tile_id, box)


if __name__ == "__main__":
    main()
