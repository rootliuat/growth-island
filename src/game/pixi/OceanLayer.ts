import { Container, Graphics, Ticker } from "pixi.js";
import { palette } from "../artDirection";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";

export class OceanLayer {
  private readonly waveMarks: Graphics[] = [];
  private readonly tideLines: Graphics[] = [];
  private readonly sparkles: Graphics[] = [];
  private time = 0;

  constructor(private readonly layer: Container) {
    this.drawBase();
    this.drawLargeWaterRhythm();
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
    for (let i = 0; i < 28; i += 1) {
      const line = new Graphics();
      const width = 78 + (i % 4) * 26;
      line.moveTo(-width / 2, 0);
      line.quadraticCurveTo(-width * 0.18, -10 - (i % 3) * 4, 0, -1);
      line.quadraticCurveTo(width * 0.22, 10 + (i % 2) * 5, width / 2, 0);
      line.stroke({ width: 3, color: palette.oceanLightLine, alpha: 0.16, cap: "round" });
      line.x = (i * 197 + 80) % WORLD_WIDTH;
      line.y = (i * 151 + 44) % WORLD_HEIGHT;
      line.rotation = ((i % 9) - 4) * 0.024;
      this.tideLines.push(line);
      this.layer.addChild(line);
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

  private drawLargeWaterRhythm() {
    const g = new Graphics();
    const ribbons = [
      [
        { x: 170, y: 364 },
        { x: 430, y: 240 },
        { x: 760, y: 214 },
      ],
      [
        { x: 1530, y: 252 },
        { x: 1840, y: 250 },
        { x: 2175, y: 420 },
      ],
      [
        { x: 2135, y: 910 },
        { x: 2030, y: 1168 },
        { x: 1702, y: 1325 },
      ],
      [
        { x: 650, y: 1358 },
        { x: 1015, y: 1430 },
        { x: 1422, y: 1394 },
      ],
      [
        { x: 56, y: 1030 },
        { x: 146, y: 1230 },
        { x: 380, y: 1374 },
      ],
    ];

    ribbons.forEach(([start, control, end], index) => {
      g.moveTo(start.x, start.y);
      g.quadraticCurveTo(control.x, control.y, end.x, end.y);
      g.stroke({ width: 18, color: palette.oceanDarkLine, alpha: 0.07, cap: "round" });
      g.moveTo(start.x + 18, start.y + 16);
      g.quadraticCurveTo(control.x + 22, control.y + 10, end.x - 18, end.y + 14);
      g.stroke({ width: 5, color: palette.oceanLightLine, alpha: 0.2, cap: "round" });
      if (index % 2 === 0) {
        g.moveTo(start.x - 24, start.y + 52);
        g.quadraticCurveTo(control.x - 12, control.y + 44, end.x - 44, end.y + 46);
        g.stroke({ width: 3, color: palette.oceanLightLine, alpha: 0.14, cap: "round" });
      }
    });

    for (let i = 0; i < 32; i += 1) {
      const x = (i * 173 + 94) % WORLD_WIDTH;
      const y = (i * 251 + 116) % WORLD_HEIGHT;
      const size = 10 + (i % 5) * 4;
      g.ellipse(x, y, size, size * 0.38).stroke({
        width: 2,
        color: i % 3 === 0 ? palette.oceanDarkLine : palette.oceanLightLine,
        alpha: i % 3 === 0 ? 0.08 : 0.13,
      });
    }

    this.layer.addChild(g);
  }

  update(ticker: Ticker) {
    this.time += ticker.deltaMS / 1000;
    this.waveMarks.forEach((mark, index) => {
      mark.x += (0.012 + (index % 5) * 0.003) * ticker.deltaMS;
      mark.alpha = 0.72 + Math.sin(this.time * 0.7 + index * 0.3) * 0.12;
      if (mark.x > WORLD_WIDTH + 80) mark.x = -80;
    });
    this.tideLines.forEach((line, index) => {
      line.x += (0.006 + (index % 4) * 0.002) * ticker.deltaMS;
      line.y += Math.sin(this.time * 0.42 + index) * 0.012 * ticker.deltaMS;
      line.alpha = 0.58 + Math.sin(this.time * 0.55 + index * 0.45) * 0.16;
      if (line.x > WORLD_WIDTH + 120) line.x = -120;
    });
    this.sparkles.forEach((sparkle, index) => {
      sparkle.y += (0.035 + (index % 5) * 0.006) * ticker.deltaMS;
      sparkle.x += Math.sin(this.time * 0.5 + index) * 0.04 * ticker.deltaMS;
      sparkle.alpha = 0.22 + Math.sin(this.time * 1.2 + index) * 0.12;
      if (sparkle.y > WORLD_HEIGHT + 20) sparkle.y = -20;
    });
  }
}
