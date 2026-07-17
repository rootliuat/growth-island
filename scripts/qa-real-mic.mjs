/**
 * [INPUT]: 依赖生产构建或 HTTPS 预发布地址、真实腾讯凭据、物理麦克风、Playwright Chrome 与发布规则。
 * [OUTPUT]: 对外执行目标白板 45 FPS + 3/10 人真实语音门禁并写入无音频、无全文的脱敏报告。
 * [POS]: scripts 的人工生产发布门禁，不进入 CI，可托管本地生产预览或连接线上预发布环境。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright";
import { resetQaDatabase } from "./qa-database.mjs";
import { inspectPixiRenderState, measureHomeDrag, measureHomeWheel } from "./qa/home-tools.mjs";
import { evaluateMapPerformance, evaluateRealMicAcceptance, normalizeReleaseTarget } from "./qa/release-gate.mjs";

const outputDir = path.resolve("qa-artifacts/latest");
const reportPath = path.join(outputDir, "real-mic-report.json");
const dbPath = path.join(outputDir, "real-mic-db.json");
const targetCount = Number(process.env.REAL_MIC_TARGET_COUNT || 3);
const requestedTimeoutMs = Number(process.env.REAL_MIC_TIMEOUT_MS || 30 * 60_000);
const timeoutMs = Number.isFinite(requestedTimeoutMs) ? Math.max(60_000, requestedTimeoutMs) : 30 * 60_000;
const vitePort = Number(process.env.REAL_MIC_VITE_PORT || 5173);
const apiPort = Number(process.env.REAL_MIC_API_PORT || 5174);
const externalTarget = Boolean(process.env.REAL_MIC_BASE_URL?.trim());
let baseUrl;
let apiBaseUrl;
let targetConfigurationError;
try {
  baseUrl = normalizeReleaseTarget(
    process.env.REAL_MIC_BASE_URL?.trim() || `http://127.0.0.1:${vitePort}`,
    "REAL_MIC_BASE_URL",
  );
  apiBaseUrl = normalizeReleaseTarget(
    process.env.REAL_MIC_API_BASE_URL?.trim() || (externalTarget ? baseUrl : `http://127.0.0.1:${apiPort}`),
    "REAL_MIC_API_BASE_URL",
  );
} catch (error) {
  targetConfigurationError = error;
}
const manifestPath = path.resolve("dist/.vite/manifest.json");
const httpCredentials =
  process.env.REAL_MIC_HTTP_USERNAME && process.env.REAL_MIC_HTTP_PASSWORD
    ? { username: process.env.REAL_MIC_HTTP_USERNAME, password: process.env.REAL_MIC_HTTP_PASSWORD }
    : undefined;
let activeBrowser;
let activeServices = [];
let cleanupPromise;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestHeaders() {
  if (!httpCredentials) return {};
  return { Authorization: `Basic ${Buffer.from(`${httpCredentials.username}:${httpCredentials.password}`).toString("base64")}` };
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
      const response = await fetch(url, { headers: requestHeaders() });
      if (response.ok) return response;
    } catch {
      // 服务仍在启动或预发布网络尚未就绪。
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${label}: ${url}`);
}

async function waitForJson(url, label) {
  const response = await waitForHttp(url, label);
  return response.json();
}

function spawnBackground(name, command, args, env) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  return { name, child };
}

async function startServices() {
  if (externalTarget) return [];
  if (!fs.existsSync(manifestPath)) throw new Error("Production manifest is missing; run npm run build first");
  if (await isPortOpen(apiPort) || await isPortOpen(vitePort)) {
    throw new Error(`Real-mic QA requires free ports ${apiPort} and ${vitePort}; refusing to reuse an unknown service`);
  }
  resetQaDatabase(dbPath);
  return [
    spawnBackground("api", process.execPath, ["server/beihai-api.mjs"], {
      HOST: "127.0.0.1",
      PORT: String(apiPort),
      BEIHAI_DB_PATH: dbPath,
    }),
    spawnBackground(
      "preview",
      process.execPath,
      ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(vitePort), "--strictPort"],
      { BEIHAI_API_PROXY_TARGET: apiBaseUrl },
    ),
  ];
}

async function stopService(service) {
  if (!service?.child || service.child.exitCode !== null) return;
  service.child.kill("SIGTERM");
  await delay(350);
  if (service.child.exitCode === null) service.child.kill("SIGKILL");
}

function cleanupRuntime() {
  cleanupPromise ??= (async () => {
    await activeBrowser?.close().catch(() => undefined);
    activeBrowser = undefined;
    await Promise.all(activeServices.reverse().map(stopService));
    activeServices = [];
  })();
  return cleanupPromise;
}

for (const [signal, exitCode] of [["SIGINT", 130], ["SIGTERM", 143]]) {
  process.once(signal, () => {
    cleanupRuntime().finally(() => process.exit(exitCode));
  });
}

async function collectRuntime(page) {
  return page.evaluate(async () => {
    const canvas = document.querySelector(".pixi-world-canvas");
    const gl = canvas instanceof HTMLCanvasElement ? canvas.getContext("webgl2") || canvas.getContext("webgl") : undefined;
    const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
    const navigation = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const microphonePermission = await navigator.permissions
      .query({ name: "microphone" })
      .then((status) => status.state)
      .catch(() => "unsupported");
    return {
      isSecureContext,
      origin: location.origin,
      microphonePermissionBefore: microphonePermission,
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemoryGb: navigator.deviceMemory,
      devicePixelRatio,
      viewport: { width: innerWidth, height: innerHeight },
      screen: { width: screen.width, height: screen.height, colorDepth: screen.colorDepth },
      webgl: {
        vendor: debugInfo ? gl?.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : undefined,
        renderer: debugInfo ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : undefined,
      },
      navigation: navigation
        ? {
            responseStartMs: Math.round(navigation.responseStart),
            domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
            loadMs: Math.round(navigation.loadEventEnd),
            transferBytes: navigation.transferSize,
            decodedBytes: navigation.decodedBodySize,
          }
        : undefined,
      resources: {
        count: resources.length,
        transferBytes: Math.round(resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)),
        decodedBytes: Math.round(resources.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0)),
      },
    };
  });
}

async function measureTargetMap(page) {
  await page.waitForSelector(".pixi-world-canvas", { timeout: 12_000 });
  await page.waitForSelector(".pixi-world-canvas[data-render-state='idle']", { timeout: 8_000 }).catch(() => undefined);
  const initialRenderState = await inspectPixiRenderState(page);
  const wheelFps = await measureHomeWheel(page);
  const dragFps = await measureHomeDrag(page);
  return { initialRenderState, wheelFps, dragFps };
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.rmSync(reportPath, { force: true });
  if (![3, 10].includes(targetCount)) throw new Error("REAL_MIC_TARGET_COUNT must be 3 or 10");
  if (targetConfigurationError) throw targetConfigurationError;
  const startedAt = new Date().toISOString();
  const services = await startServices();
  activeServices = services;
  let browser;
  try {
    const health = await waitForJson(`${apiBaseUrl}/api/health`, "API health");
    await waitForHttp(baseUrl, externalTarget ? "staging app" : "production preview");
    if (services.some((service) => service.child.exitCode !== null)) throw new Error("Real-mic QA service exited during startup");
    if (!externalTarget && path.resolve(health.dbPath || "") !== dbPath) {
      throw new Error("Real-mic QA connected to an unexpected classroom database");
    }
    if (!health.classroom?.available) throw new Error("Classroom storage is unavailable");
    if (externalTarget && (!health.releaseVersion || health.releaseVersion === "development")) {
      throw new Error("HTTPS staging API must expose a non-development RELEASE_VERSION");
    }
    if (health.providers?.speech?.name !== "tencent" || !health.providers?.speech?.configured) {
      throw new Error("Real-mic release gate requires configured Tencent ASR; mock speech is not accepted");
    }
    const initialSnapshot = await waitForJson(`${apiBaseUrl}/api/classroom`, "initial classroom snapshot");
    const initialLedgerIds = new Set(initialSnapshot.ledger.map((record) => record.id));

    browser = await chromium.launch({
      headless: false,
      ...(process.env.REAL_MIC_CHROME_PATH
        ? { executablePath: process.env.REAL_MIC_CHROME_PATH }
        : { channel: process.env.REAL_MIC_BROWSER_CHANNEL || "chrome" }),
    });
    activeBrowser = browser;
    const context = await browser.newContext({ viewport: null, ...(httpCredentials ? { httpCredentials } : {}) });
    const page = await context.newPage();
    const targetUrl = new URL(baseUrl);
    targetUrl.searchParams.set("module", "home");
    targetUrl.searchParams.set("qa", "real-mic");
    await page.goto(targetUrl.toString(), { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForLoadState("networkidle", { timeout: 20_000 });
    await page.waitForSelector(".home-screen-shell", { timeout: 12_000 });

    const runtime = await collectRuntime(page);
    runtime.expectedOrigin = new URL(baseUrl).origin;
    const performance = await measureTargetMap(page);
    const mapGate = evaluateMapPerformance(performance);
    console.log(
      `目标设备地图：wheel=${mapGate.wheelFps ?? "n/a"} FPS，drag=${mapGate.dragFps ?? "n/a"} FPS，${mapGate.ok ? "通过" : "未达 45 FPS"}`,
    );
    console.log(`请在打开的目标白板页面完成 ${targetCount} 名不同孩子的“说成长 → 老师点亮”。`);

    const deadline = Date.now() + timeoutMs;
    let attempts = [];
    while (Date.now() < deadline) {
      if (page.isClosed()) throw new Error("Real microphone browser was closed before completion");
      attempts = await page.evaluate(() => window.__growthIslandSpeechDiagnostics?.attempts ?? []);
      const approvedCount = attempts.filter((attempt) => attempt.outcome === "approved").length;
      process.stdout.write(`\r真实语音进度 ${Math.min(approvedCount, targetCount)}/${targetCount}`);
      if (approvedCount >= targetCount) break;
      await delay(1_000);
    }
    process.stdout.write("\n");
    runtime.microphonePermissionAfter = await page.evaluate(() =>
      navigator.permissions
        .query({ name: "microphone" })
        .then((status) => status.state)
        .catch(() => "unsupported"),
    );

    const snapshot = await waitForJson(`${apiBaseUrl}/api/classroom`, "classroom snapshot");
    const ledgerRecords = snapshot.ledger.filter(
      (record) => record.source === "dialogue-agent" && record.reviewStatus === "approved" && !initialLedgerIds.has(record.id),
    );
    const acceptance = evaluateRealMicAcceptance({
      targetCount,
      attempts,
      ledgerRecords,
      providers: health.providers,
      runtime,
      performance,
    });
    const report = {
      generatedAt: new Date().toISOString(),
      startedAt,
      targetCount,
      mode: externalTarget ? "https-staging" : "local-production-preview",
      targetOrigin: new URL(baseUrl).origin,
      releaseVersion: health.releaseVersion,
      ok: acceptance.ok,
      failures: acceptance.failures,
      providers: health.providers,
      runtime,
      performance: { ...performance, release: acceptance.map },
      dataRevision: { before: initialSnapshot.revision, after: snapshot.revision },
      summary: acceptance.summary,
      attempts: acceptance.approved,
    };
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Real microphone report: ${reportPath}`);
    if (!acceptance.ok) throw new Error(`Real microphone acceptance failed: ${acceptance.failures.join("; ")}`);
  } finally {
    await cleanupRuntime();
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(reportPath)) {
    fs.writeFileSync(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), ok: false, error: message }, null, 2)}\n`);
  }
  console.error(message);
  process.exitCode = 1;
});
