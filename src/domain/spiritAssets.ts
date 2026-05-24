import type { SpiritDefinition, SpiritState } from "../types";

type SpiritAssetModuleMap = Record<string, string>;

const imageModules = import.meta.glob("../../assets/generated/spirits/*/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as SpiritAssetModuleMap;

const assetUrls = new Map<string, string>();

Object.entries(imageModules).forEach(([path, url]) => {
  const match = path.match(/\/spirits\/(\d{2})-[^/]+\/(egg-[1-4]|lv[2-8])\.png$/);
  if (!match) return;
  assetUrls.set(`${match[1]}:${match[2]}`, url);
});

const stateFallbacks: Record<SpiritState, SpiritState[]> = {
  "egg-1": ["egg-1", "egg-4"],
  "egg-2": ["egg-1", "egg-4"],
  "egg-3": ["egg-4", "egg-1"],
  "egg-4": ["egg-4", "egg-1"],
  lv2: ["lv2", "lv8"],
  lv3: ["lv2", "lv8"],
  lv4: ["lv2", "lv8"],
  lv5: ["lv2", "lv8"],
  lv6: ["lv8", "lv2"],
  lv7: ["lv8", "lv2"],
  lv8: ["lv8", "lv2"],
};

export interface SpiritAsset {
  key: string;
  resolvedState: SpiritState;
  url: string;
}

export function getSpiritAsset(spirit: SpiritDefinition, state: SpiritState): SpiritAsset | undefined {
  for (const candidate of stateFallbacks[state]) {
    const url = assetUrls.get(`${spirit.id}:${candidate}`);
    if (url) {
      return {
        key: `spirit-${spirit.id}-${candidate}`,
        resolvedState: candidate,
        url,
      };
    }
  }

  return undefined;
}
