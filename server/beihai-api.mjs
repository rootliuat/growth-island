/**
 * [INPUT]: 依赖 node:http、classroom-store 课堂数据事务和 classroom-providers 外部能力。
 * [OUTPUT]: 对外提供课堂快照、ledger、复核、儿童资料与语音 HTTP 接口。
 * [POS]: server 的薄 HTTP 入口，负责请求解析、路由、错误映射和进程启动。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClassroomProviders, ProviderError } from "./classroom-providers.mjs";
import { createClassroomStore, ClassroomStoreError } from "./classroom-store.mjs";

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
const store = createClassroomStore({ dbPath, dataDir });
const providers = createClassroomProviders();

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

async function handleSpeechSpeak(request, response) {
  const body = await readBody(request);
  const child = await store.getChild(body.childId);
  const text = String(body.text || "").trim().slice(0, 120);
  if (!text) return sendError(response, 400, "Invalid text");
  return sendJson(response, 200, await providers.speak({ text, child }));
}

async function handleSpeechTranscribe(request, response) {
  const body = await readBody(request);
  const voiceFormat = String(body.voiceFormat || "mp3").trim().toLowerCase();
  const result = await providers.transcribe({ audioBase64: body.audioBase64, voiceFormat });
  return sendJson(response, 200, result);
}

async function handlePatchChild(request, response, childId) {
  const snapshot = await store.patchChild(childId, await readBody(request));
  return sendJson(response, 200, snapshot);
}

async function handleCreateLedger(request, response) {
  const result = await store.createLedger(await readBody(request));
  return sendJson(response, result.created ? 201 : 200, result.snapshot);
}

async function handleUndoLedger(request, response) {
  const snapshot = await store.undoLedger(await readBody(request));
  return sendJson(response, 200, snapshot);
}

async function handleMoralEvaluate(request, response) {
  const body = await readBody(request);
  await store.validateMoralParticipants(body.childId, body.operatorChildId);
  const transcript = String(body.transcript || "").trim().slice(0, 500);
  const evaluation = await providers.evaluateMoralTranscript(transcript);
  const result = await store.createMoralReview({
    childId: body.childId,
    operatorChildId: body.operatorChildId,
    transcript,
    result: evaluation.result,
  });
  return sendJson(response, 200, {
    result: evaluation.result,
    reviewItem: result.reviewItem,
    snapshot: result.snapshot,
    provider: evaluation.provider,
    model: evaluation.model,
    providerError: evaluation.providerError,
    usage: evaluation.usage,
  });
}

async function handleMoralReview(request, response, reviewId, action) {
  const body = await readBody(request);
  const snapshot =
    action === "approve"
      ? await store.approveMoralReview(reviewId, body)
      : await store.rejectMoralReview(reviewId, body);
  return sendJson(response, 200, snapshot);
}

async function routeRequest(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (request.method === "GET" && url.pathname === "/api/health") {
    return sendJson(response, 200, { ok: true, dbPath });
  }
  if (request.method === "GET" && url.pathname === "/api/classroom") {
    return sendJson(response, 200, await store.getSnapshot());
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
    return handleMoralReview(request, response, decodeURIComponent(reviewMatch[1]), reviewMatch[2]);
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
    return await routeRequest(request, response);
  } catch (error) {
    if (error instanceof ClassroomStoreError || error instanceof ProviderError) {
      return sendError(response, error.status, error.message);
    }
    console.error(error);
    return sendError(response, 500, error instanceof Error ? error.message : "Internal server error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Beihai API listening on http://localhost:${port}`);
  console.log(`Database: ${dbPath}`);
});
