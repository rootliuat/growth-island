import type { SpiritDefinition, SpiritState } from "../types";

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
  return getSpiritThumbnailAsset(spirit, state);
}

export function getSpiritThumbnailAsset(spirit: SpiritDefinition, state: SpiritState): SpiritAsset {
  const candidate = stateFallbacks[state][0];
  const key = `${spirit.id}:${candidate}`;
  return {
    key: `spirit-thumb-${key}`,
    resolvedState: candidate,
    url: `/assets/spirits/thumbs/${spirit.id}/${candidate}.webp`,
  };
}

export async function loadSpiritAsset(spirit: SpiritDefinition, state: SpiritState) {
  void spirit;
  void state;
  return false;
}
