#!/usr/bin/env python3
"""Generate Beihai Growth Island prompt manifests from the canonical roster."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


STATE_LEVELS = {
    "egg-1": 1,
    "egg-2": 1,
    "egg-3": 1,
    "egg-4": 1,
    "lv2": 2,
    "lv3": 3,
    "lv4": 4,
    "lv5": 5,
    "lv6": 6,
    "lv7": 7,
    "lv8": 8,
}

STATE_NOTES = {
    "egg-1": "complete fantasy egg, no cracks, with motif markings",
    "egg-2": "same fantasy egg with small cracks and subtle inner glow",
    "egg-3": "same fantasy egg with a tiny eye, ear, leaf, horn, tail, or light peeking out",
    "egg-4": "same fantasy egg with the spirit's head or key feature emerging",
    "lv2": "newly hatched young companion, rounded and complete, previous Lv.1 concept",
    "lv3": "same young companion with richer colors and a small glowing charm",
    "lv4": "same companion with a virtue emblem or delicate magical pattern",
    "lv5": "same companion with more refined body details and polished ornaments",
    "lv6": "same companion with non-weapon equipment such as bell, book, crystal, ribbon, or badge",
    "lv7": "same companion with orbiting aura, star ring, leaf trail, glow ribbon, or elemental halo",
    "lv8": "same companion as a gentle guardian form, still cute and child-safe",
}


def find_workspace(start: Path) -> Path:
    for path in [start, *start.parents]:
        if (path / "assets").exists() or (path / "北海幼儿园德育成长岛项目书_v0.1.md").exists():
            return path
    raise SystemExit("Could not locate workspace root")


def read_roster(path: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    pattern = re.compile(r"^\|\s*(\d{2})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$")
    for line in path.read_text(encoding="utf-8").splitlines():
        match = pattern.match(line)
        if not match:
            continue
        spirit_id, name, slug, spirit_type, palette, concept = [part.strip() for part in match.groups()]
        rows.append(
            {
                "spiritId": spirit_id,
                "name": name,
                "slug": slug,
                "type": spirit_type,
                "palette": palette,
                "concept": concept,
            }
        )
    if len(rows) != 40:
        raise SystemExit(f"Expected 40 roster rows, found {len(rows)}")
    return rows


def prompt_for(spirit: dict[str, str], state: str) -> str:
    state_note = STATE_NOTES[state]
    key_color = choose_key_color(spirit["palette"])
    if state.startswith("egg"):
        subject = (
            f"Create an original fantasy spirit egg for {spirit['name']}, state {state}. "
            f"The egg previews this motif: {spirit['concept']}. Show {state_note}."
        )
    else:
        subject = (
            f"Create {spirit['name']} {state}, an original fantasy spirit companion. "
            f"Core concept: {spirit['concept']}. For this state, show {state_note}."
        )

    return "\n".join(
        [
            "Use case: stylized-concept",
            "Asset type: chroma-key source sprite for a transparent RPG game sprite in Beihai Growth Island",
            f"Primary request: {subject}",
            "Style/medium: premium original anime fantasy RPG companion, high-detail 2D illustration, refined magical creature or spirit design, beautiful but preschool-friendly.",
            f"Composition/framing: single centered full-body character or egg on a perfectly flat solid {key_color} chroma-key background for background removal, clean readable silhouette, generous padding.",
            "Lighting/mood: luminous eyes where applicable, soft magical glow, gentle inviting expression.",
            f"Color palette: {spirit['palette']}, with tasteful accent colors; do not force every character into the same palette.",
            "Materials/textures: delicate ornaments, soft fur, leaves, crystals, feathers, cloth-like magic, shell, paper, or starlight details as appropriate.",
            f"Constraints: original design, no text, no logo, no watermark, no UI, no weapon, no scary monster, no realistic 3D render, no checkerboard background, no cast shadow, no contact shadow, no floor plane. Do not use {key_color} anywhere in the subject.",
            "Avoid: copying commercial IP characters, outfits, symbols, poses, or color layouts; avoid cheap sticker style and generic classroom mascot look.",
        ]
    )


def choose_key_color(palette: str) -> str:
    lowered = palette.lower()
    magenta_conflicts = ["pink", "coral", "violet", "purple", "lilac", "rose", "red"]
    if any(token in lowered for token in magenta_conflicts):
        return "#00ff00"
    return "#ff00ff"


def make_entries(roster: list[dict[str, str]], states: list[str]) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    for spirit in roster:
        for state in states:
            entries.append(
                {
                    "spiritId": spirit["spiritId"],
                    "name": spirit["name"],
                    "slug": spirit["slug"],
                    "state": state,
                    "level": STATE_LEVELS[state],
                    "prompt": prompt_for(spirit, state),
                    "sourceImagePath": "",
                    "finalImagePath": f"assets/generated/spirits/{spirit['spiritId']}-{spirit['slug']}/{state}.png",
                    "reviewStatus": "pending",
                    "notes": "",
                }
            )
    return entries


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--states", default="egg-1,lv2", help="Comma-separated states to include")
    parser.add_argument("--out", default="assets/generated/batch-01-review-prompts.json")
    parser.add_argument("--update-manifest", action="store_true")
    args = parser.parse_args()

    script_path = Path(__file__).resolve()
    skill_root = script_path.parents[1]
    workspace = find_workspace(skill_root)
    roster = read_roster(skill_root / "references" / "spirit-roster.md")
    states = [state.strip() for state in args.states.split(",") if state.strip()]
    unknown = [state for state in states if state not in STATE_LEVELS]
    if unknown:
        raise SystemExit(f"Unknown states: {', '.join(unknown)}")

    entries = make_entries(roster, states)
    output_path = workspace / args.out
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps({"states": states, "count": len(entries), "assets": entries}, ensure_ascii=False, indent=2), encoding="utf-8")

    if args.update_manifest:
        manifest_path = workspace / "assets" / "generated" / "asset-manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        by_key = {(item["spiritId"], item["state"]): item for item in manifest.get("assets", [])}
        for entry in entries:
            by_key[(entry["spiritId"], entry["state"])] = entry
        manifest["assets"] = list(by_key.values())
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {len(entries)} prompt entries to {output_path}")


if __name__ == "__main__":
    main()
