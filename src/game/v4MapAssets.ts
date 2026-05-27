import type { HomeType, RegionId } from "./types";

import { mapSpread, spreadPoint } from "./mapLayout";

const base = "/assets/map/v4";

function asset(batch: string, fileName: string) {
  return encodeURI(`${base}/${batch}/${fileName}`);
}

export const v4MapAssets = {
  oceanBase: asset("batch11", "v4-ocean-base-tile.png"),
  oceanWaveOverlay: asset("batch11", "v4-ocean-wave-overlay.png"),
  islandShadow: asset("batch11", "v4-island-shadow-full.png"),
  islandSide: asset("batch11", "v4-island-side-full.png"),
  islandSurface: asset("batch11", "v4-island-surface-full.png"),
  shorelineFoam: asset("batch11", "v4-shoreline-foam-ring.png"),
  routeMainLoop: asset("batch11", "v4-route-main-loop.png"),
  routeShellBranch: asset("batch11", "v4-route-shell-branch.png"),
  routeStoneBranch: asset("batch11", "v4-route-stone-branch.png"),
  routeWoodBridgeNetwork: asset("batch11", "v4-route-wood-bridge-network.png"),
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
  const levelBoost = Math.min(24, Math.max(0, homeLevel - 1) * 8);
  if (type === "treehouse") return 158 + levelBoost;
  if (type === "cottage" || type === "garden") return 152 + levelBoost;
  if (type === "tent") return 150 + levelBoost;
  return 142 + levelBoost;
}

export function v4HomePadUrl(regionId: RegionId) {
  if (regionId === "shell-bay") return asset("batch15", "batch15-002-home-pad-shell-sand.png");
  if (regionId === "pearl-bay") return asset("batch15", "batch15-005-home-pad-pearl-float.png");
  if (regionId === "mangrove") return asset("batch15", "batch15-004-home-pad-mangrove-deck.png");
  if (regionId === "sun-town" || regionId === "old-street") return asset("batch15", "batch15-003-home-pad-town-stone.png");
  return asset("batch15", "batch15-001-home-pad-grass.png");
}

export interface V4Placement {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  alpha?: number;
  rotation?: number;
  interactive?: "pk" | "dialogue";
}

function spreadPlacement(placement: V4Placement, widthScale = 1): V4Placement {
  const point = spreadPoint({ x: placement.x, y: placement.y });
  return {
    ...placement,
    x: point.x,
    y: point.y,
    width: placement.width * widthScale,
  };
}

const baseV4PathPlacements: V4Placement[] = [
  { id: "route-main-loop", url: v4MapAssets.routeMainLoop, x: 1210, y: 823, width: 1275 },
  { id: "route-shell-branch", url: v4MapAssets.routeShellBranch, x: 660, y: 1055, width: 530 },
  { id: "route-stone-branch", url: v4MapAssets.routeStoneBranch, x: 1668, y: 715, width: 560 },
  { id: "route-wood-bridge-network", url: v4MapAssets.routeWoodBridgeNetwork, x: 640, y: 605, width: 610 },
  { id: "cliff-stair-large", url: v4MapAssets.cliffStairLarge, x: 2075, y: 925, width: 285 },
  { id: "road-y-old-street", url: v4MapAssets.roadJunctionY, x: 1070, y: 540, width: 150, rotation: -0.08 },
  { id: "road-t-arena", url: v4MapAssets.roadJunctionT, x: 1235, y: 1046, width: 170 },
  { id: "road-shell-short", url: v4MapAssets.roadShellShort, x: 455, y: 1116, width: 128, rotation: -0.3 },
  { id: "road-stone-short-a", url: v4MapAssets.roadStoneShort, x: 1560, y: 965, width: 118, rotation: 0.25 },
  { id: "bridge-left", url: v4MapAssets.bridgeLeft, x: 520, y: 585, width: 155, rotation: -0.2 },
  { id: "bridge-right", url: v4MapAssets.bridgeRight, x: 780, y: 610, width: 155, rotation: 0.18 },
];

export const v4PathPlacements: V4Placement[] = baseV4PathPlacements.map((placement) => spreadPlacement(placement, mapSpread.path));

const baseV4LandmarkPlacements: V4Placement[] = [
  { id: "growth-tree-ring", url: v4MapAssets.growthTreeRing, x: 1210, y: 805, width: 520, alpha: 0.96 },
  { id: "growth-tree-large", url: v4MapAssets.growthTreeLarge, x: 1210, y: 652, width: 390 },
  { id: "home-selection-plaza", url: v4MapAssets.homeSelectionPlaza, x: 1035, y: 800, width: 250, alpha: 0.92 },
  { id: "math-arena-building", url: v4MapAssets.mathArenaBuilding, x: 1245, y: 1120, width: 470, interactive: "pk" },
  { id: "math-pk-gate", url: v4MapAssets.mathPkGate, x: 1464, y: 1048, width: 185, interactive: "pk" },
  { id: "leaderboard-stage", url: v4MapAssets.leaderboardStage, x: 1458, y: 1225, width: 245 },
  { id: "old-street-arch", url: v4MapAssets.oldStreetArch, x: 895, y: 425, width: 245, interactive: "dialogue" },
  { id: "old-street-shop-row", url: v4MapAssets.oldStreetShopRow, x: 1168, y: 412, width: 405 },
  { id: "dialogue-pavilion", url: v4MapAssets.dialoguePavilion, x: 1415, y: 500, width: 240, interactive: "dialogue" },
  { id: "asr-corner", url: v4MapAssets.asrRecordingCorner, x: 980, y: 565, width: 205, interactive: "dialogue" },
  { id: "teacher-review-kiosk", url: v4MapAssets.teacherReviewKiosk, x: 1518, y: 748, width: 225, interactive: "dialogue" },
  { id: "task-board", url: v4MapAssets.taskBoard, x: 1342, y: 542, width: 205, interactive: "dialogue" },
  { id: "mangrove-waterwalk", url: v4MapAssets.mangroveWaterwalk, x: 690, y: 710, width: 330 },
  { id: "seaside-pier", url: v4MapAssets.seasidePier, x: 365, y: 1208, width: 310 },
  { id: "silver-beach-corner", url: v4MapAssets.silverBeachCorner, x: 275, y: 1035, width: 250 },
  { id: "lighthouse-small", url: v4MapAssets.lighthouseSmall, x: 2030, y: 650, width: 175 },
  { id: "small-fishing-boat", url: v4MapAssets.smallFishingBoat, x: 245, y: 1328, width: 165 },
  { id: "arcade-lantern-row", url: v4MapAssets.arcadeLanternRow, x: 1118, y: 520, width: 260 },
];

export const v4LandmarkPlacements: V4Placement[] = baseV4LandmarkPlacements.map((placement) =>
  spreadPlacement(placement, mapSpread.landmark),
);

const baseV4DecorPlacements: V4Placement[] = [
  { id: "pk-glow", url: v4MapAssets.pkGlow, x: 1245, y: 1120, width: 290, alpha: 0.68, interactive: "pk" },
  { id: "asr-glow", url: v4MapAssets.asrGlow, x: 980, y: 565, width: 145, alpha: 0.55, interactive: "dialogue" },
  { id: "review-glow", url: v4MapAssets.reviewGlow, x: 1518, y: 748, width: 165, alpha: 0.5, interactive: "dialogue" },
  { id: "task-glow", url: v4MapAssets.taskGlow, x: 1342, y: 542, width: 160, alpha: 0.46, interactive: "dialogue" },
  { id: "edge-grass-a", url: v4MapAssets.edgeGrass, x: 338, y: 760, width: 88 },
  { id: "edge-grass-b", url: v4MapAssets.edgeGrass, x: 2074, y: 895, width: 82, rotation: 0.2 },
  { id: "edge-flower-a", url: v4MapAssets.edgeFlower, x: 488, y: 1142, width: 105 },
  { id: "edge-flower-b", url: v4MapAssets.edgeFlower, x: 1868, y: 1242, width: 115 },
  { id: "edge-shell-a", url: v4MapAssets.edgeShell, x: 540, y: 1190, width: 84 },
  { id: "edge-shell-b", url: v4MapAssets.edgeShell, x: 760, y: 912, width: 76, rotation: 0.2 },
  { id: "edge-rock-a", url: v4MapAssets.edgeRock, x: 1605, y: 410, width: 84 },
  { id: "edge-rock-b", url: v4MapAssets.edgeRock, x: 835, y: 822, width: 74 },
  { id: "reed-cluster-a", url: v4MapAssets.reedCluster, x: 1536, y: 665, width: 92 },
  { id: "reed-cluster-b", url: v4MapAssets.reedCluster, x: 1958, y: 725, width: 84, rotation: -0.2 },
  { id: "edge-bush-a", url: v4MapAssets.edgeBush, x: 432, y: 708, width: 92 },
  { id: "edge-bush-b", url: v4MapAssets.edgeBush, x: 1750, y: 882, width: 104 },
  { id: "area-arch-shell", url: v4MapAssets.areaArchBlank, x: 530, y: 840, width: 132 },
  { id: "area-arch-town", url: v4MapAssets.areaArchBlank, x: 1780, y: 855, width: 132 },
];

export const v4DecorPlacements: V4Placement[] = baseV4DecorPlacements.map((placement) => spreadPlacement(placement));
