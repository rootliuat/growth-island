import { Container, Graphics, Ticker } from "pixi.js";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";

export class OceanLayer {
  private readonly waves = new Graphics();
  private readonly sparkles: Graphics[] = [];
  private time = 0;

  constructor(private readonly layer: Container) {
    this.drawBase();
    this.layer.addChild(this.waves);
    for (let i = 0; i < 80; i += 1) {
      const sparkle = new Graphics()
        .circle(0, 0, 2 + Math.random() * 2.2)
        .fill({ color: 0xffffff, alpha: 0.16 + Math.random() * 0.18 });
      sparkle.x = Math.random() * WORLD_WIDTH;
      sparkle.y = Math.random() * WORLD_HEIGHT;
      sparkle.alpha = 0.45 + Math.random() * 0.45;
      this.sparkles.push(sparkle);
      this.layer.addChild(sparkle);
    }
  }

  private drawBase() {
    const g = new Graphics();
    g.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill(0x66c9d2);
    g.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: 0x2f7f9e, alpha: 0.38 });
    g.ellipse(360, 260, 700, 260).fill({ color: 0xbceee8, alpha: 0.28 });
    g.ellipse(1980, 250, 620, 240).fill({ color: 0x94dfe2, alpha: 0.2 });
    g.ellipse(1220, 1260, 880, 260).fill({ color: 0x236b89, alpha: 0.22 });
    this.layer.addChild(g);
  }

  update(ticker: Ticker) {
    this.time += ticker.deltaMS / 1000;
    this.waves.clear();
    for (let i = 0; i < 16; i += 1) {
      const y = 90 + i * 88 + Math.sin(this.time * 0.8 + i) * 9;
      this.waves.moveTo(-80, y);
      for (let x = -80; x <= WORLD_WIDTH + 90; x += 120) {
        const cy = y + Math.sin(this.time + i * 0.7 + x * 0.006) * 18;
        this.waves.lineTo(x, cy);
      }
      this.waves.stroke({ width: 4, color: 0xffffff, alpha: 0.09 });
    }
    this.sparkles.forEach((sparkle, index) => {
      sparkle.y += (0.08 + (index % 5) * 0.012) * ticker.deltaMS;
      sparkle.x += Math.sin(this.time * 0.7 + index) * 0.12 * ticker.deltaMS;
      sparkle.alpha = 0.25 + Math.sin(this.time * 1.6 + index) * 0.18;
      if (sparkle.y > WORLD_HEIGHT + 20) sparkle.y = -20;
    });
  }
}
