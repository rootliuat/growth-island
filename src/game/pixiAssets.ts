import { Assets, Graphics, Sprite, type Texture } from "pixi.js";

const texturePromises = new Map<string, Promise<Texture>>();

export function loadPixiTexture(url: string) {
  if (!texturePromises.has(url)) {
    texturePromises.set(url, Assets.load<Texture>(url));
  }
  return texturePromises.get(url)!;
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
