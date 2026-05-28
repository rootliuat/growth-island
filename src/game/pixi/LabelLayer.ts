import { Container, Graphics, Text } from "pixi.js";
import { assetScaleRules, getRegionSignWidth } from "../assetScaleRules";
import { palette } from "../artDirection";
import { regions } from "../regionConfig";
import type { MapRegion, WorldMapData, WorldSpirit } from "../types";
import { v4MapAssets } from "../v4MapAssets";
import { addAssetSprite } from "./assetSprites";

export class LabelLayer {
  private readonly regionLabels: Container[] = [];
  private readonly spiritLabels = new Map<string, Container>();
  private readonly spiritMeta = new Map<string, { rank: number; level: number }>();

  constructor(private readonly layer: Container) {
    regions.forEach((region) => {
      const node = new Container();
      node.x = region.signPosition.x;
      node.y = region.signPosition.y;
      addAssetSprite(node, {
        id: `v4-region-sign-${region.id}`,
        url: v4MapAssets.regionSign,
        y: 1,
        width: getRegionSignWidth(region.name.length),
      });
      const text = new Text({
        text: region.name,
        style: {
          fontFamily: "Microsoft YaHei, PingFang SC",
          fontSize: region.name.length > 6 ? 20 : 22,
          fontWeight: "900",
          fill: palette.textMain,
        },
      });
      text.anchor.set(0.5);
      text.y = -3;
      node.addChild(text);
      this.regionLabels.push(node);
      this.layer.addChild(node);
    });
  }

  update(data: WorldMapData) {
    const activeIds = new Set(data.spirits.map((spirit) => spirit.id));
    for (const [id, node] of this.spiritLabels) {
      if (activeIds.has(id)) continue;
      node.destroy({ children: true });
      this.spiritLabels.delete(id);
      this.spiritMeta.delete(id);
    }
    data.spirits.forEach((spirit) => {
      let node = this.spiritLabels.get(spirit.id);
      if (!node) {
        node = this.createSpiritLabel();
        this.spiritLabels.set(spirit.id, node);
        this.layer.addChild(node);
      }
      node.x = spirit.spritePosition.x + assetScaleRules.label.selectedNameOffset.x;
      node.y = spirit.spritePosition.y + assetScaleRules.label.selectedNameOffset.y;
      node.visible = spirit.id === data.selectedChildId;
      this.spiritMeta.set(spirit.id, { rank: spirit.child.rank, level: spirit.child.level });
      this.updateSpiritLabel(node, spirit);
    });
  }

  updateZoom(zoom: number, selectedChildId: string) {
    this.regionLabels.forEach((label) => {
      label.visible = zoom < 1.2;
      label.alpha = zoom < 0.72 ? 1 : 0.76;
      label.scale.set(zoom < 0.72 ? 1 : 0.9);
    });
    this.spiritLabels.forEach((label, childId) => {
      const selected = childId === selectedChildId;
      label.visible = selected && zoom >= 0.86;
      label.scale.set(zoom >= 1.42 ? 0.74 : 0.68);
      const bubble = label.getChildByLabel("activity-bubble");
      if (bubble) bubble.visible = selected && zoom >= 1.55;
    });
  }

  private createSpiritLabel() {
    const node = new Container();
    const bg = new Graphics();
    bg.label = "name-bg";
    const text = new Text({
      text: "",
      style: { fontFamily: "Microsoft YaHei, PingFang SC", fontSize: 12, fontWeight: "900", fill: palette.textMain },
    });
    text.label = "name";
    text.anchor.set(0.5);

    const bubble = new Container();
    bubble.label = "activity-bubble";
    bubble.y = 32;
    const bubbleBg = new Graphics();
    bubbleBg.label = "bubble-bg";
    const tokenBg = new Graphics();
    tokenBg.label = "bubble-token-bg";
    const tokenText = new Text({
      text: "",
      style: { fontFamily: "Georgia, Microsoft YaHei, PingFang SC", fontSize: 10, fontWeight: "900", fill: 0xfff9df },
    });
    tokenText.label = "bubble-token";
    tokenText.anchor.set(0.5);
    const bubbleText = new Text({
      text: "",
      style: { fontFamily: "Microsoft YaHei, PingFang SC", fontSize: 10, fontWeight: "800", fill: palette.textSubtle },
    });
    bubbleText.label = "bubble-text";
    bubbleText.anchor.set(0.5);
    bubble.addChild(bubbleBg, tokenBg, tokenText, bubbleText);

    node.addChild(bg, text, bubble);
    return node;
  }

  private createRegionSign(region: MapRegion) {
    const width = region.name.length > 6 ? 206 : region.name.length > 4 ? 166 : 132;
    const g = new Graphics();
    const signFill = region.id === "pearl-bay" ? 0xe5f5ea : region.id === "math-arena" ? 0xf1dfaa : 0xffe7ad;
    const shadowY = region.id === "growth-plaza" ? 34 : 46;
    g.ellipse(0, shadowY, width * 0.43, 12).fill({ color: palette.inkShadow, alpha: 0.12 });

    if (region.id === "growth-plaza") {
      g.roundRect(-width / 2, -31, width, 48, 16).fill(0xf7e6aa).stroke({
        width: 5,
        color: palette.sandInk,
        alpha: 0.3,
      });
      g.roundRect(-width / 2 + 8, -24, width - 16, 34, 12).fill(0xfff3c8).stroke({
        width: 2,
        color: region.accent,
        alpha: 0.38,
      });
      g.circle(-width / 2 + 20, -7, 6).fill(region.accent);
      g.circle(width / 2 - 20, -7, 6).fill(region.accent);
      g.rect(-6, 16, 12, 46).fill({ color: palette.sandInk, alpha: 0.72 });
      return g;
    }

    if (region.id === "math-arena") {
      g.rect(-5, -8, 10, 78).fill(palette.woodDark);
      g.poly([-width / 2 - 10, -32, width / 2 - 2, -32, width / 2 + 18, -6, width / 2 - 2, 20, -width / 2 - 10, 20]).fill(signFill).stroke({
        width: 4,
        color: region.accent,
        alpha: 0.48,
      });
      g.poly([width / 2 - 2, -32, width / 2 + 18, -6, width / 2 - 2, 20]).fill({ color: region.accent, alpha: 0.18 });
      g.circle(-width / 2 + 8, -7, 4).fill(0xfff7da);
      return g;
    }

    if (region.id === "old-street") {
      g.rect(-5, 13, 10, 60).fill(palette.woodDark);
      g.roundRect(-width / 2, -27, width, 45, 8).fill(signFill).stroke({
        width: 4,
        color: region.accent,
        alpha: 0.48,
      });
      g.poly([-width / 2 - 12, -27, width / 2 + 12, -27, width / 2 - 2, -45, -width / 2 + 2, -45]).fill(palette.roofRed).stroke({
        width: 3,
        color: palette.roofDark,
        alpha: 0.35,
      });
      return g;
    }

    g.rect(-5, 14, 10, 58).fill(palette.woodDark);
    g.roundRect(-width / 2, -31, width, 46, 12).fill(signFill).stroke({
      width: 4,
      color: region.accent,
      alpha: 0.5,
    });
    g.roundRect(-width / 2 + 8, -24, width - 16, 31, 10).stroke({
      width: 2,
      color: 0xffffff,
      alpha: 0.32,
    });
    g.circle(-width / 2 + 17, -9, 4).fill(0xf8f1d5);
    g.circle(width / 2 - 17, -9, 4).fill(0xf8f1d5);
    if (region.id === "mangrove") {
      g.circle(-width / 2 - 8, -5, 13).fill({ color: palette.grassDark, alpha: 0.82 });
      g.circle(-width / 2 + 8, -22, 14).fill({ color: palette.grassMid, alpha: 0.86 });
    }
    if (region.id === "shell-bay") {
      g.moveTo(width / 2 - 18, 18);
      g.arc(width / 2 - 18, 18, 18, Math.PI, 0).fill({ color: palette.shellPink, alpha: 0.9 }).stroke({
        width: 2,
        color: palette.sandInk,
        alpha: 0.24,
      });
    }
    if (region.id === "pearl-bay") {
      g.circle(width / 2 - 12, 12, 12).fill({ color: palette.pearlWhite, alpha: 0.9 }).stroke({
        width: 2,
        color: region.accent,
        alpha: 0.28,
      });
    }
    if (region.id === "sun-town") {
      g.poly([width / 2 - 28, 16, width / 2 - 10, -8, width / 2 + 8, 16]).fill({ color: palette.roofRed, alpha: 0.84 });
      g.roundRect(width / 2 - 24, 14, 28, 18, 5).fill({ color: palette.wallLight, alpha: 0.9 });
    }
    return g;
  }

  private updateSpiritLabel(node: Container, spirit: WorldSpirit) {
    const bg = node.getChildByLabel("name-bg") as Graphics | undefined;
    const text = node.getChildByLabel("name") as Text | undefined;
    const bubble = node.getChildByLabel("activity-bubble") as Container | undefined;
    if (text) text.text = spirit.child.name;
    if (bg) {
      const width = Math.max(60, Math.min(102, (text?.width ?? 50) + 24));
      bg.clear();
      bg.ellipse(0, 14, width * 0.36, 7).fill({ color: palette.inkShadow, alpha: 0.1 });
      bg.roundRect(-width / 2, -14, width, 27, 13).fill(0xfff6d7).stroke({
        width: 2,
        color: spirit.accent,
        alpha: 0.32,
      });
      bg.circle(-width / 2 + 13, -1, 3).fill({ color: spirit.accent, alpha: 0.58 });
      bg.circle(width / 2 - 13, -1, 3).fill({ color: spirit.accent, alpha: 0.58 });
    }
    const bubbleText = bubble?.getChildByLabel("bubble-text") as Text | undefined;
    const bubbleBg = bubble?.getChildByLabel("bubble-bg") as Graphics | undefined;
    const tokenBg = bubble?.getChildByLabel("bubble-token-bg") as Graphics | undefined;
    const tokenText = bubble?.getChildByLabel("bubble-token") as Text | undefined;
    if (bubbleText && bubbleBg && tokenBg && tokenText) {
      const note = spirit.lastActivity ? this.cleanActivity(spirit.lastActivity) : "今天也在成长";
      const delta = spirit.lastActivityDelta ?? 0;
      const positive = delta >= 0;
      bubbleText.text = note;
      tokenText.text = delta === 0 ? "XP" : delta > 0 ? `+${delta}` : `${delta}`;
      const tokenWidth = Math.max(36, tokenText.width + 14);
      const width = Math.max(96, Math.min(136, bubbleText.width + tokenWidth + 20));
      const tokenX = -width / 2 + tokenWidth / 2 + 10;
      bubbleBg.clear();
      bubbleBg.ellipse(0, 17, width * 0.34, 7).fill({ color: palette.inkShadow, alpha: 0.1 });
      bubbleBg.roundRect(-width / 2, -14, width, 28, 13).fill(0xf4f1e6).stroke({
        width: 2,
        color: spirit.accent,
        alpha: 0.22,
      });
      bubbleBg.poly([-9, -15, 0, -24, 9, -15]).fill(0xf4f1e6).stroke({
        width: 2,
        color: spirit.accent,
        alpha: 0.12,
      });
      tokenBg.clear();
      tokenBg.roundRect(tokenX - tokenWidth / 2, -10, tokenWidth, 20, 10)
        .fill(positive ? palette.positive : palette.negative)
        .stroke({ width: 2, color: 0xfff6d7, alpha: 0.8 });
      tokenBg.circle(tokenX + tokenWidth / 2 - 8, -2, 3).fill({ color: 0xffffff, alpha: 0.48 });
      tokenText.x = tokenX;
      tokenText.y = 0;
      bubbleText.x = tokenX + tokenWidth / 2 + (width - tokenWidth - 22) / 2;
      bubbleText.y = 0;
    }
  }

  private cleanActivity(reason: string) {
    if (reason.includes("撤销")) return "撤销记录";
    if (reason.includes("减分") || reason.includes("扣分")) return "调整记录";
    if (reason.includes("加分")) return "成长记录";
    return reason.replace(/^演示数据[:：]?\s*/, "").slice(0, 8);
  }
}
