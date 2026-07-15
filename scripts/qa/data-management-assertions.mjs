/**
 * [INPUT]: 依赖记录港浏览器快照中的 ledger、分类、时间范围与统计数字。
 * [OUTPUT]: 对外提供 matchesCategoryAnalytics 分类统计一致性断言。
 * [POS]: scripts/qa 的记录港纯断言 Module，被 operations-flows 的 data-management 流程消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

const dayMs = 24 * 60 * 60 * 1000;

export function matchesCategoryAnalytics({ records, metrics, category, scopeDays, now }) {
  const categoryRecords = records.filter((record) => {
    const createdAt = new Date(record.createdAt).getTime();
    return (
      !Number.isNaN(createdAt) &&
      createdAt >= now - scopeDays * dayMs &&
      createdAt <= now + dayMs &&
      record.category === category &&
      !record.undone &&
      record.source !== "undo"
    );
  });
  const xpDelta = categoryRecords.reduce((sum, record) => sum + record.delta, 0);
  const childCount = new Set(categoryRecords.map((record) => record.childId)).size;
  return metrics.xpDelta === xpDelta && metrics.childCount === childCount && metrics.activeRecordCount === categoryRecords.length;
}
