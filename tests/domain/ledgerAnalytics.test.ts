/**
 * [INPUT]: 依赖成长账本分析的时间、类别筛选与汇总规则。
 * [OUTPUT]: 提供滚动时间范围、可追踪记录和分类统计口径的领域回归测试。
 * [POS]: tests/domain 的 ledger 分析护栏，确保筛选集合与统计集合保持同源。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from "vitest";
import {
  filterLedgerRecordsByCategory,
  filterLedgerRecordsByTimeScope,
  summarizeLedgerAnalytics,
} from "../../src/domain/ledgerAnalytics";
import type { LedgerRecord } from "../../src/types";

function record(input: Partial<LedgerRecord> & Pick<LedgerRecord, "id" | "childId" | "delta" | "createdAt">): LedgerRecord {
  return {
    operatorChildId: input.childId,
    operatorRole: "teacher",
    source: "manual",
    category: "积极阳光",
    reason: "测试记录",
    aiSuggested: false,
    reviewStatus: "not_required",
    ...input,
  };
}

describe("ledger analytics", () => {
  it("filters records into rolling week and month scopes", () => {
    const now = new Date("2026-06-30T12:00:00.000Z");
    const records = [
      record({ id: "recent", childId: "child-1", delta: 10, createdAt: "2026-06-29T12:00:00.000Z" }),
      record({ id: "month", childId: "child-1", delta: 20, createdAt: "2026-06-10T12:00:00.000Z" }),
      record({ id: "old", childId: "child-1", delta: 30, createdAt: "2026-05-01T12:00:00.000Z" }),
      record({ id: "invalid", childId: "child-1", delta: 10, createdAt: "not-a-date" }),
    ];

    expect(filterLedgerRecordsByTimeScope(records, "week", now).map((item) => item.id)).toEqual(["recent"]);
    expect(filterLedgerRecordsByTimeScope(records, "month", now).map((item) => item.id)).toEqual(["recent", "month"]);
    expect(filterLedgerRecordsByTimeScope(records, "all", now).map((item) => item.id)).toEqual(["recent", "month", "old", "invalid"]);
  });

  it("summarizes trackable virtue records and ignores undo noise", () => {
    const records = [
      record({ id: "sunny", childId: "child-1", delta: 20, category: "积极阳光", createdAt: "2026-06-29T12:00:00.000Z" }),
      record({ id: "law", childId: "child-2", delta: 10, category: "尊矩守法", createdAt: "2026-06-29T12:00:00.000Z" }),
      record({ id: "deduct", childId: "child-2", delta: -10, category: "尊矩守法", createdAt: "2026-06-29T12:00:00.000Z" }),
      record({ id: "undone", childId: "child-3", delta: 30, category: "开拓创新", undone: true, createdAt: "2026-06-29T12:00:00.000Z" }),
      record({ id: "undo", childId: "child-3", delta: -30, source: "undo", createdAt: "2026-06-29T12:00:00.000Z" }),
      record({ id: "no-category", childId: "child-4", delta: 30, category: undefined, createdAt: "2026-06-29T12:00:00.000Z" }),
    ];

    const summary = summarizeLedgerAnalytics(records, "week");
    const sunny = summary.categoryStats.find((stat) => stat.category === "积极阳光");
    const law = summary.categoryStats.find((stat) => stat.category === "尊矩守法");
    const innovation = summary.categoryStats.find((stat) => stat.category === "开拓创新");

    expect(summary.recordCount).toBe(6);
    expect(summary.activeRecordCount).toBe(3);
    expect(summary.childCount).toBe(2);
    expect(summary.xpDelta).toBe(20);
    expect(summary.positiveXp).toBe(30);
    expect(summary.negativeXp).toBe(10);
    expect(sunny).toMatchObject({ recordCount: 1, xpDelta: 20, positiveXp: 20, negativeXp: 0 });
    expect(law).toMatchObject({ recordCount: 2, xpDelta: 0, positiveXp: 10, negativeXp: 10 });
    expect(innovation).toMatchObject({ recordCount: 0, xpDelta: 0 });
  });

  it("filters records by virtue category", () => {
    const records = [
      record({ id: "sunny", childId: "child-1", delta: 20, category: "积极阳光", createdAt: "2026-06-29T12:00:00.000Z" }),
      record({ id: "law", childId: "child-2", delta: 10, category: "尊矩守法", createdAt: "2026-06-29T12:00:00.000Z" }),
    ];

    expect(filterLedgerRecordsByCategory(records, "all")).toHaveLength(2);
    expect(filterLedgerRecordsByCategory(records, "尊矩守法").map((item) => item.id)).toEqual(["law"]);
  });

  it("summarizes totals from the selected category record set", () => {
    const records = [
      record({ id: "sunny", childId: "child-1", delta: 20, category: "积极阳光", createdAt: "2026-06-29T12:00:00.000Z" }),
      record({ id: "law-a", childId: "child-2", delta: 10, category: "尊矩守法", createdAt: "2026-06-29T12:00:00.000Z" }),
      record({ id: "law-b", childId: "child-2", delta: -5, category: "尊矩守法", createdAt: "2026-06-29T13:00:00.000Z" }),
    ];

    const categoryRecords = filterLedgerRecordsByCategory(records, "尊矩守法");
    const summary = summarizeLedgerAnalytics(categoryRecords, "week");

    expect(summary).toMatchObject({ recordCount: 2, activeRecordCount: 2, childCount: 1, xpDelta: 5 });
  });
});
