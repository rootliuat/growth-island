/**
 * [INPUT]: 依赖 moralRecorder、speechDiagnostics、classroomApi、德育规则、课堂数据会话写入能力、地图控制句柄和开发期 QA 录音窗口。
 * [OUTPUT]: 对外提供 useMoralSpeakWorkflow，返回说成长状态、同音频单次重试、用户动作、选择守卫和 QA 控制面。
 * [POS]: app 的说成长会话深 Module，独占录音资源、session ID、审批锁与状态转换。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { blobToBase64, getMoralRecorderSettings, prepareMoralAudioForTranscription } from "../browser/moralRecorder";
import { finishSpeechDiagnostic, startSpeechDiagnostic, updateSpeechDiagnostic } from "../browser/speechDiagnostics";
import type { PixiWorldMapHandle } from "../components/WorldMap/PixiWorldMap";
import type { SyncStatus } from "../domain/appState";
import type { GrowthFeedback } from "../domain/growthFeedback";
import { evaluateMoralText } from "../domain/moralAgent";
import {
  getMoralSpeakLockedChildId,
  getMoralSpeakFailurePresentation,
  getMoralSpeakSummary,
  isCurrentMoralApprovalTarget,
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
  MoralEvaluationResult,
  MoralReviewItem,
  VirtueCategory,
} from "../types";

interface MoralSpeakWorkflowInput {
  applySnapshot: (snapshot: ClassroomSnapshot) => boolean;
  children: ChildWithProgress[];
  clearFeedback: () => void;
  commitLedger: (input: LedgerRecordInput) => Promise<void>;
  commitLocalMoralReviews: (update: (current: MoralReviewItem[]) => MoralReviewItem[]) => boolean;
  markServerWriteUncertain: () => void;
  selectedChild: ChildWithProgress;
  setLastEvaluation: Dispatch<SetStateAction<MoralEvaluationResult | undefined>>;
  setMoralReviews: Dispatch<SetStateAction<MoralReviewItem[]>>;
  setSelectedChildId: Dispatch<SetStateAction<string>>;
  setSyncStatus: Dispatch<SetStateAction<SyncStatus>>;
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

  const reset = (options: { focusIsland?: boolean } = {}) => {
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

  const returnToIslandIdle = () => {
    reset({ focusIsland: true });
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

  const submitDialogue = async (text: string) => {
    if (input.syncStatus === "unavailable") throw new Error("课堂数据暂不可用");
    if (input.syncStatus !== "offline") {
      input.setSyncStatus("saving");
      const operationId = crypto.randomUUID();
      try {
        const response = await evaluateMoralRecord({
          childId: input.selectedChild.id,
          operatorChildId: input.selectedChild.id,
          transcript: text,
          operationId,
        });
        input.setLastEvaluation(response.result);
        if (!input.applySnapshot(response.snapshot)) throw new TypeError("课堂数据权威已变化");
        return response.result;
      } catch (error) {
        if (isDefiniteClassroomUnavailable(error)) {
          // 明确在写入前不可用，可以安全进入本机规则。
        } else if (isClassroomAvailabilityFailure(error)) {
          input.markServerWriteUncertain();
          throw error;
        } else {
          input.setSyncStatus("online");
          throw error;
        }
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
    if (!input.commitLocalMoralReviews((current) => [review, ...current])) throw new Error("本机课堂数据保存失败");
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
      setState({ stage: "error", childId: child.id, error: "没听清，可以再说一次" });
      return;
    }

    if (input.syncStatus === "unavailable") {
      setState({ stage: "error", childId: child.id, error: "课堂数据暂不可用，请老师先恢复备份" });
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
            if (!input.applySnapshot(snapshot)) input.markServerWriteUncertain();
          } catch (error) {
            if (isDefiniteClassroomUnavailable(error)) {
              input.commitLocalMoralReviews(() =>
                (response.snapshot.moralReviews ?? []).map((review) => review.id === response.reviewItem.id
                  ? { ...review, status: "rejected", rejectionReason: "已取消", rejectionOperationId }
                  : review),
              );
            } else if (isClassroomAvailabilityFailure(error)) input.markServerWriteUncertain();
            else input.setSyncStatus("online");
          }
          return;
        }
        input.setLastEvaluation(response.result);
        if (!input.applySnapshot(response.snapshot)) {
          input.markServerWriteUncertain();
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
          setState({ stage: "error", childId: child.id, error: "保存结果待确认，请老师检查服务后刷新" });
          return;
        } else {
          input.setSyncStatus("online");
          setState({ stage: "error", childId: child.id, error: "复核请求未通过，请老师检查后重试" });
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
    if (!input.commitLocalMoralReviews((current) => [review, ...current])) {
      setState({ stage: "error", childId: child.id, error: "本机保存失败，请老师先导出数据" });
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
    setState({ stage: "recognizing", childId: child.id });
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
    if (!input.commitLocalMoralReviews((current) => [review, ...current])) return;
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
      setState({ stage: "error", childId: child.id, error: "麦克风没准备好，请老师帮忙" });
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
      input.commitLocalMoralReviews(updateReviews);
      return;
    }
    input.setSyncStatus("saving");
    rejectMoralReview(reviewId, input.selectedChild.id, reason, operationId)
      .then((snapshot) => {
        if (!input.applySnapshot(snapshot)) input.markServerWriteUncertain();
      })
      .catch((error) => {
        if (isDefiniteClassroomUnavailable(error)) input.commitLocalMoralReviews(updateReviews);
        else if (isClassroomAvailabilityFailure(error)) input.markServerWriteUncertain();
        else input.setSyncStatus("online");
      });
  };

  const retry = () => {
    if (approvingRef.current) return;
    const childId = state.childId ?? input.selectedChild.id;
    const cachedAudio = retryAudioRef.current;
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

  const approve = async () => {
    if (state.stage !== "pendingReview" || !state.result || !state.childId || !canApproveMoralGrowth(state.result)) return;
    if (approvingRef.current) return;
    approvingRef.current = true;
    clearTimers();
    const result = state.result;
    const transcript = state.transcript ?? "孩子自助成长记录";
    const childId = state.childId;
    const reviewId = state.reviewId;
    const completedChild = input.children.find((child) => child.id === childId) ?? input.selectedChild;
    setState((current) => (isApprovalTarget(childId, reviewId) ? { ...current, approving: true } : current));

    try {
      await input.commitLedger({
        childId,
        operatorChildId: input.selectedChild.id,
        operatorRole: "teacher",
        delta: result.xpDelta,
        source: "dialogue-agent",
        category: result.category,
        reason: `自助成长：${transcript}`,
        aiSuggested: true,
        reviewStatus: "approved",
        reviewId,
        teacherAdjustedReview: state.adjusted === true,
      });
    } catch {
      if (!isApprovalTarget(childId, reviewId)) {
        approvingRef.current = false;
        return;
      }
      approvingRef.current = false;
      setState((current) =>
        isApprovalTarget(childId, reviewId)
          ? { ...current, stage: "error", approving: false, error: "请老师稍后再确认" }
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
    setState((current) =>
      isApprovalTarget(childId, reviewId)
        ? { ...current, stage: "success", approving: false, result, previousChildName: completedChild.name }
        : current,
    );
    finishSpeechDiagnostic(diagnosticAttemptRef.current, "approved");
    diagnosticAttemptRef.current = undefined;
    clearRecordedAudio();
    input.clearFeedback();
    schedule(() => {
      approvingRef.current = false;
      returnToIslandIdle();
      schedule(() => {
        input.showFeedback({
          kind: "status",
          tone: "neutral",
          title: "下一位可以点精灵",
          detail: "孩子自己选择精灵继续",
          childName: completedChild.name,
        });
      }, 0);
    }, 2400);
  };

  const adjust = (category: VirtueCategory, delta: 10 | 20 | 30) => {
    if (approvingRef.current) return;
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
    if (approvingRef.current) return;
    beginSession();
    clearTimers();
    stopRecording(true);
    approvingRef.current = false;
    clearRecordedAudio();
    rejectCurrentReview("补说");
    const childId = state.childId ?? input.selectedChild.id;
    input.setSelectedChildId(childId);
    setState({ stage: "ready", childId });
  };

  const skip = () => {
    if (approvingRef.current) return;
    clearTimers();
    stopRecording(true);
    approvingRef.current = false;
    rejectCurrentReview("跳过这位");
    returnToIslandIdle();
  };

  const defer = () => {
    if (approvingRef.current) return;
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

  useEffect(() => () => {
    clearTimers();
    stopRecording(true);
  }, []);

  return {
    state,
    actions: { adjust, approve, defer, prepare, reset, respeak, retry, selectFromDock, selectFromMap, skip, start, stop: stopRecording, submitDialogue },
    guardSelection,
    qa: {
      finish: qaFinish,
      setRecognizing: qaSetRecognizing,
      startReview: (child: ChildWithProgress, transcript: string, summary: string) => {
        clearTimers();
        approvingRef.current = false;
        input.setSelectedChildId(child.id);
        finishQaRecognition(child, transcript, summary);
        return true;
      },
    },
  };
}
