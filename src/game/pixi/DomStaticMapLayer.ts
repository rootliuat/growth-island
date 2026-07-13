/**
 * [INPUT]: 依赖 v4MapAssets、assetScaleRules、mapConfig 和 mapLayout 提供主岛底图坐标与资产 URL。
 * [OUTPUT]: 对外提供 DomStaticMapLayer 类，把海岛底图渲染到 DOM 静态层并去重同步相机变换。
 * [POS]: game/pixi 的静态底图 Adapter，承接 IslandLayer 的大面积底图职责，让 Pixi 专注动态与交互层。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { assetScaleRules } from "../assetScaleRules";
import { growthTreePosition, WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";
import { mapSpread, spreadPoint } from "../mapLayout";
import { v4MapAssets } from "../v4MapAssets";

interface CameraCssTransform {
  x: number;
  y: number;
  scale: number;
}

interface StaticIslandAsset {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  alpha?: number;
}

function buildStaticIslandAssets(): StaticIslandAsset[] {
  const centerX = growthTreePosition.x;
  const centerY = spreadPoint({ x: 1210, y: 804 }).y;
  const islandWidth = assetScaleRules.island.shadowBaseWidth * mapSpread.island;

  return [
    {
      id: "v4-island-side",
      url: v4MapAssets.islandSide,
      x: centerX,
      y: centerY + 58,
      width: islandWidth,
    },
    {
      id: "v4-island-surface",
      url: v4MapAssets.islandSurface,
      x: centerX,
      y: centerY,
      width: assetScaleRules.island.surfaceBaseWidth * mapSpread.island,
    },
    {
      id: "v4-shoreline-foam",
      url: v4MapAssets.shorelineFoam,
      x: centerX,
      y: centerY - 6,
      width: assetScaleRules.island.shorelineBaseWidth * mapSpread.island,
      alpha: 0.7,
    },
  ];
}

export class DomStaticMapLayer {
  private readonly root: HTMLDivElement;
  private lastTransform = "";

  constructor(host: HTMLDivElement) {
    host.querySelectorAll(".pixi-static-map-layer").forEach((node) => node.remove());

    this.root = document.createElement("div");
    this.root.className = "pixi-static-map-layer";
    this.root.style.width = `${WORLD_WIDTH}px`;
    this.root.style.height = `${WORLD_HEIGHT}px`;
    this.mountIslandBase();
    host.appendChild(this.root);
  }

  sync(transform: CameraCssTransform) {
    const nextTransform = `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`;
    if (nextTransform === this.lastTransform) return;
    this.lastTransform = nextTransform;
    this.root.style.transform = nextTransform;
  }

  destroy() {
    this.root.remove();
  }

  private mountIslandBase() {
    buildStaticIslandAssets().forEach((asset) => {
      const image = document.createElement("img");
      image.src = asset.url;
      image.alt = "";
      image.draggable = false;
      image.decoding = "async";
      image.dataset.assetId = asset.id;
      image.style.left = `${asset.x}px`;
      image.style.top = `${asset.y}px`;
      image.style.width = `${asset.width}px`;
      if (asset.alpha !== undefined) image.style.opacity = String(asset.alpha);
      this.root.appendChild(image);
    });
  }
}
