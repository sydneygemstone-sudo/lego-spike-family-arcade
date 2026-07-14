#!/usr/bin/env python3
"""Rebuild all 26 print-kit pages from the current flashcard source of truth."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from pypdf import PdfReader
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "assets/pdf/Lego_Spike_Prime_Flashcards_And_Games.pdf"
FONT_REGULAR = "/System/Library/Fonts/STHeiti Light.ttc"
FONT_BOLD = "/System/Library/Fonts/STHeiti Medium.ttc"

W, H = A4
NIGHT = HexColor("#07152D")
BLUE = HexColor("#287CFF")
CYAN = HexColor("#20B8CF")
MINT = HexColor("#34B881")
GOLD = HexColor("#F1B82D")
CORAL = HexColor("#F26C5B")
VIOLET = HexColor("#7557ED")
INK = HexColor("#13243D")
MUTED = HexColor("#617188")
LINE = HexColor("#D6E0EA")
PAPER = HexColor("#F5F8FC")


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("CN", FONT_REGULAR, subfontIndex=0))
    pdfmetrics.registerFont(TTFont("CN-Bold", FONT_BOLD, subfontIndex=0))


def wrap_lines(text: str, width: float, font: str, size: float) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        if not paragraph:
            lines.append("")
            continue
        line = ""
        for char in paragraph:
            probe = line + char
            if line and pdfmetrics.stringWidth(probe, font, size) > width:
                lines.append(line.rstrip())
                line = char.lstrip()
            else:
                line = probe
        if line:
            lines.append(line.rstrip())
    return lines


def text_block(c: canvas.Canvas, text: str, x: float, y: float, width: float,
               size: float = 9.2, leading: float = 13.0, font: str = "CN",
               color=INK, max_lines: int | None = None) -> float:
    lines = wrap_lines(text, width, font, size)
    if max_lines is not None:
        lines = lines[:max_lines]
    c.setFillColor(color)
    c.setFont(font, size)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def page_header(c: canvas.Canvas, section: str, title: str, page_no: int) -> None:
    c.setFillColor(white)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(NIGHT)
    c.roundRect(28, H - 82, W - 56, 50, 15, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.setFont("CN-Bold", 7.5)
    c.drawString(46, H - 53, section.upper())
    c.setFillColor(white)
    c.setFont("CN-Bold", 18)
    c.drawString(46, H - 72, title)
    c.setFont("CN", 8)
    c.setFillColor(HexColor("#B8C9DB"))
    c.drawRightString(W - 46, H - 58, f"SPIKE PRIME FAMILY KIT  /  {page_no} OF 26")


def footer(c: canvas.Canvas, note: str = "先规划 - 再运行 - 看结果 - 再 Debug") -> None:
    c.setStrokeColor(LINE)
    c.line(34, 35, W - 34, 35)
    c.setFillColor(MUTED)
    c.setFont("CN", 7.5)
    c.drawString(38, 22, note)
    c.drawRightString(W - 38, 22, "家庭使用请由成人主持")


def pill(c: canvas.Canvas, x: float, y: float, label: str, color) -> float:
    width = pdfmetrics.stringWidth(label, "CN-Bold", 7.5) + 15
    c.setFillColor(color)
    c.roundRect(x, y - 11, width, 16, 8, fill=1, stroke=0)
    c.setFillColor(white if color != GOLD else NIGHT)
    c.setFont("CN-Bold", 7.5)
    c.drawString(x + 7.5, y - 7, label)
    return x + width + 6


CATEGORY_COLORS = {
    "motors": BLUE, "movement": CORAL, "sensors": MINT, "display": VIOLET,
    "events": GOLD, "control": HexColor("#E77836"), "hardware": BLUE,
    "elements": MINT, "concepts": VIOLET,
}
CATEGORY_LABELS = {
    "motors": "电机", "movement": "移动", "sensors": "传感判断", "display": "显示",
    "events": "事件", "control": "控制", "hardware": "45678 硬件",
    "elements": "45678 结构件", "concepts": "工程原理",
}
CONCEPT_DIAGRAMS = {
    "gearbox", "gearRatio", "lever", "fulcrum", "rigidity", "friction",
    "gravity", "chassis", "linkage", "rackPinion", "beltDrive",
}


def load_cards() -> list[dict]:
    script = "import {CARDS_DATA} from './assets/cards-data.js'; console.log(JSON.stringify(CARDS_DATA));"
    result = subprocess.run(
        ["node", "--input-type=module", "-e", script], cwd=ROOT,
        check=True, capture_output=True, text=True,
    )
    cards = json.loads(result.stdout)
    if len(cards) != 72:
        raise RuntimeError(f"Expected 72 flashcards, found {len(cards)}")
    diagrams = {card.get("diagram") for card in cards if card.get("category") == "concepts"}
    if diagrams != CONCEPT_DIAGRAMS:
        raise RuntimeError(f"Concept diagram coverage drifted: {sorted(diagrams)}")
    return cards


def draw_cover(c: canvas.Canvas) -> None:
    c.setFillColor(NIGHT)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(HexColor("#0D3159"))
    c.circle(W - 55, H - 42, 220, fill=1, stroke=0)
    c.setFillColor(CYAN)
    c.setFont("CN-Bold", 9)
    c.drawString(48, H - 70, "SPIKE PRIME FAMILY MISSION KIT / 2026 EDITION")
    c.setFillColor(white)
    c.setFont("CN-Bold", 34)
    c.drawString(48, H - 125, "SPIKE Prime")
    c.drawString(48, H - 170, "编程闪卡与家庭任务包")
    c.setFillColor(HexColor("#B8CDE1"))
    text_block(c, "72 张可折叠闪卡 · 45678 盒内部件校准 · 亲子三卡场景挑战 · 六个编程任务 · 六个家庭游戏",
               50, H - 208, W - 100, size=13, leading=19, font="CN-Bold", color=HexColor("#B8CDE1"), max_lines=3)

    stats = [("72", "闪卡"), ("3", "每题必用"), ("26", "A4 页面")]
    sx = 50
    for value, label in stats:
        c.setFillColor(HexColor("#133E69"))
        c.roundRect(sx, H - 335, 132, 78, 16, fill=1, stroke=0)
        c.setFillColor(CYAN if label != "每题必用" else GOLD)
        c.setFont("CN-Bold", 27)
        c.drawString(sx + 16, H - 291, value)
        c.setFillColor(white)
        c.setFont("CN-Bold", 10)
        c.drawString(sx + 16, H - 315, label)
        sx += 145

    c.setFillColor(white)
    c.roundRect(45, 90, W - 90, 340, 24, fill=1, stroke=0)
    c.setFillColor(NIGHT)
    c.setFont("CN-Bold", 18)
    c.drawString(68, 394, "家长 3 分钟上手")
    steps = [
        ("01", "先浏览", "只看今天要复习的 8-12 张卡，不要求一次学完。"),
        ("02", "再讲场景", "家长读一段生活化任务，小朋友从卡组中选 3 张。"),
        ("03", "排出顺序", "让孩子解释先发生什么、再做什么、最后怎样反馈。"),
        ("04", "动手验证", "进入网页任务或拿真实 SPIKE 套件验证，失败就 Debug。"),
    ]
    y = 344
    for number, title, copy in steps:
        c.setFillColor(BLUE if number in ("01", "03") else MINT)
        c.roundRect(68, y - 12, 38, 29, 9, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("CN-Bold", 10)
        c.drawCentredString(87, y - 2, number)
        c.setFillColor(NIGHT)
        c.setFont("CN-Bold", 11)
        c.drawString(120, y + 1, title)
        c.setFillColor(MUTED)
        c.setFont("CN", 8.7)
        c.drawString(120, y - 14, copy)
        y -= 65
    c.setFillColor(HexColor("#92A9BF"))
    c.setFont("CN", 7.5)
    c.drawString(49, 45, "部件目录依据 LEGO Education 45678 官方清单；打印请开启背景图形并按 100% 比例。")
    c.showPage()


def draw_block_visual(c: canvas.Canvas, card: dict, x: float, y: float, w: float, h: float, accent) -> None:
    bw, bh = w - 28, min(62, h - 12)
    bx, by = x + 14, y + (h - bh) / 2
    c.setFillColor(accent)
    c.roundRect(bx, by, bw, bh, 13, fill=1, stroke=0)
    c.setFillColor(white if card["category"] != "events" else NIGHT)
    text_block(c, card["title"], bx + 13, by + bh - 23, bw - 26, size=9.2, leading=12,
               font="CN-Bold", color=white if card["category"] != "events" else NIGHT, max_lines=3)
    c.setFillColor(white)
    c.circle(bx + 21, by + 8, 7, fill=1, stroke=0)
    c.circle(bx + 42, by + 8, 7, fill=1, stroke=0)


def draw_concept_visual(c: canvas.Canvas, card: dict, x: float, y: float, w: float, h: float, accent) -> None:
    """Draw a distinct, print-safe schematic for every engineering concept card."""
    diagram = card.get("diagram")
    cx, cy = x + w / 2, y + h / 2
    left, right = x + 24, x + w - 24
    bottom, top = y + 13, y + h - 13

    c.saveState()
    c.setFillColor(PAPER)
    c.roundRect(x + 4, y + 4, w - 8, h - 8, 11, fill=1, stroke=0)
    c.setStrokeColor(accent)
    c.setFillColor(white)
    c.setLineWidth(3)
    c.setLineCap(1)

    if diagram == "gearbox":
        radii = (13, 19, 25)
        centers = (cx - 45, cx - 7, cx + 42)
        for gx, radius in zip(centers, radii):
            c.circle(gx, cy, radius, fill=1, stroke=1)
            c.setFillColor(accent)
            c.circle(gx, cy, 3.5, fill=1, stroke=0)
            c.setFillColor(white)
        c.setStrokeColor(MUTED)
        c.line(centers[0], cy, centers[-1], cy)

    elif diagram == "gearRatio":
        c.circle(cx - 34, cy, 15, fill=1, stroke=1)
        c.circle(cx + 22, cy, 34, fill=1, stroke=1)
        c.setFillColor(accent)
        c.circle(cx - 34, cy, 4, fill=1, stroke=0)
        c.circle(cx + 22, cy, 5, fill=1, stroke=0)
        c.setStrokeColor(MUTED)
        c.setLineWidth(1.5)
        for offset in (-8, 0, 8):
            c.line(cx - 48, cy + offset, cx - 20, cy + offset)

    elif diagram in ("lever", "fulcrum"):
        c.setStrokeColor(accent)
        c.setLineWidth(6 if diagram == "lever" else 4)
        c.line(left, cy + (8 if diagram == "lever" else 0), right, cy - (8 if diagram == "lever" else 0))
        c.setFillColor(accent)
        path = c.beginPath()
        pivot_x = cx + (16 if diagram == "lever" else 0)
        path.moveTo(pivot_x, cy - 2)
        path.lineTo(pivot_x - 16, bottom)
        path.lineTo(pivot_x + 16, bottom)
        path.close()
        c.drawPath(path, fill=1, stroke=0)
        c.setFillColor(CORAL)
        c.rect(left + 6, cy + 11, 20, 18, fill=1, stroke=0)
        if diagram == "lever":
            c.setStrokeColor(MINT)
            c.setLineWidth(3)
            c.line(right - 12, top, right - 12, cy + 3)
            c.line(right - 12, cy + 3, right - 18, cy + 11)
            c.line(right - 12, cy + 3, right - 6, cy + 11)
        else:
            c.setStrokeColor(MINT)
            c.circle(cx, cy, 7, fill=0, stroke=1)

    elif diagram == "rigidity":
        c.setLineWidth(4)
        c.setStrokeColor(HexColor("#AAB9C8"))
        c.rect(left, bottom, 53, top - bottom, fill=0, stroke=1)
        c.setStrokeColor(accent)
        c.line(left, bottom, left + 53, top)
        c.line(cx + 18, bottom, right, bottom)
        c.line(right, bottom, cx + 45, top)
        c.line(cx + 45, top, cx + 18, bottom)
        for px, py in ((left, bottom), (left + 53, top), (cx + 18, bottom), (right, bottom), (cx + 45, top)):
            c.setFillColor(accent)
            c.circle(px, py, 4, fill=1, stroke=0)

    elif diagram == "friction":
        c.setStrokeColor(accent)
        c.setLineWidth(4)
        c.line(left, cy - 12, right, cy - 12)
        for px in range(int(left), int(right), 11):
            c.line(px, cy - 12, px + 7, cy - 5)
        c.setFillColor(CORAL)
        c.roundRect(cx - 31, cy + 3, 62, 27, 6, fill=1, stroke=0)
        c.setStrokeColor(MINT)
        c.setLineWidth(3)
        c.line(cx - 47, cy + 17, cx - 75, cy + 17)
        c.line(cx + 47, cy + 17, cx + 75, cy + 17)
        c.line(cx - 75, cy + 17, cx - 67, cy + 23)
        c.line(cx + 75, cy + 17, cx + 67, cy + 23)

    elif diagram == "gravity":
        c.setStrokeColor(accent)
        c.setLineWidth(4)
        c.roundRect(cx - 54, bottom + 8, 108, 52, 10, fill=0, stroke=1)
        c.setFillColor(MUTED)
        c.circle(cx - 39, bottom + 5, 9, fill=1, stroke=0)
        c.circle(cx + 39, bottom + 5, 9, fill=1, stroke=0)
        c.setFillColor(CORAL)
        c.circle(cx, bottom + 27, 10, fill=1, stroke=0)
        c.setStrokeColor(CORAL)
        c.setLineWidth(2)
        c.line(cx, top, cx, bottom + 42)
        c.line(cx, bottom + 42, cx - 6, bottom + 50)
        c.line(cx, bottom + 42, cx + 6, bottom + 50)

    elif diagram == "chassis":
        c.setStrokeColor(accent)
        c.setLineWidth(4)
        c.roundRect(cx - 55, cy - 28, 110, 56, 10, fill=0, stroke=1)
        c.setFillColor(HexColor("#AAB9C8"))
        for wx in (cx - 62, cx + 50):
            c.roundRect(wx, cy - 23, 12, 20, 4, fill=1, stroke=0)
            c.roundRect(wx, cy + 3, 12, 20, 4, fill=1, stroke=0)
        c.setFillColor(accent)
        c.roundRect(cx - 27, cy - 16, 54, 32, 6, fill=1, stroke=0)

    elif diagram == "linkage":
        points = [(left, bottom + 5), (cx - 36, top - 4), (cx + 4, cy - 8), (cx + 42, top - 10), (right, bottom + 13)]
        c.setStrokeColor(accent)
        c.setLineWidth(6)
        for a, b in zip(points, points[1:]):
            c.line(a[0], a[1], b[0], b[1])
        c.setFillColor(white)
        for px, py in points:
            c.circle(px, py, 6, fill=1, stroke=1)

    elif diagram == "rackPinion":
        rack_y = cy - 23
        c.setStrokeColor(accent)
        c.setLineWidth(3)
        c.line(left, rack_y, right, rack_y)
        for px in range(int(left), int(right), 12):
            c.line(px, rack_y, px + 4, rack_y + 10)
            c.line(px + 4, rack_y + 10, px + 8, rack_y)
        c.setFillColor(white)
        c.circle(cx, cy + 16, 31, fill=1, stroke=1)
        c.setFillColor(accent)
        c.circle(cx, cy + 16, 5, fill=1, stroke=0)
        c.setStrokeColor(MINT)
        c.setLineWidth(3)
        c.line(cx + 44, rack_y - 10, right, rack_y - 10)
        c.line(right, rack_y - 10, right - 8, rack_y - 4)

    elif diagram == "beltDrive":
        x1, x2 = cx - 48, cx + 48
        r1, r2 = 22, 31
        c.setStrokeColor(accent)
        c.setLineWidth(3)
        c.circle(x1, cy, r1, fill=1, stroke=1)
        c.circle(x2, cy, r2, fill=1, stroke=1)
        c.setStrokeColor(CORAL)
        c.setLineWidth(5)
        c.line(x1, cy + r1, x2, cy + r2)
        c.line(x1, cy - r1, x2, cy - r2)
        c.setFillColor(accent)
        c.circle(x1, cy, 4, fill=1, stroke=0)
        c.circle(x2, cy, 5, fill=1, stroke=0)

    else:
        raise RuntimeError(f"Unsupported concept diagram: {diagram}")

    c.restoreState()


def draw_photo(c: canvas.Canvas, card: dict, x: float, y: float, w: float, h: float) -> None:
    path = ROOT / card.get("image", "")
    if not path.is_file():
        c.setFillColor(PAPER)
        c.roundRect(x + 12, y + 8, w - 24, h - 16, 12, fill=1, stroke=0)
        return
    image = ImageReader(str(path))
    iw, ih = image.getSize()
    scale = min((w - 22) / iw, (h - 16) / ih)
    dw, dh = iw * scale, ih * scale
    c.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh,
                preserveAspectRatio=True, mask="auto")


def draw_fold_card(c: canvas.Canvas, card: dict, x: float, y: float, w: float, h: float) -> None:
    accent = CATEGORY_COLORS.get(card["category"], BLUE)
    half = h / 2
    c.setFillColor(white)
    c.setStrokeColor(HexColor("#AAB9C8"))
    c.setLineWidth(.9)
    c.roundRect(x, y - h, w, h, 13, fill=1, stroke=1)
    c.setFillColor(accent)
    c.roundRect(x + 10, y - 26, 84, 17, 7, fill=1, stroke=0)
    c.setFillColor(white if card["category"] != "events" else NIGHT)
    c.setFont("CN-Bold", 7)
    c.drawCentredString(x + 52, y - 20, CATEGORY_LABELS.get(card["category"], card["category"]))
    c.setFillColor(NIGHT)
    c.setFont("CN-Bold", 9.5)
    c.drawRightString(x + w - 11, y - 19, card["title"][:34])

    visual_y = y - half + 44
    visual_h = half - 78
    if card["category"] in ("hardware", "elements"):
        draw_photo(c, card, x + 8, visual_y, w - 16, visual_h)
    elif card["category"] == "concepts":
        draw_concept_visual(c, card, x + 8, visual_y, w - 16, visual_h, accent)
    else:
        draw_block_visual(c, card, x + 8, visual_y, w - 16, visual_h, accent)
    c.setFillColor(NIGHT)
    text_block(c, card["chinese"], x + 13, y - half + 25, w - 26, size=10.2, leading=12,
               font="CN-Bold", color=NIGHT, max_lines=2)

    c.setStrokeColor(HexColor("#93A7BA"))
    c.setDash(3, 3)
    c.line(x + 3, y - half, x + w - 3, y - half)
    c.setDash()

    c.saveState()
    c.translate(x + w, y - half)
    c.rotate(180)
    c.setFillColor(PAPER)
    c.roundRect(4, 4, w - 8, half - 8, 10, fill=1, stroke=0)
    c.setFillColor(accent)
    c.setFont("CN-Bold", 8)
    c.drawString(13, half - 23, "这张卡怎么用")
    text_block(c, card.get("details", ""), 13, half - 40, w - 26, size=7.2, leading=9.2,
               color=INK, max_lines=7)
    if card.get("action"):
        c.setFillColor(accent)
        c.setFont("CN-Bold", 7.5)
        c.drawString(13, 46, "亲子复习动作")
        text_block(c, card["action"], 13, 34, w - 26, size=6.6, leading=8.2,
                   color=MUTED, max_lines=4)
    c.restoreState()


def draw_flashcard_pages(c: canvas.Canvas, cards: list[dict]) -> None:
    margin, gap = 32, 12
    card_w = (W - margin * 2 - gap) / 2
    card_h = 347
    for page_index in range(18):
        page_no = page_index + 2
        c.setFillColor(white)
        c.rect(0, 0, W, H, fill=1, stroke=0)
        c.setFillColor(NIGHT)
        c.roundRect(28, H - 67, W - 56, 39, 13, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("CN-Bold", 11)
        c.drawString(44, H - 51, f"45678 闪卡  {page_index + 1:02d} / 18")
        c.setFillColor(HexColor("#B8C9DB"))
        c.setFont("CN", 7.2)
        c.drawRightString(W - 44, H - 50, "剪外框 · 沿中线对折 · 背面已旋转")
        top = H - 78
        page_cards = cards[page_index * 4:(page_index + 1) * 4]
        for slot, card in enumerate(page_cards):
            row, col = divmod(slot, 2)
            draw_fold_card(c, card, margin + col * (card_w + gap), top - row * (card_h + 12), card_w, card_h)
        c.setFillColor(MUTED)
        c.setFont("CN", 6.8)
        c.drawCentredString(W / 2, 17, f"第 {page_no} / 26 页 · 所有硬件与结构件卡均限定为 45678 套装内项目")
        c.showPage()


def mission_card(c: canvas.Canvas, y: float, number: str, title: str, subtitle: str,
                 tags: list[tuple[str, object]], steps: list[tuple[str, str]], accent) -> None:
    x, width, height = 34, W - 68, 208
    bottom = y - height
    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.roundRect(x, bottom, width, height, 18, fill=1, stroke=1)
    c.setFillColor(accent)
    c.roundRect(x, bottom, 8, height, 4, fill=1, stroke=0)
    c.setFillColor(NIGHT)
    c.setFont("CN-Bold", 15)
    c.drawString(x + 22, y - 28, f"{number}  {title}")
    c.setFillColor(MUTED)
    c.setFont("CN", 8.5)
    c.drawRightString(x + width - 18, y - 27, subtitle)
    px = x + 22
    for tag, color in tags:
        px = pill(c, px, y - 43, tag, color)
    c.setStrokeColor(LINE)
    c.line(x + 22, y - 60, x + width - 18, y - 60)
    ty = y - 78
    for label, copy in steps:
        c.setFillColor(accent)
        c.setFont("CN-Bold", 9)
        c.drawString(x + 22, ty, label)
        ty = text_block(c, copy, x + 78, ty, width - 114, size=8.8, leading=12.4, color=INK, max_lines=3)
        ty -= 6


def draw_program_pages(c: canvas.Canvas) -> None:
    page_header(c, "PROGRAM MISSIONS 01", "六条编程任务 - 规划与验证", 20)
    mission_card(c, H - 102, "01", "网格寻宝", "旗舰 10 关", [("空间规划", BLUE), ("最短程序", MINT)], [
        ("怎么玩", "在 6×6 地图上组合前进、转向、后退、跳跃、推/拉、传送与取核心，让机器人从起点安全到达目标。"),
        ("挑战点", "第 1-3 关学习方向；第 4-7 关加入传送门、箱子与跳跃；第 8-10 关组合压力板、闸门和取核心。"),
        ("过关标准", "执行前先读任务提示。完成只代表 1 星；在指令预算内、接近最短程序，才能拿到 2-3 星。"),
    ], CYAN)
    mission_card(c, H - 320, "02", "抓娃娃机", "双拨盘推理", [("位移", BLUE), ("爪力", VIOLET)], [
        ("怎么玩", "先读三条材料观察，判断奖品是轻/中/重、柔软/坚硬；判断正确才解锁夹力盘。再设置移动圈数和 1-10 档爪力。"),
        ("挑战点", "参考尺只给轻 1-3、中 4-6、重 7-10 的规则；柔软易滑要加力，易碎物要保守。移动错误会抓空，力度错误会滑落或夹坏。"),
        ("过关标准", "先写下移动圈数和夹力理由，再正式执行。转拨盘不会提前显示落点；每次执行都记录尝试，失败后再根据结果 Debug。"),
    ], BLUE)
    mission_card(c, H - 538, "03", "口诀大师", "My Block 函数", [("找规律", GOLD), ("函数压缩", MINT)], [
        ("怎么玩", "扫描长动作路径，把重复的 2-5 个动作定义成 My Block，再用少量顶层积木调用这个函数。"),
        ("挑战点", "直接把整条路径拖到底层不算完成。必须真的创建函数，并遵守顶层积木预算；高级关包含多个重复片段。"),
        ("过关标准", "函数展开后的完整动作与目标路径一致，同时顶层程序足够短。运行后观察每一步，发现差异再修改。"),
    ], VIOLET)
    footer(c)
    c.showPage()

    page_header(c, "PROGRAM MISSIONS 02", "六条编程任务 - 资源与工程", 21)
    mission_card(c, H - 102, "04", "机关轨道", "12 / 16 / 20 格", [("资源约束", BLUE), ("链式执行", CORAL)], [
        ("怎么玩", "把有限的前进 2 格、前进 3 格、跳过断轨和后退积木放进轨道格。机器人落到一格才执行该格指令。"),
        ("挑战点", "断轨会坠落，空格会停机，错误回路会循环。高级关需要先冲过目标，再用后退返回，不能只一路向前。"),
        ("过关标准", "安全到达目标，并尽量少用积木。失败时依据停机位置检查是哪一格缺了指令或形成死循环。"),
    ], CORAL)
    mission_card(c, H - 320, "05", "流水线密码", "2-3 段 Repeat", [("周期识别", CYAN), ("精确覆盖", GOLD)], [
        ("怎么玩", "观察长传送带的红、蓝、黄包裹规律，把它拆成 2 或 3 段 Repeat。高级关还包含只执行一次的前置动作。"),
        ("挑战点", "每段循环体要有 2-4 个动作，重复次数要精确覆盖整条流水线。多一个或少一个包裹都不能运行。"),
        ("过关标准", "程序逐件匹配颜色并送入正确箱子。第一次全部正确 3 星；发现第 N 件错误后 Debug 再跑。"),
    ], CYAN)
    mission_card(c, H - 538, "06", "精准渡桥", "分段轮组与电量", [("乘除推理", VIOLET), ("工程取舍", MINT)], [
        ("怎么玩", "桥上有多个检查点。每一段分别选择精确轮、动力轮或越野轮，再设置圈数，让机器人恰好停在检查点。"),
        ("挑战点", "不同轮组每圈步数和耗电不同。计划必须在电池预算内，换轮次数也有限；偏短、越界或耗电过高都会失败。"),
        ("过关标准", "每段都精准停靠并抵达终点。比较不同方案的电量与换轮次数，不只算出一个乘除法答案。"),
    ], MINT)
    footer(c)
    c.showPage()


def command_card(c: canvas.Canvas, x: float, y: float, w: float, h: float,
                 category: str, title: str, zh: str, accent, symbol: str) -> None:
    c.setFillColor(white)
    c.setStrokeColor(accent)
    c.setLineWidth(1.5)
    c.roundRect(x, y - h, w, h, 10, fill=1, stroke=1)
    c.setFillColor(PAPER)
    c.roundRect(x + 1, y - 28, w - 2, 27, 9, fill=1, stroke=0)
    c.setFillColor(accent)
    c.setFont("CN-Bold", 7.5)
    c.drawString(x + 12, y - 18, category.upper())
    c.setFont("CN-Bold", 26)
    c.drawRightString(x + w - 12, y - 20, symbol)
    c.setFillColor(NIGHT)
    c.setFont("CN-Bold", 13)
    text_block(c, title, x + 12, y - 58, w - 24, size=13, leading=16, font="CN-Bold", max_lines=2)
    c.setStrokeColor(LINE)
    c.line(x + 12, y - h + 34, x + w - 12, y - h + 34)
    c.setFillColor(MUTED)
    c.setFont("CN", 8)
    text_block(c, zh, x + 12, y - h + 23, w - 24, size=8, leading=10, max_lines=2)
    c.setStrokeColor(HexColor("#AAB6C4"))
    c.setDash(2, 2)
    c.line(x - 3, y - h - 5, x + w + 3, y - h - 5)
    c.setDash()


def draw_command_page(c: canvas.Canvas, page_no: int, title: str,
                      cards: list[tuple[str, str, str, object, str]]) -> None:
    page_header(c, "CUT-OUT COMMAND CARDS", title, page_no)
    margin, gap = 34, 12
    cw = (W - margin * 2 - gap * 2) / 3
    ch = 205
    top = H - 106
    for i, card in enumerate(cards):
        row, col = divmod(i, 3)
        command_card(c, margin + col * (cw + gap), top - row * (ch + 14), cw, ch, *card)
    footer(c, "沿虚线裁剪 - 先在桌面排列 - 再由真人机器人执行")
    c.showPage()


def draw_grid_page(c: canvas.Canvas) -> None:
    page_header(c, "PRINTABLE MISSION BOARD", "6×6 网格寻宝规划盘", 24)
    gx, gy, size = 82, 244, 432
    cell = size / 6
    c.setFillColor(white)
    c.setStrokeColor(NIGHT)
    c.setLineWidth(1.5)
    c.rect(gx, gy, size, size, fill=1, stroke=1)
    c.setStrokeColor(HexColor("#96A7BA"))
    c.setLineWidth(.8)
    for i in range(1, 6):
        c.line(gx + i * cell, gy, gx + i * cell, gy + size)
        c.line(gx, gy + i * cell, gx + size, gy + i * cell)
    c.setFillColor(MUTED)
    c.setFont("CN", 7)
    for i in range(6):
        c.drawCentredString(gx + cell * (i + .5), gy - 12, str(i + 1))
        c.drawRightString(gx - 8, gy + cell * (5.5 - i) - 2, chr(65 + i))

    items = [
        ("起点", CORAL, "S"), ("核心", BLUE, "C"), ("障碍", NIGHT, "X"),
        ("箱子", GOLD, "B"), ("传送门", VIOLET, "P"), ("压力板", MINT, "T"),
    ]
    x = 53
    for label, color, code in items:
        c.setFillColor(color)
        c.roundRect(x, 205, 22, 22, 6, fill=1, stroke=0)
        c.setFillColor(white if color != GOLD else NIGHT)
        c.setFont("CN-Bold", 8)
        c.drawCentredString(x + 11, 212, code)
        c.setFillColor(INK)
        c.setFont("CN-Bold", 8)
        c.drawString(x + 27, 212, label)
        x += 85

    c.setFillColor(PAPER)
    c.setStrokeColor(LINE)
    c.roundRect(34, 55, W - 68, 126, 14, fill=1, stroke=1)
    c.setFillColor(NIGHT)
    c.setFont("CN-Bold", 11)
    c.drawString(50, 158, "程序草稿 / PROGRAM PLAN")
    c.setFont("CN", 8)
    c.setFillColor(MUTED)
    c.drawRightString(W - 50, 158, "预算 ____ 步   实际 ____ 步   星级 ____")
    for row in range(4):
        y = 134 - row * 22
        for col in range(4):
            n = row * 4 + col + 1
            x = 50 + col * 130
            c.setFillColor(MUTED)
            c.setFont("CN", 7)
            c.drawString(x, y, f"{n:02d}")
            c.setStrokeColor(HexColor("#A7B5C5"))
            c.line(x + 15, y - 1, x + 110, y - 1)
    footer(c)
    c.showPage()


def family_card(c: canvas.Canvas, x: float, y: float, w: float, h: float,
                number: str, title: str, meta: str, rule: str, alt: str, accent) -> None:
    c.setFillColor(white)
    c.setStrokeColor(LINE)
    c.roundRect(x, y - h, w, h, 14, fill=1, stroke=1)
    c.setFillColor(accent)
    c.roundRect(x + 12, y - 31, 31, 22, 8, fill=1, stroke=0)
    c.setFillColor(white if accent != GOLD else NIGHT)
    c.setFont("CN-Bold", 8)
    c.drawCentredString(x + 27.5, y - 24, number)
    c.setFillColor(NIGHT)
    c.setFont("CN-Bold", 13)
    c.drawString(x + 51, y - 25, title)
    c.setFillColor(MUTED)
    c.setFont("CN", 7.5)
    c.drawString(x + 14, y - 48, meta)
    c.setStrokeColor(LINE)
    c.line(x + 14, y - 58, x + w - 14, y - 58)
    c.setFillColor(accent)
    c.setFont("CN-Bold", 8)
    c.drawString(x + 14, y - 75, "主持规则")
    text_block(c, rule, x + 14, y - 89, w - 28, size=8.1, leading=11.2, max_lines=5)
    c.setFillColor(MINT)
    c.setFont("CN-Bold", 8)
    c.drawString(x + 14, y - h + 37, "坐姿 / 低冲击替代")
    text_block(c, alt, x + 14, y - h + 23, w - 28, size=7.8, leading=10, max_lines=2)


def draw_family_guide(c: canvas.Canvas) -> None:
    page_header(c, "FAMILY MISSION CONTROL", "六个家庭游戏 - 主持卡", 25)
    c.setFillColor(HexColor("#EAF8F5"))
    c.setStrokeColor(HexColor("#A6DACB"))
    c.roundRect(34, H - 132, W - 68, 38, 12, fill=1, stroke=1)
    text_block(c, "成人先清空平坦区域，穿防滑鞋；不得闭眼移动。任何疼痛、眩晕或不适立即停止。所有游戏都可坐着完成。",
               48, H - 111, W - 96, size=8.6, leading=12, font="CN-Bold", color=HexColor("#146047"), max_lines=2)
    cards = [
        ("01", "人体机器人", "2 人 | 6+ | 5-8 分钟", "描述者只能说动作，执行者按顺序完成；两人一起核对，不以速度取胜。", "改用手臂、手指或桌面玩偶执行。", CYAN),
        ("02", "客厅寻宝", "2-3 人 | 7+ | 8-12 分钟", "在地垫安全网格内设起点、宝藏和方向。先逐步模拟，再由真人机器人慢速执行。", "用棋子在桌面网格移动。", BLUE),
        ("03", "节奏程序", "2+ 人 | 6+ | 5-8 分钟", "跟随 4 个动作循环完成 4 轮；错一拍就停在当前轮 Debug，不使用惩罚。", "只拍手、点桌或手指画圈。", VIOLET),
        ("04", "口令宏", "2+ 人 | 7+ | 6-10 分钟", "先记住 2 个宏，再听宏名和单动作执行。判定后才展开宏内容用于 Debug。", "全部动作改成手势或积木移动。", GOLD),
        ("05", "如果就", "2+ 人 | 6+ | 5-8 分钟", "主持人发出条件信号；玩家只在条件满足时动作。失误时重试当前信号，不自罚。", "用彩卡举起/放下替代身体动作。", CORAL),
        ("06", "人体传送带", "3+ 人 | 7+ | 8-12 分钟", "按颜色规律把物品传到正确区域；先说 Repeat 规则，再开始一轮。", "坐成一排传递软积木。", MINT),
    ]
    margin, gap = 34, 12
    cw = (W - margin * 2 - gap) / 2
    ch = 205
    top = H - 148
    for i, card in enumerate(cards):
        row, col = divmod(i, 2)
        family_card(c, margin + col * (cw + gap), top - row * (ch + 12), cw, ch, *card)
    footer(c, "完成一轮不等于掌握；优先记录孩子如何发现和修改 Bug")
    c.showPage()


def draw_parent_guide(c: canvas.Canvas) -> None:
    page_header(c, "PARENT FIELD GUIDE", "安全、反馈与长期使用", 26)
    sections = [
        ("01  开始前 60 秒", [
            "清空约 2×2 米平坦区域；移走尖角、线缆和易碎物。",
            "选择站姿或坐姿。不得闭眼移动、快速晃头、向后跳或负重支撑。",
            "只设一个今天目标：学会一种指令、完成一关或修正一个 Bug。",
        ], CYAN),
        ("02  每轮主持循环", [
            "PLAN：孩子先说计划，成人只确认规则和安全。",
            "RUN：一次只运行一小段；成人描述看到的事实，不直接报答案。",
            "DEBUG：找到第一处与目标不一致的位置，改一处后再运行。",
            "REVIEW：问孩子‘你改了什么，为什么？’再决定是否继续。",
        ], BLUE),
        ("03  支架式提问", [
            "不要说：‘这里错了，应该左转。’",
            "可以问：‘机器人现在面向哪里？下一张卡会把它带到哪？’",
            "不要说：‘再快一点。’ 可以说：‘先把顺序排好，再一起按运行。’",
            "如果累了，可暂停或换成坐姿；完成关卡不是必须达到的结果。",
        ], VIOLET),
        ("04  家庭验收清单", [
            "孩子能指出起点、目标、限制和运行按钮。",
            "失败时页面说明发生了什么，并允许从当前问题继续。",
            "刷新后不会丢失已完成记录；打卡只能在真实成功后使用。",
            "iPad 横竖屏都能读清文字，按钮足够大，不需要精确点小目标。",
        ], MINT),
    ]
    y = H - 104
    for title, bullets, accent in sections:
        height = 126 if len(bullets) == 3 else 145
        c.setFillColor(white)
        c.setStrokeColor(LINE)
        c.roundRect(34, y - height, W - 68, height, 15, fill=1, stroke=1)
        c.setFillColor(accent)
        c.roundRect(47, y - 31, 188, 23, 9, fill=1, stroke=0)
        c.setFillColor(white if accent != GOLD else NIGHT)
        c.setFont("CN-Bold", 10)
        c.drawString(58, y - 24, title)
        by = y - 53
        for item in bullets:
            c.setFillColor(accent)
            c.circle(54, by + 3, 2.4, fill=1, stroke=0)
            by = text_block(c, item, 64, by + 6, W - 116, size=8.8, leading=12.2, max_lines=2) - 5
        y -= height + 12

    c.setFillColor(HexColor("#FFF5D6"))
    c.setStrokeColor(HexColor("#E3C45B"))
    c.roundRect(34, 48, W - 68, 70, 14, fill=1, stroke=1)
    c.setFillColor(HexColor("#6A5311"))
    c.setFont("CN-Bold", 9)
    c.drawString(49, 98, "使用边界")
    text_block(c, "本材料是家庭教育与互动游戏，不用于诊断、治疗或衡量孩子的能力，也不保证改善任何医学、学习或行为结果。若孩子持续遇到困难，请向合格的医疗或教育专业人员求助。",
               49, 82, W - 98, size=8.2, leading=11.5, color=HexColor("#6A5311"), max_lines=4)
    footer(c, "短时、低压力、可停止；把 Debug 当作方法，不把错误贴在孩子身上")
    c.showPage()


def build_full_pdf(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    c.setTitle("LEGO SPIKE Prime 编程闪卡与家庭互动游戏")
    c.setSubject("72 张 45678 闪卡、亲子三卡场景挑战与家庭编程任务")
    draw_cover(c)
    draw_flashcard_pages(c, load_cards())
    draw_program_pages(c)
    draw_command_page(c, 22, "实体指令卡 - 移动与机关", [
        ("MOVEMENT", "前进 1 格", "Move Forward 1", BLUE, "↑"),
        ("MOVEMENT", "后退 1 格", "Move Backward 1", CORAL, "↓"),
        ("MOVEMENT", "左转 90°", "Turn Left", CYAN, "↶"),
        ("MOVEMENT", "右转 90°", "Turn Right", VIOLET, "↷"),
        ("ACTION", "跳过 1 格", "Jump", GOLD, "⌃"),
        ("ACTION", "推动箱子", "Push", CORAL, "+"),
        ("ACTION", "拉回箱子", "Pull", BLUE, "-"),
        ("ACTION", "取回核心", "Grab Core", MINT, "◇"),
        ("ACTION", "踩压力板", "Activate Switch", VIOLET, "●"),
    ])
    draw_command_page(c, 23, "实体指令卡 - 程序结构", [
        ("CONTROL", "运行", "Run Program", MINT, "▶"),
        ("CONTROL", "暂停检查", "Pause and Check", GOLD, "Ⅱ"),
        ("CONTROL", "重复 ____ 次", "Repeat", VIOLET, "↻"),
        ("MY BLOCK", "定义函数", "Define My Block", CYAN, "{}"),
        ("MY BLOCK", "调用函数", "Call My Block", BLUE, "()"),
        ("LOGIC", "如果…就…", "If ... Then ...", CORAL, "?"),
        ("SORT", "装红箱", "Sort Red", CORAL, "R"),
        ("SORT", "装蓝箱", "Sort Blue", BLUE, "B"),
        ("SORT", "装黄箱", "Sort Yellow", GOLD, "Y"),
    ])
    draw_grid_page(c)
    draw_family_guide(c)
    draw_parent_guide(c)
    c.save()


SAFETY_REPLACEMENTS = {
    # PDF page -> [(card slot 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right, copy)]
    4: [(1, "坐着把纸片机器人沿桌面直线匀速移动 1 秒，默念 1001 后立即停在格线上。")],
    5: [(3, "坐在椅子上把手掌当机器人，缓慢向前移动；成人把另一只手放在前方约 15 厘米处，碰到前立刻停下并转向。")],
    6: [
        (1, "把纸箭头在桌面顺时针转 90 度，停在直角标记上；不用转动身体。"),
        (2, "用手指在桌面画出笑脸，或做一个自然笑脸并保持 3 秒；不用夸张表情，也不评价情绪好坏。"),
    ],
    8: [(0, "坐姿把手掌当机器人向前滑；成人把手横放在桌面前方，检测到障碍时停下并向右移动，不做后跳。")],
    9: [(3, "家长举起云朵卡就把纸伞放到小模型上；没有云朵卡就保持原位。只按条件信号操作。")],
    10: [(0, "家长说‘天亮’，孩子举起黄色卡；说‘天黑’，孩子放下卡。只按条件信号动作，不需要闭眼。")],
    12: [(2, "把两根冰棒棍并排放在桌面，保持平直 3 秒，观察长梁如何承载；不用身体僵直站立。")],
    16: [(3, "在桌面转动两个纸齿轮或瓶盖，观察直角传动；不要交叉、反扭或用力掰手指。")],
    19: [(0, "坐在桌前用硬纸板托住几块积木，保持平稳 5 秒，模拟底盘承载；不做负重或平板支撑。")],
}


def draw_rotated_replacement(c: canvas.Canvas, slot: int, copy: str) -> None:
    left = 33 if slot % 2 == 0 else 317
    bottom = 512 if slot < 2 else 135
    width, height = 245, 65
    c.setFillColor(HexColor("#F1F1F1"))
    c.roundRect(left, bottom, width, height, 8, fill=1, stroke=0)
    c.saveState()
    c.translate(left + width, bottom + height)
    c.rotate(180)
    c.setFillColor(INK)
    c.setFont("CN-Bold", 8.4)
    lines = wrap_lines(copy, width - 22, "CN-Bold", 8.4)[:4]
    y = 14
    for line in reversed(lines):
        c.drawCentredString(width / 2, y, line)
        y += 11.2
    c.restoreState()


def build_safety_overlays(path: Path) -> None:
    c = canvas.Canvas(str(path), pagesize=A4, pageCompression=1)
    for page_number in range(1, 20):
        if page_number in SAFETY_REPLACEMENTS:
            for slot, copy in SAFETY_REPLACEMENTS[page_number]:
                draw_rotated_replacement(c, slot, copy)
        c.showPage()
    c.save()


def merge_pdf(appendix_path: Path, overlay_path: Path) -> None:
    source = PdfReader(str(PDF_PATH))
    if len(source.pages) != 26:
        raise RuntimeError(f"Expected 26-page source PDF, found {len(source.pages)}")
    appendix = PdfReader(str(appendix_path))
    if len(appendix.pages) != 7:
        raise RuntimeError(f"Expected 7-page appendix, found {len(appendix.pages)}")
    overlays = PdfReader(str(overlay_path))
    if len(overlays.pages) != 19:
        raise RuntimeError(f"Expected 19 safety overlays, found {len(overlays.pages)}")
    writer = PdfWriter()
    writer.add_metadata({
        "/Title": "LEGO SPIKE Prime 编程闪卡与家庭互动游戏",
        "/Subject": "家庭编程游戏、实体任务卡与 26 页打印包",
        "/Creator": "SPIKE Prime Family Mission Control",
    })
    for index, page in enumerate(source.pages[:19]):
        if index + 1 in SAFETY_REPLACEMENTS:
            page.merge_page(overlays.pages[index])
        writer.add_page(page)
    for page in appendix.pages:
        writer.add_page(page)
    temp_output = PDF_PATH.with_suffix(".new.pdf")
    with temp_output.open("wb") as handle:
        writer.write(handle)
    check = PdfReader(str(temp_output))
    if len(check.pages) != 26:
        raise RuntimeError("Merged PDF failed the 26-page invariant")
    temp_output.replace(PDF_PATH)


def main() -> None:
    # Keep this legacy entrypoint safe: the public PDF must preserve the
    # original SPIKE Word/Work Block artwork. The full ReportLab document is
    # now only an internal corrected-page source for the hybrid builder.
    subprocess.run(
        [sys.executable, str(ROOT / "scripts/rebuild-print-with-original-blocks.py")],
        check=True,
    )


if __name__ == "__main__":
    main()
