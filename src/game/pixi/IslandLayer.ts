import { Container } from "pixi.js";
import { assetScaleRules } from "../assetScaleRules";
import { growthTreePosition } from "../mapConfig";
import { mapSpread, spreadPoint } from "../mapLayout";
import { v4MapAssets } from "../v4MapAssets";
import { addAssetSprite } from "./assetSprites";

export class IslandLayer {
  constructor(private readonly layer: Container) {
    this.draw();
  }

  private draw() {
    const centerX = growthTreePosition.x;
    const centerY = spreadPoint({ x: 1210, y: 804 }).y;
    const islandWidth = assetScaleRules.island.shadowBaseWidth * mapSpread.island;
    addAssetSprite(this.layer, {
      id: "v4-island-shadow",
      url: v4MapAssets.islandShadow,
      x: centerX + 18,
      y: centerY + 72,
      width: islandWidth,
      alpha: 0.68,
    });
    addAssetSprite(this.layer, {
      id: "v4-island-side",
      url: v4MapAssets.islandSide,
      x: centerX,
      y: centerY + 58,
      width: islandWidth,
    });
    addAssetSprite(this.layer, {
      id: "v4-island-surface",
      url: v4MapAssets.islandSurface,
      x: centerX,
      y: centerY,
      width: assetScaleRules.island.surfaceBaseWidth * mapSpread.island,
    });
    addAssetSprite(this.layer, {
      id: "v4-shoreline-foam",
      url: v4MapAssets.shorelineFoam,
      x: centerX,
      y: centerY - 6,
      width: assetScaleRules.island.shorelineBaseWidth * mapSpread.island,
      alpha: 0.7,
    });
  }
}
