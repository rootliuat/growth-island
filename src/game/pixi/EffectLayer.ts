import { Container, Graphics, Ticker } from "pixi.js";
import { palette } from "../artDirection";
import { growthTreePosition } from "../mapConfig";
import { XpParticleSystem } from "./XpParticleSystem";
import type { WorldPoint } from "../types";

interface GrowthDot {
  node: Graphics;
  angle: number;
  distance: number;
  size: number;
  delay: number;
  lift: number;
  color: number;
  durationRatio: number;
}

interface GrowthPetal {
  node: Graphics;
  angle: number;
  distance: number;
  width: number;
  height: number;
  delay: number;
  lift: number;
  color: number;
}

interface GrowthArc {
  node: Graphics;
  radiusX: number;
  radiusY: number;
  phase: number;
  speed: number;
  length: number;
  width: number;
  color: number;
  alpha: number;
}

interface GrowthRibbon {
  node: Graphics;
  angle: number;
  delay: number;
  sway: number;
  height: number;
  color: number;
}

interface GrowthWave {
  root: Container;
  pool: Graphics;
  veil: Graphics;
  bloom: Graphics;
  core: Graphics;
  arcs: GrowthArc[];
  ribbons: GrowthRibbon[];
  petals: GrowthPetal[];
  dots: GrowthDot[];
  elapsed: number;
  duration: number;
  upgraded: boolean;
  accent: number;
}

function quadraticPoint(from: WorldPoint, control: WorldPoint, to: WorldPoint, t: number) {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * from.x + 2 * inverse * t * control.x + t * t * to.x,
    y: inverse * inverse * from.y + 2 * inverse * t * control.y + t * t * to.y,
  };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value: number) {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutSine(value: number) {
  const t = clamp01(value);
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function easeOutBack(value: number) {
  const t = clamp01(value);
  const c1 = 1.45;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function drawEllipseArc(graphics: Graphics, radiusX: number, radiusY: number, start: number, end: number, width: number, color: number, alpha: number) {
  const steps = 18;
  for (let index = 0; index <= steps; index += 1) {
    const angle = start + ((end - start) * index) / steps;
    const x = Math.cos(angle) * radiusX;
    const y = Math.sin(angle) * radiusY;
    if (index === 0) graphics.moveTo(x, y);
    else graphics.lineTo(x, y);
  }
  graphics.stroke({ width, color, alpha, cap: "round", join: "round" });
}

function drawPetal(graphics: Graphics, width: number, height: number, color: number, alpha: number) {
  graphics.ellipse(0, 0, width, height).fill({ color, alpha });
  graphics.ellipse(-width * 0.22, -height * 0.18, width * 0.36, height * 0.34).fill({ color: 0xffffff, alpha: alpha * 0.32 });
  graphics.moveTo(0, -height * 0.72);
  graphics.lineTo(0, height * 0.72);
  graphics.stroke({ width: 0.8, color: 0xffffff, alpha: alpha * 0.18, cap: "round" });
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

  emitGrowthChange(position: WorldPoint, upgraded: boolean, accent = palette.accent) {
    const root = new Container();
    root.x = position.x;
    root.y = position.y + (upgraded ? 14 : 34);

    const color = upgraded ? accent : 0xaeb4bb;
    const pool = new Graphics();
    const veil = new Graphics();
    const bloom = new Graphics();
    const core = new Graphics();
    bloom.blendMode = "add";
    root.addChild(pool, veil);

    const ribbonCount = upgraded ? 7 : 2;
    const ribbons: GrowthRibbon[] = Array.from({ length: ribbonCount }, (_, index) => {
      const node = new Graphics();
      node.blendMode = "add";
      root.addChild(node);
      return {
        node,
        angle: (Math.PI * 2 * index) / ribbonCount + (index % 2) * 0.34,
        delay: index * 58,
        sway: 10 + (index % 3) * 7,
        height: 76 + (index % 4) * 12,
        color: index % 3 === 0 ? 0xfff3bd : index % 3 === 1 ? 0xa7ece7 : color,
      };
    });

    const arcCount = upgraded ? 2 : 1;
    const arcs: GrowthArc[] = Array.from({ length: arcCount }, (_, index) => {
      const node = new Graphics();
      node.blendMode = "add";
      root.addChild(node);
      return {
        node,
        radiusX: 54 + index * 24,
        radiusY: 17 + index * 7,
        phase: index * 1.62,
        speed: index % 2 === 0 ? 0.72 : -0.56,
        length: 0.48 - index * 0.04,
        width: 1.45 - index * 0.12,
        color: index === 1 ? 0xa7ece7 : color,
        alpha: 0.22 - index * 0.03,
      };
    });
    root.addChild(bloom, core);

    const petals: GrowthPetal[] = Array.from({ length: upgraded ? 18 : 4 }, (_, index) => {
      const node = new Graphics();
      node.blendMode = "add";
      const angle = (Math.PI * 2 * index) / (upgraded ? 18 : 4) + (index % 4) * 0.18;
      root.addChild(node);
      return {
        node,
        angle,
        distance: upgraded ? 42 + (index % 6) * 12 : 28 + (index % 2) * 8,
        width: upgraded ? 5.5 + (index % 3) * 1.2 : 4,
        height: upgraded ? 12 + (index % 4) * 2.5 : 8,
        delay: upgraded ? 680 + (index % 9) * 76 : 160 + index * 44,
        lift: upgraded ? 18 + (index % 5) * 7 : 8,
        color: index % 5 === 0 ? 0xffffff : index % 2 === 0 ? 0xfff3bd : color,
      };
    });

    const dots = Array.from({ length: upgraded ? 46 : 10 }, (_, index) => {
      const node = new Graphics();
      node.blendMode = "add";
      const angle = (Math.PI * 2 * index) / (upgraded ? 46 : 10) + (index % 5) * 0.12;
      const dotColor = upgraded ? (index % 7 === 0 ? 0xffffff : index % 4 === 0 ? 0xfff3bd : index % 3 === 0 ? 0xa7ece7 : color) : 0xaeb4bb;
      root.addChild(node);
      return {
        node,
        angle,
        distance: upgraded ? 54 + (index % 9) * 9 : 34 + (index % 3) * 8,
        size: upgraded ? 1.9 + (index % 5) * 0.85 : 2.8,
        delay: upgraded ? (index % 13) * 42 : (index % 4) * 30,
        lift: upgraded ? 26 + (index % 6) * 8 : 8,
        color: dotColor,
        durationRatio: 0.62 + (index % 6) * 0.06,
      };
    });

    this.layer.addChild(root);
    this.growthWaves.push({ root, pool, veil, bloom, core, arcs, ribbons, petals, dots, elapsed: 0, duration: upgraded ? 4300 : 1240, upgraded, accent: color });
  }

  update(ticker: Ticker) {
    this.time += ticker.deltaMS / 1000;
    this.treeGlow.clear();
    const pulse = 0.28 + Math.sin(this.time * 1.4) * 0.08;
    this.treeGlow.circle(0, 0, 136 + Math.sin(this.time) * 7).fill({ color: palette.accent, alpha: pulse * 0.08 });
    this.treeGlow.circle(0, 0, 84).stroke({ width: 3, color: 0xffe99b, alpha: 0.26 + pulse * 0.38 });
    this.treeGlow.circle(0, 0, 116).stroke({ width: 1.5, color: 0xfff5c8, alpha: 0.18 + pulse * 0.14 });
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
      const t = clamp01(wave.elapsed / wave.duration);
      const charge = easeOutCubic(wave.elapsed / 540);
      const release = easeInOutSine((wave.elapsed - 280) / 760);
      const birth = clamp01((wave.elapsed - 960) / 720);
      const birthEase = easeOutBack(birth);
      const afterglow = clamp01((wave.elapsed - 2100) / Math.max(1, wave.duration - 2100));
      const fade = clamp01((wave.elapsed - (wave.duration - 920)) / 920);

      wave.root.alpha = wave.upgraded ? 0.9 - fade * 0.78 : 0.64 - t * 0.56;
      wave.root.scale.set(wave.upgraded ? 0.98 + Math.sin(Math.PI * birth) * 0.035 : 1);
      this.drawGrowthPool(wave, charge, release, birthEase, afterglow);
      this.drawGrowthVeil(wave, charge, release, birthEase, afterglow);
      this.drawGrowthRibbons(wave, release, birth, afterglow);
      this.drawGrowthBloom(wave, birthEase, afterglow);
      this.drawGrowthCore(wave, charge, release, birthEase, afterglow);
      this.drawGrowthArcs(wave, charge, release, afterglow);
      wave.dots.forEach((dot, index) => {
        const local = clamp01((wave.elapsed - 250 - dot.delay) / (wave.duration * dot.durationRatio));
        const gather = clamp01((wave.elapsed - 220 - dot.delay) / 700);
        const scatter = easeOutCubic((wave.elapsed - 980 - dot.delay) / 1700);
        const orbit = dot.angle + this.time * (index % 2 === 0 ? 0.42 : -0.34);
        const gatherRadius = dot.distance * (1 - easeInOutSine(gather)) * 0.74;
        const scatterRadius = dot.distance * (0.28 + scatter * 0.92);
        const radius = wave.upgraded ? (scatter > 0 ? scatterRadius : gatherRadius) : dot.distance * easeOutCubic(local) * 0.4;
        const rise = wave.upgraded ? dot.lift * scatter + Math.sin(local * Math.PI) * 20 : dot.lift * local;
        const fall = wave.upgraded ? Math.max(0, afterglow - 0.22) * 34 * (index % 2 ? 0.8 : 1.1) : 0;
        const alpha = wave.upgraded ? Math.sin(Math.PI * clamp01(local)) * (0.24 + (index % 4) * 0.055) * (1 - fade * 0.72) : 0.28 * (1 - local);
        dot.node.clear();
        dot.node.x = Math.cos(orbit) * radius;
        dot.node.y = -54 + Math.sin(orbit) * radius * 0.32 - rise + fall;
        dot.node.circle(0, 0, dot.size * (0.65 + Math.sin(local * Math.PI) * 0.45)).fill({ color: dot.color, alpha });
        if (index % 5 === 0) dot.node.circle(-dot.size * 0.24, -dot.size * 0.24, dot.size * 0.32).fill({ color: 0xffffff, alpha: alpha * 0.86 });
        if (index % 9 === 0 && wave.upgraded) {
          const star = dot.size * (1.4 + Math.sin(local * Math.PI) * 0.8);
          dot.node.moveTo(-star, 0);
          dot.node.lineTo(star, 0);
          dot.node.moveTo(0, -star);
          dot.node.lineTo(0, star);
          dot.node.stroke({ width: 1.1, color: 0xffffff, alpha: alpha * 0.48, cap: "round" });
        }
      });
      this.drawGrowthPetals(wave, fade);
      if (t >= 1) {
        wave.root.destroy({ children: true });
        this.growthWaves.splice(i, 1);
      }
    }
  }

  private drawGrowthPool(wave: GrowthWave, charge: number, release: number, birth: number, afterglow: number) {
    const glow = wave.upgraded ? Math.max(charge * 0.14, release * 0.2, birth * 0.18) * (1 - afterglow * 0.74) : 0.08 * (1 - afterglow);
    wave.pool.clear();
    wave.pool.ellipse(0, 7, 118 + birth * 32, 32 + birth * 7).fill({ color: 0xfff0ba, alpha: glow * 0.1 });
    wave.pool.ellipse(0, 3, 78 + charge * 30, 21 + charge * 7).fill({ color: wave.accent, alpha: glow * 0.56 });
    wave.pool.ellipse(0, 1, 38 + release * 24, 10 + release * 6).fill({ color: 0xffffff, alpha: glow * 0.13 });
    wave.pool.ellipse(0, 2, 64 + birth * 44, 17 + birth * 12).stroke({ width: 1.2, color: 0xfff3bd, alpha: glow * 0.34 });
  }

  private drawGrowthVeil(wave: GrowthWave, charge: number, release: number, birth: number, afterglow: number) {
    const alpha = wave.upgraded ? (0.035 + release * 0.06 + birth * 0.08) * (1 - afterglow * 0.8) : 0.05 * (1 - afterglow);
    wave.veil.clear();
    wave.veil.ellipse(0, -60, 38 + birth * 20, 62 + birth * 24).fill({ color: wave.accent, alpha });
    wave.veil.ellipse(0, -66, 23 + charge * 16, 36 + charge * 18).fill({ color: 0xffffff, alpha: alpha * 0.2 });
    wave.veil.ellipse(0, -52, 58 + birth * 28, 30 + birth * 18).fill({ color: 0xa7ece7, alpha: alpha * 0.28 });
    wave.veil.moveTo(0, -10);
    wave.veil.lineTo(0, -118 - birth * 18);
    wave.veil.stroke({ width: 24 + birth * 14, color: 0xffffff, alpha: alpha * 0.18, cap: "round" });
    wave.veil.moveTo(0, -12);
    wave.veil.lineTo(0, -108 - birth * 12);
    wave.veil.stroke({ width: 7 + birth * 5, color: 0xfff3bd, alpha: alpha * 0.26, cap: "round" });
  }

  private drawGrowthRibbons(wave: GrowthWave, release: number, birth: number, afterglow: number) {
    const baseAlpha = wave.upgraded ? Math.max(release * 0.46, birth * 0.42) * (1 - afterglow * 0.82) : 0.1 * (1 - afterglow);
    wave.ribbons.forEach((ribbon, index) => {
      const local = clamp01((wave.elapsed - ribbon.delay) / 1200);
      const reveal = easeOutCubic(local);
      const radius = 22 + (index % 4) * 10;
      const x = Math.cos(ribbon.angle + this.time * 0.22) * radius;
      const y = Math.sin(ribbon.angle) * 9;
      const sway = Math.sin(this.time * 1.8 + ribbon.angle) * ribbon.sway;
      ribbon.node.clear();
      ribbon.node.moveTo(x * 0.42, y - 12);
      ribbon.node.quadraticCurveTo(x + sway, y - ribbon.height * 0.42 * reveal, x * 0.18 - sway * 0.34, y - ribbon.height * reveal);
      ribbon.node.stroke({ width: 5.6, color: 0xffffff, alpha: baseAlpha * 0.08 * reveal, cap: "round" });
      ribbon.node.moveTo(x * 0.42, y - 12);
      ribbon.node.quadraticCurveTo(x + sway, y - ribbon.height * 0.42 * reveal, x * 0.18 - sway * 0.34, y - ribbon.height * reveal);
      ribbon.node.stroke({ width: 1.45, color: ribbon.color, alpha: baseAlpha * 0.38 * reveal, cap: "round" });
    });
  }

  private drawGrowthBloom(wave: GrowthWave, birth: number, afterglow: number) {
    wave.bloom.clear();
    if (birth <= 0) return;
    const pulse = Math.sin(Math.PI * clamp01(birth));
    const fade = 1 - afterglow;
    wave.bloom.ellipse(0, -46, 22 + birth * 74, 10 + birth * 30).fill({ color: 0xffffff, alpha: pulse * 0.034 * fade });
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8 + birth * 0.34;
      const radius = 28 + birth * 72;
      const x = Math.cos(angle) * radius;
      const y = -48 + Math.sin(angle) * radius * 0.35;
      wave.bloom.ellipse(x, y, 8 + birth * 9, 3.5 + birth * 5).fill({ color: i % 2 ? wave.accent : 0xfff3bd, alpha: pulse * 0.085 * fade });
    }
  }

  private drawGrowthCore(wave: GrowthWave, charge: number, release: number, birth: number, afterglow: number) {
    const settledBirth = Math.min(1, birth);
    const coreScale = birth > 0 ? 0.18 + settledBirth * 0.64 - Math.max(0, settledBirth - 0.7) * 0.14 : 0.13 + release * 0.14;
    const alpha = wave.upgraded ? Math.max(charge * 0.06, release * 0.22, (1 - afterglow) * 0.13) : 0.12 * (1 - afterglow);
    const y = -46 - release * 22 - Math.sin(Math.PI * settledBirth) * 20 + afterglow * 11;
    wave.core.clear();
    wave.core.y = y;
    wave.core.scale.set(coreScale);
    wave.core.circle(0, 0, 28).fill({ color: 0xffffff, alpha: alpha * 0.26 });
    wave.core.circle(0, 0, 16).fill({ color: 0xfff3bd, alpha: alpha * 0.32 });
    wave.core.circle(0, 0, 7).fill({ color: wave.accent, alpha: alpha * 0.36 });
  }

  private drawGrowthArcs(wave: GrowthWave, charge: number, release: number, afterglow: number) {
    const arcAlpha = wave.upgraded ? Math.max(charge * 0.2, release * 0.32) * (1 - afterglow * 0.88) : 0.15 * (1 - afterglow);
    wave.arcs.forEach((arc, index) => {
      const spin = this.time * arc.speed + arc.phase;
      arc.node.clear();
      drawEllipseArc(arc.node, arc.radiusX, arc.radiusY, spin, spin + arc.length, arc.width, arc.color, arc.alpha * arcAlpha);
      drawEllipseArc(arc.node, arc.radiusX + 12, arc.radiusY + 4, spin + Math.PI * 0.86, spin + Math.PI * 0.86 + arc.length * 0.58, Math.max(0.8, arc.width - 0.45), index === 0 ? 0xa7ece7 : 0xfff3bd, arc.alpha * arcAlpha * 0.46);
    });
  }

  private drawGrowthPetals(wave: GrowthWave, fade: number) {
    wave.petals.forEach((petal, index) => {
      const local = clamp01((wave.elapsed - petal.delay) / 2300);
      const drift = easeOutCubic(local);
      const radius = 14 + petal.distance * drift;
      const angle = petal.angle + Math.sin(this.time * 0.9 + index) * 0.12;
      const alpha = Math.sin(Math.PI * local) * 0.26 * (1 - fade * 0.76);
      petal.node.clear();
      petal.node.x = Math.cos(angle) * radius;
      petal.node.y = -56 + Math.sin(angle) * radius * 0.28 - petal.lift * drift + Math.max(0, local - 0.55) * 40;
      petal.node.rotation = angle + Math.PI / 2 + Math.sin(this.time * 1.2 + index) * 0.22;
      drawPetal(petal.node, petal.width, petal.height, petal.color, alpha);
    });
  }
}
