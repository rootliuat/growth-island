/**
 * [INPUT]: 依赖损坏临时课堂文件与 Node 子进程启动的 Beihai API。
 * [OUTPUT]: 提供 degraded health、课堂结构化 503 与独立语音识别可用性回归。
 * [POS]: tests/server 的恢复 HTTP 契约测试，验证损坏磁盘不会拖垮进程级健康接口。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let server: ChildProcessWithoutNullStreams;
let tempDir: string;
let baseUrl: string;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function waitForHealth() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for degraded API server");
}

describe("Beihai API classroom recovery state", () => {
  beforeAll(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "beihai-recovery-api-test-"));
    const dbPath = path.join(tempDir, "beihai-db.json");
    await writeFile(dbPath, "{broken", "utf8");
    const port = 6200 + Number(process.env.VITEST_POOL_ID ?? 0) * 100 + Math.floor(Math.random() * 80);
    baseUrl = `http://127.0.0.1:${port}`;
    server = spawn(process.execPath, ["server/beihai-api.mjs"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        BEIHAI_DB_PATH: dbPath,
        PORT: String(port),
        SPEECH_PROVIDER: "mock",
      },
    });
    await waitForHealth();
  }, 10000);

  afterAll(async () => {
    server?.kill("SIGTERM");
    if (tempDir) await rm(tempDir, { recursive: true, force: true });
  });

  it("keeps health available while classroom routes return structured 503", async () => {
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    expect(healthResponse.status).toBe(200);
    expect(await healthResponse.json()).toMatchObject({
      ok: true,
      classroom: { status: "degraded", available: false, schemaVersion: 1 },
    });

    const classroomResponse = await fetch(`${baseUrl}/api/classroom`);
    expect(classroomResponse.status).toBe(503);
    expect(await classroomResponse.json()).toEqual({
      error: "Classroom data unavailable",
      code: "classroom_degraded",
      retryable: false,
    });
  });

  it("keeps classroom-independent transcription available", async () => {
    const response = await fetch(`${baseUrl}/api/speech/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioBase64: "dGVzdA==", voiceFormat: "wav" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ text: expect.any(String) });
  });
});
