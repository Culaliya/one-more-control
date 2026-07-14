#!/usr/bin/env python3
"""Generate deterministic synthetic science artwork for The Fading Signal.

The observation is a PNG because it is also supplied to the vision route. Every
publicly selectable outcome has an SVG, including counterfactual outcomes, so
the public asset inventory cannot reveal the server-side case truth.
"""

from __future__ import annotations

import html
from pathlib import Path
from typing import Iterable, Sequence

from PIL import Image, ImageDraw, ImageFont
from PIL.PngImagePlugin import PngInfo


ROOT = Path(__file__).resolve().parents[1]
CASE_DIR = ROOT / "public" / "cases" / "fading-signal"
OUTCOME_DIR = CASE_DIR / "outcomes"

GRAPHITE = "#101416"
PANEL = "#171D20"
BONE = "#F3EEDF"
MUTED = "#A8B1AC"
GRID = "#344147"
AMBER = "#F2B84B"
CYAN = "#50D4D8"
ACID_RED = "#FF6262"

SVG_WIDTH = 960
SVG_HEIGHT = 560
PLOT_X = 112
PLOT_Y = 154
PLOT_W = 732
PLOT_H = 286


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def svg_text(
    x: float,
    y: float,
    value: str,
    *,
    size: int = 16,
    fill: str = BONE,
    weight: int = 500,
    anchor: str = "start",
    family: str = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    tracking: float | None = None,
) -> str:
    letter_spacing = "" if tracking is None else f' letter-spacing="{tracking}"'
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" fill="{fill}" font-family="{family}" '
        f'font-size="{size}" font-weight="{weight}" text-anchor="{anchor}"'
        f'{letter_spacing}>{esc(value)}</text>'
    )


def svg_shell(title: str, description: str, body: Iterable[str]) -> str:
    title_id = "chart-title"
    desc_id = "chart-description"
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{SVG_WIDTH}" '
            f'height="{SVG_HEIGHT}" viewBox="0 0 {SVG_WIDTH} {SVG_HEIGHT}" '
            f'role="img" aria-labelledby="{title_id} {desc_id}">'
        ),
        f"<title id=\"{title_id}\">{esc(title)}</title>",
        f"<desc id=\"{desc_id}\">{esc(description)}</desc>",
        "<metadata>Synthetic educational chart. Public artwork does not encode case truth.</metadata>",
        "<defs>",
        (
            '<pattern id="cyan-hatch" width="8" height="8" patternUnits="userSpaceOnUse" '
            'patternTransform="rotate(45)"><rect width="8" height="8" fill="#19383A"/>'
            '<line x1="0" y1="0" x2="0" y2="8" stroke="#50D4D8" stroke-width="3"/></pattern>'
        ),
        "</defs>",
        f'<rect width="{SVG_WIDTH}" height="{SVG_HEIGHT}" rx="22" fill="{GRAPHITE}"/>',
        f'<rect x="24" y="24" width="912" height="512" rx="17" fill="{PANEL}" stroke="{GRID}"/>',
        svg_text(58, 62, "SYNTHETIC RESULT", size=12, fill=AMBER, weight=700, tracking=2.1),
        svg_text(
            58,
            101,
            title,
            size=24,
            weight=760,
            family="Inter, ui-sans-serif, system-ui, sans-serif",
        ),
        svg_text(58, 126, "AUTHORED OUTCOME · NOT A WET-LAB PROTOCOL", size=11, fill=MUTED, tracking=1.2),
        *body,
        svg_text(902, 512, "ONE MORE CONTROL", size=11, fill=MUTED, anchor="end", tracking=1.2),
        "</svg>",
    ]
    return "\n".join(lines) + "\n"


def chart_axes(
    x_labels: Sequence[str],
    *,
    x_axis_label: str,
    y_axis_label: str,
    y_max: float,
    y_ticks: Sequence[float],
    x_mode: str = "points",
) -> list[str]:
    result: list[str] = []
    for tick in y_ticks:
        y = PLOT_Y + PLOT_H - (tick / y_max) * PLOT_H
        result.append(
            f'<line x1="{PLOT_X}" y1="{y:.1f}" x2="{PLOT_X + PLOT_W}" y2="{y:.1f}" '
            f'stroke="{GRID}" stroke-width="1"/>'
        )
        result.append(svg_text(PLOT_X - 16, y + 5, f"{tick:g}", size=12, fill=MUTED, anchor="end"))

    result.extend(
        [
            f'<line x1="{PLOT_X}" y1="{PLOT_Y}" x2="{PLOT_X}" y2="{PLOT_Y + PLOT_H}" stroke="{MUTED}"/>',
            f'<line x1="{PLOT_X}" y1="{PLOT_Y + PLOT_H}" x2="{PLOT_X + PLOT_W}" y2="{PLOT_Y + PLOT_H}" stroke="{MUTED}"/>',
        ]
    )

    for index, label in enumerate(x_labels):
        if x_mode == "slots":
            x = PLOT_X + ((index + 0.5) / max(1, len(x_labels))) * PLOT_W
        else:
            denominator = max(1, len(x_labels) - 1)
            x = PLOT_X + (index / denominator) * PLOT_W
        result.append(f'<line x1="{x:.1f}" y1="{PLOT_Y + PLOT_H}" x2="{x:.1f}" y2="{PLOT_Y + PLOT_H + 7}" stroke="{MUTED}"/>')
        result.append(svg_text(x, PLOT_Y + PLOT_H + 25, label, size=12, fill=MUTED, anchor="middle"))

    result.append(svg_text(PLOT_X + PLOT_W / 2, 493, x_axis_label, size=12, fill=MUTED, anchor="middle", tracking=0.8))
    result.append(
        f'<text x="47" y="{PLOT_Y + PLOT_H / 2:.1f}" fill="{MUTED}" '
        'font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" '
        'font-size="12" text-anchor="middle" letter-spacing="0.8" '
        f'transform="rotate(-90 47 {PLOT_Y + PLOT_H / 2:.1f})">{esc(y_axis_label)}</text>'
    )
    return result


def line_chart_svg(
    *,
    title: str,
    description: str,
    x_labels: Sequence[str],
    x_axis_label: str,
    y_axis_label: str,
    y_max: float,
    y_ticks: Sequence[float],
    series: Sequence[tuple[str, str, str, str, Sequence[float]]],
    annotation_index: int | None = None,
    annotation_label: str | None = None,
) -> str:
    body = chart_axes(
        x_labels,
        x_axis_label=x_axis_label,
        y_axis_label=y_axis_label,
        y_max=y_max,
        y_ticks=y_ticks,
    )

    if annotation_index is not None:
        denominator = max(1, len(x_labels) - 1)
        x = PLOT_X + (annotation_index / denominator) * PLOT_W
        body.append(
            f'<line x1="{x:.1f}" y1="{PLOT_Y}" x2="{x:.1f}" y2="{PLOT_Y + PLOT_H}" '
            f'stroke="{ACID_RED}" stroke-width="2" stroke-dasharray="5 6"/>'
        )
        if annotation_label:
            body.append(svg_text(x + 8, PLOT_Y + 19, annotation_label, size=11, fill=ACID_RED, weight=700))

    legend_x = 574
    for series_index, (label, color, dash, marker, values) in enumerate(series):
        denominator = max(1, len(values) - 1)
        points = []
        for index, value in enumerate(values):
            x = PLOT_X + (index / denominator) * PLOT_W
            y = PLOT_Y + PLOT_H - (value / y_max) * PLOT_H
            points.append((x, y))

        dash_attr = "" if not dash else f' stroke-dasharray="{dash}"'
        point_string = " ".join(f"{x:.1f},{y:.1f}" for x, y in points)
        body.append(
            f'<polyline points="{point_string}" fill="none" stroke="{color}" stroke-width="4" '
            f'stroke-linecap="round" stroke-linejoin="round"{dash_attr}/>'
        )
        for x, y in points:
            if marker == "square":
                body.append(f'<rect x="{x - 5:.1f}" y="{y - 5:.1f}" width="10" height="10" fill="{PANEL}" stroke="{color}" stroke-width="3"/>')
            else:
                body.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="{PANEL}" stroke="{color}" stroke-width="3"/>')

        legend_y = 119 + series_index * 24
        body.append(f'<line x1="{legend_x}" y1="{legend_y}" x2="{legend_x + 34}" y2="{legend_y}" stroke="{color}" stroke-width="3"{dash_attr}/>')
        if marker == "square":
            body.append(f'<rect x="{legend_x + 13}" y="{legend_y - 4}" width="8" height="8" fill="{PANEL}" stroke="{color}" stroke-width="2"/>')
        else:
            body.append(f'<circle cx="{legend_x + 17}" cy="{legend_y}" r="4" fill="{PANEL}" stroke="{color}" stroke-width="2"/>')
        body.append(svg_text(legend_x + 45, legend_y + 5, label, size=12, fill=BONE))

    return svg_shell(title, description, body)


def bar_chart_svg(
    *,
    title: str,
    description: str,
    categories: Sequence[str],
    values: Sequence[float],
    y_axis_label: str,
    y_max: float = 120,
) -> str:
    body = chart_axes(
        categories,
        x_axis_label="CONDITION",
        y_axis_label=y_axis_label,
        y_max=y_max,
        y_ticks=(0, 25, 50, 75, 100),
        x_mode="slots",
    )
    slot = PLOT_W / max(1, len(categories))
    bar_w = min(150, slot * 0.48)
    for index, value in enumerate(values):
        center = PLOT_X + slot * (index + 0.5)
        bar_h = (value / y_max) * PLOT_H
        y = PLOT_Y + PLOT_H - bar_h
        if index == 0:
            fill = AMBER
            stroke = AMBER
        else:
            fill = "url(#cyan-hatch)"
            stroke = CYAN
        body.append(
            f'<rect x="{center - bar_w / 2:.1f}" y="{y:.1f}" width="{bar_w:.1f}" '
            f'height="{bar_h:.1f}" rx="6" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
        )
        body.append(svg_text(center, y - 13, f"{value:g}%", size=15, fill=stroke, weight=750, anchor="middle"))
    body.append(svg_text(620, 123, "SOLID · VEHICLE", size=11, fill=AMBER, tracking=0.6))
    body.append(svg_text(620, 144, "HATCH · V-17", size=11, fill=CYAN, tracking=0.6))
    return svg_shell(title, description, body)


def write_outcomes() -> list[Path]:
    outcomes: dict[str, str] = {
        "low_signal_reproduced": line_chart_svg(
            title="REPEAT ASSAY · LOW SIGNAL REPRODUCED",
            description="The repeated V-17 fluorescence trace closely follows the original low-signal trace across six minutes.",
            x_labels=("0", "1", "2", "3", "4", "5", "6"),
            x_axis_label="REACTION TIME (MIN)",
            y_axis_label="FLUORESCENCE (A.U.)",
            y_max=120,
            y_ticks=(0, 30, 60, 90, 120),
            series=(
                ("ORIGINAL V-17", CYAN, "", "circle", (8, 14, 20, 26, 32, 38, 44)),
                ("REPEAT V-17", ACID_RED, "8 7", "square", (8, 14, 19, 25, 31, 37, 43)),
            ),
        ),
        "signal_not_reproduced": line_chart_svg(
            title="REPEAT ASSAY · SIGNAL NOT REPRODUCED",
            description="The repeat V-17 fluorescence trace rises substantially faster than the original low-signal trace.",
            x_labels=("0", "1", "2", "3", "4", "5", "6"),
            x_axis_label="REACTION TIME (MIN)",
            y_axis_label="FLUORESCENCE (A.U.)",
            y_max=120,
            y_ticks=(0, 30, 60, 90, 120),
            series=(
                ("ORIGINAL V-17", CYAN, "", "circle", (8, 14, 20, 26, 32, 38, 44)),
                ("REPEAT V-17", ACID_RED, "8 7", "square", (8, 23, 39, 55, 71, 87, 103)),
            ),
        ),
        "dose_dependent_signal_drop": line_chart_svg(
            title="DOSE RESPONSE · SIGNAL FALLS WITH V-17",
            description="Measured fluorescence decreases stepwise as the synthetic V-17 concentration increases.",
            x_labels=("0", "0.25", "0.5", "1.0", "2.0"),
            x_axis_label="V-17 CONCENTRATION (RELATIVE)",
            y_axis_label="MEASURED SIGNAL (% CONTROL)",
            y_max=120,
            y_ticks=(0, 25, 50, 75, 100),
            series=(("MEASURED SIGNAL", CYAN, "", "circle", (100, 84, 68, 38, 22)),),
        ),
        "no_dose_response": line_chart_svg(
            title="DOSE RESPONSE · NO SYSTEMATIC CHANGE",
            description="Measured fluorescence remains near the vehicle control across the tested V-17 concentrations.",
            x_labels=("0", "0.25", "0.5", "1.0", "2.0"),
            x_axis_label="V-17 CONCENTRATION (RELATIVE)",
            y_axis_label="MEASURED SIGNAL (% CONTROL)",
            y_max=120,
            y_ticks=(0, 25, 50, 75, 100),
            series=(("MEASURED SIGNAL", CYAN, "", "circle", (100, 99, 101, 98, 100)),),
        ),
        "abundance_unchanged": bar_chart_svg(
            title="SOLUBLE ENZYME · ABUNDANCE UNCHANGED",
            description="Soluble enzyme abundance is similar in the vehicle and V-17 conditions.",
            categories=("VEHICLE", "V-17"),
            values=(100, 98),
            y_axis_label="SOLUBLE ENZYME (% VEHICLE)",
        ),
        "abundance_reduced": bar_chart_svg(
            title="SOLUBLE ENZYME · ABUNDANCE REDUCED",
            description="Soluble enzyme abundance in the V-17 condition is less than half of the vehicle condition.",
            categories=("VEHICLE", "V-17"),
            values=(100, 42),
            y_axis_label="SOLUBLE ENZYME (% VEHICLE)",
        ),
        "immediate_signal_drop": line_chart_svg(
            title="POST-REACTION SPIKE · IMMEDIATE SIGNAL DROP",
            description="After product formation is complete, fluorescence drops immediately when V-17 is added at time zero.",
            x_labels=("−2", "−1", "0", "+1", "+2", "+3"),
            x_axis_label="TIME FROM V-17 ADDITION (MIN)",
            y_axis_label="FLUORESCENCE (% PRE-SPIKE)",
            y_max=120,
            y_ticks=(0, 25, 50, 75, 100),
            series=(("POST-REACTION SIGNAL", CYAN, "", "circle", (100, 100, 39, 39, 38, 38)),),
            annotation_index=2,
            annotation_label="V-17 ADDED",
        ),
        "no_immediate_change": line_chart_svg(
            title="POST-REACTION SPIKE · NO IMMEDIATE CHANGE",
            description="After product formation is complete, fluorescence remains stable when V-17 is added at time zero.",
            x_labels=("−2", "−1", "0", "+1", "+2", "+3"),
            x_axis_label="TIME FROM V-17 ADDITION (MIN)",
            y_axis_label="FLUORESCENCE (% PRE-SPIKE)",
            y_max=120,
            y_ticks=(0, 25, 50, 75, 100),
            series=(("POST-REACTION SIGNAL", CYAN, "", "circle", (100, 100, 100, 99, 100, 99)),),
            annotation_index=2,
            annotation_label="V-17 ADDED",
        ),
        "normal_product_amount": bar_chart_svg(
            title="ORTHOGONAL PRODUCT · NORMAL AMOUNT",
            description="A non-fluorescent measurement finds similar product amounts in vehicle and V-17 conditions.",
            categories=("VEHICLE", "V-17"),
            values=(100, 97),
            y_axis_label="CHEMICAL PRODUCT (% VEHICLE)",
        ),
        "low_product_amount": bar_chart_svg(
            title="ORTHOGONAL PRODUCT · LOW AMOUNT",
            description="A non-fluorescent measurement finds substantially less product in the V-17 condition.",
            categories=("VEHICLE", "V-17"),
            values=(100, 36),
            y_axis_label="CHEMICAL PRODUCT (% VEHICLE)",
        ),
        "no_apparent_rescue": line_chart_svg(
            title="SUBSTRATE TITRATION · NO APPARENT RESCUE",
            description="Measured fluorescence stays low as substrate concentration increases in the same fluorescent channel.",
            x_labels=("1×", "2×", "4×", "8×"),
            x_axis_label="SUBSTRATE CONCENTRATION",
            y_axis_label="MEASURED SIGNAL (% VEHICLE)",
            y_max=120,
            y_ticks=(0, 25, 50, 75, 100),
            series=(("V-17 SIGNAL", CYAN, "", "circle", (38, 39, 40, 41)),),
        ),
        "partial_rescue": line_chart_svg(
            title="SUBSTRATE TITRATION · PARTIAL RESCUE",
            description="Measured fluorescence increases as substrate concentration rises, but remains below the vehicle reference.",
            x_labels=("1×", "2×", "4×", "8×"),
            x_axis_label="SUBSTRATE CONCENTRATION",
            y_axis_label="MEASURED SIGNAL (% VEHICLE)",
            y_max=120,
            y_ticks=(0, 25, 50, 75, 100),
            series=(("V-17 SIGNAL", CYAN, "", "circle", (38, 52, 67, 79)),),
        ),
    }

    OUTCOME_DIR.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for outcome_id, content in outcomes.items():
        path = OUTCOME_DIR / f"{outcome_id}.svg"
        path.write_text(content, encoding="utf-8")
        written.append(path)
    return written


def load_font(size: int, *, bold: bool = False, mono: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    if mono:
        candidates = (
            "/System/Library/Fonts/SFNSMono.ttf",
            "/System/Library/Fonts/Supplemental/Courier New Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Courier New.ttf",
            "DejaVuSansMono-Bold.ttf" if bold else "DejaVuSansMono.ttf",
        )
    else:
        candidates = (
            "/System/Library/Fonts/SFNS.ttf",
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
            "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
        )
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def dashed_line(
    draw: ImageDraw.ImageDraw,
    points: Sequence[tuple[float, float]],
    *,
    fill: str,
    width: int,
    dash: int = 14,
    gap: int = 10,
) -> None:
    for start, end in zip(points, points[1:]):
        x1, y1 = start
        x2, y2 = end
        dx = x2 - x1
        dy = y2 - y1
        distance = (dx * dx + dy * dy) ** 0.5
        if distance == 0:
            continue
        cursor = 0.0
        while cursor < distance:
            segment_end = min(cursor + dash, distance)
            sx = x1 + dx * cursor / distance
            sy = y1 + dy * cursor / distance
            ex = x1 + dx * segment_end / distance
            ey = y1 + dy * segment_end / distance
            draw.line((sx, sy, ex, ey), fill=fill, width=width)
            cursor += dash + gap


def generate_initial_observation() -> Path:
    width, height = 1200, 760
    image = Image.new("RGB", (width, height), GRAPHITE)
    draw = ImageDraw.Draw(image)
    heading = load_font(38, bold=True)
    label = load_font(18, bold=True, mono=True)
    small = load_font(15, mono=True)
    body_font = load_font(19)
    stat = load_font(29, bold=True, mono=True)

    draw.rounded_rectangle((30, 30, 1170, 730), radius=24, fill=PANEL, outline=GRID, width=2)
    draw.text((70, 65), "INITIAL OBSERVATION · SYNTHETIC DATA", font=label, fill=AMBER)
    draw.text((70, 105), "FLUORESCENT PRODUCT FORMATION", font=heading, fill=BONE)
    draw.text((70, 154), "Matched conditions; two measured fluorescence traces", font=body_font, fill=MUTED)

    plot_left, plot_top, plot_right, plot_bottom = 125, 235, 830, 625
    y_max = 120
    x_values = tuple(range(7))
    vehicle = tuple(8 + 16 * time for time in x_values)
    # 6.08 / 16 == 0.38: the V-17 slope is exactly 62% lower.
    v17 = tuple(8 + 6.08 * time for time in x_values)

    for tick in (0, 30, 60, 90, 120):
        y = plot_bottom - (tick / y_max) * (plot_bottom - plot_top)
        draw.line((plot_left, y, plot_right, y), fill=GRID, width=2)
        tick_text = str(tick)
        box = draw.textbbox((0, 0), tick_text, font=small)
        draw.text((plot_left - 18 - (box[2] - box[0]), y - 8), tick_text, font=small, fill=MUTED)

    draw.line((plot_left, plot_top, plot_left, plot_bottom), fill=MUTED, width=2)
    draw.line((plot_left, plot_bottom, plot_right, plot_bottom), fill=MUTED, width=2)

    def to_point(index: int, value: float) -> tuple[float, float]:
        x = plot_left + index / (len(x_values) - 1) * (plot_right - plot_left)
        y = plot_bottom - value / y_max * (plot_bottom - plot_top)
        return x, y

    vehicle_points = [to_point(index, value) for index, value in enumerate(vehicle)]
    v17_points = [to_point(index, value) for index, value in enumerate(v17)]
    draw.line(vehicle_points, fill=AMBER, width=6, joint="curve")
    dashed_line(draw, v17_points, fill=CYAN, width=6)

    for x, y in vehicle_points:
        draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=PANEL, outline=AMBER, width=3)
    for x, y in v17_points:
        draw.rectangle((x - 6, y - 6, x + 6, y + 6), fill=PANEL, outline=CYAN, width=3)

    for index in x_values:
        x = plot_left + index / (len(x_values) - 1) * (plot_right - plot_left)
        draw.line((x, plot_bottom, x, plot_bottom + 8), fill=MUTED, width=2)
        tick_text = str(index)
        box = draw.textbbox((0, 0), tick_text, font=small)
        draw.text((x - (box[2] - box[0]) / 2, plot_bottom + 14), tick_text, font=small, fill=MUTED)

    axis_label = "REACTION TIME (MIN)"
    box = draw.textbbox((0, 0), axis_label, font=small)
    draw.text(((plot_left + plot_right) / 2 - (box[2] - box[0]) / 2, 676), axis_label, font=small, fill=MUTED)
    y_label = Image.new("RGBA", (360, 40), (0, 0, 0, 0))
    y_draw = ImageDraw.Draw(y_label)
    y_draw.text((0, 7), "FLUORESCENCE (A.U.)", font=small, fill=MUTED)
    y_label = y_label.rotate(90, expand=True)
    image.paste(y_label, (43, 305), y_label)

    side_x = 885
    draw.rounded_rectangle((870, 220, 1125, 420), radius=18, fill=GRAPHITE, outline=GRID, width=2)
    draw.text((side_x, 247), "OBSERVED CHANGE", font=small, fill=MUTED)
    draw.text((side_x, 282), "−62%", font=stat, fill=ACID_RED)
    draw.text((side_x, 322), "V-17 slope", font=label, fill=BONE)
    draw.line((side_x, 368, side_x + 42, 368), fill=AMBER, width=5)
    draw.ellipse((side_x + 16, 362, side_x + 28, 374), fill=PANEL, outline=AMBER, width=3)
    draw.text((side_x + 55, 358), "VEHICLE", font=small, fill=BONE)
    dashed_line(draw, ((side_x, 397), (side_x + 42, 397)), fill=CYAN, width=5, dash=10, gap=7)
    draw.rectangle((side_x + 16, 391, side_x + 28, 403), fill=PANEL, outline=CYAN, width=3)
    draw.text((side_x + 55, 387), "V-17", font=small, fill=BONE)

    draw.rounded_rectangle((870, 444, 1125, 625), radius=18, fill=GRAPHITE, outline=GRID, width=2)
    draw.text((side_x, 470), "MATCHED CONTROLS", font=small, fill=MUTED)
    for index, control in enumerate(("PLATE", "TEMPERATURE", "ENZYME BATCH", "SUBSTRATE")):
        y = 505 + index * 28
        draw.ellipse((side_x, y + 2, side_x + 8, y + 10), fill=CYAN)
        draw.text((side_x + 20, y - 3), control, font=small, fill=BONE)

    metadata = PngInfo()
    metadata.add_text("Title", "The Fading Signal initial observation")
    metadata.add_text(
        "Description",
        "Synthetic line chart comparing vehicle and V-17 fluorescence over six minutes. The V-17 slope is 62 percent lower under matched conditions.",
    )
    metadata.add_text("Software", "ONE MORE CONTROL local asset generator")
    path = CASE_DIR / "initial-observation.png"
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True, pnginfo=metadata)
    return path


def generate_favicon() -> Path:
    size = 256
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((8, 8, 248, 248), radius=52, fill=GRAPHITE, outline=GRID, width=6)
    draw.line((55, 51, 55, 204, 211, 204), fill=BONE, width=9, joint="curve")

    amber_points = ((70, 177), (104, 146), (139, 111), (181, 64))
    cyan_points = ((70, 181), (104, 170), (139, 158), (181, 144))
    draw.line(amber_points, fill=AMBER, width=13, joint="curve")
    dashed_line(draw, cyan_points, fill=CYAN, width=13, dash=18, gap=11)
    for x, y in amber_points:
        draw.ellipse((x - 7, y - 7, x + 7, y + 7), fill=GRAPHITE, outline=AMBER, width=5)
    for x, y in cyan_points:
        draw.rectangle((x - 7, y - 7, x + 7, y + 7), fill=GRAPHITE, outline=CYAN, width=5)
    draw.line((205, 61, 205, 145), fill=ACID_RED, width=8)
    draw.ellipse((195, 43, 215, 63), fill=ACID_RED)

    metadata = PngInfo()
    metadata.add_text("Title", "ONE MORE CONTROL signal mark")
    metadata.add_text("Description", "Two scientific signal traces and a control marker on graphite.")
    path = ROOT / "public" / "favicon.png"
    image.save(path, format="PNG", optimize=True, pnginfo=metadata)
    return path


def main() -> None:
    written = [generate_initial_observation(), *write_outcomes(), generate_favicon()]
    print(f"Generated {len(written)} local assets:")
    for path in written:
        print(f"- {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
