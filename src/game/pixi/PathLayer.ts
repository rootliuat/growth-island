import { Container, Graphics } from "pixi.js";
import { palette } from "../artDirection";
import { arenaPosition, mainPath, oldStreetPath, pierPath } from "../mapConfig";
import { drawCurvedPath } from "./drawing";

export class PathLayer {
  constructor(private readonly layer: Container) {
    this.draw();
  }

  private draw() {
    const g = new Graphics();
    drawCurvedPath(g, mainPath, 46, palette.woodDark, 0.16);
    drawCurvedPath(g, mainPath, 31, 0xffe8ae, 0.95);
    drawCurvedPath(g, mainPath, 7, palette.sandInk, 0.24);
    drawCurvedPath(g, oldStreetPath, 34, palette.oldStreetDark, 0.28);
    drawCurvedPath(g, oldStreetPath, 19, 0xffd996, 0.92);
    drawCurvedPath(g, pierPath, 42, palette.woodDark, 0.58);
    drawCurvedPath(g, pierPath, 19, palette.woodLight, 0.9);

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
}
