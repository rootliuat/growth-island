/**
 * [INPUT]: 依赖浏览器 location/window 与说成长流程提供的脱敏阶段指标。
 * [OUTPUT]: 对外提供真实麦克风诊断尝试的开始、更新和完成 Adapter。
 * [POS]: browser 的人工试教证据边界，仅在 qa=real-mic 时向 window 暴露无音频、无全文指标。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { MoralSpeakFailureCode } from "../domain/moralSpeakSession";

export interface SpeechDiagnosticAttempt {
  id: string;
  childId: string;
  startedAt: string;
  finishedAt?: string;
  outcome: "recording" | "recognizing" | "pending_review" | "approved" | "error" | "cancelled";
  recorderMimeType?: string;
  sourceVoiceFormat?: string;
  preparedVoiceFormat?: string;
  sourceBytes?: number;
  preparedBytes?: number;
  transcodeMs?: number;
  asrMs?: number;
  retryCount: number;
  failureCode?: MoralSpeakFailureCode;
}

interface SpeechDiagnosticsState {
  version: 1;
  attempts: SpeechDiagnosticAttempt[];
}

type SpeechDiagnosticsWindow = Window & { __growthIslandSpeechDiagnostics?: SpeechDiagnosticsState };

function getState() {
  if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("qa") !== "real-mic") return undefined;
  const diagnosticWindow = window as SpeechDiagnosticsWindow;
  diagnosticWindow.__growthIslandSpeechDiagnostics ??= { version: 1, attempts: [] };
  return diagnosticWindow.__growthIslandSpeechDiagnostics;
}

export function startSpeechDiagnostic(childId: string, recorderMimeType: string | undefined, sourceVoiceFormat: string) {
  const state = getState();
  if (!state) return undefined;
  const attempt: SpeechDiagnosticAttempt = {
    id: crypto.randomUUID(),
    childId,
    startedAt: new Date().toISOString(),
    outcome: "recording",
    recorderMimeType,
    sourceVoiceFormat,
    retryCount: 0,
  };
  state.attempts.push(attempt);
  state.attempts = state.attempts.slice(-20);
  return attempt.id;
}

export function updateSpeechDiagnostic(id: string | undefined, patch: Partial<SpeechDiagnosticAttempt>) {
  if (!id) return;
  const attempt = getState()?.attempts.find((item) => item.id === id);
  if (attempt) Object.assign(attempt, patch);
}

export function finishSpeechDiagnostic(
  id: string | undefined,
  outcome: "approved" | "cancelled" | "error",
  failureCode?: MoralSpeakFailureCode,
) {
  updateSpeechDiagnostic(id, { outcome, failureCode, finishedAt: new Date().toISOString() });
}
