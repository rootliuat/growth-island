import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./components/AppShell";
import { DialogueModal } from "./components/DialogueModal";
import { GameTopBar } from "./components/Hud/GameTopBar";
import { SpiritDetailPanel } from "./components/Hud/SpiritDetailPanel";
import { SpiritDock } from "./components/Hud/SpiritDock";
import { SpiritShowcase3D } from "./components/Hud/SpiritShowcase3D";
import { MathPkModal } from "./components/MathPkModal";
import { ModulePlaceholder } from "./components/modules/ModulePlaceholder";
import { ChildProfileModule } from "./components/modules/ChildProfileModule";
import { DataManagementModule } from "./components/modules/DataManagementModule";
import { LeaderboardModule } from "./components/modules/LeaderboardModule";
import { LotteryModule } from "./components/modules/LotteryModule";
import { MathArenaModule } from "./components/modules/MathArenaModule";
import { OrganizationModule } from "./components/modules/OrganizationModule";
import { RollCallModule } from "./components/modules/RollCallModule";
import { SettingsModule } from "./components/modules/SettingsModule";
import { ShopModule } from "./components/modules/ShopModule";
import { TeacherWorkbenchModule } from "./components/modules/TeacherWorkbenchModule";
import { VoiceRecordModule } from "./components/modules/VoiceRecordModule";
import { moduleConfigById, type AppModuleId } from "./components/modules/moduleConfig";
import { WorldMapContainer } from "./components/WorldMap/WorldMapContainer";
import type { PixiWorldMapHandle } from "./components/WorldMap/PixiWorldMap";
import type { MoralSpeakViewState } from "./components/Hud/MoralSpeakOverlay";
import { initialChildren } from "./data/classroom";
import { organizationConfig } from "./data/organization";
import type { LotteryPrize, ShopReward } from "./data/rewards";
import { spirits } from "./data/spirits";
import {
  compareClassroomBackups,
  createClassroomBackup,
  createClearedClassroomBackup,
  normalizeOrganizationState,
  normalizeClassroomBackup,
  parseClassroomBackupJson,
  serializeClassroomBackup,
  summarizeClassroomBackup,
} from "./domain/classroomBackup";
import { evaluateMoralText } from "./domain/moralAgent";
import { createGrowthTaskLedgerInput, publishCurriculumTrack } from "./domain/organization";
import { enrichChildren, makeLedgerRecord, normalizeLedgerRecord } from "./domain/progression";
import { getSpiritAsset, loadSpiritAsset } from "./domain/spiritAssets";
import { canApproveMoralGrowth, getChildEnergyLabel } from "./domain/virtueEnergy";
import {
  approveMoralReview,
  createLedgerRecord,
  evaluateMoralRecord,
  fetchClassroomSnapshot,
  isClassroomApiError,
  patchChildProfile,
  rejectMoralReview,
  transcribeSpeech,
  undoLedgerRecord,
} from "./services/classroomApi";
import type {
  ChildProfile,
  ClassroomBackupImportPreview,
  ClassroomBackupSnapshot,
  ClassroomBackupSummary,
  ClassroomDataClearSummary,
  ChildWithProgress,
  ClassroomSnapshot,
  LedgerRecord,
  LedgerRecordInput,
  LotteryDrawRecord,
  MoralEvaluationResult,
  MoralReviewItem,
  OrganizationState,
  SettingsChangeRecord,
  ShopRedemption,
  SpiritDefinition,
  VirtueCategory,
} from "./types";

type SyncStatus = "connecting" | "online" | "saving" | "offline";
type GrowthFeedbackKind = "xp" | "energy" | "draw" | "redeem" | "focus" | "status";
type GrowthFeedbackTone = "positive" | "watch" | "neutral";

interface GrowthFeedback {
  id: number;
  kind: GrowthFeedbackKind;
  tone: GrowthFeedbackTone;
  title: string;
  detail?: string;
  delta?: number;
  childName?: string;
}

const backgroundSpiritBatchSize = 2;
const backgroundSpiritBatchDelayMs = 1100;
const backgroundSpiritInitialDelayMs = 1400;
const backgroundSpiritPreloadLimit = 12;
const activeModuleStorageKey = "growth-island-active-module";
const classroomBackupStorageKey = "growth-island-classroom-backup";
const teacherModeStorageKey = "growth-island-teacher-mode";
const settingsChangesStorageKey = "growth-island-settings-changes";
const shopRedemptionsStorageKey = "growth-island-shop-redemptions";
const lotteryDrawsStorageKey = "growth-island-lottery-draws";
const organizationStateStorageKey = "growth-island-organization-state";

const emptyOrganizationState: OrganizationState = {
  activeCurriculumByClassroomId: {},
  parentReportReviewsByChildId: {},
};

function getShortFeedbackReason(reason: string) {
  const cleaned = reason
    .replace(/^课堂记录：/, "")
    .replace(/^抽取台：/, "")
    .replace(/^随机点名：/, "")
    .replace(/^数学魔法 PK 胜利 \+30$/, "数学光路点亮")
    .replace(/^数学光路点亮 \+30$/, "数学光路点亮")
    .replace(/^语音记录：/, "贝壳记录：")
    .replace(/^复核通过：/, "复核通过：")
    .trim();
  if (cleaned.includes("快速加分") || cleaned.includes("课堂积极回应")) return "确认点亮";
  if (cleaned.includes("扣分") || cleaned.includes("减分")) return "老师提醒";
  return cleaned.replace(/\s*[+＋-]\d+\s*XP?$/i, "").slice(0, 34);
}

function GrowthFeedbackOverlay({ feedback }: { feedback?: GrowthFeedback }) {
  if (!feedback) return null;
  const stageLabel =
    feedback.kind === "focus"
      ? "回岛"
      : feedback.kind === "redeem"
        ? "小铺"
        : feedback.kind === "draw"
          ? "抽取"
          : feedback.kind === "energy"
            ? "能量"
            : feedback.kind === "xp"
              ? "能量"
              : "成长";
  const childInitial = feedback.childName?.slice(0, 1) ?? stageLabel.slice(0, 1);

  return (
    <div
      key={feedback.id}
      className={`growth-feedback-overlay ${feedback.tone}`}
      data-kind={feedback.kind}
      data-delta={feedback.delta ?? ""}
      data-child={feedback.childName ?? ""}
      aria-live="polite"
      role="status"
    >
      {typeof feedback.delta === "number" ? (
        <span className="growth-feedback-float" aria-hidden="true">
          {feedback.delta > 0 ? "能量进精灵" : "老师提醒"}
        </span>
      ) : null}
      <div className="growth-feedback-card">
        <span className="growth-feedback-sigil" aria-hidden="true">{childInitial}</span>
        <div className="growth-feedback-copy">
          <span>{stageLabel}</span>
          <strong>{feedback.title}</strong>
          {feedback.detail ? <em>{feedback.detail}</em> : null}
        </div>
      </div>
    </div>
  );
}

function getInitialActiveModule(): AppModuleId {
  if (typeof window === "undefined") return "home";
  const fromQuery = new URLSearchParams(window.location.search).get("module");
  const fromStorage = window.localStorage.getItem(activeModuleStorageKey);
  const candidate = fromQuery || fromStorage;
  return candidate && moduleConfigById.has(candidate as AppModuleId) ? (candidate as AppModuleId) : "home";
}

function getInitialClassroomBackup(): ClassroomBackupSnapshot | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(classroomBackupStorageKey);
  if (!stored) return null;
  try {
    return parseClassroomBackupJson(stored);
  } catch {
    return null;
  }
}

function saveClassroomBackupToStorage(snapshot: ClassroomBackupSnapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(classroomBackupStorageKey, serializeClassroomBackup(snapshot));
}

function saveOrganizationStateToStorage(state: OrganizationState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(organizationStateStorageKey, JSON.stringify(state));
}

function getInitialTeacherMode() {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(teacherModeStorageKey);
  return stored === null ? true : stored === "true";
}

function getInitialSettingsChanges(): SettingsChangeRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(settingsChangesStorageKey) ?? "[]") as SettingsChangeRecord[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === "string" && typeof item.key === "string").slice(0, 50)
      : [];
  } catch {
    return [];
  }
}

function getInitialShopRedemptions(): ShopRedemption[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(shopRedemptionsStorageKey) ?? "[]") as ShopRedemption[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === "string" && typeof item.childId === "string").slice(0, 50)
      : [];
  } catch {
    return [];
  }
}

function getInitialLotteryDraws(): LotteryDrawRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(lotteryDrawsStorageKey) ?? "[]") as LotteryDrawRecord[];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item.id === "string" && typeof item.childId === "string").slice(0, 50)
      : [];
  } catch {
    return [];
  }
}

function getInitialOrganizationState(): OrganizationState {
  if (typeof window === "undefined") return emptyOrganizationState;
  try {
    return normalizeOrganizationState(JSON.parse(window.localStorage.getItem(organizationStateStorageKey) ?? "{}"));
  } catch {
    return emptyOrganizationState;
  }
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

function getMoralSpeakSummary(result: MoralEvaluationResult, fallback: string) {
  if (!canApproveMoralGrowth(result)) return "请老师帮忙";
  return fallback || `${getChildEnergyLabel(result.category)}能量`;
}

function getMoralRecorderSettings() {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    { mimeType: "audio/webm;codecs=opus", voiceFormat: "webm" },
    { mimeType: "audio/webm", voiceFormat: "webm" },
    { mimeType: "audio/mp4", voiceFormat: "m4a" },
    { mimeType: "audio/mpeg", voiceFormat: "mp3" },
  ];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)) ?? { mimeType: "", voiceFormat: "webm" };
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Audio read failed"));
    reader.readAsDataURL(blob);
  });
}

function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function App() {
  const worldMapRef = useRef<PixiWorldMapHandle | null>(null);
  const moralSpeakTimersRef = useRef<number[]>([]);
  const moralRecorderRef = useRef<MediaRecorder | null>(null);
  const moralRecordingStreamRef = useRef<MediaStream | null>(null);
  const moralRecordingChildRef = useRef<ChildWithProgress | null>(null);
  const moralRecordingFormatRef = useRef("webm");
  const moralRecordingCancelledRef = useRef(false);
  const moralSpeakApprovingRef = useRef(false);
  const moralSpeakSessionRef = useRef(0);
  const growthFeedbackTimerRef = useRef<number | undefined>(undefined);
  const homeFocusTimerRefs = useRef<number[]>([]);
  const growthTaskInFlightRef = useRef(new Set<string>());
  const initialClassroomBackup = useMemo(() => getInitialClassroomBackup(), []);
  const [children, setChildren] = useState<ChildProfile[]>(() => initialClassroomBackup?.children ?? initialChildren);
  const [ledger, setLedger] = useState<LedgerRecord[]>(() => initialClassroomBackup?.ledger ?? seededLedger);
  const [moralReviews, setMoralReviews] = useState<MoralReviewItem[]>(() => initialClassroomBackup?.moralReviews ?? seededMoralReviews);
  const [selectedChildId, setSelectedChildId] = useState(initialClassroomBackup?.children[0]?.id ?? initialChildren[0].id);
  const [moralSpeak, setMoralSpeak] = useState<MoralSpeakViewState>({ stage: "idle" });
  const moralSpeakRef = useRef<MoralSpeakViewState>(moralSpeak);
  moralSpeakRef.current = moralSpeak;
  const [teacherMode, setTeacherMode] = useState(() => initialClassroomBackup?.settings.teacherMode ?? getInitialTeacherMode());
  const [settingsChanges, setSettingsChanges] = useState<SettingsChangeRecord[]>(() => initialClassroomBackup?.settings.settingsChanges ?? getInitialSettingsChanges());
  const [activeModule, setActiveModule] = useState<AppModuleId>(() => getInitialActiveModule());
  const [rollCallCurrentId, setRollCallCurrentId] = useState<string | undefined>();
  const [rollCallCalledIds, setRollCallCalledIds] = useState<string[]>([]);
  const [rollCallExcludeCalled, setRollCallExcludeCalled] = useState(true);
  const [lotteryDraws, setLotteryDraws] = useState<LotteryDrawRecord[]>(() => initialClassroomBackup?.lotteryDraws ?? getInitialLotteryDraws());
  const [shopRedemptions, setShopRedemptions] = useState<ShopRedemption[]>(() => initialClassroomBackup?.shopRedemptions ?? getInitialShopRedemptions());
  const [organizationState, setOrganizationState] = useState<OrganizationState>(() => initialClassroomBackup?.organization ?? getInitialOrganizationState());
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [pkPair, setPkPair] = useState<{ playerId: string; opponentId: string } | null>(null);
  const [lastEvaluation, setLastEvaluation] = useState<MoralEvaluationResult | undefined>();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [assetVersion, setAssetVersion] = useState(0);
  const [growthFeedback, setGrowthFeedback] = useState<GrowthFeedback | undefined>();
  const [showcaseChildId, setShowcaseChildId] = useState<string | undefined>();

  const spiritsById = useMemo(() => new Map(spirits.map((spirit) => [spirit.id, spirit])), []);
  const childrenWithProgress = useMemo(() => enrichChildren(children, ledger), [children, ledger]);
  const selectedChild = childrenWithProgress.find((child) => child.id === selectedChildId) ?? childrenWithProgress[0];
  const selectedSpirit = spiritsById.get(selectedChild.spiritId) ?? spirits[0];
  const selectedSpiritAsset = useMemo(
    () => getSpiritAsset(selectedSpirit, selectedChild.state),
    [assetVersion, selectedChild.state, selectedSpirit],
  );
  const showcaseChild = showcaseChildId
    ? childrenWithProgress.find((child) => child.id === showcaseChildId)
    : undefined;
  const showcaseSpirit = showcaseChild ? spiritsById.get(showcaseChild.spiritId) ?? spirits[0] : undefined;
  const showcaseSpiritAsset = useMemo(
    () => (showcaseChild && showcaseSpirit ? getSpiritAsset(showcaseSpirit, showcaseChild.state) : undefined),
    [assetVersion, showcaseChild, showcaseSpirit],
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

  const showGrowthFeedback = (feedback: Omit<GrowthFeedback, "id">) => {
    if (growthFeedbackTimerRef.current) window.clearTimeout(growthFeedbackTimerRef.current);
    setGrowthFeedback({ ...feedback, id: Date.now() });
    growthFeedbackTimerRef.current = window.setTimeout(() => {
      setGrowthFeedback(undefined);
      growthFeedbackTimerRef.current = undefined;
    }, 4800);
  };

  const clearGrowthFeedback = () => {
    if (growthFeedbackTimerRef.current) window.clearTimeout(growthFeedbackTimerRef.current);
    growthFeedbackTimerRef.current = undefined;
    setGrowthFeedback(undefined);
  };

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

  const clearMoralSpeakTimers = () => {
    moralSpeakTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    moralSpeakTimersRef.current = [];
  };

  const stopMoralRecordingTracks = () => {
    moralRecordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    moralRecordingStreamRef.current = null;
  };

  const stopMoralSpeakRecording = (cancel = false) => {
    clearMoralSpeakTimers();
    if (cancel) moralRecordingCancelledRef.current = true;
    const recorder = moralRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }
    stopMoralRecordingTracks();
  };

  const scheduleMoralSpeakTimer = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      moralSpeakTimersRef.current = moralSpeakTimersRef.current.filter((item) => item !== timer);
      callback();
    }, delay);
    moralSpeakTimersRef.current.push(timer);
  };

  const beginMoralSpeakSession = () => {
    moralSpeakSessionRef.current += 1;
    return moralSpeakSessionRef.current;
  };

  const invalidateMoralSpeakSession = () => {
    moralSpeakSessionRef.current += 1;
  };

  const isMoralSpeakSessionActive = (sessionId: number, childId?: string) => {
    const current = moralSpeakRef.current;
    return (
      moralSpeakSessionRef.current === sessionId &&
      current.stage !== "idle" &&
      (!childId || current.childId === childId)
    );
  };

  const isCurrentMoralApprovalTarget = (childId: string, reviewId?: string) => {
    const current = moralSpeakRef.current;
    return current.stage === "pendingReview" && current.childId === childId && current.reviewId === reviewId;
  };

  const getMoralSpeakLockedChildId = () => {
    const current = moralSpeakRef.current;
    return current.stage === "listening" ||
      current.stage === "recognizing" ||
      current.stage === "pendingReview" ||
      current.stage === "success"
      ? current.childId
      : undefined;
  };

  const prepareMoralSpeakForChild = (childId: string) => {
    beginMoralSpeakSession();
    clearMoralSpeakTimers();
    stopMoralSpeakRecording(true);
    moralSpeakApprovingRef.current = false;
    clearGrowthFeedback();
    setMoralSpeak({ stage: "ready", childId });
  };

  const guardMoralSpeakChildSelection = (childId: string) => {
    const lockedChildId = getMoralSpeakLockedChildId();
    if (!lockedChildId || childId === lockedChildId) return false;
    const activeChild = childrenWithProgress.find((item) => item.id === lockedChildId) ?? selectedChild;
    setSelectedChildId(activeChild.id);
    worldMapRef.current?.focusSelected();
    showGrowthFeedback({
      kind: "status",
      tone: "neutral",
      title: `${activeChild.name} 正在说成长`,
      detail: "先完成这一位，再点下一位",
      childName: activeChild.name,
    });
    return true;
  };

  const resetMoralSpeakToIdle = (options: { focusIsland?: boolean } = {}) => {
    invalidateMoralSpeakSession();
    clearMoralSpeakTimers();
    stopMoralSpeakRecording(true);
    moralSpeakApprovingRef.current = false;
    setMoralSpeak({ stage: "idle" });
    if (options.focusIsland ?? true) worldMapRef.current?.focusFullIsland();
  };

  const returnMoralSpeakToIslandIdle = () => {
    resetMoralSpeakToIdle({ focusIsland: true });
    scheduleMoralSpeakTimer(() => worldMapRef.current?.focusFullIsland(), 140);
  };

  const selectChildFromDock = (childId: string) => {
    if (guardMoralSpeakChildSelection(childId)) return;
    if (childId === selectedChild.id) {
      worldMapRef.current?.focusSelected();
      prepareMoralSpeakForChild(childId);
      return;
    }
    setSelectedChildId(childId);
    prepareMoralSpeakForChild(childId);
  };

  const selectChildFromMap = (childId: string) => {
    if (guardMoralSpeakChildSelection(childId)) return;
    setSelectedChildId(childId);
    prepareMoralSpeakForChild(childId);
  };

  const applySnapshot = (snapshot: ClassroomSnapshot) => {
    setChildren(snapshot.children);
    setLedger(snapshot.ledger.map(normalizeLedgerRecord));
    setMoralReviews(snapshot.moralReviews ?? []);
    setSyncStatus("online");
  };

  const createCurrentClassroomBackup = () =>
    createClassroomBackup({
      children,
      ledger,
      moralReviews,
      shopRedemptions,
      lotteryDraws,
      teacherMode,
      settingsChanges,
      organization: organizationState,
    });

  const restoreClassroomBackup = (input: ClassroomBackupSnapshot) => {
    const backup = normalizeClassroomBackup(input);
    saveClassroomBackupToStorage(backup);
    saveOrganizationStateToStorage(backup.organization);
    setChildren(backup.children);
    setLedger(backup.ledger.map(normalizeLedgerRecord));
    setMoralReviews(backup.moralReviews);
    setShopRedemptions(backup.shopRedemptions.slice(0, 50));
    setLotteryDraws(backup.lotteryDraws.slice(0, 50));
    setTeacherMode(backup.settings.teacherMode);
    setSettingsChanges(backup.settings.settingsChanges.slice(0, 50));
    setOrganizationState(backup.organization);
    setSelectedChildId((current) => (backup.children.some((child) => child.id === current) ? current : backup.children[0]?.id ?? initialChildren[0].id));
    setSyncStatus("offline");
    return summarizeClassroomBackup(backup);
  };

  const exportClassroomBackup = () => {
    const backup = createCurrentClassroomBackup();
    saveClassroomBackupToStorage(backup);
    downloadJson(`beihai-growth-island-backup-${backup.exportedAt.slice(0, 10)}.json`, serializeClassroomBackup(backup));
    return summarizeClassroomBackup(backup);
  };

  const previewClassroomBackupFile = async (file: File): Promise<ClassroomBackupImportPreview> => {
    const backup = parseClassroomBackupJson(await file.text());
    const current = createCurrentClassroomBackup();
    return {
      snapshot: backup,
      comparison: compareClassroomBackups(current, backup),
    };
  };

  const confirmClassroomBackupImport = (backup: ClassroomBackupSnapshot) => restoreClassroomBackup(backup);

  const clearLocalDemoData = (): ClassroomDataClearSummary => {
    const clearedAt = new Date().toISOString();
    const summary: ClassroomDataClearSummary = {
      childCount: children.length,
      clearedLedgerCount: ledger.length,
      clearedReviewCount: moralReviews.length,
      clearedShopRedemptionCount: shopRedemptions.length,
      clearedLotteryDrawCount: lotteryDraws.length,
      clearedSettingsChangeCount: settingsChanges.length,
      clearedActiveCurriculumCount: Object.keys(organizationState.activeCurriculumByClassroomId).length,
      clearedParentReportReviewCount: Object.keys(organizationState.parentReportReviewsByChildId).length,
      exportedAt: clearedAt,
    };
    const clearedBackup = createClearedClassroomBackup({ children, teacherMode }, clearedAt);
    saveClassroomBackupToStorage(clearedBackup);
    saveOrganizationStateToStorage(clearedBackup.organization);
    setLedger([]);
    setMoralReviews([]);
    setShopRedemptions([]);
    setLotteryDraws([]);
    setSettingsChanges([]);
    setOrganizationState(clearedBackup.organization);
    setSelectedChildId((current) => (children.some((child) => child.id === current) ? current : children[0]?.id ?? initialChildren[0].id));
    setSyncStatus("offline");
    return summary;
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
    window.localStorage.setItem(teacherModeStorageKey, String(teacherMode));
  }, [teacherMode]);

  useEffect(() => {
    window.localStorage.setItem(settingsChangesStorageKey, JSON.stringify(settingsChanges.slice(0, 50)));
  }, [settingsChanges]);

  useEffect(() => {
    window.localStorage.setItem(shopRedemptionsStorageKey, JSON.stringify(shopRedemptions.slice(0, 50)));
  }, [shopRedemptions]);

  useEffect(() => {
    window.localStorage.setItem(lotteryDrawsStorageKey, JSON.stringify(lotteryDraws.slice(0, 50)));
  }, [lotteryDraws]);

  useEffect(() => {
    saveOrganizationStateToStorage(organizationState);
  }, [organizationState]);

  useEffect(() => {
    if (syncStatus === "connecting") return;
    saveClassroomBackupToStorage(
      createClassroomBackup({
        children,
        ledger,
        moralReviews,
        shopRedemptions,
        lotteryDraws,
        teacherMode,
        settingsChanges,
        organization: organizationState,
      }),
    );
  }, [children, ledger, lotteryDraws, moralReviews, organizationState, settingsChanges, shopRedemptions, syncStatus, teacherMode]);

  useEffect(() => {
    if (activeModule === "home" || activeModule === "child-profile") return;
    resetMoralSpeakToIdle({ focusIsland: false });
  }, [activeModule]);

  useEffect(() => {
    return () => {
      clearMoralSpeakTimers();
      clearHomeFocusTimers();
      stopMoralSpeakRecording(true);
      if (growthFeedbackTimerRef.current) window.clearTimeout(growthFeedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("qa") || !import.meta.env.DEV) return;
    const qaWindow = window as unknown as {
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
      __growthIslandFinishMoralSpeakForQa?: (input: {
        childId?: string;
        transcript: string;
        summary?: string;
        delayMs?: number;
      }) => boolean;
      __growthIslandStartMoralReviewForQa?: (input: {
        childId?: string;
        transcript: string;
        summary?: string;
      }) => boolean;
      __growthIslandPrepareMoralSpeakForQa?: (childId?: string) => boolean;
      __growthIslandOpenIslandHotspotForQa?: (childId?: string) => boolean;
      __growthIslandSetMoralRecognizingForQa?: (childId?: string) => boolean;
      __growthIslandSelectMapChildForQa?: (childId: string) => boolean;
      __growthIslandOpen3dShowcaseForQa?: (childId?: string) => boolean;
    };
    qaWindow.__growthIslandClearDemoDataForQa = clearLocalDemoData;
    qaWindow.__growthIslandCreateBackupForQa = createCurrentClassroomBackup;
    qaWindow.__growthIslandLedger = ledger;
    qaWindow.__growthIslandLocalBackup = summarizeClassroomBackup(createCurrentClassroomBackup());
    qaWindow.__growthIslandLotteryDraws = lotteryDraws;
    qaWindow.__growthIslandOrganizationState = organizationState;
    qaWindow.__growthIslandReviews = moralReviews;
    qaWindow.__growthIslandRestoreBackupForQa = restoreClassroomBackup;
    qaWindow.__growthIslandSettingsChanges = settingsChanges;
    qaWindow.__growthIslandShopRedemptions = shopRedemptions;
    qaWindow.__growthIslandChildIds = childrenWithProgress.map((child) => child.id);
    qaWindow.__growthIslandSelectedChildId = selectedChild.id;
    qaWindow.__growthIslandTeacherMode = teacherMode;
    qaWindow.__growthIslandSyncStatus = syncStatus;
    qaWindow.__growthIslandMoralSpeakStage = moralSpeak.stage;
    qaWindow.__growthIslandMoralSpeak = moralSpeak;
    qaWindow.__growthIslandFeedback = growthFeedback;
    qaWindow.__growthIslandMoralAnalysisDelayMs ??= 0;
    qaWindow.__growthIslandForceMoralMicErrorForQa ??= false;
    qaWindow.__growthIslandClearMoralSpeakForQa = () => {
      resetMoralSpeakToIdle({ focusIsland: false });
    };
    qaWindow.__growthIslandSetActiveModuleForQa = (moduleId) => {
      if (!moduleConfigById.has(moduleId)) return false;
      setActiveModule(moduleId);
      return true;
    };
    qaWindow.__growthIslandFinishMoralSpeakForQa = (input) => {
      const child =
        childrenWithProgress.find((item) => item.id === input.childId) ??
        childrenWithProgress.find((item) => item.id === moralSpeak.childId) ??
        childrenWithProgress.find((item) => item.id === selectedChild.id) ??
        selectedChild;
      const sessionId = moralSpeakSessionRef.current;
      if (!isMoralSpeakSessionActive(sessionId, child.id)) return false;
      window.setTimeout(() => {
        void finishMoralSpeakWithTranscript(child, input.transcript, input.summary, sessionId);
      }, Math.max(0, input.delayMs ?? 0));
      return true;
    };
    qaWindow.__growthIslandStartMoralReviewForQa = (input) => {
      const child =
        childrenWithProgress.find((item) => item.id === input.childId) ??
        childrenWithProgress.find((item) => item.id === selectedChild.id) ??
        selectedChild;
      clearMoralSpeakTimers();
      moralSpeakApprovingRef.current = false;
      setSelectedChildId(child.id);
      finishQaMoralRecognition(child, input.transcript, input.summary ?? input.transcript.slice(0, 8));
      return true;
    };
    qaWindow.__growthIslandPrepareMoralSpeakForQa = (childId) => {
      const child =
        childrenWithProgress.find((item) => item.id === childId) ??
        childrenWithProgress.find((item) => item.id === selectedChild.id) ??
        selectedChild;
      setSelectedChildId(child.id);
      prepareMoralSpeakForChild(child.id);
      return true;
    };
    qaWindow.__growthIslandOpenIslandHotspotForQa = (childId) => {
      const child =
        childrenWithProgress.find((item) => item.id === childId) ??
        childrenWithProgress.find((item) => item.id === selectedChild.id) ??
        selectedChild;
      focusChildOnHome(child.id, { prepareMoralSpeak: true });
      return true;
    };
    qaWindow.__growthIslandSetMoralRecognizingForQa = (childId) => {
      const child =
        childrenWithProgress.find((item) => item.id === childId) ??
        childrenWithProgress.find((item) => item.id === selectedChild.id) ??
        selectedChild;
      clearMoralSpeakTimers();
      stopMoralSpeakRecording(true);
      moralSpeakApprovingRef.current = false;
      clearGrowthFeedback();
      setSelectedChildId(child.id);
      setMoralSpeak({ stage: "recognizing", childId: child.id });
      return true;
    };
    qaWindow.__growthIslandSelectMapChildForQa = (childId) => {
      const child = childrenWithProgress.find((item) => item.id === childId);
      if (!child) return false;
      selectChildFromMap(child.id);
      return true;
    };
    qaWindow.__growthIslandOpen3dShowcaseForQa = (childId) => {
      const child =
        childrenWithProgress.find((item) => item.id === childId) ??
        childrenWithProgress.find((item) => item.id === selectedChild.id) ??
        selectedChild;
      setActiveModule("home");
      openSpiritShowcase(child.id);
      return true;
    };
  }, [childrenWithProgress, growthFeedback, ledger, lotteryDraws, moralReviews, moralSpeak, organizationState, selectedChild, settingsChanges, shopRedemptions, syncStatus, teacherMode]);

  useEffect(() => {
    const existingIds = new Set(children.map((child) => child.id));

    setRollCallCalledIds((current) => {
      const next = current.filter((childId) => existingIds.has(childId));
      return next.length === current.length ? current : next;
    });
    setRollCallCurrentId((current) => (current && existingIds.has(current) ? current : undefined));
  }, [children]);

  const commitLedger = async (input: LedgerRecordInput) => {
    const feedbackChild = childrenWithProgress.find((child) => child.id === input.childId);
    if (feedbackChild && input.delta !== 0) {
      const isSelfServiceEnergy = input.delta > 0 && input.reason.startsWith("自助成长：");
      if (!isSelfServiceEnergy) {
        showGrowthFeedback({
          kind: "xp",
          tone: input.delta > 0 ? "positive" : "watch",
          title: input.delta > 0 ? `${feedbackChild.name} 能量进精灵` : `${feedbackChild.name} 需要老师提醒`,
          detail: `${getShortFeedbackReason(input.reason)} · 精灵能量变亮`,
          delta: input.delta,
          childName: feedbackChild.name,
        });
      }
    }

    if (syncStatus === "offline") {
      const isSafeOfflineDialogueRecord = input.source === "dialogue-agent" && input.delta > 0 && Boolean(input.category);
      if ((input.source === "dialogue-agent" || input.reviewId) && !isSafeOfflineDialogueRecord) {
        throw new Error("复核记录需要连接后再入账");
      }
      const record = makeLedgerRecord(input);
      setLedger((current) => [record, ...current]);
      return;
    }

    setSyncStatus("saving");
    try {
      const snapshot = await createLedgerRecord(input);
      applySnapshot(snapshot);
    } catch (error) {
      if (isClassroomApiError(error) && (input.source === "dialogue-agent" || input.reviewId)) {
        setSyncStatus("online");
        throw error;
      }
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
      reason: "数学光路点亮 +30",
    });
  };

  const undoLast = (recordId?: string) => {
    const target = recordId
      ? allRecentRecords.find((record) => record.id === recordId && !record.undoOf)
      : recentRecords.find((record) => !record.undoOf);
    if (!target) return;
    const targetChild = childrenWithProgress.find((child) => child.id === target.childId) ?? selectedChild;
    showGrowthFeedback({
      kind: "xp",
      tone: target.delta > 0 ? "watch" : "positive",
      title: `撤销 ${targetChild.name} 的成长光点`,
      detail: "老师已处理",
      delta: -target.delta,
      childName: targetChild.name,
    });
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

  const finishMoralSpeakWithTranscript = async (
    child: ChildWithProgress,
    transcript: string,
    summary: string | undefined,
    sessionId: number,
  ) => {
    if (!isMoralSpeakSessionActive(sessionId, child.id)) return;
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript) {
      setMoralSpeak({ stage: "error", childId: child.id, error: "没听清，可以再说一次" });
      return;
    }

    if (syncStatus !== "offline") {
      setSyncStatus("saving");
      try {
        const response = await evaluateMoralRecord({
          childId: child.id,
          operatorChildId: child.id,
          transcript: cleanTranscript,
        });
        if (!isMoralSpeakSessionActive(sessionId, child.id)) {
          try {
            const snapshot = await rejectMoralReview(response.reviewItem.id, child.id, "已取消");
            applySnapshot(snapshot);
          } catch {
            setSyncStatus("offline");
          }
          return;
        }
        setLastEvaluation(response.result);
        applySnapshot(response.snapshot);
        setSelectedChildId(child.id);
        clearGrowthFeedback();
        setMoralSpeak({
          stage: "pendingReview",
          childId: child.id,
          transcript: cleanTranscript,
          summary: getMoralSpeakSummary(response.result, summary ?? cleanTranscript.slice(0, 8)),
          result: response.result,
          reviewId: response.reviewItem.id,
        });
        return;
      } catch {
        setSyncStatus("offline");
      }
    }

    if (!isMoralSpeakSessionActive(sessionId, child.id)) return;
    const result = evaluateMoralText(cleanTranscript);
    setLastEvaluation(result);
    const review: MoralReviewItem = {
      id: crypto.randomUUID(),
      childId: child.id,
      operatorChildId: child.id,
      transcript: cleanTranscript,
      result,
      status: "pending_review",
      createdAt: new Date().toISOString(),
    };
    setMoralReviews((current) => [review, ...current]);
    clearGrowthFeedback();
    setMoralSpeak({
      stage: "pendingReview",
      childId: child.id,
      transcript: cleanTranscript,
      summary: getMoralSpeakSummary(result, summary ?? cleanTranscript.slice(0, 8)),
      result,
      reviewId: review.id,
    });
  };

  const processRecordedMoralAudio = async (child: ChildWithProgress, blob: Blob, voiceFormat: string, sessionId: number) => {
    if (!isMoralSpeakSessionActive(sessionId, child.id)) return;
    setMoralSpeak({ stage: "recognizing", childId: child.id });
    try {
      const audioBase64 = await blobToBase64(blob);
      if (!isMoralSpeakSessionActive(sessionId, child.id)) return;
      const response = await transcribeSpeech({ audioBase64, voiceFormat });
      if (!isMoralSpeakSessionActive(sessionId, child.id)) return;
      await finishMoralSpeakWithTranscript(child, response.text, undefined, sessionId);
    } catch {
      if (!isMoralSpeakSessionActive(sessionId, child.id)) return;
      setMoralSpeak({ stage: "error", childId: child.id, error: "没听清，可以再说一次" });
    }
  };

  const finishQaMoralRecognition = (child: ChildWithProgress, transcript: string, summary: string) => {
    const result = evaluateMoralText(transcript);
    setLastEvaluation(result);
    const review: MoralReviewItem = {
      id: crypto.randomUUID(),
      childId: child.id,
      operatorChildId: child.id,
      transcript,
      result,
      status: "pending_review",
      createdAt: new Date().toISOString(),
    };
    setMoralReviews((current) => [review, ...current]);
    clearGrowthFeedback();
    setMoralSpeak({
      stage: "pendingReview",
      childId: child.id,
      transcript,
      summary: getMoralSpeakSummary(result, summary),
      result,
      reviewId: review.id,
    });
  };

  const startMoralSpeak = async () => {
    clearMoralSpeakTimers();
    moralSpeakApprovingRef.current = false;
    const child = childrenWithProgress.find((item) => item.id === moralSpeak.childId) ?? selectedChild;
    const sessionId = moralSpeakSessionRef.current;
    if (!isMoralSpeakSessionActive(sessionId, child.id)) return;
    setSelectedChildId(child.id);

    const qaWindow = window as unknown as { __growthIslandForceMoralMicErrorForQa?: boolean };
    if (import.meta.env.DEV && qaWindow.__growthIslandForceMoralMicErrorForQa) {
      setMoralSpeak({ stage: "error", childId: child.id, error: "麦克风没准备好，请老师帮忙" });
      return;
    }

    const settings = getMoralRecorderSettings();
    if (!settings || !navigator.mediaDevices?.getUserMedia) {
      setMoralSpeak({ stage: "error", childId: child.id, error: "这台设备还不能录音" });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isMoralSpeakSessionActive(sessionId, child.id)) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, settings.mimeType ? { mimeType: settings.mimeType } : undefined);
      moralRecordingCancelledRef.current = false;
      moralRecorderRef.current = recorder;
      moralRecordingStreamRef.current = stream;
      moralRecordingChildRef.current = child;
      moralRecordingFormatRef.current = settings.voiceFormat;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = () => {
        stopMoralRecordingTracks();
        if (!isMoralSpeakSessionActive(sessionId, child.id)) return;
        setMoralSpeak({ stage: "error", childId: child.id, error: "录音中断，请再说一次" });
      };
      recorder.onstop = () => {
        stopMoralRecordingTracks();
        moralRecorderRef.current = null;
        if (moralRecordingCancelledRef.current) {
          moralRecordingCancelledRef.current = false;
          moralRecordingChildRef.current = null;
          return;
        }
        const recordedChild = moralRecordingChildRef.current ?? child;
        moralRecordingChildRef.current = null;
        if (!isMoralSpeakSessionActive(sessionId, recordedChild.id)) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || settings.mimeType || "audio/webm" });
        if (blob.size === 0) {
          setMoralSpeak({ stage: "error", childId: recordedChild.id, error: "没听清，可以再说一次" });
          return;
        }
        void processRecordedMoralAudio(recordedChild, blob, moralRecordingFormatRef.current, sessionId);
      };

      if (!isMoralSpeakSessionActive(sessionId, child.id)) {
        stopMoralRecordingTracks();
        return;
      }
      setMoralSpeak({ stage: "listening", childId: child.id });
      recorder.start();
      scheduleMoralSpeakTimer(stopMoralSpeakRecording, 5500);
    } catch {
      stopMoralRecordingTracks();
      if (!isMoralSpeakSessionActive(sessionId, child.id)) return;
      setMoralSpeak({ stage: "error", childId: child.id, error: "请允许麦克风后再试" });
    }
  };

  const retryMoralSpeak = () => {
    if (moralSpeakApprovingRef.current) return;
    const childId = moralSpeak.childId ?? selectedChild.id;
    beginMoralSpeakSession();
    stopMoralSpeakRecording(true);
    moralSpeakApprovingRef.current = false;
    if (moralSpeak.stage === "pendingReview") {
      markCurrentMoralReviewRejected("补说");
    }
    setSelectedChildId(childId);
    setMoralSpeak({ stage: "ready", childId });
  };

  const approveMoralSpeak = async () => {
    if (
      moralSpeak.stage !== "pendingReview" ||
      !moralSpeak.result ||
      !moralSpeak.childId ||
      !canApproveMoralGrowth(moralSpeak.result)
    ) {
      return;
    }
    if (moralSpeakApprovingRef.current) return;
    moralSpeakApprovingRef.current = true;
    clearMoralSpeakTimers();
    const result = moralSpeak.result;
    const transcript = moralSpeak.transcript ?? "孩子自助成长记录";
    const approvalChildId = moralSpeak.childId;
    const reviewId = moralSpeak.reviewId;
    const completedChild = childrenWithProgress.find((child) => child.id === approvalChildId) ?? selectedChild;
    setMoralSpeak((current) =>
      isCurrentMoralApprovalTarget(approvalChildId, reviewId) ? { ...current, approving: true } : current,
    );

    try {
      await commitLedger({
        childId: approvalChildId,
        operatorChildId: selectedChild.id,
        operatorRole: "teacher",
        delta: result.xpDelta,
        source: "dialogue-agent",
        category: result.category,
        reason: `自助成长：${transcript}`,
        aiSuggested: true,
        reviewStatus: "approved",
        reviewId,
        teacherAdjustedReview: moralSpeak.adjusted === true,
      });
    } catch {
      if (!isCurrentMoralApprovalTarget(approvalChildId, reviewId)) {
        moralSpeakApprovingRef.current = false;
        return;
      }
      moralSpeakApprovingRef.current = false;
      setMoralSpeak((current) =>
        isCurrentMoralApprovalTarget(approvalChildId, reviewId)
          ? {
              ...current,
              stage: "error",
              approving: false,
              error: "请老师稍后再确认",
            }
          : current,
      );
      return;
    }

    if (!isCurrentMoralApprovalTarget(approvalChildId, reviewId)) {
      moralSpeakApprovingRef.current = false;
      return;
    }

    if (reviewId) {
      setMoralReviews((current) =>
        current.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                status: "approved",
                reviewedAt: new Date().toISOString(),
                reviewedByChildId: selectedChild.id,
              }
            : review,
        ),
      );
    }

    setMoralSpeak((current) =>
      isCurrentMoralApprovalTarget(approvalChildId, reviewId)
        ? {
            ...current,
            stage: "success",
            approving: false,
            result,
            previousChildName: completedChild.name,
          }
        : current,
    );
    clearGrowthFeedback();
    scheduleMoralSpeakTimer(() => {
      moralSpeakApprovingRef.current = false;
      returnMoralSpeakToIslandIdle();
      showGrowthFeedback({
        kind: "status",
        tone: "neutral",
        title: "下一位可以点精灵",
        detail: "孩子自己选择精灵继续",
        childName: completedChild.name,
      });
    }, 2400);
  };

  const adjustMoralSpeak = (category: VirtueCategory, delta: 10 | 20 | 30) => {
    if (moralSpeakApprovingRef.current) return;
    setMoralSpeak((current) => {
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
        setMoralReviews((reviews) =>
          reviews.map((review) => (review.id === current.reviewId ? { ...review, result } : review)),
        );
      }
      return { ...current, result, adjusted: true };
    });
  };

  const markCurrentMoralReviewRejected = (rejectionReason: string) => {
    if (moralSpeakApprovingRef.current) return;
    const reviewId = moralSpeak.reviewId;
    if (!reviewId) return;
    setMoralReviews((current) =>
      current.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              status: "rejected",
              reviewedAt: new Date().toISOString(),
              reviewedByChildId: selectedChild.id,
              rejectionReason,
            }
          : review,
      ),
    );
    if (syncStatus === "offline") return;
    setSyncStatus("saving");
    rejectMoralReview(reviewId, selectedChild.id, rejectionReason).then(applySnapshot).catch(() => setSyncStatus("offline"));
  };

  const respeakMoralSpeak = () => {
    if (moralSpeakApprovingRef.current) return;
    beginMoralSpeakSession();
    clearMoralSpeakTimers();
    stopMoralSpeakRecording(true);
    moralSpeakApprovingRef.current = false;
    markCurrentMoralReviewRejected("补说");
    const childId = moralSpeak.childId ?? selectedChild.id;
    setSelectedChildId(childId);
    setMoralSpeak({ stage: "ready", childId });
  };

  const skipMoralSpeakChild = () => {
    if (moralSpeakApprovingRef.current) return;
    clearMoralSpeakTimers();
    stopMoralSpeakRecording(true);
    moralSpeakApprovingRef.current = false;
    markCurrentMoralReviewRejected("跳过这位");
    returnMoralSpeakToIslandIdle();
  };

  const deferMoralSpeak = () => {
    if (moralSpeakApprovingRef.current) return;
    const currentChild = moralSpeak.childId
      ? childrenWithProgress.find((child) => child.id === moralSpeak.childId)
      : undefined;
    resetMoralSpeakToIdle({ focusIsland: true });
    if (moralSpeak.stage === "pendingReview" && currentChild) {
      showGrowthFeedback({
        kind: "status",
        tone: "neutral",
        title: "已放回老师待办",
        detail: `${currentChild.name} 稍后再看`,
        childName: currentChild.name,
      });
      return;
    }
    if (currentChild) {
      showGrowthFeedback({
        kind: "status",
        tone: "neutral",
        title: `${currentChild.name} 稍后再说`,
        detail: "流程已收起",
        childName: currentChild.name,
      });
    }
  };

  const updateSelectedChild = (patch: Partial<ChildProfile>) => {
    setChildren((current) => current.map((child) => (child.id === selectedChild.id ? { ...child, ...patch } : child)));
    showGrowthFeedback({
      kind: "status",
      tone: "neutral",
      title: `${selectedChild.name} 小屋已更新`,
      detail: selectedChild.petName,
      childName: selectedChild.name,
    });
    if (syncStatus === "offline") return;

    setSyncStatus("saving");
    patchChildProfile(selectedChild.id, patch)
      .then(applySnapshot)
      .catch(() => setSyncStatus("offline"));
  };

  const approveReview = (reviewId: string) => {
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
    if (reviewForFeedback && feedbackChild && canApproveMoralGrowth(reviewForFeedback.result)) {
      const delta = reviewForFeedback.result.xpDelta;
      showGrowthFeedback({
        kind: "xp",
        tone: delta > 0 ? "positive" : "watch",
        title: `${feedbackChild.name} 能量进精灵`,
        detail: `${getChildEnergyLabel(reviewForFeedback.result.category)}点亮`,
        delta,
        childName: feedbackChild.name,
      });
    }

    if (syncStatus === "offline") {
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
    const review = moralReviews.find((item) => item.id === reviewId);
    showGrowthFeedback({
      kind: "status",
      tone: "watch",
      title: "复核已驳回",
      detail: review ? childrenWithProgress.find((child) => child.id === review.childId)?.name : undefined,
    });
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
    if (!input) return;
    const taskKey = `${childId}:${taskId}`;
    const alreadyRecorded = ledger.some((record) => record.childId === childId && record.reason === input.reason && !record.undone);
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
