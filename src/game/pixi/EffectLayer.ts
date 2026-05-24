import { Container, Graphics, Ticker } from "pixi.js";
import { palette } from "../artDirection";
import { growthTreePosition } from "../mapConfig";
import { XpParticleSystem } from "./XpParticleSystem";
import type { WorldPoint } from "../types";

export class EffectLayer {
  readonly xpParticles: XpParticleSystem;
  private readonly treeGlow = new Graphics();
  private time = 0;

  constructor(private readonly layer: Container) {
    this.xpParticles = new XpParticleSystem(layer);
    this.treeGlow.x = growthTreePosition.x;
    this.treeGlow.y = growthTreePosition.y - 70;
    this.layer.addChild(this.treeGlow);
  }

  emitXp(from: WorldPoint, delta: number) {
    this.xpParticles.burst(from, growthTreePosition, delta);
  }

  update(ticker: Ticker) {
    this.time += ticker.deltaMS / 1000;
    this.treeGlow.clear();
    const pulse = 0.28 + Math.sin(this.time * 1.4) * 0.08;
    this.treeGlow.circle(0, 0, 136 + Math.sin(this.time) * 7).fill({ color: palette.accent, alpha: pulse * 0.14 });
    this.treeGlow.circle(0, 0, 84).stroke({ width: 4, color: 0xffe99b, alpha: 0.44 + pulse });
    this.treeGlow.circle(0, 0, 116).stroke({ width: 2, color: 0xfff5c8, alpha: 0.26 + pulse * 0.2 });
    this.xpParticles.update(ticker);
  }
}
