#!/usr/bin/env python3
"""Verify that all 33 original SPIKE block visuals survive PDF rebuilding.

The comparison deliberately targets only the front-face visual area of the
folding cards. Safety-copy overlays are allowed on the reverse text area, but
the real Work/Word Block screenshots on pages 2-10 must remain pixel-identical
to the archived original PDF when both files are rendered by the same tool.
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image, ImageChops, ImageStat
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "assets/pdf/Lego_Spike_Prime_Flashcards_And_Games.original-block-base.pdf"
FINAL = ROOT / "assets/pdf/Lego_Spike_Prime_Flashcards_And_Games.pdf"

# 120-DPI A4 render: 992 x 1404 pixels. These rectangles cover only the
# original card fronts (category, block screenshot and block label), never the
# reverse-side activity copy where safety overlays are expected.
CARD_FRONTS = (
    (36, 130, 486, 419),
    (507, 130, 956, 419),
    (36, 755, 486, 1044),
    (507, 755, 956, 1044),
)


def render_page(pdf: Path, page: int, target: Path) -> Path:
    target.mkdir(parents=True, exist_ok=True)
    prefix = target / f"page-{page:02d}"
    subprocess.run(
        [
            "pdftoppm",
            "-f",
            str(page),
            "-l",
            str(page),
            "-singlefile",
            "-r",
            "120",
            "-png",
            str(pdf),
            str(prefix),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )
    return prefix.with_suffix(".png")


def mean_difference(left: Image.Image, right: Image.Image) -> float:
    diff = ImageChops.difference(left.convert("RGB"), right.convert("RGB"))
    return sum(ImageStat.Stat(diff).mean) / 3


def main() -> None:
    assert len(PdfReader(str(BASE)).pages) == 26, "original block base must have 26 pages"
    assert len(PdfReader(str(FINAL)).pages) == 26, "final print kit must have 26 pages"

    checked = 0
    with TemporaryDirectory(prefix="spike-block-visuals-") as temp:
        root = Path(temp)
        for page in range(2, 11):
            base_path = render_page(BASE, page, root / "base")
            final_path = render_page(FINAL, page, root / "final")
            with Image.open(base_path) as base_image, Image.open(final_path) as final_image:
                assert base_image.size == final_image.size == (992, 1404), (
                    f"unexpected page {page} render size: {base_image.size} / {final_image.size}"
                )
                rectangles = CARD_FRONTS if page < 10 else CARD_FRONTS[:1]
                for card, rectangle in enumerate(rectangles, start=1):
                    score = mean_difference(
                        base_image.crop(rectangle), final_image.crop(rectangle)
                    )
                    assert score <= 0.05, (
                        f"page {page} card {card} original block visual changed; "
                        f"mean pixel difference={score:.4f}"
                    )
                    checked += 1

    assert checked == 33, f"expected 33 original block visuals, checked {checked}"
    print("PASS original SPIKE Work/Word Block visuals preserved: 33/33")


if __name__ == "__main__":
    main()
