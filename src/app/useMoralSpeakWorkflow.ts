/**
 * [INPUT]: 依赖 moralRecorder、speechDiagnostics、classroomApi、德育规则、课堂数据会话写入能力、地图控制句柄和开发期 QA 录音窗口。
 * [OUTPUT]: 对外提供 useMoralSpeakWorkflow，返回分阶段恢复、老师接管、冻结载荷与退出锁定的幂等点亮重试、用户动作和 QA 控制面。
 * [POS]: app 的说成长会话深 Module，独占录音资源、session ID、审批载荷、审批锁与状态转换。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { blobToBase64, getMoralRecorderSettings, prepareMoralAudioForTranscription } from "../browser/moralRecorder";
import { finishSpeechDiagnostic, startSpeechDiagnostic, updateSpeechDiagnostic } from "../browser/speechDiagnostics";
import type { PixiWorldMapHandle } from "../components/WorldMap/PixiWorldMap";
import { UncertainClassroomWriteError, type SyncStatus } from "../domain/appState";
import type { GrowthFeedback } from "../domain/growthFeedback";
import { evaluateMoralText } from "../domain/moralAgent";
import {
  createMoralApprovalOperation,
  createMoralSpeakManualTakeoverState,
  getMoralSpeakLockedChildId,
  getMoralSpeakFailurePresentation,
  getMoralSpeakSummary,
  isCurrentMoralApprovalTarget,
  isMoralApprovalReplayLocked,
  isMoralSpeakSessionActive,
  nextMoralSpeakSessionId,
  type MoralSpeakViewState,
  type MoralSpeakFailureCode,
} from "../domain/moralSpeakSession";
import { canApproveMoralGrowth } from "../domain/virtueEnergy";
import {
  evaluateMoralRecord,
  isClassroomApiError,
  isClassroomAvailabilityFailure,
  isDefiniteClassroomUnavailable,
  rejectMoralReview,
  transcribeSpeech,
} from "../services/classroomApi";
import type {
  ChildWithProgress,
  ClassroomSnapshot,
  LedgerRecordInput,
  MoralAgentResponse,
  MoralEvaluationResult,
  MoralReviewItem,
  VirtueCategory,
} from "../types";

interface MoralSpeakWorkflowInput {
  applySnapshot: (snapshot: ClassroomSnapshot) => boolean;
  children: ChildWithProgress[];
  clearFeedback: () => void;
  commitLedger: (input: LedgerRecordInput, options?: { replayUncertainWrite?: boolean }) => Promise<void>;
  commitLocalMoralReviews: (update: (current: MoralReviewItem[]) => MoralReviewItem[], expectedAuthority: "server" | "local") => boolean;
  markServerWriteUncertain: () => void;
  selectedChild: ChildWithProgress;
  setLastEvaluation: Dispatch<SetStateAction<MoralEvaluationResult | undefined>>;
  setMoralReviews: Dispatch<SetStateAction<MoralReviewItem[]>>;
  setSelectedChildId: Dispatch<SetStateAction<string>>;
  setSyncStatus: Dispatch<SetStateAction<SyncStatus>>;
  settleServerRequest: () => boolean;
  showFeedback: (feedback: Omit<GrowthFeedback, "id">) => void;
  syncStatus: SyncStatus;
  worldMapRef: RefObject<PixiWorldMapHandle | null>;
}
interface MoralSpeakQaWindow extends Window {
  __growthIslandForceMoralMicErrorForQa?: boolean;
  __growthIslandMoralAutoStopMsForQa?: number;
}

const moralAutoStopMs = 5_500;

function getMoralAutoStopMs() {
  const requestedMs = (window as MoralSpeakQaWindow).__growthIslandMoralAutoStopMsForQa;
  if (!import.meta.env.DEV || typeof requestedMs !== "number" || !Number.isFinite(requestedMs)) return moralAutoStopMs;
  return Math.min(60_000, Math.max(moralAutoStopMs, requestedMs));
}

export function useMoralSpeakWorkflow(input: MoralSpeakWorkflowInput) {
  const [state, setState] = useState<MoralSpeakViewState>({ stage: "idle" });
  const stateRef = useRef(state);
  stateRef.current = state;
  const timersRef = useRef<number[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingChildRef = useRef<ChildWithProgress | null>(null);
  const recordingFormatRef = useRef("webm");
  const recordingCancelledRef = useRef(false);
  const approvingRef = useRef(false);
  const sessionRef = useRef(0);
  const approvalOperationIdRef = useRef(crypto.randomUUID());
  const approvalPayloadRef = useRef<Readonly<LedgerRecordInput> | undefined>(undefined);
  const diagnosticAttemptRef = useRef<string | undefined>(undefined);
  const retryAudioRef = useRef<{
    child: ChildWithProgress;
    audioBase64: string;
    voiceFormat: string;
    attemptId?: string;
  } | undefined>(undefined);
  const clearRecordedAudio = () => {
    retryAudioRef.current = undefined;
  };

  const classifySpeechFailure = (error: unknown, fallback: MoralSpeakFailureCode): MoralSpeakFailureCode => {
    if (isClassroomApiError(error)) {
      const knownCodes = new Set<MoralSpeakFailureCode>([
        "speech_not_configured",
        "asr_timeout",
        "asr_upstream",
        "asr_empty",
        "asr_rejected",
      ]);
      if (knownCodes.has(error.code as MoralSpeakFailureCode)) return error.code as MoralSpeakFailureCode;
    }
    if (error instanceof TypeError) return "network_unavailable";
    return fallback;
  };

  const setSpeechFailure = (childId: string, code: MoralSpeakFailureCode, retryCount = 0) => {
    const presentation = getMoralSpeakFailurePresentation(code);
    const retryMode = retryCount >= 1 && presentation.retryMode === "retranscribe" ? "rerecord" : presentation.retryMode;
    if (retryMode !== "retranscribe") clearRecordedAudio();
    updateSpeechDiagnostic(diagnosticAttemptRef.current, { outcome: "error", failureCode: code, retryCount });
    setState({
      stage: "error",
      childId,
      error: retryMode === "rerecord" && retryCount >= 1 ? "识别还是没连上，请再说一次" : presentation.message,
      errorCode: code,
      retryMode,
    });
  };

  const clearTimers = () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };
  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopRecording = (cancel = false) => {
    clearTimers();
    if (cancel) recordingCancelledRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }
    stopTracks();
  };

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== timer);
      callback();
    }, delay);
    timersRef.current.push(timer);
  };

  const beginSession = () => {
    approvalOperationIdRef.current = crypto.randomUUID();
    approvalPayloadRef.current = undefined;
    sessionRef.current = nextMoralSpeakSessionId(sessionRef.current);
    return sessionRef.current;
  };

  const invalidateSession = () => {
    sessionRef.current = nextMoralSpeakSessionId(sessionRef.current);
  };
  const isSessionActive = (sessionId: number, childId?: string) =>
    isMoralSpeakSessionActive({
      currentSessionId: sessionRef.current,
      expectedSessionId: sessionId,
      state: stateRef.current,
      childId,
    });

  const isApprovalTarget = (childId: string, reviewId?: string) =>
    isCurrentMoralApprovalTarget(stateRef.current, childId, reviewId);

  const prepare = (childId: string) => {
    if (isMoralApprovalReplayLocked(stateRef.current)) return;
    beginSession();
    clearTimers();
    stopRecording(true);
    approvingRef.current = false;
    clearRecordedAudio();
    input.clearFeedback();
    setState({ stage: "ready", childId });
  };

  const guardSelection = (childId: string) => {
    const lockedChildId = getMoralSpeakLockedChildId(stateRef.current);
    if (!lockedChildId || childId === lockedChildId) return false;
    const activeChild = input.children.find((item) => item.id === lockedChildId) ?? input.selectedChild;
    input.setSelectedChildId(activeChild.id);
    input.worldMapRef.current?.focusSelected();
    input.showFeedback({
      kind: "status",
      tone: "neutral",
      title: `${activeChild.name} 正在说成长`,
      detail: "先完成这一位，再点下一位",
      childName: activeChild.name,
    });
    return true;
  };

  const reset = (options: { focusIsland?: boolean; force?: boolean } = {}) => {
    if (isMoralApprovalReplayLocked(stateRef.current) && !options.force) return;
    invalidateSession();
    clearTimers();
    stopRecording(true);
    approvingRef.current = false;
    clearRecordedAudio();
    if (diagnosticAttemptRef.current) finishSpeechDiagnostic(diagnosticAttemptRef.current, "cancelled");
    diagnosticAttemptRef.current = undefined;
    setState({ stage: "idle" });
    if (options.focusIsland ?? true) input.worldMapRef.current?.focusFullIsland();
  };

  const returnToIslandIdle = (handoff?: { childId: string; childName: string }) => {
    reset({ focusIsland: true });
    if (handoff) setState({ stage: "idle", childId: handoff.childId, previousChildName: handoff.childName, handoffReady: true });
    schedule(() => input.worldMapRef.current?.focusFullIsland(), 140);
  };

  const selectFromDock = (childId: string) => {
    if (guardSelection(childId)) return;
    if (childId === input.selectedChild.id) {
      input.worldMapRef.current?.focusSelected();
      prepare(childId);
      return;
    }
    input.setSelectedChildId(childId);
    prepare(childId);
  };

  const selectFromMap = (childId: string) => {
    if (guardSelection(childId)) return;
    input.setSelectedChildId(childId);
    prepare(childId);
  };

  const selectNext = (childId: string) => {
    if (stateRef.current.stage !== "success") return selectFromDock(childId);
    reset({ focusIsland: false });
    input.setSelectedChildId(childId);
    prepare(childId);
  };

  const submitDialogue = async (text: string) => {
    if (input.syncStatus === "unavailable") throw new Error("课堂数据暂不可用");
    if (input.syncStatus !== "offline") {
      input.setSyncStatus("saving");
      let response: MoralAgentResponse | undefined;
      try {
        response = await evaluateMoralRecord({
          childId: input.selectedChild.id,
          operatorChildId: input.selectedChild.id,
          transcript: text,
          operationId: crypto.randomUUID(),
        });
      } catch (error) {
        if (isDefiniteClassroomUnavailable(error)) {
          // 明确在写入前不可用，可以安全进入本机规则。
        } else if (isClassroomAvailabilityFailure(error)) {
          input.markServerWriteUncertain();
          throw error;
        } else {
          input.settleServerRequest();
          throw error;
        }
      }
      if (response) {
        if (!input.applySnapshot(response.snapshot)) throw new Error("课堂数据来源已切换，本次结果未确认，请重新提交");
        input.setLastEvaluation(response.result);
        return response.result;
      }
    }

    const result = evaluateMoralText(text);
    input.setLastEvaluation(result);
    const review: MoralReviewItem = {
      id: crypto.randomUUID(),
      childId: input.selectedChild.id,
      operatorChildId: input.selectedChild.id,
      transcript: text,
      result,
      status: "pending_review",
      createdAt: new Date().toISOString(),
      operationId: crypto.randomUUID(),
    };
    if (!input.commitLocalMoralReviews((current) => [review, ...current], input.syncStatus === "offline" ? "local" : "server")) throw new Error("本机课堂数据保存失败");
    return result;
  };

  const finishWithTranscript = async (
    child: ChildWithProgress,
    transcript: string,
    summary: string | undefined,
    sessionId: number,
  ) => {
    if (!isSessionActive(sessionId, child.id)) return;
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript) {
      setState({ stage: "error", childId: child.id, error: "没听清，可以再说一次", retryMode: "rerecord" });
      return;
    }
    setState({ stage: "recognizing", childId: child.id, transcript: cleanTranscript, processingStep: "evaluating" });

    if (input.syncStatus === "unavailable") {
      setState({ stage: "error", childId: child.id, transcript: cleanTranscript, error: "课堂数据暂不可用，请老师先恢复备份", retryMode: "none" });
      return;
    }
    if (input.syncStatus !== "offline") {
      input.setSyncStatus("saving");
      const operationId = crypto.randomUUID();
      try {
        const response = await evaluateMoralRecord({ childId: child.id, operatorChildId: child.id, transcript: cleanTranscript, operationId });
        if (!isSessionActive(sessionId, child.id)) {
          const rejectionOperationId = crypto.randomUUID();
          try {
            const snapshot = await rejectMoralReview(response.reviewItem.id, child.id, "已取消", rejectionOperationId);
            input.applySnapshot(snapshot);
          } catch (error) {
            if (isDefiniteClassroomUnavailable(error)) {
              input.commitLocalMoralReviews(() =>
                (response.snapshot.moralReviews ?? []).map((review) => review.id === response.reviewItem.id
                  ? { ...review, status: "rejected", rejectionReason: "已取消", rejectionOperationId }
                  : review), "server",
              );
            } else if (isClassroomAvailabilityFailure(error)) input.markServerWriteUncertain();
            else input.settleServerRequest();
          }
          return;
        }
        input.setLastEvaluation(response.result);
        if (!input.applySnapshot(response.snapshot)) {
          setState({ stage: "error", childId: child.id, transcript: cleanTranscript, error: "课堂数据来源已切换，请重新开始", retryMode: "none" });
          return;
        }
        input.setSelectedChildId(child.id);
        input.clearFeedback();
        setState({
          stage: "pendingReview",
          childId: child.id,
          transcript: cleanTranscript,
          summary: getMoralSpeakSummary(response.result, summary ?? cleanTranscript.slice(0, 8)),
          result: response.result,
          reviewId: response.reviewItem.id,
        });
        return;
      } catch (error) {
        if (isDefiniteClassroomUnavailable(error)) {
          // 明确未进入课堂写事务，下面安全写入本机复核。
        } else if (isClassroomAvailabilityFailure(error)) {
          input.markServerWriteUncertain();
          setState({ stage: "error", childId: child.id, transcript: cleanTranscript, error: "保存结果待确认，请老师检查服务后刷新", retryMode: "none" });
          return;
        } else {
          input.settleServerRequest();
          setState({ stage: "error", childId: child.id, transcript: cleanTranscript, error: "成长判断未完成，请老师重试", retryMode: "reevaluate" });
          return;
        }
      }
    }

    if (!isSessionActive(sessionId, child.id)) return;
    const result = evaluateMoralText(cleanTranscript);
    input.setLastEvaluation(result);
    const review: MoralReviewItem = {
      id: crypto.randomUUID(),
      childId: child.id,
      operatorChildId: child.id,
      transcript: cleanTranscript,
      result,
      status: "pending_review",
      createdAt: new Date().toISOString(),
      operationId: crypto.randomUUID(),
    };
    if (!input.commitLocalMoralReviews((current) => [review, ...current], input.syncStatus === "offline" ? "local" : "server")) {
      setState({ stage: "error", childId: child.id, transcript: cleanTranscript, result, error: "本机保存失败，请老师先导出数据", retryMode: "none" });
      return;
    }
    input.clearFeedback();
    setState({
      stage: "pendingReview",
      childId: child.id,
      transcript: cleanTranscript,
      summary: getMoralSpeakSummary(result, summary ?? cleanTranscript.slice(0, 8)),
      result,
      reviewId: review.id,
    });
  };

  const recognizePreparedAudio = async (
    child: ChildWithProgress,
    audioBase64: string,
    voiceFormat: string,
    sessionId: number,
    retryCount: number,
    attemptId?: string,
  ) => {
    if (!isSessionActive(sessionId, child.id)) return;
    setState({ stage: "recognizing", childId: child.id, processingStep: "transcribing" });
    updateSpeechDiagnostic(attemptId, { outcome: "recognizing", retryCount });
    const startedAt = performance.now();
    try {
      const response = await transcribeSpeech({ audioBase64, voiceFormat });
      if (!isSessionActive(sessionId, child.id)) return;
      updateSpeechDiagnostic(attemptId, { asrMs: Math.round(performance.now() - startedAt) });
      await finishWithTranscript(child, response.text, undefined, sessionId);
      if (isSessionActive(sessionId, child.id) && stateRef.current.stage !== "error") {
        updateSpeechDiagnostic(attemptId, { outcome: "pending_review" });
      }
    } catch (error) {
      if (isSessionActive(sessionId, child.id)) {
        updateSpeechDiagnostic(attemptId, { asrMs: Math.round(performance.now() - startedAt) });
        setSpeechFailure(child.id, classifySpeechFailure(error, "asr_upstream"), retryCount);
      }
    }
  };

  const processRecordedAudio = async (child: ChildWithProgress, blob: Blob, voiceFormat: string, sessionId: number) => {
    if (!isSessionActive(sessionId, child.id)) return;
    try {
      const prepared = await prepareMoralAudioForTranscription(blob, voiceFormat);
      const audioBase64 = await blobToBase64(prepared.blob);
      if (!isSessionActive(sessionId, child.id)) return;
      updateSpeechDiagnostic(diagnosticAttemptRef.current, {
        sourceVoiceFormat: prepared.sourceVoiceFormat,
        preparedVoiceFormat: prepared.voiceFormat,
        sourceBytes: prepared.sourceBytes,
        preparedBytes: prepared.preparedBytes,
        transcodeMs: prepared.transcodeMs,
      });
      retryAudioRef.current = {
        child,
        audioBase64,
        voiceFormat: prepared.voiceFormat,
        attemptId: diagnosticAttemptRef.current,
      };
      await recognizePreparedAudio(child, audioBase64, prepared.voiceFormat, sessionId, 0, diagnosticAttemptRef.current);
    } catch (error) {
      if (isSessionActive(sessionId, child.id)) {
        setSpeechFailure(child.id, classifySpeechFailure(error, "audio_decode_failed"));
      }
    }
  };

  const finishQaRecognition = (child: ChildWithProgress, transcript: string, summary: string) => {
    const result = evaluateMoralText(transcript);
    input.setLastEvaluation(result);
    const review: MoralReviewItem = {
      id: crypto.randomUUID(),
      childId: child.id,
      operatorChildId: child.id,
      transcript,
      result,
      status: "pending_review",
      createdAt: new Date().toISOString(),
    };
    if (!input.commitLocalMoralReviews((current) => [review, ...current], input.syncStatus === "offline" ? "local" : "server")) return;
    input.clearFeedback();
    setState({
      stage: "pendingReview",
      childId: child.id,
      transcript,
      summary: getMoralSpeakSummary(result, summary),
      result,
      reviewId: review.id,
    });
  };

  const start = async () => {
    clearTimers();
    approvingRef.current = false;
    const child = input.children.find((item) => item.id === state.childId) ?? input.selectedChild;
    const sessionId = sessionRef.current;
    if (!isSessionActive(sessionId, child.id)) return;
    input.setSelectedChildId(child.id);

    const qaWindow = window as MoralSpeakQaWindow;
    if (import.meta.env.DEV && qaWindow.__growthIslandForceMoralMicErrorForQa) {
      setSpeechFailure(child.id, "microphone_unavailable");
      return;
    }
    const settings = getMoralRecorderSettings();
    if (!settings || !navigator.mediaDevices?.getUserMedia) {
      setSpeechFailure(child.id, "microphone_unavailable");
      return;
    }

    try {
      diagnosticAttemptRef.current = startSpeechDiagnostic(child.id, settings.mimeType, settings.voiceFormat);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isSessionActive(sessionId, child.id)) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, settings.mimeType ? { mimeType: settings.mimeType } : undefined);
      recordingCancelledRef.current = false;
      recorderRef.current = recorder;
      streamRef.current = stream;
      recordingChildRef.current = child;
      recordingFormatRef.current = settings.voiceFormat;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        stopTracks();
        if (isSessionActive(sessionId, child.id)) {
          setSpeechFailure(child.id, "recording_failed");
        }
      };
      recorder.onstop = () => {
        stopTracks();
        recorderRef.current = null;
        if (recordingCancelledRef.current) {
          recordingCancelledRef.current = false;
          recordingChildRef.current = null;
          return;
        }
        const recordedChild = recordingChildRef.current ?? child;
        recordingChildRef.current = null;
        if (!isSessionActive(sessionId, recordedChild.id)) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || settings.mimeType || "audio/webm" });
        if (blob.size === 0) {
          setSpeechFailure(recordedChild.id, "recording_empty");
          return;
        }
        void processRecordedAudio(recordedChild, blob, recordingFormatRef.current, sessionId);
      };
      if (!isSessionActive(sessionId, child.id)) {
        stopTracks();
        return;
      }
      setState({ stage: "listening", childId: child.id });
      recorder.start();
      schedule(stopRecording, getMoralAutoStopMs());
    } catch (error) {
      stopTracks();
      if (isSessionActive(sessionId, child.id)) {
        const errorName = error instanceof Error ? error.name : "";
        setSpeechFailure(
          child.id,
          errorName === "NotAllowedError" || errorName === "SecurityError" ? "microphone_permission" : "microphone_unavailable",
        );
      }
    }
  };

  const rejectCurrentReview = (reason: string) => {
    if (approvingRef.current) return;
    const reviewId = state.reviewId;
    if (!reviewId) return;
    if (input.syncStatus === "unavailable") return;
    const operationId = crypto.randomUUID();
    const updateReviews = (current: MoralReviewItem[]): MoralReviewItem[] =>
      current.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              status: "rejected",
              reviewedAt: new Date().toISOString(),
              reviewedByChildId: input.selectedChild.id,
              rejectionReason: reason,
              rejectionOperationId: operationId,
            }
          : review,
      );
    if (input.syncStatus === "offline") {
      input.commitLocalMoralReviews(updateReviews, "local");
      return;
    }
    input.setSyncStatus("saving");
    rejectMoralReview(reviewId, input.selectedChild.id, reason, operationId)
      .then((snapshot) => { input.applySnapshot(snapshot); })
      .catch((error) => {
        if (isDefiniteClassroomUnavailable(error)) input.commitLocalMoralReviews(updateReviews, "server");
        else if (isClassroomAvailabilityFailure(error)) input.markServerWriteUncertain();
        else input.settleServerRequest();
      });
  };

  const retry = () => {
    if (approvingRef.current) return;
    const childId = state.childId ?? input.selectedChild.id;
    const cachedAudio = retryAudioRef.current;
    if (state.stage === "error" && state.retryMode === "reapprove") {
      void approve();
      return;
    }
    if (state.stage === "error" && state.retryMode === "reevaluate" && state.transcript) {
      const child = input.children.find((item) => item.id === childId) ?? input.selectedChild;
      const sessionId = beginSession();
      input.setSelectedChildId(childId);
      void finishWithTranscript(child, state.transcript, state.summary, sessionId);
      return;
    }
    if (state.stage === "error" && state.retryMode === "retranscribe" && cachedAudio?.child.id === childId) {
      const sessionId = beginSession();
      input.setSelectedChildId(childId);
      void recognizePreparedAudio(
        cachedAudio.child,
        cachedAudio.audioBase64,
        cachedAudio.voiceFormat,
        sessionId,
        1,
        cachedAudio.attemptId,
      );
      return;
    }
    beginSession();
    stopRecording(true);
    approvingRef.current = false;
    clearRecordedAudio();
    if (state.stage === "pendingReview") rejectCurrentReview("补说");
    input.setSelectedChildId(childId);
    setState({ stage: "ready", childId });
  };

  async function approve() {
    const approvalState = stateRef.current;
    if (!approvalState.result || !approvalState.childId || !canApproveMoralGrowth(approvalState.result)) return;
    if (!isCurrentMoralApprovalTarget(approvalState, approvalState.childId, approvalState.reviewId)) return;
    if (approvingRef.current) return;
    const result = approvalState.result;
    const childId = approvalState.childId;
    const reviewId = approvalState.reviewId;
    const replaying = isMoralApprovalReplayLocked(approvalState);
    const operation = replaying
      ? approvalPayloadRef.current
      : createMoralApprovalOperation(approvalState, input.selectedChild.id, approvalOperationIdRef.current);
    if (!operation) return;
    if (!replaying) approvalPayloadRef.current = operation;
    approvingRef.current = true;
    clearTimers();
    const completedChild = input.children.find((child) => child.id === childId) ?? input.selectedChild;
    setState((current) => (isApprovalTarget(childId, reviewId) ? { ...current, approving: true } : current));

    try {
      await input.commitLedger(operation, { replayUncertainWrite: replaying });
    } catch (error) {
      if (!isApprovalTarget(childId, reviewId)) {
        approvingRef.current = false;
        return;
      }
      approvingRef.current = false;
      const uncertainWrite = error instanceof UncertainClassroomWriteError;
      setState((current) =>
        isApprovalTarget(childId, reviewId)
          ? { ...current, stage: "error", approving: false, error: uncertainWrite ? "成长账本暂未写入，请重试点亮" : "成长账本未写入，可关闭后刷新确认", retryMode: uncertainWrite ? "reapprove" : "none" }
          : current,
      );
      return;
    }
    if (!isApprovalTarget(childId, reviewId)) {
      approvingRef.current = false;
      return;
    }
    if (reviewId) {
      input.setMoralReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? { ...review, status: "approved", reviewedAt: new Date().toISOString(), reviewedByChildId: input.selectedChild.id }
            : review,
        ),
      );
    }
    approvalPayloadRef.current = undefined;
    const committedResult = { ...result, category: operation.category, xpDelta: operation.delta as MoralEvaluationResult["xpDelta"] };
    setState((current) =>
      isApprovalTarget(childId, reviewId)
        ? { ...current, stage: "success", approving: false, result: committedResult, previousChildName: completedChild.name }
        : current,
    );
    finishSpeechDiagnostic(diagnosticAttemptRef.current, "approved");
    diagnosticAttemptRef.current = undefined;
    clearRecordedAudio();
    input.clearFeedback();
    schedule(() => {
      approvingRef.current = false;
      returnToIslandIdle({ childId, childName: completedChild.name });
      schedule(() => {
        input.showFeedback({
          kind: "status",
          tone: "neutral",
          title: "请下一位点精灵",
          detail: "点自己的精灵就能继续",
          childName: completedChild.name,
        });
      }, 0);
    }, 1100);
  }

  const takeover = () => {
    if (approvingRef.current || isMoralApprovalReplayLocked(stateRef.current)) return;
    const childId = state.childId ?? input.selectedChild.id;
    clearTimers();
    stopRecording(true);
    input.setSelectedChildId(childId);
    setState((current) => createMoralSpeakManualTakeoverState(current, childId));
  };

  const updateTranscript = (transcript: string) => {
    if (isMoralApprovalReplayLocked(stateRef.current)) return;
    setState((current) => current.manualTakeover ? { ...current, transcript } : current);
  };

  const adjust = (category: VirtueCategory, delta: 10 | 20 | 30) => {
    if (approvingRef.current || isMoralApprovalReplayLocked(stateRef.current)) return;
    setState((current) => {
      if (!current.result) return current;
      const result = {
        ...current.result,
        category,
        confidence: Math.max(current.result.confidence, 0.6),
        xpDelta: delta,
        intent: "reward" as const,
        status: "pending_review" as const,
      };
      if (current.reviewId) {
        input.setMoralReviews((reviews) =>
          reviews.map((review) => (review.id === current.reviewId ? { ...review, result } : review)),
        );
      }
      return { ...current, result, adjusted: true };
    });
  };

  const respeak = () => {
    if (approvingRef.current || isMoralApprovalReplayLocked(stateRef.current)) return;
    beginSession();
    clearTimers();
    stopRecording(true);
    clearRecordedAudio();
    rejectCurrentReview("补说");
    const childId = state.childId ?? input.selectedChild.id;
    input.setSelectedChildId(childId);
    setState({ stage: "ready", childId });
  };

  const skip = () => {
    if (approvingRef.current || isMoralApprovalReplayLocked(stateRef.current)) return;
    clearTimers();
    stopRecording(true);
    rejectCurrentReview("跳过这位");
    returnToIslandIdle();
  };

  const defer = () => {
    if (approvingRef.current || isMoralApprovalReplayLocked(stateRef.current)) return;
    const child = state.childId ? input.children.find((item) => item.id === state.childId) : undefined;
    reset({ focusIsland: true });
    if (state.stage === "pendingReview" && child) {
      input.showFeedback({ kind: "status", tone: "neutral", title: "已放回老师待办", detail: `${child.name} 稍后再看`, childName: child.name });
      return;
    }
    if (child) {
      input.showFeedback({ kind: "status", tone: "neutral", title: `${child.name} 稍后再说`, detail: "流程已收起", childName: child.name });
    }
  };

  const qaFinish = (child: ChildWithProgress, transcript: string, summary?: string, delayMs = 0) => {
    const sessionId = sessionRef.current;
    if (!isSessionActive(sessionId, child.id)) return false;
    window.setTimeout(() => void finishWithTranscript(child, transcript, summary, sessionId), Math.max(0, delayMs));
    return true;
  };

  const qaSetRecognizing = (child: ChildWithProgress) => {
    clearTimers();
    stopRecording(true);
    approvingRef.current = false;
    input.clearFeedback();
    input.setSelectedChildId(child.id);
    setState({ stage: "recognizing", childId: child.id });
    return true;
  };
  useEffect(() => () => { clearTimers(); stopRecording(true); }, []);

  return {
    state,
    actions: { adjust, approve, defer, prepare, reset, respeak, retry, selectFromDock, selectFromMap, selectNext, skip, start, stop: stopRecording, submitDialogue, takeover, updateTranscript },
    guardSelection,
    qa: {
      finish: qaFinish,
      setRecognizing: qaSetRecognizing,
      startReview: (child: ChildWithProgress, transcript: string, summary: string) => {
        beginSession();
        clearTimers();
        approvingRef.current = false;
        input.setSelectedChildId(child.id);
        finishQaRecognition(child, transcript, summary);
        return true;
      },
    },
  };
}
