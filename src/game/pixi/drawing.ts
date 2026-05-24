import type { Graphics } from "pixi.js";
import type { WorldPoint } from "../types";

export function flatten(points: WorldPoint[]) {
  return points.flatMap((point) => [point.x, point.y]);
}

export function drawOrganicPolygon(
  g: Graphics,
  points: WorldPoint[],
  fillColor: number,
  strokeColor: number,
  options?: { fillAlpha?: number; strokeAlpha?: number; strokeWidth?: number },
) {
  g.poly(flatten(points)).fill({ color: fillColor, alpha: options?.fillAlpha ?? 1 });
  g.poly(flatten(points)).stroke({
    width: options?.strokeWidth ?? 4,
    color: strokeColor,
    alpha: options?.strokeAlpha ?? 0.42,
    join: "round",
  });
}

export function drawCurvedPath(
  g: Graphics,
  points: WorldPoint[],
  width: number,
  color: number,
  alpha = 1,
) {
  if (points.length < 2) return;
  g.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const next = points[i];
    const midX = (previous.x + next.x) / 2;
    const midY = (previous.y + next.y) / 2;
    g.quadraticCurveTo(previous.x, previous.y, midX, midY);
  }
  const last = points[points.length - 1];
  g.lineTo(last.x, last.y);
  g.stroke({ width, color, alpha, cap: "round", join: "round" });
}

export function drawSign(g: Graphics, textWidth: number, accent: number) {
  g.rect(-5, 10, 10, 48).fill(0x7b4c2e);
  g.roundRect(-textWidth / 2, -22, textWidth, 38, 10).fill(0xffe4a8).stroke({
    width: 3,
    color: accent,
    alpha: 0.56,
  });
  g.circle(-textWidth / 2 + 12, -3, 3).fill(0xf8f1d5);
  g.circle(textWidth / 2 - 12, -3, 3).fill(0xf8f1d5);
}
