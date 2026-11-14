"""Crop the wrapped-phase and coherence map panes of nova-frontier-model's Kumamoto interferometry figure
into public/insar/ for Method §06.

Source: github.com/NASA-NOVA-FRONTIER/nova-frontier-model docs/images/interferometry.png
(commit 46073fa56e, 2026-11-05). Run from the repo root, either with a local copy:

    python3 scripts/crop-insar.py /tmp/interferometry.png

or with no argument, which fetches it through the GitHub CLI (needs access to the repo, e.g.
GH_TOKEN=$(gh auth token -u cris-eci) python3 scripts/crop-insar.py).

Needs Pillow. The boxes sit just inside each pane's axes frame, so no ticks, frame or colour bar
leak into the crop. Interim crops until the science team sends clean exports.
"""

import io
import subprocess
import sys
from pathlib import Path

from PIL import Image

SOURCE = "repos/NASA-NOVA-FRONTIER/nova-frontier-model/contents/docs/images/interferometry.png"
EXPECTED_SIZE = (2712, 912)
# (left, top, right, bottom) in the 2712 x 912 figure.
BOXES = {
    "kumamoto-wrapped-phase": (265, 263, 622, 620),
    "kumamoto-coherence": (910, 263, 1267, 620),
}
OUT_DIR = Path("public/insar")


def load(argv):
    if len(argv) > 1:
        return Image.open(argv[1])
    raw = subprocess.run(
        ["gh", "api", SOURCE, "-H", "Accept: application/vnd.github.raw"],
        check=True,
        capture_output=True,
    ).stdout
    return Image.open(io.BytesIO(raw))


def main(argv):
    image = load(argv).convert("RGB")
    if image.size != EXPECTED_SIZE:
        raise SystemExit(f"Figure is {image.size}, expected {EXPECTED_SIZE}: re-measure the boxes")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, box in BOXES.items():
        out = OUT_DIR / f"{name}.png"
        image.crop(box).save(out, optimize=True)
        print(f"{out} {box}")


if __name__ == "__main__":
    main(sys.argv)
