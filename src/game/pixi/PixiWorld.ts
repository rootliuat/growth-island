import { Application, Ticker } from "pixi.js";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";
import type { RegionId, WorldMapCallbacks, WorldMapData } from "../types";
import { CameraController } from "./CameraController";
import { InteractionManager } from "./InteractionManager";
import { WorldScene } from "./WorldScene";

export class PixiWorld {
  private app?: Application;
  private camera?: CameraController;
  private scene?: WorldScene;
  private readonly interactions = new InteractionManager();
  private resizeObserver?: ResizeObserver;
  private host?: HTMLDivElement;
  private lastData?: WorldMapData;
  private idleTimer?: number;
  private disposed = false;
  private viewMode: "overview" | "focused" | "manual" = "overview";
  private readonly tick = (ticker: Ticker) => {
    this.camera?.update(ticker);
    this.scene?.update(ticker);
  };
  private readonly wakeFromInteraction = () => this.wake(1800);
  private readonly wakeFromAssetLoad = () => this.wake(900);

  constructor(private readonly callbacks: WorldMapCallbacks) {}

  async mount(host: HTMLDivElement) {
    if (this.app) return;
    this.disposed = false;
    this.host = host;
    host.querySelectorAll("canvas.pixi-world-canvas").forEach((canvas) => canvas.remove());
    const app = new Application();
    await app.init({
      width: host.clientWidth || 1280,
      height: host.clientHeight || 720,
      backgroundAlpha: 1,
      backgroundColor: 0xd9f4ef,
      antialias: false,
      preference: "webgl",
      powerPreference: "high-performance",
      resolution: 1,
      autoDensity: true,
    });
    app.ticker.maxFPS = 60;
    if (this.disposed || this.host !== host) {
      const canvas = app.canvas;
      app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
      canvas?.remove();
      return;
    }
    app.canvas.className = "pixi-world-canvas";
    app.canvas.dataset.renderState = "active";
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
    window.addEventListener("growth-island-asset-loaded", this.wakeFromAssetLoad);
    this.interactions.add(() => {
      app.canvas.removeEventListener("pointerdown", this.wakeFromInteraction);
      app.canvas.removeEventListener("pointermove", this.wakeFromInteraction);
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
    this.scene?.focusFullIsland();
    this.wake(1400);
  }

  focusSelected() {
    this.viewMode = "focused";
    this.scene?.focusSelected();
    this.wake(1400);
  }

  focusChild(childId: string) {
    this.viewMode = "focused";
    this.scene?.focusChild(childId);
    this.wake(1400);
  }

  focusRegion(regionId: RegionId) {
    this.viewMode = "focused";
    this.scene?.focusRegion(regionId);
    this.wake(1400);
  }

  zoomBy(delta: number) {
    this.viewMode = "manual";
    this.camera?.zoomBy(delta);
    this.wake(1400);
  }

  private resize(width: number, height: number) {
    if (!this.app || !this.camera) return;
    const safeWidth = Math.max(480, Math.floor(width));
    const safeHeight = Math.max(320, Math.floor(height));
    this.app.renderer.resize(safeWidth, safeHeight);
    this.camera.resize(safeWidth, safeHeight);
    if (this.viewMode === "overview") {
      this.scene?.focusFullIsland();
    }
    this.wake(1200);
  }

  private wake(durationMs: number) {
    if (!this.app || this.disposed) return;
    window.clearTimeout(this.idleTimer);
    const wasIdle = !this.app.ticker.started;
    this.app.canvas.dataset.renderState = "active";
    if (!this.app.ticker.started) this.app.ticker.start();
    if (wasIdle) this.app.render();
    this.idleTimer = window.setTimeout(() => this.sleep(), durationMs);
  }

  private sleep() {
    if (!this.app || this.disposed) return;
    this.app.render();
    this.app.canvas.dataset.renderState = "idle";
    this.app.ticker.stop();
  }

  destroy() {
    this.disposed = true;
    window.clearTimeout(this.idleTimer);
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
