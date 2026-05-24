#!/usr/bin/env python3
"""Post-process the newest built-in image_gen PNG for the next batch asset."""

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


def alpha_ok(path: Path) -> bool:
    if not path.exists():
        return False
    result = subprocess.run(
        [sys.executable, str(CHECK_ALPHA), str(path)],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def next_asset(batch: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    for index, asset in enumerate(batch["assets"]):
        if not alpha_ok(ROOT / asset["finalImagePath"]):
            return index, asset
    raise SystemExit("All batch assets already have alpha-valid final files.")


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


def run_remove(source: Path, final: Path, edge_contract: int = 0) -> subprocess.CompletedProcess[str]:
    command = [
        sys.executable,
        str(REMOVE_KEY),
        "--input",
        str(source),
        "--out",
        str(final),
        "--auto-key",
        "border",
        "--soft-matte",
        "--transparent-threshold",
        "12",
        "--opaque-threshold",
        "220",
        "--despill",
        "--force",
    ]
    if edge_contract:
        command.extend(["--edge-contract", str(edge_contract)])
    return subprocess.run(command, capture_output=True, text=True)


def update_record(
    manifest: dict[str, Any],
    asset: dict[str, Any],
    source: Path,
    final_rel: Path,
    status: str,
    notes: str,
) -> None:
    key = (asset["spiritId"], asset["slug"], asset["state"])
    for record in manifest["assets"]:
        record_key = (record.get("spiritId"), record.get("slug"), record.get("state"))
        if record_key == key:
            record["sourceImagePath"] = str(source).replace("\\", "/")
            record["finalImagePath"] = str(final_rel).replace("\\", "/")
            record["reviewStatus"] = status
            record["notes"] = notes
            return
    raise SystemExit(f"Manifest record not found for {key}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--status", choices=["pending", "needs_revision"], default=None)
    parser.add_argument("--notes", default="")
    args = parser.parse_args()

    batch = load_json(BATCH_PATH)
    manifest = load_json(MANIFEST_PATH)
    index, asset = next_asset(batch)
    source = latest_png()
    source_string = str(source).replace("\\", "/")
    used_sources = {
        item.get("sourceImagePath", "").replace("\\", "/")
        for item in manifest["assets"]
        if item.get("sourceImagePath")
    }
    if source_string in used_sources:
        raise SystemExit(f"Latest source image is already recorded: {source}")

    final_rel = Path(asset["finalImagePath"])
    final = ROOT / final_rel
    try:
        final.relative_to(FINAL_ROOT)
    except ValueError as exc:
        raise SystemExit(f"Final path is outside spirits directory: {final}") from exc

    status = args.status or "pending"
    notes = args.notes

    removal = run_remove(source, final)
    print(f"index {index}")
    print(f"asset {asset['spiritId']} {asset['slug']} {asset['state']}")
    print(f"source {source}")
    print(f"final {final}")
    print(removal.stdout, end="")
    if removal.stderr:
        print(removal.stderr, file=sys.stderr, end="")

    if removal.returncode != 0:
        status = "needs_revision"
        notes = "chroma-key removal failed: " + (
            removal.stderr.strip() or removal.stdout.strip()
        )[:300]
    else:
        check = subprocess.run(
            [sys.executable, str(CHECK_ALPHA), str(final)],
            capture_output=True,
            text=True,
        )
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
                print(
                    f"visible {visible} partial {partial} key_like_visible {key_like}"
                )
                if visible and key_like / visible > 0.002:
                    retry = run_remove(source, final, edge_contract=1)
                    print("retry_edge_contract 1")
                    print(retry.stdout, end="")
                    if retry.returncode == 0 and alpha_ok(final):
                        key_color = parse_key_color(retry.stdout) or key_color
                        visible, partial, key_like = visible_key_pixels(final, key_color)
                        print(
                            f"retry_visible {visible} partial {partial} "
                            f"key_like_visible {key_like}"
                        )
                    if visible and key_like / visible > 0.002:
                        status = "needs_revision"
                        notes = (
                            "visible chroma-key fringe too high after retry: "
                            f"{key_like}/{visible} key-like pixels"
                        )

    if args.status == "needs_revision" and args.notes:
        status = "needs_revision"
        notes = args.notes

    update_record(manifest, asset, source, final_rel, status, notes)
    save_manifest(manifest)
    alpha_valid_count = sum(
        1 for item in batch["assets"] if alpha_ok(ROOT / item["finalImagePath"])
    )
    print(f"manifest_status {status}")
    if notes:
        print(f"manifest_notes {notes}")
    print(f"alpha_valid_count {alpha_valid_count}")


if __name__ == "__main__":
    main()
