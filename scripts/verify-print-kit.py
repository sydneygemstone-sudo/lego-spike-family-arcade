#!/usr/bin/env python3
"""Structural/content gate for the 26-page printable family kit."""

from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "assets/pdf/Lego_Spike_Prime_Flashcards_And_Games.pdf"
reader = PdfReader(str(PDF))

assert len(reader.pages) == 26, f"expected 26 pages, got {len(reader.pages)}"
assert not reader.is_encrypted, "print kit must not be encrypted"

for index, page in enumerate(reader.pages, start=1):
    width = float(page.mediabox.width)
    height = float(page.mediabox.height)
    assert abs(width - 594.96) < 1 and abs(height - 841.92) < 1, (
        f"page {index} is not A4: {width} x {height}"
    )

appendix_text = "\n".join((page.extract_text() or "") for page in reader.pages[19:])
flashcard_text = "\n".join((page.extract_text() or "") for page in reader.pages[:19])
for required in (
    "网格寻宝", "抓娃娃机", "口诀大师", "机关轨道", "流水线密码", "精准渡桥",
    "人体机器人", "客厅寻宝", "节奏程序", "口令宏", "如果就", "人体传送带",
    "6×6", "不得闭眼移动", "不用于诊断、治疗", "每次执行都记录尝试",
):
    assert required in appendix_text, f"appendix missing required promise: {required}"

for stale in ("5×5 网格", "模拟 5 牛顿", "闭上眼睛", "预演"):
    assert stale not in appendix_text, f"appendix still contains stale/unsafe copy: {stale}"

for required in (
    "72 张可折叠闪卡", "家长读一段生活化任务", "45678 硬件", "45678 结构件",
    "大号 Hub 专用充电电池", "Micro USB 连接与充电线", "带十字孔导线夹",
    "带十字轴孔的 2×4 积木", "大号多孔底板",
    "Gearbox", "Gear Ratio", "Lever System", "Fulcrum", "Structural Rigidity",
    "Friction Control", "Center of Gravity", "Robotic Chassis", "Linkage Mechanism",
    "Rack and Pinion", "Belt Drive",
):
    assert required in flashcard_text, f"flashcard pages missing current catalog promise: {required}"

for removed in (
    "Built-in Gyro Sensor", "Bluetooth Wireless", "5x5 LED Matrix", "Worm Gear",
    "Turntable", "Universal Joint", "Clutch Gear", "Ball Caster Wheel", "Worm Drive", "Mechanical Clutch",
):
    assert removed not in flashcard_text, f"print kit still contains non-45678 or pseudo card: {removed}"

print("PASS 26-page A4 print kit + 72-card 45678 catalog + current game/safety promises")
