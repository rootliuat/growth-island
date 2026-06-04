# Energy Constellation Batch 2 VFX Plan

Date: 2026-06-04

Purpose: small reusable VFX assets for the child self-service loop. These should support the existing CSS/Pixi flow, not replace the map or create a full constellation background.

## Priority

| Priority | Filename | Purpose | Recommended Size | Notes |
|---|---|---|---:|---|
| P1 | `energy-confirm-burst.png` | Teacher taps confirm, energy lights up. | `512x512` source, runtime `256x256` | Short-lived shell/star burst. No harsh flash. |
| P1 | `energy-arrival-orb.png` | Small orb traveling from teacher confirmation to the selected energy slot/spirit. | `512x512` source, runtime `128x128` | Round readable silhouette, transparent PNG. |
| P1 | `energy-touch-halo.png` | Current child taps their own spirit or mic. | `512x512` source, runtime `256x256` | Soft ring, no text, works on bright map. |
| P2 | `next-child-halo.png` | Marks next child after success. | `512x512` source, runtime `256x256` | Brighter edge than touch halo; still calm. |
| P2 | `energy-slot-current.png` | Current energy slot ready/lit state if CSS is not enough. | `512x512` source, runtime `128x128` | Generic, not category-specific. |
| P3 | `energy-slot-empty.png` | Optional inactive slot gem. | `512x512` source, runtime `128x128` | Very subtle. Avoid overpowering glyphs. |
| P3 | `energy-slot-lit.png` | Optional generic lit slot gem. | `512x512` source, runtime `128x128` | Only if card CSS feels too flat. |

## Do Not Generate

- Full constellation background.
- Decorative starfield.
- Seven large illustrated cards.
- Any asset with Chinese text.
- Any dark space/horoscope/zodiac motif.

## Prompt Template

Use one prompt per asset.

```text
Premium original fantasy RPG UI VFX sprite for Beihai Growth Island, kindergarten-safe coastal island learning game.
Subject: {purpose and motif}.
Style: polished 2D anime-fantasy game UI effect, shell/sand/sea/coral palette, soft magic glow, clean silhouette, readable on a bright coastal island map.
Composition: centered single VFX sprite, generous padding, no frame, no text, no logo, no watermark.
Background: perfectly flat solid {#ff00ff or #00ff00} chroma-key background for later alpha removal, with no shadows, floor, gradient, texture, or checkerboard.
Avoid: commercial IP, Pokemon, Sanrio, Disney, weapons, scary face, realistic 3D render, plastic toy render, horoscope, zodiac, dark starfield, harsh flash.
```

## Asset-Specific Prompt Notes

| Filename | Prompt Subject |
|---|---|
| `energy-confirm-burst.png` | warm shell-and-star confirmation burst, soft gold and coral, short celebratory spark, child-safe and not explosive |
| `energy-arrival-orb.png` | small glowing pearl orb with tiny seafoam trail head, ready to travel across UI, soft gold core |
| `energy-touch-halo.png` | soft circular shell halo, pale seafoam and warm sand, subtle ripples, touch feedback ring |
| `next-child-halo.png` | friendly next-turn halo with small shell dots, slightly brighter rim, teal and gold, readable behind a spirit avatar |
| `energy-slot-current.png` | small pulsing-ready gem with shell rim, generic current energy state, no category color dominance |
| `energy-slot-empty.png` | subtle empty pearl-shell slot gem, low contrast, quiet inactive state |
| `energy-slot-lit.png` | generic lit pearl-shell slot gem, soft inner glow, still quieter than category glyphs |

## Acceptance Checklist

- Real transparent PNG after chroma-key removal.
- Transparent corner alpha values are `0`.
- Readable at intended runtime size.
- Does not obscure child names, teacher card, or energy glyphs.
- Looks like Growth Island HUD feedback, not battle or explosion feedback.
- Does not increase idle home clutter.

## Suggested New-Window Prompt

```text
Use $beihai-energy-constellation-imagegen to generate Batch 2 VFX prompts for Growth Island energy confirmation: energy-confirm-burst, energy-arrival-orb, energy-touch-halo, next-child-halo, and optional slot gems. Do not generate a full constellation background. No Chinese text inside images. Produce source/final paths and a QA sheet.
```
