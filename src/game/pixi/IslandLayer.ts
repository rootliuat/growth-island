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
    g.poly(top).stroke({ width: 54, color: palette.oceanDarkLine, alpha: 0.12, join: "round" });
    g.poly(top).stroke({ width: 34, color: palette.oceanLightLine, alpha: 0.24, join: "round" });
    g.poly(top).stroke({ width: 18, color: 0xfff6cf, alpha: 0.2, join: "round" });
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
    this.drawIslandStrata(g);

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
    this.drawCoastFoam(g);
    this.layer.addChild(g);
  }

  private drawIslandStrata(g: Graphics) {
    const strata = [
      [
        { x: 252, y: 1018 },
        { x: 438, y: 1090 },
        { x: 650, y: 1110 },
      ],
      [
        { x: 780, y: 1276 },
        { x: 1030, y: 1324 },
        { x: 1320, y: 1320 },
      ],
      [
        { x: 1518, y: 1300 },
        { x: 1790, y: 1246 },
        { x: 2012, y: 1124 },
      ],
      [
        { x: 2038, y: 712 },
        { x: 2130, y: 850 },
        { x: 2078, y: 1010 },
      ],
    ];

    strata.forEach(([start, control, end], index) => {
      g.moveTo(start.x, start.y);
      g.quadraticCurveTo(control.x, control.y, end.x, end.y);
      g.stroke({
        width: index === 1 ? 8 : 6,
        color: palette.sandInk,
        alpha: 0.13,
        cap: "round",
      });
      g.moveTo(start.x + 18, start.y + 18);
      g.quadraticCurveTo(control.x + 16, control.y + 12, end.x - 20, end.y + 16);
      g.stroke({ width: 3, color: 0xfff1be, alpha: 0.33, cap: "round" });
    });
  }

  private drawCoastFoam(g: Graphics) {
    const foamLines = [
      [
        { x: 238, y: 1110 },
        { x: 358, y: 1172 },
        { x: 520, y: 1188 },
      ],
      [
        { x: 840, y: 1320 },
        { x: 1010, y: 1368 },
        { x: 1210, y: 1354 },
      ],
      [
        { x: 1538, y: 1326 },
        { x: 1736, y: 1288 },
        { x: 1954, y: 1198 },
      ],
      [
        { x: 2076, y: 566 },
        { x: 2134, y: 704 },
        { x: 2094, y: 838 },
      ],
    ];
    foamLines.forEach(([start, control, end]) => {
      g.moveTo(start.x, start.y);
      g.quadraticCurveTo(control.x, control.y, end.x, end.y);
      g.stroke({ width: 6, color: 0xfff6cf, alpha: 0.32, cap: "round" });
      g.moveTo(start.x + 20, start.y + 20);
      g.quadraticCurveTo(control.x + 12, control.y + 12, end.x - 24, end.y + 12);
      g.stroke({ width: 3, color: palette.oceanLightLine, alpha: 0.3, cap: "round" });
    });
  }
}
