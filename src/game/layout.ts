/**
 * [INPUT]: 依赖精灵资产、成长能量规则、家园槽位与课堂孩子/账本数据。
 * [OUTPUT]: 对外提供 buildWorldMapData，将课堂读模型投影为 Pixi 世界数据。
 * [POS]: game 的地图布局 Adapter，连接 domain 进度与 pixi WorldScene。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { getSpiritAsset } from "../domain/spiritAssets";
import { formatSignedXp } from "../domain/virtueEnergy";
import type { ChildWithProgress, LedgerRecord, SpiritDefinition } from "../types";
import { getHomeSlot } from "./homeConfig";
import type { RegionId, SpiritMood, VirtueRegionEnergy, WorldHome, WorldMapData, WorldSpirit } from "./types";
import { getVirtueRegionColor, getVirtueRegionId, getVirtueRegionLabel } from "./virtueRegions";

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

function isMapActivityRecord(record: LedgerRecord) {
  return !record.undone && record.source !== "undo" && !record.reason.startsWith("演示数据");
}

function buildRegionEnergy(selectedChildId: string, recentLedger: LedgerRecord[]): VirtueRegionEnergy[] {
  const selectedPositiveRecords = recentLedger.filter(
    (record) => record.childId === selectedChildId && record.delta > 0 && record.category && isMapActivityRecord(record),
  );
  const currentRecord = selectedPositiveRecords[0];
  const energyByRegion = new Map<RegionId, VirtueRegionEnergy>();

  selectedPositiveRecords.slice(0, 14).forEach((record) => {
    if (!record.category) return;
    const regionId = getVirtueRegionId(record.category);
    if (!regionId) return;
    const existing = energyByRegion.get(regionId);
    const label = getVirtueRegionLabel(record.category);
    const current = currentRecord?.id === record.id;
    if (existing) {
      existing.totalDelta += record.delta;
      existing.count += 1;
      existing.current = existing.current || current;
      existing.displayText = existing.current ? `${existing.label} ${formatSignedXp(existing.totalDelta)}` : existing.label;
      return;
    }
    energyByRegion.set(regionId, {
      regionId,
      category: record.category,
      label,
      displayText: current ? `${label} ${formatSignedXp(record.delta)}` : label,
      color: getVirtueRegionColor(record.category),
      totalDelta: record.delta,
      count: 1,
      current,
    });
  });

  return [...energyByRegion.values()];
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
  const lastLedger = recentLedger.find(isMapActivityRecord);
  const regionEnergy = buildRegionEnergy(selectedChildId, recentLedger);
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
    const childLastRecord = recentLedger.find((record) => record.childId === child.id && isMapActivityRecord(record));
    const doorPosition = {
      x: slot.position.x + slot.doorOffset.x,
      y: slot.position.y + slot.doorOffset.y,
    };
    const asset = getSpiritAsset(spirit, child.state);
    const home: WorldHome = {
      id: slot.id,
      childId: child.id,
      petName: child.petName,
      childName: child.name,
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
      doorPosition,
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
    regionEnergy,
    lastLedger,
  };
}
