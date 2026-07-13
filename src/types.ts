/**
 * [INPUT]: 不依赖运行时 Module，集中描述前端跨模块共享数据形状。
 * [OUTPUT]: 对外提供课堂、账本、复核、备份、组织、精灵和 Provider 响应类型契约。
 * [POS]: src 的共享类型边界，被 app/domain/components/services 消费，不承载业务实现。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export type VirtueCategory =
  | "家国情怀"
  | "意志坚韧"
  | "积极阳光"
  | "勇毅有力"
  | "激浊扬清"
  | "开拓创新"
  | "尊矩守法";

export type SpiritState =
  | "egg-1"
  | "egg-2"
  | "egg-3"
  | "egg-4"
  | "lv2"
  | "lv3"
  | "lv4"
  | "lv5"
  | "lv6"
  | "lv7"
  | "lv8";

export type LedgerSource = "manual" | "dialogue-agent" | "math-pk" | "undo";
export type LedgerOperatorRole = "teacher" | "child" | "system";
export type LedgerReviewStatus = "not_required" | "pending_review" | "approved" | "rejected";

export interface SpiritDefinition {
  id: string;
  name: string;
  slug: string;
  type: string;
  palette: string;
  concept: string;
  accent: string;
}

export interface IslandSlot {
  id: number;
  x: number;
  y: number;
  zone: VirtueCategory | "中央成长树" | "数学竞技场";
}

export interface ChildProfile {
  id: string;
  name: string;
  spiritId: string;
  petName: string;
  voiceType: number;
  slotId: number;
}

export interface LedgerRecord {
  id: string;
  childId: string;
  operatorChildId: string;
  operatorRole: LedgerOperatorRole;
  delta: number;
  source: LedgerSource;
  category?: VirtueCategory;
  reason: string;
  aiSuggested: boolean;
  reviewStatus: LedgerReviewStatus;
  reviewId?: string;
  createdAt: string;
  undone?: boolean;
  undoOf?: string;
  operationId?: string;
}

export type LedgerRecordInput = Omit<LedgerRecord, "id" | "createdAt" | "operatorRole" | "aiSuggested" | "reviewStatus"> &
  Partial<Pick<LedgerRecord, "operatorRole" | "aiSuggested" | "reviewStatus">> & {
    teacherAdjustedReview?: boolean;
  };

export interface ClassroomSnapshot {
  children: ChildProfile[];
  ledger: LedgerRecord[];
  moralReviews?: MoralReviewItem[];
  updatedAt?: string;
  notice?: string;
}

export interface ChildWithProgress extends ChildProfile {
  xp: number;
  level: number;
  state: SpiritState;
  rank: number;
}

export interface MoralEvaluationResult {
  intent: "reward" | "deduct" | "no_score" | "needs_clarification";
  category?: VirtueCategory;
  xpDelta: 10 | 20 | 30 | -10 | -20 | -30 | 0;
  confidence: number;
  status: "auto_posted" | "pending_review" | "manual_fallback" | "rejected";
  reasonForChild: string;
  reasonForTeacher: string;
  riskFlags: string[];
}

export type MoralReviewStatus = "auto_posted" | "pending_review" | "approved" | "rejected";

export interface MoralReviewItem {
  id: string;
  childId: string;
  operatorChildId: string;
  transcript: string;
  result: MoralEvaluationResult;
  status: MoralReviewStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedByChildId?: string;
  ledgerRecordId?: string;
  operationId?: string;
  approvalOperationId?: string;
  rejectionOperationId?: string;
  rejectionReason?: string;
}

export interface MoralAgentResponse {
  result: MoralEvaluationResult;
  reviewItem: MoralReviewItem;
  snapshot: ClassroomSnapshot;
  provider?: "deepseek" | "rules" | "mock";
  model?: string;
  providerError?: string;
  usage?: unknown;
}

export interface SpeechSynthesisResponse {
  provider: "tencent" | "mock";
  childId: string;
  voiceType: number;
  voiceLabel?: string;
  codec: "mp3";
  sampleRate: number;
  audioBase64: string;
}

export interface SpeechRecognitionResponse {
  provider: "tencent" | "mock";
  text: string;
  voiceFormat: string;
  engineModel: string;
  audioDuration?: number;
  wordSize?: number;
  requestId?: string;
}

export interface ShopRedemption {
  id: string;
  childId: string;
  rewardId: string;
  rewardName: string;
  rewardCategory: string;
  cost: number;
  status: "requested";
  createdAt: string;
}

export interface LotteryDrawRecord {
  id: string;
  childId: string;
  childName: string;
  prizeId: string;
  prizeName: string;
  rarity: "常见" | "惊喜" | "稀有";
  description: string;
  status: "drawn";
  createdAt: string;
}

export interface SettingsChangeRecord {
  id: string;
  key: "teacher-mode" | "settings-save";
  label: string;
  value: string;
  createdAt: string;
}

export type ParentReportReviewStatus = "draft" | "submitted" | "approved" | "revision_requested";

export interface ParentReportReviewRecord {
  childId: string;
  status: ParentReportReviewStatus;
  updatedAt: string;
  reviewedBy?: string;
  note?: string;
}

export interface OrganizationState {
  activeCurriculumByClassroomId: Record<string, string>;
  parentReportReviewsByChildId: Record<string, ParentReportReviewRecord>;
}

export interface ClassroomBackupSnapshot {
  product: "beihai-growth-island";
  schemaVersion: 1;
  exportedAt: string;
  children: ChildProfile[];
  ledger: LedgerRecord[];
  moralReviews: MoralReviewItem[];
  shopRedemptions: ShopRedemption[];
  lotteryDraws: LotteryDrawRecord[];
  settings: {
    teacherMode: boolean;
    settingsChanges: SettingsChangeRecord[];
  };
  organization: OrganizationState;
}

export interface ClassroomBackupSummary {
  childCount: number;
  ledgerCount: number;
  reviewCount: number;
  shopRedemptionCount: number;
  lotteryDrawCount: number;
  settingsChangeCount: number;
  activeCurriculumCount: number;
  parentReportReviewCount: number;
  exportedAt: string;
}

export interface ClassroomBackupComparison {
  current: ClassroomBackupSummary;
  incoming: ClassroomBackupSummary;
  childDelta: number;
  ledgerDelta: number;
  reviewDelta: number;
  shopRedemptionDelta: number;
  lotteryDrawDelta: number;
  settingsChangeDelta: number;
  activeCurriculumDelta: number;
  parentReportReviewDelta: number;
  willReplaceExistingData: boolean;
}

export interface ClassroomBackupImportPreview {
  snapshot: ClassroomBackupSnapshot;
  comparison: ClassroomBackupComparison;
}

export interface ClassroomDataClearSummary {
  childCount: number;
  clearedLedgerCount: number;
  clearedReviewCount: number;
  clearedShopRedemptionCount: number;
  clearedLotteryDrawCount: number;
  clearedSettingsChangeCount: number;
  clearedActiveCurriculumCount: number;
  clearedParentReportReviewCount: number;
  exportedAt: string;
}
