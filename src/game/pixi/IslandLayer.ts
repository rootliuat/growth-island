import { Container, Graphics } from "pixi.js";
import { palette } from "../artDirection";
import { islandPolygon } from "../mapConfig";
import { flatten } from "./drawing";

export class IslandLayer {
  constructor(private readonly layer: Container) {
    this.draw();
  }

  private draw() {
    const shadow = islandPolygon.flatMap((point) => [point.x + 34, point.y + 46]);
    const deepSide = islandPolygon.flatMap((point) => [point.x + 18, point.y + 52]);
    const thickness = islandPolygon.flatMap((point) => [point.x + 8, point.y + 28]);
    const top = flatten(islandPolygon);

    const g = new Graphics();
    g.poly(shadow).fill({ color: palette.inkShadow, alpha: 0.22 });
    g.poly(deepSide).fill({ color: palette.sandInk, alpha: 0.74 });
    g.poly(thickness).fill(palette.sandSide);
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
      g.moveTo(current.x, current.y + 16);
      g.quadraticCurveTo(midX, midY + 34, next.x, next.y + 16);
      g.stroke({ width: 4, color: palette.sandInk, alpha: 0.18, cap: "round" });
    }
    this.layer.addChild(g);
  }
}
