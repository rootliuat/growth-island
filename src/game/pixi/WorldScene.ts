import { Container, Ticker } from "pixi.js";
import { getDoorFocusTarget } from "../assetScaleRules";
import { cameraConfig } from "../cameraConfig";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";
import { regionsById } from "../regionConfig";
import type { RegionId, WorldMapCallbacks, WorldMapData } from "../types";
import { CameraController } from "./CameraController";
import { DecorationLayer } from "./DecorationLayer";
import { EffectLayer } from "./EffectLayer";
import { HomeLayer } from "./HomeLayer";
import { IslandLayer } from "./IslandLayer";
import { LabelLayer } from "./LabelLayer";
import { LayerManager } from "./LayerManager";
import { OceanLayer } from "./OceanLayer";
import { PathLayer } from "./PathLayer";
import { RegionLayer } from "./RegionLayer";
import { SpiritLayer } from "./SpiritLayer";

export class WorldScene {
  readonly root = new Container();
  readonly layers = new LayerManager();
  readonly ocean: OceanLayer;
  readonly regions: RegionLayer;
  readonly effects: EffectLayer;
  readonly homes: HomeLayer;
  readonly spirits: SpiritLayer;
  readonly labels: LabelLayer;
  private data?: WorldMapData;
  private lastLedgerId?: string;

  constructor(
    private readonly camera: CameraController,
    private readonly callbacks: WorldMapCallbacks,
  ) {
    this.ocean = new OceanLayer(this.layers.get("ocean"));
    new IslandLayer(this.layers.get("island"));
    this.regions = new RegionLayer(this.layers.get("regions"), this.layers.get("labels"), this.focusRegionPoint);
    new PathLayer(this.layers.get("paths"));
    new DecorationLayer(this.layers.get("decorations"), {
      onFocusPoint: this.focusPoint,
      onOpenDialogue: this.callbacks.onOpenDialogue,
      onOpenPk: this.callbacks.onOpenPk,
    });
    this.effects = new EffectLayer(this.layers.get("effects"));
    this.homes = new HomeLayer(this.layers.get("homes"), this.selectChild, this.focusPoint);
    this.spirits = new SpiritLayer(this.layers.get("spirits"), this.selectChild, this.focusPoint);
    this.labels = new LabelLayer(this.layers.get("labels"));
    this.camera.viewport.addChild(this.layers.root);
    this.root.addChild(this.camera.viewport);
  }

  updateData(data: WorldMapData) {
    const previousData = this.data;
    const previousSelected = this.data?.selectedChildId;
    this.data = data;
    this.homes.update(data);
    this.spirits.update(data);
    this.labels.update(data);
    const selected = data.spirits.find((spirit) => spirit.id === data.selectedChildId);
    this.effects.setSelectedGuide(undefined, selected?.accent);
    this.homes.updateZoom(this.camera.zoom);
    this.spirits.updateZoom(this.camera.zoom);
    this.labels.updateZoom(this.camera.zoom, data.selectedChildId);

    if (previousSelected && data.selectedChildId !== previousSelected) {
      if (selected) this.focusSpirit(selected);
    }

    if (!previousData) {
      this.lastLedgerId = data.lastLedger?.id;
      return;
    }

    if (data.lastLedger && data.lastLedger.id !== this.lastLedgerId) {
      this.lastLedgerId = data.lastLedger.id;
      const target = data.spirits.find((spirit) => spirit.id === data.lastLedger?.childId);
      if (target) {
        const previousTarget = previousData.spirits.find((spirit) => spirit.id === target.id);
        this.effects.emitXp(target.spritePosition, data.lastLedger.delta);
        this.spirits.bounce(target.id);
        this.homes.pulse(target.id);
        if (previousTarget && (previousTarget.child.level !== target.child.level || previousTarget.child.state !== target.child.state)) {
          this.effects.emitGrowthChange(target.homePosition, target.child.xp >= previousTarget.child.xp);
        }
      }
    }
  }

  update(ticker: Ticker) {
    this.ocean.update(ticker);
    this.regions.update(ticker, this.camera.zoom);
    this.effects.update(ticker);
    this.homes.updateFrame(ticker.deltaMS);
    this.homes.updateZoom(this.camera.zoom);
    this.spirits.updateFrame(ticker);
    this.spirits.updateZoom(this.camera.zoom);
    if (this.data) this.labels.updateZoom(this.camera.zoom, this.data.selectedChildId);
  }

  focusFullIsland() {
    this.camera.focus(this.camera.fullIslandTarget(), 720);
  }

  focusSelected() {
    const selected = this.data?.spirits.find((spirit) => spirit.id === this.data?.selectedChildId);
    if (selected) this.focusSpirit(selected);
  }

  focusChild(childId: string) {
    const selected = this.data?.spirits.find((spirit) => spirit.id === childId);
    if (selected) this.focusSpirit(selected);
  }

  focusRegion(regionId: RegionId) {
    const region = regionsById.get(regionId);
    if (!region) return;
    this.focusRegionPoint(region.id, region.center.x, region.center.y, cameraConfig.communityZoom);
  }

  private selectChild = (childId: string) => {
    this.callbacks.onSelectChild(childId);
  };

  private focusPoint = (x: number, y: number, zoom: number) => {
    this.camera.focus({ x, y, zoom });
  };

  private focusSpirit(spirit: WorldMapData["spirits"][number]) {
    const target = getDoorFocusTarget(spirit.doorPosition, cameraConfig.spiritZoom);
    this.focusPoint(target.x, target.y, target.zoom);
  }

  private focusRegionPoint = (regionId: RegionId, x: number, y: number, zoom: number) => {
    const region = regionsById.get(regionId);
    this.regions.setActive(regionId);
    this.camera.focus({ x, y, zoom: region?.id === "growth-plaza" ? 1.05 : zoom });
  };

  destroy() {
    this.layers.destroy();
    this.root.destroy({ children: true });
  }
}
