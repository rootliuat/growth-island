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
}

export type LedgerRecordInput = Omit<LedgerRecord, "id" | "createdAt" | "operatorRole" | "aiSuggested" | "reviewStatus"> &
  Partial<Pick<LedgerRecord, "operatorRole" | "aiSuggested" | "reviewStatus">>;

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
  rejectionReason?: string;
}

export interface MoralAgentResponse {
  result: MoralEvaluationResult;
  reviewItem: MoralReviewItem;
  snapshot: ClassroomSnapshot;
}
