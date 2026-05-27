import { Container } from "pixi.js";
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
    const islandWidth = 2060 * mapSpread.island;
    addAssetSprite(this.layer, {
      id: "v4-island-shadow",
      url: v4MapAssets.islandShadow,
      x: centerX + 18,
      y: centerY + 72,
      width: islandWidth,
      alpha: 0.78,
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
      width: 2040 * mapSpread.island,
    });
    addAssetSprite(this.layer, {
      id: "v4-shoreline-foam",
      url: v4MapAssets.shorelineFoam,
      x: centerX,
      y: centerY - 6,
      width: 2085 * mapSpread.island,
      alpha: 0.78,
    });
  }
}
