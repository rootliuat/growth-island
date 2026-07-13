/**
 * [INPUT]: 依赖真实腾讯凭据、物理麦克风、Playwright Chrome 和应用 real-mic 诊断窗口。
 * [OUTPUT]: 对外在独占端口执行人工白板语音试教并写入脱敏 real-mic-report.json。
 * [POS]: scripts 的人工发布门禁，不进入 CI，不保存音频或完整转写文本。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright";
import { resetQaDatabase } from "./qa-database.mjs";

const outputDir = path.resolve("qa-artifacts/latest");
const reportPath = path.join(outputDir, "real-mic-report.json");
const dbPath = path.join(outputDir, "real-mic-db.json");
const targetCount = Math.max(1, Number(process.env.REAL_MIC_TARGET_COUNT || 3));
const timeoutMs = Math.max(60_000, Number(process.env.REAL_MIC_TIMEOUT_MS || 30 * 60_000));
const vitePort = Number(process.env.REAL_MIC_VITE_PORT || 5173);
const apiPort = Number(process.env.REAL_MIC_API_PORT || 5174);
const baseUrl = `http://127.0.0.1:${vitePort}`;
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

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

async function waitForJson(url, label) {
  const deadline = Date.now() + 18_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // 服务仍在启动。
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
  return { child, reused: false };
}

async function startServices() {
  const api = spawnBackground("api", process.execPath, ["server/beihai-api.mjs"], {
    PORT: String(apiPort),
    BEIHAI_DB_PATH: dbPath,
  });
  const vite = spawnBackground("vite", process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", String(vitePort), "--strictPort"], {
    VITE_API_BASE_URL: apiBaseUrl,
  });
  return [api, vite];
}

function stopServices(services) {
  services.filter((service) => !service.reused).forEach((service) => service.child?.kill("SIGTERM"));
}

function median(values) {
  if (!values.length) return undefined;
  const sorted = values.toSorted((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.rmSync(reportPath, { force: true });
  if (await isPortOpen(apiPort) || await isPortOpen(vitePort)) {
    throw new Error(`Real-mic QA requires free ports ${apiPort} and ${vitePort}; refusing to reuse an unknown service`);
  }
  resetQaDatabase(dbPath);
  const startedAt = new Date().toISOString();
  const services = await startServices();
  let browser;
  try {
    const health = await waitForJson(`${apiBaseUrl}/api/health`, "API health");
    await waitForJson(baseUrl, "Vite");
    if (services.some((service) => service.child.exitCode !== null)) throw new Error("Real-mic QA service exited during startup");
    if (path.resolve(health.dbPath || "") !== dbPath) throw new Error("Real-mic QA connected to an unexpected classroom database");
    if (!health.providers?.speech?.configured) throw new Error("Tencent ASR credentials are not configured for the running API");

    browser = await chromium.launch({
      headless: false,
      ...(process.env.REAL_MIC_CHROME_PATH
        ? { executablePath: process.env.REAL_MIC_CHROME_PATH }
        : { channel: process.env.REAL_MIC_BROWSER_CHANNEL || "chrome" }),
    });
    const context = await browser.newContext({ viewport: null });
    await context.grantPermissions(["microphone"], { origin: baseUrl });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/?qa=real-mic`, { waitUntil: "domcontentloaded" });
    console.log(`请在打开的白板页面完成 ${targetCount} 名孩子的“说成长 → 老师点亮”。`);

    const deadline = Date.now() + timeoutMs;
    let attempts = [];
    while (Date.now() < deadline) {
      if (page.isClosed()) throw new Error("Real microphone browser was closed before completion");
      attempts = await page.evaluate(() => window.__growthIslandSpeechDiagnostics?.attempts ?? []);
      const approvedCount = attempts.filter((attempt) => attempt.outcome === "approved").length;
      process.stdout.write(`\r真实语音进度 ${approvedCount}/${targetCount}`);
      if (approvedCount >= targetCount) break;
      await delay(1_000);
    }
    process.stdout.write("\n");

    const approved = attempts.filter((attempt) => attempt.outcome === "approved").slice(-targetCount);
    const snapshot = await waitForJson(`${apiBaseUrl}/api/classroom`, "classroom snapshot");
    const ledgerRecords = snapshot.ledger.filter(
      (record) => record.source === "dialogue-agent" && record.reviewStatus === "approved" && record.createdAt >= startedAt,
    );
    const asrTimes = approved.map((attempt) => attempt.asrMs).filter(Number.isFinite);
    const firstPassCount = approved.filter((attempt) => attempt.retryCount === 0).length;
    const ok =
      approved.length >= targetCount &&
      ledgerRecords.length === targetCount &&
      asrTimes.every((duration) => duration <= 12_000) &&
      (targetCount < 10 || firstPassCount >= 9);
    const report = {
      generatedAt: new Date().toISOString(),
      startedAt,
      targetCount,
      ok,
      providers: health.providers,
      summary: {
        approvedCount: approved.length,
        firstPassCount,
        ledgerCount: ledgerRecords.length,
        medianAsrMs: median(asrTimes),
        maxAsrMs: asrTimes.length ? Math.max(...asrTimes) : undefined,
      },
      attempts: approved,
    };
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Real microphone report: ${reportPath}`);
    if (!ok) throw new Error("Real microphone acceptance did not meet the configured target");
  } finally {
    await browser?.close();
    stopServices(services);
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), ok: false, error: message }, null, 2)}\n`);
  console.error(message);
  process.exitCode = 1;
});
