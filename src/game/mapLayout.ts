import type { WorldPoint } from "./types";

const sourceCenter: WorldPoint = { x: 1210, y: 760 };
export const mapCenter: WorldPoint = { x: 1800, y: 1130 };

export const mapSpread = {
  x: 1.48,
  y: 1.36,
  island: 1.36,
  region: 1.24,
  path: 1.25,
  landmark: 1.12,
};

export function spreadPoint(point: WorldPoint): WorldPoint {
  return {
    x: mapCenter.x + (point.x - sourceCenter.x) * mapSpread.x,
    y: mapCenter.y + (point.y - sourceCenter.y) * mapSpread.y,
  };
}

export function spreadDistanceX(value: number) {
  return value * mapSpread.x;
}

export function spreadDistanceY(value: number) {
  return value * mapSpread.y;
}

export function spreadBounds(bounds: { x: number; y: number; width: number; height: number }) {
  const topLeft = spreadPoint({ x: bounds.x, y: bounds.y });
  const bottomRight = spreadPoint({ x: bounds.x + bounds.width, y: bounds.y + bounds.height });
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}
