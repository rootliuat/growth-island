import { Container, Graphics } from "pixi.js";
import { palette } from "../artDirection";
import { islandPolygon } from "../mapConfig";
import { flatten } from "./drawing";

export class IslandLayer {
  constructor(private readonly layer: Container) {
    this.draw();
  }

  private draw() {
    const top = flatten(islandPolygon);

    const g = new Graphics();
    g.ellipse(1215, 845, 1045, 545).fill({ color: palette.inkShadow, alpha: 0.14 });
    for (let i = 0; i < islandPolygon.length; i += 1) {
      const current = islandPolygon[i];
      const next = islandPolygon[(i + 1) % islandPolygon.length];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      const visibleSide = midY >= 920 || (midX > 1940 && midY >= 610);
      if (!visibleSide) continue;
      g.poly([current.x + 16, current.y + 42, next.x + 16, next.y + 42, next.x + 8, next.y + 28, current.x + 8, current.y + 28]).fill({
        color: palette.sandInk,
        alpha: 0.55,
      });
      g.poly([current.x, current.y, next.x, next.y, next.x + 8, next.y + 28, current.x + 8, current.y + 28]).fill(palette.sandSide);
    }
    g.poly(top).fill(palette.sandLight);
    g.poly(top).stroke({ width: 14, color: 0xffefbd, alpha: 0.9, join: "round" });
    g.poly(top).stroke({ width: 3, color: palette.sandInk, alpha: 0.2, join: "round" });

    const shelfShapes = [
      [
        { x: 255, y: 1075 },
        { x: 410, y: 1010 },
        { x: 626, y: 1040 },
        { x: 746, y: 1156 },
        { x: 590, y: 1230 },
        { x: 338, y: 1192 },
      ],
      [
        { x: 1528, y: 468 },
        { x: 1790, y: 412 },
        { x: 2036, y: 548 },
        { x: 1990, y: 712 },
        { x: 1704, y: 738 },
        { x: 1492, y: 610 },
      ],
      [
        { x: 824, y: 272 },
        { x: 1124, y: 226 },
        { x: 1414, y: 306 },
        { x: 1302, y: 404 },
        { x: 1008, y: 392 },
      ],
    ];
    shelfShapes.forEach((points) => {
      g.poly(flatten(points)).fill({ color: palette.sandMid, alpha: 0.42 });
      g.poly(flatten(points)).stroke({ width: 2, color: palette.sandInk, alpha: 0.12 });
    });

    for (let i = 0; i < islandPolygon.length; i += 1) {
      const current = islandPolygon[i];
      const next = islandPolygon[(i + 1) % islandPolygon.length];
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      if (midY < 930 || Math.abs(dy) > Math.abs(dx) * 1.8) continue;
      g.moveTo(current.x + dx * 0.18, current.y + dy * 0.18 + 18);
      g.quadraticCurveTo(midX, midY + 30, next.x - dx * 0.18, next.y - dy * 0.18 + 18);
      g.stroke({ width: 4, color: palette.sandInk, alpha: 0.18, cap: "round" });
    }
    this.layer.addChild(g);
  }
}
