import type { SpiritDefinition, SpiritState } from "../types";

type SpiritAssetLoaderMap = Record<string, () => Promise<string>>;

const imageModules = import.meta.glob("../../assets/generated/spirits/*/*.png", {
  query: "?url",
  import: "default",
}) as SpiritAssetLoaderMap;

const assetUrls = new Map<string, string>();
const assetLoaders = new Map<string, () => Promise<string>>();
const pendingAssetLoads = new Map<string, Promise<string | undefined>>();

Object.entries(imageModules).forEach(([path, loader]) => {
  const match = path.match(/\/spirits\/(\d{2})-[^/]+\/(egg-[1-4]|lv[2-8])\.png$/);
  if (!match) return;
  assetLoaders.set(`${match[1]}:${match[2]}`, loader);
});

const stateFallbacks: Record<SpiritState, SpiritState[]> = {
  "egg-1": ["egg-1", "egg-4"],
  "egg-2": ["egg-2", "egg-1", "egg-4"],
  "egg-3": ["egg-3", "egg-4", "egg-1"],
  "egg-4": ["egg-4", "egg-1"],
  lv2: ["lv2", "lv8"],
  lv3: ["lv3", "lv2", "lv8"],
  lv4: ["lv4", "lv2", "lv8"],
  lv5: ["lv5", "lv2", "lv8"],
  lv6: ["lv6", "lv8", "lv2"],
  lv7: ["lv7", "lv8", "lv2"],
  lv8: ["lv8", "lv2"],
};

export interface SpiritAsset {
  key: string;
  resolvedState: SpiritState;
  url: string;
}

export function getSpiritAsset(spirit: SpiritDefinition, state: SpiritState): SpiritAsset | undefined {
  for (const candidate of stateFallbacks[state]) {
    const key = `${spirit.id}:${candidate}`;
    const url = assetUrls.get(key);
    if (url) {
      return {
        key: `spirit-${key}`,
        resolvedState: candidate,
        url,
      };
    }
  }

  return undefined;
}

export async function loadSpiritAsset(spirit: SpiritDefinition, state: SpiritState) {
  for (const candidate of stateFallbacks[state]) {
    const key = `${spirit.id}:${candidate}`;
    if (assetUrls.has(key)) return false;
    const loader = assetLoaders.get(key);
    if (!loader) continue;

    if (!pendingAssetLoads.has(key)) {
      pendingAssetLoads.set(
        key,
        loader()
          .then((url) => {
            assetUrls.set(key, url);
            return url;
          })
          .catch(() => undefined),
      );
    }

    const url = await pendingAssetLoads.get(key);
    return !!url;
  }

  return false;
}
