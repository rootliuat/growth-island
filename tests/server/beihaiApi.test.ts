/**
 * [INPUT]: 依赖 Node 子进程启动本地 Beihai API，依赖临时课堂快照与 HTTP 请求。
 * [OUTPUT]: 提供课堂账本、撤销、德育复核审批与教师修正的端到端回归测试。
 * [POS]: tests/server 的 API 业务护栏，验证公开 HTTP 契约到课堂数据事务的完整链路。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ClassroomSnapshot, LedgerRecord, MoralAgentResponse } from "../../src/types";

let server: ChildProcessWithoutNullStreams;
let tempDir: string;
let baseUrl: string;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function waitForHealth() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for test API server");
}

async function requestJson<T>(route: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(`${route} failed ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

function latestRecordByReason(snapshot: ClassroomSnapshot, reason: string) {
  return snapshot.ledger.find((record) => record.reason === reason);
}

describe("Beihai API business safeguards", () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "beihai-api-test-"));
    const port = 5300 + Number(process.env.VITEST_POOL_ID ?? 0) * 100 + Math.floor(Math.random() * 80);
    baseUrl = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, ["server/beihai-api.mjs"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        BEIHAI_DB_PATH: path.join(tempDir, "beihai-db.json"),
        DEEPSEEK_API_KEY: "",
        LLM_PROVIDER: "",
        PORT: String(port),
      },
    });
    await waitForHealth();
  }, 10000);

  afterAll(async () => {
    server?.kill("SIGTERM");
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it("creates ledger entries and records undo entries without counting undone XP", async () => {
    const reason = `测试加分 ${crypto.randomUUID()}`;
    const created = await requestJson<ClassroomSnapshot>("/api/ledger", {
      method: "POST",
      body: JSON.stringify({
        childId: "child-01",
        operatorChildId: "child-01",
        delta: 20,
        source: "manual",
        category: "积极阳光",
        reason,
      }),
    });

    const target = latestRecordByReason(created, reason);
    expect(target).toMatchObject({ delta: 20, reviewStatus: "not_required", source: "manual" });

    const undone = await requestJson<ClassroomSnapshot>("/api/ledger/undo", {
      method: "POST",
      body: JSON.stringify({ recordId: target?.id, operatorChildId: "child-01" }),
    });

    expect(undone.ledger.find((record) => record.id === target?.id)).toMatchObject({ undone: true });
    expect(undone.ledger.find((record) => record.undoOf === target?.id)).toMatchObject({
      delta: -20,
      source: "undo",
      reviewStatus: "not_required",
    });
  });

  it("caps deduction records at the child's available XP", async () => {
    const reason = `测试扣分保护 ${crypto.randomUUID()}`;
    const snapshot = await requestJson<ClassroomSnapshot>("/api/ledger", {
      method: "POST",
      body: JSON.stringify({
        childId: "child-01",
        operatorChildId: "child-01",
        delta: -100,
        source: "manual",
        category: "尊矩守法",
        reason,
      }),
    });

    const record = latestRecordByReason(snapshot, reason);
    expect(record?.delta).toBeGreaterThanOrEqual(-100);
    expect(snapshot.ledger.filter((item) => item.childId === "child-01" && !item.undone && item.source !== "undo").reduce(
      (sum, item) => sum + item.delta,
      0,
    )).toBeGreaterThanOrEqual(0);
  });

  it("approves moral reviews into ledger records and rejects without ledger side effects", async () => {
    const approvedReview = await requestJson<MoralAgentResponse>("/api/agent/moral-evaluate", {
      method: "POST",
      body: JSON.stringify({
        childId: "child-02",
        operatorChildId: "child-01",
        transcript: "我今天主动帮同学收玩具",
      }),
    });
    expect(approvedReview.reviewItem).toMatchObject({ status: "pending_review" });

    const approvedSnapshot = await requestJson<ClassroomSnapshot>(
      `/api/agent/reviews/${encodeURIComponent(approvedReview.reviewItem.id)}/approve`,
      {
        method: "POST",
        body: JSON.stringify({ operatorChildId: "child-01" }),
      },
    );
    expect(approvedSnapshot.moralReviews?.find((review) => review.id === approvedReview.reviewItem.id)).toMatchObject({
      status: "approved",
      ledgerRecordId: expect.any(String),
    });
    expect(approvedSnapshot.ledger.find((record) => record.reviewId === approvedReview.reviewItem.id)).toMatchObject<
      Partial<LedgerRecord>
    >({
      childId: "child-02",
      source: "dialogue-agent",
      aiSuggested: true,
      reviewStatus: "approved",
    });

    const rejectedReview = await requestJson<MoralAgentResponse>("/api/agent/moral-evaluate", {
      method: "POST",
      body: JSON.stringify({
        childId: "child-03",
        operatorChildId: "child-01",
        transcript: "我今天主动帮同学收玩具",
      }),
    });
    const rejectedSnapshot = await requestJson<ClassroomSnapshot>(
      `/api/agent/reviews/${encodeURIComponent(rejectedReview.reviewItem.id)}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ operatorChildId: "child-01", rejectionReason: "测试驳回" }),
      },
    );
    expect(rejectedSnapshot.moralReviews?.find((review) => review.id === rejectedReview.reviewItem.id)).toMatchObject({
      status: "rejected",
      rejectionReason: "测试驳回",
    });
    expect(rejectedSnapshot.ledger.some((record) => record.reviewId === rejectedReview.reviewItem.id)).toBe(false);
  });

  it("does not approve negative moral review suggestions into ledger records", async () => {
    const transcript = "我排队的时候推了同学，没有遵守规则";
    const reviewResponse = await requestJson<MoralAgentResponse>("/api/agent/moral-evaluate", {
      method: "POST",
      body: JSON.stringify({
        childId: "child-05",
        operatorChildId: "child-01",
        transcript,
      }),
    });
    expect(reviewResponse.result.xpDelta).toBeLessThan(0);

    await expect(
      requestJson<ClassroomSnapshot>(`/api/agent/reviews/${encodeURIComponent(reviewResponse.reviewItem.id)}/approve`, {
        method: "POST",
        body: JSON.stringify({ operatorChildId: "child-01" }),
      }),
    ).rejects.toThrow("400");

    const snapshot = await requestJson<ClassroomSnapshot>("/api/classroom");
    expect(snapshot.moralReviews?.find((review) => review.id === reviewResponse.reviewItem.id)).toMatchObject({
      status: "pending_review",
    });
    expect(snapshot.ledger.some((record) => record.reviewId === reviewResponse.reviewItem.id)).toBe(false);

    const adjustedSnapshot = await requestJson<ClassroomSnapshot>("/api/ledger", {
      method: "POST",
      body: JSON.stringify({
        childId: "child-05",
        operatorChildId: "child-01",
        operatorRole: "teacher",
        delta: 10,
        source: "dialogue-agent",
        category: "积极阳光",
        reason: `自助成长：${transcript}`,
        aiSuggested: true,
        reviewStatus: "approved",
        reviewId: reviewResponse.reviewItem.id,
        teacherAdjustedReview: true,
      }),
    });

    expect(adjustedSnapshot.moralReviews?.find((review) => review.id === reviewResponse.reviewItem.id)).toMatchObject({
      status: "approved",
      result: {
        intent: "reward",
        category: "积极阳光",
        xpDelta: 10,
        riskFlags: expect.arrayContaining(["teacher_adjusted_positive"]),
      },
    });
    expect(adjustedSnapshot.ledger.find((record) => record.reviewId === reviewResponse.reviewItem.id)).toMatchObject({
      delta: 10,
      source: "dialogue-agent",
      reviewStatus: "approved",
    });
  });

  it("does not let ledger posts approve negative moral review suggestions", async () => {
    const transcript = "我排队的时候推了同学，没有遵守规则";
    const reviewResponse = await requestJson<MoralAgentResponse>("/api/agent/moral-evaluate", {
      method: "POST",
      body: JSON.stringify({
        childId: "child-06",
        operatorChildId: "child-01",
        transcript,
      }),
    });
    expect(reviewResponse.result.xpDelta).toBeLessThan(0);

    await expect(
      requestJson<ClassroomSnapshot>("/api/ledger", {
        method: "POST",
        body: JSON.stringify({
          childId: "child-06",
          operatorChildId: "child-01",
          operatorRole: "teacher",
          delta: reviewResponse.result.xpDelta,
          source: "dialogue-agent",
          category: reviewResponse.result.category,
          reason: `自助成长：${transcript}`,
          aiSuggested: true,
          reviewStatus: "approved",
          reviewId: reviewResponse.reviewItem.id,
        }),
      }),
    ).rejects.toThrow("400");

    const snapshot = await requestJson<ClassroomSnapshot>("/api/classroom");
    expect(snapshot.moralReviews?.find((review) => review.id === reviewResponse.reviewItem.id)).toMatchObject({
      status: "pending_review",
    });
    expect(snapshot.ledger.some((record) => record.reviewId === reviewResponse.reviewItem.id)).toBe(false);
  });

  it("honors teacher corrections to already-positive moral reviews", async () => {
    const transcript = "我今天主动帮同学收玩具";
    const reviewResponse = await requestJson<MoralAgentResponse>("/api/agent/moral-evaluate", {
      method: "POST",
      body: JSON.stringify({
        childId: "child-07",
        operatorChildId: "child-01",
        transcript,
      }),
    });
    expect(reviewResponse.result).toMatchObject({ intent: "reward", category: "积极阳光" });

    await expect(
      requestJson<ClassroomSnapshot>("/api/ledger", {
        method: "POST",
        body: JSON.stringify({
          childId: "child-07",
          operatorChildId: "child-01",
          operatorRole: "teacher",
          delta: 25,
          source: "dialogue-agent",
          category: "开拓创新",
          reason: `自助成长：${transcript}`,
          aiSuggested: true,
          reviewStatus: "approved",
          reviewId: reviewResponse.reviewItem.id,
          teacherAdjustedReview: true,
        }),
      }),
    ).rejects.toThrow("400");

    const unchanged = await requestJson<ClassroomSnapshot>("/api/classroom");
    expect(unchanged.moralReviews?.find((review) => review.id === reviewResponse.reviewItem.id)).toMatchObject({
      status: "pending_review",
      result: { category: "积极阳光" },
    });
    expect(unchanged.ledger.some((record) => record.reviewId === reviewResponse.reviewItem.id)).toBe(false);

    const snapshot = await requestJson<ClassroomSnapshot>("/api/ledger", {
      method: "POST",
      body: JSON.stringify({
        childId: "child-07",
        operatorChildId: "child-01",
        operatorRole: "teacher",
        delta: 30,
        source: "dialogue-agent",
        category: "开拓创新",
        reason: `自助成长：${transcript}`,
        aiSuggested: true,
        reviewStatus: "approved",
        reviewId: reviewResponse.reviewItem.id,
        teacherAdjustedReview: true,
      }),
    });

    expect(snapshot.moralReviews?.find((review) => review.id === reviewResponse.reviewItem.id)).toMatchObject({
      status: "approved",
      ledgerRecordId: expect.any(String),
      reviewedByChildId: "child-01",
      result: {
        intent: "reward",
        category: "开拓创新",
        xpDelta: 30,
        riskFlags: expect.arrayContaining(["teacher_adjusted_positive"]),
      },
    });
    expect(snapshot.ledger.find((record) => record.reviewId === reviewResponse.reviewItem.id)).toMatchObject({
      childId: "child-07",
      delta: 30,
      category: "开拓创新",
      reviewId: reviewResponse.reviewItem.id,
      reviewStatus: "approved",
    });
  });

  it("marks pending reviews approved when a reviewed self-service ledger record is posted", async () => {
    const transcript = "我今天主动帮同学收玩具";
    const reviewResponse = await requestJson<MoralAgentResponse>("/api/agent/moral-evaluate", {
      method: "POST",
      body: JSON.stringify({
        childId: "child-04",
        operatorChildId: "child-04",
        transcript,
      }),
    });

    const snapshot = await requestJson<ClassroomSnapshot>("/api/ledger", {
      method: "POST",
      body: JSON.stringify({
        childId: "child-04",
        operatorChildId: "child-01",
        operatorRole: "teacher",
        delta: reviewResponse.result.xpDelta,
        source: "dialogue-agent",
        category: reviewResponse.result.category,
        reason: `自助成长：${transcript}`,
        aiSuggested: true,
        reviewStatus: "approved",
        reviewId: reviewResponse.reviewItem.id,
      }),
    });

    expect(snapshot.moralReviews?.find((review) => review.id === reviewResponse.reviewItem.id)).toMatchObject({
      status: "approved",
      ledgerRecordId: expect.any(String),
      reviewedByChildId: "child-01",
    });
    expect(snapshot.ledger.find((record) => record.reviewId === reviewResponse.reviewItem.id)).toMatchObject({
      childId: "child-04",
      source: "dialogue-agent",
      reason: `自助成长：${transcript}`,
      reviewStatus: "approved",
    });
  });
});
