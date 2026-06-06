# 3D Asset License Notes

## P11 Three.js POC assets

These files are used only by the isolated 3D spirit showcase POC:

| Runtime file | Source file | Use |
| --- | --- | --- |
| `public/assets/3d/spirits/growth-sprite.gltf` | `model/ultimateplatformer/Character/glTF/Character.gltf` | Main friendly spirit preview |
| `public/assets/3d/spirits/cloudwing-sprite.gltf` | `model/ultimateplatformer/Enemies/glTF/Bee.gltf` | Flying spirit preview |
| `public/assets/3d/spirits/shellbay-sprite.gltf` | `model/ultimateplatformer/Enemies/glTF/Crab.gltf` | Coastal spirit preview |
| `public/assets/3d/props/growth-chest.gltf` | `model/ultimateplatformer/Level and Mechanics/glTF/Chest.gltf` | Growth chest prop |
| `public/assets/3d/props/growth-star.gltf` | `model/ultimateplatformer/Powerups and Pickups/glTF/Star.gltf` | Energy star prop |
| `public/assets/3d/props/growth-gem.gltf` | `model/ultimateplatformer/Powerups and Pickups/glTF/Gem_Green.gltf` | Reserved energy gem prop |

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

The POC does not make the main island a 3D map. The PixiJS map remains the source of truth for classroom self-service flow.
