import { Assets, Graphics, Sprite, type Texture } from "pixi.js";
import { getMapAssetSlot, getMapAssetUrl, type MapAssetId } from "./mapAssetCatalog";

const texturePromises = new Map<string, Promise<Texture>>();

export function loadPixiTexture(url: string) {
  if (!texturePromises.has(url)) {
    texturePromises.set(url, Assets.load<Texture>(url));
  }
  return texturePromises.get(url)!;
}

async function loadPixiTextureWithFallback(url: string, fallbackUrl: string) {
  try {
    return await loadPixiTexture(url);
  } catch {
    return loadPixiTexture(fallbackUrl);
  }
}

export function makeSoftShadow(width: number, height: number, alpha = 0.2) {
  return new Graphics().ellipse(0, 0, width, height).fill({ color: 0x1d241e, alpha });
}

export async function makeSpiritSprite(url: string, size: number) {
  const texture = await loadPixiTexture(url);
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.9);
  sprite.width = size;
  sprite.height = size;
  return sprite;
}

export async function loadMapAssetTexture(assetId: MapAssetId | string) {
  const slot = getMapAssetSlot(assetId);
  return loadPixiTextureWithFallback(getMapAssetUrl(assetId), slot.placeholderUrl);
}

export async function preloadMapAssetTextures(assetIds: Array<MapAssetId | string>) {
  await Promise.all(assetIds.map((assetId) => loadMapAssetTexture(assetId)));
}

export async function makeMapAssetSprite(assetId: MapAssetId | string, width?: number, height?: number) {
  const slot = getMapAssetSlot(assetId);
  const texture = await loadMapAssetTexture(assetId);
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 1);
  sprite.width = width ?? slot.recommendedSize.width;
  sprite.height = height ?? slot.recommendedSize.height;
  return sprite;
}
