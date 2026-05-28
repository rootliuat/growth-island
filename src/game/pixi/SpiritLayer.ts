import { Container, Graphics, Rectangle, Sprite, Text, Ticker } from "pixi.js";
import { assetScaleRules, getDoorFocusTarget, getSpiritTargetWidth } from "../assetScaleRules";
import { palette } from "../artDirection";
import { cameraConfig } from "../cameraConfig";
import { makeSpiritSprite } from "../pixiAssets";
import type { WorldMapData, WorldSpirit } from "../types";
import { v4MapAssets } from "../v4MapAssets";
import { addAssetSprite } from "./assetSprites";

interface SpiritNode {
  root: Container;
  halo: Graphics;
  body: Container;
  levelBadge: Container;
  moodDot: Graphics;
  rank: number;
  level: number;
}

export class SpiritLayer {
  private readonly nodes = new Map<string, SpiritNode>();
  private elapsed = 0;
  private selectedChildId = "";
  private zoomScale = 1;
  private zoom = 1;

  constructor(
    private readonly layer: Container,
    private readonly onSelect: (childId: string) => void,
    private readonly onFocus: (x: number, y: number, zoom: number) => void,
  ) {}

  update(data: WorldMapData) {
    this.selectedChildId = data.selectedChildId;
    const activeIds = new Set(data.spirits.map((spirit) => spirit.id));
    for (const [id, node] of this.nodes) {
      if (activeIds.has(id)) continue;
      node.root.destroy({ children: true });
      this.nodes.delete(id);
    }

    data.spirits.forEach((spirit) => {
      let node = this.nodes.get(spirit.id);
      if (!node) {
        node = this.createNode(spirit);
        this.nodes.set(spirit.id, node);
        this.layer.addChild(node.root);
      }
      node.root.x = spirit.spritePosition.x;
      node.root.y = spirit.spritePosition.y;
      node.rank = spirit.child.rank;
      node.level = spirit.child.level;
      node.root.scale.set(this.getTargetScale(spirit.id));
      node.halo.visible = spirit.id === this.selectedChildId;
      node.root.visible = this.shouldShowSpirit(spirit.id, node);
      node.levelBadge.visible = this.shouldShowBadge(spirit.id);
      node.levelBadge.scale.set(this.getBadgeScale(spirit.id));
      node.moodDot.visible = this.shouldShowMoodDot(spirit.id);
      node.moodDot.tint = this.moodTint(spirit.mood);
      const badgeText = node.levelBadge.getChildByLabel("level-text") as Text | undefined;
      if (badgeText) badgeText.text = `Lv.${spirit.child.level}`;
    });
    this.layer.children.sort((a, b) => a.y - b.y);
  }

  getSpiritPosition(childId: string) {
    const node = this.nodes.get(childId);
    if (!node) return undefined;
    return { x: node.root.x, y: node.root.y };
  }

  bounce(childId: string) {
    const node = this.nodes.get(childId);
    if (!node) return;
    node.body.scale.set(1.2);
  }

  updateFrame(ticker: Ticker) {
    this.elapsed += ticker.deltaMS / 1000;
    this.nodes.forEach((node, childId) => {
      if (!node.root.visible) return;
      const breath = 1 + Math.sin(this.elapsed * 2.2 + node.root.x * 0.004) * 0.028;
      const targetRoot = this.getTargetScale(childId);
      const rootScale = node.root.scale.x + (targetRoot - node.root.scale.x) * Math.min(1, ticker.deltaMS / 160);
      node.root.scale.set(rootScale);
      node.body.scale.set(node.body.scale.x + (breath - node.body.scale.x) * 0.08);
      node.body.y = -Math.abs(Math.sin(this.elapsed * 1.6 + node.root.x * 0.01)) * 5;
      node.halo.rotation += 0.006 * ticker.deltaTime;
    });
  }

  updateZoom(zoom: number) {
    this.zoom = zoom;
    this.zoomScale = zoom < 0.78 ? 0.78 : zoom < 1.05 ? 0.9 : 1;
    this.nodes.forEach((node, childId) => {
      node.root.visible = this.shouldShowSpirit(childId, node);
      node.levelBadge.visible = this.shouldShowBadge(childId);
      node.levelBadge.scale.set(this.getBadgeScale(childId));
      node.moodDot.visible = this.shouldShowMoodDot(childId);
    });
  }

  private createNode(spirit: WorldSpirit): SpiritNode {
    const root = new Container();
    root.eventMode = "static";
    root.cursor = "pointer";
    root.hitArea = new Rectangle(-70, -118, 140, 154);
    root.on("pointertap", () => {
      this.onSelect(spirit.id);
      const target = getDoorFocusTarget(spirit.doorPosition, cameraConfig.spiritZoom);
      this.onFocus(target.x, target.y, target.zoom);
      this.bounce(spirit.id);
    });

    const halo = new Graphics();
    halo.ellipse(0, -10, 34, 15).fill({ color: palette.accent, alpha: 0.11 });
    halo.ellipse(0, -13, 43, 21).stroke({ width: 2, color: palette.accent, alpha: 0.45 });
    halo.ellipse(0, -13, 52, 26).stroke({ width: 1.5, color: 0xfff7d2, alpha: 0.28 });
    halo.visible = false;

    const body = new Container();
    addAssetSprite(body, {
      id: `${spirit.id}-spirit-shadow`,
      url: v4MapAssets.spiritShadow,
      x: 0,
      y: -6,
      width: assetScaleRules.spirit.shadowWidth,
      alpha: 0.5,
    });
    const fallback = this.drawFallback(spirit);
    fallback.y = -22;
    body.addChild(fallback);
    if (spirit.imageUrl) {
      makeSpiritSprite(spirit.imageUrl, getSpiritTargetWidth(spirit.child.state)).then((sprite: Sprite) => {
        if (body.destroyed) return;
        sprite.y = 10;
        body.removeChild(fallback);
        fallback.destroy();
        body.addChild(sprite);
      });
    }

    const levelBadge = new Container();
    levelBadge.x = -44;
    levelBadge.y = -58;
    const badgeBg = new Graphics()
      .circle(0, 0, 12)
      .fill(0xffe7a8)
      .stroke({ width: 2, color: spirit.accent, alpha: 0.5 });
    const badgeText = new Text({
      text: `Lv.${spirit.child.level}`,
      style: { fontFamily: "Georgia, Microsoft YaHei", fontSize: 8, fontWeight: "800", fill: 0x573a25 },
    });
    badgeText.label = "level-text";
    badgeText.anchor.set(0.5);
    levelBadge.addChild(badgeBg, badgeText);

    const moodDot = new Graphics().circle(0, 0, 6).fill(0xffffff).stroke({ width: 2, color: 0x66513a, alpha: 0.22 });
    moodDot.x = -38;
    moodDot.y = -20;
    moodDot.tint = this.moodTint(spirit.mood);

    root.addChild(halo, body, levelBadge, moodDot);
    return { root, halo, body, levelBadge, moodDot, rank: spirit.child.rank, level: spirit.child.level };
  }

  private drawFallback(spirit: WorldSpirit) {
    const g = new Graphics();
    const accent = spirit.accent;
    if (spirit.child.state.startsWith("egg")) {
      g.ellipse(0, -22, 23, 34).fill(0xfff9dd).stroke({ width: 3, color: accent, alpha: 0.46 });
      g.ellipse(0, -27, 12, 21).fill({ color: accent, alpha: 0.14 });
      if (spirit.child.state === "egg-4") {
        g.circle(-8, -36, 4).fill(0xffffff);
        g.circle(8, -36, 4).fill(0xffffff);
        g.circle(-8, -36, 2).fill(0x24313a);
        g.circle(8, -36, 2).fill(0x24313a);
      }
      return g;
    }

    g.ellipse(0, -29, 28, 24).fill(0xfffbef).stroke({ width: 3, color: accent, alpha: 0.46 });
    g.circle(-19, -39, 10).fill({ color: accent, alpha: 0.25 });
    g.circle(19, -39, 10).fill({ color: accent, alpha: 0.25 });
    g.ellipse(0, -4, 22, 19).fill({ color: accent, alpha: 0.18 });
    g.circle(-9, -33, 5).fill(0xffffff);
    g.circle(9, -33, 5).fill(0xffffff);
    g.circle(-9, -33, 2.3).fill(0x283940);
    g.circle(9, -33, 2.3).fill(0x283940);
    if (spirit.child.level >= 6) g.circle(0, -28, 36).stroke({ width: 2, color: 0xffd869, alpha: 0.42 });
    return g;
  }

  private moodTint(mood: WorldSpirit["mood"]) {
    if (mood === "happy") return palette.positive;
    if (mood === "proud") return palette.accent;
    if (mood === "sad") return palette.negative;
    if (mood === "sleepy") return 0x90a5b6;
    return palette.grassMid;
  }

  private getTargetScale(childId: string) {
    const selected = childId === this.selectedChildId;
    const base =
      this.zoom < 0.78
        ? assetScaleRules.spirit.overviewScale
        : this.zoom < 1.15
          ? assetScaleRules.spirit.communityScale
          : assetScaleRules.spirit.homeScale;
    return selected
      ? this.zoom >= 1.45
        ? assetScaleRules.spirit.selectedHomeScale
        : assetScaleRules.spirit.selectedCommunityScale
      : base;
  }

  private getBadgeScale(childId: string) {
    if (childId !== this.selectedChildId) return 0.72;
    return this.zoom >= 1.45 ? 0.68 : 0.74;
  }

  private shouldShowBadge(childId: string) {
    return childId === this.selectedChildId && this.zoom >= 1.38;
  }

  private shouldShowMoodDot(childId: string) {
    return childId === this.selectedChildId && this.zoom >= 0.9 && this.zoom < 1.18;
  }

  private shouldShowSpirit(childId: string, node: SpiritNode) {
    if (childId === this.selectedChildId) return true;
    if (this.zoom >= 1.32) return false;
    if (this.zoom < 0.72) return true;
    return this.zoomScale >= 0.9 || node.rank <= 3 || node.level >= 7;
  }
}
