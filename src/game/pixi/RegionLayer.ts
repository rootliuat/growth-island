import { Container, Graphics } from "pixi.js";
import { regions } from "../regionConfig";
import { cameraConfig } from "../cameraConfig";
import { palette } from "../artDirection";
import type { RegionId } from "../types";
import { drawOrganicPolygon, flatten } from "./drawing";

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
      g.poly(region.shape.map((point) => [point.x + 12, point.y + 18]).flat()).fill({
        color: palette.inkShadow,
        alpha: 0.1,
      });
      drawOrganicPolygon(g, region.shape, region.color, region.accent, {
        fillAlpha: 0.92,
        strokeAlpha: 0.36,
        strokeWidth: 5,
      });
      this.drawTerrainDetails(g, region.id);
      g.eventMode = "static";
      g.cursor = "pointer";
      g.on("pointertap", () => this.onFocusRegion(region.id, region.center.x, region.center.y, cameraConfig.communityZoom));
      this.layer.addChild(g);
    });
  }

  private drawTerrainDetails(g: Graphics, regionId: RegionId) {
    if (regionId === "mangrove") {
      [
        [
          { x: 350, y: 520 },
          { x: 492, y: 448 },
          { x: 625, y: 500 },
          { x: 575, y: 640 },
          { x: 412, y: 650 },
        ],
        [
          { x: 680, y: 612 },
          { x: 842, y: 562 },
          { x: 935, y: 672 },
          { x: 806, y: 758 },
          { x: 650, y: 730 },
        ],
      ].forEach((points) => g.poly(flatten(points)).fill({ color: palette.grassDark, alpha: 0.22 }));
      for (let i = 0; i < 9; i += 1) {
        const x = 360 + i * 70;
        const y = 710 - (i % 3) * 82;
        g.moveTo(x, y);
        g.quadraticCurveTo(x + 28, y - 20, x + 58, y - 6);
        g.stroke({ width: 3, color: palette.grassDark, alpha: 0.3, cap: "round" });
      }
      return;
    }

    if (regionId === "shell-bay") {
      for (let i = 0; i < 11; i += 1) {
        const x = 300 + i * 66;
        const y = 1010 + Math.sin(i * 1.7) * 96;
        g.arc(x, y, 19, Math.PI, 0).stroke({ width: 3, color: palette.sandInk, alpha: 0.22 });
      }
      g.moveTo(270, 1168).quadraticCurveTo(510, 1222, 730, 1185).quadraticCurveTo(878, 1162, 972, 1215);
      g.stroke({ width: 4, color: 0xfff0ba, alpha: 0.54, cap: "round" });
      return;
    }

    if (regionId === "pearl-bay") {
      g.poly(
        flatten([
          { x: 1514, y: 476 },
          { x: 1720, y: 410 },
          { x: 2005, y: 512 },
          { x: 1958, y: 724 },
          { x: 1650, y: 720 },
          { x: 1468, y: 610 },
        ]),
      ).fill({ color: palette.pearlWater, alpha: 0.58 });
      for (let i = 0; i < 7; i += 1) {
        g.circle(1540 + i * 84, 540 + Math.sin(i) * 80, 14 + (i % 3) * 8).fill({ color: palette.pearlWhite, alpha: 0.58 });
      }
      return;
    }

    if (regionId === "sun-town") {
      for (let i = 0; i < 4; i += 1) {
        g.roundRect(1450 + i * 138, 1015 + (i % 2) * 88, 80, 34, 10).fill({ color: palette.grassLight, alpha: 0.52 });
        g.circle(1472 + i * 138, 1033 + (i % 2) * 88, 6).fill(palette.flowerPink);
        g.circle(1502 + i * 138, 1035 + (i % 2) * 88, 6).fill(palette.flowerYellow);
      }
      return;
    }

    if (regionId === "math-arena") {
      g.ellipse(1240, 1160, 230, 76).fill({ color: 0xffefc2, alpha: 0.88 });
      g.ellipse(1240, 1160, 286, 105).stroke({ width: 14, color: palette.arenaDark, alpha: 0.36 });
      g.ellipse(1240, 1160, 176, 48).stroke({ width: 5, color: palette.accent, alpha: 0.75 });
      return;
    }

    if (regionId === "old-street") {
      for (let i = 0; i < 5; i += 1) {
        g.roundRect(840 + i * 126, 405 + (i % 2) * 42, 98, 42, 8).fill({ color: palette.wallLight, alpha: 0.48 });
      }
    }
  }
}
