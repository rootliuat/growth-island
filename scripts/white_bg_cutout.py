#!/usr/bin/env python3
"""Remove simple white/plain backgrounds from generated map assets."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from tqdm import tqdm


def load_manifest(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data
    for key in ("items", "assets", "prompts"):
        if isinstance(data.get(key), list):
            return data[key]
    raise ValueError(f"Unsupported manifest shape: {path}")


def estimate_background(rgb: np.ndarray, sample: int) -> np.ndarray:
    h, w, _ = rgb.shape
    patches = [
        rgb[:sample, :sample],
        rgb[:sample, max(0, w - sample) :],
        rgb[max(0, h - sample) :, :sample],
        rgb[max(0, h - sample) :, max(0, w - sample) :],
    ]
    pixels = np.concatenate([p.reshape(-1, 3) for p in patches], axis=0)
    return np.median(pixels, axis=0).astype(np.float32)


def smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - edge0) / max(edge1 - edge0, 1e-6), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def alpha_from_white_bg(
    rgb: np.ndarray,
    bg: np.ndarray,
    low: float,
    high: float,
    saturation_weight: float,
    blur: float,
    floor: int,
) -> np.ndarray:
    f = rgb.astype(np.float32)
    diff = np.linalg.norm(f - bg[None, None, :], axis=2)
    maxc = f.max(axis=2)
    minc = f.min(axis=2)
    saturation = maxc - minc
    score = diff + saturation * saturation_weight
    alpha = smoothstep(low, high, score) * 255.0

    # Remove disconnected white border haze while keeping soft antialiasing.
    hard_fg = score > high
    bg_like = ~hard_fg
    flood = np.zeros((rgb.shape[0] + 2, rgb.shape[1] + 2), np.uint8)
    border_connected = bg_like.astype(np.uint8) * 255
    cv2.floodFill(border_connected, flood, (0, 0), 128)
    border_bg = border_connected == 128
    alpha[border_bg & (score < low)] = 0

    if blur > 0:
        k = max(3, int(round(blur)) * 2 + 1)
        alpha = cv2.GaussianBlur(alpha, (k, k), blur / 2)
    alpha = np.where(alpha < floor, 0, alpha)
    return np.clip(alpha, 0, 255).astype(np.uint8)


def process_one(source: Path, target: Path, args: argparse.Namespace) -> None:
    image = Image.open(source).convert("RGB")
    rgb = np.array(image)
    bg = estimate_background(rgb, args.corner_sample)
    alpha = alpha_from_white_bg(
        rgb,
        bg,
        low=args.low,
        high=args.high,
        saturation_weight=args.saturation_weight,
        blur=args.blur,
        floor=args.alpha_floor,
    )
    rgba = np.dstack([rgb, alpha])
    target.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(target)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--low", type=float, default=4.0)
    parser.add_argument("--high", type=float, default=28.0)
    parser.add_argument("--saturation-weight", type=float, default=0.35)
    parser.add_argument("--blur", type=float, default=0.8)
    parser.add_argument("--alpha-floor", type=int, default=2)
    parser.add_argument("--corner-sample", type=int, default=48)
    args = parser.parse_args()

    for item in tqdm(load_manifest(args.manifest), desc="white-bg cutout"):
        source = Path(item["sourceOutputPath"])
        target = args.out_dir / source.name
        process_one(source, target, args)


if __name__ == "__main__":
    main()
