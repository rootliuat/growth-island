---
name: beihai-asset-imagegen
description: Generate consistent Beihai Growth Island image assets and prompts for fantasy spirit eggs, Lv.2-Lv.8 companions, maps, point slots, UI panels, and VFX. Use when producing or reviewing image_gen prompts, asset batches, naming, manifests, or visual consistency for the Beihai kindergarten gamified growth system.
---

# Beihai Asset Imagegen

Use this skill to create image prompts and review generated bitmap assets for the Beihai Growth Island project. The goal is a consistent asset library, not one-off illustrations.

## Workflow

1. Read `references/style-bible.md` before writing prompts or reviewing images.
2. Use `references/spirit-roster.md` for the canonical 40 spirit IDs, names, slugs, concepts, and palette directions.
3. Use `references/evolution-states.md` for the 11 required states per spirit.
4. Use `references/prompt-templates.md` to create prompts. Keep each prompt specific to one asset.
5. Save project-bound assets using `references/asset-naming.md`; update `assets/generated/asset-manifest.json` after files are accepted.

Use `scripts/build_prompt_manifest.py` to generate a review batch prompt manifest from the canonical roster. The default batch is `egg-1` and `lv2` for all 40 spirits.

## Generation Rules

- Generate distinct assets one at a time with the built-in `image_gen` tool unless the user explicitly requests CLI/API fallback.
- Do not batch all 440 spirit images before review. First generate `egg-1` and `lv2` for all 40 spirits, then wait for art direction approval.
- For production sprites, do not trust prompt-only "transparent background"; generators often paint a fake checkerboard. Generate a flat chroma-key source and remove it locally using the system imagegen helper, then verify the final PNG has a real alpha channel.
- Keep all assets original. Do not copy commercial IP characters, outfits, poses, UI, symbols, or compositions.
- Preserve continuity across a spirit's 11 states: each evolved form must clearly be the same creature or entity.

## Review Checklist

- The asset looks premium, original, and suitable for preschool children.
- The image has no text, logo, watermark, UI, weapon, scary expression, or commercial IP similarity.
- Final production sprite files must be RGBA or LA images with real transparent pixels; RGB images are not accepted even if they visually show a checkerboard.
- The silhouette remains readable when scaled down for a whiteboard map point.
- The state matches the requested egg or level state.
- Color variety is allowed, but the asset still belongs to the same fantasy growth-island world.
