import { Container, Graphics, Ticker } from "pixi.js";
import { easeOutCubic, lerp } from "../easing";
import type { WorldPoint } from "../types";

interface Particle {
  node: Graphics;
  from: WorldPoint;
  to: WorldPoint;
  control: WorldPoint;
  elapsed: number;
  duration: number;
  negative: boolean;
}

export class XpParticleSystem {
  private readonly particles: Particle[] = [];

  constructor(private readonly layer: Container) {}

  burst(from: WorldPoint, to: WorldPoint, delta: number) {
    const count = delta > 0 ? Math.min(14, 5 + Math.round(Math.abs(delta) / 5)) : 8;
    for (let i = 0; i < count; i += 1) {
      const negative = delta < 0;
      const node = new Graphics()
        .circle(0, 0, negative ? 5 : 6 + Math.random() * 3)
        .fill({ color: negative ? 0x8d929a : 0xffdf6d, alpha: negative ? 0.58 : 0.9 });
      node.circle(-1, -1, 2).fill({ color: 0xffffff, alpha: negative ? 0.18 : 0.5 });
      const spread = negative ? 90 : 160;
      const fromJitter = { x: from.x + (Math.random() - 0.5) * 38, y: from.y + (Math.random() - 0.5) * 30 };
      const toJitter = { x: to.x + (Math.random() - 0.5) * 45, y: to.y + (Math.random() - 0.5) * 40 };
      this.particles.push({
        node,
        from: fromJitter,
        to: negative ? { x: from.x + (Math.random() - 0.5) * 120, y: from.y - 70 - Math.random() * 80 } : toJitter,
        control: {
          x: (from.x + to.x) / 2 + (Math.random() - 0.5) * spread,
          y: Math.min(from.y, to.y) - 210 - Math.random() * 120,
        },
        elapsed: 0,
        duration: negative ? 520 + Math.random() * 240 : 900 + Math.random() * 360,
        negative,
      });
      this.layer.addChild(node);
    }
  }

  update(ticker: Ticker) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.elapsed += ticker.deltaMS;
      const t = Math.min(1, particle.elapsed / particle.duration);
      const eased = easeOutCubic(t);
      const x1 = lerp(particle.from.x, particle.control.x, eased);
      const y1 = lerp(particle.from.y, particle.control.y, eased);
      const x2 = lerp(particle.control.x, particle.to.x, eased);
      const y2 = lerp(particle.control.y, particle.to.y, eased);
      particle.node.x = lerp(x1, x2, eased);
      particle.node.y = lerp(y1, y2, eased);
      particle.node.alpha = particle.negative ? 1 - t : Math.min(1, 1.2 - t);
      particle.node.scale.set(0.65 + Math.sin(t * Math.PI) * 0.55);
      if (t >= 1) {
        particle.node.destroy();
        this.particles.splice(i, 1);
      }
    }
  }
}
