/**
 * [INPUT]: 依赖现有 HUD、地图、产品 Module、课堂运行时数据与用户动作。
 * [OUTPUT]: 对外提供 GrowthIslandView 展示 Adapter 与 GrowthIslandViewRuntime 契约。
 * [POS]: app 的纯展示装配层，负责模块路由、弹层和 HUD 组件树，不拥有业务状态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { Dispatch, RefObject, SetStateAction } from "react";
import { AppShell } from "../components/AppShell";
import { DialogueModal } from "../components/DialogueModal";
import { GameTopBar } from "../components/Hud/GameTopBar";
import { GrowthFeedbackOverlay } from "../components/Hud/GrowthFeedbackOverlay";
import { SpiritDetailPanel } from "../components/Hud/SpiritDetailPanel";
import { SpiritDock } from "../components/Hud/SpiritDock";
import { SpiritShowcase3D } from "../components/Hud/SpiritShowcase3D";
import { MathPkModal } from "../components/MathPkModal";
import { ChildProfileModule } from "../components/modules/ChildProfileModule";
import { DataManagementModule } from "../components/modules/DataManagementModule";
import { LeaderboardModule } from "../components/modules/LeaderboardModule";
import { LotteryModule } from "../components/modules/LotteryModule";
import { MathArenaModule } from "../components/modules/MathArenaModule";
import { ModulePlaceholder } from "../components/modules/ModulePlaceholder";
import { OrganizationModule } from "../components/modules/OrganizationModule";
import { RollCallModule } from "../components/modules/RollCallModule";
import { SettingsModule } from "../components/modules/SettingsModule";
import { ShopModule } from "../components/modules/ShopModule";
import { TeacherWorkbenchModule } from "../components/modules/TeacherWorkbenchModule";
import { VoiceRecordModule } from "../components/modules/VoiceRecordModule";
import type { AppModuleId } from "../components/modules/moduleConfig";
import { WorldMapContainer } from "../components/WorldMap/WorldMapContainer";
import type { PixiWorldMapHandle } from "../components/WorldMap/PixiWorldMap";
import type { LotteryPrize, ShopReward } from "../data/rewards";
import type { SyncStatus } from "../domain/appState";
import type { GrowthFeedback } from "../domain/growthFeedback";
import type { MoralSpeakViewState } from "../domain/moralSpeakSession";
import type {
  ChildProfile,
  ChildWithProgress,
  ClassroomBackupImportPreview,
  ClassroomBackupSnapshot,
  ClassroomBackupSummary,
  ClassroomDataClearSummary,
  LedgerRecord,
  LotteryDrawRecord,
  MoralEvaluationResult,
  MoralReviewItem,
  OrganizationState,
  SettingsChangeRecord,
  ShopRedemption,
  SpiritDefinition,
  VirtueCategory,
} from "../types";

export interface GrowthIslandViewRuntime {
  activeModule: AppModuleId;
  activeModuleConfig: Parameters<typeof ModulePlaceholder>[0]["module"];
  adjustMoralSpeak: (category: VirtueCategory, delta: 10 | 20 | 30) => void;
  allRecentRecords: LedgerRecord[];
  analyzeVoiceRecord: (childId: string, transcript: string) => Promise<MoralEvaluationResult>;
  approveMoralSpeak: () => Promise<void>;
  approveReview: (reviewId: string) => void;
  assetVersion: number;
  bigScreenRecentRecords: LedgerRecord[];
  children: ChildProfile[];
  childrenWithProgress: ChildWithProgress[];
  clearLocalDemoData: () => ClassroomDataClearSummary;
  completeGrowthTask: (childId: string, taskId: string) => void;
  confirmClassroomBackupImport: (backup: ClassroomBackupSnapshot) => ClassroomBackupSummary;
  confirmVoiceRecord: (childId: string, transcript: string, result: MoralEvaluationResult) => void;
  deferMoralSpeak: () => void;
  dialogueOpen: boolean;
  drawRollCallChild: (eligibleChildIds?: string[]) => void;
  exportClassroomBackup: () => ClassroomBackupSummary;
  focusChildOnHome: (childId?: string, options?: { prepareMoralSpeak?: boolean }) => void;
  growthFeedback?: GrowthFeedback;
  lotteryDraws: LotteryDrawRecord[];
  moralReviews: MoralReviewItem[];
  moralSpeak: MoralSpeakViewState;
  openChildProfile: (childId?: string) => void;
  openSceneFromHome: (moduleId: "roll-call" | "math-arena" | "shop" | "leaderboard" | "child-profile") => void;
  openSpiritShowcase: (childId?: string) => void;
  openVoiceRecordFromRollCall: (childId: string) => void;
  organizationState: OrganizationState;
  pendingReviews: MoralReviewItem[];
  pkOpponent?: ChildWithProgress;
  pkPair: { playerId: string; opponentId: string } | null;
  pkPlayer?: ChildWithProgress;
  prepareMoralSpeakInProfile: (childId?: string) => void;
  previewClassroomBackupFile: (file: File) => Promise<ClassroomBackupImportPreview>;
  publishOrganizationCurriculumTrack: (classroomId: string, trackId: string) => boolean;
  quickRecordRollCallChild: (childId: string) => void;
  recentRecords: LedgerRecord[];
  recordLotteryDraw: (childId: string, prize: LotteryPrize) => LotteryDrawRecord | undefined;
  recordMathPkWin: (winner: ChildWithProgress) => void;
  recordTeacherWorkbench: (childIds: string[], delta: number, reason: string, category: VirtueCategory) => Promise<void>;
  redeemShopReward: (childId: string, reward: ShopReward) => void;
  rejectReview: (reviewId: string) => void;
  rejectVoiceSuggestion: (result: MoralEvaluationResult) => void;
  resetRollCall: () => void;
  respeakMoralSpeak: () => void;
  retryMoralSpeak: () => void;
  returnToHome: () => void;
  rollCallCalledIds: string[];
  rollCallCurrentId?: string;
  rollCallExcludeCalled: boolean;
  saveCurrentSettings: () => void;
  selectedChild: ChildWithProgress;
  selectedSpirit: SpiritDefinition;
  selectedSpiritAsset?: { url: string };
  selectChildFromDock: (childId: string) => void;
  selectChildFromMap: (childId: string) => void;
  selectChildFromProfile: (childId: string) => void;
  setActiveModule: (moduleId: AppModuleId) => void;
  setDialogueOpen: Dispatch<SetStateAction<boolean>>;
  setPkPair: Dispatch<SetStateAction<{ playerId: string; opponentId: string } | null>>;
  setRollCallExcludeCalled: Dispatch<SetStateAction<boolean>>;
  setSelectedChildId: (childId: string) => void;
  setShowcaseChildId: Dispatch<SetStateAction<string | undefined>>;
  settingsChanges: SettingsChangeRecord[];
  showcaseChild?: ChildWithProgress;
  showcaseSpirit?: SpiritDefinition;
  showcaseSpiritAsset?: { url: string };
  shopRedemptions: ShopRedemption[];
  skipMoralSpeakChild: () => void;
  spiritsById: Map<string, SpiritDefinition>;
  startMoralSpeak: () => Promise<void>;
  stopMoralSpeakRecording: (cancel?: boolean) => void;
  submitDialogue: (text: string) => Promise<MoralEvaluationResult>;
  syncStatus: SyncStatus;
  teacherMode: boolean;
  toggleTeacherModeSetting: () => void;
  undoLast: (recordId?: string) => void;
  updateSelectedChild: (patch: Partial<ChildProfile>) => void;
  worldMapRef: RefObject<PixiWorldMapHandle | null>;
}

export function GrowthIslandView(runtime: GrowthIslandViewRuntime) {
  const {
    activeModule, activeModuleConfig, adjustMoralSpeak, allRecentRecords, analyzeVoiceRecord, approveMoralSpeak,
    approveReview, assetVersion, bigScreenRecentRecords, children, childrenWithProgress, clearLocalDemoData,
    completeGrowthTask, confirmClassroomBackupImport, confirmVoiceRecord, deferMoralSpeak, dialogueOpen,
    drawRollCallChild, exportClassroomBackup, focusChildOnHome, growthFeedback, lotteryDraws, moralReviews,
    moralSpeak, openChildProfile, openSceneFromHome, openSpiritShowcase, openVoiceRecordFromRollCall,
    organizationState, pendingReviews, pkOpponent, pkPair, pkPlayer, prepareMoralSpeakInProfile,
    previewClassroomBackupFile, publishOrganizationCurriculumTrack, quickRecordRollCallChild, recentRecords,
    recordLotteryDraw, recordMathPkWin, recordTeacherWorkbench, redeemShopReward,
    rejectReview, rejectVoiceSuggestion, resetRollCall, respeakMoralSpeak, retryMoralSpeak, returnToHome,
    rollCallCalledIds, rollCallCurrentId, rollCallExcludeCalled, saveCurrentSettings, selectedChild,
    selectedSpirit, selectedSpiritAsset, selectChildFromDock, selectChildFromMap, selectChildFromProfile,
    setActiveModule, setDialogueOpen, setPkPair, setRollCallExcludeCalled, setSelectedChildId,
    setShowcaseChildId, settingsChanges, showcaseChild, showcaseSpirit, showcaseSpiritAsset, shopRedemptions,
    skipMoralSpeakChild, spiritsById, startMoralSpeak, stopMoralSpeakRecording, submitDialogue, syncStatus,
    teacherMode, toggleTeacherModeSetting, undoLast, updateSelectedChild, worldMapRef,
  } = runtime;

  return (
    <AppShell
      activeModule={activeModule}
      childrenCount={children.length}
      selectedChildName={selectedChild.name}
      selectedChildEnergy={selectedChild.xp}
      syncStatus={syncStatus}
      onModuleChange={setActiveModule}
      onSelfServiceChild={() => focusChildOnHome(selectedChild.id, { prepareMoralSpeak: true })}
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
              onSelectChild={selectChildFromMap}
              moralSpeak={moralSpeak}
              onOpenModule={openSceneFromHome}
              onPrepareMoralSpeak={(childId) => focusChildOnHome(childId, { prepareMoralSpeak: true })}
              onStartMoralSpeak={startMoralSpeak}
              onStopMoralSpeak={stopMoralSpeakRecording}
              onRetryMoralSpeak={retryMoralSpeak}
              onApproveMoralSpeak={approveMoralSpeak}
              onAdjustMoralSpeak={adjustMoralSpeak}
              onRespeakMoralSpeak={respeakMoralSpeak}
              onSkipMoralSpeak={skipMoralSpeakChild}
              onDeferMoralSpeak={deferMoralSpeak}
            />

            <aside className="hud-rail">
              <SpiritDetailPanel
                child={selectedChild}
                spirit={selectedSpirit}
                spiritAssetUrl={selectedSpiritAsset?.url}
                recentRecords={recentRecords.filter((record) => record.delta > 0)}
                onOpenProfile={openChildProfile}
                onStartSelfService={(childId) => focusChildOnHome(childId, { prepareMoralSpeak: true })}
                onOpenShowcase={openSpiritShowcase}
              />
            </aside>
          </section>

          <SpiritDock
            childrenWithProgress={childrenWithProgress}
            spiritsById={spiritsById}
            selectedChildId={selectedChild.id}
            onSelectChild={selectChildFromDock}
            onOpenShowcase={openSpiritShowcase}
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
          onFocusChild={(childId) => focusChildOnHome(childId, { prepareMoralSpeak: true })}
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
          onSelectChild={selectChildFromProfile}
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
          drawRecords={lotteryDraws}
          onSelectChild={setSelectedChildId}
          onDrawPrize={recordLotteryDraw}
          onFocusChild={focusChildOnHome}
        />
      ) : activeModule === "shop" ? (
        <ShopModule
          childrenWithProgress={childrenWithProgress}
          spiritsById={spiritsById}
          selectedChild={selectedChild}
          redemptions={shopRedemptions}
          onSelectChild={setSelectedChildId}
          onFocusChild={focusChildOnHome}
          onRedeemReward={redeemShopReward}
        />
      ) : activeModule === "child-profile" ? (
        <ChildProfileModule
          childrenWithProgress={childrenWithProgress}
          spiritsById={spiritsById}
          selectedChild={selectedChild}
          recentRecords={allRecentRecords}
          onSelectChild={selectChildFromProfile}
          onFocusChild={focusChildOnHome}
          onUpdateChild={updateSelectedChild}
          moralSpeak={moralSpeak}
          onPrepareMoralSpeak={prepareMoralSpeakInProfile}
          onStartMoralSpeak={startMoralSpeak}
          onStopMoralSpeak={stopMoralSpeakRecording}
          onRetryMoralSpeak={retryMoralSpeak}
          onApproveMoralSpeak={approveMoralSpeak}
          onAdjustMoralSpeak={adjustMoralSpeak}
          onRespeakMoralSpeak={respeakMoralSpeak}
          onSkipMoralSpeak={skipMoralSpeakChild}
          onDeferMoralSpeak={deferMoralSpeak}
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
          onExportBackup={exportClassroomBackup}
          onPreviewImportBackup={previewClassroomBackupFile}
          onConfirmImportBackup={confirmClassroomBackupImport}
          onClearDemoData={clearLocalDemoData}
        />
      ) : activeModule === "organization" ? (
        <OrganizationModule
          childrenWithProgress={childrenWithProgress}
          ledger={allRecentRecords}
          moralReviews={moralReviews}
          selectedChild={selectedChild}
          activeCurriculumByClassroomId={organizationState.activeCurriculumByClassroomId}
          parentReportReviewsByChildId={organizationState.parentReportReviewsByChildId}
          onFocusChild={focusChildOnHome}
          onCompleteGrowthTask={completeGrowthTask}
          onPublishCurriculumTrack={publishOrganizationCurriculumTrack}
        />
      ) : activeModule === "settings" ? (
        <SettingsModule
          childrenCount={children.length}
          teacherMode={teacherMode}
          syncStatus={syncStatus}
          settingsChanges={settingsChanges}
          onToggleTeacherMode={toggleTeacherModeSetting}
          onSaveSettings={saveCurrentSettings}
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

      {showcaseChild && showcaseSpirit ? (
        <SpiritShowcase3D
          child={showcaseChild}
          spirit={showcaseSpirit}
          spiritAssetUrl={showcaseSpiritAsset?.url}
          onClose={() => setShowcaseChildId(undefined)}
        />
      ) : null}

      <GrowthFeedbackOverlay feedback={growthFeedback} />
    </AppShell>
  );
}
