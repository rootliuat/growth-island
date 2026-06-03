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
let deepSeekMode: "error" | "slow" | "valid" = "error";

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
  const response = await fetch(`${apiBaseUrl}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${route} failed ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

describe("provider stability safeguards", () => {
  beforeAll(async () => {
    fakeDeepSeek = createServer((request, response) => {
      if (request.url !== "/chat/completions") {
        response.writeHead(404).end();
        return;
      }
      if (deepSeekMode === "slow") {
        setTimeout(() => {
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ choices: [{ message: { content: "{}" } }] }));
        }, 1_000);
        return;
      }
      if (deepSeekMode === "valid") {
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
