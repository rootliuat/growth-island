/**
 * [INPUT]: 依赖 JSON 文件路径、node:fs 原子改名能力和课堂领域写入参数。
 * [OUTPUT]: 对外提供 createClassroomStore、ClassroomStoreError 与精灵声音档案查询。
 * [POS]: server 的课堂数据事务深 Module，独占课堂快照读改写和业务一致性规则。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";

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

export class ClassroomStoreError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "ClassroomStoreError";
    this.status = status;
  }
}

function fail(status, message) {
  throw new ClassroomStoreError(status, message);
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

export function createClassroomStore({ dbPath, dataDir }) {
  let transactionTail = Promise.resolve();

  function runTransaction(task) {
    const transaction = transactionTail.then(task);
    transactionTail = transaction.then(
      () => undefined,
      () => undefined,
    );
    return transaction;
  }

  async function writeDatabase(db) {
    await mkdir(dataDir, { recursive: true });
    db.updatedAt = new Date().toISOString();
    const tempPath = `${dbPath}.${process.pid}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
    await rename(tempPath, dbPath);
  }

  async function readDatabase() {
    try {
      const db = JSON.parse(await readFile(dbPath, "utf8"));
      let changed = false;
      db.children ??= [];
      db.children = db.children.map((child) => {
        const voiceType = normalizeVoiceType(child.voiceType) ?? getDefaultSpiritVoiceType(child);
        if (child.voiceType === voiceType) return child;
        changed = true;
        return { ...child, voiceType };
      });
      db.ledger = (db.ledger ?? []).map(normalizeLedgerRecord);
      if (!Array.isArray(db.moralReviews)) {
        db.moralReviews = [];
        changed = true;
      }
      if (db.moralReviews.length === 0) {
        db.moralReviews = [createDemoPendingReview()];
        changed = true;
      }
      if (changed) await writeDatabase(db);
      return db;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const db = createDefaultDatabase();
      await writeDatabase(db);
      return db;
    }
  }

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

      const record = createLedgerEntry(db, { ...body, childId: child.id, operatorChildId: operator.id, delta });
      if (record?.reviewId) {
        const review = pendingReview ?? getPendingReviewForLedger(db, record.reviewId);
        if (review) {
          review.status = "approved";
          review.reviewedAt = new Date().toISOString();
          review.reviewedByChildId = operator.id;
          review.ledgerRecordId = record.id;
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
      });
      await writeDatabase(db);
      return snapshot(db);
    });

  const createMoralReview = (input) =>
    runTransaction(async () => {
      const db = await readDatabase();
      const child = db.children.find((item) => item.id === input.childId);
      const operator = db.children.find((item) => item.id === input.operatorChildId);
      if (!child) fail(404, "Child not found");
      if (!operator) fail(400, "Invalid operatorChildId");
      const reviewItem = {
        id: randomUUID(),
        childId: child.id,
        operatorChildId: operator.id,
        transcript: input.transcript,
        result: input.result,
        status: "pending_review",
        createdAt: new Date().toISOString(),
      };
      db.moralReviews.unshift(reviewItem);
      await writeDatabase(db);
      return { reviewItem, snapshot: snapshot(db) };
    });

  const approveMoralReview = (reviewId, body) =>
    runTransaction(async () => {
      const db = await readDatabase();
      const operator = db.children.find((item) => item.id === body.operatorChildId);
      if (!operator) fail(400, "Invalid operatorChildId");
      const review = db.moralReviews.find((item) => item.id === reviewId);
      if (!review) fail(404, "Review not found");
      if (review.status !== "pending_review") fail(409, "Review already handled");
      if (!canApproveMoralGrowth(review.result)) fail(400, "Review requires teacher adjustment before approval");
      review.status = "approved";
      review.reviewedAt = new Date().toISOString();
      review.reviewedByChildId = operator.id;
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
      if (review.status !== "pending_review") fail(409, "Review already handled");
      review.status = "rejected";
      review.reviewedAt = new Date().toISOString();
      review.reviewedByChildId = operator.id;
      review.rejectionReason = String(body.rejectionReason || "老师复核后驳回").slice(0, 120);
      await writeDatabase(db);
      return snapshot(db);
    });

  return {
    approveMoralReview,
    createLedger,
    createMoralReview,
    getChild,
    getSnapshot,
    patchChild,
    rejectMoralReview,
    undoLedger,
    validateMoralParticipants,
  };
}
