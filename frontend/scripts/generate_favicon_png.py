"""Generate favicon.png with rasterized 'Lock-In' text (SVG <text> is unreliable in tab icons)."""
from __future__ import annotations

import os
import sys

from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "favicon.png")
W = H = 128
BG = "#0b1326"
FG = "#bbc3ff"
TEXT = "Lock-In"


def _load_bold_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    windir = os.environ.get("WINDIR", r"C:\Windows")
    candidates = [
        os.path.join(windir, "Fonts", "segoeuib.ttf"),
        os.path.join(windir, "Fonts", "arialbd.ttf"),
        os.path.join(windir, "Fonts", "arial.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    for path in candidates:
        if os.path.isfile(path):
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def main() -> None:
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    size = 44
    font = _load_bold_font(size)
    while size > 12:
        font = _load_bold_font(size)
        bbox = draw.textbbox((0, 0), TEXT, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        if tw <= W - 12 and th <= H - 12:
            break
        size -= 2

    bbox = draw.textbbox((0, 0), TEXT, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (W - tw) // 2 - bbox[0]
    y = (H - th) // 2 - bbox[1]
    draw.text((x, y), TEXT, fill=FG, font=font)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT}", file=sys.stderr)


if __name__ == "__main__":
    main()
