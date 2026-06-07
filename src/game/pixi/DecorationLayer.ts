import { Container, Graphics, Rectangle, Text } from "pixi.js";
import { assetScaleRules } from "../assetScaleRules";
import { palette } from "../artDirection";
import { cameraConfig } from "../cameraConfig";
import { arenaPosition, oldStreetPosition } from "../mapConfig";
import { type V4Placement, v4DecorPlacements, v4LandmarkPlacements } from "../v4MapAssets";
import { addAssetSprite } from "./assetSprites";

const decorationAssetDelayBaseMs = 5200;
const decorationAssetDelayStepMs = 220;
const bakedMapPropLoadBaseDelayMs = 700;
const bakedMapPropLoadStepMs = 70;
const hiddenBakedMapPropIds = new Set([
  "p15-pearl-gem-blue",
  "p16-growth-house-1",
  "p16-mangrove-house-2",
  "p16-shell-house-3",
  "p16-pearl-house-4",
  "p16-town-stable",
  "p16-honor-bell-tower",
  "p16-honor-tower",
]);
const hintedHotspotIds = new Set(["p15-growth-tree", "p16-growth-heart", "p15-shop-chest", "p16-shop-market-stand-1", "p15-honor-star", "p16-honor-bell"]);
const priorityBakedMapPropIds = new Set([
  "p15-growth-tree",
  "p16-growth-heart",
  "p19-growth-star-pad",
  "p15-shop-chest",
  "p16-shop-market-stand-1",
  "p15-honor-star",
  "p16-honor-bell",
]);

interface DecorationLayerActions {
  onOpenDialogue?: () => void;
  onOpenModule?: (moduleId: "shop" | "leaderboard" | "child-profile") => void;
  onPrepareMoralSpeak?: () => void;
  onOpenPk?: () => void;
  onFocusPoint: (x: number, y: number, zoom: number) => void;
}

export class DecorationLayer {
  private delayedBakedMapPropCount = 0;
  private delayedDecorationCount = 0;

  constructor(
    private readonly layer: Container,
    private readonly actions: DecorationLayerActions,
  ) {
    this.layer.sortableChildren = true;
    this.drawPlacements(v4DecorPlacements);
    this.drawPlacements(v4LandmarkPlacements);
    this.drawEntranceBadges();
    this.layer.sortChildren();
  }

  private drawPlacements(placements: V4Placement[]) {
    placements.forEach((placement) => {
      const isBakedMapProp = placement.id.startsWith("p15-") || placement.id.startsWith("p16-");
      if (isBakedMapProp && hiddenBakedMapPropIds.has(placement.id)) return;
      const root = addAssetSprite(this.layer, {
        id: placement.id,
        url: placement.url,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        alpha: placement.alpha ?? 1,
        rotation: placement.rotation,
        anchorX: placement.anchor?.x,
        anchorY: placement.anchor?.y,
        zIndex: placement.zIndex,
        loadDelayMs: this.getLoadDelayMs(placement, isBakedMapProp),
      });
      if (!placement.interactive) return;
      this.addInteractiveHint(root, placement);
      root.eventMode = "static";
      root.cursor = "pointer";
      root.hitArea = this.hitAreaFor(placement);
      root.on("pointertap", () => this.activatePlacement(placement));
    });
  }

  private getLoadDelayMs(placement: V4Placement, isBakedMapProp: boolean) {
    if (!isBakedMapProp) {
      if (placement.layer !== "decoration") return 0;
      const delay = decorationAssetDelayBaseMs + this.delayedDecorationCount * decorationAssetDelayStepMs;
      this.delayedDecorationCount += 1;
      return delay;
    }
    if (placement.interactive || priorityBakedMapPropIds.has(placement.id)) return 0;
    const delay = bakedMapPropLoadBaseDelayMs + this.delayedBakedMapPropCount * bakedMapPropLoadStepMs;
    this.delayedBakedMapPropCount += 1;
    return delay;
  }

  private addInteractiveHint(root: Container, placement: V4Placement) {
    if (!["self-service", "shop", "leaderboard"].includes(placement.interactive ?? "")) return;
    if (!hintedHotspotIds.has(placement.id)) return;
    const color =
      placement.interactive === "self-service"
        ? 0xf6b352
        : placement.interactive === "shop"
          ? 0x2d9fb2
          : 0x3b7d53;
    const y = -placement.width * 0.44;
    const hint = new Graphics();
    hint.zIndex = 30;
    hint.ellipse(0, y + 11, 18, 6).fill({ color: palette.inkShadow, alpha: 0.12 });
    hint.circle(0, y, 7).fill(0xfff8df).stroke({ width: 2, color, alpha: 0.58 });
    hint.circle(0, y, 3).fill({ color, alpha: 0.82 });
    hint.ellipse(0, y, 20, 11).stroke({ width: 1.5, color, alpha: 0.28 });
    hint.alpha = placement.interactive === "self-service" ? 0.9 : 0.72;
    root.sortableChildren = true;
    root.addChild(hint);
  }

  private hitAreaFor(placement: V4Placement) {
    const widthRatio = placement.collision?.widthRatio ?? 0.76;
    const heightRatio = placement.collision?.heightRatio ?? 0.56;
    const offsetX = placement.width * (placement.collision?.offsetXRatio ?? 0);
    const offsetY = placement.width * (placement.collision?.offsetYRatio ?? 0);
    const width = placement.width * widthRatio;
    const height = placement.width * heightRatio;
    return new Rectangle(offsetX - width / 2, offsetY - height / 2, width, height);
  }

  private activatePlacement(placement: V4Placement) {
    if (placement.interactive === "pk") {
      this.actions.onFocusPoint(
        arenaPosition.x + assetScaleRules.focus.arenaLandingOffset.x,
        arenaPosition.y + assetScaleRules.focus.arenaLandingOffset.y,
        cameraConfig.detailZoom,
      );
      this.actions.onOpenPk?.();
      return;
    }
    if (placement.interactive === "self-service") {
      this.actions.onFocusPoint(placement.x, placement.y, cameraConfig.spiritZoom);
      this.actions.onPrepareMoralSpeak?.();
      return;
    }
    if (placement.interactive === "shop" || placement.interactive === "leaderboard" || placement.interactive === "child-profile") {
      this.actions.onFocusPoint(placement.x, placement.y, cameraConfig.detailZoom);
      this.actions.onOpenModule?.(placement.interactive);
      return;
    }
    this.actions.onFocusPoint(placement.x || oldStreetPosition.x, placement.y || oldStreetPosition.y, cameraConfig.detailZoom);
    this.actions.onOpenDialogue?.();
  }

  private drawEntranceBadges() {
    this.layer.addChild(
      this.makeEntranceBadge({
        label: "算术",
        x: arenaPosition.x + 188,
        y: arenaPosition.y - 142,
        color: palette.arenaDark,
        onTap: () => {
          this.actions.onFocusPoint(
            arenaPosition.x + assetScaleRules.focus.arenaLandingOffset.x,
            arenaPosition.y + assetScaleRules.focus.arenaLandingOffset.y,
            cameraConfig.detailZoom,
          );
          this.actions.onOpenPk?.();
        },
      }),
    );
    this.layer.addChild(
      this.makeEntranceBadge({
        label: "AI",
        x: oldStreetPosition.x + 292,
        y: oldStreetPosition.y - 72,
        color: palette.oldStreetDark,
        onTap: () => {
          this.actions.onFocusPoint(oldStreetPosition.x, oldStreetPosition.y, cameraConfig.detailZoom);
          this.actions.onOpenDialogue?.();
        },
      }),
    );
  }

  private makeEntranceBadge(options: { label: string; x: number; y: number; color: number; onTap: () => void }) {
    const node = new Container();
    node.x = options.x;
    node.y = options.y;
    node.zIndex = 920;
    node.eventMode = "static";
    node.cursor = "pointer";
    node.hitArea = new Rectangle(-44, -54, 88, 86);
    node.on("pointertap", options.onTap);

    const g = new Graphics();
    g.ellipse(0, 28, 42, 11).fill({ color: palette.inkShadow, alpha: 0.13 });
    g.rect(-4, -18, 8, 56).fill(palette.woodDark);
    g.roundRect(-39, -52, 78, 40, 13).fill(0xfff0bf).stroke({ width: 4, color: options.color, alpha: 0.48 });
    g.circle(-25, -32, 4).fill(0xfff8df);
    g.circle(25, -32, 4).fill(0xfff8df);

    const text = new Text({
      text: options.label,
      style: { fontFamily: "Georgia, Microsoft YaHei", fontSize: 18, fontWeight: "900", fill: options.color },
    });
    text.anchor.set(0.5);
    text.y = -32;
    node.addChild(g, text);
    return node;
  }
}
