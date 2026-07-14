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
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "assets/pdf/Lego_Spike_Prime_Flashcards_And_Games.original-block-base.pdf"
FINAL = ROOT / "assets/pdf/Lego_Spike_Prime_Flashcards_And_Games.pdf"
GENERATOR = ROOT / "scripts/rebuild-print-appendix.py"
EXPECTED_BASE_SHA256 = "fed6f53e95ef57169d567f1775baac493d0cf431d83c0e54fa8654b1a257c3bb"
BRAND_NAME = "Gemstone Sydney Pty Ltd"
BRAND_COPYRIGHT = "© 2026 Gemstone Sydney Pty Ltd. All rights reserved."
BRAND_CREDIT = "Developed by Gemstone Sydney Pty Ltd."


def load_generator():
    spec = importlib.util.spec_from_file_location("spike_print_support", GENERATOR)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load print support generator")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def build_brand_overlays(path: Path) -> None:
    """Create a low-interference ownership mark in each page's safe margin."""

    width, _ = A4
    pdf = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    for page_number in range(1, 27):
        pdf.saveState()
        pdf.setFillColor(HexColor("#52677C"))
        if hasattr(pdf, "setFillAlpha"):
            pdf.setFillAlpha(0.62)
        pdf.setFont("Helvetica", 6.2)
        # Original folding-card pages use the lower white margin. Corrected
        # pages already have a footer rule, so their watermark sits just above it.
        mark_y = 12 if page_number <= 10 else 42
        pdf.drawCentredString(width / 2, mark_y, BRAND_NAME)
        if page_number == 1:
            pdf.setFont("Helvetica", 5.8)
            pdf.drawCentredString(width / 2, 22, BRAND_COPYRIGHT)
            pdf.drawCentredString(width / 2, 31, BRAND_CREDIT)
        pdf.restoreState()
        pdf.showPage()
    pdf.save()


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
        brand_overlay_path = tmp_dir / "brand-overlays.pdf"
        support.build_full_pdf(corrected_path)
        support.build_safety_overlays(overlay_path)
        build_brand_overlays(brand_overlay_path)

        original = PdfReader(str(BASE))
        corrected = PdfReader(str(corrected_path))
        overlays = PdfReader(str(overlay_path))
        brand_overlays = PdfReader(str(brand_overlay_path))
        if (
            len(original.pages) != 26
            or len(corrected.pages) != 26
            or len(overlays.pages) != 19
            or len(brand_overlays.pages) != 26
        ):
            raise RuntimeError("Expected 26-page original/corrected/brand PDFs and 19 safety overlays")

        writer = PdfWriter()
        writer.add_metadata({
            "/Title": "LEGO SPIKE Prime 编程闪卡与家庭互动游戏",
            "/Subject": "原版 SPIKE Block 闪卡、45678 部件与家庭编程任务",
            "/Author": BRAND_NAME,
            "/Copyright": BRAND_COPYRIGHT,
            "/Creator": BRAND_CREDIT,
        })

        def add_branded_page(page, page_index: int) -> None:
            page.merge_page(brand_overlays.pages[page_index])
            writer.add_page(page)

        # Keep the current corrected cover, then preserve the original block-art
        # flashcard pages exactly. Only safety-copy areas receive an overlay.
        add_branded_page(corrected.pages[0], 0)
        for index in range(1, 10):
            page = original.pages[index]
            page_number = index + 1
            if page_number in support.SAFETY_REPLACEMENTS:
                page.merge_page(overlays.pages[index])
            add_branded_page(page, index)

        # Pages 11-26 retain the corrected 45678 catalog, distinct engineering
        # diagrams, current game rules and parent/safety guide.
        for index, page in enumerate(corrected.pages[10:], start=10):
            add_branded_page(page, index)

        output = FINAL.with_suffix(".hybrid-new.pdf")
        with output.open("wb") as handle:
            writer.write(handle)
        if len(PdfReader(str(output)).pages) != 26:
            raise RuntimeError("Hybrid PDF failed the 26-page invariant")
        output.replace(FINAL)

    print(FINAL)


if __name__ == "__main__":
    main()
