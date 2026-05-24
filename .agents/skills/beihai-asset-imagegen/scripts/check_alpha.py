#!/usr/bin/env python3
"""Check whether image files have real alpha transparency."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def check(path: Path) -> bool:
    image = Image.open(path)
    has_alpha = image.mode in ("RGBA", "LA") or "transparency" in image.info
    print(f"{path}: mode={image.mode} size={image.size} has_alpha={has_alpha}")
    if image.mode in ("RGBA", "LA"):
        alpha = image.getchannel("A")
        mn, mx = alpha.getextrema()
        corners = [
            alpha.getpixel((0, 0)),
            alpha.getpixel((image.width - 1, 0)),
            alpha.getpixel((0, image.height - 1)),
            alpha.getpixel((image.width - 1, image.height - 1)),
        ]
        print(f"  alpha_min={mn} alpha_max={mx} corner_alpha={corners}")
        return mn == 0 and min(corners) == 0
    return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+")
    args = parser.parse_args()
    ok = True
    for item in args.paths:
        ok = check(Path(item)) and ok
    raise SystemExit(0 if ok else 1)


if __name__ == "__main__":
    main()
