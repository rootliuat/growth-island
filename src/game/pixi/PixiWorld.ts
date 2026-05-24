import { Application, Ticker } from "pixi.js";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";
import type { WorldMapCallbacks, WorldMapData } from "../types";
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
  private disposed = false;
  private readonly tick = (ticker: Ticker) => {
    this.camera?.update(ticker);
    this.scene?.update(ticker);
  };

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
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    if (this.disposed || this.host !== host) {
      const canvas = app.canvas;
      app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
      canvas?.remove();
      return;
    }
    app.canvas.className = "pixi-world-canvas";
    host.appendChild(app.canvas);

    this.app = app;
    this.camera = new CameraController(app);
    this.scene = new WorldScene(this.camera, this.callbacks);
    app.stage.addChild(this.scene.root);
    app.ticker.add(this.tick);
    this.resize(host.clientWidth || WORLD_WIDTH, host.clientHeight || WORLD_HEIGHT);
    this.scene.focusFullIsland();

    this.resizeObserver = new ResizeObserver(([entry]) => {
      const rect = entry.contentRect;
      this.resize(rect.width, rect.height);
    });
    this.resizeObserver.observe(host);
    this.interactions.add(() => this.resizeObserver?.disconnect());
    if (this.lastData) this.scene.updateData(this.lastData);
  }

  update(data: WorldMapData) {
    this.lastData = data;
    this.scene?.updateData(data);
  }

  focusFullIsland() {
    this.scene?.focusFullIsland();
  }

  focusSelected() {
    this.scene?.focusSelected();
  }

  focusChild(childId: string) {
    this.scene?.focusChild(childId);
  }

  zoomBy(delta: number) {
    this.camera?.zoomBy(delta);
  }

  private resize(width: number, height: number) {
    if (!this.app || !this.camera) return;
    const safeWidth = Math.max(480, Math.floor(width));
    const safeHeight = Math.max(320, Math.floor(height));
    this.app.renderer.resize(safeWidth, safeHeight);
    this.camera.resize(safeWidth, safeHeight);
  }

  destroy() {
    this.disposed = true;
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
