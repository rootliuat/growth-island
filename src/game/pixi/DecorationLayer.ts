import { Container, Graphics } from "pixi.js";
import { decorations, type DecorationItem } from "../decorationConfig";
import { growthTreePosition, oldStreetPosition } from "../mapConfig";

export class DecorationLayer {
  constructor(private readonly layer: Container) {
    this.drawLandmarks();
    decorations.forEach((item) => this.drawDecoration(item));
    this.layer.children.sort((a, b) => a.y - b.y);
  }

  private drawLandmarks() {
    const tree = new Graphics();
    tree.x = growthTreePosition.x;
    tree.y = growthTreePosition.y;
    tree.ellipse(0, 92, 155, 36).fill({ color: 0x2c3429, alpha: 0.18 });
    tree.roundRect(-26, -12, 52, 168, 24).fill(0x86623a);
    tree.roundRect(-15, -70, 30, 92, 15).fill(0xa47752);
    [0x4f9f61, 0x75bf68, 0x6dad5e, 0x3f864f].forEach((color, index) => {
      tree.circle((index - 1.5) * 48, -52 - (index % 2) * 28, 78 - index * 3).fill(color);
    });
    tree.circle(0, -70, 112).stroke({ width: 7, color: 0xffdf77, alpha: 0.7 });
    tree.circle(0, -70, 150).stroke({ width: 2, color: 0xfff3bd, alpha: 0.35 });
    this.layer.addChild(tree);

    const oldStreet = new Graphics();
    oldStreet.x = oldStreetPosition.x;
    oldStreet.y = oldStreetPosition.y - 42;
    oldStreet.roundRect(-112, -45, 224, 80, 12).fill(0x8f5239);
    oldStreet.rect(-100, -34, 200, 16).fill(0xc87a52);
    oldStreet.poly([-128, -45, 0, -132, 128, -45]).fill(0xf1bf73).stroke({ width: 5, color: 0x7d432e, alpha: 0.55 });
    oldStreet.rect(-78, -5, 34, 40).fill(0xffdf97);
    oldStreet.rect(48, -5, 34, 40).fill(0xffdf97);
    this.layer.addChild(oldStreet);
  }

  private drawDecoration(item: DecorationItem) {
    const g = new Graphics();
    g.x = item.position.x;
    g.y = item.position.y;
    g.scale.set(item.scale ?? 1);
    if (item.kind === "mangrove" || item.kind === "tree") {
      const leaf = item.kind === "mangrove" ? 0x4f995b : 0x6fb264;
      g.ellipse(0, 32, 50, 14).fill({ color: 0x1e2c22, alpha: 0.16 });
      g.roundRect(-8, -16, 16, 68, 7).fill(0x7b5431);
      g.circle(-22, -28, 34).fill(leaf);
      g.circle(16, -42, 38).fill(item.kind === "mangrove" ? 0x3f7d55 : 0x82c873);
      g.circle(36, -18, 29).fill(leaf);
    } else if (item.kind === "flower") {
      for (let i = 0; i < 8; i += 1) {
        g.circle(Math.cos(i) * 18, Math.sin(i) * 8, 8).fill(i % 2 ? 0xffb5bd : 0xffdf7a);
      }
      g.circle(0, 0, 8).fill(0xffffff);
    } else if (item.kind === "shell") {
      g.ellipse(0, 12, 42, 16).fill({ color: 0x1f2c2b, alpha: 0.12 });
      g.arc(0, 0, 34, Math.PI, 0).fill(0xfff1c4).stroke({ width: 4, color: 0xd88b59, alpha: 0.55 });
      for (let i = -2; i <= 2; i += 1) g.moveTo(0, -1).lineTo(i * 12, -26).stroke({ width: 2, color: 0xdba66c, alpha: 0.45 });
    } else if (item.kind === "pearl") {
      g.circle(0, 0, 28).fill(0xf9fbff).stroke({ width: 4, color: 0x8ed2e2, alpha: 0.6 });
      g.circle(-9, -10, 7).fill({ color: 0xffffff, alpha: 0.8 });
    } else if (item.kind === "flag") {
      g.rect(-4, -50, 8, 76).fill(0x6b4a2e);
      g.poly([4, -50, 52, -36, 4, -22]).fill(0xffd464).stroke({ width: 2, color: 0x8f5a3a, alpha: 0.55 });
    } else if (item.kind === "lamp") {
      g.rect(-5, -45, 10, 70).fill(0x6b4a2e);
      g.circle(0, -50, 18).fill(0xffe79a).stroke({ width: 4, color: 0xffffff, alpha: 0.7 });
      g.circle(0, -50, 30).fill({ color: 0xffe9a6, alpha: 0.18 });
    } else if (item.kind === "sign") {
      g.rect(-5, -16, 10, 52).fill(0x7a5639);
      g.roundRect(-44, -42, 88, 32, 8).fill(0xffe0a0).stroke({ width: 3, color: 0x8b5a3b, alpha: 0.6 });
    } else {
      g.ellipse(0, 0, 34, 18).fill(0x9b8a72).stroke({ width: 2, color: 0xffffff, alpha: 0.35 });
    }
    this.layer.addChild(g);
  }
}
