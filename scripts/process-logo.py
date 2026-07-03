#!/usr/bin/env python3
"""Process logo-source.png into app icons and wordmark assets."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Install Pillow: pip install pillow", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
APP = ROOT / "src" / "app"
SOURCE = PUBLIC / "logo-source.png"
THRESHOLD = 235


def strip_background(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r >= THRESHOLD and g >= THRESHOLD and b >= THRESHOLD:
                pixels[x, y] = (r, g, b, 0)
    return img


def content_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    pixels = img.load()
    width, height = img.size
    min_x, min_y = width, height
    max_x, max_y = 0, 0
    found = False
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a < 10:
                continue
            if r >= THRESHOLD and g >= THRESHOLD and b >= THRESHOLD:
                continue
            found = True
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
    if not found:
        return 0, 0, width, height
    return min_x, min_y, max_x + 1, max_y + 1


def trim(img: Image.Image) -> Image.Image:
    box = content_bbox(img)
    return img.crop(box)


def crop_icon_square(img: Image.Image) -> Image.Image:
    """Square crop of the rounded app-icon badge (top artwork)."""
    width, height = img.size
    icon_bottom = int(height * 0.62)
    region = img.crop((0, 0, width, icon_bottom))
    box = content_bbox(region)
    left, top, right, bottom = box
    cx = (left + right) // 2
    cy = (top + bottom) // 2
    side = int(max(right - left, bottom - top) * 1.05)
    x0 = max(0, cx - side // 2)
    y0 = max(0, cy - side // 2)
    x1 = min(width, x0 + side)
    y1 = min(icon_bottom, y0 + side)
    cropped = region.crop((x0, y0, x1, y1))

    cw, ch = cropped.size
    side = max(cw, ch)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(cropped, ((side - cw) // 2, (side - ch) // 2), cropped)
    return square


def save_png(
    img: Image.Image,
    path: Path,
    max_width: int | None = None,
    max_height: int | None = None,
) -> None:
    out = img
    if max_width or max_height:
        w, h = out.size
        scale = 1.0
        if max_width:
            scale = min(scale, max_width / w)
        if max_height:
            scale = min(scale, max_height / h)
        if scale < 1.0:
            out = out.resize(
                (max(1, int(w * scale)), max(1, int(h * scale))),
                Image.Resampling.LANCZOS,
            )
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, "PNG", optimize=True)


def write_favicons(icon: Image.Image) -> None:
    square = icon.resize((512, 512), Image.Resampling.LANCZOS) if icon.size != (512, 512) else icon
    for size in (16, 32, 48, 192):
        save_png(square, PUBLIC / f"favicon-{size}.png", max_width=size, max_height=size)
    save_png(square, APP / "icon.png", max_width=32, max_height=32)
    save_png(square, APP / "apple-icon.png", max_width=180, max_height=180)


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    if not source.exists():
        print(f"Source image not found: {source}", file=sys.stderr)
        sys.exit(1)

    raw = strip_background(Image.open(source))
    full = trim(raw)
    icon = crop_icon_square(raw)

    save_png(full, PUBLIC / "logo.png", max_width=640)
    save_png(icon.resize((512, 512), Image.Resampling.LANCZOS), PUBLIC / "logo-icon.png")
    write_favicons(icon)

    print(f"logo.png: {Image.open(PUBLIC / 'logo.png').size}")
    print(f"logo-icon.png: {Image.open(PUBLIC / 'logo-icon.png').size}")
    print(f"icon.png: {Image.open(APP / 'icon.png').size}")
    print(f"apple-icon.png: {Image.open(APP / 'apple-icon.png').size}")


if __name__ == "__main__":
    main()
