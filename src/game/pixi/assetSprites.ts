/**
 * [INPUT]: 依赖 Pixi Assets/Texture/Sprite 和浏览器 interaction idle 事件。
 * [OUTPUT]: 对外提供 loadAssetTexture、addAssetSprite、addTiledAsset。
 * [POS]: game/pixi 的视觉资产构造工具，统一延迟加载、尺寸缩放、裁剪范围和事件默认策略。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Assets, Container, Rectangle, Sprite, Texture } from "pixi.js";

const texturePromises = new Map<string, Promise<Texture>>();
type GrowthIslandWindow = Window & {
  __growthIslandMapInteractionActive?: boolean;
};

export interface AssetSpriteOptions {
  id: string;
  url: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  alpha?: number;
  rotation?: number;
  anchorX?: number;
  anchorY?: number;
  zIndex?: number;
  loadDelayMs?: number;
  onLoaded?: (sprite: Sprite) => void;
}

export function loadAssetTexture(url: string) {
  let promise = texturePromises.get(url);
  if (!promise) {
    promise = Assets.load<Texture>(url);
    texturePromises.set(url, promise);
  }
  return promise;
}

export function addAssetSprite(layer: Container, options: AssetSpriteOptions) {
  const root = new Container();
  root.label = options.id;
  root.x = options.x ?? 0;
  root.y = options.y ?? 0;
  root.alpha = options.alpha ?? 1;
  root.rotation = options.rotation ?? 0;
  root.zIndex = options.zIndex ?? 0;
  root.eventMode = "none";
  layer.addChild(root);

  const runWhenMapIdle = (action: () => void) => {
    if ((window as GrowthIslandWindow).__growthIslandMapInteractionActive) {
      window.addEventListener("growth-island-interaction-idle", action, { once: true });
      return;
    }
    action();
  };

  const load = () => {
    if (root.destroyed) return;
    if ((window as GrowthIslandWindow).__growthIslandMapInteractionActive) {
      runWhenMapIdle(load);
      return;
    }
    loadAssetTexture(options.url)
      .then((texture) => {
        if (root.destroyed) return;
        const mountSprite = () => {
          if (root.destroyed) return;
          const sprite = new Sprite(texture);
          sprite.anchor.set(options.anchorX ?? 0.5, options.anchorY ?? 0.5);
          if (options.width) {
            const scale = options.width / texture.width;
            sprite.scale.set(scale);
          } else if (options.height) {
            const scale = options.height / texture.height;
            sprite.scale.set(scale);
          }
          const boundsWidth = Math.max(1, sprite.width);
          const boundsHeight = Math.max(1, sprite.height);
          root.cullable = true;
          root.cullableChildren = false;
          root.cullArea = new Rectangle(
            -boundsWidth * sprite.anchor.x,
            -boundsHeight * sprite.anchor.y,
            boundsWidth,
            boundsHeight,
          );
          root.addChild(sprite);
          options.onLoaded?.(sprite);
          window.dispatchEvent(new CustomEvent("growth-island-asset-loaded"));
        };
        if ((window as GrowthIslandWindow).__growthIslandMapInteractionActive) return runWhenMapIdle(mountSprite);
        mountSprite();
      })
      .catch(() => {
        root.visible = false;
      });
  };

  if (options.loadDelayMs && options.loadDelayMs > 0) {
    window.setTimeout(load, options.loadDelayMs);
  } else {
    load();
  }

  return root;
}

export function addTiledAsset(layer: Container, options: Omit<AssetSpriteOptions, "width" | "height"> & { width: number; height: number }) {
  const root = new Container();
  root.label = options.id;
  root.x = options.x ?? 0;
  root.y = options.y ?? 0;
  root.alpha = options.alpha ?? 1;
  root.eventMode = "none";
  layer.addChild(root);

  loadAssetTexture(options.url)
    .then((texture) => {
      if (root.destroyed) return;
      const tileWidth = Math.max(1, texture.width);
      const tileHeight = Math.max(1, texture.height);
      for (let y = 0; y < options.height + tileHeight; y += tileHeight) {
        for (let x = 0; x < options.width + tileWidth; x += tileWidth) {
          const sprite = new Sprite(texture);
          sprite.x = x;
          sprite.y = y;
          root.addChild(sprite);
        }
      }
    })
    .catch(() => {
      root.visible = false;
    });

  return root;
}
