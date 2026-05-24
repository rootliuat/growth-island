import type { WorldPoint } from "./types";

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1500;

export const growthTreePosition: WorldPoint = { x: 1210, y: 760 };

export const islandPolygon: WorldPoint[] = [
  { x: 205, y: 990 },
  { x: 154, y: 760 },
  { x: 284, y: 500 },
  { x: 572, y: 279 },
  { x: 978, y: 180 },
  { x: 1398, y: 208 },
  { x: 1775, y: 356 },
  { x: 2115, y: 620 },
  { x: 2210, y: 918 },
  { x: 2025, y: 1205 },
  { x: 1582, y: 1335 },
  { x: 1074, y: 1290 },
  { x: 637, y: 1215 },
  { x: 334, y: 1112 },
];

export const mainPath: WorldPoint[] = [
  { x: 502, y: 1058 },
  { x: 706, y: 938 },
  { x: 930, y: 844 },
  { x: 1210, y: 760 },
  { x: 1476, y: 630 },
  { x: 1695, y: 760 },
  { x: 1785, y: 1030 },
  { x: 1390, y: 1110 },
  { x: 910, y: 1055 },
];

export const oldStreetPath: WorldPoint[] = [
  { x: 835, y: 455 },
  { x: 1015, y: 410 },
  { x: 1235, y: 435 },
  { x: 1390, y: 535 },
];

export const pierPath: WorldPoint[] = [
  { x: 442, y: 1114 },
  { x: 352, y: 1218 },
  { x: 270, y: 1310 },
];

export const arenaPosition: WorldPoint = { x: 1240, y: 1160 };
export const oldStreetPosition: WorldPoint = { x: 1110, y: 430 };
