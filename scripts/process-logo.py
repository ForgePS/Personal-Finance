#!/usr/bin/env python3
"""Remove near-white background from a logo and save a transparent PNG."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Install Pillow: pip install pillow", file=sys.stderr)
    sys.exit(1)

SOURCE = Path(__file__).resolve().parent.parent / "public" / "logo-source.png"
OUTPUT = Path(__file__).resolve().parent.parent / "public" / "logo.png"
THRESHOLD = 235


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else OUTPUT

    if not source.exists():
        print(f"Source image not found: {source}", file=sys.stderr)
        sys.exit(1)

    img = Image.open(source).convert("RGBA")
    pixels = img.load()
    width, height = img.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r >= THRESHOLD and g >= THRESHOLD and b >= THRESHOLD:
                pixels[x, y] = (r, g, b, 0)

    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(output, "PNG")
    print(f"Wrote transparent logo to {output}")


if __name__ == "__main__":
    main()
