import { Ticker } from "pixi.js";
import { Viewport } from "pixi-viewport";
import type { Application } from "pixi.js";
import { cameraConfig } from "../cameraConfig";
import { mapOverviewBounds, WORLD_HEIGHT, WORLD_WIDTH } from "../mapConfig";
import { clamp, easeInOutCubic, lerp } from "../easing";
import type { CameraTarget } from "../types";

export class CameraController {
  readonly viewport: Viewport;
  private screenWidth: number;
  private screenHeight: number;
  private animation?: {
    fromX: number;
    fromY: number;
    fromZoom: number;
    target: CameraTarget;
    elapsed: number;
    duration: number;
  };

  constructor(app: Application) {
    this.screenWidth = app.screen.width;
    this.screenHeight = app.screen.height;
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
      .decelerate({ friction: 0.92 })
      .clamp({ direction: "all", underflow: "center" })
      .clampZoom({ minScale: cameraConfig.minZoom, maxScale: cameraConfig.maxZoom });
  }

  resize(width: number, height: number) {
    this.screenWidth = width;
    this.screenHeight = height;
    this.viewport.resize(width, height, WORLD_WIDTH, WORLD_HEIGHT);
    this.viewport.clamp({ direction: "all", underflow: "center" });
  }

  fitWorld() {
    this.focus(this.fullIslandTarget(), 720);
  }

  fullIslandTarget(): CameraTarget {
    const horizontalZoom = (this.screenWidth - 132) / mapOverviewBounds.width;
    const verticalZoom = (this.screenHeight - 112) / mapOverviewBounds.height;
    const fitZoom = Math.min(horizontalZoom, verticalZoom, cameraConfig.fullIslandZoom);
    return {
      x: mapOverviewBounds.x + mapOverviewBounds.width / 2,
      y: mapOverviewBounds.y + mapOverviewBounds.height / 2,
      zoom: clamp(fitZoom, cameraConfig.minZoom, cameraConfig.fullIslandZoom),
    };
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
    const t = easeInOutCubic(clamp(this.animation.elapsed / this.animation.duration, 0, 1));
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
