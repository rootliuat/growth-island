/**
 * [INPUT]: 依赖 src/domain/moralSpeakSession 的 session、分阶段恢复、老师 fallback、重放锁、冻结载荷和摘要规则。
 * [OUTPUT]: 对外提供儿童自助说成长状态机、恢复动作、审批幂等和人工兜底的领域回归测试。
 * [POS]: tests/domain 的 moralSpeakSession 契约测试，保护 App 抽离后的状态判断不漂移。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from "vitest";
import {
  createMoralApprovalOperation,
  createMoralSpeakManualFallback,
  getMoralSpeakFailurePresentation,
  getMoralSpeakLockedChildId,
  getMoralSpeakRetryLabel,
  getMoralSpeakSummary,
  isCurrentMoralApprovalTarget,
  isMoralApprovalReplayLocked,
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

  it("locks arbitrary child selection through the success receipt", () => {
    const lockedStages: MoralSpeakViewState["stage"][] = ["ready", "listening", "recognizing", "pendingReview", "success"];
    for (const stage of lockedStages) {
      expect(getMoralSpeakLockedChildId({ stage, childId: "child-1" })).toBe("child-1");
    }
    expect(getMoralSpeakLockedChildId({ stage: "idle", childId: "child-1" })).toBeUndefined();
    expect(getMoralSpeakLockedChildId({ stage: "error", childId: "child-1" })).toBeUndefined();
    expect(getMoralSpeakLockedChildId({ stage: "error", childId: "child-1", retryMode: "reapprove" })).toBe("child-1");
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
    expect(
      isCurrentMoralApprovalTarget({ ...state, stage: "error", retryMode: "reapprove" }, "child-1", "review-1"),
    ).toBe(true);
  });

  it("freezes the full approval payload while an uncertain write is being replayed", () => {
    const state: MoralSpeakViewState = {
      stage: "pendingReview",
      childId: "child-1",
      transcript: "我帮同伴整理画笔",
      result: rewardResult,
      reviewId: "review-1",
      adjusted: true,
    };
    const operation = createMoralApprovalOperation(state, "teacher-1", "operation-1");
    expect(operation).toMatchObject({
      childId: "child-1",
      operatorChildId: "teacher-1",
      delta: 10,
      category: "积极阳光",
      reason: "自助成长：我帮同伴整理画笔",
      reviewId: "review-1",
      teacherAdjustedReview: true,
      operationId: "operation-1",
    });
    expect(Object.isFrozen(operation)).toBe(true);
    expect(isMoralApprovalReplayLocked({ ...state, stage: "error", retryMode: "reapprove" })).toBe(true);
    expect(isMoralApprovalReplayLocked(state)).toBe(false);
  });

  it("summarizes safe rewards and routes unsafe reviews to teacher help", () => {
    expect(getMoralSpeakSummary(rewardResult, "主动帮忙")).toBe("主动帮忙");
    expect(getMoralSpeakSummary(rewardResult, "")).toBe("友爱能量");
    expect(getMoralSpeakSummary(blockedResult, "不使用")).toBe("请老师帮忙");
  });

  it("reuses recorded audio only for transient recognition failures", () => {
    expect(getMoralSpeakFailurePresentation("asr_timeout")).toEqual({
      message: "识别暂时没连上，请老师重试",
      retryMode: "retranscribe",
    });
    expect(getMoralSpeakFailurePresentation("network_unavailable").retryMode).toBe("retranscribe");
    expect(getMoralSpeakFailurePresentation("microphone_permission")).toEqual({
      message: "请允许麦克风后再试",
      retryMode: "rerecord",
    });
    expect(getMoralSpeakFailurePresentation("audio_decode_failed").retryMode).toBe("rerecord");
    expect(getMoralSpeakFailurePresentation("speech_not_configured").retryMode).toBe("none");
  });

  it("maps recovery modes to the action that can actually recover the failed stage", () => {
    expect(getMoralSpeakRetryLabel("reapprove")).toBe("重试点亮");
    expect(getMoralSpeakRetryLabel("reevaluate")).toBe("重试判断");
    expect(getMoralSpeakRetryLabel("retranscribe")).toBe("重新识别");
    expect(getMoralSpeakRetryLabel("rerecord")).toBe("再说一次");
    expect(getMoralSpeakRetryLabel("none")).toBeUndefined();
  });

  it("creates an unsafe manual fallback that requires the teacher to choose positive energy", () => {
    expect(createMoralSpeakManualFallback()).toMatchObject({
      intent: "needs_clarification",
      xpDelta: 0,
      confidence: 0,
      status: "manual_fallback",
      riskFlags: ["teacher_takeover_required"],
    });
  });
});
