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
  artwork?: Container;
  artworkReveal?: ArtworkReveal;
  evolvePulse?: EvolvePulse;
  imageKey?: string;
  loadVersion: number;
  levelBadge: Container;
  moodDot: Graphics;
  rank: number;
  level: number;
}

interface ArtworkReveal {
  elapsed: number;
  duration: number;
  baseScaleX: number;
  baseScaleY: number;
  startY: number;
  targetY: number;
}

interface EvolvePulse {
  elapsed: number;
  duration: number;
  upgraded: boolean;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value: number) {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(value: number) {
  const t = clamp01(value);
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
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
      this.updateArtwork(node, spirit);
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

  evolve(childId: string, upgraded: boolean) {
    const node = this.nodes.get(childId);
    if (!node) return;
    node.evolvePulse = {
      elapsed: 0,
      duration: upgraded ? 1900 : 760,
      upgraded,
    };
    node.body.scale.set(upgraded ? 0.72 : 0.92);
    node.body.rotation = upgraded ? -0.035 : 0;
  }

  updateFrame(ticker: Ticker) {
    this.elapsed += ticker.deltaMS / 1000;
    this.nodes.forEach((node, childId) => {
      if (!node.root.visible) return;
      const breath = 1 + Math.sin(this.elapsed * 2.2 + node.root.x * 0.004) * 0.028;
      const targetRoot = this.getTargetScale(childId);
      const rootScale = node.root.scale.x + (targetRoot - node.root.scale.x) * Math.min(1, ticker.deltaMS / 160);
      node.root.scale.set(rootScale);
      const pulse = this.updateEvolvePulse(node, childId, ticker.deltaMS);
      node.body.scale.set(node.body.scale.x + (breath * pulse.scale - node.body.scale.x) * pulse.lerp);
      node.body.y = -Math.abs(Math.sin(this.elapsed * 1.6 + node.root.x * 0.01)) * 5 + pulse.y;
      node.body.rotation += (pulse.rotation - node.body.rotation) * 0.12;
      node.halo.rotation += 0.006 * ticker.deltaTime;
      node.halo.visible = pulse.haloVisible;
      node.halo.alpha = pulse.haloAlpha;
      this.updateArtworkReveal(node, ticker.deltaMS);
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
    root.label = spirit.id;
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
    const contactShadow = new Graphics();
    contactShadow.ellipse(0, 13, 42, 12).fill({ color: palette.inkShadow, alpha: 0.12 });
    contactShadow.ellipse(8, 8, 22, 5).fill({ color: 0xffffff, alpha: 0.04 });
    body.addChild(contactShadow);
    addAssetSprite(body, {
      id: `${spirit.id}-spirit-shadow`,
      url: v4MapAssets.spiritShadow,
      x: 0,
      y: 13,
      width: assetScaleRules.spirit.shadowWidth,
      alpha: 0.28,
    });

    const levelBadge = new Container();
    levelBadge.x = -50;
    levelBadge.y = -63;
    const badgeBg = new Graphics()
      .roundRect(-32, -17, 64, 34, 17)
      .fill(0xffe7a8)
      .stroke({ width: 2.5, color: spirit.accent, alpha: 0.58 });
    const badgeText = new Text({
      text: `Lv.${spirit.child.level}`,
      resolution: 3,
      style: { fontFamily: "Georgia, Microsoft YaHei", fontSize: 17, fontWeight: "900", fill: 0x573a25 },
    });
    badgeText.label = "level-text";
    badgeText.anchor.set(0.5);
    levelBadge.addChild(badgeBg, badgeText);

    const moodDot = new Graphics().circle(0, 0, 6).fill(0xffffff).stroke({ width: 2, color: 0x66513a, alpha: 0.22 });
    moodDot.x = -38;
    moodDot.y = -20;
    moodDot.tint = this.moodTint(spirit.mood);

    root.addChild(halo, body, levelBadge, moodDot);
    const node = { root, halo, body, levelBadge, moodDot, rank: spirit.child.rank, level: spirit.child.level, loadVersion: 0 };
    this.updateArtwork(node, spirit);
    return node;
  }

  private updateArtwork(node: SpiritNode, spirit: WorldSpirit) {
    const imageKey = spirit.imageKey ?? `fallback:${spirit.child.state}:${spirit.accent}`;
    if (node.imageKey === imageKey) return;

    node.imageKey = imageKey;
    node.loadVersion += 1;
    const loadVersion = node.loadVersion;
    if (!spirit.imageUrl) {
      this.showFallback(node, spirit);
      return;
    }
    if (!node.artwork) this.showFallback(node, spirit);

    makeSpiritSprite(spirit.imageUrl, getSpiritTargetWidth(spirit.child.state))
      .then((sprite: Sprite) => {
        if (node.body.destroyed || loadVersion !== node.loadVersion) {
          sprite.destroy();
          return;
        }
        sprite.y = 10;
        const baseScaleX = sprite.scale.x;
        const baseScaleY = sprite.scale.y;
        sprite.alpha = 0;
        sprite.scale.set(baseScaleX * 0.16, baseScaleY * 0.16);
        sprite.y = 42;
        node.artwork?.destroy();
        node.body.addChild(sprite);
        node.artwork = sprite;
        node.artworkReveal = {
          elapsed: 0,
          duration: 1720,
          baseScaleX,
          baseScaleY,
          startY: 42,
          targetY: 10,
        };
      })
      .catch(() => undefined);
  }

  private showFallback(node: SpiritNode, spirit: WorldSpirit) {
    node.artwork?.destroy();
    const fallback = this.drawFallback(spirit);
    fallback.y = -22;
    node.body.addChild(fallback);
    node.artwork = fallback;
    node.artworkReveal = undefined;
  }

  private updateArtworkReveal(node: SpiritNode, deltaMS: number) {
    const reveal = node.artworkReveal;
    const artwork = node.artwork;
    if (!reveal || !artwork) return;

    reveal.elapsed += deltaMS;
    const t = clamp01(reveal.elapsed / reveal.duration);
    const rise = easeOutCubic(t);
    const scaleOvershoot =
      t < 0.56
        ? 0.16 + easeOutBack(t / 0.56) * 1.02
        : t < 0.8
          ? 1.18 - easeOutCubic((t - 0.56) / 0.24) * 0.22
          : 0.96 + easeOutCubic((t - 0.8) / 0.2) * 0.04;
    artwork.alpha = easeOutCubic(t / 0.34);
    artwork.scale.set(reveal.baseScaleX * scaleOvershoot, reveal.baseScaleY * scaleOvershoot);
    artwork.y = reveal.startY + (reveal.targetY - reveal.startY) * rise - Math.sin(Math.PI * t) * 18;
    artwork.rotation = Math.sin(Math.PI * t) * 0.035;

    if (t >= 1) {
      artwork.alpha = 1;
      artwork.scale.set(reveal.baseScaleX, reveal.baseScaleY);
      artwork.y = reveal.targetY;
      artwork.rotation = 0;
      node.artworkReveal = undefined;
    }
  }

  private updateEvolvePulse(node: SpiritNode, childId: string, deltaMS: number) {
    const pulse = node.evolvePulse;
    if (!pulse) {
      const selected = childId === this.selectedChildId;
      return {
        scale: 1,
        y: 0,
        rotation: 0,
        lerp: 0.08,
        haloVisible: selected,
        haloAlpha: selected ? 1 : 0,
      };
    }

    pulse.elapsed += deltaMS;
    const t = clamp01(pulse.elapsed / pulse.duration);
    const lift = Math.sin(Math.PI * t);
    const scale = pulse.upgraded
      ? t < 0.52
        ? 0.7 + easeOutBack(t / 0.52) * 0.54
        : 1.24 - easeOutCubic((t - 0.52) / 0.48) * 0.24
      : 0.94 + lift * 0.08;
    const result = {
      scale,
      y: pulse.upgraded ? -lift * 22 : -lift * 6,
      rotation: pulse.upgraded ? Math.sin(Math.PI * t * 1.2) * 0.045 : 0,
      lerp: pulse.upgraded ? 0.18 : 0.12,
      haloVisible: pulse.upgraded || childId === this.selectedChildId,
      haloAlpha: pulse.upgraded ? 0.52 + lift * 0.38 : 0.32,
    };

    if (t >= 1) {
      node.evolvePulse = undefined;
      node.body.rotation = 0;
      node.halo.alpha = 1;
    }

    return result;
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

  private shouldShowMoodDot(_childId: string) {
    return false;
  }

  private shouldShowSpirit(childId: string, node: SpiritNode) {
    if (childId === this.selectedChildId) return true;
    if (this.zoom >= 1.32) return false;
    if (this.zoom < 0.72) return true;
    return this.zoomScale >= 0.9 || node.rank <= 3 || node.level >= 7;
  }
}
