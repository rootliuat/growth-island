# Style Bible

## Core Direction

Use a high-finish original fantasy spirit companion RPG style. The project is for kindergarten children, but the art should feel premium and collectible, not like low-detail classroom clip art.

Approved direction:

- Original fantasy spirit companions, not ordinary pets.
- Mix animals, plants, stars, moon, crystals, elements, books, math magic, and small spirit entities.
- Use polished 2D anime fantasy illustration with clean silhouettes and refined details.
- Make characters beautiful, gentle, and inviting, with luminous eyes and magical ornaments.
- Use colors freely: white-green-gold, blue-silver, pink-purple, orange-gold, black-gold, ice-blue, coral-pink, violet-teal, jade-white, and other harmonious palettes.

## Required Feel

- Premium fantasy RPG companion.
- Original, collectible, and child-safe.
- Cute but not cheap.
- Magical but not aggressive.
- Detailed enough for character selection, readable enough for map placement.

## Visual Traits

- Rounded proportions and friendly expressions.
- Large luminous eyes, but not copied from any existing character.
- Delicate ornaments such as leaf crowns, star halos, crystal petals, ribbons, shells, runes, bells, clouds, flower buds, moon charms, or math sparks.
- Soft glow, small floating particles, and clean rim light.
- Clear full-body silhouette with generous padding.

## Avoid

- Do not copy Genshin Impact, Nahida, Pokemon, Digimon, Disney, Sanrio, or any commercial IP.
- Do not use an existing character's hairstyle, outfit structure, pose, symbols, UI, or color layout.
- No weapons, horror, sharp monster teeth, blood, scars, or punishment imagery.
- No text, logo, watermark, UI frame, or background scenery in sprite files.
- No realistic 3D render, plastic toy render, stock mascot, cheap sticker style, or generic clip art.

## Asset-Specific Style

- Spirit sprites: final files must have real alpha transparency. With the built-in image generator, create a flat chroma-key source first, then remove the key color locally and verify alpha.
- Eggs: distinctive fantasy eggs that preview the future spirit's motif.
- Maps: hand-painted fantasy island map with warm illustrated depth, not dark medieval fantasy.
- UI: shell, scroll, crystal, leaf, ribbon, and wood sign motifs; no traditional admin-dashboard look.
- Effects: readable game feedback with soft magic, sparkles, rings, bubbles, leaves, stars, and math glyphs.

## Transparency Policy

Do not rely on prompts that only say "transparent background." They may create a fake checkerboard background in an RGB PNG.

For production sprites:

1. Generate the source image on a perfectly flat chroma-key background.
2. Choose a key color absent from the character: use `#ff00ff` for green/jade/blue-heavy spirits and `#00ff00` for pink/purple/coral-heavy spirits.
3. Remove the chroma-key locally with the system imagegen helper.
4. Verify the final PNG has an alpha channel and transparent corner pixels.

Preview images can remain unprocessed, but they must not be treated as final game assets.
