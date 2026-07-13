/**
 * [INPUT]: 依赖临时课堂目录、Node API 子进程、SIGKILL 与真实 HTTP/文件系统。
 * [OUTPUT]: 提供强杀后耐久重启及主文件损坏后快照恢复的进程级回归。
 * [POS]: tests/server 的课堂崩溃恢复验收，跨越 HTTP、事务、fsync、rename 与启动状态机。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { ClassroomSnapshot } from "../../src/types";

let server: ChildProcessWithoutNullStreams | undefined;
let tempDir: string | undefined;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function startApi(dbPath: string, port: number) {
  server = spawn(process.execPath, ["server/beihai-api.mjs"], {
    cwd: repoRoot,
    env: { ...process.env, BEIHAI_DB_PATH: dbPath, PORT: String(port), SPEECH_PROVIDER: "mock" },
  });
  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return baseUrl;
    } catch {
      // Server is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out waiting for crash recovery API");
}

async function stopApi(signal: NodeJS.Signals = "SIGTERM") {
  const child = server;
  server = undefined;
  if (!child || child.exitCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill(signal);
  await exited;
}

afterEach(async () => {
  await stopApi();
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("classroom process crash recovery", () => {
  it("survives SIGKILL and restores the last committed snapshot after main-file corruption", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "beihai-crash-test-"));
    const dbPath = path.join(tempDir, "beihai-db.json");
    const port = 7100 + Number(process.env.VITEST_POOL_ID ?? 0) * 100 + Math.floor(Math.random() * 60);
    let baseUrl = await startApi(dbPath, port);
    const reason = `强杀恢复 ${crypto.randomUUID()}`;
    const createResponse = await fetch(`${baseUrl}/api/ledger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId: "child-01",
        operatorChildId: "child-01",
        delta: 10,
        source: "manual",
        category: "积极阳光",
        reason,
        operationId: crypto.randomUUID(),
      }),
    });
    expect(createResponse.status).toBe(201);

    await stopApi("SIGKILL");
    baseUrl = await startApi(dbPath, port);
    let snapshot = await fetch(`${baseUrl}/api/classroom`).then((response) => response.json() as Promise<ClassroomSnapshot>);
    expect(snapshot.ledger.some((record) => record.reason === reason)).toBe(true);

    await stopApi("SIGKILL");
    await writeFile(dbPath, "{power-loss", "utf8");
    baseUrl = await startApi(dbPath, port);
    const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
    expect(health).toMatchObject({ classroom: { status: "recovered", available: true } });
    snapshot = await fetch(`${baseUrl}/api/classroom`).then((response) => response.json() as Promise<ClassroomSnapshot>);
    expect(snapshot.ledger.some((record) => record.reason === reason)).toBe(true);
  });
});
