import { Container, Graphics, Ticker } from "pixi.js";
import { palette } from "../artDirection";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";
import { v4MapAssets } from "../v4MapAssets";
import { addTiledAsset } from "./assetSprites";

export class OceanLayer {
  private readonly waveLayer: Container;
  private time = 0;

  constructor(private readonly layer: Container) {
    this.drawFallbackBase();
    addTiledAsset(this.layer, {
      id: "v4-ocean-base",
      url: v4MapAssets.oceanBase,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      alpha: 0.98,
    });
    this.waveLayer = addTiledAsset(this.layer, {
      id: "v4-ocean-wave-overlay",
      url: v4MapAssets.oceanWaveOverlay,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      alpha: 0.42,
    });
  }

  update(ticker: Ticker) {
    this.time += ticker.deltaMS / 1000;
    this.waveLayer.x = Math.sin(this.time * 0.16) * 18 - 18;
    this.waveLayer.y = Math.cos(this.time * 0.12) * 12 - 12;
    this.waveLayer.alpha = 0.34 + Math.sin(this.time * 0.45) * 0.05;
  }

  private drawFallbackBase() {
    const g = new Graphics();
    g.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill(palette.oceanBase);
    this.layer.addChild(g);
  }
}
