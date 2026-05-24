import type { ChildProfile, IslandSlot, VirtueCategory } from "../types";
import { virtueCategories } from "./spirits";

const names = [
  "安安", "贝贝", "晨晨", "朵朵", "恩恩", "帆帆", "果果", "禾禾", "佳佳", "可可",
  "乐乐", "萌萌", "年年", "晴晴", "然然", "森森", "甜甜", "文文", "希希", "阳阳",
  "舟舟", "米米", "西西", "悠悠", "石石", "宁宁", "星星", "小满", "一一", "鹿鹿",
  "豆豆", "乔乔", "沐沐", "岚岚", "团团",
];

const slotCoordinates = [
  [12, 28], [21, 22], [31, 28], [41, 21], [53, 25], [65, 20], [76, 28], [87, 24],
  [14, 44], [24, 40], [34, 45], [45, 39], [55, 43], [66, 38], [77, 45], [88, 40],
  [10, 61], [20, 58], [30, 64], [40, 57], [50, 62], [60, 56], [70, 63], [82, 58],
  [15, 78], [26, 74], [37, 80], [48, 73], [59, 79], [70, 73], [81, 79], [90, 70],
  [47, 30], [52, 33], [57, 32], [44, 48], [52, 50], [60, 48], [43, 68], [58, 68],
];

export const islandSlots: IslandSlot[] = slotCoordinates.map(([x, y], index) => ({
  id: index + 1,
  x,
  y,
  zone: index >= 34 ? "数学竞技场" : index >= 31 ? "中央成长树" : virtueCategories[index % virtueCategories.length],
}));

export const initialChildren: ChildProfile[] = names.map((name, index) => ({
  id: `child-${String(index + 1).padStart(2, "0")}`,
  name,
  spiritId: String(index + 1).padStart(2, "0"),
  petName: `${name}的小伙伴`,
  slotId: index + 1,
}));

export const virtueZoneColors: Record<VirtueCategory, string> = {
  家国情怀: "#d95b4f",
  意志坚韧: "#8e6d45",
  积极阳光: "#e7a93c",
  勇毅有力: "#d9734f",
  激浊扬清: "#3e9f9b",
  开拓创新: "#5e77d1",
  尊矩守法: "#6c9a5d",
};

