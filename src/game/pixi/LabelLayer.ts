import { Container, Graphics, Text } from "pixi.js";
import { palette } from "../artDirection";
import { regions } from "../regionConfig";
import type { WorldMapData, WorldSpirit } from "../types";

export class LabelLayer {
  private readonly regionLabels: Container[] = [];
  private readonly spiritLabels = new Map<string, Container>();

  constructor(private readonly layer: Container) {
    regions.forEach((region) => {
      const node = new Container();
      node.x = region.signPosition.x;
      node.y = region.signPosition.y;
      const width = region.name.length > 5 ? 174 : 132;
      const pole = new Graphics();
      pole.rect(-4, 16, 8, 52).fill(palette.woodDark);
      pole.roundRect(-width / 2, -20, width, 38, 10).fill(0xffe4a8).stroke({
        width: 3,
        color: region.accent,
        alpha: 0.52,
      });
      pole.circle(-width / 2 + 14, -1, 3).fill(0xf8f1d5);
      pole.circle(width / 2 - 14, -1, 3).fill(0xf8f1d5);
      const text = new Text({
        text: region.name,
        style: { fontFamily: "Microsoft YaHei, PingFang SC", fontSize: 20, fontWeight: "900", fill: palette.textMain },
      });
      text.anchor.set(0.5);
      node.addChild(pole, text);
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
        node = this.createSpiritLabel();
        this.spiritLabels.set(spirit.id, node);
        this.layer.addChild(node);
      }
      node.x = spirit.spritePosition.x;
      node.y = spirit.spritePosition.y + 24;
      node.visible = spirit.id === data.selectedChildId;
      this.updateSpiritLabel(node, spirit);
    });
  }

  updateZoom(zoom: number, selectedChildId: string) {
    this.regionLabels.forEach((label) => {
      label.visible = zoom < 1.2;
      label.alpha = zoom < 0.72 ? 1 : 0.76;
      label.scale.set(zoom < 0.72 ? 1 : 0.9);
    });
    this.spiritLabels.forEach((label, childId) => {
      const selected = childId === selectedChildId;
      label.visible = selected || zoom >= 1.15;
      label.scale.set(zoom >= 1.45 ? 1 : 0.84);
      const bubble = label.getChildByLabel("activity-bubble");
      if (bubble) bubble.visible = selected && zoom >= 1.36;
    });
  }

  private createSpiritLabel() {
    const node = new Container();
    const bg = new Graphics();
    bg.label = "name-bg";
    const text = new Text({
      text: "",
      style: { fontFamily: "Microsoft YaHei, PingFang SC", fontSize: 14, fontWeight: "900", fill: palette.textMain },
    });
    text.label = "name";
    text.anchor.set(0.5);

    const bubble = new Container();
    bubble.label = "activity-bubble";
    bubble.y = 32;
    const bubbleBg = new Graphics();
    bubbleBg.label = "bubble-bg";
    const bubbleText = new Text({
      text: "",
      style: { fontFamily: "Microsoft YaHei, PingFang SC", fontSize: 12, fontWeight: "700", fill: palette.textSubtle },
    });
    bubbleText.label = "bubble-text";
    bubbleText.anchor.set(0.5);
    bubble.addChild(bubbleBg, bubbleText);

    node.addChild(bg, text, bubble);
    return node;
  }

  private updateSpiritLabel(node: Container, spirit: WorldSpirit) {
    const bg = node.getChildByLabel("name-bg") as Graphics | undefined;
    const text = node.getChildByLabel("name") as Text | undefined;
    const bubble = node.getChildByLabel("activity-bubble") as Container | undefined;
    if (text) text.text = spirit.child.name;
    if (bg) {
      bg.clear();
      bg.roundRect(-42, -13, 84, 26, 13).fill(0xfff6d7).stroke({
        width: 2,
        color: spirit.accent,
        alpha: 0.32,
      });
    }
    const bubbleText = bubble?.getChildByLabel("bubble-text") as Text | undefined;
    const bubbleBg = bubble?.getChildByLabel("bubble-bg") as Graphics | undefined;
    if (bubbleText && bubbleBg) {
      const note = spirit.lastActivity ? spirit.lastActivity.slice(0, 14) : "今天也在成长";
      bubbleText.text = note;
      bubbleBg.clear();
      bubbleBg.roundRect(-68, -13, 136, 26, 13).fill(0xf4f1e6).stroke({
        width: 2,
        color: spirit.accent,
        alpha: 0.18,
      });
    }
  }
}
