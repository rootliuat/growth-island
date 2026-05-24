import { Container } from "pixi.js";

export type LayerName =
  | "ocean"
  | "island"
  | "regions"
  | "paths"
  | "decorations"
  | "homes"
  | "spirits"
  | "effects"
  | "labels";

export class LayerManager {
  readonly root = new Container();
  readonly layers = new Map<LayerName, Container>();

  constructor() {
    ([
      "ocean",
      "island",
      "regions",
      "paths",
      "decorations",
      "homes",
      "spirits",
      "effects",
      "labels",
    ] as LayerName[]).forEach((name) => {
      const layer = new Container();
      layer.label = name;
      this.layers.set(name, layer);
      this.root.addChild(layer);
    });
  }

  get(name: LayerName) {
    const layer = this.layers.get(name);
    if (!layer) throw new Error(`Missing Pixi layer: ${name}`);
    return layer;
  }

  destroy() {
    this.root.destroy({ children: true });
    this.layers.clear();
  }
}
