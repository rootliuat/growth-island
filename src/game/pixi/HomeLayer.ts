import { Container, Graphics, Rectangle, Text } from "pixi.js";
import { cameraConfig } from "../cameraConfig";
import type { WorldHome, WorldMapData } from "../types";

export class HomeLayer {
  private readonly homeNodes = new Map<string, Container>();
  private selectedChildId = "";

  constructor(
    private readonly layer: Container,
    private readonly onSelect: (childId: string) => void,
    private readonly onFocus: (x: number, y: number, zoom: number) => void,
  ) {}

  update(data: WorldMapData) {
    this.selectedChildId = data.selectedChildId;
    const activeIds = new Set(data.homes.map((home) => home.id));
    for (const [id, node] of this.homeNodes) {
      if (activeIds.has(id)) continue;
      node.destroy({ children: true });
      this.homeNodes.delete(id);
    }

    data.homes.forEach((home) => {
      let node = this.homeNodes.get(home.id);
      if (!node) {
        node = this.createHome(home);
        this.homeNodes.set(home.id, node);
        this.layer.addChild(node);
      }
      node.x = home.position.x;
      node.y = home.position.y;
      node.alpha = 1;
      node.scale.set(home.childId === this.selectedChildId ? 1.08 : 1);
      const halo = node.getChildByLabel("home-halo") as Graphics | undefined;
      if (halo) halo.visible = home.childId === this.selectedChildId;
    });
    this.layer.children.sort((a, b) => a.y - b.y);
  }

  pulse(childId: string) {
    const node = [...this.homeNodes.values()].find((item) => item.label === childId);
    if (!node) return;
    node.scale.set(1.18);
  }

  updateFrame(deltaMS: number) {
    this.homeNodes.forEach((node) => {
      const target = node.label === this.selectedChildId ? 1.08 : 1;
      const next = node.scale.x + (target - node.scale.x) * Math.min(1, deltaMS / 180);
      node.scale.set(next);
    });
  }

  private createHome(home: WorldHome) {
    const node = new Container();
    node.label = home.childId;
    node.eventMode = "static";
    node.cursor = "pointer";
    node.hitArea = new Rectangle(-70, -80, 140, 160);
    node.on("pointertap", () => {
      this.onSelect(home.childId);
      this.onFocus(home.doorPosition.x, home.doorPosition.y + 12, cameraConfig.homeZoom);
    });

    const halo = new Graphics().ellipse(0, 26, 90, 30).fill({ color: 0xffdf77, alpha: 0.28 });
    halo.label = "home-halo";
    halo.visible = false;
    const body = new Graphics();
    this.drawHome(body, home);
    node.addChild(halo, body);

    if (home.level >= 2) this.drawLevelDecor(node, home);
    return node;
  }

  private drawHome(g: Graphics, home: WorldHome) {
    g.ellipse(0, 52, 86, 22).fill({ color: 0x1e261d, alpha: 0.16 });
    const accent = home.accent;
    if (home.type === "treehouse") {
      g.roundRect(-12, -28, 24, 96, 10).fill(0x7c5535);
      g.circle(-42, -48, 44).fill(0x579f65);
      g.circle(18, -65, 52).fill(0x6fbc70);
      g.circle(48, -30, 38).fill(0x4f8f59);
      g.roundRect(-50, -20, 100, 72, 16).fill(0xb47b45).stroke({ width: 4, color: 0xffe2a5, alpha: 0.55 });
      g.poly([-58, -20, 0, -68, 58, -20]).fill(0xf0bd6d);
    } else if (home.type === "shell") {
      g.arc(0, 20, 70, Math.PI, 0).fill(0xfff1bf).stroke({ width: 5, color: accent, alpha: 0.5 });
      for (let i = -3; i <= 3; i += 1) g.moveTo(0, 18).lineTo(i * 18, -45 + Math.abs(i) * 6).stroke({ width: 2, color: 0xd49a61, alpha: 0.46 });
      g.roundRect(-22, 12, 44, 42, 14).fill(0x9f6b4d);
    } else if (home.type === "pearl") {
      g.circle(0, 0, 58).fill(0xf9fbff).stroke({ width: 6, color: accent, alpha: 0.48 });
      g.circle(-20, -18, 13).fill({ color: 0xffffff, alpha: 0.8 });
      g.roundRect(-24, 18, 48, 40, 18).fill(0x78a8b8);
    } else if (home.type === "tent") {
      g.poly([-62, 54, 0, -58, 62, 54]).fill(0xf2c66e).stroke({ width: 5, color: accent, alpha: 0.45 });
      g.poly([-18, 54, 0, -18, 18, 54]).fill(0x8f5941);
    } else if (home.type === "garden") {
      g.roundRect(-56, -20, 112, 78, 18).fill(0xffdf9c).stroke({ width: 5, color: accent, alpha: 0.5 });
      g.poly([-68, -20, 0, -76, 68, -20]).fill(0xc96f59);
      g.circle(-48, 52, 10).fill(0xffa9c1);
      g.circle(54, 48, 11).fill(0x7ccf7d);
    } else {
      g.roundRect(-58, -28, 116, 86, 18).fill(0xf5cc82).stroke({ width: 5, color: accent, alpha: 0.5 });
      g.poly([-70, -28, 0, -82, 70, -28]).fill(0xb76a4c);
      g.roundRect(-18, 16, 36, 44, 12).fill(0x7c523c);
      g.rect(-46, -2, 24, 22).fill(0xfff0b4);
      g.rect(22, -2, 24, 22).fill(0xfff0b4);
    }

    if (home.level >= 4) {
      g.circle(42, -42, 10).fill(0xffec98);
      g.circle(42, -42, 22).fill({ color: 0xffe9a7, alpha: 0.16 });
    }
    if (home.level >= 5) g.ellipse(0, 18, 92, 58).stroke({ width: 3, color: 0xffda62, alpha: 0.55 });
  }

  private drawLevelDecor(node: Container, home: WorldHome) {
    const g = new Graphics();
    if (home.level >= 2) {
      g.circle(-58, 60, 8).fill(0xffb1c8);
      g.circle(58, 58, 8).fill(0x7ed17a);
    }
    if (home.level >= 3) {
      g.moveTo(-76, 64).lineTo(76, 64).stroke({ width: 4, color: 0x8d633f, alpha: 0.5 });
    }
    const plaque = new Text({
      text: `Lv.${home.level}`,
      style: { fontFamily: "Georgia, Microsoft YaHei", fontSize: 16, fontWeight: "700", fill: 0x664325 },
    });
    plaque.anchor.set(0.5);
    plaque.y = 82;
    node.addChild(g, plaque);
  }
}
