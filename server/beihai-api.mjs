import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateMoralText } from "./moral-agent.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(rootDir, "data");
const dbPath = process.env.BEIHAI_DB_PATH || path.join(dataDir, "beihai-db.json");
const port = Number(process.env.PORT || 5174);

const virtueCategories = ["家国情怀", "意志坚韧", "积极阳光", "勇毅有力", "激浊扬清", "开拓创新", "尊矩守法"];
const ledgerSources = new Set(["manual", "dialogue-agent", "math-pk", "undo"]);

function createDefaultDatabase() {
  const names = [
    "安安", "贝贝", "晨晨", "朵朵", "恩恩", "帆帆", "果果", "禾禾", "佳佳", "可可",
    "乐乐", "萌萌", "年年", "晴晴", "然然", "森森", "甜甜", "文文", "希希", "阳阳",
    "舟舟", "米米", "西西", "悠悠", "石石", "宁宁", "星星", "小满", "一一", "鹿鹿",
    "豆豆", "乔乔", "沐沐", "岚岚", "团团",
  ];
  const children = names.map((name, index) => ({
    id: `child-${String(index + 1).padStart(2, "0")}`,
    name,
    spiritId: String(index + 1).padStart(2, "0"),
    petName: `${name}的小伙伴`,
    slotId: index + 1,
  }));
  const baseXp = [30, 70, 110, 160, 260, 470, 720, 1010, 1450, 1910];
  const seedStartAt = Date.now() - 6 * 3600_000;
  const ledger = children.slice(0, 16).map((child, index) => ({
    id: `seed-${child.id}`,
    childId: child.id,
    operatorChildId: child.id,
    delta: baseXp[index % baseXp.length],
    source: "manual",
    category: "积极阳光",
    reason: "演示数据：已有成长 XP",
    createdAt: new Date(seedStartAt - index * 3600_000).toISOString(),
  }));

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    children,
    ledger,
    moralReviews: [],
  };
}

async function readDatabase() {
  try {
    const db = JSON.parse(await readFile(dbPath, "utf8"));
    db.children ??= [];
    db.ledger ??= [];
    db.moralReviews ??= [];
    return db;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    const db = createDefaultDatabase();
    await writeDatabase(db);
    return db;
  }
}

async function writeDatabase(db) {
  await mkdir(dataDir, { recursive: true });
  db.updatedAt = new Date().toISOString();
  const tempPath = `${dbPath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  await rename(tempPath, dbPath);
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

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(body));
}

function sendError(response, status, message) {
  sendJson(response, status, { error: message });
}

async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.byteLength;
    if (size > 1_000_000) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
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

function createLedgerEntry(db, input) {
  let delta = Number(input.delta);
  if (delta < 0) delta = Math.max(delta, -getXp(input.childId, db.ledger));
  if (delta === 0 && Number(input.delta) < 0) return undefined;

  const record = {
    id: randomUUID(),
    childId: input.childId,
    operatorChildId: input.operatorChildId,
    delta,
    source: input.source,
    category: input.category,
    reason: String(input.reason || "成长记录").slice(0, 160),
    createdAt: new Date().toISOString(),
  };
  db.ledger.unshift(record);
  return record;
}

async function handlePatchChild(request, response, childId) {
  const body = await readBody(request);
  const db = await readDatabase();
  const child = db.children.find((item) => item.id === childId);
  if (!child) return sendError(response, 404, "Child not found");

  if (typeof body.name === "string" && body.name.trim()) child.name = body.name.trim().slice(0, 20);
  if (typeof body.petName === "string" && body.petName.trim()) child.petName = body.petName.trim().slice(0, 30);
  if (body.spiritId !== undefined) {
    const spiritId = normalizeSpiritId(body.spiritId);
    if (!spiritId) return sendError(response, 400, "Invalid spiritId");
    child.spiritId = spiritId;
  }
  if (body.slotId !== undefined) {
    const slotId = normalizeSlotId(body.slotId);
    if (!slotId) return sendError(response, 400, "Invalid slotId");
    const occupant = db.children.find((item) => item.slotId === slotId && item.id !== child.id);
    if (occupant) occupant.slotId = child.slotId;
    child.slotId = slotId;
  }

  await writeDatabase(db);
  return sendJson(response, 200, snapshot(db));
}

async function handleCreateLedger(request, response) {
  const body = await readBody(request);
  const db = await readDatabase();
  const child = db.children.find((item) => item.id === body.childId);
  const operator = db.children.find((item) => item.id === body.operatorChildId);
  if (!child) return sendError(response, 404, "Child not found");
  if (!operator) return sendError(response, 400, "Invalid operatorChildId");
  if (!validateSource(body.source)) return sendError(response, 400, "Invalid source");
  if (!validateCategory(body.category)) return sendError(response, 400, "Invalid category");

  let delta = Number(body.delta);
  if (!Number.isInteger(delta) || delta < -100 || delta > 100) return sendError(response, 400, "Invalid delta");
  if (delta < 0) {
    delta = Math.max(delta, -getXp(child.id, db.ledger));
  }
  if (delta === 0 && Number(body.delta) < 0) {
    return sendJson(response, 200, snapshot(db, { notice: "xp_floor" }));
  }

  createLedgerEntry(db, {
    childId: child.id,
    operatorChildId: operator.id,
    delta,
    source: body.source,
    category: body.category,
    reason: String(body.reason || "成长记录").slice(0, 160),
  });
  await writeDatabase(db);
  return sendJson(response, 201, snapshot(db));
}

async function handleUndoLedger(request, response) {
  const body = await readBody(request);
  const db = await readDatabase();
  const operator = db.children.find((item) => item.id === body.operatorChildId);
  if (!operator) return sendError(response, 400, "Invalid operatorChildId");
  const target = db.ledger.find((record) => record.id === body.recordId);
  if (!target) return sendError(response, 404, "Record not found");
  if (target.undone || target.undoOf || target.source === "undo") return sendError(response, 409, "Record cannot be undone");

  target.undone = true;
  db.ledger.unshift({
    id: randomUUID(),
    childId: target.childId,
    operatorChildId: operator.id,
    delta: -target.delta,
    source: "undo",
    category: target.category,
    reason: `撤销：${target.reason}`,
    createdAt: new Date().toISOString(),
    undoOf: target.id,
  });
  await writeDatabase(db);
  return sendJson(response, 200, snapshot(db));
}

async function handleMoralEvaluate(request, response) {
  const body = await readBody(request);
  const db = await readDatabase();
  const child = db.children.find((item) => item.id === body.childId);
  const operator = db.children.find((item) => item.id === body.operatorChildId);
  if (!child) return sendError(response, 404, "Child not found");
  if (!operator) return sendError(response, 400, "Invalid operatorChildId");

  const transcript = String(body.transcript || "").trim().slice(0, 500);
  const result = evaluateMoralText(transcript);
  const reviewItem = {
    id: randomUUID(),
    childId: child.id,
    operatorChildId: operator.id,
    transcript,
    result,
    status: result.status === "auto_posted" ? "auto_posted" : "pending_review",
    createdAt: new Date().toISOString(),
  };

  if (result.status === "auto_posted" && result.xpDelta !== 0) {
    const record = createLedgerEntry(db, {
      childId: child.id,
      operatorChildId: operator.id,
      delta: result.xpDelta,
      source: "dialogue-agent",
      category: result.category,
      reason: `对话：${transcript}`,
    });
    if (record) reviewItem.ledgerRecordId = record.id;
  }

  db.moralReviews.unshift(reviewItem);
  await writeDatabase(db);
  return sendJson(response, 200, {
    result,
    reviewItem,
    snapshot: snapshot(db),
  });
}

async function handleApproveMoralReview(request, response, reviewId) {
  const body = await readBody(request);
  const db = await readDatabase();
  const operator = db.children.find((item) => item.id === body.operatorChildId);
  if (!operator) return sendError(response, 400, "Invalid operatorChildId");
  const review = db.moralReviews.find((item) => item.id === reviewId);
  if (!review) return sendError(response, 404, "Review not found");
  if (review.status !== "pending_review") return sendError(response, 409, "Review already handled");

  review.status = "approved";
  review.reviewedAt = new Date().toISOString();
  review.reviewedByChildId = operator.id;
  if (review.result?.xpDelta && review.result.xpDelta !== 0) {
    const record = createLedgerEntry(db, {
      childId: review.childId,
      operatorChildId: operator.id,
      delta: review.result.xpDelta,
      source: "dialogue-agent",
      category: review.result.category,
      reason: `复核通过：${review.transcript}`,
    });
    if (record) review.ledgerRecordId = record.id;
  }

  await writeDatabase(db);
  return sendJson(response, 200, snapshot(db));
}

async function handleRejectMoralReview(request, response, reviewId) {
  const body = await readBody(request);
  const db = await readDatabase();
  const operator = db.children.find((item) => item.id === body.operatorChildId);
  if (!operator) return sendError(response, 400, "Invalid operatorChildId");
  const review = db.moralReviews.find((item) => item.id === reviewId);
  if (!review) return sendError(response, 404, "Review not found");
  if (review.status !== "pending_review") return sendError(response, 409, "Review already handled");

  review.status = "rejected";
  review.reviewedAt = new Date().toISOString();
  review.reviewedByChildId = operator.id;
  review.rejectionReason = String(body.rejectionReason || "老师复核后驳回").slice(0, 120);
  await writeDatabase(db);
  return sendJson(response, 200, snapshot(db));
}

const server = createServer(async (request, response) => {
  try {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (request.method === "GET" && url.pathname === "/api/health") {
      return sendJson(response, 200, { ok: true, dbPath });
    }
    if (request.method === "GET" && url.pathname === "/api/classroom") {
      const db = await readDatabase();
      return sendJson(response, 200, snapshot(db));
    }
    if (request.method === "POST" && url.pathname === "/api/agent/moral-evaluate") {
      return handleMoralEvaluate(request, response);
    }
    const reviewMatch = url.pathname.match(/^\/api\/agent\/reviews\/([^/]+)\/(approve|reject)$/);
    if (request.method === "POST" && reviewMatch) {
      const reviewId = decodeURIComponent(reviewMatch[1]);
      return reviewMatch[2] === "approve"
        ? handleApproveMoralReview(request, response, reviewId)
        : handleRejectMoralReview(request, response, reviewId);
    }
    const childMatch = url.pathname.match(/^\/api\/children\/([^/]+)$/);
    if (request.method === "PATCH" && childMatch) {
      return handlePatchChild(request, response, decodeURIComponent(childMatch[1]));
    }
    if (request.method === "POST" && url.pathname === "/api/ledger") {
      return handleCreateLedger(request, response);
    }
    if (request.method === "POST" && url.pathname === "/api/ledger/undo") {
      return handleUndoLedger(request, response);
    }
    return sendError(response, 404, "Not found");
  } catch (error) {
    console.error(error);
    return sendError(response, 500, error instanceof Error ? error.message : "Internal server error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Beihai API listening on http://localhost:${port}`);
  console.log(`Database: ${dbPath}`);
});
