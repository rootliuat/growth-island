# 3D Asset License Notes

## P11/P13 Three.js assets

These files are used by the isolated 3D spirit showcase and the bounded product surfaces added in P13:

| Runtime file | Source file | Use |
| --- | --- | --- |
| `public/assets/3d/spirits/growth-sprite.gltf` | `model/ultimateplatformer/Character/glTF/Character.gltf` | Main friendly spirit preview, profile cabin stage |
| `public/assets/3d/spirits/cloudwing-sprite.gltf` | `model/ultimateplatformer/Enemies/glTF/Bee.gltf` | Flying spirit preview, alternate profile cabin model |
| `public/assets/3d/spirits/shellbay-sprite.gltf` | `model/ultimateplatformer/Enemies/glTF/Crab.gltf` | Coastal spirit preview, alternate profile cabin model |
| `public/assets/3d/props/growth-chest.gltf` | `model/ultimateplatformer/Level and Mechanics/glTF/Chest.gltf` | Growth chest prop, shop reward preview |
| `public/assets/3d/props/growth-star.gltf` | `model/ultimateplatformer/Powerups and Pickups/glTF/Star.gltf` | Energy star prop, honor and success reward preview |
| `public/assets/3d/props/growth-gem.gltf` | `model/ultimateplatformer/Powerups and Pickups/glTF/Gem_Green.gltf` | Energy gem prop, shop reward preview |

Source pack:

- Ultimate Platformer Pack by Quaternius.
- Source license file: `model/ultimateplatformer/License.txt`.
- License: CC0 1.0 Universal Public Domain Dedication.
- Runtime assets were copied into `public/assets/3d/` and renamed for product semantics.

## Scope guard

The P11 POC does not use these source assets:

- `Character_Gun.gltf`, because it carries a weapon.
- `Skull.gltf`, because it reads as death or monster imagery.
- Cannons, bombs, spikes, saws, or other hazard assets, because they push the classroom product toward combat or obstacle-game language.

The Three.js surfaces do not make the main island a 3D map. The PixiJS map remains the source of truth for classroom self-service flow.

## P13 runtime placement

- `SpiritModelStage3D` is the shared bounded stage for 3D spirit display.
- `RewardModelPreview3D` is the shared compact stage for reward objects.
- The profile cabin uses the spirit stage with small decorative chest/star props.
- The moral success bubble, shop counter, and leaderboard selected child token use compact reward previews.
- Reward previews are `pointer-events: none`; the profile and showcase spirit stages are the only interactive drag surfaces.

## P15 baked island prop layer

P15 uses the same Ultimate Platformer Pack source license, but the runtime form is different:

- Source files remain under `model/ultimateplatformer/**/glTF/`.
- Runtime files are baked transparent WebP props under `public/assets/map/3d-props/p15/`.
- QA/source PNGs and the manifest are under `assets/generated/map-3d-props/p15/`.
- The main island still does not load these as live Three.js models. They are PixiJS map sprites.

P15 source model groups:

- Nature/home props: tree, fruit tree, bush, fruit bush, grass, rocks, large/small plants.
- Path props: small bridge, modular bridge, fences, door, small stairs.
- Reward/honor props: chest, coin, blue/green/pink gems, key, star, goal flag.

P15 runtime placement:

- The baked props are placed through the existing `v4MapAssets` and `mapPlacementConfig` pipeline.
- Home, path, shop, and honor areas get visible model-derived props.
- Only the shop chest and honor star/flag are interactive; decorative props do not intercept input.
- Self-service success adds a lightweight Pixi star arrival effect into the child's home.

The scope guard remains unchanged: weapon, skull, bomb, cannon, spike, saw, and other combat or hazard assets are not used.

## P16 baked village prop layer

P16 keeps the same runtime strategy as P15, but expands the source set:

- Ultimate Platformer Pack source files under `model/ultimateplatformer/**/glTF/`.
- Medieval Village source files under `model/medievalvillage/**/OBJ/`.
- Both packs include `License.txt` files with CC0 1.0 Universal Public Domain Dedication.
- Runtime files are baked transparent WebP props under `public/assets/map/3d-props/p16/`.
- QA/source PNGs and the manifest are under `assets/generated/map-3d-props/p16/`.
- The main island still loads these as PixiJS sprites, not live Three.js models.

P16 accepted source model groups:

- Home/cabin props: four village houses, stable, gazebo, benches, grass, fruit, and rock platforms.
- Shop props: two market stands, cart, barrel, crate, bags, open bag, and packages.
- Honor props: bell tower, bell, star outline, heart outline, and tower.
- Path props: fence, stairs, modular starting stair, and rock platforms.

P16 rejected source assets:

- `Inn.obj`, `Mill.obj`, and `Well.obj`, because the initial bake read as wireframe-like and too visually noisy against the soft island skin.
- Bonfire, smoke, cauldron, sawmill, sawmill saw, weapons, monsters, skulls, bombs, cannons, spikes, saws, traps, and other combat or hazard props.

P16 runtime placement:

- All 31 accepted props are placed through `v4MapAssets` and `mapPlacementConfig`.
- P16 props are initial-load map sprites like P15 props, so they are visible when the island appears.
- Only the growth heart, shop market stands, honor bell tower, and honor bell are interactive; decorative props do not intercept input.
- OBJ materials are brightened during baking so village props fit the shell/sand/sea/coral classroom palette.
