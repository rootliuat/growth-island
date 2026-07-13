/**
 * [INPUT]: 依赖 app 深 Module、domain 规则、地图句柄和本地课堂 API。
 * [OUTPUT]: 对外提供 Growth Island 应用根组件 App。
 * [POS]: src 的组合根，连接课堂数据会话、说成长会话、产品动作与 GrowthIslandView。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { activeModuleStorageKey, getInitialActiveModule } from "./browser/appStorage";
import { useClassroomSession } from "./app/useClassroomSession";
import { GrowthIslandView } from "./app/GrowthIslandView";
import { useGrowthIslandQaBridge } from "./app/useGrowthIslandQaBridge";
import { useGrowthFeedback } from "./app/useGrowthFeedback";
import { useMoralSpeakWorkflow } from "./app/useMoralSpeakWorkflow";
import { useSpiritAssetPreload } from "./app/useSpiritAssetPreload";
import { moduleConfigById, type AppModuleId } from "./components/modules/moduleConfig";
import type { PixiWorldMapHandle } from "./components/WorldMap/PixiWorldMap";
import { organizationConfig } from "./data/organization";
import type { LotteryPrize, ShopReward } from "./data/rewards";
import { spirits } from "./data/spirits";
import { createAppViewModel } from "./domain/appViewModel";
import { getShortFeedbackReason } from "./domain/growthFeedback";
import { evaluateMoralText } from "./domain/moralAgent";
import { createGrowthTaskLedgerInput, isGrowthTaskCompletionInCurrentCadence, publishCurriculumTrack } from "./domain/organization";
import { makeLedgerRecord } from "./domain/progression";
import { getSpiritAsset } from "./domain/spiritAssets";
import { canApproveMoralGrowth, getChildEnergyLabel } from "./domain/virtueEnergy";
import { approveMoralReview, createLedgerRecord, isClassroomAvailabilityFailure, isDefiniteClassroomUnavailable, patchChildProfile, rejectMoralReview, undoLedgerRecord } from "./services/classroomApi";
import type { ChildProfile, ChildWithProgress, LedgerRecordInput, LotteryDrawRecord, MoralEvaluationResult, SettingsChangeRecord, ShopRedemption, VirtueCategory } from "./types";

export function App() {
  const worldMapRef = useRef<PixiWorldMapHandle | null>(null);
  const homeFocusTimerRefs = useRef<number[]>([]);
  const growthTaskInFlightRef = useRef(new Set<string>());
  const classroom = useClassroomSession();
  const { children, ledger, moralReviews, organizationState, settingsChanges, shopRedemptions, lotteryDraws,
    teacherMode, syncStatus, selectedChildId, dataAuthority, classroomNotice } = classroom.state;
  const { setChildren, setMoralReviews, setOrganizationState, setSettingsChanges, setShopRedemptions,
    setLotteryDraws, setTeacherMode, setSyncStatus, setSelectedChildId } = classroom.setters;
  const applySnapshot = classroom.snapshot.apply;
  const commitLocalChanges = classroom.authority.commitLocalChanges;
  const markServerWriteUncertain = classroom.authority.markServerWriteUncertain;
  const createCurrentClassroomBackup = classroom.backup.create;
  const restoreClassroomBackup = classroom.backup.restore;
  const exportClassroomBackup = classroom.backup.export;
  const previewClassroomBackupFile = classroom.backup.previewFile;
  const confirmClassroomBackupImport = classroom.backup.confirmImport;
  const clearLocalDemoData = classroom.backup.clear;
  const [activeModule, setActiveModule] = useState<AppModuleId>(() => getInitialActiveModule());
  const [rollCallCurrentId, setRollCallCurrentId] = useState<string | undefined>();
  const [rollCallCalledIds, setRollCallCalledIds] = useState<string[]>([]);
  const [rollCallExcludeCalled, setRollCallExcludeCalled] = useState(true);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [pkPair, setPkPair] = useState<{ playerId: string; opponentId: string } | null>(null);
  const [, setLastEvaluation] = useState<MoralEvaluationResult | undefined>();
  const growthFeedbackRuntime = useGrowthFeedback();
  const growthFeedback = growthFeedbackRuntime.feedback;
  const [showcaseChildId, setShowcaseChildId] = useState<string | undefined>();

  const appView = useMemo(
    () =>
      createAppViewModel({
        children,
        ledger,
        moralReviews,
        selectedChildId,
        spirits,
        showcaseChildId,
        pkPair,
      }),
    [children, ledger, moralReviews, pkPair, selectedChildId, showcaseChildId],
  );
  const { spiritsById, childrenWithProgress, selectedChild, selectedSpirit, showcaseChild, showcaseSpirit,
    allRecentRecords, bigScreenRecentRecords, recentRecords, pkPlayer, pkOpponent, pendingReviews } = appView;
  const assetVersion = useSpiritAssetPreload({ activeModule, children: childrenWithProgress, selectedChild, spiritsById });
  const selectedSpiritAsset = useMemo(
    () => getSpiritAsset(selectedSpirit, selectedChild.state),
    [assetVersion, selectedChild.state, selectedSpirit],
  );
  const showcaseSpiritAsset = useMemo(
    () => (showcaseChild && showcaseSpirit ? getSpiritAsset(showcaseSpirit, showcaseChild.state) : undefined),
    [assetVersion, showcaseChild, showcaseSpirit],
  );
  const activeModuleConfig = moduleConfigById.get(activeModule) ?? moduleConfigById.get("home")!;

  const showGrowthFeedback = growthFeedbackRuntime.show;
  const clearGrowthFeedback = growthFeedbackRuntime.clear;

  const clearHomeFocusTimers = () => {
    homeFocusTimerRefs.current.forEach((timer) => window.clearTimeout(timer));
    homeFocusTimerRefs.current = [];
  };

  const scheduleHomeFocusTimer = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      homeFocusTimerRefs.current = homeFocusTimerRefs.current.filter((item) => item !== timer);
      callback();
    }, delay);
    homeFocusTimerRefs.current.push(timer);
  };

  const moralWorkflow = useMoralSpeakWorkflow({
    applySnapshot,
    children: childrenWithProgress,
    clearFeedback: clearGrowthFeedback,
    commitLedger,
    selectedChild,
    setLastEvaluation,
    setMoralReviews,
    setSelectedChildId,
    setSyncStatus,
    showFeedback: showGrowthFeedback,
    syncStatus,
    worldMapRef,
    commitLocalMoralReviews: (update) => commitLocalChanges((current) => ({ moralReviews: update(current.moralReviews) })),
    markServerWriteUncertain,
  });
  const moralSpeak = moralWorkflow.state;
  const {
    adjust: adjustMoralSpeak,
    approve: approveMoralSpeak,
    defer: deferMoralSpeak,
    prepare: prepareMoralSpeakForChild,
    reset: resetMoralSpeakToIdle,
    respeak: respeakMoralSpeak,
    retry: retryMoralSpeak,
    selectFromDock: selectChildFromDock,
    selectFromMap: selectChildFromMap,
    skip: skipMoralSpeakChild,
    start: startMoralSpeak,
    stop: stopMoralSpeakRecording,
    submitDialogue,
  } = moralWorkflow.actions;
  const guardMoralSpeakChildSelection = moralWorkflow.guardSelection;
  useEffect(() => {
    window.localStorage.setItem(activeModuleStorageKey, activeModule);
  }, [activeModule]);

  useEffect(() => {
    if (activeModule === "home" || activeModule === "child-profile") return;
    resetMoralSpeakToIdle({ focusIsland: false });
  }, [activeModule]);

  useEffect(() => {
    return () => {
      clearHomeFocusTimers();
    };
  }, []);
  useEffect(() => {
    const existingIds = new Set(children.map((child) => child.id));

    setRollCallCalledIds((current) => {
      const next = current.filter((childId) => existingIds.has(childId));
      return next.length === current.length ? current : next;
    });
    setRollCallCurrentId((current) => (current && existingIds.has(current) ? current : undefined));
  }, [children]);

  async function commitLedger(input: LedgerRecordInput) {
    const operation = { ...input, operationId: input.operationId ?? crypto.randomUUID() };
    const showCommitFeedback = () => {
      const feedbackChild = childrenWithProgress.find((child) => child.id === operation.childId);
      if (!feedbackChild || operation.delta === 0 || operation.delta > 0 && operation.reason.startsWith("自助成长：")) return;
      showGrowthFeedback({
        kind: "xp",
        tone: operation.delta > 0 ? "positive" : "watch",
        title: operation.delta > 0 ? `${feedbackChild.name} 能量进精灵` : `${feedbackChild.name} 需要老师提醒`,
        detail: `${getShortFeedbackReason(operation.reason)} · 精灵能量变亮`,
        delta: operation.delta,
        childName: feedbackChild.name,
      });
    };
    const commitOffline = () => {
      const isSafeOfflineDialogueRecord = operation.source === "dialogue-agent" && operation.delta > 0 && Boolean(operation.category);
      if ((operation.source === "dialogue-agent" || operation.reviewId) && !isSafeOfflineDialogueRecord) {
        throw new Error("复核记录需要连接后再入账");
      }
      const record = makeLedgerRecord(operation);
      if (!commitLocalChanges((current) => ({
        ledger: current.ledger.some((item) => item.operationId === operation.operationId) ? current.ledger : [record, ...current.ledger],
        moralReviews: operation.reviewId
          ? current.moralReviews.map((review) =>
              review.id === operation.reviewId
                ? { ...review, status: "approved", reviewedAt: new Date().toISOString(), reviewedByChildId: operation.operatorChildId, ledgerRecordId: record.id }
                : review,
            )
          : current.moralReviews,
      }))) throw new Error("本机课堂数据保存失败");
    };
    if (syncStatus === "unavailable") throw new Error("课堂数据暂不可用");
    if (syncStatus === "offline") {
      commitOffline();
      showCommitFeedback();
      return;
    }

    setSyncStatus("saving");
    try {
      const snapshot = await createLedgerRecord(operation);
      if (!applySnapshot(snapshot)) {
        markServerWriteUncertain();
        throw new TypeError("课堂数据权威已变化");
      }
      showCommitFeedback();
    } catch (error) {
      if (isDefiniteClassroomUnavailable(error)) {
        commitOffline();
        showCommitFeedback();
        return;
      }
      if (isClassroomAvailabilityFailure(error)) markServerWriteUncertain();
      else setSyncStatus("online");
      throw error;
    }
  }

  const recordMathPkWin = (winner: ChildWithProgress) => {
    setSelectedChildId(winner.id);
    void commitLedger({
      childId: winner.id,
      operatorChildId: winner.id,
      operatorRole: "system",
      delta: 30,
      source: "math-pk",
      category: "积极阳光",
      reason: "数学光路点亮 +30",
    }).catch(() => undefined);
  };

  const undoLast = (recordId?: string) => {
    const target = recordId
      ? allRecentRecords.find((record) => record.id === recordId && !record.undoOf)
      : recentRecords.find((record) => !record.undoOf);
    if (!target) return;
    const targetChild = childrenWithProgress.find((child) => child.id === target.childId) ?? selectedChild;
    if (syncStatus === "unavailable") return;
    const operationId = crypto.randomUUID();
    const showUndoFeedback = () => showGrowthFeedback({
      kind: "xp", tone: target.delta > 0 ? "watch" : "positive", title: `撤销 ${targetChild.name} 的成长光点`,
      detail: "老师已处理", delta: -target.delta, childName: targetChild.name,
    });
    const commitLocalUndo = () => {
      const undo = makeLedgerRecord({
        childId: target.childId,
        operatorChildId: selectedChild.id,
        operatorRole: "teacher",
        delta: -target.delta,
        source: "undo",
        category: target.category,
        reason: `撤销：${target.reason}`,
        undoOf: target.id,
        operationId,
      });
      const committed = commitLocalChanges((current) => ({
        ledger: current.ledger.some((record) => record.operationId === operationId)
          ? current.ledger
          : [undo, ...current.ledger.map((record) => (record.id === target.id ? { ...record, undone: true } : record))],
      }));
      if (committed) showUndoFeedback();
    };
    if (syncStatus !== "offline") {
      setSyncStatus("saving");
      undoLedgerRecord(target.id, selectedChild.id, operationId)
        .then((snapshot) => (applySnapshot(snapshot) ? showUndoFeedback() : markServerWriteUncertain()))
        .catch((error) => {
          if (isDefiniteClassroomUnavailable(error)) commitLocalUndo();
          else if (isClassroomAvailabilityFailure(error)) markServerWriteUncertain();
          else setSyncStatus("online");
        });
      return;
    }
    commitLocalUndo();
  };

  const updateSelectedChild = (patch: Partial<ChildProfile>) => {
    if (syncStatus === "unavailable") return;
    const nextChildren = children.map((child) => (child.id === selectedChild.id ? { ...child, ...patch } : child));
    setChildren(nextChildren);
    const showProfileFeedback = () => showGrowthFeedback({
      kind: "status",
      tone: "neutral",
      title: `${selectedChild.name} 小屋已更新`,
      detail: selectedChild.petName,
      childName: selectedChild.name,
    });
    if (syncStatus === "offline") {
      if (commitLocalChanges({ children: nextChildren })) showProfileFeedback();
      return;
    }

    setSyncStatus("saving");
    patchChildProfile(selectedChild.id, patch)
      .then((snapshot) => (applySnapshot(snapshot) ? showProfileFeedback() : markServerWriteUncertain()))
      .catch((error) => {
        if (isDefiniteClassroomUnavailable(error)) {
          if (commitLocalChanges({ children: nextChildren })) showProfileFeedback();
        } else if (isClassroomAvailabilityFailure(error)) markServerWriteUncertain();
        else {
          setChildren(children);
          setSyncStatus("online");
        }
      });
  };

  const approveReview = (reviewId: string) => {
    if (syncStatus === "unavailable") return;
    const reviewForFeedback = moralReviews.find((item) => item.id === reviewId);
    if (reviewForFeedback && !canApproveMoralGrowth(reviewForFeedback.result)) {
      const childName = childrenWithProgress.find((child) => child.id === reviewForFeedback.childId)?.name;
      showGrowthFeedback({
        kind: "status",
        tone: "watch",
        title: "请老师先处理",
        detail: childName ? `${childName} 修正后再确认` : "修正后再确认",
      });
      return;
    }
    const feedbackChild = reviewForFeedback
      ? childrenWithProgress.find((child) => child.id === reviewForFeedback.childId)
      : undefined;
    const showApprovalFeedback = () => {
      if (!reviewForFeedback || !feedbackChild || !canApproveMoralGrowth(reviewForFeedback.result)) return;
      const delta = reviewForFeedback.result.xpDelta;
      showGrowthFeedback({
        kind: "xp",
        tone: delta > 0 ? "positive" : "watch",
        title: `${feedbackChild.name} 能量进精灵`,
        detail: `${getChildEnergyLabel(reviewForFeedback.result.category)}点亮`,
        delta,
        childName: feedbackChild.name,
      });
    };
    const operationId = crypto.randomUUID();
    const commitLocalApproval = () => {
      const review = moralReviews.find((item) => item.id === reviewId);
      const record =
        review && canApproveMoralGrowth(review.result)
          ? makeLedgerRecord({
              childId: review.childId,
              operatorChildId: selectedChild.id,
              operatorRole: "teacher",
              delta: review.result.xpDelta,
              source: "dialogue-agent",
              category: review.result.category,
              reason: `复核通过：${review.transcript}`,
              aiSuggested: true,
              reviewStatus: "approved",
              reviewId: review.id,
              operationId,
            })
          : undefined;
      const committed = commitLocalChanges((current) => ({
        ledger: record && !current.ledger.some((item) => item.operationId === operationId) ? [record, ...current.ledger] : current.ledger,
        moralReviews: current.moralReviews.map((item) =>
          item.id === reviewId
            ? {
                ...item,
                status: "approved",
                reviewedAt: new Date().toISOString(),
                reviewedByChildId: selectedChild.id,
                ledgerRecordId: record?.id ?? item.ledgerRecordId,
                approvalOperationId: operationId,
              }
            : item,
        ),
      }));
      if (committed) showApprovalFeedback();
    };
    if (syncStatus === "offline") {
      commitLocalApproval();
      return;
    }

    setSyncStatus("saving");
    approveMoralReview(reviewId, selectedChild.id, operationId)
      .then((snapshot) => (applySnapshot(snapshot) ? showApprovalFeedback() : markServerWriteUncertain()))
      .catch((error) => {
        if (isDefiniteClassroomUnavailable(error)) commitLocalApproval();
        else if (isClassroomAvailabilityFailure(error)) markServerWriteUncertain();
        else setSyncStatus("online");
      });
  };

  const rejectReview = (reviewId: string) => {
    if (syncStatus === "unavailable") return;
    const review = moralReviews.find((item) => item.id === reviewId);
    const showRejectionFeedback = () => showGrowthFeedback({
      kind: "status",
      tone: "watch",
      title: "复核已驳回",
      detail: review ? childrenWithProgress.find((child) => child.id === review.childId)?.name : undefined,
    });
    const operationId = crypto.randomUUID();
    const commitLocalRejection = () =>
      commitLocalChanges((current) => ({
        moralReviews: current.moralReviews.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                status: "rejected",
                reviewedAt: new Date().toISOString(),
                reviewedByChildId: selectedChild.id,
                rejectionReason: "老师复核后驳回",
                rejectionOperationId: operationId,
              }
            : review,
        ),
      }));
    if (syncStatus === "offline") {
      if (commitLocalRejection()) showRejectionFeedback();
      return;
    }

    setSyncStatus("saving");
    rejectMoralReview(reviewId, selectedChild.id, "老师复核后驳回", operationId)
      .then((snapshot) => (applySnapshot(snapshot) ? showRejectionFeedback() : markServerWriteUncertain()))
      .catch((error) => {
        if (isDefiniteClassroomUnavailable(error)) {
          if (commitLocalRejection()) showRejectionFeedback();
        } else if (isClassroomAvailabilityFailure(error)) markServerWriteUncertain();
        else setSyncStatus("online");
      });
  };

  const focusChildOnHome = (childId = selectedChild.id, options?: { prepareMoralSpeak?: boolean }) => {
    const child = childrenWithProgress.find((item) => item.id === childId) ?? selectedChild;
    setSelectedChildId(childId);
    if (options?.prepareMoralSpeak) {
      prepareMoralSpeakForChild(childId);
    }
    setActiveModule("home");
    showGrowthFeedback({
      kind: "focus",
      tone: "neutral",
      title: `看精灵 ${child.name}`,
      detail: "回岛查看能量",
      childName: child.name,
    });
    clearHomeFocusTimers();
    let attempts = 0;
    const focusWhenReady = () => {
      attempts += 1;
      const worldMap = worldMapRef.current;
      if (worldMap) {
        worldMap.focusSelected();
        return;
      }
      if (attempts < 12) scheduleHomeFocusTimer(focusWhenReady, 100);
    };
    scheduleHomeFocusTimer(focusWhenReady, 120);
  };

  const openChildProfile = (childId = selectedChild.id) => {
    const child = childrenWithProgress.find((item) => item.id === childId) ?? selectedChild;
    setSelectedChildId(childId);
    setActiveModule("child-profile");
    showGrowthFeedback({
      kind: "status",
      tone: "neutral",
      title: `进入 ${child.name} 的小屋`,
      detail: "查看精灵能量",
      childName: child.name,
    });
  };

  const prepareMoralSpeakInProfile = (childId = selectedChild.id) => {
    if (guardMoralSpeakChildSelection(childId)) return;
    const child = childrenWithProgress.find((item) => item.id === childId) ?? selectedChild;
    setSelectedChildId(child.id);
    prepareMoralSpeakForChild(child.id);
    setActiveModule("child-profile");
    showGrowthFeedback({
      kind: "status",
      tone: "neutral",
      title: `${child.name} 准备说成长`,
      detail: "小屋麦克风已打开",
      childName: child.name,
    });
  };

  const selectChildFromProfile = (childId: string) => {
    if (guardMoralSpeakChildSelection(childId)) return;
    setSelectedChildId(childId);
  };

  const openSpiritShowcase = (childId = selectedChild.id) => {
    const child = childrenWithProgress.find((item) => item.id === childId) ?? selectedChild;
    setSelectedChildId(child.id);
    setShowcaseChildId(child.id);
    clearGrowthFeedback();
  };

  const drawRollCallChild = (eligibleChildIds?: string[]) => {
    const calledSet = new Set(rollCallCalledIds);
    const eligibleSet = eligibleChildIds ? new Set(eligibleChildIds) : undefined;
    const basePool = eligibleSet
      ? childrenWithProgress.filter((child) => eligibleSet.has(child.id))
      : childrenWithProgress;
    const pool = rollCallExcludeCalled
      ? basePool.filter((child) => !calledSet.has(child.id))
      : basePool;

    if (pool.length === 0) return;

    const nextChild = pool[Math.floor(Math.random() * pool.length)];
    setRollCallCurrentId(nextChild.id);
    setSelectedChildId(nextChild.id);
    setRollCallCalledIds((current) =>
      rollCallExcludeCalled && current.includes(nextChild.id) ? current : [nextChild.id, ...current],
    );
    showGrowthFeedback({
      kind: "draw",
      tone: "positive",
      title: `抽中 ${nextChild.name}`,
      detail: "贝签已亮起",
      childName: nextChild.name,
    });
  };

  const resetRollCall = () => {
    setRollCallCurrentId(undefined);
    setRollCallCalledIds([]);
    showGrowthFeedback({
      kind: "status",
      tone: "neutral",
      title: "抽取台已换一轮",
      detail: `${childrenWithProgress.length} 名幼儿`,
    });
  };

  const quickRecordRollCallChild = (childId: string) => {
    setSelectedChildId(childId);
    void commitLedger({
      childId,
      operatorChildId: childId,
      operatorRole: "teacher",
      delta: 10,
      source: "manual",
      category: "积极阳光",
      reason: "抽取台：课堂积极回应 +10",
    });
  };

  const recordTeacherWorkbench = async (
    childIds: string[],
    delta: number,
    reason: string,
    category: VirtueCategory,
  ) => {
    const targetIds = [...new Set(childIds)].filter((childId) => children.some((child) => child.id === childId));
    if (targetIds.length === 0) return;

    setSelectedChildId(targetIds[0]);
    for (const childId of targetIds) {
      await commitLedger({
        childId,
        operatorChildId: selectedChild.id,
        operatorRole: "teacher",
        delta,
        source: "manual",
        category,
        reason,
      });
    }
  };

  const completeGrowthTask = (childId: string, taskId: string) => {
    const input = createGrowthTaskLedgerInput(organizationConfig, taskId, childId, selectedChild.id);
    const task = organizationConfig.growthTasks.find((item) => item.id === taskId);
    if (!input || !task) return;
    const taskKey = `${childId}:${taskId}`;
    const alreadyRecorded = ledger.some(
      (record) => record.childId === childId && isGrowthTaskCompletionInCurrentCadence(task, record),
    );
    if (alreadyRecorded || growthTaskInFlightRef.current.has(taskKey)) return;
    growthTaskInFlightRef.current.add(taskKey);
    setSelectedChildId(childId);
    void commitLedger(input).finally(() => {
      growthTaskInFlightRef.current.delete(taskKey);
    });
  };

  const publishOrganizationCurriculumTrack = (classroomId: string, trackId: string) => {
    const activeCurriculumByClassroomId = publishCurriculumTrack(
      organizationConfig,
      classroomId,
      trackId,
      organizationState.activeCurriculumByClassroomId,
    );
    if (!activeCurriculumByClassroomId) return false;
    setOrganizationState((current) => ({ ...current, activeCurriculumByClassroomId }));
    showGrowthFeedback({
      kind: "status",
      tone: "positive",
      title: "课程已发布",
      detail: "成长任务已同步",
    });
    return true;
  };

  const openVoiceRecordFromRollCall = (childId: string) => {
    setSelectedChildId(childId);
    setActiveModule("voice-record");
  };

  const analyzeVoiceRecord = async (childId: string, transcript: string) => {
    setSelectedChildId(childId);
    const qaWindow = window as unknown as { __growthIslandMoralAnalysisDelayMs?: number };
    const analysisDelayMs = import.meta.env.DEV ? Math.max(0, qaWindow.__growthIslandMoralAnalysisDelayMs ?? 0) : 0;
    if (analysisDelayMs > 0) await new Promise((resolve) => window.setTimeout(resolve, analysisDelayMs));
    const result = evaluateMoralText(transcript);
    setLastEvaluation(result);
    return result;
  };

  const confirmVoiceRecord = (childId: string, transcript: string, result: MoralEvaluationResult) => {
    setSelectedChildId(childId);
    setLastEvaluation(result);
    if (!canApproveMoralGrowth(result)) {
      showGrowthFeedback({
        kind: "status",
        tone: "watch",
        title: "请老师先处理",
        detail: "修正后再确认",
      });
      return;
    }
    void commitLedger({
      childId,
      operatorChildId: childId,
      operatorRole: "teacher",
      delta: result.xpDelta,
      source: "dialogue-agent",
      category: result.category,
      reason: `语音记录：${transcript}`,
      aiSuggested: true,
      reviewStatus: "approved",
    });
  };

  const rejectVoiceSuggestion = (result: MoralEvaluationResult) => {
    setLastEvaluation({ ...result, status: "rejected" });
    showGrowthFeedback({
      kind: "status",
      tone: "watch",
      title: "贝壳建议已退回",
      detail: result.category,
    });
  };

  const recordLotteryDraw = (childId: string, prize: LotteryPrize) => {
    const child = childrenWithProgress.find((item) => item.id === childId);
    if (!child) return undefined;
    setSelectedChildId(child.id);
    const draw: LotteryDrawRecord = {
      id: crypto.randomUUID(),
      childId: child.id,
      childName: child.name,
      prizeId: prize.id,
      prizeName: prize.name,
      rarity: prize.rarity,
      description: prize.description,
      status: "drawn",
      createdAt: new Date().toISOString(),
    };
    setLotteryDraws((current) => [draw, ...current].slice(0, 50));
    showGrowthFeedback({
      kind: "draw",
      tone: "positive",
      title: `${child.name} 抽中 ${prize.name}`,
      detail: prize.rarity,
      childName: child.name,
    });
    return draw;
  };

  const redeemShopReward = (childId: string, reward: ShopReward) => {
    const child = childrenWithProgress.find((item) => item.id === childId);
    if (!child || child.xp < reward.cost) return;
    setSelectedChildId(child.id);
    const redemption: ShopRedemption = {
      id: crypto.randomUUID(),
      childId: child.id,
      rewardId: reward.id,
      rewardName: reward.name,
      rewardCategory: reward.category,
      cost: reward.cost,
      status: "requested",
      createdAt: new Date().toISOString(),
    };
    setShopRedemptions((current) => [redemption, ...current].slice(0, 50));
    showGrowthFeedback({
      kind: "redeem",
      tone: "positive",
      title: `${child.name} 已选 ${reward.name}`,
      detail: `${reward.cost} 能量 · 待老师发放`,
      childName: child.name,
    });
  };

  const addSettingsChange = (record: Omit<SettingsChangeRecord, "id" | "createdAt">) => {
    const change: SettingsChangeRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...record,
    };
    setSettingsChanges((current) => [change, ...current].slice(0, 50));
    return change;
  };

  const toggleTeacherModeSetting = () => {
    const next = !teacherMode;
    setTeacherMode(next);
    addSettingsChange({
      key: "teacher-mode",
      label: "教师掌舵",
      value: next ? "掌舵中" : "未掌舵",
    });
  };

  const saveCurrentSettings = () => {
    addSettingsChange({
      key: "settings-save",
      label: "保存舵盘",
      value: teacherMode ? "教师掌舵中" : "学生浏览中",
    });
    showGrowthFeedback({
      kind: "status",
      tone: "neutral",
      title: "舵盘已保存",
      detail: teacherMode ? "教师掌舵中" : "学生浏览中",
    });
  };

  const returnToHome = () => {
    focusChildOnHome();
  };

  const openSceneFromHome = (moduleId: "roll-call" | "math-arena" | "shop" | "leaderboard" | "child-profile") => {
    const module = moduleConfigById.get(moduleId);
    setActiveModule(moduleId);
    showGrowthFeedback({
      kind: "status",
      tone: "neutral",
      title: module ? `进入 ${module.sceneLabel}` : "进入场景",
      detail: `${selectedChild.name} · 准备点亮`,
      childName: selectedChild.name,
    });
  };

  useGrowthIslandQaBridge({
    backup: { clear: clearLocalDemoData, create: createCurrentClassroomBackup, restore: restoreClassroomBackup },
    classroom: { ledger, lotteryDraws, moralReviews, organizationState, settingsChanges, shopRedemptions, syncStatus, teacherMode },
    children: childrenWithProgress,
    feedback: growthFeedback,
    focusChildOnHome,
    moral: {
      prepare: prepareMoralSpeakForChild,
      qa: moralWorkflow.qa,
      reset: resetMoralSpeakToIdle,
      selectFromMap: selectChildFromMap,
      state: moralSpeak,
    },
    openShowcase: openSpiritShowcase,
    selectedChild,
    setActiveModule,
    setSelectedChildId,
  });

  return <GrowthIslandView {...{
    activeModule, activeModuleConfig, adjustMoralSpeak, allRecentRecords, analyzeVoiceRecord, approveMoralSpeak,
    approveReview, assetVersion, bigScreenRecentRecords, children, childrenWithProgress, clearLocalDemoData,
    completeGrowthTask, confirmClassroomBackupImport, confirmVoiceRecord, deferMoralSpeak, dialogueOpen,
    drawRollCallChild, exportClassroomBackup, focusChildOnHome, growthFeedback, lotteryDraws, moralReviews,
    moralSpeak, openChildProfile, openSceneFromHome, openSpiritShowcase, openVoiceRecordFromRollCall,
    organizationState, pendingReviews, pkOpponent, pkPair, pkPlayer, prepareMoralSpeakInProfile,
    previewClassroomBackupFile, publishOrganizationCurriculumTrack, quickRecordRollCallChild, recentRecords,
    recordLotteryDraw, recordMathPkWin, recordTeacherWorkbench, redeemShopReward, rejectReview,
    rejectVoiceSuggestion, resetRollCall, respeakMoralSpeak, retryMoralSpeak, returnToHome, rollCallCalledIds,
    rollCallCurrentId, rollCallExcludeCalled, saveCurrentSettings, selectedChild, selectedSpirit,
    selectedSpiritAsset, selectChildFromDock, selectChildFromMap, selectChildFromProfile, setActiveModule,
    setDialogueOpen, setPkPair, setRollCallExcludeCalled, setSelectedChildId, setShowcaseChildId,
    settingsChanges, showcaseChild, showcaseSpirit, showcaseSpiritAsset, shopRedemptions, skipMoralSpeakChild,
    spiritsById, startMoralSpeak, stopMoralSpeakRecording, submitDialogue, syncStatus, teacherMode,
    dataAuthority, classroomNotice,
    toggleTeacherModeSetting, undoLast, updateSelectedChild, worldMapRef,
  }} />;
}
