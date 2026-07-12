import type { HomeType, RegionId } from "./types";

import { getHomeArtworkWidth } from "./assetScaleRules";
import {
  compareMapPlacements,
  materializeMapPlacement,
  type MapPlacement,
  type RawMapPlacement,
} from "./mapAssetPlacement";
import { mapSpread } from "./mapLayout";
import {
  allRawPlacements,
  createRawV4PlacementGroups,
  placementRegionIds,
  rawPlacementsByLayer,
} from "./mapPlacementConfig";

const base = "/assets/map/v4-runtime";
const hidpiBase = "/assets/map/v4-runtime-hidpi";

function assetFrom(root: string, batch: string, fileName: string) {
  return encodeURI(`${root}/${batch}/${fileName.replace(/\.png$/i, ".webp")}`);
}

function asset(batch: string, fileName: string) {
  return assetFrom(base, batch, fileName);
}

function hidpiAsset(batch: string, fileName: string) {
  return assetFrom(hidpiBase, batch, fileName);
}

function p15Prop(fileName: string) {
  return encodeURI(`/assets/map/3d-props/p15/${fileName}`);
}

function p16Prop(fileName: string) {
  return encodeURI(`/assets/map/3d-props/p16/${fileName}`);
}

export const v4MapAssets = {
  oceanBase: asset("batch11", "v4-ocean-base-tile.png"),
  oceanWaveOverlay: asset("batch11", "v4-ocean-wave-overlay.png"),
  islandShadow: hidpiAsset("batch11", "v4-island-shadow-full.png"),
  islandSide: hidpiAsset("batch11", "v4-island-side-full.png"),
  islandSurface: hidpiAsset("batch11", "v4-island-surface-full.png"),
  shorelineFoam: hidpiAsset("batch11", "v4-shoreline-foam-ring.png"),
  routeMainLoop: hidpiAsset("batch11", "v4-route-main-loop.png"),
  routeShellBranch: hidpiAsset("batch11", "v4-route-shell-branch.png"),
  routeStoneBranch: hidpiAsset("batch11", "v4-route-stone-branch.png"),
  routeWoodBridgeNetwork: hidpiAsset("batch11", "v4-route-wood-bridge-network.png"),
  cliffStairLarge: asset("batch11", "v4-cliff-stair-large.png"),
  growthTreeRing: asset("batch12", "v4-landmark-growth-tree-ring.png"),
  growthTreeLarge: asset("batch12", "v4-landmark-growth-tree-large.png"),
  mathArenaBuilding: asset("batch12", "v4-landmark-math-arena-building.png"),
  mathPkGate: asset("batch12", "v4-landmark-math-pk-gate.png"),
  oldStreetArch: asset("batch12", "v4-landmark-old-street-arch.png"),
  oldStreetShopRow: asset("batch12", "v4-landmark-old-street-shop-row.png"),
  dialoguePavilion: asset("batch12", "v4-landmark-dialogue-pavilion.png"),
  asrRecordingCorner: asset("batch12", "v4-landmark-asr-recording-corner.png"),
  teacherReviewKiosk: asset("batch12", "v4-landmark-teacher-review-kiosk.png"),
  taskBoard: asset("batch12", "v4-landmark-task-board.png"),
  leaderboardStage: asset("batch12", "v4-landmark-leaderboard-stage.png"),
  homeSelectionPlaza: asset("batch12", "v4-landmark-home-selection-plaza.png"),
  mangroveWaterwalk: asset("batch12", "v4-local-mangrove-waterwalk.png"),
  seasidePier: asset("batch12", "v4-local-seaside-pier.png"),
  silverBeachCorner: asset("batch12", "v4-local-silver-beach-corner.png"),
  lighthouseSmall: asset("batch12", "v4-local-lighthouse-small.png"),
  smallFishingBoat: asset("batch12", "v4-local-small-fishing-boat.png"),
  arcadeLanternRow: asset("batch12", "v4-local-arcade-lantern-row.png"),
  selectedRing: asset("batch14", "v4-effect-selected-ring-soft.png"),
  upgradeGlow: asset("batch14", "v4-effect-upgrade-glow.png"),
  xpOrbGold: asset("batch14", "v4-effect-xp-orb-gold.png"),
  regionSign: asset("batch14", "v4-label-region-sign-large.png"),
  speechBubble: asset("batch14", "v4-label-speech-bubble.png"),
  levelBadgeGold: asset("batch14", "v4-label-level-badge-gold.png"),
  spiritShadow: asset("batch15", "batch15-008-spirit-soft-shadow.png"),
  homeShadow: asset("batch15", "batch15-009-home-soft-shadow.png"),
  taskGlow: asset("batch15", "batch15-027-task-entry-glow.png"),
  pkGlow: asset("batch15", "batch15-028-pk-entry-glow.png"),
  asrGlow: asset("batch15", "batch15-029-asr-entry-glow.png"),
  reviewGlow: asset("batch15", "batch15-030-review-entry-glow.png"),
  roadStoneShort: asset("batch15", "batch15-010-road-stone-short.png"),
  roadShellShort: asset("batch15", "batch15-011-road-shell-short.png"),
  roadJunctionT: asset("batch15", "batch15-012-road-junction-t.png"),
  roadJunctionY: asset("batch15", "batch15-013-road-junction-y.png"),
  roadEnd: asset("batch15", "batch15-014-road-end-cap.png"),
  stairSmall: asset("batch15", "batch15-015-stair-small.png"),
  bridgeLeft: asset("batch15", "batch15-016-bridge-left-corner.png"),
  bridgeRight: asset("batch15", "batch15-017-bridge-right-corner.png"),
  bridgeEnd: asset("batch15", "batch15-018-bridge-end-cap.png"),
  rail: asset("batch15", "batch15-019-stair-side-rail.png"),
  edgeGrass: asset("batch15", "batch15-020-edge-grass-cluster.png"),
  edgeFlower: asset("batch15", "batch15-021-edge-flower-cluster.png"),
  edgeShell: asset("batch15", "batch15-022-edge-shell-cluster.png"),
  edgeRock: asset("batch15", "batch15-023-edge-rock-cluster.png"),
  reedCluster: asset("batch15", "batch15-024-reed-cluster.png"),
  edgeBush: asset("batch15", "batch15-025-edge-mini-bush.png"),
  areaArchBlank: asset("batch15", "batch15-026-area-arch-blank.png"),
  p15PropTree: p15Prop("p15-prop-tree.webp"),
  p15PropTreeFruit: p15Prop("p15-prop-tree-fruit.webp"),
  p15PropBush: p15Prop("p15-prop-bush.webp"),
  p15PropBushFruit: p15Prop("p15-prop-bush-fruit.webp"),
  p15PropGrass1: p15Prop("p15-prop-grass-1.webp"),
  p15PropGrass2: p15Prop("p15-prop-grass-2.webp"),
  p15PropRock1: p15Prop("p15-prop-rock-1.webp"),
  p15PropRock2: p15Prop("p15-prop-rock-2.webp"),
  p15PropPlantLarge: p15Prop("p15-prop-plant-large.webp"),
  p15PropPlantSmall: p15Prop("p15-prop-plant-small.webp"),
  p15PropBridgeSmall: p15Prop("p15-prop-bridge-small.webp"),
  p15PropBridgeModular: p15Prop("p15-prop-bridge-modular.webp"),
  p15PropFence1: p15Prop("p15-prop-fence-1.webp"),
  p15PropFenceCorner: p15Prop("p15-prop-fence-corner.webp"),
  p15PropFenceMiddle: p15Prop("p15-prop-fence-middle.webp"),
  p15PropDoor: p15Prop("p15-prop-door.webp"),
  p15PropStairsSmall: p15Prop("p15-prop-stairs-small.webp"),
  p15PropGoalFlag: p15Prop("p15-prop-goal-flag.webp"),
  p15PropChest: p15Prop("p15-prop-chest.webp"),
  p15PropCoin: p15Prop("p15-prop-coin.webp"),
  p15PropGemBlue: p15Prop("p15-prop-gem-blue.webp"),
  p15PropGemGreen: p15Prop("p15-prop-gem-green.webp"),
  p15PropGemPink: p15Prop("p15-prop-gem-pink.webp"),
  p15PropKey: p15Prop("p15-prop-key.webp"),
  p15PropStar: p15Prop("p15-prop-star.webp"),
  p16PropHouse1: p16Prop("p16-prop-house-1.webp"),
  p16PropHouse2: p16Prop("p16-prop-house-2.webp"),
  p16PropHouse3: p16Prop("p16-prop-house-3.webp"),
  p16PropHouse4: p16Prop("p16-prop-house-4.webp"),
  p16PropStable: p16Prop("p16-prop-stable.webp"),
  p16PropBellTower: p16Prop("p16-prop-bell-tower.webp"),
  p16PropMarketStand1: p16Prop("p16-prop-market-stand-1.webp"),
  p16PropMarketStand2: p16Prop("p16-prop-market-stand-2.webp"),
  p16PropCart: p16Prop("p16-prop-cart.webp"),
  p16PropGazebo: p16Prop("p16-prop-gazebo.webp"),
  p16PropBell: p16Prop("p16-prop-bell.webp"),
  p16PropBench1: p16Prop("p16-prop-bench-1.webp"),
  p16PropBench2: p16Prop("p16-prop-bench-2.webp"),
  p16PropFence: p16Prop("p16-prop-fence.webp"),
  p16PropStairs: p16Prop("p16-prop-stairs.webp"),
  p16PropBarrel: p16Prop("p16-prop-barrel.webp"),
  p16PropCrate: p16Prop("p16-prop-crate.webp"),
  p16PropBags: p16Prop("p16-prop-bags.webp"),
  p16PropBagOpen: p16Prop("p16-prop-bag-open.webp"),
  p16PropPackage1: p16Prop("p16-prop-package-1.webp"),
  p16PropPackage2: p16Prop("p16-prop-package-2.webp"),
  p16PropGrass3: p16Prop("p16-prop-grass-3.webp"),
  p16PropFruit: p16Prop("p16-prop-fruit.webp"),
  p16PropStarOutline: p16Prop("p16-prop-star-outline.webp"),
  p16PropHeart: p16Prop("p16-prop-heart.webp"),
  p16PropHeartOutline: p16Prop("p16-prop-heart-outline.webp"),
  p16PropRockPlatform1: p16Prop("p16-prop-rock-platform-1.webp"),
  p16PropRockPlatform2: p16Prop("p16-prop-rock-platform-2.webp"),
  p16PropRockPlatformLarge: p16Prop("p16-prop-rock-platform-large.webp"),
  p16PropTower: p16Prop("p16-prop-tower.webp"),
  p16PropStairsModularStart: p16Prop("p16-prop-stairs-modular-start.webp"),
};

export const v4RegionAssets: Record<RegionId, string> = {
  "growth-plaza": asset("batch11", "v4-region-growth-plaza-pad.png"),
  mangrove: asset("batch11", "v4-region-mangrove-pad.png"),
  "shell-bay": asset("batch11", "v4-region-shell-bay-pad.png"),
  "pearl-bay": asset("batch11", "v4-region-pearl-bay-pad.png"),
  "sun-town": asset("batch11", "v4-region-sun-town-pad.png"),
  "math-arena": asset("batch11", "v4-region-math-arena-pad.png"),
  "old-street": asset("batch11", "v4-region-old-street-pad.png"),
};

export const v4RegionAssetWidths: Record<RegionId, number> = {
  "growth-plaza": 735 * mapSpread.region,
  mangrove: 720 * mapSpread.region,
  "shell-bay": 805 * mapSpread.region,
  "pearl-bay": 760 * mapSpread.region,
  "sun-town": 820 * mapSpread.region,
  "math-arena": 670 * mapSpread.region,
  "old-street": 650 * mapSpread.region,
};

const homeAssetNames: Record<HomeType, string> = {
  shell: "shell",
  treehouse: "treehouse",
  cottage: "cottage",
  pearl: "pearl",
  tent: "tent",
  garden: "garden",
};

export function v4HomeAssetUrl(type: HomeType, homeLevel: number) {
  const artLevel = homeLevel <= 1 ? 1 : homeLevel === 2 ? 3 : homeLevel === 3 ? 5 : 8;
  return asset("batch13", `v4-home-${homeAssetNames[type]}-lv${artLevel}.png`);
}

export function v4HomeTargetWidth(type: HomeType, homeLevel: number) {
  return getHomeArtworkWidth(type, homeLevel);
}

export function v4HomePadUrl(regionId: RegionId) {
  if (regionId === "shell-bay") return asset("batch15", "batch15-002-home-pad-shell-sand.png");
  if (regionId === "pearl-bay") return asset("batch15", "batch15-005-home-pad-pearl-float.png");
  if (regionId === "mangrove") return asset("batch15", "batch15-004-home-pad-mangrove-deck.png");
  if (regionId === "sun-town" || regionId === "old-street") return asset("batch15", "batch15-003-home-pad-town-stone.png");
  return asset("batch15", "batch15-001-home-pad-grass.png");
}

export type V4Placement = MapPlacement;

function layerWidthScale(layer: RawMapPlacement["layer"]) {
  if (layer === "path") return mapSpread.path;
  if (layer === "landmark") return mapSpread.landmark;
  return 1;
}

function spreadPlacement(placement: RawMapPlacement): V4Placement {
  return materializeMapPlacement(placement, layerWidthScale(placement.layer));
}

const rawV4PlacementGroups = createRawV4PlacementGroups(v4MapAssets);

export const v4PlacementGroups: Record<RegionId, V4Placement[]> = placementRegionIds.reduce(
  (groups, regionId) => {
    groups[regionId] = rawV4PlacementGroups[regionId].map(spreadPlacement).sort(compareMapPlacements);
    return groups;
  },
  {} as Record<RegionId, V4Placement[]>,
);

export const v4PathPlacements: V4Placement[] = rawPlacementsByLayer(rawV4PlacementGroups, "path")
  .map(spreadPlacement)
  .sort(compareMapPlacements);

export const v4LandmarkPlacements: V4Placement[] = rawPlacementsByLayer(rawV4PlacementGroups, "landmark")
  .map(spreadPlacement)
  .sort(compareMapPlacements);

export const v4DecorPlacements: V4Placement[] = rawPlacementsByLayer(rawV4PlacementGroups, "decoration")
  .map(spreadPlacement)
  .sort(compareMapPlacements);

export const v4ScenePlacements: V4Placement[] = allRawPlacements(rawV4PlacementGroups)
  .map(spreadPlacement)
  .sort(compareMapPlacements);
