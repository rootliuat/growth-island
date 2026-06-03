import { getChildEnergyLabel, getChildEnergyColor } from "../domain/virtueEnergy";
import type { VirtueCategory } from "../types";
import type { RegionId } from "./types";

export const virtueRegionMap: Record<VirtueCategory, RegionId> = {
  家国情怀: "old-street",
  意志坚韧: "mangrove",
  积极阳光: "growth-plaza",
  勇毅有力: "math-arena",
  激浊扬清: "shell-bay",
  开拓创新: "pearl-bay",
  尊矩守法: "sun-town",
};

export function getVirtueRegionId(category?: VirtueCategory) {
  return category ? virtueRegionMap[category] : undefined;
}

export function getVirtueRegionLabel(category: VirtueCategory) {
  return getChildEnergyLabel(category);
}

export function getVirtueRegionColor(category: VirtueCategory) {
  return Number.parseInt(getChildEnergyColor(category).replace("#", ""), 16);
}
