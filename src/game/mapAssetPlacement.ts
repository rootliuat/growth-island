import type { RegionId } from "./types";
import { spreadPoint } from "./mapLayout";

export type MapSceneLayer = "path" | "landmark" | "decoration";
export type MapSceneInteraction = "pk" | "dialogue";

export interface PlacementAnchor {
  x: number;
  y: number;
}

export interface PlacementCollision {
  widthRatio?: number;
  heightRatio?: number;
  offsetXRatio?: number;
  offsetYRatio?: number;
}

export interface RawMapPlacement {
  id: string;
  url: string;
  regionId: RegionId;
  layer: MapSceneLayer;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  scale?: number;
  alpha?: number;
  rotation?: number;
  anchor?: PlacementAnchor;
  collision?: PlacementCollision;
  interactive?: MapSceneInteraction;
}

export interface MapPlacement extends Omit<RawMapPlacement, "x" | "y" | "width"> {
  x: number;
  y: number;
  width: number;
}

export function materializeMapPlacement(placement: RawMapPlacement, widthScale = 1): MapPlacement {
  const point = spreadPoint({ x: placement.x, y: placement.y });
  return {
    ...placement,
    x: point.x,
    y: point.y,
    width: placement.width * widthScale * (placement.scale ?? 1),
  };
}

export function compareMapPlacements(a: MapPlacement, b: MapPlacement) {
  if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
  return a.y - b.y;
}
