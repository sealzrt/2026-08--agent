#!/usr/bin/env python3
"""Generate deterministic tutorial diagrams.

The original raster diagrams contained AI-rendered pseudo text in several
places. This script keeps all text native and reproducible by drawing the
diagrams with Pillow and a local Chinese font.
"""

from __future__ import annotations

import math
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "images"
BASE_DIR = OUT_DIR / "base"
W, H = 1792, 1024

COLORS = {
    "bg": "#F7FAFC",
    "ink": "#1F2937",
    "muted": "#64748B",
    "line": "#CBD5E1",
    "blue": "#2196F3",
    "green": "#4CAF50",
    "red": "#F44336",
    "orange": "#FF9800",
    "purple": "#9C27B0",
    "cyan": "#00ACC1",
    "yellow": "#FBC02D",
    "slate": "#475569",
    "panel": "#FFFFFF",
}


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/STHeiti Medium.ttc" if bold else "/System/Library/Fonts/STHeiti Light.ttc",
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size=size)
    return ImageFont.load_default()


F = {
    "title": font(58, True),
    "subtitle": font(34, False),
    "hero": font(48, True),
    "h1": font(42, True),
    "h2": font(32, True),
    "body": font(28, False),
    "small": font(22, False),
    "tiny": font(18, False),
    "mono": font(24, False),
}


class Canvas:
    def __init__(self, title: str, subtitle: str | None = None) -> None:
        self.im = Image.new("RGB", (W, H), COLORS["bg"])
        self.d = ImageDraw.Draw(self.im)
        self.title(title, subtitle)

    def save(self, name: str) -> None:
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        self.im.save(OUT_DIR / name, quality=95)

    def title(self, text: str, subtitle: str | None = None) -> None:
        self.text((W / 2, 58), text, F["title"], COLORS["ink"], anchor="mt")
        if subtitle:
            self.text((W / 2, 126), subtitle, F["subtitle"], COLORS["muted"], anchor="mt")

    def text(
        self,
        xy: tuple[float, float],
        text: str,
        fnt: ImageFont.FreeTypeFont,
        fill: str = COLORS["ink"],
        anchor: str = "la",
        align: str = "center",
    ) -> None:
        self.d.multiline_text(xy, text, font=fnt, fill=fill, anchor=anchor, align=align, spacing=8)

    def wrapped(
        self,
        box: tuple[int, int, int, int],
        text: str,
        fnt: ImageFont.FreeTypeFont,
        fill: str = COLORS["ink"],
        max_chars: int = 16,
        anchor: str = "mm",
        align: str = "center",
    ) -> None:
        x1, y1, x2, y2 = box
        lines: list[str] = []
        for part in text.split("\n"):
            if len(part) <= max_chars:
                lines.append(part)
            else:
                lines.extend(wrap(part, max_chars, break_long_words=False, replace_whitespace=False))
        self.text(((x1 + x2) / 2, (y1 + y2) / 2), "\n".join(lines), fnt, fill, anchor=anchor, align=align)

    def box(
        self,
        box: tuple[int, int, int, int],
        label: str,
        fill: str,
        outline: str | None = None,
        radius: int = 20,
        fnt: ImageFont.FreeTypeFont | None = None,
        text_fill: str = "white",
        max_chars: int = 16,
    ) -> None:
        outline = outline or darken(fill)
        self.d.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=4)
        self.wrapped(box, label, fnt or F["h2"], text_fill, max_chars=max_chars)

    def panel(
        self,
        box: tuple[int, int, int, int],
        title: str,
        body: list[str],
        color: str,
        icon: str | None = None,
    ) -> None:
        x1, y1, x2, y2 = box
        self.d.rounded_rectangle(box, radius=28, fill=COLORS["panel"], outline=COLORS["line"], width=3)
        self.d.rounded_rectangle((x1, y1, x2, y1 + 96), radius=28, fill=color)
        self.d.rectangle((x1, y1 + 60, x2, y1 + 96), fill=color)
        self.text((x1 + 34, y1 + 28), title, F["h1"], "white")
        if icon:
            self.text((x2 - 60, y1 + 24), icon, F["h1"], "white", anchor="ra")
        y = y1 + 136
        for item in body:
            self.text((x1 + 48, y), item, F["body"], COLORS["ink"])
            y += 52

    def arrow(
        self,
        start: tuple[int, int],
        end: tuple[int, int],
        color: str = COLORS["slate"],
        width: int = 6,
    ) -> None:
        self.d.line((start, end), fill=color, width=width)
        angle = math.atan2(end[1] - start[1], end[0] - start[0])
        size = 22
        pts = [
            end,
            (end[0] - size * math.cos(angle - math.pi / 6), end[1] - size * math.sin(angle - math.pi / 6)),
            (end[0] - size * math.cos(angle + math.pi / 6), end[1] - size * math.sin(angle + math.pi / 6)),
        ]
        self.d.polygon(pts, fill=color)

    def diamond(self, center: tuple[int, int], size: tuple[int, int], label: str) -> tuple[int, int, int, int]:
        cx, cy = center
        w, h = size
        pts = [(cx, cy - h // 2), (cx + w // 2, cy), (cx, cy + h // 2), (cx - w // 2, cy)]
        self.d.polygon(pts, fill="white", outline=COLORS["slate"])
        self.d.line(pts + [pts[0]], fill=COLORS["slate"], width=4)
        self.wrapped((cx - w // 2 + 16, cy - h // 2 + 16, cx + w // 2 - 16, cy + h // 2 - 16), label, F["body"], max_chars=14)
        return (cx - w // 2, cy - h // 2, cx + w // 2, cy + h // 2)


def darken(hex_color: str, factor: float = 0.82) -> str:
    h = hex_color.lstrip("#")
    r, g, b = [int(h[i : i + 2], 16) for i in (0, 2, 4)]
    return f"#{int(r*factor):02x}{int(g*factor):02x}{int(b*factor):02x}"


def lighten(hex_color: str, factor: float = 1.18) -> str:
    h = hex_color.lstrip("#")
    r, g, b = [int(h[i : i + 2], 16) for i in (0, 2, 4)]
    return f"#{min(int(r*factor), 255):02x}{min(int(g*factor), 255):02x}{min(int(b*factor), 255):02x}"


def shadow(c: Canvas, box: tuple[int, int, int, int], radius: int = 24, offset: tuple[int, int] = (12, 14)) -> None:
    x1, y1, x2, y2 = box
    overlay = Image.new("RGBA", c.im.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rounded_rectangle(
        (x1 + offset[0], y1 + offset[1], x2 + offset[0], y2 + offset[1]),
        radius=radius,
        fill=(15, 23, 42, 32),
    )
    c.im.paste(Image.alpha_composite(c.im.convert("RGBA"), overlay).convert("RGB"))
    c.d = ImageDraw.Draw(c.im)


def gradient_round_rect(
    c: Canvas,
    box: tuple[int, int, int, int],
    top: str,
    bottom: str,
    radius: int,
    outline: str,
    width: int = 5,
) -> None:
    x1, y1, x2, y2 = box
    grad = Image.new("RGB", (x2 - x1, y2 - y1), top)
    gd = ImageDraw.Draw(grad)
    tr, tg, tb = [int(top.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4)]
    br, bg, bb = [int(bottom.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4)]
    for y in range(y2 - y1):
        t = y / max(y2 - y1 - 1, 1)
        color = (int(tr + (br - tr) * t), int(tg + (bg - tg) * t), int(tb + (bb - tb) * t))
        gd.line((0, y, x2 - x1, y), fill=color)
    mask = Image.new("L", (x2 - x1, y2 - y1), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, x2 - x1 - 1, y2 - y1 - 1), radius=radius, fill=255)
    c.im.paste(grad, (x1, y1), mask)
    c.d = ImageDraw.Draw(c.im)
    c.d.rounded_rectangle(box, radius=radius, outline=outline, width=width)


def draw_brain(c: Canvas, cx: int, cy: int, scale: float = 1.0) -> None:
    outline = "#155E8A"
    fill = "#4FC3F7"
    dark = "#1D74A6"
    c.d.ellipse(
        (
            int(cx - 175 * scale),
            int(cy + 95 * scale),
            int(cx + 180 * scale),
            int(cy + 145 * scale),
        ),
        fill="#D9DEE5",
    )
    lobes = [
        (-120, -45, 150, 120),
        (-50, -85, 165, 125),
        (55, -70, 155, 115),
        (-145, 15, 155, 110),
        (-40, 45, 175, 115),
    ]
    for dx, dy, w, h in lobes:
        box = (
            int(cx + (dx - w / 2) * scale),
            int(cy + (dy - h / 2) * scale),
            int(cx + (dx + w / 2) * scale),
            int(cy + (dy + h / 2) * scale),
        )
        c.d.ellipse(box, fill=fill, outline=outline, width=max(3, int(5 * scale)))
    stem = [(cx + 78 * scale, cy + 110 * scale), (cx + 118 * scale, cy + 205 * scale), (cx + 70 * scale, cy + 205 * scale), (cx + 35 * scale, cy + 122 * scale)]
    c.d.polygon([(int(x), int(y)) for x, y in stem], fill=fill, outline=outline)
    c.d.line([(int(cx - 150 * scale), int(cy + 15 * scale)), (int(cx - 60 * scale), int(cy - 20 * scale)), (int(cx - 10 * scale), int(cy + 30 * scale))], fill=dark, width=max(3, int(6 * scale)), joint="curve")
    c.d.line([(int(cx - 50 * scale), int(cy - 70 * scale)), (int(cx - 20 * scale), int(cy - 15 * scale)), (int(cx + 50 * scale), int(cy - 55 * scale)), (int(cx + 120 * scale), int(cy - 10 * scale))], fill=dark, width=max(3, int(6 * scale)), joint="curve")
    c.d.line([(int(cx - 110 * scale), int(cy + 70 * scale)), (int(cx - 20 * scale), int(cy + 75 * scale)), (int(cx + 70 * scale), int(cy + 45 * scale)), (int(cx + 145 * scale), int(cy + 70 * scale))], fill=dark, width=max(3, int(6 * scale)), joint="curve")
    c.d.arc((int(cx - 170 * scale), int(cy - 90 * scale), int(cx - 35 * scale), int(cy + 40 * scale)), 210, 330, fill=dark, width=max(3, int(6 * scale)))
    c.d.arc((int(cx + 15 * scale), int(cy - 95 * scale), int(cx + 160 * scale), int(cy + 35 * scale)), 200, 345, fill=dark, width=max(3, int(6 * scale)))


def draw_wrench(c: Canvas, cx: int, cy: int, color: str) -> None:
    c.d.line((cx - 30, cy + 34, cx + 32, cy - 28), fill=color, width=12)
    c.d.ellipse((cx - 48, cy + 22, cx - 20, cy + 50), outline=color, width=8)
    c.d.arc((cx + 10, cy - 60, cx + 66, cy - 4), 45, 300, fill=color, width=10)


def draw_book(c: Canvas, cx: int, cy: int, color: str) -> None:
    c.d.rounded_rectangle((cx - 62, cy - 50, cx - 4, cy + 50), radius=10, fill="#DFF3FF", outline=color, width=5)
    c.d.rounded_rectangle((cx + 4, cy - 50, cx + 62, cy + 50), radius=10, fill="#DFF3FF", outline=color, width=5)
    c.d.line((cx, cy - 48, cx, cy + 52), fill=color, width=5)
    c.d.arc((cx - 60, cy + 20, cx - 4, cy + 72), 205, 335, fill=color, width=4)
    c.d.arc((cx + 4, cy + 20, cx + 60, cy + 72), 205, 335, fill=color, width=4)


def draw_eye(c: Canvas, cx: int, cy: int, color: str) -> None:
    c.d.ellipse((cx - 70, cy - 38, cx + 70, cy + 38), fill="#E0F7FA", outline=color, width=5)
    c.d.ellipse((cx - 28, cy - 28, cx + 28, cy + 28), fill="#38BDF8", outline=color, width=4)
    c.d.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill="#0F172A")
    c.d.ellipse((cx + 5, cy - 17, cx + 16, cy - 6), fill="white")


def draw_plug(c: Canvas, cx: int, cy: int, color: str) -> None:
    c.d.line((cx - 36, cy + 48, cx + 22, cy - 10), fill=color, width=12)
    c.d.rounded_rectangle((cx + 8, cy - 34, cx + 48, cy + 10), radius=8, fill="#E2E8F0", outline=color, width=5)
    c.d.line((cx + 36, cy - 46, cx + 52, cy - 30), fill=color, width=7)
    c.d.line((cx + 52, cy - 30, cx + 66, cy - 44), fill=color, width=7)


def draw_shield(c: Canvas, cx: int, cy: int, color: str) -> None:
    pts = [(cx, cy - 62), (cx + 58, cy - 36), (cx + 48, cy + 42), (cx, cy + 72), (cx - 48, cy + 42), (cx - 58, cy - 36)]
    c.d.polygon(pts, fill="#D1FAE5", outline=color)
    c.d.line(pts + [pts[0]], fill=color, width=6)
    c.d.line((cx, cy - 42, cx, cy + 46), fill=color, width=5)


def draw_toolbox(c: Canvas, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = box
    cx_box = (x1 + x2) // 2
    shadow(c, box, 34, (14, 18))
    c.d.rounded_rectangle((cx_box - 95, y1 - 78, cx_box + 95, y1 + 28), radius=30, fill="#E5E7EB", outline="#4B5563", width=12)
    c.d.rounded_rectangle((cx_box - 50, y1 - 40, cx_box + 50, y1 + 28), radius=16, fill=COLORS["bg"])
    gradient_round_rect(c, box, "#FFB74D", "#FB8C00", 34, "#C65F00", 8)
    c.d.rounded_rectangle((x1 - 10, y1, x2 + 10, y1 + 92), radius=26, fill="#FFA726", outline="#D96C00", width=8)
    c.d.rectangle((x1 + 8, y1 + 72, x2 - 8, y1 + 105), fill="#EF7D12")
    c.d.rounded_rectangle((x1 + 96, y1 - 24, x1 + 150, y1 + 24), radius=18, fill="#FB8C00", outline="#D96C00", width=5)
    c.d.rounded_rectangle((x2 - 150, y1 - 24, x2 - 96, y1 + 24), radius=18, fill="#FB8C00", outline="#D96C00", width=5)

    items = [
        ("工具", "Tools", draw_wrench, "#475569", x1 + 150, y1 + 180),
        ("知识", "Knowledge", draw_book, "#1D74A6", x1 + 330, y1 + 175),
        ("观察", "Observation", draw_eye, "#1D74A6", x1 + 520, y1 + 175),
        ("行动接口", "Action", draw_plug, "#475569", x1 + 220, y1 + 325),
        ("权限边界", "Permission", draw_shield, "#15803D", x1 + 470, y1 + 325),
    ]
    for zh, en, icon, color, cx, cy in items:
        icon(c, cx, cy - 42, color)
        c.text((cx, cy + 42), en, F["small"], COLORS["ink"], anchor="mm")
        c.text((cx, cy + 74), zh, F["small"], COLORS["ink"], anchor="mm")


def flow(name: str, title: str, steps: list[tuple[str, str]], subtitle: str | None = None) -> None:
    c = Canvas(title, subtitle)
    y = 410
    n = len(steps)
    gap = 38
    bw = min(280, int((W - 220 - gap * (n - 1)) / n))
    x = (W - (bw * n + gap * (n - 1))) // 2
    for i, (label, color) in enumerate(steps):
        box = (x + i * (bw + gap), y, x + i * (bw + gap) + bw, y + 150)
        c.box(box, label, color, fnt=F["body"], max_chars=10)
        if i < n - 1:
            c.arrow((box[2] + 8, y + 75), (box[2] + gap - 8, y + 75))
    c.save(name)


def ch01_overview() -> None:
    base = BASE_DIR / "ch01-harness-overview-base.png"
    c = Canvas("Agent = Model + Harness", "模型负责思考，Harness 负责把思考变成行动")
    if base.exists():
        art = Image.open(base).convert("RGB")
        art.thumbnail((1660, 720), Image.LANCZOS)
        c.im.paste(art, ((W - art.width) // 2, 240))
        c.d = ImageDraw.Draw(c.im)
    else:
        c.text((300, 235), "Model / 模型", F["hero"], COLORS["ink"], anchor="mm")
        draw_brain(c, 300, 525, 0.98)
        c.text((595, 525), "+", font(92, True), COLORS["ink"], anchor="mm")
        c.text((955, 215), "Harness / 运行框架", F["hero"], COLORS["ink"], anchor="mm")
        draw_toolbox(c, (650, 350, 1260, 790))
        c.arrow((1290, 540), (1425, 540), COLORS["slate"], width=14)

    c.text((300, 225), "Model / 模型", F["hero"], COLORS["ink"], anchor="mm")
    c.text((300, 282), "理解 · 推理 · 生成", F["body"], COLORS["muted"], anchor="mm")
    c.text((955, 225), "Harness / 运行框架", F["hero"], COLORS["ink"], anchor="mm")
    c.text((1545, 455), "Agent", font(72, True), COLORS["ink"], anchor="mm")
    c.text((1545, 535), "智能体", F["h1"], COLORS["muted"], anchor="mm")
    c.d.rounded_rectangle((1380, 610, 1710, 705), radius=24, fill="#F0FDF4", outline=COLORS["green"], width=4)
    c.text((1545, 638), "可执行 · 可控 · 可观测", F["body"], COLORS["green"], anchor="mt")

    legend = [
        ("Tools\n工具", COLORS["orange"]),
        ("Knowledge\n知识", COLORS["blue"]),
        ("Observation\n观察", COLORS["cyan"]),
        ("Action Interface\n行动接口", COLORS["slate"]),
        ("Permission Boundary\n权限边界", COLORS["green"]),
    ]
    card_w, card_h, gap = 220, 78, 18
    x = (W - (card_w * len(legend) + gap * (len(legend) - 1))) // 2
    y = 840
    for i, (label, color) in enumerate(legend):
        x1 = x + i * (card_w + gap)
        c.d.rounded_rectangle((x1, y, x1 + card_w, y + card_h), radius=18, fill="white", outline=COLORS["line"], width=3)
        c.d.rounded_rectangle((x1, y, x1 + 16, y + card_h), radius=8, fill=color)
        c.text((x1 + card_w / 2 + 8, y + card_h / 2), label, F["small"], COLORS["ink"], anchor="mm")
    c.save("ch01-harness-overview.png")


def ch01_responsibilities() -> None:
    c = Canvas("Harness 的五大职责", "它不替模型思考，而是提供可工作的环境")
    c.d.ellipse((730, 300, 1062, 632), fill=COLORS["blue"], outline=darken(COLORS["blue"]), width=5)
    c.text((896, 410), "Harness", F["h1"], "white", anchor="mm")
    items = [
        ("提供工具\n命令、文件、API", COLORS["orange"], (160, 210, 520, 330)),
        ("管理权限\n允许、拒绝、询问", COLORS["red"], (1270, 210, 1630, 330)),
        ("记录日志\n过程可追踪", COLORS["slate"], (1270, 690, 1630, 810)),
        ("处理错误\n重试、降级、告警", COLORS["green"], (160, 690, 520, 810)),
        ("管理上下文\n压缩、归档、总结", COLORS["purple"], (610, 760, 1180, 880)),
    ]
    for label, color, box in items:
        c.box(box, label, color, fnt=F["body"], max_chars=10)
        c.arrow(((box[0] + box[2]) // 2, (box[1] + box[3]) // 2), (896, 466), color=darken(color), width=5)
    c.save("ch01-harness-responsibilities.png")


def ch01_with_without() -> None:
    c = Canvas("有 Harness vs 没有 Harness", "同一个模型，工作环境决定它能不能稳定完成任务")
    c.panel((120, 230, 790, 810), "没有 Harness", ["只能回复文本", "没有工具", "没有权限边界", "过程不可观测", "结果难复现"], COLORS["red"])
    c.text((896, 500), "VS", font(86, True), COLORS["ink"], anchor="mm")
    c.panel((1000, 230, 1670, 810), "有 Harness", ["能调用工具执行任务", "权限门控更安全", "完整日志可追踪", "上下文可管理", "结果更容易复现"], COLORS["green"])
    c.save("ch01-with-vs-without-harness.png")


def ch02_agent_loop() -> None:
    c = Canvas("Agent Loop / 智能体循环", "感知 → 思考 → 行动 → 观察结果")
    pts = [(520, 440), (896, 260), (1272, 440), (1120, 760), (672, 760)]
    labels = [
        ("感知\n接收用户输入", COLORS["blue"], (380, 360, 660, 510)),
        ("思考\n决定下一步", COLORS["purple"], (756, 190, 1036, 340)),
        ("行动\n回复或调用工具", COLORS["orange"], (1132, 360, 1412, 510)),
        ("观察\n读取工具结果", COLORS["green"], (940, 700, 1300, 850)),
        ("更新历史\n追加 messages", COLORS["slate"], (492, 700, 852, 850)),
    ]
    for i in range(len(pts)):
        c.arrow(pts[i], pts[(i + 1) % len(pts)], COLORS["slate"])
    for label, color, box in labels:
        c.box(box, label, color, fnt=F["body"], max_chars=9)
    c.save("ch02-agent-loop.png")


def ch02_decision_tree() -> None:
    c = Canvas("Agent 循环决策树", "模型每一轮只做两类事：回复用户，或请求工具")
    c.box((720, 170, 1070, 280), "LLM Response\n模型输出", COLORS["blue"], fnt=F["body"])
    c.arrow((895, 280), (895, 340))
    c.diamond((895, 430), (390, 150), "是否包含 tool_calls?")
    c.arrow((700, 430), (430, 430), COLORS["green"])
    c.box((140, 360, 430, 500), "否\n直接回复用户\n退出循环", COLORS["green"], fnt=F["body"])
    c.arrow((1090, 430), (1290, 430), COLORS["orange"])
    c.box((1290, 335, 1600, 425), "是\n提取工具名和参数", COLORS["orange"], fnt=F["small"])
    c.arrow((1445, 425), (1445, 520), COLORS["orange"])
    c.box((1290, 520, 1600, 610), "执行工具\n拿到结果", COLORS["orange"], fnt=F["small"])
    c.arrow((1290, 565), (895, 565), COLORS["orange"])
    c.box((620, 520, 895, 610), "把结果追加到 messages", COLORS["orange"], fnt=F["small"])
    c.arrow((750, 520), (750, 250), COLORS["orange"])
    c.save("ch02-decision-tree.png")


def ch02_messages() -> None:
    c = Canvas("messages 列表结构", "每条消息都有 role 和 content，整段历史会一起发给模型")
    rows = [
        ("system", "你是一个助手", COLORS["slate"]),
        ("user", "帮我读取文件", COLORS["blue"]),
        ("assistant", "调用 read_file 工具", COLORS["purple"]),
        ("tool", "文件内容：...", COLORS["orange"]),
        ("assistant", "总结并回复用户", COLORS["green"]),
    ]
    x, y = 430, 220
    for i, (role, content, color) in enumerate(rows):
        yy = y + i * 125
        c.box((x, yy, x + 240, yy + 88), f"role: {role}", color, fnt=F["small"], max_chars=12)
        c.box((x + 285, yy, x + 930, yy + 88), f"content: {content}", "white", outline=color, fnt=F["body"], text_fill=COLORS["ink"], max_chars=24)
    c.d.rounded_rectangle((1390, 230, 1510, 800), radius=18, outline=COLORS["slate"], width=5)
    c.text((1450, 515), "发给 LLM\n的完整历史", F["body"], COLORS["ink"], anchor="mm")
    c.save("ch02-messages-structure.png")


def ch03_dispatch() -> None:
    c = Canvas("工具注册与分发", "工具定义告诉模型能做什么，分发表把名称映射到函数")
    c.box((720, 170, 1070, 280), "LLM Response\n包含工具请求", COLORS["blue"], fnt=F["body"])
    c.arrow((895, 280), (895, 360))
    c.box((500, 360, 1290, 560), "Tool Registry / 工具注册表\nbash: 执行命令    read_file: 读取文件    glob: 搜索文件", COLORS["orange"], fnt=F["body"], max_chars=28)
    c.arrow((895, 560), (895, 660))
    c.box((610, 660, 1180, 780), "TOOL_HANDLERS\n工具名 → Python 函数", COLORS["slate"], fnt=F["body"])
    c.arrow((895, 780), (895, 860))
    c.box((620, 860, 1170, 940), "Tool output 返回给 LLM", COLORS["green"], fnt=F["body"])
    c.save("ch03-tool-dispatch.png")


def ch03_tool_definition() -> None:
    c = Canvas("工具定义解剖图", "模型先读 schema，再决定何时调用、传什么参数")
    code_box = (210, 250, 1110, 790)
    c.d.rounded_rectangle(code_box, radius=22, fill="white", outline=COLORS["line"], width=3)
    lines = [
        ('name: "bash"', COLORS["blue"]),
        ('description: "执行安全命令"', COLORS["green"]),
        ('parameters:', COLORS["orange"]),
        ('  command: string', COLORS["purple"]),
        ('  required: ["command"]', COLORS["red"]),
    ]
    y = 310
    for text, color in lines:
        c.text((270, y), text, F["mono"], color)
        y += 78
    notes = [
        ("name + description\n告诉 LLM 工具用途", COLORS["blue"], 360),
        ("parameters schema\n告诉 LLM 参数格式", COLORS["orange"], 515),
        ("required fields\n执行前校验", COLORS["red"], 670),
    ]
    for text, color, yy in notes:
        c.arrow((1110, yy), (1260, yy), color)
        c.box((1260, yy - 55, 1620, yy + 55), text, color, fnt=F["small"], max_chars=14)
    c.save("ch03-tool-definition-anatomy.png")


def ch03_sequence() -> None:
    c = Canvas("工具调用时序图", "LLM 决策，Harness 执行，再把结果交还给 LLM")
    xs = [300, 780, 1260]
    headers = [("LLM / 大模型", COLORS["blue"]), ("Harness / 框架", COLORS["slate"]), ("Tool Function / 工具函数", COLORS["orange"])]
    for x, (label, color) in zip(xs, headers):
        c.text((x, 210), label, F["h2"], color, anchor="mm")
        c.d.line((x, 250, x, 850), fill=COLORS["line"], width=4)
    steps = [
        (300, 780, 320, '1. tool_call(name="bash")'),
        (780, 1260, 430, "2. 查找 TOOL_HANDLERS"),
        (1260, 780, 540, "3. 执行 run_bash()"),
        (780, 300, 650, "4. 追加 tool result"),
        (300, 780, 760, "5. 再次请求 LLM"),
    ]
    for x1, x2, y, label in steps:
        c.arrow((x1, y), (x2, y), COLORS["slate"])
        c.text(((x1 + x2) / 2, y - 42), label, F["small"], COLORS["ink"], anchor="mm")
    c.save("ch03-tool-call-sequence.png")


def ch04_gate() -> None:
    c = Canvas("权限门控", "同一个工具请求，先过权限检查再执行")
    c.box((140, 420, 460, 560), "Agent 想执行操作 X", COLORS["blue"], fnt=F["body"])
    c.arrow((460, 490), (640, 490))
    c.box((640, 360, 940, 620), "Permission Check\n权限检查", "white", outline=COLORS["slate"], fnt=F["body"], text_fill=COLORS["ink"])
    c.arrow((940, 440), (1160, 330), COLORS["green"])
    c.arrow((940, 540), (1160, 650), COLORS["red"])
    c.box((1160, 260, 1560, 400), "ALLOWED / 允许\n读取文件、搜索、列目录", COLORS["green"], fnt=F["small"], max_chars=14)
    c.box((1160, 580, 1560, 720), "DENIED / 拒绝\n删除系统文件、sudo、rm -rf", COLORS["red"], fnt=F["small"], max_chars=14)
    c.save("ch04-permission-gate.png")


def ch04_flow() -> None:
    c = Canvas("权限检查流程", "黑名单优先，其次白名单；不确定就询问用户")
    c.box((710, 185, 1080, 285), "Tool call request\n工具调用请求", COLORS["blue"], fnt=F["body"])
    c.arrow((895, 285), (895, 355))
    c.diamond((895, 440), (430, 150), "是否命中黑名单?")
    c.arrow((1110, 440), (1280, 440), COLORS["red"])
    c.box((1280, 380, 1550, 500), "DENIED\n拒绝执行", COLORS["red"], fnt=F["body"])
    c.text((1415, 540), "返回错误给 LLM", F["small"], COLORS["ink"], anchor="mm")
    c.arrow((895, 515), (895, 590))
    c.diamond((895, 675), (430, 150), "是否命中白名单?")
    c.arrow((1110, 675), (1280, 675), COLORS["green"])
    c.box((1280, 615, 1550, 735), "ALLOWED\n放行执行", COLORS["green"], fnt=F["body"])
    c.text((1415, 775), "执行工具", F["small"], COLORS["ink"], anchor="mm")
    c.arrow((895, 750), (895, 820), COLORS["orange"])
    c.box((740, 820, 1050, 930), "ASK USER\n询问用户", COLORS["orange"], fnt=F["body"])
    c.text((1090, 360), "是", F["body"], COLORS["red"])
    c.text((910, 525), "否", F["body"], COLORS["ink"])
    c.text((1090, 600), "是", F["body"], COLORS["green"])
    c.text((910, 765), "否", F["body"], COLORS["ink"])
    c.save("ch04-permission-flow.png")


def ch04_layers() -> None:
    c = Canvas("纵深防御：三层安全", "每一层都能拦住一部分风险")
    layers = [
        ("Layer 1\n模型自我约束\n避免明显危险动作", COLORS["blue"], (120, 330, 480, 650)),
        ("Layer 2\nHarness 权限系统\n白名单 / 黑名单 / 询问", COLORS["orange"], (560, 330, 980, 650)),
        ("Layer 3\n系统级沙箱\n文件系统与进程隔离", COLORS["red"], (1060, 330, 1420, 650)),
    ]
    for label, color, box in layers:
        c.d.rounded_rectangle(box, radius=34, fill="white", outline=color, width=8)
        c.wrapped(box, label, F["body"], COLORS["ink"], max_chars=13)
    c.arrow((480, 490), (560, 490), COLORS["slate"])
    c.arrow((980, 490), (1060, 490), COLORS["slate"])
    c.arrow((1420, 490), (1510, 490), COLORS["slate"])
    c.box((1510, 410, 1710, 570), "你的文件\n和环境", COLORS["green"], fnt=F["body"])
    c.save("ch04-safety-layers.png")


def ch05_system() -> None:
    c = Canvas("记忆系统", "写入重要信息，按需召回相关记忆")
    steps = [
        ("对话结束\nConversation ends", COLORS["purple"]),
        ("提取事实\nExtract memory", COLORS["orange"]),
        ("保存到文件\nMemory store", COLORS["slate"]),
        ("新问题\nNew query", COLORS["blue"]),
        ("搜索相关记忆\nRecall", COLORS["green"]),
        ("注入上下文\nInject", COLORS["purple"]),
    ]
    flow("ch05-memory-system.png", "记忆系统", steps, "像笔记本：只记重要内容，用到时再翻出来")


def ch05_lifecycle() -> None:
    flow(
        "ch05-memory-lifecycle.png",
        "记忆生命周期",
        [
            ("Session 1\n会话一", COLORS["blue"]),
            ("提取关键记忆", COLORS["orange"]),
            ("保存为 JSON", COLORS["slate"]),
            ("Session 2\n会话二", COLORS["green"]),
            ("召回相关记忆", COLORS["purple"]),
            ("继续工作", COLORS["cyan"]),
        ],
        "记忆跨会话存在，不等于把所有历史都塞进上下文",
    )


def ch05_scoring() -> None:
    c = Canvas("记忆召回评分", "按关键词重叠度给记忆排序，只注入最相关的几条")
    c.box((140, 380, 520, 520), "用户问题\n帮我写 Python 代码", COLORS["blue"], fnt=F["body"])
    memories = [
        ("偏好：使用 Python 3.11\n得分 3/3", COLORS["green"], 260),
        ("偏好：代码注释简洁\n得分 2/3", COLORS["orange"], 430),
        ("偏好：使用 2 空格缩进\n得分 0/3", COLORS["slate"], 600),
    ]
    for text, color, y in memories:
        c.arrow((520, 450), (720, y + 50), color)
        c.box((720, y, 1220, y + 100), text, color, fnt=F["small"], max_chars=18)
    c.box((1320, 360, 1640, 590), "取 Top-K\n注入 prompt", COLORS["purple"], fnt=F["body"])
    c.save("ch05-recall-scoring.png")


def ch06_delegate() -> None:
    c = Canvas("子代理委托", "Lead Agent 把独立任务交给子代理，自己只接收摘要")
    c.box((690, 200, 1100, 330), "Lead Agent\n主 Agent", COLORS["blue"], fnt=F["body"])
    agents = [
        ("Sub-Agent A\n查资料", COLORS["cyan"], (180, 620, 520, 760)),
        ("Sub-Agent B\n写代码", COLORS["orange"], (725, 620, 1065, 760)),
        ("Sub-Agent C\n跑测试", COLORS["green"], (1270, 620, 1610, 760)),
    ]
    for label, color, box in agents:
        c.arrow((895, 330), ((box[0] + box[2]) // 2, box[1]), color)
        c.arrow(((box[0] + box[2]) // 2, box[1]), (895, 330), color, width=3)
        c.box(box, label, color, fnt=F["body"])
    c.save("ch06-subagent-delegate.png")


def ch06_inline() -> None:
    c = Canvas("内联执行 vs 子代理委托", "子代理让主上下文保持干净")
    c.panel((110, 250, 820, 800), "内联执行", ["用户问题", "工具调用", "长结果", "更多工具调用", "上下文变脏"], COLORS["red"])
    c.panel((970, 250, 1680, 800), "子代理委托", ["用户问题", "委托任务", "子代理独立工作", "只返回摘要", "主上下文干净"], COLORS["green"])
    c.save("ch06-subagent-vs-inline.png")


def ch06_flow() -> None:
    flow(
        "ch06-delegate-flow.png",
        "委托流程",
        [
            ("复杂任务\n需要拆分", COLORS["blue"]),
            ("决定委托\nDelegate", COLORS["purple"]),
            ("子代理新上下文", COLORS["orange"]),
            ("独立执行\n最多 N 轮", COLORS["orange"]),
            ("返回最终答案", COLORS["green"]),
        ],
    )


def ch07_retry() -> None:
    c = Canvas("错误处理策略", "失败并不等于崩溃：先重试，再降级，最后告警")
    c.box((160, 390, 450, 530), "Agent Call\n工具调用", COLORS["blue"], fnt=F["body"])
    c.arrow((450, 460), (640, 460))
    c.diamond((760, 460), (250, 140), "是否成功?")
    c.arrow((885, 460), (1110, 460), COLORS["green"])
    c.box((1110, 390, 1390, 530), "继续流程", COLORS["green"], fnt=F["body"])
    c.arrow((760, 530), (760, 640), COLORS["orange"])
    c.box((610, 640, 910, 760), "Retry\n按策略重试", COLORS["orange"], fnt=F["body"])
    c.arrow((910, 700), (1120, 700), COLORS["red"])
    c.box((1120, 640, 1420, 760), "Fallback\n降级方案", COLORS["red"], fnt=F["body"])
    c.text((764, 590), "否", F["small"], COLORS["ink"], anchor="mm")
    c.text((980, 430), "是", F["small"], COLORS["ink"], anchor="mm")
    c.save("ch07-error-retry.png")


def ch07_strategy() -> None:
    c = Canvas("重试策略：指数退避", "每失败一次，等待时间更长，避免持续冲击服务")
    attempts = [
        ("Attempt 1\n等待 1s", COLORS["orange"]),
        ("Attempt 2\n等待 2s", COLORS["orange"]),
        ("Attempt 3\n等待 4s", COLORS["orange"]),
    ]
    x = 220
    for label, color in attempts:
        c.box((x, 360, x + 320, 520), label, color, fnt=F["body"])
        x += 390
    c.box((230, 690, 760, 830), "全部失败\n返回错误或告警", COLORS["red"], fnt=F["body"])
    c.box((1020, 620, 1510, 830), "Fallback\n换备用方案", COLORS["slate"], fnt=F["body"])
    for i, height in enumerate([60, 120, 240]):
        x0 = 1150 + i * 100
        c.d.rectangle((x0, 520 - height, x0 + 55, 520), fill=COLORS["green"])
    c.text((1265, 570), "等待时间递增", F["small"], COLORS["muted"], anchor="mm")
    c.save("ch07-retry-strategy.png")


def ch07_fallback() -> None:
    c = Canvas("降级示例", "主方案失败时，换一个更可靠但能力更窄的方案")
    c.box((650, 220, 1140, 320), "读取文件内容", COLORS["slate"], fnt=F["body"])
    c.arrow((895, 320), (895, 420))
    c.box((560, 420, 950, 540), "主方案\nbash: cat file.txt", COLORS["blue"], fnt=F["body"])
    c.text((1030, 470), "命令失败", F["body"], COLORS["red"], anchor="lm")
    c.arrow((950, 500), (1210, 620), COLORS["orange"])
    c.box((1210, 560, 1620, 700), "降级方案\nread_file(Path.read_text)", COLORS["green"], fnt=F["body"], max_chars=18)
    c.text((1660, 630), "成功", F["body"], COLORS["green"], anchor="lm")
    c.d.line((250, 800, 1540, 800), fill=COLORS["line"], width=5)
    for x, label in [(250, "主方案尝试"), (895, "降级方案"), (1540, "都失败则返回错误")]:
        c.d.ellipse((x - 12, 788, x + 12, 812), fill=COLORS["slate"])
        c.text((x, 835), label, F["small"], COLORS["ink"], anchor="mt")
    c.save("ch07-fallback-example.png")


def ch08_context() -> None:
    c = Canvas("上下文压缩", "历史太长时保留头尾，把中间压成摘要")
    c.box((120, 260, 520, 760), "完整对话历史\n很多轮消息\n越来越长", COLORS["blue"], fnt=F["body"])
    c.arrow((520, 510), (710, 510))
    c.box((710, 360, 1080, 660), "Compress\n压缩中间历史", COLORS["purple"], fnt=F["body"])
    c.arrow((1080, 510), (1270, 510))
    c.box((1270, 260, 1670, 760), "紧凑上下文\nHead\nSummary\nTail", COLORS["green"], fnt=F["body"])
    c.save("ch08-context-compaction.png")


def ch08_before_after() -> None:
    c = Canvas("压缩前后对比", "压缩减少 token，但保留任务目标和最近状态")
    c.panel((160, 230, 780, 820), "Before / 压缩前", ["20 条 messages", "超过上下文窗口", "模型无法继续"], COLORS["red"])
    c.panel((1010, 230, 1630, 820), "After / 压缩后", ["原始请求", "中间摘要", "最近消息", "可继续执行"], COLORS["green"])
    c.arrow((780, 520), (1010, 520), COLORS["purple"])
    c.save("ch08-before-after-compact.png")


def ch08_pipeline() -> None:
    flow(
        "ch08-compaction-pipeline.png",
        "压缩管道",
        [
            ("Snip\n裁剪中间", COLORS["blue"]),
            ("Summarize\n总结关键状态", COLORS["purple"]),
            ("Archive\n归档完整历史", COLORS["green"]),
            ("Compose\n拼成新上下文", COLORS["orange"]),
        ],
        "Head + Summary + Tail = compact context",
    )


def ch09_full() -> None:
    c = Canvas("完整组装", "所有模块围绕一个 Agent Loop 协同工作")
    c.d.ellipse((745, 350, 1047, 652), fill=COLORS["blue"], outline=darken(COLORS["blue"]), width=5)
    c.text((896, 485), "Agent Loop\n主循环", F["h2"], "white", anchor="mm")
    modules = [
        ("Tools\n工具", COLORS["orange"], (250, 230, 520, 350)),
        ("Permission\n权限", COLORS["red"], (1270, 230, 1540, 350)),
        ("Memory\n记忆", COLORS["purple"], (1270, 650, 1540, 770)),
        ("Subagent\n子代理", COLORS["blue"], (920, 780, 1190, 900)),
        ("Error Handler\n错误处理", COLORS["green"], (250, 650, 520, 770)),
        ("Context Manager\n上下文管理", COLORS["orange"], (250, 440, 560, 560)),
    ]
    for label, color, box in modules:
        c.box(box, label, color, fnt=F["small"])
        c.arrow(((box[0] + box[2]) // 2, (box[1] + box[3]) // 2), (896, 501), color, width=4)
    c.save("ch09-full-assembly.png")


def ch09_interaction() -> None:
    c = Canvas("模块交互顺序", "一轮请求在各模块之间的典型流转")
    steps = [
        ("1 记忆召回", COLORS["purple"]),
        ("2 上下文压缩", COLORS["orange"]),
        ("3 调用 LLM", COLORS["blue"]),
        ("4 权限检查", COLORS["red"]),
        ("5 执行工具", COLORS["green"]),
        ("6 追加结果", COLORS["slate"]),
    ]
    y = 220
    for i, (label, color) in enumerate(steps):
        c.box((600, y, 1190, y + 86), label, color, fnt=F["body"])
        if i < len(steps) - 1:
            c.arrow((895, y + 86), (895, y + 120), COLORS["slate"])
        y += 120
    c.save("ch09-module-interaction.png")


def ch10_map() -> None:
    c = Canvas("后续扩展方向", "最小 Harness 之后，可以从四条路线继续升级")
    c.d.ellipse((760, 380, 1032, 652), fill=COLORS["blue"], outline=darken(COLORS["blue"]), width=5)
    c.text((896, 505), "你在这里\nMinimal Harness", F["body"], "white", anchor="mm")
    paths = [
        ("MCP 插件\n连接外部工具", COLORS["green"], (190, 230, 540, 360)),
        ("多 Agent 团队\n协作完成任务", COLORS["orange"], (1250, 230, 1600, 360)),
        ("任务调度\n定时与后台任务", COLORS["purple"], (190, 690, 540, 820)),
        ("工作流引擎\n预定义复杂流程", COLORS["cyan"], (1250, 690, 1600, 820)),
    ]
    for label, color, box in paths:
        c.box(box, label, color, fnt=F["body"], max_chars=11)
        c.arrow((896, 516), ((box[0] + box[2]) // 2, (box[1] + box[3]) // 2), color, width=5)
    c.save("ch10-expansion-map.png")


def ch10_detail() -> None:
    c = Canvas("四条升级路线详解", "按你的目标选择下一步，不需要一次全做")
    c.panel((80, 190, 850, 470), "MCP 插件", ["数据库、浏览器、API、通讯工具", "把外部能力接入工具协议"], COLORS["green"])
    c.panel((940, 190, 1710, 470), "多 Agent 团队", ["研究员、撰稿人、审核员", "并行分工，最后整合结果"], COLORS["orange"])
    c.panel((80, 570, 850, 850), "任务调度", ["定时任务、后台进程、消息队列", "让 Agent 在合适时间启动"], COLORS["purple"])
    c.panel((940, 570, 1710, 850), "工作流引擎", ["预设步骤、条件分支、自动执行", "适合稳定重复的业务流程"], COLORS["cyan"])
    c.d.rounded_rectangle((760, 480, 1032, 560), radius=20, fill=COLORS["blue"], outline="white", width=8)
    c.text((896, 505), "Your Agent / 你的 Agent", F["small"], "white", anchor="mm")
    c.save("ch10-four-paths-detail.png")


def main() -> None:
    ch01_overview()
    ch01_responsibilities()
    ch01_with_without()
    ch02_agent_loop()
    ch02_decision_tree()
    ch02_messages()
    ch03_dispatch()
    ch03_tool_definition()
    ch03_sequence()
    ch04_gate()
    ch04_flow()
    ch04_layers()
    ch05_system()
    ch05_lifecycle()
    ch05_scoring()
    ch06_delegate()
    ch06_inline()
    ch06_flow()
    ch07_retry()
    ch07_strategy()
    ch07_fallback()
    ch08_context()
    ch08_before_after()
    ch08_pipeline()
    ch09_full()
    ch09_interaction()
    ch10_map()
    ch10_detail()


if __name__ == "__main__":
    main()
