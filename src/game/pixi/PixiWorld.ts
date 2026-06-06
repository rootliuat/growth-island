import { Application, Ticker } from "pixi.js";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";
import type { RegionId, WorldMapCallbacks, WorldMapData } from "../types";
import { CameraController } from "./CameraController";
import { InteractionManager } from "./InteractionManager";
import { WorldScene } from "./WorldScene";

const minRenderResolution = 1;
const maxRenderResolution = 1.5;
const activeMaxFps = 45;

function getAdaptiveRenderResolution(width: number, height: number) {
  const pixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const area = width * height;
  const areaCap = area >= 3_200_000 ? 1 : area >= 1_700_000 ? 1.15 : area >= 900_000 ? 1.3 : maxRenderResolution;
  return Math.max(minRenderResolution, Math.min(pixelRatio, areaCap, maxRenderResolution));
}

function getInteractiveRenderResolution(width: number, height: number, baseResolution: number) {
  const area = width * height;
  const interactionCap = area >= 1_700_000 ? 0.32 : area >= 900_000 ? 0.5 : 0.72;
  return Math.min(baseResolution, interactionCap);
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
  private interactionActive = false;
  private disposed = false;
  private renderResolution = minRenderResolution;
  private baseRenderResolution = minRenderResolution;
  private lastWidth = 1280;
  private lastHeight = 720;
  private viewMode: "overview" | "focused" | "manual" = "overview";
  private readonly tick = (ticker: Ticker) => {
    this.camera?.update(ticker);
    this.scene?.update(ticker, this.interactionActive);
  };
  private readonly wakeFromInteraction = () => {
    this.interactionActive = true;
    if (this.app) this.app.ticker.maxFPS = activeMaxFps;
    this.useInteractiveResolution();
    window.clearTimeout(this.interactionTimer);
    this.interactionTimer = window.setTimeout(() => {
      this.interactionActive = false;
    }, 220);
    this.wake(1800);
  };
  private readonly handleWheelInteraction = (event: WheelEvent) => {
    event.preventDefault();
    this.wakeFromInteraction();
  };
  private readonly wakeFromAssetLoad = () => this.wake(900);

  constructor(private readonly callbacks: WorldMapCallbacks) {}

  async mount(host: HTMLDivElement) {
    if (this.app) return;
    this.disposed = false;
    this.host = host;
    host.querySelectorAll("canvas.pixi-world-canvas").forEach((canvas) => canvas.remove());
    const app = new Application();
    this.lastWidth = host.clientWidth || 1280;
    this.lastHeight = host.clientHeight || 720;
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
    app.canvas.addEventListener("pointerdown", this.wakeFromInteraction);
    app.canvas.addEventListener("pointermove", this.wakeFromInteraction);
    app.canvas.addEventListener("wheel", this.handleWheelInteraction, { passive: false });
    window.addEventListener("growth-island-asset-loaded", this.wakeFromAssetLoad);
    this.interactions.add(() => {
      app.canvas.removeEventListener("pointerdown", this.wakeFromInteraction);
      app.canvas.removeEventListener("pointermove", this.wakeFromInteraction);
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
    const wasIdle = !this.app.ticker.started;
    this.app.canvas.dataset.renderState = "active";
    if (!this.app.ticker.started) this.app.ticker.start();
    if (wasIdle) this.app.render();
    this.idleTimer = window.setTimeout(() => this.sleep(), durationMs);
  }

  private sleep() {
    if (!this.app || this.disposed) return;
    this.restoreBaseResolution();
    this.app.render();
    this.app.canvas.dataset.renderState = "idle";
    this.app.ticker.stop();
  }

  private useInteractiveResolution() {
    const resolution = getInteractiveRenderResolution(this.lastWidth, this.lastHeight, this.baseRenderResolution);
    this.setRenderResolution(resolution);
  }

  private restoreBaseResolution() {
    this.setRenderResolution(this.baseRenderResolution);
  }

  private setRenderResolution(resolution: number, force = false) {
    if (!this.app || (!force && Math.abs(this.renderResolution - resolution) < 0.01)) return;
    this.renderResolution = resolution;
    this.app.renderer.resize(this.lastWidth, this.lastHeight, resolution);
    this.app.canvas.dataset.renderResolution = resolution.toFixed(2);
  }

  destroy() {
    this.disposed = true;
    window.clearTimeout(this.idleTimer);
    window.clearTimeout(this.interactionTimer);
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
