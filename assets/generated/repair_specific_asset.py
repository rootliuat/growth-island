#!/usr/bin/env python3
"""Post-process a generated PNG into one specific batch asset."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import subprocess
import sys
from typing import Any

from PIL import Image


ROOT = Path(r"F:\TestCode\Points_game")
BATCH_PATH = ROOT / "assets/generated/batch-02-160-prompts.json"
MANIFEST_PATH = ROOT / "assets/generated/asset-manifest.json"
GENERATED_ROOT = Path(r"C:\Users\Rootliu\.codex\generated_images")
REMOVE_KEY = Path(
    r"C:\Users\Rootliu\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py"
)
CHECK_ALPHA = ROOT / ".agents/skills/beihai-asset-imagegen/scripts/check_alpha.py"
FINAL_ROOT = ROOT / "assets/generated/spirits"


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def save_manifest(manifest: dict[str, Any]) -> None:
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def latest_png() -> Path:
    files = list(GENERATED_ROOT.rglob("*.png"))
    if not files:
        raise SystemExit(f"No generated PNG files found under {GENERATED_ROOT}")
    return max(files, key=lambda path: path.stat().st_mtime_ns)


def parse_key_color(stdout: str) -> tuple[int, int, int] | None:
    for line in stdout.splitlines():
        if line.startswith("Key color: #"):
            value = line.split("#", 1)[1].strip()
            return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))
    return None


def visible_key_pixels(path: Path, key: tuple[int, int, int]) -> tuple[int, int, int]:
    visible = 0
    partial = 0
    key_like = 0
    with Image.open(path) as image:
        for red, green, blue, alpha in image.convert("RGBA").getdata():
            if not alpha:
                continue
            visible += 1
            partial += alpha < 255
            key_like += (
                max(abs(red - key[0]), abs(green - key[1]), abs(blue - key[2])) <= 40
            )
    return visible, partial, key_like


def alpha_ok(path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(CHECK_ALPHA), str(path)],
        capture_output=True,
        text=True,
    )


def find_asset(batch: dict[str, Any], spirit_id: str, slug: str, state: str) -> dict[str, Any]:
    target = (str(int(spirit_id)), slug, state)
    for asset in batch["assets"]:
        key = (str(int(asset["spiritId"])), asset["slug"], asset["state"])
        if key == target:
            return asset
    raise SystemExit(f"Batch asset not found: {target}")


def update_record(
    manifest: dict[str, Any],
    asset: dict[str, Any],
    source: Path,
    final_rel: Path,
    status: str,
    notes: str,
) -> None:
    target = (str(int(asset["spiritId"])), asset["slug"], asset["state"])
    for record in manifest["assets"]:
        key = (str(int(record.get("spiritId"))), record.get("slug"), record.get("state"))
        if key == target:
            record["sourceImagePath"] = str(source).replace("\\", "/")
            record["finalImagePath"] = str(final_rel).replace("\\", "/")
            record["reviewStatus"] = status
            record["notes"] = notes
            return
    raise SystemExit(f"Manifest record not found for {target}")


def run_remove(
    source: Path,
    final: Path,
    key_color: str | None,
    transparent_threshold: int,
    opaque_threshold: int,
    edge_contract: int,
    edge_feather: float,
) -> subprocess.CompletedProcess[str]:
    command = [
        sys.executable,
        str(REMOVE_KEY),
        "--input",
        str(source),
        "--out",
        str(final),
        "--soft-matte",
        "--transparent-threshold",
        str(transparent_threshold),
        "--opaque-threshold",
        str(opaque_threshold),
        "--despill",
        "--force",
    ]
    if key_color:
        command.extend(["--key-color", key_color])
    else:
        command.extend(["--auto-key", "border"])
    if edge_contract:
        command.extend(["--edge-contract", str(edge_contract)])
    if edge_feather:
        command.extend(["--edge-feather", str(edge_feather)])
    return subprocess.run(command, capture_output=True, text=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--spirit-id", required=True)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--state", required=True)
    parser.add_argument("--batch-path", default=str(BATCH_PATH))
    parser.add_argument("--source", default="latest")
    parser.add_argument("--key-color", default=None)
    parser.add_argument("--transparent-threshold", type=int, default=12)
    parser.add_argument("--opaque-threshold", type=int, default=220)
    parser.add_argument("--edge-contract", type=int, default=0)
    parser.add_argument("--edge-feather", type=float, default=0)
    parser.add_argument("--status", choices=["pending", "needs_revision"], default="pending")
    parser.add_argument("--notes", default="")
    args = parser.parse_args()

    batch = load_json(Path(args.batch_path))
    manifest = load_json(MANIFEST_PATH)
    asset = find_asset(batch, args.spirit_id, args.slug, args.state)
    source = latest_png() if args.source == "latest" else Path(args.source)
    if not source.exists():
        raise SystemExit(f"Source image does not exist: {source}")

    final_rel = Path(asset["finalImagePath"])
    final = ROOT / final_rel
    try:
        final.resolve().relative_to(FINAL_ROOT.resolve())
    except ValueError as exc:
        raise SystemExit(f"Final path is outside spirits directory: {final}") from exc

    removal = run_remove(
        source,
        final,
        args.key_color,
        args.transparent_threshold,
        args.opaque_threshold,
        args.edge_contract,
        args.edge_feather,
    )
    print(f"asset {asset['spiritId']} {asset['slug']} {asset['state']}")
    print(f"source {source}")
    print(f"final {final}")
    print(removal.stdout, end="")
    if removal.stderr:
        print(removal.stderr, file=sys.stderr, end="")

    status = args.status
    notes = args.notes
    if removal.returncode != 0:
        status = "needs_revision"
        notes = "chroma-key removal failed: " + (
            removal.stderr.strip() or removal.stdout.strip()
        )[:300]
    else:
        check = alpha_ok(final)
        print(check.stdout, end="")
        if check.stderr:
            print(check.stderr, file=sys.stderr, end="")
        if check.returncode != 0:
            status = "needs_revision"
            notes = "alpha validation failed: " + (
                check.stdout.strip() or check.stderr.strip()
            )[:300]
        else:
            key_color = parse_key_color(removal.stdout)
            if key_color is not None:
                visible, partial, key_like = visible_key_pixels(final, key_color)
                print(f"visible {visible} partial {partial} key_like_visible {key_like}")
                if visible and key_like / visible > 0.002 and status == "pending":
                    status = "needs_revision"
                    notes = (
                        "visible chroma-key fringe too high after repair: "
                        f"{key_like}/{visible} key-like pixels"
                    )

    update_record(manifest, asset, source, final_rel, status, notes)
    save_manifest(manifest)
    print(f"manifest_status {status}")
    if notes:
        print(f"manifest_notes {notes}")


if __name__ == "__main__":
    main()
