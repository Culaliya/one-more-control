#!/usr/bin/env python3
"""Turn the generated key art into a deterministic 1200×630 social card."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "social-card-source.png"
OUTPUT = ROOT / "public" / "og.png"
WIDTH, HEIGHT = 1200, 630
OFF_WHITE = "#f2ede4"
AMBER = "#ffb638"
MUTED = "#8e918f"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size=size)


def main() -> None:
    source = Image.open(SOURCE).convert("RGB")
    target_ratio = WIDTH / HEIGHT
    source_ratio = source.width / source.height
    if source_ratio > target_ratio:
        crop_width = round(source.height * target_ratio)
        left = (source.width - crop_width) // 2
        source = source.crop((left, 0, left + crop_width, source.height))
    elif source_ratio < target_ratio:
        crop_height = round(source.width / target_ratio)
        top = (source.height - crop_height) // 2
        source = source.crop((0, top, source.width, top + crop_height))
    canvas = source.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)

    shade = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    shade_pixels = shade.load()
    for x in range(WIDTH):
        opacity = round(220 * max(0, min(1, (710 - x) / 420)))
        for y in range(HEIGHT):
            shade_pixels[x, y] = (3, 6, 7, opacity)
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shade)
    draw = ImageDraw.Draw(canvas)

    bold_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    mono_path = "/System/Library/Fonts/Menlo.ttc"
    brand_font = font(bold_path, 17)
    eyebrow_font = font(mono_path, 13)
    title_font = font(bold_path, 54)

    draw.polygon([(57, 62), (66, 71), (57, 80), (48, 71)], fill=AMBER)
    draw.text((80, 57), "ONE MORE CONTROL", font=brand_font, fill=OFF_WHITE)
    draw.text((48, 128), "A SCIENTIFIC REASONING GAME  /  CASE 01", font=eyebrow_font, fill=AMBER)

    draw.text((48, 174), "THREE PLAUSIBLE", font=title_font, fill=OFF_WHITE, stroke_width=1)
    draw.text((48, 231), "ANSWERS.", font=title_font, fill=OFF_WHITE, stroke_width=1)
    draw.text((48, 310), "ONE EXPERIMENT", font=title_font, fill=AMBER, stroke_width=1)
    draw.text((48, 367), "THAT MATTERS.", font=title_font, fill=AMBER, stroke_width=1)

    draw.line((48, 474, 550, 474), fill=(255, 255, 255, 45), width=1)
    draw.text((48, 503), "CHOOSE THE CONTROL THAT MAKES", font=eyebrow_font, fill=MUTED)
    draw.text((48, 528), "THE WRONG MECHANISMS IMPOSSIBLE.", font=eyebrow_font, fill=MUTED)

    canvas.convert("RGB").save(OUTPUT, optimize=True)
    print(f"generated {OUTPUT.relative_to(ROOT)} ({WIDTH}x{HEIGHT})")


if __name__ == "__main__":
    main()
