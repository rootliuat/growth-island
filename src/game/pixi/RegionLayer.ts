import { Container, Graphics } from "pixi.js";
import { regions } from "../regionConfig";
import { cameraConfig } from "../cameraConfig";
import type { RegionId } from "../types";

export class RegionLayer {
  constructor(
    private readonly layer: Container,
    private readonly onFocusRegion: (regionId: RegionId, x: number, y: number, zoom: number) => void,
  ) {
    this.draw();
  }

  private draw() {
    regions.forEach((region) => {
      const g = new Graphics();
      g.ellipse(region.center.x + 10, region.center.y + 15, region.radiusX, region.radiusY).fill({
        color: 0x1e2a24,
        alpha: 0.09,
      });
      g.ellipse(region.center.x, region.center.y, region.radiusX, region.radiusY).fill({
        color: region.color,
        alpha: 0.68,
      });
      g.ellipse(region.center.x - region.radiusX * 0.18, region.center.y - region.radiusY * 0.18, region.radiusX * 0.42, region.radiusY * 0.28).fill({
        color: 0xffffff,
        alpha: 0.16,
      });
      g.ellipse(region.center.x, region.center.y, region.radiusX, region.radiusY).stroke({
        width: 5,
        color: 0xfff6d1,
        alpha: 0.35,
      });
      g.eventMode = "static";
      g.cursor = "pointer";
      g.on("pointertap", () => this.onFocusRegion(region.id, region.center.x, region.center.y, cameraConfig.communityZoom));
      this.layer.addChild(g);
    });
  }
}
