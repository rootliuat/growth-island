/**
 * [INPUT]: 依赖 src/domain/moralSpeakSession 的 session、锁定、审批目标和摘要规则。
 * [OUTPUT]: 对外提供儿童自助说成长状态机的领域回归测试。
 * [POS]: tests/domain 的 moralSpeakSession 契约测试，保护 App 抽离后的状态判断不漂移。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from "vitest";
import {
  getMoralSpeakLockedChildId,
  getMoralSpeakSummary,
  isCurrentMoralApprovalTarget,
  isMoralSpeakSessionActive,
  nextMoralSpeakSessionId,
  type MoralSpeakViewState,
} from "../../src/domain/moralSpeakSession";
import type { MoralEvaluationResult } from "../../src/types";

const rewardResult: MoralEvaluationResult = {
  intent: "reward",
  category: "积极阳光",
  xpDelta: 10,
  confidence: 0.8,
  status: "pending_review",
  reasonForChild: "做得好",
  reasonForTeacher: "可记录",
  riskFlags: [],
};

const blockedResult: MoralEvaluationResult = {
  ...rewardResult,
  intent: "needs_clarification",
  category: undefined,
  xpDelta: 0,
  confidence: 0.3,
};

describe("moralSpeakSession", () => {
  it("increments session ids without exposing mutation", () => {
    expect(nextMoralSpeakSessionId(0)).toBe(1);
    expect(nextMoralSpeakSessionId(8)).toBe(9);
  });

  it("locks the active child from ready until success", () => {
    const lockedStages: MoralSpeakViewState["stage"][] = ["ready", "listening", "recognizing", "pendingReview", "success"];
    for (const stage of lockedStages) {
      expect(getMoralSpeakLockedChildId({ stage, childId: "child-1" })).toBe("child-1");
    }
    expect(getMoralSpeakLockedChildId({ stage: "idle", childId: "child-1" })).toBeUndefined();
    expect(getMoralSpeakLockedChildId({ stage: "error", childId: "child-1" })).toBeUndefined();
  });

  it("rejects stale session callbacks and wrong-child callbacks", () => {
    const state: MoralSpeakViewState = { stage: "listening", childId: "child-1" };
    expect(isMoralSpeakSessionActive({ currentSessionId: 4, expectedSessionId: 4, state, childId: "child-1" })).toBe(true);
    expect(isMoralSpeakSessionActive({ currentSessionId: 5, expectedSessionId: 4, state, childId: "child-1" })).toBe(false);
    expect(isMoralSpeakSessionActive({ currentSessionId: 4, expectedSessionId: 4, state, childId: "child-2" })).toBe(false);
    expect(isMoralSpeakSessionActive({ currentSessionId: 4, expectedSessionId: 4, state: { stage: "idle" } })).toBe(false);
  });

  it("matches approval only against the current pending review", () => {
    const state: MoralSpeakViewState = { stage: "pendingReview", childId: "child-1", reviewId: "review-1" };
    expect(isCurrentMoralApprovalTarget(state, "child-1", "review-1")).toBe(true);
    expect(isCurrentMoralApprovalTarget(state, "child-2", "review-1")).toBe(false);
    expect(isCurrentMoralApprovalTarget(state, "child-1", "review-2")).toBe(false);
    expect(isCurrentMoralApprovalTarget({ ...state, stage: "success" }, "child-1", "review-1")).toBe(false);
  });

  it("summarizes safe rewards and routes unsafe reviews to teacher help", () => {
    expect(getMoralSpeakSummary(rewardResult, "主动帮忙")).toBe("主动帮忙");
    expect(getMoralSpeakSummary(rewardResult, "")).toBe("友爱能量");
    expect(getMoralSpeakSummary(blockedResult, "不使用")).toBe("请老师帮忙");
  });
});
