import { normalizeLedgerRecord } from "./progression";
import { getDefaultSpiritVoiceType, normalizeSpiritVoiceType } from "./spiritVoice";
import type {
  ChildProfile,
  ClassroomBackupComparison,
  ClassroomBackupSnapshot,
  ClassroomBackupSummary,
  LedgerRecord,
  LedgerReviewStatus,
  LedgerSource,
  LotteryDrawRecord,
  MoralEvaluationResult,
  MoralReviewItem,
  MoralReviewStatus,
  OrganizationState,
  ParentReportReviewStatus,
  SettingsChangeRecord,
  ShopRedemption,
  VirtueCategory,
} from "../types";

export const classroomBackupProduct = "beihai-growth-island";
export const classroomBackupSchemaVersion = 1;

const virtueCategories = new Set<VirtueCategory>([
  "家国情怀",
  "意志坚韧",
  "积极阳光",
  "勇毅有力",
  "激浊扬清",
  "开拓创新",
  "尊矩守法",
]);

const ledgerSources = new Set<LedgerSource>(["manual", "dialogue-agent", "math-pk", "undo"]);
const reviewStatuses = new Set<LedgerReviewStatus>(["not_required", "pending_review", "approved", "rejected"]);
const moralReviewStatuses = new Set<MoralReviewStatus>(["auto_posted", "pending_review", "approved", "rejected"]);
const moralEvaluationStatuses = new Set<MoralEvaluationResult["status"]>(["auto_posted", "pending_review", "manual_fallback", "rejected"]);
const moralEvaluationIntents = new Set<MoralEvaluationResult["intent"]>(["reward", "deduct", "no_score", "needs_clarification"]);
const moralEvaluationXpDeltas = new Set<MoralEvaluationResult["xpDelta"]>([10, 20, 30, -10, -20, -30, 0]);
const settingsKeys = new Set<SettingsChangeRecord["key"]>(["teacher-mode", "settings-save"]);
const parentReportReviewStatuses = new Set<ParentReportReviewStatus>(["draft", "submitted", "approved", "revision_requested"]);

interface ClassroomBackupInput {
  children: ChildProfile[];
  ledger: LedgerRecord[];
  moralReviews: MoralReviewItem[];
  shopRedemptions: ShopRedemption[];
  lotteryDraws: LotteryDrawRecord[];
  teacherMode: boolean;
  settingsChanges: SettingsChangeRecord[];
  organization?: OrganizationState;
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} 格式不正确`);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} 必须是数组`);
  return value;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} 缺少文本`);
  return value;
}

function asNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} 必须是数字`);
  return value;
}

function asBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} 必须是真假值`);
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function normalizeChildren(value: unknown): ChildProfile[] {
  const seen = new Set<string>();
  return asArray(value, "children").map((item, index) => {
    const child = asObject(item, `children[${index}]`);
    const id = asString(child.id, `children[${index}].id`);
    if (seen.has(id)) throw new Error(`重复的幼儿 ID：${id}`);
    seen.add(id);
    const spiritId = asString(child.spiritId, `children[${index}].spiritId`);
    return {
      id,
      name: asString(child.name, `children[${index}].name`),
      spiritId,
      petName: asString(child.petName, `children[${index}].petName`),
      voiceType: normalizeSpiritVoiceType(child.voiceType) ?? getDefaultSpiritVoiceType({ id, spiritId }),
      slotId: asNumber(child.slotId, `children[${index}].slotId`),
    };
  });
}

function normalizeLedger(value: unknown, childIds: Set<string>): LedgerRecord[] {
  return asArray(value, "ledger").map((item, index) => {
    const record = asObject(item, `ledger[${index}]`);
    const childId = asString(record.childId, `ledger[${index}].childId`);
    if (!childIds.has(childId)) throw new Error(`成长记录引用了不存在的幼儿：${childId}`);
    const source = asString(record.source, `ledger[${index}].source`) as LedgerSource;
    if (!ledgerSources.has(source)) throw new Error(`成长记录来源不支持：${source}`);
    const reviewStatus = (optionalString(record.reviewStatus) ?? "not_required") as LedgerReviewStatus;
    if (!reviewStatuses.has(reviewStatus)) throw new Error(`成长记录复核状态不支持：${reviewStatus}`);
    const category = optionalString(record.category);
    if (category && !virtueCategories.has(category as VirtueCategory)) throw new Error(`德育维度不支持：${category}`);

    return normalizeLedgerRecord({
      id: asString(record.id, `ledger[${index}].id`),
      childId,
      operatorChildId: optionalString(record.operatorChildId) ?? childId,
      operatorRole:
        record.operatorRole === "child" || record.operatorRole === "system" || record.operatorRole === "teacher"
          ? record.operatorRole
          : "teacher",
      delta: asNumber(record.delta, `ledger[${index}].delta`),
      source,
      category: category as VirtueCategory | undefined,
      reason: asString(record.reason, `ledger[${index}].reason`),
      aiSuggested: typeof record.aiSuggested === "boolean" ? record.aiSuggested : source === "dialogue-agent",
      reviewStatus,
      reviewId: optionalString(record.reviewId),
      createdAt: asString(record.createdAt, `ledger[${index}].createdAt`),
      undone: record.undone === true,
      undoOf: optionalString(record.undoOf),
    });
  });
}

function normalizeMoralReviews(value: unknown, childIds: Set<string>): MoralReviewItem[] {
  return asArray(value, "moralReviews").map((item, index) => {
    const review = asObject(item, `moralReviews[${index}]`);
    const result = asObject(review.result, `moralReviews[${index}].result`);
    const childId = asString(review.childId, `moralReviews[${index}].childId`);
    if (!childIds.has(childId)) throw new Error(`复核记录引用了不存在的幼儿：${childId}`);
    const status = asString(review.status, `moralReviews[${index}].status`) as MoralReviewStatus;
    if (!moralReviewStatuses.has(status)) throw new Error(`复核记录状态不支持：${status}`);
    const resultStatus = asString(result.status, `moralReviews[${index}].result.status`) as MoralEvaluationResult["status"];
    if (!moralEvaluationStatuses.has(resultStatus)) throw new Error(`AI 判断状态不支持：${resultStatus}`);
    const intent = asString(result.intent, `moralReviews[${index}].result.intent`) as MoralEvaluationResult["intent"];
    if (!moralEvaluationIntents.has(intent)) throw new Error(`AI 判断意图不支持：${intent}`);
    const xpDelta = asNumber(result.xpDelta, `moralReviews[${index}].result.xpDelta`) as MoralEvaluationResult["xpDelta"];
    if (!moralEvaluationXpDeltas.has(xpDelta)) throw new Error(`AI 判断 XP 不支持：${xpDelta}`);
    const category = optionalString(result.category);
    if (category && !virtueCategories.has(category as VirtueCategory)) throw new Error(`AI 判断德育维度不支持：${category}`);

    return {
      id: asString(review.id, `moralReviews[${index}].id`),
      childId,
      operatorChildId: optionalString(review.operatorChildId) ?? childId,
      transcript: asString(review.transcript, `moralReviews[${index}].transcript`),
      result: {
        intent,
        category: category as VirtueCategory | undefined,
        xpDelta,
        confidence: asNumber(result.confidence, `moralReviews[${index}].result.confidence`),
        status: resultStatus,
        reasonForChild: asString(result.reasonForChild, `moralReviews[${index}].result.reasonForChild`),
        reasonForTeacher: asString(result.reasonForTeacher, `moralReviews[${index}].result.reasonForTeacher`),
        riskFlags: asArray(result.riskFlags, `moralReviews[${index}].result.riskFlags`).filter((flag): flag is string => typeof flag === "string"),
      },
      status,
      createdAt: asString(review.createdAt, `moralReviews[${index}].createdAt`),
      reviewedAt: optionalString(review.reviewedAt),
      reviewedByChildId: optionalString(review.reviewedByChildId),
      ledgerRecordId: optionalString(review.ledgerRecordId),
      rejectionReason: optionalString(review.rejectionReason),
    };
  });
}

function normalizeShopRedemptions(value: unknown, childIds: Set<string>): ShopRedemption[] {
  return asArray(value ?? [], "shopRedemptions").map((item, index) => {
    const redemption = asObject(item, `shopRedemptions[${index}]`);
    const childId = asString(redemption.childId, `shopRedemptions[${index}].childId`);
    if (!childIds.has(childId)) throw new Error(`兑换记录引用了不存在的幼儿：${childId}`);
    return {
      id: asString(redemption.id, `shopRedemptions[${index}].id`),
      childId,
      rewardId: asString(redemption.rewardId, `shopRedemptions[${index}].rewardId`),
      rewardName: asString(redemption.rewardName, `shopRedemptions[${index}].rewardName`),
      rewardCategory: asString(redemption.rewardCategory, `shopRedemptions[${index}].rewardCategory`),
      cost: asNumber(redemption.cost, `shopRedemptions[${index}].cost`),
      status: "requested",
      createdAt: asString(redemption.createdAt, `shopRedemptions[${index}].createdAt`),
    };
  });
}

function normalizeLotteryDraws(value: unknown, childIds: Set<string>): LotteryDrawRecord[] {
  return asArray(value ?? [], "lotteryDraws").map((item, index) => {
    const draw = asObject(item, `lotteryDraws[${index}]`);
    const childId = asString(draw.childId, `lotteryDraws[${index}].childId`);
    if (!childIds.has(childId)) throw new Error(`抽奖记录引用了不存在的幼儿：${childId}`);
    return {
      id: asString(draw.id, `lotteryDraws[${index}].id`),
      childId,
      childName: asString(draw.childName, `lotteryDraws[${index}].childName`),
      prizeId: asString(draw.prizeId, `lotteryDraws[${index}].prizeId`),
      prizeName: asString(draw.prizeName, `lotteryDraws[${index}].prizeName`),
      rarity:
        draw.rarity === "惊喜" || draw.rarity === "稀有"
          ? draw.rarity
          : "常见",
      description: asString(draw.description, `lotteryDraws[${index}].description`),
      status: "drawn",
      createdAt: asString(draw.createdAt, `lotteryDraws[${index}].createdAt`),
    };
  });
}

function normalizeSettingsChanges(value: unknown): SettingsChangeRecord[] {
  return asArray(value ?? [], "settingsChanges").map((item, index) => {
    const change = asObject(item, `settingsChanges[${index}]`);
    const key = asString(change.key, `settingsChanges[${index}].key`) as SettingsChangeRecord["key"];
    if (!settingsKeys.has(key)) throw new Error(`设置记录类型不支持：${key}`);
    return {
      id: asString(change.id, `settingsChanges[${index}].id`),
      key,
      label: asString(change.label, `settingsChanges[${index}].label`),
      value: asString(change.value, `settingsChanges[${index}].value`),
      createdAt: asString(change.createdAt, `settingsChanges[${index}].createdAt`),
    };
  });
}

export function normalizeOrganizationState(value: unknown): OrganizationState {
  if (value === undefined || value === null) {
    return { activeCurriculumByClassroomId: {}, parentReportReviewsByChildId: {} };
  }
  const organization = asObject(value, "organization");
  const activeCurriculum = asObject(organization.activeCurriculumByClassroomId ?? {}, "organization.activeCurriculumByClassroomId");
  const reportReviews = asObject(organization.parentReportReviewsByChildId ?? {}, "organization.parentReportReviewsByChildId");
  return {
    activeCurriculumByClassroomId: Object.fromEntries(
      Object.entries(activeCurriculum).map(([classroomId, trackId]) => {
        if (typeof trackId !== "string" || trackId.trim() === "") {
          throw new Error(`课程发布状态不支持：${classroomId}`);
        }
        return [classroomId, trackId];
      }),
    ),
    parentReportReviewsByChildId: Object.fromEntries(
      Object.entries(reportReviews).map(([childId, item]) => {
        const review = asObject(item, `organization.parentReportReviewsByChildId.${childId}`);
        const status = asString(review.status, `organization.parentReportReviewsByChildId.${childId}.status`) as ParentReportReviewStatus;
        if (!parentReportReviewStatuses.has(status)) throw new Error(`家长报告审批状态不支持：${status}`);
        const recordChildId = optionalString(review.childId) ?? childId;
        if (recordChildId !== childId) throw new Error(`家长报告审批幼儿不一致：${childId}`);
        return [
          childId,
          {
            childId,
            status,
            updatedAt: asString(review.updatedAt, `organization.parentReportReviewsByChildId.${childId}.updatedAt`),
            reviewedBy: optionalString(review.reviewedBy),
            note: optionalString(review.note),
          },
        ];
      }),
    ),
  };
}

export function createClassroomBackup(input: ClassroomBackupInput, exportedAt = new Date().toISOString()): ClassroomBackupSnapshot {
  return {
    product: classroomBackupProduct,
    schemaVersion: classroomBackupSchemaVersion,
    exportedAt,
    children: input.children.map((child) => ({ ...child })),
    ledger: input.ledger.map((record) => normalizeLedgerRecord({ ...record })),
    moralReviews: input.moralReviews.map((review) => ({ ...review, result: { ...review.result, riskFlags: [...review.result.riskFlags] } })),
    shopRedemptions: input.shopRedemptions.map((redemption) => ({ ...redemption })),
    lotteryDraws: input.lotteryDraws.map((draw) => ({ ...draw })),
    settings: {
      teacherMode: input.teacherMode,
      settingsChanges: input.settingsChanges.map((change) => ({ ...change })),
    },
    organization: normalizeOrganizationState(input.organization),
  };
}

export function parseClassroomBackupJson(json: string): ClassroomBackupSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("备份文件不是有效 JSON");
  }
  return normalizeClassroomBackup(parsed);
}

export function normalizeClassroomBackup(value: unknown): ClassroomBackupSnapshot {
  const snapshot = asObject(value, "backup");
  if (snapshot.product !== classroomBackupProduct) throw new Error("备份文件不是成长岛课堂备份");
  if (snapshot.schemaVersion !== classroomBackupSchemaVersion) throw new Error("备份文件版本不支持");

  const children = normalizeChildren(snapshot.children);
  if (children.length === 0) throw new Error("备份文件没有幼儿数据");
  const childIds = new Set(children.map((child) => child.id));
  const settings = asObject(snapshot.settings, "settings");
  const organization = normalizeOrganizationState(snapshot.organization);
  Object.keys(organization.parentReportReviewsByChildId).forEach((childId) => {
    if (!childIds.has(childId)) throw new Error(`报告审批记录引用了不存在的幼儿：${childId}`);
  });

  return {
    product: classroomBackupProduct,
    schemaVersion: classroomBackupSchemaVersion,
    exportedAt: asString(snapshot.exportedAt, "exportedAt"),
    children,
    ledger: normalizeLedger(snapshot.ledger, childIds),
    moralReviews: normalizeMoralReviews(snapshot.moralReviews ?? [], childIds),
    shopRedemptions: normalizeShopRedemptions(snapshot.shopRedemptions, childIds),
    lotteryDraws: normalizeLotteryDraws(snapshot.lotteryDraws, childIds),
    settings: {
      teacherMode: asBoolean(settings.teacherMode, "settings.teacherMode"),
      settingsChanges: normalizeSettingsChanges(settings.settingsChanges),
    },
    organization,
  };
}

export function summarizeClassroomBackup(snapshot: ClassroomBackupSnapshot): ClassroomBackupSummary {
  return {
    childCount: snapshot.children.length,
    ledgerCount: snapshot.ledger.length,
    reviewCount: snapshot.moralReviews.length,
    shopRedemptionCount: snapshot.shopRedemptions.length,
    lotteryDrawCount: snapshot.lotteryDraws.length,
    settingsChangeCount: snapshot.settings.settingsChanges.length,
    activeCurriculumCount: Object.keys(snapshot.organization.activeCurriculumByClassroomId).length,
    parentReportReviewCount: Object.keys(snapshot.organization.parentReportReviewsByChildId).length,
    exportedAt: snapshot.exportedAt,
  };
}

export function compareClassroomBackups(current: ClassroomBackupSnapshot, incoming: ClassroomBackupSnapshot): ClassroomBackupComparison {
  const currentSummary = summarizeClassroomBackup(current);
  const incomingSummary = summarizeClassroomBackup(incoming);
  return {
    current: currentSummary,
    incoming: incomingSummary,
    childDelta: incomingSummary.childCount - currentSummary.childCount,
    ledgerDelta: incomingSummary.ledgerCount - currentSummary.ledgerCount,
    reviewDelta: incomingSummary.reviewCount - currentSummary.reviewCount,
    shopRedemptionDelta: incomingSummary.shopRedemptionCount - currentSummary.shopRedemptionCount,
    lotteryDrawDelta: incomingSummary.lotteryDrawCount - currentSummary.lotteryDrawCount,
    settingsChangeDelta: incomingSummary.settingsChangeCount - currentSummary.settingsChangeCount,
    activeCurriculumDelta: incomingSummary.activeCurriculumCount - currentSummary.activeCurriculumCount,
    parentReportReviewDelta: incomingSummary.parentReportReviewCount - currentSummary.parentReportReviewCount,
    willReplaceExistingData:
      currentSummary.ledgerCount > 0 ||
      currentSummary.reviewCount > 0 ||
      currentSummary.shopRedemptionCount > 0 ||
      currentSummary.lotteryDrawCount > 0 ||
      currentSummary.settingsChangeCount > 0 ||
      currentSummary.activeCurriculumCount > 0 ||
      currentSummary.parentReportReviewCount > 0,
  };
}

export function createClearedClassroomBackup(input: Pick<ClassroomBackupInput, "children" | "teacherMode">, exportedAt = new Date().toISOString()): ClassroomBackupSnapshot {
  return createClassroomBackup(
    {
      children: input.children,
      ledger: [],
      moralReviews: [],
      shopRedemptions: [],
      lotteryDraws: [],
      teacherMode: input.teacherMode,
      settingsChanges: [],
      organization: { activeCurriculumByClassroomId: {}, parentReportReviewsByChildId: {} },
    },
    exportedAt,
  );
}

export function serializeClassroomBackup(snapshot: ClassroomBackupSnapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}
