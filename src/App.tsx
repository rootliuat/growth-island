import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./components/AppShell";
import { DialogueModal } from "./components/DialogueModal";
import { GameTopBar } from "./components/Hud/GameTopBar";
import { GrowthLogPanel } from "./components/Hud/GrowthLogPanel";
import { HudPanelTabs, type HudPanel } from "./components/Hud/HudPanelTabs";
import { SpiritDetailPanel } from "./components/Hud/SpiritDetailPanel";
import { SpiritDock } from "./components/Hud/SpiritDock";
import { TeacherActionPanel } from "./components/Hud/TeacherActionPanel";
import { MathPkModal } from "./components/MathPkModal";
import { ModulePlaceholder } from "./components/modules/ModulePlaceholder";
import { LeaderboardModule } from "./components/modules/LeaderboardModule";
import { MathArenaModule } from "./components/modules/MathArenaModule";
import { RollCallModule } from "./components/modules/RollCallModule";
import { VoiceRecordModule } from "./components/modules/VoiceRecordModule";
import { moduleConfigById, type AppModuleId } from "./components/modules/moduleConfig";
import { WorldMapContainer } from "./components/WorldMap/WorldMapContainer";
import type { PixiWorldMapHandle } from "./components/WorldMap/PixiWorldMap";
import { initialChildren } from "./data/classroom";
import { spirits } from "./data/spirits";
import { evaluateMoralText } from "./domain/moralAgent";
import { enrichChildren, makeLedgerRecord } from "./domain/progression";
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
  MoralEvaluationResult,
  MoralReviewItem,
  SpiritDefinition,
} from "./types";

type SyncStatus = "connecting" | "online" | "saving" | "offline";

const seededLedger: LedgerRecord[] = initialChildren.slice(0, 16).flatMap((child, index) => {
  const base = [30, 70, 110, 160, 260, 470, 720, 1010, 1450, 1910][index % 10];
  return [
    {
      id: `seed-${child.id}`,
      childId: child.id,
      operatorChildId: child.id,
      delta: base,
      source: "manual",
      category: "积极阳光",
      reason: "演示数据：已有成长 XP",
      createdAt: new Date(Date.now() - index * 3600_000).toISOString(),
    },
  ];
});

export function App() {
  const worldMapRef = useRef<PixiWorldMapHandle | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>(initialChildren);
  const [ledger, setLedger] = useState<LedgerRecord[]>(seededLedger);
  const [moralReviews, setMoralReviews] = useState<MoralReviewItem[]>([]);
  const [selectedChildId, setSelectedChildId] = useState(initialChildren[0].id);
  const [teacherMode, setTeacherMode] = useState(true);
  const [activeModule, setActiveModule] = useState<AppModuleId>("home");
  const [rollCallCurrentId, setRollCallCurrentId] = useState<string | undefined>();
  const [rollCallCalledIds, setRollCallCalledIds] = useState<string[]>([]);
  const [rollCallExcludeCalled, setRollCallExcludeCalled] = useState(true);
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [pkPair, setPkPair] = useState<{ playerId: string; opponentId: string } | null>(null);
  const [hudPanel, setHudPanel] = useState<HudPanel>("spirit");
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
    setLedger(snapshot.ledger);
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
    const assetTargets = new Map<string, { spirit: SpiritDefinition; state: ChildWithProgress["state"] }>();
    childrenWithProgress.forEach((child) => {
      const spirit = spiritsById.get(child.spiritId);
      if (!spirit) return;
      assetTargets.set(`${spirit.id}:${child.state}`, { spirit, state: child.state });
    });

    Promise.all([...assetTargets.values()].map(({ spirit, state }) => loadSpiritAsset(spirit, state))).then((loaded) => {
      if (!cancelled && loaded.some(Boolean)) setAssetVersion((current) => current + 1);
    });

    return () => {
      cancelled = true;
    };
  }, [childrenWithProgress, spiritsById]);

  useEffect(() => {
    if (!teacherMode && hudPanel === "home") setHudPanel("spirit");
  }, [hudPanel, teacherMode]);

  useEffect(() => {
    const existingIds = new Set(children.map((child) => child.id));

    setRollCallCalledIds((current) => {
      const next = current.filter((childId) => existingIds.has(childId));
      return next.length === current.length ? current : next;
    });
    setRollCallCurrentId((current) => (current && existingIds.has(current) ? current : undefined));
  }, [children]);

  const commitLedger = (input: Omit<LedgerRecord, "id" | "createdAt">) => {
    if (syncStatus === "offline") {
      const record = makeLedgerRecord(input);
      setLedger((current) => [record, ...current]);
      return;
    }

    setSyncStatus("saving");
    createLedgerRecord(input)
      .then(applySnapshot)
      .catch(() => {
        setSyncStatus("offline");
        const record = makeLedgerRecord(input);
        setLedger((current) => [record, ...current]);
      });
  };

  const addLedger = (
    delta: number,
    reason: string,
    source: LedgerRecord["source"] = "manual",
    childId = selectedChild.id,
    category: LedgerRecord["category"] = delta >= 0 ? "积极阳光" : "尊矩守法",
  ) => {
    commitLedger({
      childId,
      operatorChildId: selectedChild.id,
      delta,
      source,
      category,
      reason,
    });
  };

  const recordMathPkWin = (winner: ChildWithProgress) => {
    setSelectedChildId(winner.id);
    commitLedger({
      childId: winner.id,
      operatorChildId: winner.id,
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
      status: result.status === "auto_posted" ? "auto_posted" : "pending_review",
      createdAt: new Date().toISOString(),
    };
    setMoralReviews((current) => [localReview, ...current]);
    if (result.status === "auto_posted" && result.xpDelta !== 0) {
      commitLedger({
        childId: selectedChild.id,
        operatorChildId: selectedChild.id,
        delta: result.xpDelta,
        source: "dialogue-agent",
        category: result.category,
        reason: `对话：${text}`,
      });
    }
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
      setMoralReviews((current) => current.map((review) => (review.id === reviewId ? { ...review, status: "approved" } : review)));
      return;
    }

    setSyncStatus("saving");
    approveMoralReview(reviewId, selectedChild.id).then(applySnapshot).catch(() => setSyncStatus("offline"));
  };

  const rejectReview = (reviewId: string) => {
    if (syncStatus === "offline") {
      setMoralReviews((current) => current.map((review) => (review.id === reviewId ? { ...review, status: "rejected" } : review)));
      return;
    }

    setSyncStatus("saving");
    rejectMoralReview(reviewId, selectedChild.id).then(applySnapshot).catch(() => setSyncStatus("offline"));
  };

  const focusChildOnHome = (childId = selectedChild.id) => {
    setSelectedChildId(childId);
    setActiveModule("home");
    window.setTimeout(() => worldMapRef.current?.focusSelected(), 160);
  };

  const drawRollCallChild = () => {
    const calledSet = new Set(rollCallCalledIds);
    const pool = rollCallExcludeCalled
      ? childrenWithProgress.filter((child) => !calledSet.has(child.id))
      : childrenWithProgress;

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
    commitLedger({
      childId,
      operatorChildId: childId,
      delta: result.xpDelta,
      source: "dialogue-agent",
      category: result.category,
      reason: `语音记录：${transcript}`,
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
            teacherMode={teacherMode}
            onToggleTeacherMode={() => setTeacherMode((current) => !current)}
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
              recentLedger={allRecentRecords}
              assetVersion={assetVersion}
              onSelectChild={setSelectedChildId}
              onOpenDialogue={() => setDialogueOpen(true)}
              onOpenPk={() => setPkPair({ playerId: selectedChild.id, opponentId: opponent.id })}
            />

            <aside className="hud-rail">
              <HudPanelTabs
                activePanel={hudPanel}
                pendingReviewCount={pendingReviews.length}
                teacherMode={teacherMode}
                onChange={setHudPanel}
              />
              {hudPanel === "spirit" && (
                <SpiritDetailPanel
                  child={selectedChild}
                  spirit={selectedSpirit}
                  spiritAssetUrl={selectedSpiritAsset?.url}
                  teacherMode={teacherMode}
                  lastEvaluation={lastEvaluation}
                  onAdjustXp={addLedger}
                  onUndoLast={undoLast}
                  onOpenDialogue={() => setDialogueOpen(true)}
                  onOpenPk={() => setPkPair({ playerId: selectedChild.id, opponentId: opponent.id })}
                />
              )}
              {hudPanel === "growth" && (
                <GrowthLogPanel
                  recentRecords={recentRecords}
                  pendingReviews={pendingReviews}
                  childrenWithProgress={childrenWithProgress}
                  onApprove={approveReview}
                  onReject={rejectReview}
                />
              )}
              {hudPanel === "home" && (
                <TeacherActionPanel child={selectedChild} teacherMode={teacherMode} onUpdateChild={updateSelectedChild} />
              )}
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
          onFocusChild={focusChildOnHome}
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
