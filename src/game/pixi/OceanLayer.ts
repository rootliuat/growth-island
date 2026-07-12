/**
 * [INPUT]: 依赖 Pixi Container/Ticker；海水纹理由 CSS 背景承载。
 * [OUTPUT]: 对外提供 OceanLayer 类，保留地图场景的海水层生命周期接口。
 * [POS]: game/pixi 的海水占位 Adapter，避免海水大纹理进入 Pixi 静态缓存。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Container, Ticker } from "pixi.js";

export class OceanLayer {
  constructor(private readonly layer: Container) {}

  update(_ticker: Ticker) {
    this.layer.visible = true;
  }
}
