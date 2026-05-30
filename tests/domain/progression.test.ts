import { describe, expect, it } from "vitest";
import {
  enrichChildren,
  getLevelInfo,
  getXpForChild,
  makeLedgerRecord,
  normalizeLedgerRecord,
  xpProgressPercent,
} from "../../src/domain/progression";
import type { ChildProfile, LedgerRecord } from "../../src/types";

const children: ChildProfile[] = [
  { id: "child-a", name: "安安", spiritId: "01", petName: "安安的小伙伴", slotId: 1 },
  { id: "child-b", name: "贝贝", spiritId: "02", petName: "贝贝的小伙伴", slotId: 2 },
  { id: "child-c", name: "晨晨", spiritId: "03", petName: "晨晨的小伙伴", slotId: 3 },
];

function record(partial: Partial<LedgerRecord> & Pick<LedgerRecord, "childId" | "delta">): LedgerRecord {
  return normalizeLedgerRecord({
    id: partial.id ?? crypto.randomUUID(),
    childId: partial.childId,
    operatorChildId: partial.operatorChildId ?? partial.childId,
    operatorRole: partial.operatorRole ?? "teacher",
    delta: partial.delta,
    source: partial.source ?? "manual",
    category: partial.category ?? "积极阳光",
    reason: partial.reason ?? "测试记录",
    aiSuggested: partial.aiSuggested ?? false,
    reviewStatus: partial.reviewStatus ?? "not_required",
    createdAt: partial.createdAt ?? new Date().toISOString(),
    undone: partial.undone,
    undoOf: partial.undoOf,
    reviewId: partial.reviewId,
  });
}

describe("progression domain", () => {
  it("maps XP boundaries to egg and level states", () => {
    expect(getLevelInfo(0)).toMatchObject({ level: 1, state: "egg-1", nextXp: 25 });
    expect(getLevelInfo(25)).toMatchObject({ level: 1, state: "egg-2", nextXp: 50 });
    expect(getLevelInfo(75)).toMatchObject({ level: 1, state: "egg-4", nextXp: 100 });
    expect(getLevelInfo(100)).toMatchObject({ level: 2, state: "lv2", nextXp: 250 });
    expect(getLevelInfo(1900)).toMatchObject({ level: 8, state: "lv8", nextXp: 1900 });
  });

  it("calculates XP without undone records or undo entries and never drops below zero", () => {
    const ledger = [
      record({ id: "gain", childId: "child-a", delta: 20 }),
      record({ id: "undone-gain", childId: "child-a", delta: 50, undone: true }),
      record({ id: "undo-entry", childId: "child-a", delta: -20, source: "undo", undoOf: "gain" }),
      record({ id: "deduct", childId: "child-a", delta: -80 }),
    ];

    expect(getXpForChild("child-a", ledger)).toBe(0);
  });

  it("enriches children with XP, level, state, and deterministic ranks", () => {
    const ledger = [
      record({ childId: "child-a", delta: 100 }),
      record({ childId: "child-b", delta: 250 }),
      record({ childId: "child-c", delta: 250 }),
    ];

    const enriched = enrichChildren(children, ledger);

    expect(enriched.find((child) => child.id === "child-a")).toMatchObject({ xp: 100, level: 2, state: "lv2", rank: 3 });
    expect(enriched.find((child) => child.id === "child-b")).toMatchObject({ xp: 250, level: 3, state: "lv3", rank: 1 });
    expect(enriched.find((child) => child.id === "child-c")).toMatchObject({ xp: 250, level: 3, state: "lv3", rank: 2 });
  });

  it("reports progress percent inside the current stage", () => {
    expect(xpProgressPercent(0)).toBe(0);
    expect(xpProgressPercent(25)).toBe(0);
    expect(xpProgressPercent(50)).toBe(0);
    expect(xpProgressPercent(75)).toBe(0);
    expect(xpProgressPercent(100)).toBe(0);
    expect(xpProgressPercent(175)).toBe(50);
    expect(xpProgressPercent(1900)).toBe(100);
  });

  it("normalizes and creates ledger records with source defaults", () => {
    const normalized = normalizeLedgerRecord({
      id: "review-record",
      childId: "child-a",
      operatorChildId: "child-a",
      delta: 20,
      source: "dialogue-agent",
      reason: "复核通过",
      createdAt: "2026-05-30T00:00:00.000Z",
    } as LedgerRecord);

    expect(normalized).toMatchObject({ operatorRole: "teacher", aiSuggested: true, reviewStatus: "approved" });

    const created = makeLedgerRecord({ childId: "child-a", operatorChildId: "child-a", delta: 30, source: "math-pk", reason: "数学 PK" });
    expect(created.id).toEqual(expect.any(String));
    expect(created.createdAt).toEqual(expect.any(String));
    expect(created).toMatchObject({ operatorRole: "system", aiSuggested: false, reviewStatus: "not_required" });
  });
});
