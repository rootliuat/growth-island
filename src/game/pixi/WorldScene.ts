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

function isSelfServiceEnergyReason(reason?: string) {
  return Boolean(reason?.startsWith("自助成长："));
}

function regionEnergyCacheKey(items: WorldMapData["regionEnergy"]) {
  return items
    .map((item) => `${item.regionId}:${item.count}:${item.current ? 1 : 0}:${item.color}:${item.displayText}`)
    .join("|");
}

export class WorldScene {
  readonly root = new Container();
  readonly layers = new LayerManager();
  readonly ocean: OceanLayer;
  readonly regions: RegionLayer;
  readonly decorations: DecorationLayer;
  readonly effects: EffectLayer;
  readonly homes: HomeLayer;
  readonly spirits: SpiritLayer;
  readonly labels: LabelLayer;
  private readonly cachedStaticLayers: Container[];
  private data?: WorldMapData;
  private lastLedgerId?: string;
  private regionEnergyKey = "";
  private animationElapsed = 0;
  private lastZoom = Number.NaN;
  private readonly animationStepMs = 1000 / 30;
  private readonly staticCacheResolution = 1;
  private pendingDecorationCacheRefresh = false;

  constructor(
    private readonly camera: CameraController,
    private readonly callbacks: WorldMapCallbacks,
  ) {
    this.ocean = new OceanLayer(this.layers.get("ocean"));
    new IslandLayer(this.layers.get("island"));
    this.regions = new RegionLayer(this.layers.get("regions"), this.layers.get("labels"), this.focusRegionPoint);
    new PathLayer(this.layers.get("paths"));
    this.decorations = new DecorationLayer(this.layers.get("decorations"), {
      onFocusPoint: this.focusPoint,
      onOpenDialogue: this.callbacks.onOpenDialogue,
      onOpenModule: this.callbacks.onOpenModule,
      onPrepareMoralSpeak: this.callbacks.onPrepareMoralSpeak,
      onOpenPk: this.callbacks.onOpenPk,
    });
    this.effects = new EffectLayer(this.layers.get("effects"));
    this.homes = new HomeLayer(this.layers.get("homes"), this.selectChild, this.focusPoint);
    this.spirits = new SpiritLayer(this.layers.get("spirits"), this.selectChild, this.focusPoint);
    this.labels = new LabelLayer(this.layers.get("labels"));
    this.cachedStaticLayers = [this.layers.staticRoot];
    this.enableStaticLayerCache();
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
    const nextRegionEnergyKey = regionEnergyCacheKey(data.regionEnergy);
    if (nextRegionEnergyKey !== this.regionEnergyKey) {
      this.regionEnergyKey = nextRegionEnergyKey;
      this.regions.setEnergy(data.regionEnergy);
      this.refreshStaticLayerCache();
    }
    const selected = data.spirits.find((spirit) => spirit.id === data.selectedChildId);
    const selectedSelfServiceEnergy = isSelfServiceEnergyReason(selected?.lastActivity) && (selected?.lastActivityDelta ?? 0) > 0;
    this.effects.setSelectedGuide(
      selected?.lastActivityDelta && selected.lastActivityDelta > 0 && !selectedSelfServiceEnergy ? selected.spritePosition : undefined,
      selected?.accent,
    );
    this.updateZoomState(true);

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
        const changedStage = !!previousTarget && (previousTarget.child.level !== target.child.level || previousTarget.child.state !== target.child.state);
        const upgraded = !!previousTarget && target.child.xp >= previousTarget.child.xp;
        const selfServiceEnergy = isSelfServiceEnergyReason(data.lastLedger.reason) && data.lastLedger.delta > 0;
        if (selfServiceEnergy) {
          this.effects.emitEnergyArrival(target.spritePosition, target.homePosition, target.accent);
        } else {
          this.effects.emitXp(target.spritePosition, data.lastLedger.delta);
        }
        if (changedStage) this.spirits.evolve(target.id, upgraded);
        else this.spirits.bounce(target.id);
        this.homes.pulse(target.id);
        if (changedStage) this.effects.emitGrowthChange(target.spritePosition, upgraded, target.accent);
      }
    }
  }

  update(ticker: Ticker, interactionActive = false, selectedIdleOnly = false) {
    this.setInteractionVisualMode(interactionActive);
    this.animationElapsed += ticker.deltaMS;
    if (this.animationElapsed < this.animationStepMs) return;

    const frame = {
      deltaMS: this.animationElapsed,
      deltaTime: this.animationElapsed / (1000 / 60),
    } as Ticker;
    this.animationElapsed = 0;

    this.updateZoomState(false, interactionActive);
    if (!interactionActive) this.flushPendingDecorationCacheRefresh();
    if (interactionActive || selectedIdleOnly) {
      this.spirits.updateFrame(frame, { selectedOnly: true });
      return;
    }

    this.regions.update(frame, this.camera.zoom);
    this.effects.update(frame);
    this.homes.updateFrame(frame.deltaMS);
    this.spirits.updateFrame(frame);
  }

  getSelectedSpiritAnimationSnapshot() {
    return this.spirits.getSelectedAnimationSnapshot();
  }

  getDecorationLodSnapshot() {
    return this.decorations.getLodSnapshot();
  }

  refreshStaticLayerCache() {
    this.cachedStaticLayers.forEach((layer) => layer.updateCacheTexture());
  }

  setInteractionVisualMode(_interactionActive: boolean) {
    this.labels.setInteractionMode(_interactionActive);
    this.layers.get("decorations").renderable = true;
    this.layers.get("labels").renderable = true;
    this.layers.get("effects").renderable = !_interactionActive;
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
    this.refreshStaticLayerCache();
    this.camera.focus({ x, y, zoom: region?.id === "growth-plaza" ? 1.05 : zoom });
  };

  private updateZoomState(force = false, interactionActive = false) {
    const zoom = this.camera.zoom;
    const zoomChanged = force || Math.abs(zoom - this.lastZoom) >= 0.002;
    if (zoomChanged) {
      this.lastZoom = zoom;
      this.homes.updateZoom(zoom);
      this.spirits.updateZoom(zoom);
      if (this.data) this.labels.updateZoom(zoom, this.data.selectedChildId);
    }
    if (interactionActive && !force) return;
    const decorationsChanged = this.decorations.updateZoom(zoom);
    if (!decorationsChanged) return;
    if (interactionActive) {
      this.pendingDecorationCacheRefresh = true;
      return;
    }
    this.refreshStaticLayerCache();
  }

  private flushPendingDecorationCacheRefresh() {
    if (!this.pendingDecorationCacheRefresh) return;
    this.pendingDecorationCacheRefresh = false;
    this.refreshStaticLayerCache();
  }

  private enableStaticLayerCache() {
    this.cachedStaticLayers.forEach((layer) => {
      layer.cacheAsTexture({ resolution: this.staticCacheResolution, antialias: false });
    });
  }

  destroy() {
    this.layers.destroy();
    this.root.destroy({ children: true });
  }
}
