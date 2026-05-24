import { Container, Graphics } from "pixi.js";
import { palette } from "../artDirection";
import { arenaPosition, mainPath, oldStreetPath, pierPath } from "../mapConfig";
import type { WorldPoint } from "../types";
import { drawCurvedPath } from "./drawing";

export class PathLayer {
  constructor(private readonly layer: Container) {
    this.draw();
  }

  private draw() {
    this.addCurvedPath(mainPath, 46, palette.woodDark, 0.16);
    this.addCurvedPath(mainPath, 31, 0xffe8ae, 0.95);
    this.addCurvedPath(mainPath, 7, palette.sandInk, 0.24);
    this.addCurvedPath(oldStreetPath, 34, palette.oldStreetDark, 0.28);
    this.addCurvedPath(oldStreetPath, 19, 0xffd996, 0.92);
    this.drawNeighborhoodTrails();
    this.addCurvedPath(pierPath, 42, palette.woodDark, 0.58);
    this.addCurvedPath(pierPath, 19, palette.woodLight, 0.9);

    const g = new Graphics();

    for (let i = 0; i < pierPath.length - 1; i += 1) {
      const p = pierPath[i];
      g.roundRect(p.x - 34, p.y - 10, 68, 20, 5).fill({ color: palette.woodLight, alpha: 0.92 }).stroke({
        width: 2,
        color: 0xffe3a9,
        alpha: 0.35,
      });
    }

    g.ellipse(arenaPosition.x, arenaPosition.y + 42, 282, 92).fill({ color: palette.inkShadow, alpha: 0.14 });
    g.ellipse(arenaPosition.x, arenaPosition.y + 14, 250, 82).fill(palette.arenaDark);
    g.ellipse(arenaPosition.x, arenaPosition.y, 244, 76).fill(0xffefbd).stroke({ width: 10, color: palette.arena, alpha: 0.82 });
    g.ellipse(arenaPosition.x, arenaPosition.y, 164, 46).stroke({ width: 5, color: palette.accent, alpha: 0.8 });
    for (let i = -2; i <= 2; i += 1) {
      g.rect(arenaPosition.x + i * 78 - 6, arenaPosition.y - 116, 12, 84).fill(palette.woodDark);
      g.poly([arenaPosition.x + i * 78 + 6, arenaPosition.y - 116, arenaPosition.x + i * 78 + 54, arenaPosition.y - 100, arenaPosition.x + i * 78 + 6, arenaPosition.y - 82]).fill(
        i % 2 ? palette.accent : palette.roofRed,
      );
    }
    this.layer.addChild(g);
  }

  private drawNeighborhoodTrails() {
    const trails: WorldPoint[][] = [
      [
        { x: 912, y: 834 },
        { x: 790, y: 745 },
        { x: 650, y: 690 },
        { x: 502, y: 652 },
      ],
      [
        { x: 705, y: 940 },
        { x: 560, y: 990 },
        { x: 418, y: 940 },
      ],
      [
        { x: 760, y: 1116 },
        { x: 640, y: 1172 },
        { x: 520, y: 1088 },
      ],
      [
        { x: 1472, y: 632 },
        { x: 1605, y: 542 },
        { x: 1748, y: 488 },
        { x: 1900, y: 560 },
      ],
      [
        { x: 1778, y: 1028 },
        { x: 1684, y: 910 },
        { x: 1518, y: 920 },
      ],
      [
        { x: 1790, y: 1038 },
        { x: 1878, y: 1120 },
        { x: 1968, y: 1074 },
      ],
      [
        { x: 1120, y: 1002 },
        { x: 1168, y: 1082 },
        { x: 1240, y: 1160 },
      ],
    ];

    trails.forEach((trail) => {
      this.addCurvedPath(trail, 24, palette.woodDark, 0.13);
      this.addCurvedPath(trail, 14, 0xfff0ba, 0.78);
      this.addCurvedPath(trail, 3, palette.sandInk, 0.18);
    });

    const stones = new Graphics();
    [
      { x: 1540, y: 650 },
      { x: 1608, y: 616 },
      { x: 1682, y: 602 },
      { x: 1748, y: 632 },
      { x: 1826, y: 662 },
    ].forEach((point, index) => {
      stones.ellipse(point.x, point.y, 26 - (index % 2) * 4, 9).fill({ color: palette.pearlWhite, alpha: 0.76 }).stroke({
        width: 2,
        color: palette.oceanDarkLine,
        alpha: 0.24,
      });
    });
    this.layer.addChild(stones);
  }

  private addCurvedPath(points: WorldPoint[], width: number, color: number, alpha: number) {
    const path = new Graphics();
    drawCurvedPath(path, points, width, color, alpha);
    this.layer.addChild(path);
  }
}
