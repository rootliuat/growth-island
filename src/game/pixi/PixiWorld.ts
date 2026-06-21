import { Application, Culler, Ticker } from "pixi.js";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";
import type { RegionId, WorldMapCallbacks, WorldMapData } from "../types";
import { v4DecorPlacements, v4LandmarkPlacements } from "../v4MapAssets";
import { CameraController } from "./CameraController";
import { InteractionManager } from "./InteractionManager";
import { WorldScene } from "./WorldScene";

const minRenderResolution = 1;
const maxRenderResolution = 1.5;
const activeMaxFps = 30;
const selectedIdleMaxFps = 24;
const pointerWakeMs = 560;
const pointerWakeThrottleMs = 96;
const qaSelectedDatasetWriteMs = 120;
const selfServiceHotspotIds = [...v4DecorPlacements, ...v4LandmarkPlacements]
  .filter((placement) => placement.interactive === "self-service")
  .map((placement) => placement.id);
type GrowthIslandWindow = Window & {
  __growthIslandMapInteractionActive?: boolean;
};

function getAdaptiveRenderResolution(width: number, height: number) {
  const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const area = width * height;
  const areaCap = area >= 1_700_000 ? 1 : area >= 900_000 ? 1.18 : maxRenderResolution;
  return Math.max(minRenderResolution, Math.min(pixelRatio, areaCap, maxRenderResolution));
}

export class PixiWorld {
  private app?: Application;
  private camera?: CameraController;
  private scene?: WorldScene;
  private readonly interactions = new InteractionManager();
  private resizeObserver?: ResizeObserver;
  private host?: HTMLDivElement;
  private lastData?: WorldMapData;
  private idleTimer?: number;
  private interactionTimer?: number;
  private staticCacheRefreshTimer?: number;
  private interactionActive = false;
  private disposed = false;
  private pendingStaticCacheRefresh = false;
  private selectedIdleAnimation = false;
  private renderResolution = minRenderResolution;
  private baseRenderResolution = minRenderResolution;
  private lastWidth = 1280;
  private lastHeight = 720;
  private pointerDragging = false;
  private exposeQaMetrics = false;
  private lastPointerWakeAt = 0;
  private lastCullAt = 0;
  private lastSelectedDatasetWriteAt = 0;
  private viewMode: "overview" | "focused" | "manual" = "overview";
  private readonly tick = (ticker: Ticker) => {
    const selectedIdleOnly = this.selectedIdleAnimation && !this.interactionActive && !this.pointerDragging;
    this.camera?.update(ticker);
    this.scene?.update(ticker, this.interactionActive, selectedIdleOnly);
    this.updateSelectedAnimationDataset();
    if (!selectedIdleOnly) this.cullVisibleScene();
  };
  private readonly wakeFromPointerInteraction = (interactionMode: "touch" | "drag" | "wheel" = "touch") => {
    this.interactionActive = true;
    this.setGlobalInteractionActive(true);
    if (this.app) this.app.ticker.maxFPS = activeMaxFps;
    if (this.app?.canvas) this.app.canvas.dataset.interactionMode = interactionMode;
    this.lastPointerWakeAt = performance.now();
    this.scheduleInteractionSettle(interactionMode === "wheel" ? 820 : 220);
    this.wake(interactionMode === "wheel" ? 1180 : pointerWakeMs);
  };
  private readonly handlePointerDown = () => {
    this.pointerDragging = true;
    this.wakeFromPointerInteraction("touch");
  };
  private readonly handlePointerMove = (event: PointerEvent) => {
    if (!this.pointerDragging && event.buttons !== 1) return;
    this.pointerDragging = true;
    const now = performance.now();
    if (now - this.lastPointerWakeAt < pointerWakeThrottleMs) return;
    this.wakeFromPointerInteraction("drag");
  };
  private readonly finishPointerInteraction = () => {
    this.pointerDragging = false;
    this.lastPointerWakeAt = 0;
    this.scheduleInteractionSettle(120);
    this.wake(180);
  };
  private readonly handleWheelInteraction = (event: WheelEvent) => {
    event.preventDefault();
    if (!this.camera) return;
    const wheelDelta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY;
    const direction = wheelDelta < 0 ? 1 : -1;
    const magnitude = Math.min(0.18, Math.max(0.04, Math.abs(wheelDelta) / 720));
    this.viewMode = "manual";
    this.restoreBaseResolution();
    this.camera.zoomBy(direction * magnitude);
    this.wakeFromPointerInteraction("wheel");
  };
  private readonly wakeFromAssetLoad = () => {
    this.pendingStaticCacheRefresh = true;
    if (this.interactionActive || this.pointerDragging) return;
    this.scheduleStaticCacheRefresh();
  };

  constructor(private readonly callbacks: WorldMapCallbacks) {}

  async mount(host: HTMLDivElement) {
    if (this.app) return;
    this.disposed = false;
    this.host = host;
    host.querySelectorAll("canvas.pixi-world-canvas").forEach((canvas) => canvas.remove());
    const app = new Application();
    this.lastWidth = host.clientWidth || 1280;
    this.lastHeight = host.clientHeight || 720;
    this.exposeQaMetrics = new URLSearchParams(window.location.search).has("qa");
    this.baseRenderResolution = getAdaptiveRenderResolution(this.lastWidth, this.lastHeight);
    this.renderResolution = this.baseRenderResolution;
    await app.init({
      width: host.clientWidth || 1280,
      height: host.clientHeight || 720,
      backgroundAlpha: 1,
      backgroundColor: 0xd9f4ef,
      antialias: false,
      preference: "webgl",
      powerPreference: "high-performance",
      resolution: this.renderResolution,
      autoDensity: true,
    });
    app.ticker.maxFPS = activeMaxFps;
    if (this.disposed || this.host !== host) {
      const canvas = app.canvas;
      app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
      canvas?.remove();
      return;
    }
    app.canvas.className = "pixi-world-canvas";
    app.canvas.dataset.renderState = "active";
    app.canvas.dataset.renderResolution = this.renderResolution.toFixed(2);
    app.canvas.dataset.selfServiceHotspotCount = String(selfServiceHotspotIds.length);
    app.canvas.dataset.selfServiceHotspots = selfServiceHotspotIds.join(",");
    host.appendChild(app.canvas);

    this.app = app;
    this.camera = new CameraController(app);
    this.scene = new WorldScene(this.camera, this.callbacks);
    app.stage.addChild(this.scene.root);
    app.ticker.add(this.tick);
    this.wake(3600);
    this.resize(host.clientWidth || WORLD_WIDTH, host.clientHeight || WORLD_HEIGHT);
    this.viewMode = "overview";
    this.scene.focusFullIsland();

    this.resizeObserver = new ResizeObserver(([entry]) => {
      const rect = entry.contentRect;
      this.resize(rect.width, rect.height);
    });
    this.resizeObserver.observe(host);
    this.interactions.add(() => this.resizeObserver?.disconnect());
    app.canvas.addEventListener("pointerdown", this.handlePointerDown);
    app.canvas.addEventListener("pointermove", this.handlePointerMove);
    app.canvas.addEventListener("pointerup", this.finishPointerInteraction);
    app.canvas.addEventListener("pointercancel", this.finishPointerInteraction);
    app.canvas.addEventListener("pointerleave", this.finishPointerInteraction);
    app.canvas.addEventListener("wheel", this.handleWheelInteraction, { passive: false });
    window.addEventListener("growth-island-asset-loaded", this.wakeFromAssetLoad);
    this.interactions.add(() => {
      app.canvas.removeEventListener("pointerdown", this.handlePointerDown);
      app.canvas.removeEventListener("pointermove", this.handlePointerMove);
      app.canvas.removeEventListener("pointerup", this.finishPointerInteraction);
      app.canvas.removeEventListener("pointercancel", this.finishPointerInteraction);
      app.canvas.removeEventListener("pointerleave", this.finishPointerInteraction);
      app.canvas.removeEventListener("wheel", this.handleWheelInteraction);
      window.removeEventListener("growth-island-asset-loaded", this.wakeFromAssetLoad);
    });
    if (this.lastData) this.scene.updateData(this.lastData);
  }

  update(data: WorldMapData) {
    const hasLedgerChange = !!data.lastLedger && data.lastLedger.id !== this.lastData?.lastLedger?.id;
    this.lastData = data;
    this.scene?.updateData(data);
    if (this.app?.canvas) {
      const currentEnergy = data.regionEnergy.find((item) => item.current);
      const selectedSpirit = data.spirits.find((spirit) => spirit.id === data.selectedChildId);
      const selfServiceEnergy = Boolean(
        selectedSpirit?.lastActivity?.includes("自助成长") && (selectedSpirit.lastActivityDelta ?? 0) > 0,
      );
      this.app.canvas.dataset.energyRegions = data.regionEnergy.map((item) => item.regionId).join(",");
      this.app.canvas.dataset.energyRegionCount = String(data.regionEnergy.length);
      this.app.canvas.dataset.currentEnergyRegion = currentEnergy?.regionId ?? "";
      this.app.canvas.dataset.selectedActivityToken = selfServiceEnergy
        ? "能量"
        : selectedSpirit?.lastActivityDelta
          ? String(selectedSpirit.lastActivityDelta)
          : "";
      this.app.canvas.dataset.selectedActivityLabel = selfServiceEnergy ? "进精灵" : selectedSpirit?.lastActivity ?? "";
    }
    this.wake(hasLedgerChange ? 5200 : 1200);
  }

  focusFullIsland() {
    this.viewMode = "overview";
    this.restoreBaseResolution();
    this.scene?.focusFullIsland();
    this.wake(1400);
  }

  focusSelected() {
    this.viewMode = "focused";
    this.restoreBaseResolution();
    this.scene?.focusSelected();
    this.wake(1400);
  }

  focusChild(childId: string) {
    this.viewMode = "focused";
    this.restoreBaseResolution();
    this.scene?.focusChild(childId);
    this.wake(1400);
  }

  focusRegion(regionId: RegionId) {
    this.viewMode = "focused";
    this.restoreBaseResolution();
    this.scene?.focusRegion(regionId);
    this.wake(1400);
  }

  zoomBy(delta: number) {
    this.viewMode = "manual";
    this.restoreBaseResolution();
    this.camera?.zoomBy(delta);
    this.wake(1400);
  }

  private resize(width: number, height: number) {
    if (!this.app || !this.camera) return;
    const safeWidth = Math.max(480, Math.floor(width));
    const safeHeight = Math.max(320, Math.floor(height));
    this.lastWidth = safeWidth;
    this.lastHeight = safeHeight;
    this.baseRenderResolution = getAdaptiveRenderResolution(safeWidth, safeHeight);
    this.setRenderResolution(this.baseRenderResolution, true);
    this.camera.resize(safeWidth, safeHeight);
    if (this.viewMode === "overview") {
      this.scene?.focusFullIsland();
    }
    this.wake(1200);
  }

  private wake(durationMs: number) {
    if (!this.app || this.disposed) return;
    window.clearTimeout(this.idleTimer);
    if (durationMs <= 0) this.interactionActive = false;
    this.selectedIdleAnimation = false;
    this.app.ticker.maxFPS = activeMaxFps;
    const wasIdle = !this.app.ticker.started;
    this.app.canvas.dataset.renderState = "active";
    this.app.canvas.dataset.selectedIdleAnimation = "false";
    if (!this.app.ticker.started) this.app.ticker.start();
    if (wasIdle) {
      this.cullVisibleScene(true);
      this.app.render();
    }
    this.idleTimer = window.setTimeout(() => this.sleep(), durationMs);
  }

  private sleep() {
    if (!this.app || this.disposed) return;
    this.scene?.setInteractionVisualMode(false);
    this.setGlobalInteractionActive(false);
    this.refreshPendingStaticCache();
    this.restoreBaseResolution();
    this.cullVisibleScene(true);
    this.app.render();
    if (this.shouldKeepSelectedIdleAnimation()) {
      this.selectedIdleAnimation = true;
      this.app.ticker.maxFPS = selectedIdleMaxFps;
      this.app.canvas.dataset.renderState = "idle-animating";
      this.app.canvas.dataset.interactionMode = "selected-idle";
      this.app.canvas.dataset.selectedIdleAnimation = "true";
      if (!this.app.ticker.started) this.app.ticker.start();
      return;
    }
    this.selectedIdleAnimation = false;
    this.app.canvas.dataset.selectedIdleAnimation = "false";
    this.app.canvas.dataset.renderState = "idle";
    this.app.ticker.stop();
  }

  private restoreBaseResolution() {
    this.setRenderResolution(this.baseRenderResolution);
    if (this.app?.canvas) this.app.canvas.dataset.interactionMode = "idle";
  }

  private cullVisibleScene(force = false) {
    if (!this.app) return;
    const now = performance.now();
    const interval = this.interactionActive || this.pointerDragging ? 180 : 260;
    if (!force && now - this.lastCullAt < interval) return;
    this.lastCullAt = now;
    Culler.shared.cull(this.app.stage, this.app.renderer.screen, false);
  }

  private scheduleInteractionSettle(delayMs: number) {
    window.clearTimeout(this.interactionTimer);
    this.interactionTimer = window.setTimeout(() => {
      if (this.pointerDragging) {
        this.scheduleInteractionSettle(180);
        return;
      }
      this.interactionActive = false;
      this.scene?.setInteractionVisualMode(false);
      this.setGlobalInteractionActive(false);
      this.refreshPendingStaticCache();
      this.restoreBaseResolution();
      this.app?.render();
    }, delayMs);
  }

  private refreshStaticCache() {
    window.clearTimeout(this.staticCacheRefreshTimer);
    this.staticCacheRefreshTimer = undefined;
    this.pendingStaticCacheRefresh = false;
    this.scene?.refreshStaticLayerCache();
  }

  private refreshPendingStaticCache() {
    if (!this.pendingStaticCacheRefresh) return;
    this.refreshStaticCache();
  }

  private shouldKeepSelectedIdleAnimation() {
    return this.viewMode === "focused" && Boolean(this.lastData?.selectedChildId);
  }

  private updateSelectedAnimationDataset() {
    if (!this.app) return;
    if (!this.exposeQaMetrics) return;
    const now = performance.now();
    if (now - this.lastSelectedDatasetWriteAt < qaSelectedDatasetWriteMs) return;
    const snapshot = this.scene?.getSelectedSpiritAnimationSnapshot();
    if (!snapshot) return;
    const decorationLod = this.scene?.getDecorationLodSnapshot();
    this.lastSelectedDatasetWriteAt = now;
    this.app.canvas.dataset.selectedSpiritVisible = snapshot.visible ? "true" : "false";
    this.app.canvas.dataset.selectedSpiritBodyY = String(snapshot.bodyY);
    this.app.canvas.dataset.selectedSpiritScale = String(snapshot.scale);
    if (decorationLod) {
      this.app.canvas.dataset.mapPropLodMode = decorationLod.mode;
      this.app.canvas.dataset.mapPropVisibleCount = String(decorationLod.visibleCount);
      this.app.canvas.dataset.mapPropDetailOnlyCount = String(decorationLod.detailOnlyCount);
      this.app.canvas.dataset.mapPropTotalCount = String(decorationLod.totalCount);
    }
  }

  private scheduleStaticCacheRefresh() {
    window.clearTimeout(this.staticCacheRefreshTimer);
    this.staticCacheRefreshTimer = window.setTimeout(() => {
      if (this.interactionActive || this.pointerDragging) return;
      this.refreshPendingStaticCache();
      this.app?.render();
    }, 520);
  }

  private setGlobalInteractionActive(active: boolean) {
    (window as GrowthIslandWindow).__growthIslandMapInteractionActive = active;
    if (!active) window.dispatchEvent(new CustomEvent("growth-island-interaction-idle"));
  }

  private setRenderResolution(resolution: number, force = false) {
    if (!this.app || (!force && Math.abs(this.renderResolution - resolution) < 0.01)) return;
    this.renderResolution = resolution;
    this.app.renderer.resize(this.lastWidth, this.lastHeight, resolution);
    this.app.canvas.dataset.renderResolution = resolution.toFixed(2);
  }

  destroy() {
    this.disposed = true;
    this.setGlobalInteractionActive(false);
    window.clearTimeout(this.idleTimer);
    window.clearTimeout(this.interactionTimer);
    window.clearTimeout(this.staticCacheRefreshTimer);
    this.interactions.destroy();
    this.app?.ticker.remove(this.tick);
    this.scene?.destroy();
    const canvas = this.app?.canvas;
    this.app?.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
    canvas?.remove();
    this.app = undefined;
    this.camera = undefined;
    this.scene = undefined;
    this.host = undefined;
  }
}
