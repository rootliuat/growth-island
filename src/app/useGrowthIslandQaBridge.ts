/**
 * [INPUT]: 依赖课堂数据会话、说成长会话、导航、反馈和展示动作。
 * [OUTPUT]: 对外提供 useGrowthIslandQaBridge，安装既有 window.__growthIsland* QA Interface。
 * [POS]: app 的开发期 QA Adapter，仅在 DEV 且 URL 含 qa 时连接自动化与真实运行时。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useEffect } from "react";
import { moduleConfigById, type AppModuleId } from "../components/modules/moduleConfig";
import { summarizeClassroomBackup } from "../domain/classroomBackup";
import type { SyncStatus } from "../domain/appState";
import type { GrowthFeedback } from "../domain/growthFeedback";
import type { MoralSpeakViewState } from "../domain/moralSpeakSession";
import type {
  ChildWithProgress,
  ClassroomBackupSnapshot,
  ClassroomBackupSummary,
  ClassroomDataClearSummary,
  LedgerRecord,
  LotteryDrawRecord,
  MoralReviewItem,
  OrganizationState,
  SettingsChangeRecord,
  ShopRedemption,
} from "../types";

interface QaBridgeInput {
  backup: {
    clear: () => ClassroomDataClearSummary;
    create: () => ClassroomBackupSnapshot;
    restore: (backup: ClassroomBackupSnapshot) => ClassroomBackupSummary;
  };
  classroom: {
    ledger: LedgerRecord[];
    lotteryDraws: LotteryDrawRecord[];
    moralReviews: MoralReviewItem[];
    organizationState: OrganizationState;
    settingsChanges: SettingsChangeRecord[];
    shopRedemptions: ShopRedemption[];
    syncStatus: SyncStatus;
    teacherMode: boolean;
  };
  children: ChildWithProgress[];
  feedback?: GrowthFeedback;
  focusChildOnHome: (childId?: string, options?: { prepareMoralSpeak?: boolean }) => void;
  moral: {
    prepare: (childId: string) => void;
    qa: {
      finish: (child: ChildWithProgress, transcript: string, summary?: string, delayMs?: number) => boolean;
      setRecognizing: (child: ChildWithProgress) => boolean;
      startReview: (child: ChildWithProgress, transcript: string, summary: string) => boolean;
    };
    reset: (options?: { focusIsland?: boolean }) => void;
    selectFromMap: (childId: string) => void;
    state: MoralSpeakViewState;
  };
  openShowcase: (childId?: string) => void;
  selectedChild: ChildWithProgress;
  setActiveModule: (moduleId: AppModuleId) => void;
  setSelectedChildId: (childId: string) => void;
}

type GrowthIslandQaWindow = Window & {
  __growthIslandClearDemoDataForQa?: () => ClassroomDataClearSummary;
  __growthIslandCreateBackupForQa?: () => ClassroomBackupSnapshot;
  __growthIslandLedger?: LedgerRecord[];
  __growthIslandLocalBackup?: ClassroomBackupSummary;
  __growthIslandLotteryDraws?: LotteryDrawRecord[];
  __growthIslandOrganizationState?: OrganizationState;
  __growthIslandReviews?: MoralReviewItem[];
  __growthIslandRestoreBackupForQa?: (backup: ClassroomBackupSnapshot) => ClassroomBackupSummary;
  __growthIslandSettingsChanges?: SettingsChangeRecord[];
  __growthIslandShopRedemptions?: ShopRedemption[];
  __growthIslandChildIds?: string[];
  __growthIslandSelectedChildId?: string;
  __growthIslandTeacherMode?: boolean;
  __growthIslandSyncStatus?: SyncStatus;
  __growthIslandMoralSpeakStage?: MoralSpeakViewState["stage"];
  __growthIslandMoralSpeak?: MoralSpeakViewState;
  __growthIslandFeedback?: GrowthFeedback;
  __growthIslandMoralAnalysisDelayMs?: number;
  __growthIslandForceMoralMicErrorForQa?: boolean;
  __growthIslandClearMoralSpeakForQa?: () => void;
  __growthIslandSetActiveModuleForQa?: (moduleId: AppModuleId) => boolean;
  __growthIslandFinishMoralSpeakForQa?: (value: { childId?: string; transcript: string; summary?: string; delayMs?: number }) => boolean;
  __growthIslandStartMoralReviewForQa?: (value: { childId?: string; transcript: string; summary?: string }) => boolean;
  __growthIslandPrepareMoralSpeakForQa?: (childId?: string) => boolean;
  __growthIslandOpenIslandHotspotForQa?: (childId?: string) => boolean;
  __growthIslandSetMoralRecognizingForQa?: (childId?: string) => boolean;
  __growthIslandSelectMapChildForQa?: (childId: string) => boolean;
  __growthIslandOpen3dShowcaseForQa?: (childId?: string) => boolean;
};

export function useGrowthIslandQaBridge(input: QaBridgeInput) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("qa") || !import.meta.env.DEV) return;
    const qaWindow = window as GrowthIslandQaWindow;
    const findChild = (childId?: string) =>
      input.children.find((child) => child.id === childId) ??
      input.children.find((child) => child.id === input.selectedChild.id) ??
      input.selectedChild;

    qaWindow.__growthIslandClearDemoDataForQa = input.backup.clear;
    qaWindow.__growthIslandCreateBackupForQa = input.backup.create;
    qaWindow.__growthIslandLedger = input.classroom.ledger;
    qaWindow.__growthIslandLocalBackup = summarizeClassroomBackup(input.backup.create());
    qaWindow.__growthIslandLotteryDraws = input.classroom.lotteryDraws;
    qaWindow.__growthIslandOrganizationState = input.classroom.organizationState;
    qaWindow.__growthIslandReviews = input.classroom.moralReviews;
    qaWindow.__growthIslandRestoreBackupForQa = input.backup.restore;
    qaWindow.__growthIslandSettingsChanges = input.classroom.settingsChanges;
    qaWindow.__growthIslandShopRedemptions = input.classroom.shopRedemptions;
    qaWindow.__growthIslandChildIds = input.children.map((child) => child.id);
    qaWindow.__growthIslandSelectedChildId = input.selectedChild.id;
    qaWindow.__growthIslandTeacherMode = input.classroom.teacherMode;
    qaWindow.__growthIslandSyncStatus = input.classroom.syncStatus;
    qaWindow.__growthIslandMoralSpeakStage = input.moral.state.stage;
    qaWindow.__growthIslandMoralSpeak = input.moral.state;
    qaWindow.__growthIslandFeedback = input.feedback;
    qaWindow.__growthIslandMoralAnalysisDelayMs ??= 0;
    qaWindow.__growthIslandForceMoralMicErrorForQa ??= false;
    qaWindow.__growthIslandClearMoralSpeakForQa = () => input.moral.reset({ focusIsland: false });
    qaWindow.__growthIslandSetActiveModuleForQa = (moduleId) => {
      if (!moduleConfigById.has(moduleId)) return false;
      input.setActiveModule(moduleId);
      return true;
    };
    qaWindow.__growthIslandFinishMoralSpeakForQa = (value) => {
      const child =
        input.children.find((item) => item.id === value.childId) ??
        input.children.find((item) => item.id === input.moral.state.childId) ??
        findChild();
      return input.moral.qa.finish(child, value.transcript, value.summary, value.delayMs);
    };
    qaWindow.__growthIslandStartMoralReviewForQa = (value) => {
      const child = findChild(value.childId);
      return input.moral.qa.startReview(child, value.transcript, value.summary ?? value.transcript.slice(0, 8));
    };
    qaWindow.__growthIslandPrepareMoralSpeakForQa = (childId) => {
      const child = findChild(childId);
      input.setSelectedChildId(child.id);
      input.moral.prepare(child.id);
      return true;
    };
    qaWindow.__growthIslandOpenIslandHotspotForQa = (childId) => {
      input.focusChildOnHome(findChild(childId).id, { prepareMoralSpeak: true });
      return true;
    };
    qaWindow.__growthIslandSetMoralRecognizingForQa = (childId) => input.moral.qa.setRecognizing(findChild(childId));
    qaWindow.__growthIslandSelectMapChildForQa = (childId) => {
      const child = input.children.find((item) => item.id === childId);
      if (!child) return false;
      input.moral.selectFromMap(child.id);
      return true;
    };
    qaWindow.__growthIslandOpen3dShowcaseForQa = (childId) => {
      input.setActiveModule("home");
      input.openShowcase(findChild(childId).id);
      return true;
    };
  }, [input]);
}
