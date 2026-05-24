import { Container, Graphics, Ticker } from "pixi.js";
import { palette } from "../artDirection";
import { growthTreePosition } from "../mapConfig";
import { XpParticleSystem } from "./XpParticleSystem";
import type { WorldPoint } from "../types";

interface GrowthDot {
  node: Graphics;
  angle: number;
  distance: number;
}

interface GrowthWave {
  root: Container;
  ring: Graphics;
  crest: Graphics;
  dots: GrowthDot[];
  elapsed: number;
  duration: number;
  upgraded: boolean;
}

function quadraticPoint(from: WorldPoint, control: WorldPoint, to: WorldPoint, t: number) {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
    y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y,
  };
}

export class EffectLayer {
  readonly xpParticles: XpParticleSystem;
  private readonly selectedGuide = new Container();
  private readonly selectedGuideLine = new Graphics();
  private readonly selectedGuideDots: Graphics[] = [];
  private readonly treeGlow = new Graphics();
  private readonly growthWaves: GrowthWave[] = [];
  private selectedGuideFrom?: WorldPoint;
  private selectedGuideAccent = palette.accent;
  private time = 0;

  constructor(private readonly layer: Container) {
    this.xpParticles = new XpParticleSystem(layer);
    this.selectedGuide.visible = false;
    this.selectedGuide.addChild(this.selectedGuideLine);
    for (let i = 0; i < 9; i += 1) {
      const dot = new Graphics();
      this.selectedGuideDots.push(dot);
      this.selectedGuide.addChild(dot);
    }
    this.treeGlow.x = growthTreePosition.x;
    this.treeGlow.y = growthTreePosition.y - 70;
    this.layer.addChild(this.selectedGuide);
    this.layer.addChild(this.treeGlow);
  }

  setSelectedGuide(from?: WorldPoint, accent = palette.accent) {
    this.selectedGuideFrom = from;
    this.selectedGuideAccent = accent;
    this.selectedGuide.visible = !!from;
    this.drawSelectedGuide();
  }

  emitXp(from: WorldPoint, delta: number) {
    this.xpParticles.burst(from, growthTreePosition, delta);
  }

  emitGrowthChange(position: WorldPoint, upgraded: boolean) {
    const root = new Container();
    root.x = position.x;
    root.y = position.y + 34;

    const ring = new Graphics();
    const color = upgraded ? palette.accent : 0x8d929a;
    ring.ellipse(0, 0, 104, 32).fill({ color, alpha: upgraded ? 0.16 : 0.1 });
    ring.ellipse(0, 0, 114, 38).stroke({ width: upgraded ? 6 : 4, color, alpha: upgraded ? 0.82 : 0.44 });
    ring.ellipse(0, 0, 146, 48).stroke({ width: 3, color: upgraded ? 0xfff6c9 : 0xc7cbd0, alpha: upgraded ? 0.56 : 0.28 });

    const crest = new Graphics();
    if (upgraded) {
      crest.circle(0, -86, 18).fill({ color: palette.accent, alpha: 0.9 }).stroke({ width: 4, color: 0xfff6c9, alpha: 0.86 });
      crest.poly([0, -122, 8, -96, 34, -94, 12, -80, 18, -54, 0, -70, -18, -54, -12, -80, -34, -94, -8, -96]).fill({
        color: 0xfff6c9,
        alpha: 0.68,
      });
      crest.circle(0, -86, 7).fill({ color: 0xffffff, alpha: 0.88 });
    } else {
      crest.roundRect(-30, -98, 60, 24, 12).fill({ color, alpha: 0.32 }).stroke({ width: 3, color: 0xc7cbd0, alpha: 0.34 });
      crest.circle(-16, -86, 5).fill({ color: 0xc7cbd0, alpha: 0.52 });
      crest.circle(0, -87, 5).fill({ color: 0xc7cbd0, alpha: 0.45 });
      crest.circle(16, -86, 5).fill({ color: 0xc7cbd0, alpha: 0.52 });
    }
    root.addChild(ring, crest);

    const dots = Array.from({ length: upgraded ? 12 : 7 }, (_, index) => {
      const node = new Graphics();
      const dotColor = upgraded ? (index % 3 === 0 ? 0xfff6c9 : palette.accent) : 0xaeb4bb;
      node.circle(0, 0, upgraded ? 5 + (index % 2) : 4).fill({ color: dotColor, alpha: upgraded ? 0.86 : 0.45 });
      root.addChild(node);
      return {
        node,
        angle: (Math.PI * 2 * index) / (upgraded ? 12 : 7),
        distance: upgraded ? 52 + (index % 4) * 14 : 42 + (index % 3) * 10,
      };
    });

    this.layer.addChild(root);
    this.growthWaves.push({ root, ring, crest, dots, elapsed: 0, duration: upgraded ? 1800 : 1040, upgraded });
  }

  update(ticker: Ticker) {
    this.time += ticker.deltaMS / 1000;
    this.treeGlow.clear();
    const pulse = 0.28 + Math.sin(this.time * 1.4) * 0.08;
    this.treeGlow.circle(0, 0, 136 + Math.sin(this.time) * 7).fill({ color: palette.accent, alpha: pulse * 0.14 });
    this.treeGlow.circle(0, 0, 84).stroke({ width: 4, color: 0xffe99b, alpha: 0.44 + pulse });
    this.treeGlow.circle(0, 0, 116).stroke({ width: 2, color: 0xfff5c8, alpha: 0.26 + pulse * 0.2 });
    this.updateSelectedGuide();
    this.xpParticles.update(ticker);
    this.updateGrowthWaves(ticker);
  }

  private drawSelectedGuide() {
    const from = this.selectedGuideFrom;
    this.selectedGuideLine.clear();
    if (!from) return;

    const to = { x: growthTreePosition.x, y: growthTreePosition.y - 34 };
    const control = {
      x: (from.x + to.x) / 2,
      y: Math.min(from.y, to.y) - 155,
    };

    this.selectedGuideLine.circle(from.x, from.y - 22, 15).fill({ color: palette.accent, alpha: 0.16 });
    this.selectedGuideLine.moveTo(from.x, from.y - 22);
    this.selectedGuideLine.quadraticCurveTo(control.x, control.y, to.x, to.y);
    this.selectedGuideLine.stroke({ width: 22, color: 0xffffff, alpha: 0.18, cap: "round" });
    this.selectedGuideLine.moveTo(from.x, from.y - 22);
    this.selectedGuideLine.quadraticCurveTo(control.x, control.y, to.x, to.y);
    this.selectedGuideLine.stroke({ width: 9, color: palette.accent, alpha: 0.36, cap: "round" });
    this.selectedGuideLine.moveTo(from.x, from.y - 22);
    this.selectedGuideLine.quadraticCurveTo(control.x, control.y, to.x, to.y);
    this.selectedGuideLine.stroke({ width: 3, color: this.selectedGuideAccent, alpha: 0.44, cap: "round" });
    this.selectedGuideLine.moveTo(from.x, from.y - 22);
    this.selectedGuideLine.quadraticCurveTo(control.x, control.y, to.x, to.y);
    this.selectedGuideLine.stroke({ width: 1.5, color: 0xfff6c9, alpha: 0.72, cap: "round" });
    this.selectedGuideLine.circle(to.x, to.y, 18).fill({ color: this.selectedGuideAccent, alpha: 0.16 });
    this.selectedGuideLine.circle(to.x, to.y, 9).fill({ color: 0xfff6c9, alpha: 0.42 });
  }

  private updateSelectedGuide() {
    const from = this.selectedGuideFrom;
    if (!from) return;

    const start = { x: from.x, y: from.y - 22 };
    const to = { x: growthTreePosition.x, y: growthTreePosition.y - 34 };
    const control = {
      x: (start.x + to.x) / 2,
      y: Math.min(start.y, to.y) - 155,
    };

    this.selectedGuideDots.forEach((dot, index) => {
      const t = (index / this.selectedGuideDots.length + this.time * 0.055) % 1;
      const point = quadraticPoint(start, control, to, t);
      const glow = 0.42 + Math.sin(this.time * 2.2 + index) * 0.12;
      dot.clear();
      dot.x = point.x;
      dot.y = point.y + Math.sin(this.time * 1.8 + index) * 3;
      dot.circle(0, 0, 6 + (index % 3)).fill({ color: index % 2 ? palette.accent : 0xfff6c9, alpha: glow + 0.12 });
      dot.circle(-2, -2, 2.4).fill({ color: 0xffffff, alpha: 0.72 });
    });
  }

  private updateGrowthWaves(ticker: Ticker) {
    for (let i = this.growthWaves.length - 1; i >= 0; i -= 1) {
      const wave = this.growthWaves[i];
      wave.elapsed += ticker.deltaMS;
      const t = Math.min(1, wave.elapsed / wave.duration);
      const spread = wave.upgraded ? 1 + t * 0.42 : 1 + t * 0.22;
      wave.root.scale.set(spread);
      wave.root.alpha = wave.upgraded ? Math.min(1, 1.18 - t * 0.82) : 0.82 - t * 0.72;
      wave.ring.rotation = Math.sin(this.time * 1.2) * 0.02;
      wave.crest.y = -Math.sin(t * Math.PI) * (wave.upgraded ? 26 : 8);
      wave.crest.scale.set(0.82 + Math.sin(t * Math.PI) * (wave.upgraded ? 0.34 : 0.12));
      wave.dots.forEach((dot, index) => {
        const drift = dot.distance + t * (wave.upgraded ? 72 : 34);
        dot.node.x = Math.cos(dot.angle + t * 0.74) * drift;
        dot.node.y = Math.sin(dot.angle + t * 0.74) * drift * 0.36 - (wave.upgraded ? Math.sin(t * Math.PI) * 42 : 0);
        dot.node.alpha = wave.upgraded ? Math.max(0, 1 - t * 0.9) : Math.max(0, 0.6 - t * 0.55);
        dot.node.scale.set(0.7 + Math.sin(t * Math.PI + index) * 0.22);
      });
      if (t >= 1) {
        wave.root.destroy({ children: true });
        this.growthWaves.splice(i, 1);
      }
    }
  }
}
