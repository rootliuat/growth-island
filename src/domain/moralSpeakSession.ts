/**
 * [INPUT]: 依赖 virtueEnergy 的可审批判断，依赖 types 的德育评估与账本输入契约。
 * [OUTPUT]: 对外提供 MoralSpeakViewState、分阶段恢复动作、老师接管兜底、冻结审批载荷、恢复锁和 session 判定函数。
 * [POS]: domain 的儿童自助说成长状态 Module，被 App 与 HUD 渲染共同消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { LedgerRecordInput, MoralEvaluationResult } from "../types";
import { canApproveMoralGrowth, getChildEnergyLabel } from "./virtueEnergy";

export type MoralSpeakStage = "idle" | "ready" | "listening" | "recognizing" | "pendingReview" | "success" | "error";
export type MoralSpeakProcessingStep = "transcribing" | "evaluating";
export type MoralSpeakRetryMode = "none" | "rerecord" | "retranscribe" | "reevaluate" | "reapprove";
export type MoralSpeakFailureCode =
  | "microphone_permission"
  | "microphone_unavailable"
  | "recording_failed"
  | "recording_empty"
  | "audio_decode_failed"
  | "network_unavailable"
  | "speech_not_configured"
  | "asr_timeout"
  | "asr_upstream"
  | "asr_empty"
  | "asr_rejected";

export interface MoralSpeakViewState {
  stage: MoralSpeakStage;
  childId?: string;
  transcript?: string;
  summary?: string;
  result?: MoralEvaluationResult;
  reviewId?: string;
  adjusted?: boolean;
  manualTakeover?: boolean;
  handoffReady?: boolean;
  approving?: boolean;
  processingStep?: MoralSpeakProcessingStep;
  error?: string;
  errorCode?: MoralSpeakFailureCode;
  retryMode?: MoralSpeakRetryMode;
  previousChildName?: string;
}

const failurePresentations: Record<MoralSpeakFailureCode, { message: string; retryMode: MoralSpeakRetryMode }> = {
  microphone_permission: { message: "请允许麦克风后再试", retryMode: "rerecord" },
  microphone_unavailable: { message: "这台设备还不能录音", retryMode: "rerecord" },
  recording_failed: { message: "录音中断，请再说一次", retryMode: "rerecord" },
  recording_empty: { message: "没听清，可以再说一次", retryMode: "rerecord" },
  audio_decode_failed: { message: "录音格式需要老师帮忙", retryMode: "rerecord" },
  network_unavailable: { message: "识别暂时没连上，请老师重试", retryMode: "retranscribe" },
  speech_not_configured: { message: "语音服务还没准备好", retryMode: "none" },
  asr_timeout: { message: "识别暂时没连上，请老师重试", retryMode: "retranscribe" },
  asr_upstream: { message: "识别暂时没连上，请老师重试", retryMode: "retranscribe" },
  asr_empty: { message: "没听清，可以再说一次", retryMode: "rerecord" },
  asr_rejected: { message: "录音没有识别成功，请再说一次", retryMode: "rerecord" },
};

export function getMoralSpeakFailurePresentation(code: MoralSpeakFailureCode) {
  return failurePresentations[code];
}

const retryLabels: Record<MoralSpeakRetryMode, string | undefined> = {
  none: undefined,
  rerecord: "再说一次",
  retranscribe: "重新识别",
  reevaluate: "重试判断",
  reapprove: "重试点亮",
};

export function getMoralSpeakRetryLabel(mode?: MoralSpeakRetryMode) {
  return mode ? retryLabels[mode] : undefined;
}

export function createMoralSpeakManualFallback(): MoralEvaluationResult {
  return {
    intent: "needs_clarification",
    xpDelta: 0,
    confidence: 0,
    status: "manual_fallback",
    reasonForChild: "请老师帮助记录这次成长。",
    reasonForTeacher: "语音流程未完成，请老师补充原话并选择成长能量。",
    riskFlags: ["teacher_takeover_required"],
  };
}

export function createMoralSpeakManualTakeoverState(current: MoralSpeakViewState, childId: string): MoralSpeakViewState {
  const transcript = current.transcript ?? "";
  return {
    ...current,
    stage: "pendingReview",
    childId,
    transcript,
    summary: "老师接管",
    result: current.result ?? createMoralSpeakManualFallback(),
    manualTakeover: !transcript.trim(),
    approving: false,
    error: undefined,
    errorCode: undefined,
    retryMode: undefined,
  };
}

const lockedStages = new Set<MoralSpeakStage>(["ready", "listening", "recognizing", "pendingReview", "success"]);

export function nextMoralSpeakSessionId(current: number) {
  return current + 1;
}

export function getMoralSpeakLockedChildId(state: MoralSpeakViewState) {
  return lockedStages.has(state.stage) || isMoralApprovalReplayLocked(state) ? state.childId : undefined;
}

export function isMoralSpeakSessionActive(input: {
  currentSessionId: number;
  expectedSessionId: number;
  state: MoralSpeakViewState;
  childId?: string;
}) {
  return (
    input.currentSessionId === input.expectedSessionId &&
    input.state.stage !== "idle" &&
    (!input.childId || input.state.childId === input.childId)
  );
}

export function isCurrentMoralApprovalTarget(state: MoralSpeakViewState, childId: string, reviewId?: string) {
  const approvalStage = state.stage === "pendingReview" || (state.stage === "error" && state.retryMode === "reapprove");
  return approvalStage && state.childId === childId && state.reviewId === reviewId;
}

export function isMoralApprovalReplayLocked(state: MoralSpeakViewState) {
  return state.stage === "error" && state.retryMode === "reapprove";
}

export function createMoralApprovalOperation(
  state: MoralSpeakViewState,
  operatorChildId: string,
  operationId: string,
): Readonly<LedgerRecordInput> | undefined {
  if (!state.result || !state.childId || !canApproveMoralGrowth(state.result)) return undefined;
  return Object.freeze({
    childId: state.childId,
    operatorChildId,
    operatorRole: "teacher",
    delta: state.result.xpDelta,
    source: "dialogue-agent",
    category: state.result.category,
    reason: `自助成长：${state.transcript?.trim() || "老师接管成长记录"}`,
    aiSuggested: true,
    reviewStatus: "approved",
    reviewId: state.reviewId,
    teacherAdjustedReview: state.adjusted === true,
    operationId,
  });
}

export function getMoralSpeakSummary(result: MoralEvaluationResult, fallback: string) {
  if (!canApproveMoralGrowth(result)) return "请老师帮忙";
  return fallback || `${getChildEnergyLabel(result.category)}能量`;
}
