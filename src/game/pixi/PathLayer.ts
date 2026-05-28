import { Container } from "pixi.js";
import { v4PathPlacements } from "../v4MapAssets";
import { addAssetSprite } from "./assetSprites";

export class PathLayer {
  constructor(private readonly layer: Container) {
    this.draw();
  }

  private draw() {
    this.layer.sortableChildren = true;
    v4PathPlacements.forEach((placement) => {
      addAssetSprite(this.layer, {
        id: placement.id,
        url: placement.url,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        alpha: placement.alpha ?? 1,
        rotation: placement.rotation,
        anchorX: placement.anchor?.x,
        anchorY: placement.anchor?.y,
        zIndex: placement.zIndex,
      });
    });
  }
}
