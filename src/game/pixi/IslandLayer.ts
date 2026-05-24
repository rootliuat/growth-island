import { Container, Graphics } from "pixi.js";
import { islandPolygon } from "../mapConfig";

export class IslandLayer {
  constructor(private readonly layer: Container) {
    this.draw();
  }

  private draw() {
    const shadow = islandPolygon.flatMap((point) => [point.x + 34, point.y + 46]);
    const thickness = islandPolygon.flatMap((point) => [point.x + 8, point.y + 28]);
    const top = islandPolygon.flatMap((point) => [point.x, point.y]);

    const g = new Graphics();
    g.poly(shadow).fill({ color: 0x133333, alpha: 0.26 });
    g.poly(thickness).fill(0xa47752);
    g.poly(top).fill(0xf2d58a);
    g.poly(top).stroke({ width: 12, color: 0xfff3bf, alpha: 0.86 });
    g.poly(islandPolygon.map((point) => [point.x - 8, point.y - 10]).flat()).stroke({
      width: 3,
      color: 0x7c643c,
      alpha: 0.18,
    });
    g.ellipse(470, 1130, 340, 88).fill({ color: 0xffedba, alpha: 0.75 });
    g.ellipse(1850, 725, 300, 74).fill({ color: 0xd7f4ea, alpha: 0.28 });
    this.layer.addChild(g);
  }
}
