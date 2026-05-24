import { Container, Graphics, Rectangle, Text } from "pixi.js";
import { palette } from "../artDirection";
import { cameraConfig } from "../cameraConfig";
import { decorations, type DecorationItem } from "../decorationConfig";
import { arenaPosition, growthTreePosition, oldStreetPosition } from "../mapConfig";

interface DecorationLayerActions {
  onOpenDialogue?: () => void;
  onOpenPk?: () => void;
  onFocusPoint: (x: number, y: number, zoom: number) => void;
}

export class DecorationLayer {
  constructor(
    private readonly layer: Container,
    private readonly actions: DecorationLayerActions,
  ) {
    this.drawLandmarks();
    decorations.forEach((item) => this.drawDecoration(item));
    this.drawEntranceBadges();
    this.layer.children.sort((a, b) => a.y - b.y);
  }

  private drawLandmarks() {
    const plaza = new Graphics();
    plaza.x = growthTreePosition.x;
    plaza.y = growthTreePosition.y;
    plaza.ellipse(0, 90, 230, 60).fill({ color: palette.inkShadow, alpha: 0.12 });
    plaza.ellipse(0, 44, 205, 72).fill(0xf6e4aa).stroke({ width: 6, color: palette.sandInk, alpha: 0.16 });
    plaza.ellipse(0, 44, 138, 45).stroke({ width: 4, color: palette.accent, alpha: 0.5 });
    for (let i = 0; i < 18; i += 1) {
      const angle = (Math.PI * 2 * i) / 18;
      const radiusX = 170 + (i % 2) * 14;
      const radiusY = 58 + (i % 3) * 4;
      plaza.circle(Math.cos(angle) * radiusX, 44 + Math.sin(angle) * radiusY, 7).fill({
        color: i % 2 ? palette.sandLight : palette.accent,
        alpha: 0.82,
      });
    }
    this.layer.addChild(plaza);

    const tree = new Graphics();
    tree.x = growthTreePosition.x;
    tree.y = growthTreePosition.y;
    tree.ellipse(0, 102, 146, 35).fill({ color: palette.inkShadow, alpha: 0.18 });
    tree.moveTo(-25, 128).quadraticCurveTo(-88, 124, -122, 78).stroke({
      width: 15,
      color: palette.woodDark,
      alpha: 0.48,
      cap: "round",
    });
    tree.moveTo(24, 128).quadraticCurveTo(94, 120, 128, 72).stroke({
      width: 15,
      color: palette.woodDark,
      alpha: 0.48,
      cap: "round",
    });
    tree.roundRect(-30, -12, 60, 176, 24).fill(palette.woodDark);
    tree.roundRect(-17, -72, 34, 105, 14).fill(palette.woodLight);
    tree.moveTo(-14, 44).quadraticCurveTo(-70, 18, -88, -58).stroke({ width: 13, color: palette.woodDark, alpha: 0.78, cap: "round" });
    tree.moveTo(18, 34).quadraticCurveTo(84, 8, 104, -70).stroke({ width: 13, color: palette.woodDark, alpha: 0.78, cap: "round" });
    [
      { x: -78, y: -52, r: 70, c: palette.grassDark },
      { x: -22, y: -96, r: 94, c: palette.grassMid },
      { x: 72, y: -70, r: 78, c: palette.grassLight },
      { x: 8, y: -35, r: 88, c: palette.grassMid },
    ].forEach((leaf) => tree.circle(leaf.x, leaf.y, leaf.r).fill(leaf.c));
    [
      { x: -54, y: -112, r: 15 },
      { x: 38, y: -132, r: 13 },
      { x: 92, y: -40, r: 12 },
      { x: -110, y: -38, r: 11 },
      { x: -8, y: -8, r: 10 },
    ].forEach((spot) => tree.circle(spot.x, spot.y, spot.r).fill({ color: 0xd6e99b, alpha: 0.72 }));
    tree.circle(0, -70, 122).stroke({ width: 7, color: palette.accent, alpha: 0.56 });
    tree.circle(0, -70, 94).stroke({ width: 3, color: 0xfff4c7, alpha: 0.46 });
    for (let i = 0; i < 16; i += 1) {
      const angle = (Math.PI * 2 * i) / 16;
      const x = Math.cos(angle) * 132;
      const y = -70 + Math.sin(angle) * 86;
      tree.circle(x, y, i % 4 === 0 ? 7 : 5).fill({ color: 0xfff4c7, alpha: 0.76 });
      if (i % 4 === 0) tree.circle(x, y, 16).fill({ color: palette.accent, alpha: 0.08 });
    }
    this.layer.addChild(tree);

    const oldStreet = new Graphics();
    oldStreet.x = oldStreetPosition.x;
    oldStreet.y = oldStreetPosition.y - 52;
    oldStreet.roundRect(-170, 8, 340, 24, 8).fill({ color: palette.inkShadow, alpha: 0.12 });
    oldStreet.rect(-145, -26, 290, 62).fill(palette.wallLight).stroke({ width: 4, color: palette.oldStreetDark, alpha: 0.4 });
    oldStreet.rect(-128, -14, 52, 50).fill(0xf8c985);
    oldStreet.rect(76, -14, 52, 50).fill(0xf8c985);
    oldStreet.poly([-168, -26, -92, -90, -16, -26]).fill(palette.roofRed);
    oldStreet.poly([-28, -26, 52, -98, 132, -26]).fill(0xc66e4f);
    oldStreet.rect(-182, -48, 364, 24).fill(palette.oldStreetDark);
    this.layer.addChild(oldStreet);
  }

  private drawEntranceBadges() {
    this.layer.addChild(
      this.makeEntranceBadge({
        label: "PK",
        x: arenaPosition.x + 145,
        y: arenaPosition.y - 132,
        color: palette.arenaDark,
        accent: palette.accent,
        onTap: () => {
          this.actions.onFocusPoint(arenaPosition.x, arenaPosition.y + 10, cameraConfig.detailZoom);
          this.actions.onOpenPk?.();
        },
      }),
    );
    this.layer.addChild(
      this.makeEntranceBadge({
        label: "AI",
        x: oldStreetPosition.x + 230,
        y: oldStreetPosition.y - 108,
        color: palette.oldStreetDark,
        accent: palette.roofRed,
        onTap: () => {
          this.actions.onFocusPoint(oldStreetPosition.x, oldStreetPosition.y, cameraConfig.detailZoom);
          this.actions.onOpenDialogue?.();
        },
      }),
    );
  }

  private makeEntranceBadge(options: { label: string; x: number; y: number; color: number; accent: number; onTap: () => void }) {
    const node = new Container();
    node.x = options.x;
    node.y = options.y;
    node.eventMode = "static";
    node.cursor = "pointer";
    node.hitArea = new Rectangle(-58, -74, 116, 112);
    node.on("pointertap", options.onTap);

    const g = new Graphics();
    g.ellipse(0, 34, 58, 15).fill({ color: palette.inkShadow, alpha: 0.14 });
    g.rect(-5, -22, 10, 66).fill(palette.woodDark);
    g.roundRect(-50, -62, 100, 48, 13).fill(0xffe7a8).stroke({ width: 4, color: options.color, alpha: 0.48 });
    g.roundRect(-38, -52, 76, 28, 9).fill(options.accent).stroke({ width: 2, color: 0xfff6d4, alpha: 0.72 });
    g.circle(-34, -38, 4).fill(0xfff6d4);
    g.circle(34, -38, 4).fill(0xfff6d4);

    const text = new Text({
      text: options.label,
      style: { fontFamily: "Georgia, Microsoft YaHei", fontSize: 20, fontWeight: "900", fill: 0xfff9df },
    });
    text.anchor.set(0.5);
    text.y = -38;

    node.addChild(g, text);
    return node;
  }

  private drawDecoration(item: DecorationItem) {
    const g = new Graphics();
    g.x = item.position.x;
    g.y = item.position.y;
    g.scale.set(item.scale ?? 1);

    switch (item.kind) {
      case "mangrove":
      case "tree":
        this.drawTree(g, item.kind === "mangrove");
        break;
      case "flower":
        this.drawFlowerPatch(g);
        break;
      case "shell":
      case "scallop":
        this.drawShell(g, item.kind === "scallop");
        break;
      case "pearl":
        this.drawPearl(g);
        break;
      case "flag":
        this.drawFlag(g);
        break;
      case "lamp":
        this.drawLamp(g);
        break;
      case "sign":
        this.drawSmallSign(g);
        break;
      case "bridge":
        this.drawBridge(g);
        break;
      case "dock":
        this.drawDock(g);
        break;
      case "fence":
        this.drawFence(g);
        break;
      case "mailbox":
        this.drawMailbox(g);
        break;
      case "windmill":
        this.drawWindmill(g);
        break;
      case "street-gate":
        this.drawStreetGate(g);
        break;
      default:
        this.drawRock(g);
    }
    this.layer.addChild(g);
  }

  private drawTree(g: Graphics, mangrove: boolean) {
    const leafA = mangrove ? palette.grassDark : palette.grassMid;
    const leafB = mangrove ? 0x3f7654 : palette.grassLight;
    g.ellipse(0, 34, 52, 14).fill({ color: palette.inkShadow, alpha: 0.14 });
    g.roundRect(-9, -18, 18, 70, 7).fill(palette.woodDark);
    g.circle(-26, -28, 34).fill(leafA);
    g.circle(16, -46, 42).fill(leafB);
    g.circle(42, -18, 30).fill(leafA);
    if (mangrove) {
      g.moveTo(-8, 38).lineTo(-34, 62).stroke({ width: 5, color: palette.woodDark, alpha: 0.8, cap: "round" });
      g.moveTo(8, 38).lineTo(34, 60).stroke({ width: 5, color: palette.woodDark, alpha: 0.8, cap: "round" });
    }
  }

  private drawFlowerPatch(g: Graphics) {
    g.ellipse(0, 10, 54, 16).fill({ color: palette.grassMid, alpha: 0.42 });
    for (let i = 0; i < 9; i += 1) {
      const x = -34 + i * 9;
      const y = Math.sin(i * 1.4) * 9;
      g.circle(x - 5, y, 5).fill(i % 2 ? palette.flowerPink : palette.flowerYellow);
      g.circle(x + 4, y - 2, 5).fill(0xfff0c7);
    }
  }

  private drawShell(g: Graphics, scallop: boolean) {
    g.ellipse(0, 14, scallop ? 48 : 42, 16).fill({ color: palette.inkShadow, alpha: 0.11 });
    g.moveTo(scallop ? -42 : -34, 0);
    g.arc(0, 0, scallop ? 42 : 34, Math.PI, 0).fill(scallop ? palette.shellPink : 0xfff1c4).stroke({
      width: 4,
      color: palette.sandInk,
      alpha: 0.38,
    });
    for (let i = -3; i <= 3; i += 1) {
      g.moveTo(0, -1).lineTo(i * (scallop ? 13 : 11), scallop ? -34 + Math.abs(i) * 5 : -26 + Math.abs(i) * 4);
      g.stroke({ width: 2, color: palette.sandInk, alpha: 0.32 });
    }
  }

  private drawPearl(g: Graphics) {
    g.ellipse(0, 24, 44, 12).fill({ color: palette.inkShadow, alpha: 0.1 });
    g.circle(0, 0, 28).fill(palette.pearlWhite).stroke({ width: 4, color: palette.oceanDarkLine, alpha: 0.4 });
    g.circle(-9, -10, 7).fill({ color: 0xffffff, alpha: 0.82 });
  }

  private drawFlag(g: Graphics) {
    g.rect(-4, -50, 8, 78).fill(palette.woodDark);
    g.poly([4, -50, 54, -36, 4, -20]).fill(palette.accent).stroke({ width: 2, color: palette.sandInk, alpha: 0.45 });
  }

  private drawLamp(g: Graphics) {
    g.rect(-5, -45, 10, 72).fill(palette.woodDark);
    g.circle(0, -50, 18).fill(0xffe79a).stroke({ width: 3, color: 0xfff8df, alpha: 0.72 });
    g.circle(0, -50, 29).fill({ color: palette.accent, alpha: 0.12 });
  }

  private drawSmallSign(g: Graphics) {
    g.rect(-5, -14, 10, 52).fill(palette.woodDark);
    g.roundRect(-46, -44, 92, 34, 8).fill(0xffe1a6).stroke({ width: 3, color: palette.sandInk, alpha: 0.5 });
  }

  private drawBridge(g: Graphics) {
    g.roundRect(-82, -14, 164, 28, 9).fill(palette.woodLight).stroke({ width: 4, color: palette.woodDark, alpha: 0.44 });
    for (let i = -3; i <= 3; i += 1) {
      g.rect(i * 22 - 4, -20, 8, 40).fill({ color: palette.woodDark, alpha: 0.32 });
    }
  }

  private drawDock(g: Graphics) {
    g.roundRect(-64, -14, 128, 28, 7).fill(palette.woodLight).stroke({ width: 4, color: palette.woodDark, alpha: 0.52 });
    g.rect(-46, -50, 12, 70).fill(palette.woodDark);
    g.rect(34, -50, 12, 70).fill(palette.woodDark);
    for (let i = -2; i <= 2; i += 1) {
      g.rect(i * 26 - 5, -18, 10, 36).fill({ color: palette.woodDark, alpha: 0.28 });
    }
  }

  private drawFence(g: Graphics) {
    g.moveTo(-72, 0).lineTo(72, 0).stroke({ width: 5, color: palette.woodDark, alpha: 0.55, cap: "round" });
    for (let i = -3; i <= 3; i += 1) {
      g.roundRect(i * 24 - 4, -28, 8, 42, 4).fill(palette.woodLight).stroke({ width: 2, color: palette.woodDark, alpha: 0.28 });
    }
  }

  private drawMailbox(g: Graphics) {
    g.rect(-5, -18, 10, 50).fill(palette.woodDark);
    g.roundRect(-28, -46, 56, 34, 12).fill(0xf1b0a0).stroke({ width: 3, color: palette.roofDark, alpha: 0.48 });
    g.rect(18, -60, 7, 22).fill(palette.roofDark);
  }

  private drawWindmill(g: Graphics) {
    g.ellipse(0, 44, 54, 14).fill({ color: palette.inkShadow, alpha: 0.12 });
    g.poly([-28, 48, 0, -44, 28, 48]).fill(palette.wallLight).stroke({ width: 3, color: palette.townDark, alpha: 0.45 });
    g.circle(0, -24, 7).fill(palette.woodDark);
    g.poly([-5, -24, 5, -24, 9, -76, -9, -76]).fill(palette.pearlWhite).stroke({ width: 1, color: palette.townDark, alpha: 0.25 });
    g.poly([-5, -24, 5, -24, 76, -30, 76, -14]).fill(palette.pearlWhite).stroke({ width: 1, color: palette.townDark, alpha: 0.25 });
    g.poly([-5, -24, 5, -24, 9, 26, -9, 26]).fill(palette.pearlWhite).stroke({ width: 1, color: palette.townDark, alpha: 0.25 });
    g.poly([-5, -24, 5, -24, -76, -30, -76, -14]).fill(palette.pearlWhite).stroke({ width: 1, color: palette.townDark, alpha: 0.25 });
  }

  private drawStreetGate(g: Graphics) {
    g.rect(-72, -36, 18, 86).fill(palette.woodDark);
    g.rect(54, -36, 18, 86).fill(palette.woodDark);
    g.roundRect(-96, -62, 192, 28, 8).fill(palette.roofRed).stroke({ width: 3, color: palette.roofDark, alpha: 0.52 });
    g.roundRect(-72, -92, 144, 30, 8).fill(0xf0be72).stroke({ width: 3, color: palette.roofDark, alpha: 0.42 });
  }

  private drawRock(g: Graphics) {
    g.ellipse(0, 0, 34, 18).fill(0x9b8a72).stroke({ width: 2, color: 0xffffff, alpha: 0.35 });
  }
}
