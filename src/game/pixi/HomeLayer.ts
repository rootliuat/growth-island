import { Container, Graphics, Rectangle, Text } from "pixi.js";
import { assetScaleRules, getDoorFocusTarget, getHomePadWidth } from "../assetScaleRules";
import { palette } from "../artDirection";
import { cameraConfig } from "../cameraConfig";
import type { WorldHome, WorldMapData } from "../types";
import { v4HomeAssetUrl, v4HomePadUrl, v4HomeTargetWidth, v4MapAssets } from "../v4MapAssets";
import { addAssetSprite } from "./assetSprites";

interface HomeNode {
  root: Container;
  halo: Graphics;
  focusGlow: Graphics;
  prompt: Container;
  plaque: Container;
  beacon: Container;
  decor: Container;
  hovered: boolean;
}

interface HomeModelPropSpec {
  idSuffix: string;
  url: string;
  x: number;
  y: number;
  width: number;
  rotation?: number;
  alpha?: number;
  front?: boolean;
}

export class HomeLayer {
  private readonly homeNodes = new Map<string, HomeNode>();
  private selectedChildId = "";
  private elapsed = 0;

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
      node.root.scale.set(this.targetScale(home.childId, node));
      node.halo.visible = home.childId === this.selectedChildId;
      node.focusGlow.visible = home.childId === this.selectedChildId || node.hovered;
      node.beacon.visible = node.hovered;
    });
    this.layer.children.sort((a, b) => a.y - b.y);
  }

  pulse(childId: string) {
    const node = [...this.homeNodes.values()].find((item) => item.root.label === childId);
    if (!node) return;
    node.root.scale.set(1.18);
  }

  updateFrame(deltaMS: number) {
    this.elapsed += deltaMS / 1000;
    this.homeNodes.forEach((node) => {
      const target = this.targetScale(String(node.root.label), node);
      const next = node.root.scale.x + (target - node.root.scale.x) * Math.min(1, deltaMS / 180);
      node.root.scale.set(next);
      node.focusGlow.alpha += ((node.root.label === this.selectedChildId || node.hovered ? 1 : 0) - node.focusGlow.alpha) * Math.min(1, deltaMS / 170);
      node.beacon.y = -104 - Math.sin(this.elapsed * 1.8 + node.root.x * 0.004) * 4;
    });
  }

  updateZoom(zoom: number) {
    this.homeNodes.forEach((node) => {
      const selected = node.root.label === this.selectedChildId;
      node.halo.visible = selected && zoom < 1.32;
      node.plaque.visible = false;
      node.decor.visible = selected || (zoom >= 1.18 && zoom < 1.45);
      node.prompt.visible = node.hovered && zoom >= 1.05;
      node.beacon.visible = (selected || node.hovered) && zoom < 1.24;
      node.root.alpha = zoom < 0.72 && !selected ? 0.94 : 1;
    });
  }

  private createHome(home: WorldHome) {
    const node = new Container();
    node.label = home.childId;
    node.eventMode = "static";
    node.cursor = "pointer";
    node.hitArea = new Rectangle(-105, -150, 210, 245);
    node.on("pointertap", () => {
      this.onSelect(home.childId);
      const target = getDoorFocusTarget(home.doorPosition, cameraConfig.homeZoom);
      this.onFocus(target.x, target.y, target.zoom);
    });

    const halo = new Graphics();
    halo.ellipse(0, 46, 108, 34).fill({ color: home.accent, alpha: 0.12 });
    halo.ellipse(0, 46, 128, 42).stroke({ width: 3, color: 0xfff6c9, alpha: 0.34 });
    halo.ellipse(0, 46, 148, 50).stroke({ width: 1.5, color: home.accent, alpha: 0.2 });
    halo.visible = false;

    const focusGlow = new Graphics();
    focusGlow.ellipse(0, 55, 52, 15).fill({ color: home.accent, alpha: 0.09 });
    focusGlow.ellipse(0, 55, 66, 20).stroke({ width: 1.5, color: 0xfff6c9, alpha: 0.22 });
    focusGlow.visible = false;
    focusGlow.alpha = 0;

    const body = new Container();
    this.addHomeArtwork(body, home);
    node.addChild(halo, focusGlow, body);

    const { decor, plaque } = this.drawLevelDecor(home);
    this.addHomeModelProps(decor, home, this.homeModelPropSpecs(home));
    const prompt = this.drawHomePrompt(home);
    const beacon = this.drawSelectedBeacon(home);
    decor.visible = false;
    plaque.visible = false;
    prompt.visible = false;
    beacon.visible = false;
    node.addChild(decor, plaque, prompt, beacon);
    const homeNode: HomeNode = { root: node, halo, focusGlow, decor, plaque, prompt, beacon, hovered: false };
    node.on("pointerover", () => {
      homeNode.hovered = true;
      focusGlow.visible = true;
      prompt.visible = true;
      beacon.visible = false;
    });
    node.on("pointerout", () => {
      homeNode.hovered = false;
      focusGlow.visible = home.childId === this.selectedChildId;
      prompt.visible = false;
      beacon.visible = false;
    });
    return homeNode;
  }

  private addHomeArtwork(body: Container, home: WorldHome) {
    const contactShadow = new Graphics();
    contactShadow.ellipse(-3, 66, 78, 21).fill({ color: palette.inkShadow, alpha: 0.1 });
    contactShadow.ellipse(10, 57, 44, 10).fill({ color: 0xffffff, alpha: 0.035 });
    body.addChild(contactShadow);
    addAssetSprite(body, {
      id: `${home.id}-shadow`,
      url: v4MapAssets.homeShadow,
      x: 0,
      y: 64,
      width: 168,
      alpha: 0.22,
    });
    addAssetSprite(body, {
      id: `${home.id}-pad`,
      url: v4HomePadUrl(home.regionId),
      x: 0,
      y: 67,
      width: getHomePadWidth(home.type),
      alpha: 0.86,
    });
    addAssetSprite(body, {
      id: `${home.id}-artwork`,
      url: v4HomeAssetUrl(home.type, home.level),
      x: 0,
      y: home.type === "treehouse" ? -2 : 5,
      width: v4HomeTargetWidth(home.type, home.level),
      anchorY: 0.56,
      alpha: 0.98,
    });
  }

  private addHomeModelProps(body: Container, home: WorldHome, props: HomeModelPropSpec[]) {
    props.forEach((prop, index) => {
      addAssetSprite(body, {
        id: `${home.id}-${prop.idSuffix}`,
        url: prop.url,
        x: prop.x,
        y: prop.y,
        width: prop.width,
        rotation: prop.rotation,
        alpha: prop.alpha ?? 0.88,
        anchorY: 0.72,
        loadDelayMs: this.homeModelPropLoadDelay(home, index),
      });
    });
  }

  private homeModelPropSpecs(home: WorldHome): HomeModelPropSpec[] {
    const variant = this.variant(home);
    const side = variant % 2 === 0 ? -1 : 1;
    const props: HomeModelPropSpec[] = [];
    if (home.type === "treehouse") {
      props.push({
        idSuffix: variant % 3 === 0 ? "fruit-tree-prop" : "bush-prop",
        url: variant % 3 === 0 ? v4MapAssets.p15PropTreeFruit : v4MapAssets.p15PropBush,
        x: side * 76,
        y: 62,
        width: variant % 3 === 0 ? 56 : 48,
        rotation: side * -0.06,
      });
    } else if (home.type === "shell" || home.type === "pearl") {
      props.push({
        idSuffix: home.type === "pearl" ? "pearl-rock-prop" : "shell-plant-prop",
        url: home.type === "pearl" ? v4MapAssets.p16PropRockPlatform2 : v4MapAssets.p15PropPlantSmall,
        x: side * 72,
        y: 70,
        width: home.type === "pearl" ? 48 : 42,
        rotation: side * 0.08,
      });
    } else if (home.type === "tent") {
      props.push({
        idSuffix: "camp-crate-prop",
        url: variant % 2 === 0 ? v4MapAssets.p16PropCrate : v4MapAssets.p16PropBagOpen,
        x: side * 70,
        y: 76,
        width: 40,
        rotation: side * -0.08,
      });
    } else if (home.type === "garden") {
      props.push({
        idSuffix: "garden-bench-prop",
        url: variant % 2 === 0 ? v4MapAssets.p16PropBench1 : v4MapAssets.p16PropBench2,
        x: side * 72,
        y: 74,
        width: 52,
        rotation: side * 0.1,
      });
    } else {
      props.push({
        idSuffix: "cottage-fence-prop",
        url: variant % 2 === 0 ? v4MapAssets.p15PropFenceMiddle : v4MapAssets.p15PropFence1,
        x: side * 76,
        y: 72,
        width: 58,
        rotation: side * 0.1,
      });
    }

    const growthTokens = [
      { idSuffix: "star-pad-prop", url: v4MapAssets.p15PropStar, width: 34 },
      { idSuffix: "heart-pad-prop", url: v4MapAssets.p16PropHeart, width: 34 },
      { idSuffix: "gem-pad-prop", url: v4MapAssets.p15PropGemGreen, width: 32 },
      { idSuffix: "fruit-pad-prop", url: v4MapAssets.p16PropFruit, width: 30 },
    ];
    const token = growthTokens[(variant + home.level) % growthTokens.length];
    props.push({
      ...token,
      x: -side * (home.type === "treehouse" ? 58 : 64),
      y: 83,
      rotation: -side * 0.08,
      alpha: home.level >= 2 ? 0.9 : 0.74,
      front: true,
    });
    return props;
  }

  private homeModelPropLoadDelay(home: WorldHome, index: number) {
    if (home.childId === this.selectedChildId) return 0;
    const numericId = Number.parseInt(home.id.replace(/\D/g, ""), 10);
    const order = Number.isFinite(numericId) ? numericId : 18;
    return 680 + Math.min(34, order) * 42 + index * 90;
  }

  private drawHome(g: Graphics, home: WorldHome) {
    this.drawHomeGround(g, home);
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
      g.ellipse(0, 8, 98, 61).stroke({ width: 4, color: home.accent, alpha: 0.42 });
      g.ellipse(0, 8, 116, 72).stroke({ width: 2, color: 0xfff6c9, alpha: 0.36 });
    }
    this.drawHomePersonalDecor(g, home);
  }

  private drawHomeGround(g: Graphics, home: WorldHome) {
    const groundColor =
      home.type === "treehouse"
        ? palette.grassLight
        : home.type === "pearl"
          ? palette.pearlBay
          : home.type === "tent" || home.type === "shell"
            ? palette.sandLight
            : 0xf0dca2;
    const variant = this.variant(home);
    const padAccent =
      home.type === "treehouse"
        ? palette.grassDark
        : home.type === "pearl"
          ? palette.oceanDarkLine
          : home.type === "shell" || home.type === "tent"
            ? palette.sandInk
            : home.accent;
    g.ellipse(0, 66, 100, 28).fill({ color: palette.inkShadow, alpha: 0.16 });
    g.ellipse(0, 58, 96, 28).fill({ color: padAccent, alpha: 0.11 });
    g.ellipse(0, 58, 88, 24).fill({ color: groundColor, alpha: 0.92 }).stroke({
      width: 3,
      color: palette.sandInk,
      alpha: 0.16,
    });
    g.ellipse(0, 58, 74, 18).stroke({ width: 2, color: padAccent, alpha: 0.2 });
    g.ellipse(0, 50, 62, 14).fill({ color: 0xffffff, alpha: 0.13 });
    g.moveTo(-8, 63).quadraticCurveTo(variant % 2 === 0 ? 10 : -8, 88, variant % 2 === 0 ? 58 : -58, 104);
    g.stroke({ width: 14, color: 0xf7e6aa, alpha: 0.78, cap: "round" });
    g.moveTo(-8, 63).quadraticCurveTo(variant % 2 === 0 ? 10 : -8, 88, variant % 2 === 0 ? 58 : -58, 104);
    g.stroke({ width: 3, color: palette.sandInk, alpha: 0.14, cap: "round" });
    for (let i = 0; i < 4; i += 1) {
      const side = variant % 2 === 0 ? 1 : -1;
      g.ellipse(side * (22 + i * 16), 73 + i * 8, 9, 4).fill({ color: 0xfff3c8, alpha: 0.62 });
    }
    if (home.type === "pearl") {
      for (let i = -2; i <= 2; i += 1) {
        g.circle(i * 26, 72 + Math.abs(i) * 3, 5 + (Math.abs(i) % 2) * 2).fill({ color: palette.pearlWhite, alpha: 0.72 });
      }
    }
    if (home.type === "treehouse") {
      [-55, -36, 50, 68].forEach((x, index) => {
        g.circle(x, 60 + (index % 2) * 9, 7).fill({ color: index % 2 ? palette.grassMid : palette.grassDark, alpha: 0.72 });
      });
    }
    if (home.type === "shell" || home.type === "tent") {
      [-58, -30, 48, 70].forEach((x, index) => {
        g.ellipse(x, 66 + (index % 2) * 8, 9, 4).stroke({ width: 2, color: palette.sandInk, alpha: 0.22 });
      });
    }
    if (home.level >= 3) {
      const fenceY = 68;
      g.moveTo(-88, fenceY).lineTo(-42, fenceY - 3).stroke({ width: 4, color: palette.woodDark, alpha: 0.28, cap: "round" });
      g.moveTo(42, fenceY - 3).lineTo(88, fenceY).stroke({ width: 4, color: palette.woodDark, alpha: 0.28, cap: "round" });
      [-82, -62, -44, 44, 64, 84].forEach((x) => {
        g.roundRect(x - 3, fenceY - 17, 6, 24, 3).fill({ color: palette.woodLight, alpha: 0.78 });
      });
    }
  }

  private drawTreehouse(g: Graphics, home: WorldHome) {
    const variant = this.variant(home);
    const canopyA = variant % 2 === 0 ? palette.grassDark : 0x4f9358;
    const canopyB = variant % 3 === 0 ? 0x87c86d : palette.grassMid;
    g.ellipse(0, 68, 56, 13).fill({ color: palette.inkShadow, alpha: 0.13 });
    g.roundRect(-14, -22, 28, 94, 9).fill(palette.woodDark);
    g.moveTo(-11, 52).lineTo(-42, 78).stroke({ width: 5, color: palette.woodDark, alpha: 0.7, cap: "round" });
    g.moveTo(10, 54).lineTo(42, 76).stroke({ width: 5, color: palette.woodDark, alpha: 0.7, cap: "round" });
    g.circle(-46, -64, 42).fill(canopyA);
    g.circle(14, -82, 54).fill(canopyB);
    g.circle(50, -48, 40).fill(palette.grassLight);
    g.circle(-6, -104, 24).fill({ color: 0xffffff, alpha: 0.1 });
    g.roundRect(-60, 36, 120, 18, 7).fill({ color: palette.woodDark, alpha: 0.32 });
    g.roundRect(-58, -20, 116, 68, 14).fill(palette.woodLight).stroke({ width: 4, color: palette.woodDark, alpha: 0.42 });
    g.roundRect(-56, 28, 112, 22, 9).fill({ color: palette.woodDark, alpha: 0.16 });
    g.rect(-46, -5, 28, 24).fill(0xffe5a8);
    g.rect(-32, -5, 3, 24).fill({ color: palette.woodDark, alpha: 0.18 });
    g.rect(20, -4, 28, 23).fill(0xffe5a8);
    g.rect(34, -4, 3, 23).fill({ color: palette.woodDark, alpha: 0.18 });
    g.poly([-68, -20, 0, -68, 68, -20]).fill(0xe8b46a).stroke({ width: 3, color: palette.woodDark, alpha: 0.35 });
    g.poly([-62, -18, 0, -58, 62, -18, 54, -12, -54, -12]).fill({ color: palette.woodDark, alpha: 0.12 });
    g.roundRect(-16, 16, 32, 36, 10).fill(palette.woodDark);
    g.roundRect(-9, 24, 18, 28, 8).fill({ color: 0x4f2f21, alpha: 0.46 });
    g.moveTo(54, 38).lineTo(84, 78).stroke({ width: 5, color: palette.woodDark, alpha: 0.75, cap: "round" });
    for (let i = 0; i < 3; i += 1) g.moveTo(58 + i * 8, 46 + i * 10).lineTo(76 + i * 8, 46 + i * 10).stroke({ width: 3, color: palette.wallLight, alpha: 0.7 });
    if (variant % 2 === 1) {
      g.moveTo(-54, 42).lineTo(54, 42).stroke({ width: 5, color: palette.woodDark, alpha: 0.42, cap: "round" });
      for (let i = -2; i <= 2; i += 1) g.roundRect(i * 20 - 4, 34, 8, 18, 4).fill({ color: palette.wallLight, alpha: 0.72 });
    }
    if (home.level >= 4) g.poly([42, -60, 74, -50, 42, -38]).fill(home.accent);
  }

  private drawShellHouse(g: Graphics, home: WorldHome) {
    const variant = this.variant(home);
    const shellTint = variant % 2 === 0 ? 0xfff1bf : 0xffdfc8;
    g.ellipse(0, 48, 82, 18).fill({ color: palette.sandInk, alpha: 0.1 });
    g.moveTo(-74, 18);
    g.arc(0, 18, 74, Math.PI, 0).fill(shellTint).stroke({ width: 5, color: palette.sandInk, alpha: 0.36 });
    g.moveTo(-70, 20);
    g.arc(0, 20, 70, Math.PI, 0).stroke({ width: 9, color: 0xffffff, alpha: 0.12 });
    g.moveTo(-58, 20);
    g.arc(0, 20, 58, Math.PI, 0).stroke({ width: 3, color: palette.shellPink, alpha: 0.66 });
    for (let i = -4; i <= 4; i += 1) {
      g.moveTo(0, 18).lineTo(i * 16, -46 + Math.abs(i) * 7).stroke({ width: 2, color: palette.sandInk, alpha: 0.32 });
    }
    g.roundRect(-23, 8, 46, 48, 15).fill(palette.woodDark);
    g.roundRect(-14, 18, 28, 36, 11).fill({ color: 0x4f2f21, alpha: 0.42 });
    g.ellipse(0, 58, 40, 8).fill({ color: palette.sandInk, alpha: 0.14 });
    g.circle(46, -5, 13).fill(palette.pearlWhite).stroke({ width: 2, color: home.accent, alpha: 0.48 });
    g.circle(49, -8, 5).fill({ color: 0xffffff, alpha: 0.82 });
    if (variant >= 2) {
      g.circle(-48, 8, 10).fill({ color: palette.pearlWhite, alpha: 0.78 }).stroke({ width: 2, color: home.accent, alpha: 0.28 });
      g.circle(-70, 38, 7).fill({ color: palette.shellPink, alpha: 0.78 });
    }
    if (home.level >= 3) {
      g.circle(-56, 44, 8).fill(palette.shellPink);
      g.circle(60, 48, 7).fill(palette.flowerYellow);
    }
  }

  private drawPearlHouse(g: Graphics, home: WorldHome) {
    const variant = this.variant(home);
    g.ellipse(0, 52, 74, 20).fill({ color: palette.oceanDarkLine, alpha: 0.12 });
    g.ellipse(0, 44, 88, 18).stroke({ width: 3, color: palette.oceanLightLine, alpha: 0.32 });
    g.circle(0, -2, 60).fill(palette.pearlWhite).stroke({ width: 6, color: palette.oceanDarkLine, alpha: 0.36 });
    g.circle(0, 10, 58).fill({ color: palette.pearlBay, alpha: 0.18 });
    g.circle(-20, -22, 13).fill({ color: 0xffffff, alpha: 0.84 });
    g.circle(48, -20, 18).fill({ color: palette.pearlBay, alpha: 0.72 });
    g.circle(-58, 5, 13).fill({ color: palette.pearlBay, alpha: 0.68 });
    g.roundRect(-24, 18, 48, 40, 18).fill(0x6f9bad);
    g.roundRect(-16, 28, 32, 30, 14).fill({ color: 0x375f70, alpha: 0.4 });
    g.rect(-46, 50, 92, 12).fill({ color: palette.oceanDarkLine, alpha: 0.24 });
    if (variant % 2 === 0) {
      g.circle(66, 16, 10).fill({ color: palette.pearlWhite, alpha: 0.7 }).stroke({ width: 2, color: home.accent, alpha: 0.25 });
      g.circle(78, 36, 7).fill({ color: palette.pearlBay, alpha: 0.72 });
    } else {
      g.roundRect(-55, -12, 22, 18, 7).fill({ color: home.accent, alpha: 0.42 });
      g.roundRect(33, -4, 22, 18, 7).fill({ color: home.accent, alpha: 0.3 });
    }
    if (home.level >= 4) g.circle(0, -72, 9).fill(home.accent).stroke({ width: 2, color: 0xfff4c7, alpha: 0.6 });
  }

  private drawTentHouse(g: Graphics, home: WorldHome) {
    const variant = this.variant(home);
    const fabric = variant % 2 === 0 ? 0xf0c66c : 0xf1b08e;
    g.ellipse(0, 64, 82, 18).fill({ color: palette.sandInk, alpha: 0.12 });
    g.poly([-66, 56, 0, -64, 66, 56]).fill(fabric).stroke({ width: 5, color: palette.sandInk, alpha: 0.32 });
    g.poly([-48, 56, 0, -48, 48, 56]).stroke({ width: 3, color: 0xfff6cf, alpha: 0.42 });
    g.poly([0, -64, 66, 56, 16, 56]).fill({ color: variant >= 2 ? home.accent : palette.roofRed, alpha: 0.38 });
    g.poly([-18, 56, 0, -18, 18, 56]).fill(palette.woodDark);
    g.moveTo(-68, 56).lineTo(-94, 78).stroke({ width: 3, color: palette.woodDark, alpha: 0.4, cap: "round" });
    g.moveTo(68, 56).lineTo(94, 78).stroke({ width: 3, color: palette.woodDark, alpha: 0.4, cap: "round" });
    g.circle(-94, 78, 5).fill({ color: palette.woodDark, alpha: 0.44 });
    g.circle(94, 78, 5).fill({ color: palette.woodDark, alpha: 0.44 });
    g.rect(-4, -88, 8, 34).fill(palette.woodDark);
    g.poly([4, -88, 38, -78, 4, -66]).fill(home.accent);
    if (variant % 3 === 1) {
      g.circle(-72, 52, 8).fill(0xffd56d);
      g.roundRect(-84, 58, 30, 16, 6).fill({ color: palette.woodLight, alpha: 0.86 });
    }
    if (home.level >= 3) {
      g.circle(-48, 58, 8).fill(0x9b8a72);
      g.circle(54, 58, 8).fill(0x9b8a72);
    }
  }

  private drawGardenHouse(g: Graphics, home: WorldHome) {
    const variant = this.variant(home);
    g.ellipse(0, 62, 80, 18).fill({ color: palette.inkShadow, alpha: 0.11 });
    g.roundRect(-54, -16, 108, 74, 16).fill(palette.wallLight).stroke({ width: 4, color: palette.wallDark, alpha: 0.45 });
    g.roundRect(-54, 42, 108, 18, 8).fill({ color: palette.wallDark, alpha: 0.18 });
    g.poly([-66, -16, 0, -78, 66, -16]).fill(variant % 2 === 0 ? palette.roofRed : palette.roofBlue).stroke({ width: 3, color: palette.roofDark, alpha: 0.38 });
    g.poly([-60, -16, 0, -66, 60, -16, 52, -10, -52, -10]).fill({ color: palette.roofDark, alpha: 0.16 });
    g.roundRect(-16, 16, 32, 42, 10).fill(palette.woodDark);
    g.roundRect(-9, 25, 18, 32, 8).fill({ color: 0x4f2f21, alpha: 0.42 });
    g.rect(-42, 2, 24, 22).fill(0xffefb6);
    g.rect(-30, 2, 3, 22).fill({ color: palette.wallDark, alpha: 0.2 });
    g.rect(20, 2, 24, 22).fill(0xffefb6);
    g.rect(32, 2, 3, 22).fill({ color: palette.wallDark, alpha: 0.2 });
    g.moveTo(-78, 66).lineTo(78, 66).stroke({ width: 4, color: palette.woodDark, alpha: 0.48, cap: "round" });
    for (let i = -3; i <= 3; i += 1) g.roundRect(i * 22 - 4, 48, 8, 28, 4).fill(palette.woodLight);
    g.circle(-62, 48, 9).fill(palette.flowerPink);
    g.circle(62, 48, 9).fill(palette.flowerYellow);
    if (variant >= 2) {
      g.roundRect(-8, -64, 16, 22, 6).fill(palette.wallLight).stroke({ width: 2, color: palette.roofDark, alpha: 0.26 });
      g.circle(0, -53, 5).fill(home.accent);
    }
    if (home.level >= 4) g.circle(46, -48, 9).fill(home.accent);
  }

  private drawCottage(g: Graphics, home: WorldHome) {
    const variant = this.variant(home);
    const roof = variant % 2 === 0 ? palette.roofRed : palette.roofBlue;
    g.ellipse(0, 63, 82, 18).fill({ color: palette.inkShadow, alpha: 0.12 });
    g.roundRect(-58, -24, 116, 82, 17).fill(palette.wallLight).stroke({ width: 4, color: palette.wallDark, alpha: 0.45 });
    g.roundRect(-58, 42, 116, 18, 8).fill({ color: palette.wallDark, alpha: 0.2 });
    if (variant >= 2) g.roundRect(-46, -72, 18, 38, 5).fill(palette.wallDark).stroke({ width: 2, color: palette.roofDark, alpha: 0.24 });
    g.poly([-72, -24, 0, -84, 72, -24]).fill(roof).stroke({ width: 3, color: palette.roofDark, alpha: 0.36 });
    g.poly([-66, -23, 0, -72, 66, -23, 58, -15, -58, -15]).fill({ color: palette.roofDark, alpha: 0.17 });
    g.rect(-46, -1, 24, 22).fill(0xffefb6);
    g.rect(-34, -1, 3, 22).fill({ color: palette.wallDark, alpha: 0.2 });
    g.rect(22, -1, 24, 22).fill(0xffefb6);
    g.rect(34, -1, 3, 22).fill({ color: palette.wallDark, alpha: 0.2 });
    g.roundRect(-18, 14, 36, 46, 12).fill(palette.woodDark);
    g.roundRect(-10, 24, 20, 34, 8).fill({ color: 0x4f2f21, alpha: 0.42 });
    g.rect(-64, 50, 128, 12).fill({ color: palette.wallDark, alpha: 0.35 });
    if (variant % 3 === 1) {
      g.roundRect(-50, 23, 22, 14, 5).fill({ color: home.accent, alpha: 0.48 });
      g.roundRect(28, 23, 22, 14, 5).fill({ color: home.accent, alpha: 0.38 });
    }
    if (home.level >= 4) g.poly([44, -62, 74, -52, 44, -40]).fill(home.accent);
  }

  private drawHomePersonalDecor(g: Graphics, home: WorldHome) {
    const variant = this.variant(home);
    g.roundRect(-22, 58, 44, 10, 5).fill({ color: variant % 2 === 0 ? palette.roofRed : home.accent, alpha: 0.58 });
    g.circle(-22, 63, 4).fill({ color: 0xfff6cf, alpha: 0.74 });
    g.circle(22, 63, 4).fill({ color: 0xfff6cf, alpha: 0.74 });
    if (home.level >= 2) {
      const leftColor = variant % 3 === 0 ? palette.flowerYellow : palette.flowerPink;
      const rightColor = variant % 3 === 1 ? palette.flowerPink : palette.grassMid;
      g.circle(-74, 56, 8).fill(leftColor);
      g.circle(-84, 63, 6).fill(palette.grassMid);
      g.circle(76, 58, 7).fill(rightColor);
      g.circle(86, 64, 5).fill(palette.flowerYellow);
    }
    if (home.level >= 3 && variant % 2 === 0) {
      g.moveTo(-78, 76).lineTo(-40, 76).stroke({ width: 4, color: palette.woodDark, alpha: 0.38, cap: "round" });
      g.moveTo(40, 76).lineTo(78, 76).stroke({ width: 4, color: palette.woodDark, alpha: 0.38, cap: "round" });
    }
    if (home.level >= 4 && variant % 2 === 1) {
      g.rect(66, 16, 5, 48).fill(palette.woodDark);
      g.circle(68, 10, 12).fill(0xffe79a).stroke({ width: 2, color: 0xfff6d4, alpha: 0.72 });
    }
    if (home.level >= 5) {
      const color = variant % 2 === 0 ? home.accent : palette.accent;
      g.circle(-55, 38, 6).fill(color);
      g.circle(55, 38, 6).fill(color);
      g.moveTo(-62, 44).quadraticCurveTo(0, 24, 62, 44);
      g.stroke({ width: 3, color, alpha: 0.3, cap: "round" });
      g.poly([-6, -92, 0, -106, 6, -92, 0, -84]).fill({ color, alpha: 0.78 }).stroke({
        width: 2,
        color: 0xfff6cf,
        alpha: 0.45,
      });
    }
  }

  private variant(home: WorldHome) {
    const numericId = Number.parseInt(home.id.replace(/\D/g, ""), 10);
    return Number.isFinite(numericId) ? numericId % 4 : 0;
  }

  private drawLevelDecor(home: WorldHome) {
    const decor = new Container();
    const g = new Graphics();
    if (home.level >= 2) {
      g.circle(-62, 62, 4.5).fill({ color: palette.flowerPink, alpha: 0.42 });
      g.circle(-64, 60, 2).fill({ color: 0xffffff, alpha: 0.34 });
      g.circle(60, 60, 4.5).fill({ color: palette.grassMid, alpha: 0.38 });
      g.circle(62, 58, 2).fill({ color: 0xffffff, alpha: 0.24 });
    }
    if (home.level >= 3) {
      g.moveTo(-72, 70).lineTo(72, 70).stroke({ width: 2, color: palette.woodDark, alpha: 0.2, cap: "round" });
    }
    if (home.level >= 4) {
      g.circle(-42, -42, 5).fill({ color: palette.accent, alpha: 0.34 });
      g.circle(-42, -42, 16).fill({ color: palette.accent, alpha: 0.04 });
    }
    decor.addChild(g);

    const plaqueGroup = new Container();
    const plaqueText = new Text({
      text: `Lv.${home.level}`,
      resolution: 2,
      style: { fontFamily: "Georgia, Microsoft YaHei", fontSize: 18, fontWeight: "900", fill: 0x664325 },
    });
    plaqueText.anchor.set(0.5);
    plaqueText.y = 87;
    const plaqueBg = new Graphics().roundRect(-34, 72, 68, 30, 14).fill(0xffe7a8).stroke({
      width: 2,
      color: palette.sandInk,
      alpha: 0.28,
    });
    plaqueGroup.addChild(plaqueBg, plaqueText);
    return { decor, plaque: plaqueGroup };
  }

  private drawHomePrompt(home: WorldHome) {
    const prompt = new Container();
    prompt.y = -104;
    const labelName = home.childName;
    const text = new Text({
      text: labelName,
      resolution: 3,
      style: { fontFamily: "Microsoft YaHei, PingFang SC", fontSize: 16, fontWeight: "900", fill: palette.textMain },
    });
    text.anchor.set(0.5);
    text.x = 8;
    const width = Math.max(82, text.width + 36);
    const bg = new Graphics();
    bg.ellipse(0, 18, width * 0.34, 7).fill({ color: palette.inkShadow, alpha: 0.12 });
    bg.roundRect(-width / 2, -16, width, 32, 14).fill(0xfff6d7).stroke({
      width: 2,
      color: home.accent,
      alpha: 0.42,
    });
    bg.circle(-width / 2 + 14, 0, 5).fill(home.accent);
    bg.circle(-width / 2 + 14, 0, 2.5).fill(0xfff6d7);
    prompt.addChild(bg, text);
    return prompt;
  }

  private drawSelectedBeacon(home: WorldHome) {
    const beacon = new Container();
    beacon.y = -104;
    const text = new Text({
      text: home.childName,
      resolution: 3,
      style: { fontFamily: "Microsoft YaHei, PingFang SC", fontSize: 18, fontWeight: "900", fill: palette.textMain },
    });
    text.anchor.set(0.5);
    text.x = 12;
    text.y = -5;
    const width = Math.max(94, Math.min(150, text.width + 42));
    const g = new Graphics();
    g.ellipse(4, 31, width * 0.36, 7).fill({ color: palette.inkShadow, alpha: 0.13 });
    g.rect(-width / 2 - 13, -11, 7, 48).fill({ color: palette.woodDark, alpha: 0.82 });
    g.roundRect(-width / 2, -27, width, 38, 14).fill(0xfff3c8).stroke({
      width: 3,
      color: home.accent,
      alpha: 0.42,
    });
    g.poly([width / 2 - 10, -27, width / 2 + 17, -8, width / 2 - 10, 11]).fill({
      color: home.accent,
      alpha: 0.22,
    });
    g.circle(-width / 2 + 18, -8, 8).fill(home.accent);
    g.circle(-width / 2 + 18, -8, 3.4).fill(0xfff3c8);
    g.circle(width / 2 - 18, -9, 3.8).fill({ color: palette.accent, alpha: 0.9 });
    beacon.addChild(g, text);
    return beacon;
  }

  private targetScale(childId: string, node: HomeNode) {
    if (childId === this.selectedChildId) return assetScaleRules.home.selectedScale;
    return node.hovered ? assetScaleRules.home.hoverScale : 1;
  }
}
