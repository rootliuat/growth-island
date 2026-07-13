/**
 * [INPUT]: 依赖 virtueEnergy 的可审批判断，依赖 types 的德育评估结果。
 * [OUTPUT]: 对外提供 MoralSpeakViewState、语音失败/重试语义和说成长 session 判定函数。
 * [POS]: domain 的儿童自助说成长状态 Module，被 App 与 HUD 渲染共同消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { MoralEvaluationResult } from "../types";
import { canApproveMoralGrowth, getChildEnergyLabel } from "./virtueEnergy";

export type MoralSpeakStage = "idle" | "ready" | "listening" | "recognizing" | "pendingReview" | "success" | "error";
export type MoralSpeakRetryMode = "none" | "rerecord" | "retranscribe";
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
  approving?: boolean;
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

const lockedStages = new Set<MoralSpeakStage>(["ready", "listening", "recognizing", "pendingReview", "success"]);

export function nextMoralSpeakSessionId(current: number) {
  return current + 1;
}

export function getMoralSpeakLockedChildId(state: MoralSpeakViewState) {
  return lockedStages.has(state.stage) ? state.childId : undefined;
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
  return state.stage === "pendingReview" && state.childId === childId && state.reviewId === reviewId;
}

export function getMoralSpeakSummary(result: MoralEvaluationResult, fallback: string) {
  if (!canApproveMoralGrowth(result)) return "请老师帮忙";
  return fallback || `${getChildEnergyLabel(result.category)}能量`;
}
