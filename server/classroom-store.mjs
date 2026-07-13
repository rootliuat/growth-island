/**
 * [INPUT]: 依赖 classroom-snapshot-file 的可恢复持久化、JSON 文件路径和课堂领域写入参数。
 * [OUTPUT]: 对外提供 createClassroomStore、ClassroomStoreError、幂等 operationId 事务、存储健康状态与声音查询。
 * [POS]: server 的课堂数据事务深 Module，独占串行读改写、操作去重和业务一致性规则。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { randomUUID } from "node:crypto";
import { createClassroomSnapshotFile, ClassroomSnapshotFileError } from "./classroom-snapshot-file.mjs";

const virtueCategories = ["家国情怀", "意志坚韧", "积极阳光", "勇毅有力", "激浊扬清", "开拓创新", "尊矩守法"];
const teacherAdjustmentDeltas = new Set([10, 20, 30]);
const spiritVoiceOptions = [
  { voiceType: 101016, label: "清甜声", providerName: "智甜" },
  { voiceType: 101015, label: "元气声", providerName: "智萌" },
  { voiceType: 502007, label: "小虎声", providerName: "智小虎" },
  { voiceType: 603002, label: "软萌声", providerName: "软萌心心" },
  { voiceType: 603000, label: "少年声", providerName: "懂事少年" },
];
const spiritVoiceTypes = new Set(spiritVoiceOptions.map((voice) => voice.voiceType));
const ledgerSources = new Set(["manual", "dialogue-agent", "math-pk", "undo"]);
const operatorRoles = new Set(["teacher", "child", "system"]);
const reviewStatuses = new Set(["not_required", "pending_review", "approved", "rejected"]);
const ledgerSourceDefaults = {
  manual: { operatorRole: "teacher", aiSuggested: false, reviewStatus: "not_required" },
  "dialogue-agent": { operatorRole: "teacher", aiSuggested: true, reviewStatus: "approved" },
  "math-pk": { operatorRole: "system", aiSuggested: false, reviewStatus: "not_required" },
  undo: { operatorRole: "teacher", aiSuggested: false, reviewStatus: "not_required" },
};
const maxOperationIdLength = 128;

export class ClassroomStoreError extends Error {
  constructor(status, message, { code, retryable } = {}) {
    super(message);
    this.name = "ClassroomStoreError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function fail(status, message, details) {
  throw new ClassroomStoreError(status, message, details);
}

function normalizeOperationId(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > maxOperationIdLength || value.trim() !== value) {
    fail(400, "Invalid operationId");
  }
  return value;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function operationFingerprint(type, payload) {
  return JSON.stringify([type, canonicalize(payload)]);
}

function findOperations(db, operationId) {
  if (!operationId) return [];
  const matches = [];
  db.ledger.forEach((record) => {
    if (record.operationId !== operationId) return;
    matches.push({
      type: record.operationType ?? (record.source === "undo" ? "ledger.undo" : "ledger.create"),
      fingerprint: record.operationFingerprint,
    });
  });
  db.moralReviews.forEach((review) => {
    if (review.operationId === operationId) {
      matches.push({ type: review.operationType ?? "moral.review.create", fingerprint: review.operationFingerprint });
    }
    if (review.approvalOperationId === operationId) {
      matches.push({ type: review.approvalOperationType ?? "moral.review.approve", fingerprint: review.approvalOperationFingerprint });
    }
    if (review.rejectionOperationId === operationId) {
      matches.push({ type: review.rejectionOperationType ?? "moral.review.reject", fingerprint: review.rejectionOperationFingerprint });
    }
  });
  return matches;
}

function isDuplicateOperation(db, operationId, type, fingerprint) {
  const matches = findOperations(db, operationId);
  if (matches.length === 0) return false;
  if (matches.every((match) => match.type === type && match.fingerprint === fingerprint)) return true;
  fail(409, "operationId was already used for a different request", { code: "idempotency_conflict", retryable: false });
}

function getMoralReviewOperation(db, input) {
  const child = db.children.find((item) => item.id === input.childId);
  const operator = db.children.find((item) => item.id === input.operatorChildId);
  if (!child) fail(404, "Child not found");
  if (!operator) fail(400, "Invalid operatorChildId");
  const transcript = typeof input.transcript === "string" ? input.transcript.trim().slice(0, 500) : "";
  if (!transcript) fail(400, "Invalid transcript");
  const operationId = normalizeOperationId(input.operationId);
  const operationType = "moral.review.create";
  const fingerprint = operationFingerprint(operationType, {
    childId: child.id,
    operatorChildId: operator.id,
    transcript,
  });
  return { child, operator, transcript, operationId, operationType, fingerprint };
}

function canApproveMoralGrowth(result) {
  return Boolean(
    result &&
      result.intent === "reward" &&
      result.category &&
      result.xpDelta > 0 &&
      result.confidence >= 0.6,
  );
}

export function normalizeVoiceType(value) {
  const voiceType = Number(value);
  if (!Number.isInteger(voiceType) || !spiritVoiceTypes.has(voiceType)) return undefined;
  return voiceType;
}

function hashText(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getDefaultSpiritVoiceType(child) {
  const numericSpiritId = Number(child?.spiritId);
  const basis = Number.isInteger(numericSpiritId) && numericSpiritId > 0 ? numericSpiritId - 1 : hashText(String(child?.id ?? ""));
  return spiritVoiceOptions[basis % spiritVoiceOptions.length].voiceType;
}

export function getSpiritVoiceOption(voiceType) {
  const normalized = normalizeVoiceType(voiceType);
  return spiritVoiceOptions.find((voice) => voice.voiceType === normalized);
}

function createDemoPendingReview(createdAt = new Date().toISOString()) {
  return {
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
    createdAt,
  };
}

function createDefaultDatabase() {
  const names = [
    "安安", "贝贝", "晨晨", "朵朵", "恩恩", "帆帆", "果果", "禾禾", "佳佳", "可可",
    "乐乐", "萌萌", "年年", "晴晴", "然然", "森森", "甜甜", "文文", "希希", "阳阳",
    "舟舟", "米米", "西西", "悠悠", "石石", "宁宁", "星星", "小满", "一一", "鹿鹿",
    "豆豆", "乔乔", "沐沐", "岚岚", "团团",
  ];
  const children = names.map((name, index) => {
    const child = {
      id: `child-${String(index + 1).padStart(2, "0")}`,
      name,
      spiritId: String(index + 1).padStart(2, "0"),
    };
    return { ...child, petName: `${name}的小伙伴`, voiceType: getDefaultSpiritVoiceType(child), slotId: index + 1 };
  });
  const baseXp = [30, 70, 110, 160, 260, 470, 720, 1010, 1450, 1910];
  const seedStartAt = Date.now() - 6 * 3600_000;
  const ledger = children.slice(0, 16).map((child, index) => ({
    id: `seed-${child.id}`,
    childId: child.id,
    operatorChildId: child.id,
    operatorRole: "teacher",
    delta: baseXp[index % baseXp.length],
    source: "manual",
    category: "积极阳光",
    reason: "演示数据：已有成长 XP",
    aiSuggested: false,
    reviewStatus: "not_required",
    createdAt: new Date(seedStartAt - index * 3600_000).toISOString(),
  }));

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    children,
    ledger,
    moralReviews: [createDemoPendingReview(new Date(seedStartAt + 12 * 60_000).toISOString())],
  };
}

function normalizeSpiritId(value) {
  const spiritNumber = Number(value);
  if (!Number.isInteger(spiritNumber) || spiritNumber < 1 || spiritNumber > 40) return undefined;
  return String(spiritNumber).padStart(2, "0");
}

function normalizeSlotId(value) {
  const slotId = Number(value);
  if (!Number.isInteger(slotId) || slotId < 1 || slotId > 40) return undefined;
  return slotId;
}

function validateCategory(category) {
  return category === undefined || virtueCategories.includes(category);
}

function validateSource(source) {
  return typeof source === "string" && ledgerSources.has(source);
}

function normalizeOperatorRole(source, role) {
  return operatorRoles.has(role) ? role : ledgerSourceDefaults[source]?.operatorRole ?? "teacher";
}

function normalizeReviewStatus(source, status) {
  return reviewStatuses.has(status) ? status : ledgerSourceDefaults[source]?.reviewStatus ?? "not_required";
}

function normalizeLedgerRecord(record) {
  const source = validateSource(record.source) ? record.source : "manual";
  const defaults = ledgerSourceDefaults[source];
  return {
    ...record,
    source,
    operatorRole: normalizeOperatorRole(source, record.operatorRole),
    aiSuggested: typeof record.aiSuggested === "boolean" ? record.aiSuggested : defaults.aiSuggested,
    reviewStatus: normalizeReviewStatus(source, record.reviewStatus),
  };
}

function prepareDatabase(db) {
  if (!db || typeof db !== "object" || Array.isArray(db)) return db;
  db.revision = Number.isInteger(db.revision) && db.revision >= 0 ? db.revision : 0;
  if (Array.isArray(db.children)) {
    db.children = db.children.map((child) => ({
      ...child,
      voiceType: normalizeVoiceType(child.voiceType) ?? getDefaultSpiritVoiceType(child),
    }));
  }
  if (Array.isArray(db.ledger)) db.ledger = db.ledger.map(normalizeLedgerRecord);
  return db;
}

function getXp(childId, ledger) {
  return Math.max(
    0,
    ledger
      .filter((record) => record.childId === childId && !record.undone && record.source !== "undo")
      .reduce((sum, record) => sum + Number(record.delta || 0), 0),
  );
}

function snapshot(db, extra = {}) {
  return {
    children: db.children,
    ledger: db.ledger,
    moralReviews: db.moralReviews ?? [],
    updatedAt: db.updatedAt,
    ...extra,
  };
}

function getPendingReviewForLedger(db, reviewId) {
  if (typeof reviewId !== "string") return undefined;
  return db.moralReviews.find((item) => item.id === reviewId && item.status === "pending_review");
}

function createLedgerEntry(db, input) {
  let delta = Number(input.delta);
  if (delta < 0) delta = Math.max(delta, -getXp(input.childId, db.ledger));
  if (delta === 0 && Number(input.delta) < 0) return undefined;

  const record = {
    id: randomUUID(),
    childId: input.childId,
    operatorChildId: input.operatorChildId,
    operatorRole: normalizeOperatorRole(input.source, input.operatorRole),
    delta,
    source: input.source,
    category: input.category,
    reason: String(input.reason || "成长记录").slice(0, 160),
    aiSuggested:
      typeof input.aiSuggested === "boolean" ? input.aiSuggested : ledgerSourceDefaults[input.source]?.aiSuggested ?? false,
    reviewStatus: normalizeReviewStatus(input.source, input.reviewStatus),
    reviewId: typeof input.reviewId === "string" ? input.reviewId : undefined,
    operationId: input.operationId,
    operationType: input.operationType,
    operationFingerprint: input.operationFingerprint,
    createdAt: new Date().toISOString(),
  };
  db.ledger.unshift(record);
  return record;
}

function adjustPendingReview(pendingReview, child, body, delta) {
  if (!pendingReview) {
    if (delta <= 0) fail(400, "Dialogue-agent ledger entries must be positive growth records");
    return;
  }
  if (pendingReview.childId !== child.id) fail(400, "Ledger entry does not match approved moral review");
  const reviewResult = pendingReview.result;
  if (body.teacherAdjustedReview === true) {
    if (!teacherAdjustmentDeltas.has(delta) || !virtueCategories.includes(body.category)) {
      fail(400, "Review requires teacher adjustment before ledger entry");
    }
    pendingReview.result = {
      ...(reviewResult ?? {}),
      intent: "reward",
      category: body.category,
      xpDelta: delta,
      status: "pending_review",
      reasonForChild: "老师已经改成成长记录。",
      reasonForTeacher: `老师调整为${body.category} +${delta}，原建议已改为成长记录。`,
      riskFlags: Array.from(new Set([...(reviewResult?.riskFlags ?? []), "teacher_adjusted_positive"])),
    };
    return;
  }
  if (!canApproveMoralGrowth(reviewResult)) fail(400, "Review requires teacher adjustment before ledger entry");
  if (delta !== reviewResult.xpDelta || body.category !== reviewResult.category) {
    fail(400, "Ledger entry does not match approved moral review");
  }
}

export function createClassroomStore({ dbPath, snapshotFile }) {
  let transactionTail = Promise.resolve();
  const persistence = snapshotFile ?? createClassroomSnapshotFile({ dbPath, createDefaultDatabase, prepareDatabase });

  function runTransaction(task) {
    const transaction = transactionTail.then(task);
    transactionTail = transaction.then(
      () => undefined,
      () => undefined,
    );
    return transaction;
  }

  function rethrowPersistenceError(error) {
    if (!(error instanceof ClassroomSnapshotFileError)) throw error;
    const status = error.code === "classroom_degraded" || error.code === "classroom_write_failed" ? 503 : 500;
    fail(status, error.message, { code: error.code, retryable: error.retryable });
  }

  async function writeDatabase(db) {
    try {
      const committed = await persistence.commit(db);
      db.updatedAt = committed.updatedAt;
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  async function readDatabase() {
    try {
      return await persistence.read();
    } catch (error) {
      rethrowPersistenceError(error);
    }
  }

  const initialize = () => persistence.initialize();
  const getHealth = () => persistence.getHealth();

  const getSnapshot = () => runTransaction(async () => snapshot(await readDatabase()));

  const getChild = (childId) =>
    runTransaction(async () => {
      const db = await readDatabase();
      const child = db.children.find((item) => item.id === childId);
      if (!child) fail(404, "Child not found");
      return child;
    });

  const validateMoralParticipants = (childId, operatorChildId) =>
    runTransaction(async () => {
      const db = await readDatabase();
      if (!db.children.some((item) => item.id === childId)) fail(404, "Child not found");
      if (!db.children.some((item) => item.id === operatorChildId)) fail(400, "Invalid operatorChildId");
    });

  const patchChild = (childId, body) =>
    runTransaction(async () => {
      const db = await readDatabase();
      const child = db.children.find((item) => item.id === childId);
      if (!child) fail(404, "Child not found");
      if (typeof body.name === "string" && body.name.trim()) child.name = body.name.trim().slice(0, 20);
      if (typeof body.petName === "string" && body.petName.trim()) child.petName = body.petName.trim().slice(0, 30);
      if (body.spiritId !== undefined) {
        const spiritId = normalizeSpiritId(body.spiritId);
        if (!spiritId) fail(400, "Invalid spiritId");
        child.spiritId = spiritId;
      }
      if (body.voiceType !== undefined) {
        const voiceType = normalizeVoiceType(body.voiceType);
        if (!voiceType) fail(400, "Invalid voiceType");
        child.voiceType = voiceType;
      }
      if (body.slotId !== undefined) {
        const slotId = normalizeSlotId(body.slotId);
        if (!slotId) fail(400, "Invalid slotId");
        const occupant = db.children.find((item) => item.slotId === slotId && item.id !== child.id);
        if (occupant) occupant.slotId = child.slotId;
        child.slotId = slotId;
      }
      await writeDatabase(db);
      return snapshot(db);
    });

  const createLedger = (body) =>
    runTransaction(async () => {
      const db = await readDatabase();
      const child = db.children.find((item) => item.id === body.childId);
      const operator = db.children.find((item) => item.id === body.operatorChildId);
      if (!child) fail(404, "Child not found");
      if (!operator) fail(400, "Invalid operatorChildId");
      if (!validateSource(body.source)) fail(400, "Invalid source");
      if (!validateCategory(body.category)) fail(400, "Invalid category");

      let delta = Number(body.delta);
      if (!Number.isInteger(delta) || delta < -100 || delta > 100) fail(400, "Invalid delta");
      const operationId = normalizeOperationId(body.operationId);
      const operationType = "ledger.create";
      const fingerprint = operationFingerprint(operationType, {
        aiSuggested: body.aiSuggested,
        category: body.category,
        childId: child.id,
        delta,
        operatorChildId: operator.id,
        operatorRole: body.operatorRole,
        reason: String(body.reason || "成长记录").slice(0, 160),
        reviewId: body.reviewId,
        reviewStatus: body.reviewStatus,
        source: body.source,
        teacherAdjustedReview: body.teacherAdjustedReview === true,
      });
      if (isDuplicateOperation(db, operationId, operationType, fingerprint)) {
        await persistence.ensureCurrentSnapshot();
        return { created: true, snapshot: snapshot(db), duplicate: true };
      }
      const pendingReview = getPendingReviewForLedger(db, body.reviewId);
      if (body.source === "dialogue-agent" || body.reviewId) {
        if (body.reviewId && body.source !== "dialogue-agent") {
          fail(400, "Moral review ledger entries must use dialogue-agent source");
        }
        if (body.reviewId && !pendingReview) fail(400, "Invalid pending reviewId");
        adjustPendingReview(pendingReview, child, body, delta);
      }
      if (delta < 0) delta = Math.max(delta, -getXp(child.id, db.ledger));
      if (delta === 0 && Number(body.delta) < 0) {
        return { created: false, snapshot: snapshot(db, { notice: "xp_floor" }) };
      }

      const record = createLedgerEntry(db, {
        ...body,
        childId: child.id,
        operatorChildId: operator.id,
        delta,
        operationId,
        operationType,
        operationFingerprint: fingerprint,
      });
      if (record?.reviewId) {
        const review = pendingReview ?? getPendingReviewForLedger(db, record.reviewId);
        if (review) {
          review.status = "approved";
          review.reviewedAt = new Date().toISOString();
          review.reviewedByChildId = operator.id;
          review.ledgerRecordId = record.id;
          review.approvalOperationId = record.operationId;
          review.approvalOperationType = operationType;
          review.approvalOperationFingerprint = fingerprint;
        }
      }
      await writeDatabase(db);
      return { created: true, snapshot: snapshot(db) };
    });

  const undoLedger = (body) =>
    runTransaction(async () => {
      const db = await readDatabase();
      const operator = db.children.find((item) => item.id === body.operatorChildId);
      if (!operator) fail(400, "Invalid operatorChildId");
      const target = db.ledger.find((record) => record.id === body.recordId);
      if (!target) fail(404, "Record not found");
      const operationId = normalizeOperationId(body.operationId);
      const operationType = "ledger.undo";
      const fingerprint = operationFingerprint(operationType, {
        operatorChildId: operator.id,
        recordId: target.id,
      });
      if (isDuplicateOperation(db, operationId, operationType, fingerprint)) {
        await persistence.ensureCurrentSnapshot();
        return snapshot(db);
      }
      if (target.undone || target.undoOf || target.source === "undo") fail(409, "Record cannot be undone");
      target.undone = true;
      db.ledger.unshift({
        id: randomUUID(),
        childId: target.childId,
        operatorChildId: operator.id,
        operatorRole: "teacher",
        delta: -target.delta,
        source: "undo",
        category: target.category,
        reason: `撤销：${target.reason}`,
        aiSuggested: false,
        reviewStatus: "not_required",
        createdAt: new Date().toISOString(),
        undoOf: target.id,
        operationId,
        operationType,
        operationFingerprint: fingerprint,
      });
      await writeDatabase(db);
      return snapshot(db);
    });

  const createMoralReview = (input) =>
    runTransaction(async () => {
      const db = await readDatabase();
      const { child, operator, transcript, operationId, operationType, fingerprint } = getMoralReviewOperation(db, input);
      if (isDuplicateOperation(db, operationId, operationType, fingerprint)) {
        const existing = db.moralReviews.find((review) => review.operationId === operationId);
        await persistence.ensureCurrentSnapshot();
        return { reviewItem: existing, snapshot: snapshot(db), duplicate: true };
      }
      const reviewItem = {
        id: randomUUID(),
        childId: child.id,
        operatorChildId: operator.id,
        transcript,
        result: input.result,
        evaluationProvider: input.evaluationProvider,
        evaluationModel: input.evaluationModel,
        evaluationProviderError: input.evaluationProviderError,
        evaluationUsage: input.evaluationUsage,
        status: "pending_review",
        createdAt: new Date().toISOString(),
        operationId,
        operationType,
        operationFingerprint: fingerprint,
      };
      db.moralReviews.unshift(reviewItem);
      await writeDatabase(db);
      return { reviewItem, snapshot: snapshot(db) };
    });

  const getMoralReviewByOperation = (input) =>
    runTransaction(async () => {
      const db = await readDatabase();
      const { operationId, operationType, fingerprint } = getMoralReviewOperation(db, input);
      if (!isDuplicateOperation(db, operationId, operationType, fingerprint)) return undefined;
      const reviewItem = db.moralReviews.find((review) => review.operationId === operationId);
      await persistence.ensureCurrentSnapshot();
      return { reviewItem, snapshot: snapshot(db), duplicate: true };
    });

  const approveMoralReview = (reviewId, body) =>
    runTransaction(async () => {
      const db = await readDatabase();
      const operator = db.children.find((item) => item.id === body.operatorChildId);
      if (!operator) fail(400, "Invalid operatorChildId");
      const review = db.moralReviews.find((item) => item.id === reviewId);
      if (!review) fail(404, "Review not found");
      const operationId = normalizeOperationId(body.operationId);
      const operationType = "moral.review.approve";
      const fingerprint = operationFingerprint(operationType, {
        operatorChildId: operator.id,
        reviewId: review.id,
      });
      if (isDuplicateOperation(db, operationId, operationType, fingerprint)) {
        await persistence.ensureCurrentSnapshot();
        return snapshot(db);
      }
      if (review.status !== "pending_review") fail(409, "Review already handled");
      if (!canApproveMoralGrowth(review.result)) fail(400, "Review requires teacher adjustment before approval");
      review.status = "approved";
      review.reviewedAt = new Date().toISOString();
      review.reviewedByChildId = operator.id;
      review.approvalOperationId = operationId;
      review.approvalOperationType = operationType;
      review.approvalOperationFingerprint = fingerprint;
      if (review.result?.xpDelta && review.result.xpDelta !== 0) {
        const record = createLedgerEntry(db, {
          childId: review.childId,
          operatorChildId: operator.id,
          operatorRole: "teacher",
          delta: review.result.xpDelta,
          source: "dialogue-agent",
          category: review.result.category,
          reason: `复核通过：${review.transcript}`,
          aiSuggested: true,
          reviewStatus: "approved",
          reviewId: review.id,
          operationId,
          operationType,
          operationFingerprint: fingerprint,
        });
        if (record) review.ledgerRecordId = record.id;
      }
      await writeDatabase(db);
      return snapshot(db);
    });

  const rejectMoralReview = (reviewId, body) =>
    runTransaction(async () => {
      const db = await readDatabase();
      const operator = db.children.find((item) => item.id === body.operatorChildId);
      if (!operator) fail(400, "Invalid operatorChildId");
      const review = db.moralReviews.find((item) => item.id === reviewId);
      if (!review) fail(404, "Review not found");
      const operationId = normalizeOperationId(body.operationId);
      const operationType = "moral.review.reject";
      const fingerprint = operationFingerprint(operationType, {
        operatorChildId: operator.id,
        rejectionReason: String(body.rejectionReason || "老师复核后驳回").slice(0, 120),
        reviewId: review.id,
      });
      if (isDuplicateOperation(db, operationId, operationType, fingerprint)) {
        await persistence.ensureCurrentSnapshot();
        return snapshot(db);
      }
      if (review.status !== "pending_review") fail(409, "Review already handled");
      review.status = "rejected";
      review.reviewedAt = new Date().toISOString();
      review.reviewedByChildId = operator.id;
      review.rejectionReason = String(body.rejectionReason || "老师复核后驳回").slice(0, 120);
      review.rejectionOperationId = operationId;
      review.rejectionOperationType = operationType;
      review.rejectionOperationFingerprint = fingerprint;
      await writeDatabase(db);
      return snapshot(db);
    });

  return {
    approveMoralReview,
    createLedger,
    createMoralReview,
    getChild,
    getHealth,
    getMoralReviewByOperation,
    getSnapshot,
    initialize,
    patchChild,
    rejectMoralReview,
    undoLedger,
    validateMoralParticipants,
  };
}
