/**
 * [INPUT]: 依赖 classroom 初始幼儿、progression 的 ledger 规范化规则和类型契约。
 * [OUTPUT]: 对外提供 seededLedger 与 seededMoralReviews 演示数据。
 * [POS]: data 的演示记录 Module，把启动种子从 App 根接线层移走。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { initialChildren } from "./classroom";
import { normalizeLedgerRecord } from "../domain/progression";
import type { LedgerRecord, MoralReviewItem } from "../types";

export const seededLedger: LedgerRecord[] = initialChildren.slice(0, 16).flatMap((child, index) => {
  const base = [30, 70, 110, 160, 260, 470, 720, 1010, 1450, 1910][index % 10];
  return [
    normalizeLedgerRecord({
      id: `seed-${child.id}`,
      childId: child.id,
      operatorChildId: child.id,
      delta: base,
      source: "manual",
      category: "积极阳光",
      reason: "演示数据：已有成长 XP",
      createdAt: new Date(Date.now() - index * 3600_000).toISOString(),
    } as LedgerRecord),
  ];
});

export const seededMoralReviews: MoralReviewItem[] = [
  {
    id: "seed-review-child-06",
    childId: "child-06",
    operatorChildId: "child-06",
    transcript: "我今天主动帮同学收玩具",
    result: {
      intent: "reward",
      category: "积极阳光",
      xpDelta: 20,
      confidence: 0.82,
      status: "pending_review",
      reasonForChild: "你主动帮助同学，是很温暖的成长表现。",
      reasonForTeacher: "建议记录为积极阳光 +20，等待老师复核确认。",
      riskFlags: [],
    },
    status: "pending_review",
    createdAt: new Date(Date.now() - 18 * 60_000).toISOString(),
  },
];
