import { Container, Graphics, Text, Ticker } from "pixi.js";
import { regions } from "../regionConfig";
import { cameraConfig } from "../cameraConfig";
import { palette } from "../artDirection";
import type { MapRegion, RegionId, VirtueRegionEnergy, WorldPoint } from "../types";
import { v4RegionAssets, v4RegionAssetWidths } from "../v4MapAssets";
import { addAssetSprite } from "./assetSprites";
import { drawOrganicPolygon, flatten } from "./drawing";

interface RegionNode {
  id: RegionId;
  region: MapRegion;
  highlight: Graphics;
  banner: Container;
  energyGlow: Graphics;
  energyBadge: Container;
  energyBadgeBoard: Graphics;
  energyBadgeDot: Graphics;
  energyBadgeText: Text;
  energy?: VirtueRegionEnergy;
  energyElapsed: number;
}

export class RegionLayer {
  private readonly nodes = new Map<RegionId, RegionNode>();
  private activeRegionId?: RegionId;
  private activeElapsed = 0;

  constructor(
    private readonly layer: Container,
    private readonly overlayLayer: Container,
    private readonly onFocusRegion: (regionId: RegionId, x: number, y: number, zoom: number) => void,
  ) {
    this.draw();
  }

  private draw() {
    regions.forEach((region) => {
      const root = new Container();
      addAssetSprite(root, {
        id: `v4-region-${region.id}`,
        url: v4RegionAssets[region.id],
        x: region.center.x,
        y: region.center.y,
        width: v4RegionAssetWidths[region.id],
      });

      const hit = new Graphics();
      hit.poly(region.shape.map((point) => [point.x, point.y]).flat()).fill({ color: 0xffffff, alpha: 0.001 });
      hit.eventMode = "static";
      hit.cursor = "pointer";
      hit.on("pointertap", () => this.onFocusRegion(region.id, region.center.x, region.center.y, cameraConfig.communityZoom));

      const highlight = new Graphics();
      drawOrganicPolygon(highlight, region.shape, region.accent, region.accent, {
        fillAlpha: 0.08,
        strokeAlpha: 0.72,
        strokeWidth: 9,
      });
      highlight.visible = false;

      const energyGlow = new Graphics();
      energyGlow.visible = false;

      const banner = this.createRegionBanner(region);
      banner.x = region.center.x;
      banner.y = region.center.y - Math.min(120, region.radiusY * 0.42);
      banner.visible = false;

      const energyBadgeBoard = new Graphics();
      const energyBadgeDot = new Graphics();
      const energyBadgeText = new Text({
        text: "",
        style: { fontFamily: "Microsoft YaHei, PingFang SC", fontSize: 15, fontWeight: "900", fill: palette.textMain },
      });
      energyBadgeText.anchor.set(0.5);
      const energyBadge = new Container();
      energyBadge.x = region.signPosition.x;
      energyBadge.y = region.signPosition.y + 72;
      energyBadge.visible = false;
      energyBadge.addChild(energyBadgeBoard, energyBadgeDot, energyBadgeText);

      root.addChild(energyGlow, hit, highlight);
      this.overlayLayer.addChild(banner);
      this.overlayLayer.addChild(energyBadge);
      this.nodes.set(region.id, {
        id: region.id,
        region,
        highlight,
        banner,
        energyGlow,
        energyBadge,
        energyBadgeBoard,
        energyBadgeDot,
        energyBadgeText,
        energyElapsed: 0,
      });
      this.layer.addChild(root);
    });
  }

  setEnergy(items: VirtueRegionEnergy[]) {
    const byRegion = new Map(items.map((item) => [item.regionId, item]));
    this.nodes.forEach((node, regionId) => {
      const energy = byRegion.get(regionId);
      node.energy = energy;
      node.energyElapsed = 0;
      node.energyGlow.clear();
      node.energyBadgeBoard.clear();
      node.energyBadgeDot.clear();
      node.energyBadge.visible = Boolean(energy);
      node.energyGlow.visible = Boolean(energy);
      if (!energy) return;

      const glowAlpha = energy.current ? 0.18 : 0.1;
      const strokeAlpha = energy.current ? 0.72 : 0.42;
      drawOrganicPolygon(node.energyGlow, node.region.shape, energy.color, energy.color, {
        fillAlpha: glowAlpha,
        strokeAlpha,
        strokeWidth: energy.current ? 13 : 8,
      });
      this.drawEnergySparks(node.energyGlow, node.region, energy);
      this.paintEnergyBadge(node, energy);
    });
  }

  setActive(regionId: RegionId) {
    this.activeRegionId = regionId;
    this.activeElapsed = 0;
    this.nodes.forEach((node, id) => {
      const active = id === regionId;
      node.highlight.visible = active;
      node.banner.visible = active;
      node.highlight.alpha = active ? 0.9 : 0;
      node.banner.alpha = active ? 1 : 0;
      node.banner.scale.set(0.96);
    });
    const activeNode = this.nodes.get(regionId);
    if (activeNode) this.overlayLayer.addChild(activeNode.banner);
  }

  update(ticker: Ticker, zoom: number) {
    this.nodes.forEach((node) => {
      if (!node.energy) return;
      node.energyElapsed += ticker.deltaMS;
      const currentPulse = node.energy.current ? Math.sin(node.energyElapsed / 260) * 0.1 : Math.sin(node.energyElapsed / 420) * 0.04;
      node.energyGlow.alpha = node.energy.current ? 0.62 + currentPulse : 0.34 + currentPulse;
      node.energyBadge.alpha = zoom >= 1.48 && !node.energy.current ? 0.72 : 1;
      node.energyBadge.scale.set(node.energy.current ? 1 + Math.sin(node.energyElapsed / 300) * 0.03 : 0.96);
    });

    if (!this.activeRegionId) return;
    this.activeElapsed += ticker.deltaMS;
    const node = this.nodes.get(this.activeRegionId);
    if (!node) return;
    const pulse = 0.78 + Math.sin(this.activeElapsed / 220) * 0.08;
    node.highlight.alpha = this.activeElapsed > 1800 ? 0.38 : pulse;
    node.banner.alpha = this.activeElapsed > 2200 || zoom >= 1.38 ? 0 : 1;
    node.banner.visible = node.banner.alpha > 0.02;
    node.banner.scale.set(0.96 + Math.min(this.activeElapsed / 420, 1) * 0.04);
  }

  private drawEnergySparks(g: Graphics, region: MapRegion, energy: VirtueRegionEnergy) {
    const count = Math.min(6, energy.count + 2);
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + region.center.x * 0.001;
      const x = region.center.x + Math.cos(angle) * region.radiusX * (0.18 + (index % 3) * 0.07);
      const y = region.center.y + Math.sin(angle) * region.radiusY * (0.18 + (index % 2) * 0.08);
      const radius = energy.current ? 7 + (index % 2) * 2 : 5 + (index % 2);
      g.circle(x, y, radius + 5).fill({ color: 0xffffff, alpha: energy.current ? 0.2 : 0.12 });
      g.circle(x, y, radius).fill({ color: energy.color, alpha: energy.current ? 0.72 : 0.48 });
    }
  }

  private paintEnergyBadge(node: RegionNode, energy: VirtueRegionEnergy) {
    const width = Math.max(86, energy.displayText.length * 15 + 38);
    node.energyBadgeBoard.roundRect(-width / 2, -18, width, 36, 18).fill(0xfffbef).stroke({
      width: energy.current ? 4 : 2.5,
      color: energy.color,
      alpha: energy.current ? 0.78 : 0.48,
    });
    node.energyBadgeBoard.roundRect(-width / 2 + 5, -12, width - 10, 24, 12).fill({
      color: energy.color,
      alpha: energy.current ? 0.12 : 0.07,
    });
    node.energyBadgeDot.circle(-width / 2 + 20, 0, energy.current ? 7 : 5.5).fill(energy.color);
    node.energyBadgeDot.circle(-width / 2 + 20, 0, energy.current ? 13 : 9).stroke({ width: 2, color: 0xffffff, alpha: 0.7 });
    node.energyBadgeText.text = energy.displayText;
    node.energyBadgeText.x = 10;
    node.energyBadgeText.y = 0;
  }

  private drawRegionContour(g: Graphics, points: WorldPoint[], accent: number) {
    const inner = this.scalePolygon(points, 0.94, 0, 6);
    const innerFine = this.scalePolygon(points, 0.84, 0, 12);
    g.poly(flatten(inner)).stroke({ width: 6, color: 0xfff6cf, alpha: 0.2, join: "round" });
    g.poly(flatten(inner)).stroke({ width: 2, color: accent, alpha: 0.2, join: "round" });
    g.poly(flatten(innerFine)).stroke({ width: 3, color: 0xffffff, alpha: 0.13, join: "round" });
  }

  private scalePolygon(points: WorldPoint[], factor: number, offsetX: number, offsetY: number) {
    const center = points.reduce(
      (sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }),
      { x: 0, y: 0 },
    );
    return points.map((point) => ({
      x: center.x + (point.x - center.x) * factor + offsetX,
      y: center.y + (point.y - center.y) * factor + offsetY,
    }));
  }

  private createRegionBanner(region: MapRegion) {
    const banner = new Container();
    const width = Math.max(226, region.name.length * 24 + 58);
    const board = new Graphics();
    board.ellipse(0, 36, width * 0.42, 14).fill({ color: palette.inkShadow, alpha: 0.13 });
    board.rect(-7, 20, 14, 54).fill(palette.woodDark);
    board.roundRect(-width / 2, -33, width, 58, 16).fill(0xfff6d7).stroke({ width: 5, color: region.accent, alpha: 0.54 });
    board.roundRect(-width / 2 + 10, -24, width - 20, 38, 12).fill(0xffedb7).stroke({ width: 2, color: 0xffffff, alpha: 0.46 });
    board.circle(-width / 2 + 22, -4, 6).fill(region.accent);
    board.circle(width / 2 - 22, -4, 6).fill(region.accent);
    this.drawBannerEmblem(board, region.id, -width / 2 + 36, -4, region.accent);
    const text = new Text({
      text: region.name,
      style: { fontFamily: "Microsoft YaHei, PingFang SC", fontSize: 20, fontWeight: "900", fill: palette.textMain },
    });
    text.anchor.set(0.5);
    text.x = 12;
    text.y = -4;
    const tag = new Text({
      text: this.regionTagline(region.id),
      style: { fontFamily: "Microsoft YaHei, PingFang SC", fontSize: 12, fontWeight: "800", fill: palette.textSubtle },
    });
    tag.anchor.set(0.5);
    tag.x = 12;
    tag.y = 18;
    banner.addChild(board, text, tag);
    return banner;
  }

  private regionTagline(regionId: RegionId) {
    const taglines: Record<RegionId, string> = {
      "growth-plaza": "XP 光点汇聚",
      mangrove: "树屋与木桥",
      "shell-bay": "贝壳屋社区",
      "pearl-bay": "珍珠水湾",
      "sun-town": "花园小镇",
      "math-arena": "贝壳算术",
      "old-street": "德育任务街区",
    };
    return taglines[regionId];
  }

  private drawBannerEmblem(g: Graphics, regionId: RegionId, x: number, y: number, color: number) {
    g.circle(x, y, 15).fill({ color, alpha: 0.84 }).stroke({ width: 3, color: 0xfff6d7, alpha: 0.7 });
    if (regionId === "growth-plaza") {
      g.rect(x - 2, y - 7, 4, 15).fill(0xfff6d7);
      g.circle(x - 7, y - 8, 6).fill(0xfff6d7);
      g.circle(x + 7, y - 8, 6).fill(0xfff6d7);
      return;
    }
    if (regionId === "math-arena") {
      g.roundRect(x - 9, y - 2, 18, 4, 2).fill(0xfff6d7);
      g.roundRect(x - 2, y - 9, 4, 18, 2).fill(0xfff6d7);
      return;
    }
    if (regionId === "pearl-bay") {
      g.circle(x, y, 8).fill(0xfff6d7);
      g.circle(x - 3, y - 3, 3).fill(0xffffff);
      return;
    }
    if (regionId === "shell-bay") {
      g.moveTo(x - 9, y + 4);
      g.arc(x, y + 4, 10, Math.PI, 0).stroke({ width: 3, color: 0xfff6d7, alpha: 0.9 });
      return;
    }
    if (regionId === "mangrove") {
      g.rect(x - 2, y - 2, 4, 12).fill(0xfff6d7);
      g.circle(x - 6, y - 5, 6).fill(0xfff6d7);
      g.circle(x + 5, y - 8, 7).fill(0xfff6d7);
      return;
    }
    if (regionId === "sun-town") {
      g.poly([x - 9, y + 3, x, y - 9, x + 9, y + 3]).fill(0xfff6d7);
      g.roundRect(x - 7, y + 3, 14, 9, 3).fill(0xfff6d7);
      return;
    }
    g.rect(x - 9, y - 7, 18, 14).fill(0xfff6d7);
    g.poly([x - 12, y - 7, x, y - 16, x + 12, y - 7]).fill(0xfff6d7);
  }

  private drawTerrainDetails(g: Graphics, regionId: RegionId) {
    if (regionId === "mangrove") {
      [
        [
          { x: 350, y: 520 },
          { x: 492, y: 448 },
          { x: 625, y: 500 },
          { x: 575, y: 640 },
          { x: 412, y: 650 },
        ],
        [
          { x: 680, y: 612 },
          { x: 842, y: 562 },
          { x: 935, y: 672 },
          { x: 806, y: 758 },
          { x: 650, y: 730 },
        ],
      ].forEach((points) => g.poly(flatten(points)).fill({ color: palette.grassDark, alpha: 0.22 }));
      for (let i = 0; i < 9; i += 1) {
        const x = 360 + i * 70;
        const y = 710 - (i % 3) * 82;
        g.moveTo(x, y);
        g.quadraticCurveTo(x + 28, y - 20, x + 58, y - 6);
        g.stroke({ width: 3, color: palette.grassDark, alpha: 0.3, cap: "round" });
      }
      [
        [
          { x: 310, y: 610 },
          { x: 450, y: 592 },
          { x: 590, y: 628 },
        ],
        [
          { x: 716, y: 452 },
          { x: 836, y: 504 },
          { x: 946, y: 560 },
        ],
      ].forEach(([start, control, end]) => {
        g.moveTo(start.x, start.y);
        g.quadraticCurveTo(control.x, control.y, end.x, end.y);
        g.stroke({ width: 9, color: 0x3f7654, alpha: 0.24, cap: "round" });
        g.moveTo(start.x + 4, start.y - 5);
        g.quadraticCurveTo(control.x + 8, control.y - 10, end.x - 8, end.y - 4);
        g.stroke({ width: 3, color: 0xfff6cf, alpha: 0.16, cap: "round" });
      });
      return;
    }

    if (regionId === "shell-bay") {
      for (let i = 0; i < 11; i += 1) {
        const x = 300 + i * 66;
        const y = 1010 + Math.sin(i * 1.7) * 96;
        g.moveTo(x - 19, y);
        g.arc(x, y, 19, Math.PI, 0).stroke({ width: 3, color: palette.sandInk, alpha: 0.22 });
      }
      g.moveTo(270, 1168).quadraticCurveTo(510, 1222, 730, 1185).quadraticCurveTo(878, 1162, 972, 1215);
      g.stroke({ width: 4, color: 0xfff0ba, alpha: 0.54, cap: "round" });
      for (let i = 0; i < 7; i += 1) {
        g.circle(382 + i * 72, 918 + (i % 2) * 42, 5).fill({ color: 0xfff6cf, alpha: 0.58 });
      }
      return;
    }

    if (regionId === "pearl-bay") {
      g.poly(
        flatten([
          { x: 1514, y: 476 },
          { x: 1720, y: 410 },
          { x: 2005, y: 512 },
          { x: 1958, y: 724 },
          { x: 1650, y: 720 },
          { x: 1468, y: 610 },
        ]),
      ).fill({ color: palette.pearlWater, alpha: 0.58 });
      for (let i = 0; i < 7; i += 1) {
        g.circle(1540 + i * 84, 540 + Math.sin(i) * 80, 14 + (i % 3) * 8).fill({ color: palette.pearlWhite, alpha: 0.58 });
      }
      for (let i = 0; i < 4; i += 1) {
        const x = 1580 + i * 130;
        const y = 640 + Math.sin(i * 1.8) * 48;
        g.ellipse(x, y, 58, 18).stroke({ width: 3, color: palette.oceanLightLine, alpha: 0.28 });
      }
      return;
    }

    if (regionId === "sun-town") {
      for (let i = 0; i < 4; i += 1) {
        g.roundRect(1450 + i * 138, 1015 + (i % 2) * 88, 80, 34, 10).fill({ color: palette.grassLight, alpha: 0.52 });
        g.circle(1472 + i * 138, 1033 + (i % 2) * 88, 6).fill(palette.flowerPink);
        g.circle(1502 + i * 138, 1035 + (i % 2) * 88, 6).fill(palette.flowerYellow);
      }
      g.moveTo(1450, 964).quadraticCurveTo(1660, 1008, 1900, 982).quadraticCurveTo(2028, 974, 2070, 1042);
      g.stroke({ width: 6, color: palette.townDark, alpha: 0.18, cap: "round" });
      return;
    }

    if (regionId === "math-arena") {
      g.ellipse(1240, 1160, 230, 76).fill({ color: 0xffefc2, alpha: 0.88 });
      g.ellipse(1240, 1160, 286, 105).stroke({ width: 14, color: palette.arenaDark, alpha: 0.36 });
      g.ellipse(1240, 1160, 176, 48).stroke({ width: 5, color: palette.accent, alpha: 0.75 });
      for (let i = -3; i <= 3; i += 1) {
        g.rect(1240 + i * 54 - 18, 1268, 36, 10).fill({ color: palette.arenaDark, alpha: 0.26 });
      }
      return;
    }

    if (regionId === "old-street") {
      g.roundRect(892, 360, 430, 82, 22).fill({ color: 0xf4c27a, alpha: 0.34 });
      g.moveTo(820, 488).quadraticCurveTo(1030, 472, 1246, 500).quadraticCurveTo(1340, 512, 1440, 468);
      g.stroke({ width: 7, color: palette.oldStreetDark, alpha: 0.18, cap: "round" });
      for (let i = 0; i < 5; i += 1) {
        g.roundRect(840 + i * 126, 405 + (i % 2) * 42, 98, 42, 8).fill({ color: palette.wallLight, alpha: 0.48 });
      }
    }
  }
}
