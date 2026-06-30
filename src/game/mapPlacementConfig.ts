/**
 * [INPUT]: 依赖 mapPlacements 各区域数据 Module 和 RawMapPlacement 类型。
 * [OUTPUT]: 对外提供原有 placement 聚合 Interface：createRawV4PlacementGroups、placementRegionIds、rawPlacementsByLayer、allRawPlacements。
 * [POS]: game 的地图摆放兼容入口，被 v4MapAssets 消费；具体数据在 mapPlacements/ 内维护。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import {
  allRawPlacements,
  placementRegionIds,
  rawPlacementsByLayer,
  type RawPlacementGroups,
} from "./mapPlacements/path";
import { createGrowthPlacements } from "./mapPlacements/growth";
import { createMangrovePlacements, createPearlBayPlacements, createShellBayPlacements } from "./mapPlacements/home";
import { createMathArenaPlacements, createSunTownPlacements } from "./mapPlacements/honor";
import { createOldStreetPlacements } from "./mapPlacements/shop";

type V4MapAssetUrls = Record<string, string>;

export { allRawPlacements, placementRegionIds, rawPlacementsByLayer };
export type { RawPlacementGroups };

export function createRawV4PlacementGroups(assets: V4MapAssetUrls): RawPlacementGroups {
  return {
    "growth-plaza": createGrowthPlacements(assets),
    mangrove: createMangrovePlacements(assets),
    "shell-bay": createShellBayPlacements(assets),
    "pearl-bay": createPearlBayPlacements(assets),
    "sun-town": createSunTownPlacements(assets),
    "math-arena": createMathArenaPlacements(assets),
    "old-street": createOldStreetPlacements(assets),
  };
}
