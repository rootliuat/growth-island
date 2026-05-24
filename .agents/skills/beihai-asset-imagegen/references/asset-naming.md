# Asset Naming

## Directories

Project-bound generated assets live under:

```text
assets/generated/
  spirits/
  maps/
  ui/
  effects/
```

Each spirit gets one directory:

```text
assets/generated/spirits/{id}-{slug}/
```

Example:

```text
assets/generated/spirits/01-yueya-senling/
```

## Spirit Filenames

Use these exact filenames:

```text
egg-1.png
egg-2.png
egg-3.png
egg-4.png
lv2.png
lv3.png
lv4.png
lv5.png
lv6.png
lv7.png
lv8.png
```

Do not use Chinese filenames for final project assets. Chinese names remain in the manifest and roster only.

## Manifest

Maintain `assets/generated/asset-manifest.json`.

Each accepted asset entry should include:

```json
{
  "spiritId": "01",
  "name": "月芽森灵",
  "slug": "yueya-senling",
  "state": "lv2",
  "level": 2,
  "prompt": "...",
  "sourceImagePath": "C:/Users/Rootliu/.codex/generated_images/...",
  "finalImagePath": "assets/generated/spirits/01-yueya-senling/lv2.png",
  "reviewStatus": "accepted",
  "notes": ""
}
```

Use `pending`, `accepted`, `rejected`, or `needs_revision` for `reviewStatus`.

## Transparency Acceptance

Final spirit assets must be real transparent PNGs:

- Accepted modes: `RGBA` or `LA`.
- At least one corner pixel must have alpha `0`.
- RGB PNGs are rejected even when the background looks like a transparency checkerboard.
- Keep chroma-key source files outside the final path or record them in `sourceImagePath`.
