import { createHash, createHmac, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateMoralText } from "./moral-agent.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(rootDir, "data");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const envText = readFileSync(filePath, "utf8");
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(rootDir, ".env"));

const dbPath = process.env.BEIHAI_DB_PATH || path.join(dataDir, "beihai-db.json");
const port = Number(process.env.PORT || 5174);

const virtueCategories = ["家国情怀", "意志坚韧", "积极阳光", "勇毅有力", "激浊扬清", "开拓创新", "尊矩守法"];
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
    return {
      ...child,
      petName: `${name}的小伙伴`,
      voiceType: getDefaultSpiritVoiceType(child),
      slotId: index + 1,
    };
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

function normalizeVoiceType(value) {
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

function getDefaultSpiritVoiceType(child) {
  const numericSpiritId = Number(child?.spiritId);
  const basis = Number.isInteger(numericSpiritId) && numericSpiritId > 0 ? numericSpiritId - 1 : hashText(String(child?.id ?? ""));
  return spiritVoiceOptions[basis % spiritVoiceOptions.length].voiceType;
}

function getSpiritVoiceOption(voiceType) {
  const normalized = normalizeVoiceType(voiceType);
  return spiritVoiceOptions.find((voice) => voice.voiceType === normalized);
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

function hmac(key, data, encoding) {
  return createHmac("sha256", key).update(data).digest(encoding);
}

function sha256(data, encoding = "hex") {
  return createHash("sha256").update(data).digest(encoding);
}

async function callTencentCloud({ service, action, version, region = "ap-guangzhou", payload, secretId, secretKey }) {
  const host = `${service}.tencentcloudapi.com`;
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const body = JSON.stringify(payload);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`;
  const signedHeaders = "content-type;host";
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, sha256(body)].join("\n");
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = ["TC3-HMAC-SHA256", String(timestamp), credentialScope, sha256(canonicalRequest)].join("\n");
  const secretDate = hmac(`TC3${secretKey}`, date);
  const secretService = hmac(secretDate, service);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = hmac(secretSigning, stringToSign, "hex");
  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const cloudResponse = await fetch(`https://${host}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json; charset=utf-8",
      Host: host,
      "X-TC-Action": action,
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Version": version,
      "X-TC-Region": region,
    },
    body,
  });

  return cloudResponse.json();
}

async function synthesizeTencentSpeech({ text, child, voiceType }) {
  const secretId = process.env.TENCENT_TTS_SECRET_ID || process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_TTS_SECRET_KEY || process.env.TENCENT_SECRET_KEY;
  if (!secretId || !secretKey) {
    throw new Error("Tencent TTS credentials are not configured");
  }

  const result = await callTencentCloud({
    service: "tts",
    action: "TextToVoice",
    version: "2019-08-23",
    secretId,
    secretKey,
    payload: {
      Text: text,
      SessionId: `points-game-${child.id}-${Date.now()}`,
      ModelType: 1,
      VoiceType: voiceType,
      Codec: "mp3",
      SampleRate: 16000,
    },
  });

  const error = result?.Response?.Error;
  if (error) {
    throw new Error(`${error.Code}: ${error.Message}`);
  }

  return result?.Response?.Audio;
}

function normalizeAudioBase64(value) {
  const text = String(value || "").trim();
  const commaIndex = text.indexOf(",");
  return commaIndex >= 0 && text.slice(0, commaIndex).includes("base64") ? text.slice(commaIndex + 1) : text;
}

async function transcribeTencentSpeech({ audioBase64, voiceFormat = "mp3" }) {
  const secretId = process.env.TENCENT_ASR_SECRET_ID || process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_ASR_SECRET_KEY || process.env.TENCENT_SECRET_KEY;
  if (!secretId || !secretKey) {
    throw new Error("Tencent ASR credentials are not configured");
  }

  const data = normalizeAudioBase64(audioBase64);
  const audio = Buffer.from(data, "base64");
  if (!data || audio.byteLength === 0) throw new Error("Invalid audio data");
  if (audio.byteLength > 3 * 1024 * 1024) throw new Error("Audio data exceeds Tencent ASR 3MB limit");

  const result = await callTencentCloud({
    service: "asr",
    action: "SentenceRecognition",
    version: "2019-06-14",
    region: process.env.TENCENT_ASR_REGION || "ap-guangzhou",
    secretId,
    secretKey,
    payload: {
      ProjectId: 0,
      SubServiceType: 2,
      EngSerViceType: process.env.TENCENT_ASR_ENGINE || "16k_zh",
      SourceType: 1,
      VoiceFormat: voiceFormat,
      Data: data,
      DataLen: audio.byteLength,
    },
  });

  const error = result?.Response?.Error;
  if (error) {
    throw new Error(`${error.Code}: ${error.Message}`);
  }

  return {
    text: String(result?.Response?.Result || "").trim(),
    audioDuration: result?.Response?.AudioDuration,
    wordSize: result?.Response?.WordSize,
    requestId: result?.Response?.RequestId,
  };
}

function extractJsonObject(text) {
  const trimmed = String(text || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : undefined;
  }
}

function normalizeDeepSeekMoralResult(raw, fallback) {
  const intent = ["reward", "deduct", "no_score", "needs_clarification"].includes(raw?.intent)
    ? raw.intent
    : fallback.intent;
  const category = validateCategory(raw?.category) ? raw.category : fallback.category;
  const numericDelta = Number(raw?.xpDelta);
  const allowedDeltas = new Set([-30, -20, -10, 0, 10, 20, 30]);
  const xpDelta = allowedDeltas.has(numericDelta) ? numericDelta : fallback.xpDelta;
  const confidence = Number.isFinite(Number(raw?.confidence))
    ? Math.max(0, Math.min(0.98, Number(raw.confidence)))
    : fallback.confidence;
  const status = xpDelta === 0 || intent === "needs_clarification" ? "manual_fallback" : "pending_review";
  const riskFlags = Array.isArray(raw?.riskFlags) ? raw.riskFlags.map(String).slice(0, 4) : fallback.riskFlags;

  return {
    intent,
    category,
    xpDelta,
    confidence,
    status,
    reasonForChild: String(raw?.reasonForChild || fallback.reasonForChild).slice(0, 80),
    reasonForTeacher: String(raw?.reasonForTeacher || fallback.reasonForTeacher).slice(0, 160),
    riskFlags: xpDelta < 0 ? Array.from(new Set([...riskFlags, "teacher_required_for_negative"])) : riskFlags,
  };
}

async function evaluateMoralTranscript(transcript) {
  const fallback = evaluateMoralText(transcript);
  if (process.env.LLM_PROVIDER !== "deepseek" || !process.env.DEEPSEEK_API_KEY) {
    return { result: fallback, provider: "rules" };
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是幼儿园德育成长记录助手。只输出 JSON，不要解释。字段：intent(reward/deduct/no_score/needs_clarification), category(家国情怀/意志坚韧/积极阳光/勇毅有力/激浊扬清/开拓创新/尊矩守法), xpDelta(-30/-20/-10/0/10/20/30), confidence(0-1), reasonForChild, reasonForTeacher, riskFlags数组。负向内容只能给 pending review 建议，不能自动入账。",
        },
        {
          role: "user",
          content: `孩子说：${transcript}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 420,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`DeepSeek ${response.status}: ${message.slice(0, 180)}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const parsed = extractJsonObject(content);
  if (!parsed) throw new Error("DeepSeek returned non-JSON moral evaluation");

  return {
    result: normalizeDeepSeekMoralResult(parsed, fallback),
    provider: "deepseek",
    model: payload?.model || model,
  };
}

async function handleSpeechSpeak(request, response) {
  const body = await readBody(request);
  const db = await readDatabase();
  const child = db.children.find((item) => item.id === body.childId);
  if (!child) return sendError(response, 404, "Child not found");

  const text = String(body.text || "").trim().slice(0, 120);
  if (!text) return sendError(response, 400, "Invalid text");

  const voiceType = normalizeVoiceType(child.voiceType) ?? getDefaultSpiritVoiceType(child);
  const voice = getSpiritVoiceOption(voiceType);
  const audioBase64 = await synthesizeTencentSpeech({ text, child, voiceType });
  if (!audioBase64) return sendError(response, 502, "Tencent TTS returned empty audio");

  return sendJson(response, 200, {
    provider: "tencent",
    childId: child.id,
    voiceType,
    voiceLabel: voice?.label,
    codec: "mp3",
    sampleRate: 16000,
    audioBase64,
  });
}

async function handleSpeechTranscribe(request, response) {
  const body = await readBody(request);
  const voiceFormat = String(body.voiceFormat || "mp3").trim().toLowerCase();
  const result = await transcribeTencentSpeech({
    audioBase64: body.audioBase64,
    voiceFormat,
  });
  if (!result.text) return sendError(response, 502, "Tencent ASR returned empty transcript");

  return sendJson(response, 200, {
    provider: "tencent",
    text: result.text,
    voiceFormat,
    engineModel: process.env.TENCENT_ASR_ENGINE || "16k_zh",
    audioDuration: result.audioDuration,
    wordSize: result.wordSize,
    requestId: result.requestId,
  });
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
  if (body.voiceType !== undefined) {
    const voiceType = normalizeVoiceType(body.voiceType);
    if (!voiceType) return sendError(response, 400, "Invalid voiceType");
    child.voiceType = voiceType;
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
    operatorRole: body.operatorRole,
    delta,
    source: body.source,
    category: body.category,
    reason: String(body.reason || "成长记录").slice(0, 160),
    aiSuggested: body.aiSuggested,
    reviewStatus: body.reviewStatus,
    reviewId: body.reviewId,
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
  const evaluation = await evaluateMoralTranscript(transcript);
  const result = evaluation.result;
  const reviewItem = {
    id: randomUUID(),
    childId: child.id,
    operatorChildId: operator.id,
    transcript,
    result,
    status: "pending_review",
    createdAt: new Date().toISOString(),
  };

  db.moralReviews.unshift(reviewItem);
  await writeDatabase(db);
  return sendJson(response, 200, {
    result,
    reviewItem,
    snapshot: snapshot(db),
    provider: evaluation.provider,
    model: evaluation.model,
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
    if (request.method === "POST" && url.pathname === "/api/speech/speak") {
      return handleSpeechSpeak(request, response);
    }
    if (request.method === "POST" && url.pathname === "/api/speech/transcribe") {
      return handleSpeechTranscribe(request, response);
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
