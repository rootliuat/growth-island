import { Container, Graphics, Ticker } from "pixi.js";
import { palette } from "../artDirection";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";

export class OceanLayer {
  private readonly waves = new Graphics();
  private readonly textureLines = new Graphics();
  private readonly sparkles: Graphics[] = [];
  private time = 0;

  constructor(private readonly layer: Container) {
    this.drawBase();
    this.layer.addChild(this.textureLines);
    this.layer.addChild(this.waves);
    for (let i = 0; i < 110; i += 1) {
      const sparkle = new Graphics()
        .circle(0, 0, 1.6 + ((i * 13) % 9) * 0.18)
        .fill({ color: palette.oceanLightLine, alpha: 0.16 + ((i * 17) % 7) * 0.018 });
      sparkle.x = (i * 211) % WORLD_WIDTH;
      sparkle.y = (i * 137) % WORLD_HEIGHT;
      sparkle.alpha = 0.45 + Math.random() * 0.45;
      this.sparkles.push(sparkle);
      this.layer.addChild(sparkle);
    }
  }

  private drawBase() {
    const g = new Graphics();
    g.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill(palette.oceanBase);
    for (let y = 92; y < WORLD_HEIGHT; y += 124) {
      g.moveTo(120, y);
      for (let x = 120; x < WORLD_WIDTH - 90; x += 290) {
        g.quadraticCurveTo(x + 92, y - 22, x + 184, y);
        g.quadraticCurveTo(x + 242, y + 14, x + 292, y - 5);
      }
      g.stroke({ width: 3, color: palette.oceanLightLine, alpha: 0.16, cap: "round" });
    }
    for (let x = 88; x < WORLD_WIDTH; x += 185) {
      g.moveTo(x, 34);
      g.lineTo(x + 34, 104);
      g.stroke({ width: 2, color: palette.oceanDarkLine, alpha: 0.08 });
    }
    this.layer.addChild(g);
  }

  update(ticker: Ticker) {
    this.time += ticker.deltaMS / 1000;
    this.textureLines.clear();
    for (let i = 0; i < 18; i += 1) {
      const x = 60 + i * 138 + Math.sin(this.time * 0.35 + i) * 8;
      this.textureLines.moveTo(x, 80);
      this.textureLines.quadraticCurveTo(x - 70, 420, x + 26, 760);
      this.textureLines.quadraticCurveTo(x + 115, 1070, x + 36, 1450);
      this.textureLines.stroke({ width: 2, color: palette.oceanDarkLine, alpha: 0.045 });
    }
    this.waves.clear();
    for (let i = 0; i < 20; i += 1) {
      const y = 75 + i * 72 + Math.sin(this.time * 0.7 + i) * 6;
      this.waves.moveTo(-120, y);
      for (let x = -120; x <= WORLD_WIDTH + 120; x += 150) {
        const crest = y + Math.sin(this.time * 0.9 + i * 0.7 + x * 0.005) * 13;
        this.waves.quadraticCurveTo(x + 50, crest - 17, x + 110, crest);
      }
      this.waves.stroke({ width: i % 3 === 0 ? 4 : 3, color: palette.oceanLightLine, alpha: i % 3 === 0 ? 0.13 : 0.08 });
    }
    this.sparkles.forEach((sparkle, index) => {
      sparkle.y += (0.035 + (index % 5) * 0.006) * ticker.deltaMS;
      sparkle.x += Math.sin(this.time * 0.5 + index) * 0.04 * ticker.deltaMS;
      sparkle.alpha = 0.22 + Math.sin(this.time * 1.2 + index) * 0.12;
      if (sparkle.y > WORLD_HEIGHT + 20) sparkle.y = -20;
    });
  }
}
