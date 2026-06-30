/**
 * [INPUT]: 依赖 virtueEnergy 的可审批判断，依赖 types 的德育评估结果。
 * [OUTPUT]: 对外提供 MoralSpeakViewState 类型和说成长 session 判定函数。
 * [POS]: domain 的儿童自助说成长状态 Module，被 App 与 HUD 渲染共同消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { MoralEvaluationResult } from "../types";
import { canApproveMoralGrowth, getChildEnergyLabel } from "./virtueEnergy";

export type MoralSpeakStage = "idle" | "ready" | "listening" | "recognizing" | "pendingReview" | "success" | "error";

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
  previousChildName?: string;
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
