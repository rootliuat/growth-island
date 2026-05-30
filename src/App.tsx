import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./components/AppShell";
import { DialogueModal } from "./components/DialogueModal";
import { GameTopBar } from "./components/Hud/GameTopBar";
import { SpiritDetailPanel } from "./components/Hud/SpiritDetailPanel";
import { SpiritDock } from "./components/Hud/SpiritDock";
import { MathPkModal } from "./components/MathPkModal";
import { ModulePlaceholder } from "./components/modules/ModulePlaceholder";
import { ChildProfileModule } from "./components/modules/ChildProfileModule";
import { DataManagementModule } from "./components/modules/DataManagementModule";
import { LeaderboardModule } from "./components/modules/LeaderboardModule";
import { LotteryModule } from "./components/modules/LotteryModule";
import { MathArenaModule } from "./components/modules/MathArenaModule";
import { RollCallModule } from "./components/modules/RollCallModule";
import { SettingsModule } from "./components/modules/SettingsModule";
import { ShopModule } from "./components/modules/ShopModule";
import { TeacherWorkbenchModule } from "./components/modules/TeacherWorkbenchModule";
import { VoiceRecordModule } from "./components/modules/VoiceRecordModule";
import { moduleConfigById, type AppModuleId } from "./components/modules/moduleConfig";
import { WorldMapContainer } from "./components/WorldMap/WorldMapContainer";
import type { PixiWorldMapHandle } from "./components/WorldMap/PixiWorldMap";
import { initialChildren } from "./data/classroom";
import { spirits } from "./data/spirits";
import { evaluateMoralText } from "./domain/moralAgent";
import { enrichChildren, makeLedgerRecord, normalizeLedgerRecord } from "./domain/progression";
import { getSpiritAsset, loadSpiritAsset } from "./domain/spiritAssets";
import {
  approveMoralReview,
  createLedgerRecord,
  evaluateMoralRecord,
  fetchClassroomSnapshot,
  patchChildProfile,
  rejectMoralReview,
  undoLedgerRecord,
} from "./services/classroomApi";
import type {
  ChildProfile,
  ChildWithProgress,
  ClassroomSnapshot,
  LedgerRecord,
  LedgerRecordInput,
  MoralEvaluationResult,
  MoralReviewItem,
  SpiritDefinition,
  VirtueCategory,
} from "./types";

type SyncStatus = "connecting" | "online" | "saving" | "offline";

const backgroundSpiritBatchSize = 2;
const backgroundSpiritBatchDelayMs = 1100;
const backgroundSpiritInitialDelayMs = 1400;
const backgroundSpiritPreloadLimit = 12;
const activeModuleStorageKey = "growth-island-active-module";

function getInitialActiveModule(): AppModuleId {
  if (typeof window === "undefined") return "home";
  const fromQuery = new URLSearchParams(window.location.search).get("module");
  const fromStorage = window.localStorage.getItem(activeModuleStorageKey);
  const candidate = fromQuery || fromStorage;
  return candidate && moduleConfigById.has(candidate as AppModuleId) ? (candidate as AppModuleId) : "home";
}

function spiritAssetKey(child: ChildWithProgress) {
  return `${child.spiritId}:${child.state}`;
}

function getBackgroundSpiritPriority(child: ChildWithProgress, selectedChild: ChildWithProgress) {
  if (child.rank <= 3) return child.rank;

  const slotDistance = Math.abs(child.slotId - selectedChild.slotId);
  const levelBias = child.level >= 7 ? -4 : 0;
  return 10 + Math.min(slotDistance, 18) + child.rank / 100 + levelBias;
}

const seededLedger: LedgerRecord[] = initialChildren.slice(0, 16).flatMap((child, index) => {
  const base = [30, 70, 110, 160, 260, 470, 720, 1010, 1450, 1910][index % 10];
  return [
    normalizeLedgerRecord({
      id: `seed-${child.id}`,
      childId: child.id,
      operatorChildId: child.id,
      delta: base,
      source: "manual",
      category: "积极阳光",
      reason: "演示数据：已有成长 XP",
      createdAt: new Date(Date.now() - index * 3600_000).toISOString(),
    } as LedgerRecord),
  ];
});

const seededMoralReviews: MoralReviewItem[] = [
  {
    id: "seed-review-child-06",
    childId: "child-06",
    operatorChildId: "child-06",
    transcript: "我今天主动帮同学收玩具",
    result: {
      intent: "reward",
      category: "积极阳光",
      xpDelta: 20,
      confidence: 0.82,
      status: "pending_review",
      reasonForChild: "你主动帮助同学，是很温暖的成长表现。",
      reasonForTeacher: "建议记录为积极阳光 +20，等待老师复核确认。",
      riskFlags: [],
    },
    status: "pending_review",
    createdAt: new Date(Date.now() - 18 * 60_000).toISOString(),
  },
];

export function App() {
  const worldMapRef = useRef<PixiWorldMapHandle | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>(initialChildren);
  const [ledger, setLedger] = useState<LedgerRecord[]>(seededLedger);
  const [moralReviews, setMoralReviews] = useState<MoralReviewItem[]>(seededMoralReviews);
  const [selectedChildId, setSelectedChildId] = useState(initialChildren[0].id);
  const [teacherMode, setTeacherMode] = useState(true);
  const [activeModule, setActiveModule] = useState<AppModuleId>(() => getInitialActiveModule());
  const [rollCallCurrentId, setRollCallCurrentId] = useState<string | undefined>();
  const [rollCallCalledIds, setRollCallCalledIds] = useState<string[]>([]);
  const [rollCallExcludeCalled, setRollCallExcludeCalled] = useState(true);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [pkPair, setPkPair] = useState<{ playerId: string; opponentId: string } | null>(null);
  const [lastEvaluation, setLastEvaluation] = useState<MoralEvaluationResult | undefined>();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [assetVersion, setAssetVersion] = useState(0);

  const spiritsById = useMemo(() => new Map(spirits.map((spirit) => [spirit.id, spirit])), []);
  const childrenWithProgress = useMemo(() => enrichChildren(children, ledger), [children, ledger]);
  const selectedChild = childrenWithProgress.find((child) => child.id === selectedChildId) ?? childrenWithProgress[0];
  const selectedSpirit = spiritsById.get(selectedChild.spiritId) ?? spirits[0];
  const selectedSpiritAsset = useMemo(
    () => getSpiritAsset(selectedSpirit, selectedChild.state),
    [assetVersion, selectedChild.state, selectedSpirit],
  );
  const allRecentRecords = useMemo(
    () =>
      [...ledger]
        .filter((record) => !record.undone)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [ledger],
  );
  const bigScreenRecentRecords = useMemo(
    () => allRecentRecords.filter((record) => record.delta > 0),
    [allRecentRecords],
  );
  const recentRecords = useMemo(
    () => allRecentRecords.filter((record) => record.childId === selectedChild.id),
    [allRecentRecords, selectedChild.id],
  );
  const opponent = useMemo(() => {
    const selectedIndex = childrenWithProgress.findIndex((child) => child.id === selectedChild.id);
    return childrenWithProgress[(selectedIndex + 1) % childrenWithProgress.length] ?? childrenWithProgress[1];
  }, [childrenWithProgress, selectedChild.id]);
  const pkPlayer = pkPair ? childrenWithProgress.find((child) => child.id === pkPair.playerId) : undefined;
  const pkOpponent = pkPair ? childrenWithProgress.find((child) => child.id === pkPair.opponentId) : undefined;
  const pendingReviews = moralReviews.filter((review) => review.status === "pending_review");
  const activeModuleConfig = moduleConfigById.get(activeModule) ?? moduleConfigById.get("home")!;

  const selectChildFromDock = (childId: string) => {
    if (childId === selectedChild.id) {
      worldMapRef.current?.focusSelected();
      return;
    }
    setSelectedChildId(childId);
  };

  const applySnapshot = (snapshot: ClassroomSnapshot) => {
    setChildren(snapshot.children);
    setLedger(snapshot.ledger.map(normalizeLedgerRecord));
    setMoralReviews(snapshot.moralReviews ?? []);
    setSyncStatus("online");
  };

  useEffect(() => {
    let cancelled = false;
    fetchClassroomSnapshot()
      .then((snapshot) => {
        if (!cancelled) applySnapshot(snapshot);
      })
      .catch(() => {
        if (!cancelled) setSyncStatus("offline");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    if (activeModule !== "home") {
      return () => {
        cancelled = true;
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    const assetTargets = new Map<string, { child: ChildWithProgress; spirit: SpiritDefinition }>();

    childrenWithProgress.forEach((child) => {
      const spirit = spiritsById.get(child.spiritId);
      if (!spirit) return;
      assetTargets.set(spiritAssetKey(child), { child, spirit });
    });

    const selectedTarget = selectedChild ? assetTargets.get(spiritAssetKey(selectedChild)) : undefined;
    const backgroundTargets = [...assetTargets.values()]
      .filter(({ child }) => child.id !== selectedChild.id)
      .sort(
        (a, b) =>
          getBackgroundSpiritPriority(a.child, selectedChild) - getBackgroundSpiritPriority(b.child, selectedChild),
      )
      .slice(0, backgroundSpiritPreloadLimit);

    const applyLoadedAssets = (loaded: boolean[]) => {
      if (!cancelled && loaded.some(Boolean)) setAssetVersion((current) => current + 1);
    };

    if (selectedTarget) {
      loadSpiritAsset(selectedTarget.spirit, selectedTarget.child.state).then((loaded) => applyLoadedAssets([loaded]));
    }

    let cursor = 0;
    const schedule = (callback: () => void, delay: number) => {
      const timer = window.setTimeout(callback, delay);
      timers.push(timer);
    };
    const loadNextBatch = () => {
      if (cancelled || cursor >= backgroundTargets.length) return;
      const batch = backgroundTargets.slice(cursor, cursor + backgroundSpiritBatchSize);
      cursor += backgroundSpiritBatchSize;
      Promise.all(batch.map(({ child, spirit }) => loadSpiritAsset(spirit, child.state))).then((loaded) => {
        applyLoadedAssets(loaded);
        if (!cancelled && cursor < backgroundTargets.length) {
          schedule(loadNextBatch, backgroundSpiritBatchDelayMs);
        }
      });
    };

    schedule(loadNextBatch, backgroundSpiritInitialDelayMs);

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeModule, childrenWithProgress, selectedChild, spiritsById]);

  useEffect(() => {
    window.localStorage.setItem(activeModuleStorageKey, activeModule);
  }, [activeModule]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("qa")) return;
    const qaWindow = window as unknown as {
      __growthIslandLedger?: LedgerRecord[];
      __growthIslandReviews?: MoralReviewItem[];
      __growthIslandSelectedChildId?: string;
    };
    qaWindow.__growthIslandLedger = ledger;
    qaWindow.__growthIslandReviews = moralReviews;
    qaWindow.__growthIslandSelectedChildId = selectedChild.id;
  }, [ledger, moralReviews, selectedChild.id]);

  useEffect(() => {
    const existingIds = new Set(children.map((child) => child.id));

    setRollCallCalledIds((current) => {
      const next = current.filter((childId) => existingIds.has(childId));
      return next.length === current.length ? current : next;
    });
    setRollCallCurrentId((current) => (current && existingIds.has(current) ? current : undefined));
  }, [children]);

  const commitLedger = async (input: LedgerRecordInput) => {
    if (syncStatus === "offline") {
      const record = makeLedgerRecord(input);
      setLedger((current) => [record, ...current]);
      return;
    }

    setSyncStatus("saving");
    try {
      const snapshot = await createLedgerRecord(input);
      applySnapshot(snapshot);
    } catch {
      setSyncStatus("offline");
      const record = makeLedgerRecord(input);
      setLedger((current) => [record, ...current]);
    }
  };

  const addLedger = (
    delta: number,
    reason: string,
    source: LedgerRecord["source"] = "manual",
    childId = selectedChild.id,
    category: LedgerRecord["category"] = delta >= 0 ? "积极阳光" : "尊矩守法",
  ) => {
    void commitLedger({
      childId,
      operatorChildId: selectedChild.id,
      operatorRole: "teacher",
      delta,
      source,
      category,
      reason,
    });
  };

  const recordMathPkWin = (winner: ChildWithProgress) => {
    setSelectedChildId(winner.id);
    void commitLedger({
      childId: winner.id,
      operatorChildId: winner.id,
      operatorRole: "system",
      delta: 30,
      source: "math-pk",
      category: "积极阳光",
      reason: "数学魔法 PK 胜利 +30",
    });
  };

  const undoLast = () => {
    const target = recentRecords.find((record) => !record.undoOf);
    if (!target) return;
    if (syncStatus !== "offline") {
      setSyncStatus("saving");
      undoLedgerRecord(target.id, selectedChild.id)
        .then(applySnapshot)
        .catch(() => setSyncStatus("offline"));
      return;
    }

    const undo = makeLedgerRecord({
      childId: target.childId,
      operatorChildId: selectedChild.id,
      operatorRole: "teacher",
      delta: -target.delta,
      source: "undo",
      category: target.category,
      reason: `撤销：${target.reason}`,
      undoOf: target.id,
    });
    setLedger((current) => current.map((record) => (record.id === target.id ? { ...record, undone: true } : record)).concat(undo));
  };

  const submitDialogue = async (text: string) => {
    if (syncStatus !== "offline") {
      setSyncStatus("saving");
      try {
        const response = await evaluateMoralRecord({
          childId: selectedChild.id,
          operatorChildId: selectedChild.id,
          transcript: text,
        });
        setLastEvaluation(response.result);
        applySnapshot(response.snapshot);
        return response.result;
      } catch {
        setSyncStatus("offline");
      }
    }

    const result = evaluateMoralText(text);
    setLastEvaluation(result);
    const localReview: MoralReviewItem = {
      id: crypto.randomUUID(),
      childId: selectedChild.id,
      operatorChildId: selectedChild.id,
      transcript: text,
      result,
      status: "pending_review",
      createdAt: new Date().toISOString(),
    };
    setMoralReviews((current) => [localReview, ...current]);
    return result;
  };

  const updateSelectedChild = (patch: Partial<ChildProfile>) => {
    setChildren((current) => current.map((child) => (child.id === selectedChild.id ? { ...child, ...patch } : child)));
    if (syncStatus === "offline") return;

    setSyncStatus("saving");
    patchChildProfile(selectedChild.id, patch)
      .then(applySnapshot)
      .catch(() => setSyncStatus("offline"));
  };

  const approveReview = (reviewId: string) => {
    if (syncStatus === "offline") {
      const review = moralReviews.find((item) => item.id === reviewId);
      const record =
        review && review.result.xpDelta !== 0
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
            })
          : undefined;
      if (record) setLedger((ledgerRecords) => [record, ...ledgerRecords]);
      setMoralReviews((current) =>
        current.map((item) =>
          item.id === reviewId
            ? {
                ...item,
                status: "approved",
                reviewedAt: new Date().toISOString(),
                reviewedByChildId: selectedChild.id,
                ledgerRecordId: record?.id ?? item.ledgerRecordId,
              }
            : item,
        ),
      );
      return;
    }

    setSyncStatus("saving");
    approveMoralReview(reviewId, selectedChild.id).then(applySnapshot).catch(() => setSyncStatus("offline"));
  };

  const rejectReview = (reviewId: string) => {
    if (syncStatus === "offline") {
      setMoralReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                status: "rejected",
                reviewedAt: new Date().toISOString(),
                reviewedByChildId: selectedChild.id,
                rejectionReason: "老师复核后驳回",
              }
            : review,
        ),
      );
      return;
    }

    setSyncStatus("saving");
    rejectMoralReview(reviewId, selectedChild.id).then(applySnapshot).catch(() => setSyncStatus("offline"));
  };

  const focusChildOnHome = (childId = selectedChild.id) => {
    setSelectedChildId(childId);
    setActiveModule("home");
    let attempts = 0;
    const focusWhenReady = () => {
      attempts += 1;
      worldMapRef.current?.focusSelected();
      if (attempts < 12) window.setTimeout(focusWhenReady, 100);
    };
    window.setTimeout(focusWhenReady, 120);
  };

  const openChildProfile = (childId = selectedChild.id) => {
    setSelectedChildId(childId);
    setActiveModule("child-profile");
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
  };

  const resetRollCall = () => {
    setRollCallCurrentId(undefined);
    setRollCallCalledIds([]);
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
      reason: "随机点名：课堂积极回应 +10",
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

  const openVoiceRecordFromRollCall = (childId: string) => {
    setSelectedChildId(childId);
    setActiveModule("voice-record");
  };

  const analyzeVoiceRecord = async (childId: string, transcript: string) => {
    setSelectedChildId(childId);
    const result = evaluateMoralText(transcript);
    setLastEvaluation(result);
    return result;
  };

  const confirmVoiceRecord = (childId: string, transcript: string, result: MoralEvaluationResult) => {
    setSelectedChildId(childId);
    setLastEvaluation(result);
    if (result.xpDelta === 0) return;
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
  };

  const returnToHome = () => {
    focusChildOnHome();
  };

  return (
    <AppShell
      activeModule={activeModule}
      childrenCount={children.length}
      selectedChildName={selectedChild.name}
      syncStatus={syncStatus}
      onModuleChange={setActiveModule}
    >
      {activeModule === "home" ? (
        <section className="home-module app-shell" aria-label="北海成长岛首页">
          <GameTopBar
            childrenCount={children.length}
            syncStatus={syncStatus}
            onZoomIn={() => worldMapRef.current?.zoomIn()}
            onZoomOut={() => worldMapRef.current?.zoomOut()}
            onFocusSelected={() => worldMapRef.current?.focusSelected()}
            onFullIsland={() => worldMapRef.current?.focusFullIsland()}
          />

          <section className="game-layout">
            <WorldMapContainer
              ref={worldMapRef}
              childrenWithProgress={childrenWithProgress}
              spiritsById={spiritsById}
              selectedChildId={selectedChild.id}
              recentLedger={bigScreenRecentRecords}
              assetVersion={assetVersion}
              onSelectChild={setSelectedChildId}
            />

            <aside className="hud-rail">
              <SpiritDetailPanel
                child={selectedChild}
                spirit={selectedSpirit}
                spiritAssetUrl={selectedSpiritAsset?.url}
                recentRecords={recentRecords.filter((record) => record.delta > 0)}
                onOpenProfile={openChildProfile}
              />
            </aside>
          </section>

          <SpiritDock
            childrenWithProgress={childrenWithProgress}
            spiritsById={spiritsById}
            selectedChildId={selectedChild.id}
            onSelectChild={selectChildFromDock}
          />
        </section>
      ) : activeModule === "roll-call" ? (
        <RollCallModule
          childrenWithProgress={childrenWithProgress}
          spiritsById={spiritsById}
          selectedChild={selectedChild}
          currentChildId={rollCallCurrentId}
          calledChildIds={rollCallCalledIds}
          excludeCalled={rollCallExcludeCalled}
          onDraw={drawRollCallChild}
          onReset={resetRollCall}
          onToggleExcludeCalled={() => setRollCallExcludeCalled((current) => !current)}
          onQuickRecord={quickRecordRollCallChild}
          onOpenVoiceRecord={openVoiceRecordFromRollCall}
          onFocusChild={focusChildOnHome}
        />
      ) : activeModule === "teacher-workbench" ? (
        <TeacherWorkbenchModule
          childrenWithProgress={childrenWithProgress}
          spiritsById={spiritsById}
          selectedChild={selectedChild}
          pendingReviews={pendingReviews}
          recentRecords={allRecentRecords}
          onSelectChild={setSelectedChildId}
          onQuickRecord={(childIds, delta, reason, category) => {
            void recordTeacherWorkbench(childIds, delta, reason, category);
          }}
          onAnalyze={analyzeVoiceRecord}
          onConfirm={confirmVoiceRecord}
          onRejectSuggestion={rejectVoiceSuggestion}
          onApproveReview={approveReview}
          onRejectReview={rejectReview}
          onUndoLast={undoLast}
          onFocusChild={focusChildOnHome}
          onOpenProfile={openChildProfile}
        />
      ) : activeModule === "voice-record" ? (
        <VoiceRecordModule
          childrenWithProgress={childrenWithProgress}
          spiritsById={spiritsById}
          selectedChild={selectedChild}
          pendingReviews={pendingReviews}
          recentRecords={allRecentRecords}
          onSelectChild={setSelectedChildId}
          onAnalyze={analyzeVoiceRecord}
          onConfirm={confirmVoiceRecord}
          onRejectSuggestion={rejectVoiceSuggestion}
          onApproveReview={approveReview}
          onRejectReview={rejectReview}
          onFocusChild={focusChildOnHome}
        />
      ) : activeModule === "math-arena" ? (
        <MathArenaModule
          childrenWithProgress={childrenWithProgress}
          spiritsById={spiritsById}
          selectedChild={selectedChild}
          recentRecords={allRecentRecords}
          onSelectChild={setSelectedChildId}
          onWin={recordMathPkWin}
          onFocusChild={focusChildOnHome}
        />
      ) : activeModule === "leaderboard" ? (
        <LeaderboardModule
          childrenWithProgress={childrenWithProgress}
          spiritsById={spiritsById}
          selectedChild={selectedChild}
          onFocusChild={focusChildOnHome}
        />
      ) : activeModule === "lottery" ? (
        <LotteryModule
          childrenWithProgress={childrenWithProgress}
          spiritsById={spiritsById}
          selectedChild={selectedChild}
          onSelectChild={setSelectedChildId}
          onFocusChild={focusChildOnHome}
        />
      ) : activeModule === "shop" ? (
        <ShopModule
          childrenWithProgress={childrenWithProgress}
          spiritsById={spiritsById}
          selectedChild={selectedChild}
          onSelectChild={setSelectedChildId}
          onFocusChild={focusChildOnHome}
        />
      ) : activeModule === "child-profile" ? (
        <ChildProfileModule
          childrenWithProgress={childrenWithProgress}
          spiritsById={spiritsById}
          selectedChild={selectedChild}
          recentRecords={allRecentRecords}
          onSelectChild={setSelectedChildId}
          onFocusChild={focusChildOnHome}
        />
      ) : activeModule === "data-management" ? (
        <DataManagementModule
          childrenWithProgress={childrenWithProgress}
          spiritsById={spiritsById}
          selectedChild={selectedChild}
          recentRecords={allRecentRecords}
          pendingReviews={pendingReviews}
          onFocusChild={focusChildOnHome}
          onApproveReview={approveReview}
          onRejectReview={rejectReview}
        />
      ) : activeModule === "settings" ? (
        <SettingsModule
          childrenCount={children.length}
          teacherMode={teacherMode}
          syncStatus={syncStatus}
          onToggleTeacherMode={() => setTeacherMode((current) => !current)}
          onReturnHome={returnToHome}
        />
      ) : (
        <ModulePlaceholder
          module={activeModuleConfig}
          selectedChild={selectedChild}
          pendingReviewCount={pendingReviews.length}
          onReturnHome={returnToHome}
        />
      )}

      {dialogueOpen && <DialogueModal child={selectedChild} onClose={() => setDialogueOpen(false)} onSubmit={submitDialogue} />}

      {pkPair && pkPlayer && pkOpponent && (
        <MathPkModal
          player={pkPlayer}
          opponent={pkOpponent}
          spiritsById={spiritsById}
          onClose={() => {
            setSelectedChildId(pkPlayer.id);
            setPkPair(null);
          }}
          onWin={recordMathPkWin}
        />
      )}
    </AppShell>
  );
}
