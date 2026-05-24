import { Container, Graphics, Rectangle, Text } from "pixi.js";
import { palette } from "../artDirection";
import { cameraConfig } from "../cameraConfig";
import type { WorldHome, WorldMapData } from "../types";

interface HomeNode {
  root: Container;
  halo: Graphics;
  plaque: Container;
  decor: Container;
}

export class HomeLayer {
  private readonly homeNodes = new Map<string, HomeNode>();
  private selectedChildId = "";

  constructor(
    private readonly layer: Container,
    private readonly onSelect: (childId: string) => void,
    private readonly onFocus: (x: number, y: number, zoom: number) => void,
  ) {}

  update(data: WorldMapData) {
    this.selectedChildId = data.selectedChildId;
    const activeIds = new Set(data.homes.map((home) => home.id));
    for (const [id, node] of this.homeNodes) {
      if (activeIds.has(id)) continue;
      node.root.destroy({ children: true });
      this.homeNodes.delete(id);
    }

    data.homes.forEach((home) => {
      let node = this.homeNodes.get(home.id);
      if (!node) {
        node = this.createHome(home);
        this.homeNodes.set(home.id, node);
        this.layer.addChild(node.root);
      }
      node.root.x = home.position.x;
      node.root.y = home.position.y;
      node.root.alpha = 1;
      node.root.scale.set(home.childId === this.selectedChildId ? 1.08 : 1);
      node.halo.visible = home.childId === this.selectedChildId;
    });
    this.layer.children.sort((a, b) => a.y - b.y);
  }

  pulse(childId: string) {
    const node = [...this.homeNodes.values()].find((item) => item.root.label === childId);
    if (!node) return;
    node.root.scale.set(1.18);
  }

  updateFrame(deltaMS: number) {
    this.homeNodes.forEach((node) => {
      const target = node.root.label === this.selectedChildId ? 1.08 : 1;
      const next = node.root.scale.x + (target - node.root.scale.x) * Math.min(1, deltaMS / 180);
      node.root.scale.set(next);
    });
  }

  updateZoom(zoom: number) {
    this.homeNodes.forEach((node) => {
      const selected = node.root.label === this.selectedChildId;
      node.plaque.visible = selected || zoom >= 1.45;
      node.decor.visible = selected || zoom >= 1.18;
      node.root.alpha = zoom < 0.72 && !selected ? 0.94 : 1;
    });
  }

  private createHome(home: WorldHome) {
    const node = new Container();
    node.label = home.childId;
    node.eventMode = "static";
    node.cursor = "pointer";
    node.hitArea = new Rectangle(-82, -112, 164, 188);
    node.on("pointertap", () => {
      this.onSelect(home.childId);
      this.onFocus(home.doorPosition.x, home.doorPosition.y + 12, cameraConfig.homeZoom);
    });

    const halo = new Graphics();
    halo.ellipse(0, 44, 98, 30).fill({ color: palette.accent, alpha: 0.22 });
    halo.ellipse(0, 44, 118, 38).stroke({ width: 3, color: 0xfff6c9, alpha: 0.48 });
    halo.visible = false;

    const body = new Graphics();
    this.drawHome(body, home);
    node.addChild(halo, body);

    const { decor, plaque } = this.drawLevelDecor(home);
    decor.visible = false;
    plaque.visible = false;
    node.addChild(decor, plaque);
    return { root: node, halo, decor, plaque };
  }

  private drawHome(g: Graphics, home: WorldHome) {
    g.ellipse(0, 58, 86, 22).fill({ color: palette.inkShadow, alpha: 0.16 });
    switch (home.type) {
      case "treehouse":
        this.drawTreehouse(g, home);
        break;
      case "shell":
        this.drawShellHouse(g, home);
        break;
      case "pearl":
        this.drawPearlHouse(g, home);
        break;
      case "tent":
        this.drawTentHouse(g, home);
        break;
      case "garden":
        this.drawGardenHouse(g, home);
        break;
      default:
        this.drawCottage(g, home);
    }

    if (home.level >= 5) {
      g.ellipse(0, 10, 92, 58).stroke({ width: 3, color: palette.accent, alpha: 0.45 });
    }
  }

  private drawTreehouse(g: Graphics, home: WorldHome) {
    g.roundRect(-14, -22, 28, 94, 9).fill(palette.woodDark);
    g.circle(-46, -64, 42).fill(palette.grassDark);
    g.circle(14, -82, 54).fill(palette.grassMid);
    g.circle(50, -48, 40).fill(palette.grassLight);
    g.roundRect(-58, -20, 116, 68, 14).fill(palette.woodLight).stroke({ width: 4, color: palette.woodDark, alpha: 0.42 });
    g.rect(-46, -5, 28, 24).fill(0xffe5a8);
    g.rect(20, -4, 28, 23).fill(0xffe5a8);
    g.poly([-68, -20, 0, -68, 68, -20]).fill(0xe8b46a).stroke({ width: 3, color: palette.woodDark, alpha: 0.35 });
    g.roundRect(-16, 16, 32, 36, 10).fill(palette.woodDark);
    g.moveTo(54, 38).lineTo(84, 78).stroke({ width: 5, color: palette.woodDark, alpha: 0.75, cap: "round" });
    for (let i = 0; i < 3; i += 1) g.moveTo(58 + i * 8, 46 + i * 10).lineTo(76 + i * 8, 46 + i * 10).stroke({ width: 3, color: palette.wallLight, alpha: 0.7 });
    if (home.level >= 4) g.poly([42, -60, 74, -50, 42, -38]).fill(home.accent);
  }

  private drawShellHouse(g: Graphics, home: WorldHome) {
    g.moveTo(-74, 18);
    g.arc(0, 18, 74, Math.PI, 0).fill(0xfff1bf).stroke({ width: 5, color: palette.sandInk, alpha: 0.36 });
    g.moveTo(-58, 20);
    g.arc(0, 20, 58, Math.PI, 0).stroke({ width: 3, color: palette.shellPink, alpha: 0.66 });
    for (let i = -4; i <= 4; i += 1) {
      g.moveTo(0, 18).lineTo(i * 16, -46 + Math.abs(i) * 7).stroke({ width: 2, color: palette.sandInk, alpha: 0.32 });
    }
    g.roundRect(-23, 8, 46, 48, 15).fill(palette.woodDark);
    g.circle(46, -5, 13).fill(palette.pearlWhite).stroke({ width: 2, color: home.accent, alpha: 0.48 });
    if (home.level >= 3) {
      g.circle(-56, 44, 8).fill(palette.shellPink);
      g.circle(60, 48, 7).fill(palette.flowerYellow);
    }
  }

  private drawPearlHouse(g: Graphics, home: WorldHome) {
    g.circle(0, -2, 60).fill(palette.pearlWhite).stroke({ width: 6, color: palette.oceanDarkLine, alpha: 0.36 });
    g.circle(-20, -22, 13).fill({ color: 0xffffff, alpha: 0.84 });
    g.circle(48, -20, 18).fill({ color: palette.pearlBay, alpha: 0.72 });
    g.circle(-58, 5, 13).fill({ color: palette.pearlBay, alpha: 0.68 });
    g.roundRect(-24, 18, 48, 40, 18).fill(0x6f9bad);
    g.rect(-46, 50, 92, 12).fill({ color: palette.oceanDarkLine, alpha: 0.24 });
    if (home.level >= 4) g.circle(0, -72, 9).fill(home.accent).stroke({ width: 2, color: 0xfff4c7, alpha: 0.6 });
  }

  private drawTentHouse(g: Graphics, home: WorldHome) {
    g.poly([-66, 56, 0, -64, 66, 56]).fill(0xf0c66c).stroke({ width: 5, color: palette.sandInk, alpha: 0.32 });
    g.poly([-18, 56, 0, -18, 18, 56]).fill(palette.woodDark);
    g.poly([0, -64, 66, 56, 16, 56]).fill({ color: palette.roofRed, alpha: 0.38 });
    g.rect(-4, -88, 8, 34).fill(palette.woodDark);
    g.poly([4, -88, 38, -78, 4, -66]).fill(home.accent);
    if (home.level >= 3) {
      g.circle(-48, 58, 8).fill(0x9b8a72);
      g.circle(54, 58, 8).fill(0x9b8a72);
    }
  }

  private drawGardenHouse(g: Graphics, home: WorldHome) {
    g.roundRect(-54, -16, 108, 74, 16).fill(palette.wallLight).stroke({ width: 4, color: palette.wallDark, alpha: 0.45 });
    g.poly([-66, -16, 0, -78, 66, -16]).fill(palette.roofRed).stroke({ width: 3, color: palette.roofDark, alpha: 0.38 });
    g.roundRect(-16, 16, 32, 42, 10).fill(palette.woodDark);
    g.rect(-42, 2, 24, 22).fill(0xffefb6);
    g.rect(20, 2, 24, 22).fill(0xffefb6);
    g.moveTo(-78, 66).lineTo(78, 66).stroke({ width: 4, color: palette.woodDark, alpha: 0.48, cap: "round" });
    for (let i = -3; i <= 3; i += 1) g.roundRect(i * 22 - 4, 48, 8, 28, 4).fill(palette.woodLight);
    g.circle(-62, 48, 9).fill(palette.flowerPink);
    g.circle(62, 48, 9).fill(palette.flowerYellow);
    if (home.level >= 4) g.circle(46, -48, 9).fill(home.accent);
  }

  private drawCottage(g: Graphics, home: WorldHome) {
    g.roundRect(-58, -24, 116, 82, 17).fill(palette.wallLight).stroke({ width: 4, color: palette.wallDark, alpha: 0.45 });
    g.poly([-72, -24, 0, -84, 72, -24]).fill(palette.roofRed).stroke({ width: 3, color: palette.roofDark, alpha: 0.36 });
    g.rect(-46, -1, 24, 22).fill(0xffefb6);
    g.rect(22, -1, 24, 22).fill(0xffefb6);
    g.roundRect(-18, 14, 36, 46, 12).fill(palette.woodDark);
    g.rect(-64, 50, 128, 12).fill({ color: palette.wallDark, alpha: 0.35 });
    if (home.level >= 4) g.poly([44, -62, 74, -52, 44, -40]).fill(home.accent);
  }

  private drawLevelDecor(home: WorldHome) {
    const decor = new Container();
    const g = new Graphics();
    if (home.level >= 2) {
      g.circle(-62, 62, 7).fill(palette.flowerPink);
      g.circle(60, 60, 7).fill(palette.grassMid);
    }
    if (home.level >= 3) {
      g.moveTo(-72, 70).lineTo(72, 70).stroke({ width: 3, color: palette.woodDark, alpha: 0.38, cap: "round" });
    }
    if (home.level >= 4) {
      g.circle(-42, -42, 7).fill(palette.accent);
      g.circle(-42, -42, 18).fill({ color: palette.accent, alpha: 0.1 });
    }
    decor.addChild(g);

    const plaqueGroup = new Container();
    const plaqueText = new Text({
      text: `Lv.${home.level}`,
      style: { fontFamily: "Georgia, Microsoft YaHei", fontSize: 15, fontWeight: "700", fill: 0x664325 },
    });
    plaqueText.anchor.set(0.5);
    plaqueText.y = 86;
    const plaqueBg = new Graphics().roundRect(-28, 72, 56, 26, 12).fill(0xffe7a8).stroke({
      width: 2,
      color: palette.sandInk,
      alpha: 0.28,
    });
    plaqueGroup.addChild(plaqueBg, plaqueText);
    return { decor, plaque: plaqueGroup };
  }
}
