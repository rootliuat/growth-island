import { virtueCategories } from "../data/spirits";
import type { LedgerRecord, VirtueCategory } from "../types";

export type LedgerTimeScope = "week" | "month" | "all";
export type LedgerCategoryFilter = VirtueCategory | "all";

export interface VirtueLedgerStat {
  category: VirtueCategory;
  recordCount: number;
  xpDelta: number;
  positiveXp: number;
  negativeXp: number;
}

export interface LedgerAnalyticsSummary {
  scope: LedgerTimeScope;
  recordCount: number;
  activeRecordCount: number;
  childCount: number;
  xpDelta: number;
  positiveXp: number;
  negativeXp: number;
  categoryStats: VirtueLedgerStat[];
}

const dayMs = 24 * 60 * 60 * 1000;

export const ledgerTimeScopeLabels: Record<LedgerTimeScope, string> = {
  week: "近7天",
  month: "近30天",
  all: "全部",
};

function getScopeStart(scope: LedgerTimeScope, now: Date) {
  if (scope === "week") return now.getTime() - 7 * dayMs;
  if (scope === "month") return now.getTime() - 30 * dayMs;
  return Number.NEGATIVE_INFINITY;
}

export function isLedgerRecordInTimeScope(record: LedgerRecord, scope: LedgerTimeScope, now = new Date()) {
  if (scope === "all") return true;
  const createdAt = new Date(record.createdAt).getTime();
  if (Number.isNaN(createdAt)) return false;
  return createdAt >= getScopeStart(scope, now) && createdAt <= now.getTime() + dayMs;
}

export function isTrackableGrowthRecord(record: LedgerRecord) {
  return !record.undone && record.source !== "undo" && Boolean(record.category);
}

export function filterLedgerRecordsByTimeScope(records: LedgerRecord[], scope: LedgerTimeScope, now = new Date()) {
  return records.filter((record) => isLedgerRecordInTimeScope(record, scope, now));
}

export function filterLedgerRecordsByCategory(records: LedgerRecord[], category: LedgerCategoryFilter) {
  if (category === "all") return records;
  return records.filter((record) => record.category === category);
}

export function summarizeLedgerAnalytics(records: LedgerRecord[], scope: LedgerTimeScope): LedgerAnalyticsSummary {
  const trackable = records.filter(isTrackableGrowthRecord);
  const childIds = new Set(trackable.map((record) => record.childId));
  const categoryStats = virtueCategories.map((category) => {
    const categoryRecords = trackable.filter((record) => record.category === category);
    return categoryRecords.reduce<VirtueLedgerStat>(
      (stat, record) => ({
        ...stat,
        recordCount: stat.recordCount + 1,
        xpDelta: stat.xpDelta + record.delta,
        positiveXp: record.delta > 0 ? stat.positiveXp + record.delta : stat.positiveXp,
        negativeXp: record.delta < 0 ? stat.negativeXp + Math.abs(record.delta) : stat.negativeXp,
      }),
      { category, recordCount: 0, xpDelta: 0, positiveXp: 0, negativeXp: 0 },
    );
  });

  return trackable.reduce<LedgerAnalyticsSummary>(
    (summary, record) => ({
      ...summary,
      activeRecordCount: summary.activeRecordCount + 1,
      xpDelta: summary.xpDelta + record.delta,
      positiveXp: record.delta > 0 ? summary.positiveXp + record.delta : summary.positiveXp,
      negativeXp: record.delta < 0 ? summary.negativeXp + Math.abs(record.delta) : summary.negativeXp,
    }),
    {
      scope,
      recordCount: records.length,
      activeRecordCount: 0,
      childCount: childIds.size,
      xpDelta: 0,
      positiveXp: 0,
      negativeXp: 0,
      categoryStats,
    },
  );
}
