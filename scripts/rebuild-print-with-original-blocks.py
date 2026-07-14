#!/usr/bin/env python3
"""Rebuild the 26-page kit while preserving the original SPIKE block artwork.

Pages 2-10 come from the original Chrome-printed PDF, so the real Word/Work
Block visuals are never replaced by generic drawings. The current generator is
used only for the cover and corrected pages 11-26. Safety copy overlays are
applied to the original pages without touching their block artwork.
"""

from __future__ import annotations

import hashlib
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory

from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "assets/pdf/Lego_Spike_Prime_Flashcards_And_Games.original-block-base.pdf"
FINAL = ROOT / "assets/pdf/Lego_Spike_Prime_Flashcards_And_Games.pdf"
GENERATOR = ROOT / "scripts/rebuild-print-appendix.py"
EXPECTED_BASE_SHA256 = "fed6f53e95ef57169d567f1775baac493d0cf431d83c0e54fa8654b1a257c3bb"


def load_generator():
    spec = importlib.util.spec_from_file_location("spike_print_support", GENERATOR)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load print support generator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> None:
    if hashlib.sha256(BASE.read_bytes()).hexdigest() != EXPECTED_BASE_SHA256:
        raise RuntimeError("Original block-art PDF base is missing or changed")

    support = load_generator()
    support.register_fonts()
    tmp_root = ROOT / "tmp/pdfs"
    tmp_root.mkdir(parents=True, exist_ok=True)

    with TemporaryDirectory(prefix="block-base-", dir=tmp_root) as tmp:
        tmp_dir = Path(tmp)
        corrected_path = tmp_dir / "corrected-pages.pdf"
        overlay_path = tmp_dir / "safety-overlays.pdf"
        support.build_full_pdf(corrected_path)
        support.build_safety_overlays(overlay_path)

        original = PdfReader(str(BASE))
        corrected = PdfReader(str(corrected_path))
        overlays = PdfReader(str(overlay_path))
        if len(original.pages) != 26 or len(corrected.pages) != 26 or len(overlays.pages) != 19:
            raise RuntimeError("Expected 26-page original/corrected PDFs and 19 safety overlays")

        writer = PdfWriter()
        writer.add_metadata({
            "/Title": "LEGO SPIKE Prime 编程闪卡与家庭互动游戏",
            "/Subject": "原版 SPIKE Block 闪卡、45678 部件与家庭编程任务",
            "/Creator": "SPIKE Prime Family Mission Control",
        })

        # Keep the current corrected cover, then preserve the original block-art
        # flashcard pages exactly. Only safety-copy areas receive an overlay.
        writer.add_page(corrected.pages[0])
        for index in range(1, 10):
            page = original.pages[index]
            page_number = index + 1
            if page_number in support.SAFETY_REPLACEMENTS:
                page.merge_page(overlays.pages[index])
            writer.add_page(page)

        # Pages 11-26 retain the corrected 45678 catalog, distinct engineering
        # diagrams, current game rules and parent/safety guide.
        for page in corrected.pages[10:]:
            writer.add_page(page)

        output = FINAL.with_suffix(".hybrid-new.pdf")
        with output.open("wb") as handle:
            writer.write(handle)
        if len(PdfReader(str(output)).pages) != 26:
            raise RuntimeError("Hybrid PDF failed the 26-page invariant")
        output.replace(FINAL)

    print(FINAL)


if __name__ == "__main__":
    main()
