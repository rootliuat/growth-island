import { Container, Graphics, Text } from "pixi.js";
import { regions } from "../regionConfig";
import type { WorldMapData } from "../types";

export class LabelLayer {
  private readonly regionLabels: Container[] = [];
  private readonly spiritLabels = new Map<string, Container>();

  constructor(private readonly layer: Container) {
    regions.forEach((region) => {
      const node = new Container();
      node.x = region.center.x;
      node.y = region.center.y - region.radiusY + 46;
      const bg = new Graphics().roundRect(-82, -18, 164, 36, 18).fill({ color: 0xfff4ce, alpha: 0.82 }).stroke({
        width: 2,
        color: region.accent,
        alpha: 0.28,
      });
      const text = new Text({
        text: region.name,
        style: { fontFamily: "Microsoft YaHei, PingFang SC", fontSize: 22, fontWeight: "900", fill: 0x3c3327 },
      });
      text.anchor.set(0.5);
      node.addChild(bg, text);
      this.regionLabels.push(node);
      this.layer.addChild(node);
    });
  }

  update(data: WorldMapData) {
    const activeIds = new Set(data.spirits.map((spirit) => spirit.id));
    for (const [id, node] of this.spiritLabels) {
      if (activeIds.has(id)) continue;
      node.destroy({ children: true });
      this.spiritLabels.delete(id);
    }
    data.spirits.forEach((spirit) => {
      let node = this.spiritLabels.get(spirit.id);
      if (!node) {
        node = this.createSpiritLabel(spirit.child.name);
        this.spiritLabels.set(spirit.id, node);
        this.layer.addChild(node);
      }
      node.x = spirit.spritePosition.x;
      node.y = spirit.spritePosition.y + 22;
      node.visible = spirit.id === data.selectedChildId;
      const text = node.getChildByLabel("name") as Text | undefined;
      if (text) text.text = spirit.child.name;
    });
  }

  updateZoom(zoom: number, selectedChildId: string) {
    this.regionLabels.forEach((label) => {
      label.visible = zoom < 1.25;
      label.alpha = zoom < 0.7 ? 1 : 0.72;
    });
    this.spiritLabels.forEach((label, childId) => {
      label.visible = zoom >= 1.18 || childId === selectedChildId;
      label.scale.set(zoom >= 1.55 ? 1 : 0.86);
    });
  }

  private createSpiritLabel(name: string) {
    const node = new Container();
    const bg = new Graphics().roundRect(-38, -12, 76, 24, 12).fill({ color: 0xfff8de, alpha: 0.9 }).stroke({
      width: 2,
      color: 0xd79e42,
      alpha: 0.32,
    });
    const text = new Text({
      text: name,
      style: { fontFamily: "Microsoft YaHei, PingFang SC", fontSize: 14, fontWeight: "800", fill: 0x4b3827 },
    });
    text.label = "name";
    text.anchor.set(0.5);
    node.addChild(bg, text);
    return node;
  }
}
