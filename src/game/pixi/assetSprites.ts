import { Assets, Container, Sprite, Texture } from "pixi.js";

const texturePromises = new Map<string, Promise<Texture>>();

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
  layer.addChild(root);

  const load = () => {
    if (root.destroyed) return;
    loadAssetTexture(options.url)
      .then((texture) => {
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
        root.addChild(sprite);
        options.onLoaded?.(sprite);
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
