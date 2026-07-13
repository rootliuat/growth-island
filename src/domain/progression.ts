/**
 * [INPUT]: 依赖共享课堂/账本类型和稳定 operationId 输入。
 * [OUTPUT]: 对外提供 XP、等级、精灵阶段、账本规范化与本地账本记录创建规则。
 * [POS]: domain 的成长进度真相源，被 App、备份规则和各课堂模块消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { ChildProfile, ChildWithProgress, LedgerRecord, LedgerRecordInput, LedgerSource, SpiritState } from "../types";

export const levelThresholds = [
  { level: 1, minXp: 0, state: "egg-1" as SpiritState },
  { level: 2, minXp: 100, state: "lv2" as SpiritState },
  { level: 3, minXp: 250, state: "lv3" as SpiritState },
  { level: 4, minXp: 450, state: "lv4" as SpiritState },
  { level: 5, minXp: 700, state: "lv5" as SpiritState },
  { level: 6, minXp: 1000, state: "lv6" as SpiritState },
  { level: 7, minXp: 1400, state: "lv7" as SpiritState },
  { level: 8, minXp: 1900, state: "lv8" as SpiritState },
];

export const spiritStageLabels: Record<SpiritState, string> = {
  "egg-1": "完整蛋期",
  "egg-2": "微裂发光期",
  "egg-3": "壳内跃动期",
  "egg-4": "探头破壳期",
  lv2: "幼态伙伴",
  lv3: "亮彩成长期",
  lv4: "品德徽章期",
  lv5: "华丽进化期",
  lv6: "专属装备期",
  lv7: "环绕特效期",
  lv8: "成长守护者",
};

export function getSpiritStageLabel(state: SpiritState) {
  return spiritStageLabels[state];
}

export function getLevelInfo(xp: number) {
  if (xp < 25) return { level: 1, state: "egg-1" as SpiritState, nextXp: 25, progressLabel: "完整精灵蛋" };
  if (xp < 50) return { level: 1, state: "egg-2" as SpiritState, nextXp: 50, progressLabel: "蛋壳微微发亮" };
  if (xp < 75) return { level: 1, state: "egg-3" as SpiritState, nextXp: 75, progressLabel: "小伙伴在里面动了" };
  if (xp < 100) return { level: 1, state: "egg-4" as SpiritState, nextXp: 100, progressLabel: "马上要破壳了" };

  let current = levelThresholds[1];
  for (const threshold of levelThresholds) {
    if (xp >= threshold.minXp) current = threshold;
  }
  const next = levelThresholds.find((threshold) => threshold.minXp > xp);
  return {
    level: current.level,
    state: current.state,
    nextXp: next?.minXp ?? current.minXp,
    progressLabel: current.level === 8 ? "成长守护形态" : `距离 Lv.${current.level + 1}`,
  };
}

export function getXpForChild(childId: string, ledger: LedgerRecord[]) {
  return Math.max(
    0,
    ledger
      .filter((record) => record.childId === childId && !record.undone && record.source !== "undo")
      .reduce((sum, record) => sum + record.delta, 0),
  );
}

export function enrichChildren(children: ChildProfile[], ledger: LedgerRecord[]): ChildWithProgress[] {
  const withXp = children.map((child) => {
    const xp = getXpForChild(child.id, ledger);
    const info = getLevelInfo(xp);
    return { ...child, xp, level: info.level, state: info.state, rank: 0 };
  });
  const sorted = [...withXp].sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name, "zh-Hans-CN"));
  const ranks = new Map(sorted.map((child, index) => [child.id, index + 1]));
  return withXp.map((child) => ({ ...child, rank: ranks.get(child.id) ?? 1 }));
}

export function xpProgressPercent(xp: number) {
  const info = getLevelInfo(xp);
  if (info.level === 8) return 100;
  const currentMin = info.level === 1 ? (xp < 25 ? 0 : xp < 50 ? 25 : xp < 75 ? 50 : 75) : levelThresholds.find((item) => item.level === info.level)?.minXp ?? 0;
  return Math.round(((xp - currentMin) / (info.nextXp - currentMin)) * 100);
}

const ledgerSourceDefaults: Record<
  LedgerSource,
  Pick<LedgerRecord, "operatorRole" | "aiSuggested" | "reviewStatus">
> = {
  manual: { operatorRole: "teacher", aiSuggested: false, reviewStatus: "not_required" },
  "dialogue-agent": { operatorRole: "teacher", aiSuggested: true, reviewStatus: "approved" },
  "math-pk": { operatorRole: "system", aiSuggested: false, reviewStatus: "not_required" },
  undo: { operatorRole: "teacher", aiSuggested: false, reviewStatus: "not_required" },
};

export function normalizeLedgerInput(input: LedgerRecordInput): Omit<LedgerRecord, "id" | "createdAt"> {
  const { teacherAdjustedReview: _teacherAdjustedReview, ...recordInput } = input;
  const defaults = ledgerSourceDefaults[input.source];
  return {
    ...recordInput,
    operatorRole: input.operatorRole ?? defaults.operatorRole,
    aiSuggested: input.aiSuggested ?? defaults.aiSuggested,
    reviewStatus: input.reviewStatus ?? defaults.reviewStatus,
  };
}

export function normalizeLedgerRecord(record: LedgerRecord): LedgerRecord {
  const { id, createdAt, ...input } = record;
  return {
    ...normalizeLedgerInput(input),
    id,
    createdAt,
  };
}

export function makeLedgerRecord(input: LedgerRecordInput): LedgerRecord {
  return {
    ...normalizeLedgerInput(input),
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}
