#!/usr/bin/env python3
"""Batch cut out generated map assets with BiRefNet matting models."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch
from PIL import Image
from tqdm import tqdm
from transformers import AutoModelForImageSegmentation
from torchvision import transforms


IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def load_manifest(path: Path) -> list[dict]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data
    for key in ("items", "assets", "prompts"):
        if isinstance(data.get(key), list):
            return data[key]
    raise ValueError(f"Unsupported manifest shape: {path}")


def round_up_to_multiple(value: int, multiple: int) -> int:
    return ((value + multiple - 1) // multiple) * multiple


def get_model_output(output):
    if isinstance(output, (list, tuple)):
        return output[-1]
    if hasattr(output, "logits"):
        return output.logits
    if hasattr(output, "preds"):
        return output.preds[-1] if isinstance(output.preds, (list, tuple)) else output.preds
    return output


def build_transform(width: int, height: int, max_side: int) -> tuple[transforms.Compose, tuple[int, int]]:
    scale = min(max_side / max(width, height), 1.0)
    resized_w = max(32, round_up_to_multiple(int(round(width * scale)), 32))
    resized_h = max(32, round_up_to_multiple(int(round(height * scale)), 32))
    transform = transforms.Compose(
        [
            transforms.Resize((resized_h, resized_w), interpolation=transforms.InterpolationMode.BILINEAR),
            transforms.ToTensor(),
            transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ]
    )
    return transform, (resized_w, resized_h)


def cutout_one(
    image_path: Path,
    output_path: Path,
    model,
    device: torch.device,
    max_side: int,
    force_cpu: bool,
    alpha_floor: int,
) -> None:
    image = Image.open(image_path).convert("RGB")
    width, height = image.size
    transform, _ = build_transform(width, height, max_side)
    tensor = transform(image).unsqueeze(0).to(device)

    with torch.inference_mode():
        if device.type == "cuda" and not force_cpu:
            with torch.autocast(device_type="cuda", dtype=torch.float16):
                pred = get_model_output(model(tensor))
        else:
            pred = get_model_output(model(tensor))
        if isinstance(pred, (list, tuple)):
            pred = pred[-1]
        pred = pred.sigmoid().detach().float().cpu()

    mask = pred[0].squeeze()
    mask_image = transforms.ToPILImage()(mask).resize((width, height), Image.Resampling.LANCZOS)
    if alpha_floor > 0:
        mask_image = mask_image.point(lambda px: 0 if px < alpha_floor else px)

    rgba = image.convert("RGBA")
    rgba.putalpha(mask_image)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(output_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--model", default="ZhengPeng7/BiRefNet_dynamic-matting")
    parser.add_argument("--max-side", type=int, default=1536)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--alpha-floor", type=int, default=8)
    parser.add_argument("--cpu", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    items = load_manifest(args.manifest)
    if args.limit:
        items = items[: args.limit]

    device = torch.device("cpu" if args.cpu or not torch.cuda.is_available() else "cuda")
    dtype = torch.float16 if device.type == "cuda" else torch.float32
    model = AutoModelForImageSegmentation.from_pretrained(args.model, trust_remote_code=True)
    model.to(device=device, dtype=dtype)
    model.eval()

    for item in tqdm(items, desc="cutout"):
        source = Path(item["sourceOutputPath"])
        target = args.out_dir / source.name
        if target.exists() and not args.overwrite:
            continue
        cutout_one(source, target, model, device, args.max_side, args.cpu, args.alpha_floor)


if __name__ == "__main__":
    main()
