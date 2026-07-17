/**
 * [INPUT]: 依赖隔离 QA 数据库、Beihai API、Vite、视觉 QA runner 与试教资源门禁。
 * [OUTPUT]: 对外在独占端口执行可选课堂 checks 与资源校验，并以退出码汇总结果。
 * [POS]: scripts 的试教 QA 编排入口，负责测试服务生命周期和恢复快照隔离。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { resetQaDatabase } from "./qa-database.mjs";

const outputDir = path.resolve("qa-artifacts/latest");
const qaChecks = process.env.TRIAL_QA_CHECKS || "home,moral-speak-flow,classroom-touch-loop,spirit-showcase-3d";
const baseUrl = process.env.TRIAL_QA_BASE_URL || "http://127.0.0.1:5173";
const viteUrl = new URL(baseUrl);
const vitePort = Number(viteUrl.port || 5173);
const apiPort = Number(process.env.TRIAL_API_PORT || 5174);
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const dbPath = path.join(outputDir, "trial-qa-db.json");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(400, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForHttp(url, label) {
  const deadline = Date.now() + 18_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still booting.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${label}: ${url}`);
}

function spawnBackground(name, command, args, env) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  return { name, child, reused: false };
}

async function stopBackground(processInfo) {
  if (!processInfo || processInfo.reused || processInfo.child.killed) return;
  processInfo.child.kill("SIGTERM");
  await delay(250);
  if (!processInfo.child.killed) processInfo.child.kill("SIGKILL");
}

async function startApi() {
  return spawnBackground("api", process.execPath, ["server/beihai-api.mjs"], {
    PORT: String(apiPort),
    BEIHAI_DB_PATH: dbPath,
  });
}

async function startVite() {
  return spawnBackground("vite", process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(vitePort), "--strictPort"], {
    BEIHAI_API_PROXY_TARGET: apiBaseUrl,
  });
}

function runForeground(name, command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${name} exited with code ${code}`));
    });
  });
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  if (await isPortOpen(apiPort) || await isPortOpen(vitePort)) {
    throw new Error(`Trial QA requires free ports ${apiPort} and ${vitePort}; refusing to reuse an unknown service`);
  }
  resetQaDatabase(dbPath);

  const api = await startApi();
  const vite = await startVite();
  const spawned = [api, vite];

  try {
    await waitForHttp(`${apiBaseUrl}/api/health`, "API health");
    await waitForHttp(baseUrl, "Vite dev server");
    if (spawned.some((service) => service.child.exitCode !== null)) throw new Error("Trial QA service exited during startup");
    const health = await fetch(`${apiBaseUrl}/api/health`).then((response) => response.json());
    if (path.resolve(health.dbPath || "") !== dbPath) throw new Error("Trial QA connected to an unexpected classroom database");
    console.log(`Trial QA checks: ${qaChecks}`);
    await runForeground("visual QA", process.execPath, ["scripts/qa-visual.mjs"], {
      QA_BASE_URL: baseUrl,
      QA_CHECKS: qaChecks,
    });
    await runForeground("trial asset QA", process.execPath, ["scripts/check-trial-assets.mjs"], {});
  } finally {
    await Promise.all(spawned.reverse().map(stopBackground));
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
