import { Ticker } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { Application } from "pixi.js";
import { cameraConfig } from "../cameraConfig";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";
import { clamp, easeOutCubic, lerp } from "../easing";
import type { CameraTarget } from "../types";

export class CameraController {
  readonly viewport: Viewport;
  private animation?: {
    fromX: number;
    fromY: number;
    fromZoom: number;
    target: CameraTarget;
    elapsed: number;
    duration: number;
  };

  constructor(private readonly app: Application) {
    this.viewport = new Viewport({
      screenWidth: app.screen.width,
      screenHeight: app.screen.height,
      worldWidth: WORLD_WIDTH,
      worldHeight: WORLD_HEIGHT,
      events: app.renderer.events,
      ticker: app.ticker,
    });
    this.viewport
      .drag({ mouseButtons: "left" })
      .pinch()
      .wheel({ smooth: 8 })
      .decelerate({ friction: 0.92 })
      .clamp({ direction: "all", underflow: "center" })
      .clampZoom({ minScale: cameraConfig.minZoom, maxScale: cameraConfig.maxZoom });
  }

  resize(width: number, height: number) {
    this.viewport.resize(width, height, WORLD_WIDTH, WORLD_HEIGHT);
    this.viewport.clamp({ direction: "all", underflow: "center" });
  }

  fitWorld() {
    this.focus({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, zoom: cameraConfig.fullIslandZoom }, 720);
  }

  focus(target: CameraTarget, duration = cameraConfig.focusDurationMs) {
    this.animation = {
      fromX: this.viewport.center.x,
      fromY: this.viewport.center.y,
      fromZoom: this.viewport.scale.x,
      target: {
        x: clamp(target.x, 120, WORLD_WIDTH - 120),
        y: clamp(target.y, 120, WORLD_HEIGHT - 120),
        zoom: clamp(target.zoom, cameraConfig.minZoom, cameraConfig.maxZoom),
      },
      elapsed: 0,
      duration,
    };
  }

  zoomBy(delta: number) {
    this.focus(
      {
        x: this.viewport.center.x,
        y: this.viewport.center.y,
        zoom: this.viewport.scale.x + delta,
      },
      260,
    );
  }

  update(ticker: Ticker) {
    if (!this.animation) return;
    this.animation.elapsed += ticker.deltaMS;
    const t = easeOutCubic(clamp(this.animation.elapsed / this.animation.duration, 0, 1));
    const x = lerp(this.animation.fromX, this.animation.target.x, t);
    const y = lerp(this.animation.fromY, this.animation.target.y, t);
    const zoom = lerp(this.animation.fromZoom, this.animation.target.zoom, t);
    this.viewport.setZoom(zoom, true);
    this.viewport.moveCenter(x, y);
    if (t >= 1) this.animation = undefined;
  }

  get zoom() {
    return this.viewport.scale.x;
  }
}
