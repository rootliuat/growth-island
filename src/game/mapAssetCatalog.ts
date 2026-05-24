import type { HomeType, RegionId } from "./types";

export const transparentPngPlaceholder =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

export type MapAssetLayer =
  | "ocean"
  | "island"
  | "region"
  | "path"
  | "landmark"
  | "home"
  | "decoration"
  | "label"
  | "effect";

export interface MapAssetSize {
  width: number;
  height: number;
}

export interface MapAssetSlot {
  id: string;
  name: string;
  layer: MapAssetLayer;
  targetPath: string;
  placeholderUrl: string;
  recommendedSize: MapAssetSize;
  codeRefs: string[];
  notes?: string;
}

const placeholder = transparentPngPlaceholder;
const regions = ["growth-plaza", "mangrove", "shell-bay", "pearl-bay", "sun-town", "math-arena", "old-street"] as const;
const homeTypes = ["shell", "treehouse", "cottage", "pearl", "tent", "garden"] as const satisfies readonly HomeType[];
const homeLevels = [1, 3, 5, 8] as const;

const regionSize = (regionId: RegionId): MapAssetSize => {
  if (regionId === "math-arena") return { width: 820, height: 520 };
  if (regionId === "old-street") return { width: 780, height: 430 };
  if (regionId === "growth-plaza") return { width: 760, height: 560 };
  return { width: 840, height: 620 };
};

const homeSize = (homeType: HomeType): MapAssetSize => {
  if (homeType === "treehouse") return { width: 300, height: 320 };
  if (homeType === "garden") return { width: 300, height: 280 };
  if (homeType === "shell" || homeType === "tent" || homeType === "pearl") return { width: 260, height: 260 };
  return { width: 280, height: 260 };
};

const decorationDefinitions = [
  ["decor-tree-round", "圆树/果树", 180, 220, "tree"],
  ["decor-tree-cherry", "粉色花树", 220, 240, "new"],
  ["decor-mangrove", "红树林树", 220, 240, "mangrove"],
  ["decor-flower-patch", "花丛", 160, 120, "flower"],
  ["decor-bush", "灌木", 160, 120, "new"],
  ["decor-rock", "圆石", 120, 90, "rock"],
  ["decor-shell", "贝壳", 120, 90, "shell"],
  ["decor-scallop", "扇贝", 130, 100, "scallop"],
  ["decor-pearl", "珍珠泡泡", 120, 120, "pearl"],
  ["decor-flag", "小旗", 90, 140, "flag"],
  ["decor-lamp", "小灯", 90, 150, "lamp"],
  ["decor-sign", "路牌", 160, 120, "sign"],
  ["decor-bridge", "小桥", 260, 160, "bridge"],
  ["decor-dock", "小码头", 260, 190, "dock"],
  ["decor-fence-green", "绿色栅栏", 220, 90, "fence"],
  ["decor-fence-pink", "粉色栅栏", 220, 90, "new"],
  ["decor-mailbox", "邮箱", 100, 120, "mailbox"],
  ["decor-windmill", "小风车", 180, 220, "windmill"],
  ["decor-street-gate", "老街门楼", 300, 220, "street-gate"],
  ["decor-yard-table", "家园桌子", 180, 130, "new"],
  ["decor-shelf-stall", "展示架/矮柜", 240, 160, "new"],
  ["decor-stone-stairs", "草坡石阶", 240, 180, "new"],
] as const;

export const mapAssetCatalog = [
  {
    id: "ocean-base",
    name: "海水底图",
    layer: "ocean",
    targetPath: "/assets/map/ocean/ocean-base.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 512, height: 512 },
    codeRefs: ["src/game/pixi/OceanLayer.ts"],
    notes: "Tileable ocean PNG. No gradient painting in code.",
  },
  {
    id: "ocean-wave-tile",
    name: "水波纹理 tile",
    layer: "ocean",
    targetPath: "/assets/map/ocean/ocean-wave-tile.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 512, height: 512 },
    codeRefs: ["src/game/pixi/OceanLayer.ts"],
  },
  {
    id: "ocean-sparkle",
    name: "水面闪光泡泡",
    layer: "ocean",
    targetPath: "/assets/map/ocean/ocean-sparkle.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 128, height: 128 },
    codeRefs: ["src/game/pixi/OceanLayer.ts"],
  },
  {
    id: "island-shadow",
    name: "整岛投影",
    layer: "island",
    targetPath: "/assets/map/island/island-shadow.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 2400, height: 1600 },
    codeRefs: ["src/game/pixi/IslandLayer.ts"],
  },
  {
    id: "island-side",
    name: "整岛厚度侧面",
    layer: "island",
    targetPath: "/assets/map/island/island-side.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 2400, height: 1600 },
    codeRefs: ["src/game/pixi/IslandLayer.ts"],
  },
  {
    id: "island-surface",
    name: "整岛表面",
    layer: "island",
    targetPath: "/assets/map/island/island-surface.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 2400, height: 1600 },
    codeRefs: ["src/game/pixi/IslandLayer.ts"],
  },
  {
    id: "island-shore-foam",
    name: "岸线浅滩高光",
    layer: "island",
    targetPath: "/assets/map/island/island-shore-foam.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 2400, height: 1600 },
    codeRefs: ["src/game/pixi/IslandLayer.ts"],
  },
  ...regions.map((regionId) => ({
    id: `region-${regionId}`,
    name: `区域地形 ${regionId}`,
    layer: "region" as const,
    targetPath: `/assets/map/regions/region-${regionId}.png`,
    placeholderUrl: placeholder,
    recommendedSize: regionSize(regionId),
    codeRefs: ["src/game/pixi/RegionLayer.ts", "src/game/regionConfig.ts"],
  })),
  {
    id: "path-main-overlay",
    name: "全岛主路 overlay",
    layer: "path",
    targetPath: "/assets/map/paths/path-main-overlay.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 2400, height: 1600 },
    codeRefs: ["src/game/pixi/PathLayer.ts"],
  },
  ...(["dirt", "stone", "shell", "wood"] as const).map((kind) => ({
    id: `path-${kind}-segment`,
    name: `路径段 ${kind}`,
    layer: "path" as const,
    targetPath: `/assets/map/paths/path-${kind}-segment.png`,
    placeholderUrl: placeholder,
    recommendedSize: { width: 256, height: 128 },
    codeRefs: ["src/game/pixi/PathLayer.ts"],
  })),
  {
    id: "landmark-growth-tree",
    name: "成长树",
    layer: "landmark",
    targetPath: "/assets/map/landmarks/landmark-growth-tree.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 420, height: 520 },
    codeRefs: ["src/game/pixi/DecorationLayer.ts"],
  },
  {
    id: "landmark-math-arena",
    name: "数学竞技场建筑",
    layer: "landmark",
    targetPath: "/assets/map/landmarks/landmark-math-arena.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 680, height: 420 },
    codeRefs: ["src/game/pixi/DecorationLayer.ts"],
  },
  {
    id: "landmark-old-street-gate",
    name: "老街牌坊",
    layer: "landmark",
    targetPath: "/assets/map/landmarks/landmark-old-street-gate.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 420, height: 260 },
    codeRefs: ["src/game/pixi/DecorationLayer.ts"],
  },
  {
    id: "landmark-pearl-dock",
    name: "珍珠湾浮桥/码头",
    layer: "landmark",
    targetPath: "/assets/map/landmarks/landmark-pearl-dock.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 360, height: 220 },
    codeRefs: ["src/game/pixi/DecorationLayer.ts"],
  },
  {
    id: "landmark-shell-pier",
    name: "贝壳湾小码头",
    layer: "landmark",
    targetPath: "/assets/map/landmarks/landmark-shell-pier.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 340, height: 240 },
    codeRefs: ["src/game/pixi/DecorationLayer.ts"],
  },
  {
    id: "landmark-mangrove-bridge",
    name: "红树林木桥",
    layer: "landmark",
    targetPath: "/assets/map/landmarks/landmark-mangrove-bridge.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 360, height: 220 },
    codeRefs: ["src/game/pixi/DecorationLayer.ts"],
  },
  ...homeTypes.flatMap((homeType) =>
    homeLevels.map((level) => ({
      id: `home-${homeType}-lv${level}`,
      name: `小屋 ${homeType} Lv.${level}`,
      layer: "home" as const,
      targetPath: `/assets/map/homes/home-${homeType}-lv${level}.png`,
      placeholderUrl: placeholder,
      recommendedSize: homeSize(homeType),
      codeRefs: ["src/game/pixi/HomeLayer.ts", "src/game/homeConfig.ts"],
    })),
  ),
  {
    id: "home-ground-pad",
    name: "小屋地垫/小院",
    layer: "home",
    targetPath: "/assets/map/homes/home-ground-pad.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 300, height: 180 },
    codeRefs: ["src/game/pixi/HomeLayer.ts"],
  },
  {
    id: "home-selected-beacon",
    name: "选中小屋标记",
    layer: "home",
    targetPath: "/assets/map/homes/home-selected-beacon.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 160, height: 160 },
    codeRefs: ["src/game/pixi/HomeLayer.ts"],
  },
  ...decorationDefinitions.map(([id, name, width, height, kind]) => ({
    id,
    name,
    layer: "decoration" as const,
    targetPath: `/assets/map/decorations/${id}.png`,
    placeholderUrl: placeholder,
    recommendedSize: { width, height },
    codeRefs: ["src/game/pixi/DecorationLayer.ts", "src/game/decorationConfig.ts"],
    notes: `Decoration kind: ${kind}`,
  })),
  {
    id: "label-region-sign",
    name: "区域木牌底图",
    layer: "label",
    targetPath: "/assets/map/labels/label-region-sign.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 220, height: 90 },
    codeRefs: ["src/game/pixi/LabelLayer.ts", "src/game/pixi/RegionLayer.ts"],
  },
  {
    id: "label-growth-bubble",
    name: "最近成长气泡底图",
    layer: "label",
    targetPath: "/assets/map/labels/label-growth-bubble.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 260, height: 120 },
    codeRefs: ["src/game/pixi/LabelLayer.ts"],
  },
  {
    id: "label-level-badge",
    name: "等级徽章",
    layer: "label",
    targetPath: "/assets/map/labels/label-level-badge.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 96, height: 96 },
    codeRefs: ["src/game/pixi/SpiritLayer.ts", "src/game/pixi/HomeLayer.ts"],
  },
  {
    id: "effect-xp-orb",
    name: "XP 光点",
    layer: "effect",
    targetPath: "/assets/map/effects/effect-xp-orb.png",
    placeholderUrl: placeholder,
    recommendedSize: { width: 64, height: 64 },
    codeRefs: ["src/game/pixi/EffectLayer.ts", "src/game/pixi/XpParticleSystem.ts"],
  },
] as const satisfies readonly MapAssetSlot[];

export type MapAssetId = (typeof mapAssetCatalog)[number]["id"];

export const mapAssetLookup = new Map<string, MapAssetSlot>(mapAssetCatalog.map((slot) => [slot.id, slot]));

export function getMapAssetSlot(id: MapAssetId | string) {
  const slot = mapAssetLookup.get(id);
  if (!slot) throw new Error(`Missing map asset slot: ${id}`);
  return slot;
}

export function getMapAssetUrl(id: MapAssetId | string) {
  const slot = getMapAssetSlot(id);
  return slot.targetPath || slot.placeholderUrl;
}
