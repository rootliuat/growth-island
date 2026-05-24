import { Container, Graphics } from "pixi.js";
import { arenaPosition, mainPath, oldStreetPath, pierPath } from "../mapConfig";
import type { WorldPoint } from "../types";

function drawPolyline(g: Graphics, points: WorldPoint[], width: number, color: number, alpha = 1) {
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    const midX = (prev.x + next.x) / 2;
    const midY = (prev.y + next.y) / 2;
    g.quadraticCurveTo(prev.x, prev.y, midX, midY);
  }
  g.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  g.stroke({ width, color, alpha, cap: "round", join: "round" });
}

export class PathLayer {
  constructor(private readonly layer: Container) {
    this.draw();
  }

  private draw() {
    const g = new Graphics();
    drawPolyline(g, mainPath, 42, 0x6b4a2f, 0.16);
    drawPolyline(g, mainPath, 28, 0xffe7a8, 0.92);
    drawPolyline(g, mainPath, 5, 0xb4844a, 0.32);
    drawPolyline(g, oldStreetPath, 28, 0xa65e42, 0.34);
    drawPolyline(g, oldStreetPath, 16, 0xffdb98, 0.86);
    drawPolyline(g, pierPath, 34, 0x6b4934, 0.52);

    for (let i = 0; i < pierPath.length - 1; i += 1) {
      const p = pierPath[i];
      g.rect(p.x - 28, p.y - 8, 56, 16).fill({ color: 0x8c6240, alpha: 0.9 }).stroke({ width: 2, color: 0xffe3a9, alpha: 0.35 });
    }

    g.ellipse(arenaPosition.x, arenaPosition.y + 42, 260, 88).fill({ color: 0x47386f, alpha: 0.2 });
    g.ellipse(arenaPosition.x, arenaPosition.y, 230, 72).fill(0xfff0bd).stroke({ width: 8, color: 0x7f6bd6, alpha: 0.75 });
    g.ellipse(arenaPosition.x, arenaPosition.y, 155, 42).stroke({ width: 5, color: 0xe3b74e, alpha: 0.8 });
    this.layer.addChild(g);
  }
}
