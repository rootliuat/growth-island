import { getSpiritAsset } from "../domain/spiritAssets";
import type { ChildWithProgress, LedgerRecord, SpiritDefinition } from "../types";
import { getHomeSlot } from "./homeConfig";
import type { SpiritMood, WorldHome, WorldMapData, WorldSpirit } from "./types";

function toColor(hex: string | undefined, fallback = 0x6ebf8b) {
  if (!hex) return fallback;
  return Number.parseInt(hex.replace("#", ""), 16);
}

function moodFor(child: ChildWithProgress, lastRecord?: LedgerRecord): SpiritMood {
  if (lastRecord?.childId === child.id && lastRecord.delta < 0) return "sad";
  if (child.rank <= 3) return "proud";
  if (lastRecord?.childId === child.id && lastRecord.delta > 0) return "happy";
  if (child.xp === 0) return "sleepy";
  return "normal";
}

export function buildWorldMapData({
  childrenWithProgress,
  spiritsById,
  selectedChildId,
  recentLedger,
}: {
  childrenWithProgress: ChildWithProgress[];
  spiritsById: Map<string, SpiritDefinition>;
  selectedChildId: string;
  recentLedger: LedgerRecord[];
}): WorldMapData {
  const lastLedger = recentLedger.find((record) => !record.undone && record.source !== "undo");
  const homes: WorldHome[] = [];
  const spirits: WorldSpirit[] = childrenWithProgress.map((child, index) => {
    const slot = getHomeSlot(index);
    const spirit = spiritsById.get(child.spiritId) ?? {
      id: child.spiritId,
      name: "成长精灵",
      slug: child.spiritId,
      type: "spirit",
      palette: "cream, jade, gold",
      concept: "成长岛伙伴",
      accent: "#6ebf8b",
    };
    const accent = toColor(spirit.accent);
    const homeLevel = Math.max(1, Math.min(5, Math.ceil(child.level / 2)));
    const childLastRecord = recentLedger.find((record) => record.childId === child.id && !record.undone);
    const doorPosition = {
      x: slot.position.x + slot.doorOffset.x,
      y: slot.position.y + slot.doorOffset.y,
    };
    const asset = getSpiritAsset(spirit, child.state);
    const home: WorldHome = {
      id: slot.id,
      childId: child.id,
      regionId: slot.regionId,
      type: slot.type,
      level: homeLevel,
      position: slot.position,
      doorPosition,
      accent,
    };
    homes.push(home);

    return {
      id: child.id,
      child,
      spirit,
      regionId: slot.regionId,
      homeId: slot.id,
      homeType: slot.type,
      homeLevel,
      homePosition: slot.position,
      spritePosition: { x: doorPosition.x + 20, y: doorPosition.y + 22 },
      mood: moodFor(child, lastLedger),
      accent,
      imageUrl: asset?.url,
      imageKey: asset?.key,
      lastActivity: childLastRecord?.reason,
      lastActivityDelta: childLastRecord?.delta,
    };
  });

  return {
    spirits,
    homes,
    selectedChildId,
    lastLedger,
  };
}
