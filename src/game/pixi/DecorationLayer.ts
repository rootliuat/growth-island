import { Container, Graphics, Rectangle, Text } from "pixi.js";
import { assetScaleRules } from "../assetScaleRules";
import { palette } from "../artDirection";
import { cameraConfig } from "../cameraConfig";
import { arenaPosition, oldStreetPosition } from "../mapConfig";
import { type V4Placement, v4DecorPlacements, v4LandmarkPlacements } from "../v4MapAssets";
import { addAssetSprite } from "./assetSprites";

const decorationAssetDelayMs = 8500;

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
    this.layer.sortableChildren = true;
    this.drawPlacements(v4DecorPlacements);
    this.drawPlacements(v4LandmarkPlacements);
    this.drawEntranceBadges();
    this.layer.sortChildren();
  }

  private drawPlacements(placements: V4Placement[]) {
    placements.forEach((placement) => {
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
        loadDelayMs: placement.layer === "decoration" ? decorationAssetDelayMs : 0,
      });
      if (!placement.interactive) return;
      root.eventMode = "static";
      root.cursor = "pointer";
      root.hitArea = this.hitAreaFor(placement);
      root.on("pointertap", () => this.activatePlacement(placement));
    });
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
    this.actions.onFocusPoint(placement.x || oldStreetPosition.x, placement.y || oldStreetPosition.y, cameraConfig.detailZoom);
    this.actions.onOpenDialogue?.();
  }

  private drawEntranceBadges() {
    this.layer.addChild(
      this.makeEntranceBadge({
        label: "PK",
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
