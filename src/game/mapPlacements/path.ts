/**
 * [INPUT]: 依赖 mapAssetPlacement 的 layer 类型和 RegionId。
 * [OUTPUT]: 对外提供 placement 区域顺序与按 layer 展平工具。
 * [POS]: game/mapPlacements 的路径/遍历 Module，被 mapPlacementConfig 聚合。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { MapSceneLayer, RawMapPlacement } from "../mapAssetPlacement";
import type { RegionId } from "../types";

export const placementRegionIds = [
  "growth-plaza",
  "mangrove",
  "shell-bay",
  "pearl-bay",
  "sun-town",
  "math-arena",
  "old-street",
] as const satisfies readonly RegionId[];

export type RawPlacementGroups = Record<RegionId, RawMapPlacement[]>;

export function rawPlacementsByLayer(groups: RawPlacementGroups, layer: MapSceneLayer) {
  return placementRegionIds.flatMap((regionId) => groups[regionId].filter((placement) => placement.layer === layer));
}

export function allRawPlacements(groups: RawPlacementGroups) {
  return placementRegionIds.flatMap((regionId) => groups[regionId]);
}
