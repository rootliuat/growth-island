/**
 * [INPUT]: 依赖本地伪造 DeepSeek、隔离 API 子进程和可控超时/并发时序。
 * [OUTPUT]: 提供 Provider 成功/降级/超时、评估幂等预检、并发写与 mock 语音回归。
 * [POS]: tests/server 的 Provider 稳定性端到端测试，验证外部等待不破坏课堂事务。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { MoralAgentResponse, SpeechRecognitionResponse, SpeechSynthesisResponse } from "../../src/types";

let fakeDeepSeek: Server;
let apiServer: ChildProcessWithoutNullStreams;
let tempDir: string;
let apiBaseUrl: string;
let deepSeekMode: "error" | "paused-valid" | "slow" | "valid" = "error";
let releasePausedDeepSeek: (() => void) | undefined;
let deepSeekRequestCount = 0;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function listen(server: Server, port = 0) {
  return new Promise<number>((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : port);
    });
  });
}

async function waitForHealth() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for provider stability API server");
}

async function postJson<T>(route: string, body: unknown): Promise<T> {
  const payload = /^\/api\/(?:ledger(?:\/undo)?|agent\/(?:moral-evaluate|reviews\/))/.test(route)
    ? { ...(body as Record<string, unknown>), operationId: (body as Record<string, unknown>).operationId ?? crypto.randomUUID() }
    : body;
  const response = await fetch(`${apiBaseUrl}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`${route} failed ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function getJson<T>(route: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${route}`);
  if (!response.ok) throw new Error(`${route} failed ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

function sendValidDeepSeekResponse(response: import("node:http").ServerResponse) {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(
    JSON.stringify({
      model: "fake-deepseek",
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: "reward",
              category: "积极阳光",
              xpDelta: 20,
              confidence: 0.91,
              reasonForChild: "精灵收到了友爱能量。",
              reasonForTeacher: "测试模型返回。",
              riskFlags: ["teacher_confirmation_required"],
            }),
          },
        },
      ],
      usage: { total_tokens: 42 },
    }),
  );
}

describe("provider stability safeguards", () => {
  beforeAll(async () => {
    fakeDeepSeek = createServer((request, response) => {
      if (request.url !== "/chat/completions") {
        response.writeHead(404).end();
        return;
      }
      deepSeekRequestCount += 1;
      if (deepSeekMode === "slow") {
        setTimeout(() => {
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ choices: [{ message: { content: "{}" } }] }));
        }, 1_000);
        return;
      }
      if (deepSeekMode === "paused-valid") {
        releasePausedDeepSeek = () => sendValidDeepSeekResponse(response);
        return;
      }
      if (deepSeekMode === "valid") {
        sendValidDeepSeekResponse(response);
        return;
      }
      response.writeHead(503, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "temporary upstream failure" }));
    });
    const deepSeekPort = await listen(fakeDeepSeek);

    tempDir = await mkdtemp(path.join(tmpdir(), "beihai-provider-test-"));
    const apiPort = 5400 + Number(process.env.VITEST_POOL_ID ?? 0) * 100 + Math.floor(Math.random() * 80);
    apiBaseUrl = `http://127.0.0.1:${apiPort}`;
    apiServer = spawn(process.execPath, ["server/beihai-api.mjs"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        BEIHAI_DB_PATH: path.join(tempDir, "beihai-db.json"),
        DEEPSEEK_API_KEY: "test-deepseek-key",
        DEEPSEEK_BASE_URL: `http://127.0.0.1:${deepSeekPort}`,
        DEEPSEEK_TIMEOUT_MS: "150",
        LLM_PROVIDER: "deepseek",
        MOCK_ASR_TEXT: "我今天主动帮同学收玩具",
        PORT: String(apiPort),
        SPEECH_PROVIDER: "mock",
      },
    });
    await waitForHealth();
  }, 10000);

  afterAll(async () => {
    apiServer?.kill("SIGTERM");
    fakeDeepSeek?.close();
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it("uses DeepSeek when the provider returns a valid response", async () => {
    deepSeekMode = "valid";

    const response = await postJson<MoralAgentResponse>("/api/agent/moral-evaluate", {
      childId: "child-01",
      operatorChildId: "child-01",
      transcript: "我今天主动帮同学收玩具",
    });

    expect(response.provider).toBe("deepseek");
    expect(response.model).toBe("fake-deepseek");
    expect(response.result).toMatchObject({ category: "积极阳光", xpDelta: 20, status: "pending_review" });
    expect(response.usage).toEqual({ total_tokens: 42 });
  });

  it("returns a stored moral review before calling DeepSeek again", async () => {
    deepSeekMode = "valid";
    const operationId = `stable-moral-${crypto.randomUUID()}`;
    const body = {
      childId: "child-11",
      operatorChildId: "child-01",
      transcript: "  我今天主动帮同学收玩具  ",
      operationId,
    };
    const before = deepSeekRequestCount;

    const first = await postJson<MoralAgentResponse>("/api/agent/moral-evaluate", body);
    const duplicate = await postJson<MoralAgentResponse>("/api/agent/moral-evaluate", { ...body, transcript: body.transcript.trim() });

    expect(deepSeekRequestCount).toBe(before + 1);
    expect(duplicate.reviewItem.id).toBe(first.reviewItem.id);
    expect(duplicate.result).toEqual(first.result);
    expect(duplicate.provider).toBe("deepseek");
  });

  it("preserves a ledger write completed while DeepSeek evaluation is in flight", async () => {
    deepSeekMode = "paused-valid";
    releasePausedDeepSeek = undefined;
    const reason = `并发写保护 ${crypto.randomUUID()}`;
    const evaluationPromise = postJson<MoralAgentResponse>("/api/agent/moral-evaluate", {
      childId: "child-01",
      operatorChildId: "child-01",
      transcript: "我今天主动帮同学收玩具",
    });
    const deadline = Date.now() + 1_000;
    while (!releasePausedDeepSeek && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const releaseDeepSeek = releasePausedDeepSeek as (() => void) | undefined;
    expect(releaseDeepSeek).toBeTypeOf("function");
    if (!releaseDeepSeek) throw new Error("DeepSeek request did not reach the pause gate");

    await postJson("/api/ledger", {
      childId: "child-02",
      operatorChildId: "child-01",
      delta: 10,
      source: "manual",
      category: "积极阳光",
      reason,
    });
    releaseDeepSeek();
    const evaluation = await evaluationPromise;
    const snapshot = await getJson<import("../../src/types").ClassroomSnapshot>("/api/classroom");

    expect(snapshot.ledger.some((record) => record.reason === reason)).toBe(true);
    expect(snapshot.moralReviews?.some((review) => review.id === evaluation.reviewItem.id)).toBe(true);
  });

  it("falls back to local rules when DeepSeek returns an upstream error", async () => {
    deepSeekMode = "error";

    const response = await postJson<MoralAgentResponse>("/api/agent/moral-evaluate", {
      childId: "child-01",
      operatorChildId: "child-01",
      transcript: "我今天主动帮同学收玩具",
    });

    expect(response.provider).toBe("rules");
    expect(response.providerError).toContain("DeepSeek 503");
    expect(response.result).toMatchObject({ category: "积极阳光", xpDelta: 30, status: "pending_review" });
  });

  it("times out slow DeepSeek calls and still returns a local rule result", async () => {
    deepSeekMode = "slow";
    const startedAt = Date.now();

    const response = await postJson<MoralAgentResponse>("/api/agent/moral-evaluate", {
      childId: "child-01",
      operatorChildId: "child-01",
      transcript: "我今天主动帮同学收玩具",
    });

    expect(Date.now() - startedAt).toBeLessThan(900);
    expect(response.provider).toBe("rules");
    expect(response.providerError).toContain("timed out");
    expect(response.result).toMatchObject({ category: "积极阳光", xpDelta: 30 });
  });

  it("supports mock speech providers without Tencent credentials", async () => {
    const health = await getJson<{
      providers: { speech: { name: string; configured: boolean }; llm: { name: string; configured: boolean } };
    }>("/api/health");
    expect(health.providers).toEqual({
      speech: { name: "mock", configured: true },
      llm: { name: "deepseek", configured: true },
    });

    const speech = await postJson<SpeechSynthesisResponse>("/api/speech/speak", {
      childId: "child-01",
      text: "精灵收到了新的成长能量。",
    });
    expect(speech).toMatchObject({ provider: "mock", codec: "mp3", voiceType: 101016 });
    expect(Buffer.byteLength(speech.audioBase64, "base64")).toBeGreaterThan(0);

    const asr = await postJson<SpeechRecognitionResponse>("/api/speech/transcribe", {
      audioBase64: speech.audioBase64,
      voiceFormat: "mp3",
    });
    expect(asr).toMatchObject({ provider: "mock", text: "我今天主动帮同学收玩具" });
  });
});
