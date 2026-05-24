import { Container, Graphics, Ticker } from "pixi.js";
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
    this.treeGlow.circle(0, 0, 138 + Math.sin(this.time) * 8).fill({ color: 0xffdf72, alpha: pulse * 0.2 });
    this.treeGlow.circle(0, 0, 84).stroke({ width: 4, color: 0xffe99b, alpha: 0.5 + pulse });
    this.xpParticles.update(ticker);
  }
}
