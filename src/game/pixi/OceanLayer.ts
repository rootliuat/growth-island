import { Container, Graphics, Ticker } from "pixi.js";
import { palette } from "../artDirection";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";

export class OceanLayer {
  private readonly waveMarks: Graphics[] = [];
  private readonly sparkles: Graphics[] = [];
  private time = 0;

  constructor(private readonly layer: Container) {
    this.drawBase();
    for (let i = 0; i < 76; i += 1) {
      const mark = new Graphics();
      const width = 20 + ((i * 19) % 38);
      const height = 3 + (i % 3);
      mark.ellipse(0, 0, width, height).fill({ color: palette.oceanLightLine, alpha: 0.1 + (i % 4) * 0.018 });
      mark.circle(-width * 0.66, 0, height * 0.72).fill({ color: palette.oceanLightLine, alpha: 0.08 });
      mark.circle(width * 0.66, 0, height * 0.72).fill({ color: palette.oceanLightLine, alpha: 0.08 });
      mark.x = (i * 307) % WORLD_WIDTH;
      mark.y = (i * 191) % WORLD_HEIGHT;
      mark.rotation = ((i % 7) - 3) * 0.035;
      this.waveMarks.push(mark);
      this.layer.addChild(mark);
    }
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
    this.layer.addChild(g);
  }

  update(ticker: Ticker) {
    this.time += ticker.deltaMS / 1000;
    this.waveMarks.forEach((mark, index) => {
      mark.x += (0.012 + (index % 5) * 0.003) * ticker.deltaMS;
      mark.alpha = 0.72 + Math.sin(this.time * 0.7 + index * 0.3) * 0.12;
      if (mark.x > WORLD_WIDTH + 80) mark.x = -80;
    });
    this.sparkles.forEach((sparkle, index) => {
      sparkle.y += (0.035 + (index % 5) * 0.006) * ticker.deltaMS;
      sparkle.x += Math.sin(this.time * 0.5 + index) * 0.04 * ticker.deltaMS;
      sparkle.alpha = 0.22 + Math.sin(this.time * 1.2 + index) * 0.12;
      if (sparkle.y > WORLD_HEIGHT + 20) sparkle.y = -20;
    });
  }
}
