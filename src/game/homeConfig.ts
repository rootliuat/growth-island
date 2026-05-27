import type { HomeSlot } from "./types";
import { spreadPoint } from "./mapLayout";

const baseHomeSlots: HomeSlot[] = [
  { id: "home-01", regionId: "mangrove", type: "treehouse", position: { x: 430, y: 470 }, doorOffset: { x: 10, y: 62 } },
  { id: "home-02", regionId: "mangrove", type: "treehouse", position: { x: 590, y: 405 }, doorOffset: { x: 4, y: 66 } },
  { id: "home-03", regionId: "mangrove", type: "cottage", position: { x: 750, y: 492 }, doorOffset: { x: 10, y: 58 } },
  { id: "home-04", regionId: "mangrove", type: "treehouse", position: { x: 490, y: 642 }, doorOffset: { x: 8, y: 64 } },
  { id: "home-05", regionId: "mangrove", type: "garden", position: { x: 720, y: 680 }, doorOffset: { x: 12, y: 58 } },
  { id: "home-06", regionId: "mangrove", type: "treehouse", position: { x: 895, y: 600 }, doorOffset: { x: 6, y: 64 } },

  { id: "home-07", regionId: "shell-bay", type: "shell", position: { x: 395, y: 930 }, doorOffset: { x: 12, y: 62 } },
  { id: "home-08", regionId: "shell-bay", type: "tent", position: { x: 540, y: 1080 }, doorOffset: { x: 10, y: 55 } },
  { id: "home-09", regionId: "shell-bay", type: "shell", position: { x: 690, y: 952 }, doorOffset: { x: 8, y: 60 } },
  { id: "home-10", regionId: "shell-bay", type: "cottage", position: { x: 838, y: 1102 }, doorOffset: { x: 12, y: 58 } },
  { id: "home-11", regionId: "shell-bay", type: "shell", position: { x: 310, y: 1082 }, doorOffset: { x: 16, y: 60 } },
  { id: "home-12", regionId: "shell-bay", type: "tent", position: { x: 740, y: 1196 }, doorOffset: { x: 8, y: 54 } },

  { id: "home-13", regionId: "pearl-bay", type: "pearl", position: { x: 1545, y: 435 }, doorOffset: { x: 10, y: 60 } },
  { id: "home-14", regionId: "pearl-bay", type: "pearl", position: { x: 1725, y: 460 }, doorOffset: { x: 8, y: 62 } },
  { id: "home-15", regionId: "pearl-bay", type: "cottage", position: { x: 1888, y: 560 }, doorOffset: { x: 10, y: 58 } },
  { id: "home-16", regionId: "pearl-bay", type: "pearl", position: { x: 1570, y: 688 }, doorOffset: { x: 8, y: 60 } },
  { id: "home-17", regionId: "pearl-bay", type: "garden", position: { x: 1760, y: 735 }, doorOffset: { x: 12, y: 58 } },
  { id: "home-18", regionId: "pearl-bay", type: "pearl", position: { x: 1990, y: 705 }, doorOffset: { x: 10, y: 58 } },

  { id: "home-19", regionId: "sun-town", type: "cottage", position: { x: 1510, y: 920 }, doorOffset: { x: 12, y: 58 } },
  { id: "home-20", regionId: "sun-town", type: "garden", position: { x: 1680, y: 888 }, doorOffset: { x: 10, y: 60 } },
  { id: "home-21", regionId: "sun-town", type: "cottage", position: { x: 1875, y: 930 }, doorOffset: { x: 10, y: 58 } },
  { id: "home-22", regionId: "sun-town", type: "garden", position: { x: 1570, y: 1102 }, doorOffset: { x: 10, y: 58 } },
  { id: "home-23", regionId: "sun-town", type: "cottage", position: { x: 1765, y: 1115 }, doorOffset: { x: 12, y: 58 } },
  { id: "home-24", regionId: "sun-town", type: "tent", position: { x: 1955, y: 1065 }, doorOffset: { x: 8, y: 54 } },
  { id: "home-25", regionId: "sun-town", type: "garden", position: { x: 1888, y: 1210 }, doorOffset: { x: 10, y: 58 } },

  { id: "home-26", regionId: "old-street", type: "cottage", position: { x: 845, y: 360 }, doorOffset: { x: 10, y: 60 } },
  { id: "home-27", regionId: "old-street", type: "garden", position: { x: 1000, y: 324 }, doorOffset: { x: 10, y: 58 } },
  { id: "home-28", regionId: "old-street", type: "cottage", position: { x: 1180, y: 338 }, doorOffset: { x: 12, y: 58 } },
  { id: "home-29", regionId: "old-street", type: "tent", position: { x: 1328, y: 455 }, doorOffset: { x: 8, y: 54 } },
  { id: "home-30", regionId: "old-street", type: "cottage", position: { x: 980, y: 530 }, doorOffset: { x: 10, y: 58 } },

  { id: "home-31", regionId: "math-arena", type: "pearl", position: { x: 970, y: 1160 }, doorOffset: { x: 8, y: 58 } },
  { id: "home-32", regionId: "math-arena", type: "cottage", position: { x: 1115, y: 1280 }, doorOffset: { x: 10, y: 58 } },
  { id: "home-33", regionId: "math-arena", type: "garden", position: { x: 1320, y: 1300 }, doorOffset: { x: 10, y: 58 } },
  { id: "home-34", regionId: "math-arena", type: "tent", position: { x: 1518, y: 1215 }, doorOffset: { x: 8, y: 54 } },
  { id: "home-35", regionId: "math-arena", type: "pearl", position: { x: 1380, y: 1110 }, doorOffset: { x: 10, y: 60 } },
];

export const homeSlots: HomeSlot[] = baseHomeSlots.map((slot) => ({
  ...slot,
  position: spreadPoint(slot.position),
}));

export function getHomeSlot(index: number) {
  return homeSlots[index % homeSlots.length];
}
