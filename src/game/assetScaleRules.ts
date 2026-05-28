import type { HomeType, WorldPoint } from "./types";

export const assetScaleRules = {
  island: {
    shadowBaseWidth: 2060,
    sideBaseWidth: 2060,
    surfaceBaseWidth: 2040,
    shorelineBaseWidth: 2085,
  },
  path: {
    mainLoopWidth: 1275,
    residentialBranchWidth: 530,
    bayBranchWidth: 560,
    bridgeNetworkWidth: 610,
    bridgeCornerWidth: 155,
  },
  landmark: {
    growthTreeRingWidth: 560,
    growthTreeWidth: 430,
    mathArenaWidth: 520,
    mathGateWidth: 190,
    oldStreetArchWidth: 245,
    oldStreetShopRowWidth: 405,
    communityBridgeWidth: 330,
  },
  decoration: {
    smallClusterWidth: 82,
    mediumClusterWidth: 92,
    largeClusterWidth: 108,
    signArchWidth: 132,
  },
  home: {
    selectedScale: 1.08,
    hoverScale: 1.035,
    padWidth: {
      shell: 142,
      treehouse: 156,
      cottage: 146,
      pearl: 142,
      tent: 142,
      garden: 150,
    } satisfies Record<HomeType, number>,
    artworkWidth: {
      shell: 150,
      treehouse: 168,
      cottage: 158,
      pearl: 150,
      tent: 150,
      garden: 162,
    } satisfies Record<HomeType, number>,
    levelWidthBoost: 7,
    maxLevelBoost: 24,
  },
  spirit: {
    eggTargetWidth: 80,
    companionTargetWidth: 104,
    shadowWidth: 86,
    overviewScale: 0.66,
    communityScale: 0.74,
    homeScale: 0.8,
    selectedCommunityScale: 1.12,
    selectedHomeScale: 1.3,
  },
  label: {
    regionSignShortWidth: 145,
    regionSignMediumWidth: 170,
    regionSignLongWidth: 198,
    levelBadgeRadius: 12,
    selectedNameOffset: { x: 92, y: -88 },
  },
  focus: {
    doorLandingOffset: { x: 16, y: -86 },
    arenaLandingOffset: { x: 0, y: 20 },
  },
};

export function getHomeArtworkWidth(type: HomeType, homeLevel: number) {
  const baseWidth = assetScaleRules.home.artworkWidth[type];
  const boost = Math.min(
    assetScaleRules.home.maxLevelBoost,
    Math.max(0, homeLevel - 1) * assetScaleRules.home.levelWidthBoost,
  );
  return baseWidth + boost;
}

export function getHomePadWidth(type: HomeType) {
  return assetScaleRules.home.padWidth[type];
}

export function getSpiritTargetWidth(state: string) {
  return state.startsWith("egg") ? assetScaleRules.spirit.eggTargetWidth : assetScaleRules.spirit.companionTargetWidth;
}

export function getRegionSignWidth(nameLength: number) {
  if (nameLength > 6) return assetScaleRules.label.regionSignLongWidth;
  if (nameLength > 4) return assetScaleRules.label.regionSignMediumWidth;
  return assetScaleRules.label.regionSignShortWidth;
}

export function getDoorFocusTarget(doorPosition: WorldPoint, zoom: number) {
  return {
    x: doorPosition.x + assetScaleRules.focus.doorLandingOffset.x,
    y: doorPosition.y + assetScaleRules.focus.doorLandingOffset.y,
    zoom,
  };
}
