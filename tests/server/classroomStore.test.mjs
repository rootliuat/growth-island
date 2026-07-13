/**
 * [INPUT]: 依赖 classroom-store 与临时 JSON 数据库目录。
 * [OUTPUT]: 提供课堂数据事务原子性、队列恢复、幂等冲突和持久化回归。
 * [POS]: tests/server 的深 Module Interface 测试，绕过 HTTP 但不绕过真实文件存储。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClassroomStore } from "../../server/classroom-store.mjs";

let tempDir;

afterEach(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("classroom store transactions", () => {
  it("discards invalid partial changes and keeps the queue usable", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "beihai-store-test-"));
    const dbPath = path.join(tempDir, "classroom.json");
    const store = createClassroomStore({ dbPath, dataDir: tempDir });
    const initial = await store.getSnapshot();
    const originalName = initial.children.find((child) => child.id === "child-01")?.name;

    await expect(store.patchChild("child-01", { name: "不应落盘", voiceType: 999 })).rejects.toMatchObject({
      status: 400,
      message: "Invalid voiceType",
    });
    expect((await store.getSnapshot()).children.find((child) => child.id === "child-01")?.name).toBe(originalName);

    const reason = `队列恢复 ${crypto.randomUUID()}`;
    const created = await store.createLedger({
      childId: "child-01",
      operatorChildId: "child-01",
      delta: 10,
      source: "manual",
      category: "积极阳光",
      reason,
      operationId: crypto.randomUUID(),
    });
    expect(created.created).toBe(true);

    const reloadedStore = createClassroomStore({ dbPath, dataDir: tempDir });
    expect((await reloadedStore.getSnapshot()).ledger.some((record) => record.reason === reason)).toBe(true);
  });

  it("deduplicates retried ledger operations after a response is lost", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "beihai-store-test-"));
    const store = createClassroomStore({ dbPath: path.join(tempDir, "classroom.json") });
    const input = {
      childId: "child-01",
      operatorChildId: "child-01",
      delta: 10,
      source: "manual",
      category: "积极阳光",
      reason: "响应丢失重试",
      operationId: "stable-ledger-operation",
    };

    await store.createLedger(input);
    await store.createLedger(input);
    const snapshot = await store.getSnapshot();

    expect(snapshot.ledger.filter((record) => record.operationId === input.operationId)).toHaveLength(1);
  });

  it("rejects a reused ledger operationId when the request meaning changes", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "beihai-store-test-"));
    const store = createClassroomStore({ dbPath: path.join(tempDir, "classroom.json") });
    const input = {
      childId: "child-01",
      operatorChildId: "child-01",
      delta: 10,
      source: "manual",
      category: "积极阳光",
      reason: "第一次请求",
      operationId: "conflicting-ledger-operation",
    };
    await store.createLedger(input);

    await expect(store.createLedger({ ...input, childId: "child-02" })).rejects.toMatchObject({
      status: 409,
      code: "idempotency_conflict",
      retryable: false,
    });
    await expect(store.undoLedger({
      recordId: (await store.getSnapshot()).ledger[0].id,
      operatorChildId: "child-01",
      operationId: input.operationId,
    })).rejects.toMatchObject({ status: 409, code: "idempotency_conflict" });
  });

  it("deduplicates identical moral reviews and rejects the same key with a new transcript", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "beihai-store-test-"));
    const store = createClassroomStore({ dbPath: path.join(tempDir, "classroom.json") });
    const input = {
      childId: "child-01",
      operatorChildId: "child-01",
      transcript: "我主动帮同学收玩具",
      result: { intent: "reward", category: "积极阳光", xpDelta: 20, confidence: 0.9 },
      operationId: "stable-review-operation",
    };

    await store.createMoralReview(input);
    const duplicate = await store.createMoralReview(input);
    expect(duplicate.duplicate).toBe(true);
    await expect(store.createMoralReview({ ...input, transcript: "完全不同的内容" })).rejects.toMatchObject({
      status: 409,
      code: "idempotency_conflict",
    });
  });

  it("requires operationId for every non-idempotent classroom write", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "beihai-store-test-"));
    const store = createClassroomStore({ dbPath: path.join(tempDir, "classroom.json") });
    const ledgerInput = {
      childId: "child-01",
      operatorChildId: "child-01",
      delta: 10,
      source: "manual",
      category: "积极阳光",
      reason: "幂等契约",
    };
    await expect(store.createLedger(ledgerInput)).rejects.toMatchObject({ status: 400, message: "Invalid operationId" });
    await expect(store.createMoralReview({
      childId: "child-01",
      operatorChildId: "child-01",
      transcript: "我主动帮助同学",
      result: { intent: "reward", category: "积极阳光", xpDelta: 20, confidence: 0.9 },
    })).rejects.toMatchObject({ status: 400, message: "Invalid operationId" });

    await store.createLedger({ ...ledgerInput, operationId: "required-ledger-operation" });
    const target = (await store.getSnapshot()).ledger[0];
    await expect(store.undoLedger({ recordId: target.id, operatorChildId: "child-01" })).rejects.toMatchObject({ status: 400 });

    const reviewInput = {
      childId: "child-02",
      operatorChildId: "child-01",
      transcript: "我主动帮助同学",
      result: { intent: "reward", category: "积极阳光", xpDelta: 20, confidence: 0.9 },
    };
    const firstReview = await store.createMoralReview({ ...reviewInput, operationId: "required-review-approve" });
    await expect(store.approveMoralReview(firstReview.reviewItem.id, { operatorChildId: "child-01" })).rejects.toMatchObject({ status: 400 });
    const secondReview = await store.createMoralReview({ ...reviewInput, childId: "child-03", operationId: "required-review-reject" });
    await expect(store.rejectMoralReview(secondReview.reviewItem.id, { operatorChildId: "child-01" })).rejects.toMatchObject({ status: 400 });
  });

  it("deduplicates review decisions and rejects cross-type operation reuse", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "beihai-store-test-"));
    const store = createClassroomStore({ dbPath: path.join(tempDir, "classroom.json") });
    const result = { intent: "reward", category: "积极阳光", xpDelta: 20, confidence: 0.9 };
    const approved = await store.createMoralReview({
      childId: "child-04",
      operatorChildId: "child-01",
      transcript: "我帮助同学",
      result,
      operationId: "decision-review-create-1",
    });
    const approval = { operatorChildId: "child-01", operationId: "stable-review-decision" };
    await store.approveMoralReview(approved.reviewItem.id, approval);
    await store.approveMoralReview(approved.reviewItem.id, approval);
    expect((await store.getSnapshot()).ledger.filter((record) => record.operationId === approval.operationId)).toHaveLength(1);

    const rejected = await store.createMoralReview({
      childId: "child-05",
      operatorChildId: "child-01",
      transcript: "我帮助同学",
      result,
      operationId: "decision-review-create-2",
    });
    await expect(store.rejectMoralReview(rejected.reviewItem.id, {
      operatorChildId: "child-01",
      operationId: approval.operationId,
    })).rejects.toMatchObject({ status: 409, code: "idempotency_conflict" });
    const rejection = { operatorChildId: "child-01", operationId: "stable-review-rejection", rejectionReason: "不记录" };
    await store.rejectMoralReview(rejected.reviewItem.id, rejection);
    await store.rejectMoralReview(rejected.reviewItem.id, rejection);

    await store.createLedger({
      childId: "child-06",
      operatorChildId: "child-01",
      delta: 10,
      source: "manual",
      category: "积极阳光",
      reason: "撤销幂等",
      operationId: "undo-target-create",
    });
    const target = (await store.getSnapshot()).ledger.find((record) => record.operationId === "undo-target-create");
    const undo = { recordId: target.id, operatorChildId: "child-01", operationId: "stable-ledger-undo" };
    await store.undoLedger(undo);
    await store.undoLedger(undo);
    expect((await store.getSnapshot()).ledger.filter((record) => record.operationId === undo.operationId)).toHaveLength(1);
  });
});
