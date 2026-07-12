# Energy Constellation Glyph Style Review

Date: 2026-06-04

Scope: seven Beihai Growth Island virtue-energy glyphs in `assets/generated/ui/energy-constellation/`.

## Verdict

Keep this batch accepted. Do not regenerate the full set.

The batch fits the current coastal fantasy HUD direction: shell, sand, sea, coral, leaf, water, pearl, crystal, and compass motifs. It does not read as horoscope or zodiac art, does not introduce a dark starfield theme, and does not look like generic SaaS/app icons.

## Checks

| Asset | Status | Style Notes | Follow-up |
|---|---|---|---|
| `energy-aijiaxiang-glyph.png` | Accepted | Warm home/shell read is on theme, but the icon is the busiest of the set. At 30-40 px it leans orange-fire/badge unless paired with its text label. | Keep for labeled energy cards. If a future icon-only wheel is built, generate a simpler little-house-shell variant. |
| `energy-jianchi-glyph.png` | Accepted | Strong leaf/root silhouette, cleanest small-size read. | No change. |
| `energy-youai-glyph.png` | Accepted | Sun-shell is clear and friendly, good match for growth plaza. | No change. |
| `energy-yongqi-glyph.png` | Accepted | Coral flame/shield is readable and child-safe. It shares warm red-orange energy with `aijiaxiang`. | Keep while labels are visible. If icon-only use is needed, emphasize shield curve more. |
| `energy-zhengjie-glyph.png` | Accepted | Wave/pearl read is distinct and coastal. | No change. |
| `energy-chuangxiang-glyph.png` | Accepted | Crystal spark is slightly magical, but still soft and child-safe, not dark/starfield. | No change. |
| `energy-guize-glyph.png` | Accepted | Compass shell is distinct and does not imply punishment/policing. | No change. |

## Technical Acceptance

- Final source set: `1254x1254` RGBA PNG.
- Runtime set: `256x256` RGBA PNG under `public/assets/ui/energy-constellation/`.
- Transparent corner alpha values are `0`.
- No detected green or magenta chroma-key edge residue.
- Runtime PNG payload is about `0.42 MB` total for the seven images in visual QA.

## UI Use Rules

- Keep text labels visible with the glyphs in the current energy card row.
- Do not use these seven as a full background or decorative starfield.
- Do not bake Chinese text into future image assets.
- Current acceptable display sizes: `30px`, `40px`, `48px`, `64px`.
- If a future icon-only mode removes labels, revisit `aijiaxiang` and `yongqi` first.

## Reference QA Artifacts

- Batch sheet: `assets/generated/ui/energy-constellation/energy-glyphs-batch1-qa.png`
- Style strip: `qa-artifacts/latest/energy-glyph-style-strip.png`
- Size check: `qa-artifacts/latest/energy-glyph-size-check.png`
- Frontend whiteboard screenshot: `qa-artifacts/latest/home-whiteboard.png`
