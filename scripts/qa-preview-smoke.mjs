/**
 * [INPUT]: 依赖 Vite 生产 manifest/预览、Beihai API、Playwright 与系统 Chrome 的首页运行环境
 * [OUTPUT]: 输出生产首页冒烟截图、运行状态与运行图级懒加载边界报告，并以退出码暴露失败
 * [POS]: scripts 的生产构建验收入口，验证首页可用性及 Three.js/非首页运行图不被提前加载
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { chromium } from "playwright";

const outputDir = path.resolve("qa-artifacts/latest");
const reportPath = path.join(outputDir, "preview-smoke-report.json");
const previewPort = Number(process.env.PREVIEW_SMOKE_PORT || 4173);
const apiPort = Number(process.env.PREVIEW_SMOKE_API_PORT || 5174);
const previewBaseUrl = `http://127.0.0.1:${previewPort}`;
const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
const dbPath = path.join(outputDir, "preview-smoke-db.json");
const manifestPath = path.resolve("dist/.vite/manifest.json");
const systemChromePath = process.env.PLAYWRIGHT_CHROME_PATH
  || (fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined);

function collectRuntimeChunks(manifest, rootKey, collected = new Set()) {
  if (collected.has(rootKey)) return collected;
  const chunk = manifest[rootKey];
  if (!chunk) throw new Error(`Missing manifest entry: ${rootKey}`);
  collected.add(rootKey);
  (chunk.imports ?? []).forEach((key) => collectRuntimeChunks(manifest, key, collected));
  if (rootKey !== "index.html") {
    (chunk.dynamicImports ?? []).forEach((key) => collectRuntimeChunks(manifest, key, collected));
  }
  return collected;
}

function getDeferredChunkFiles() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const entry = manifest["index.html"];
  if (!entry?.isEntry) throw new Error("Production manifest is missing index.html entry");
  const pixiKey = entry.dynamicImports?.find((key) => manifest[key]?.name === "PixiWorldMap");
  if (!pixiKey) throw new Error("Production manifest is missing PixiWorldMap dynamic entry");

  const allowedHomeKeys = collectRuntimeChunks(manifest, pixiKey);
  collectRuntimeChunks(manifest, "index.html", allowedHomeKeys);
  const deferredKeys = new Set();
  entry.dynamicImports
    .filter((key) => key !== pixiKey)
    .forEach((key) => collectRuntimeChunks(manifest, key, deferredKeys));

  return [...deferredKeys]
    .filter((key) => !allowedHomeKeys.has(key))
    .map((key) => `/${manifest[key].file}`)
    .sort();
}

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
  const deadline = Date.now() + 15_000;
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

function spawnProcess(name, command, args, env) {
  const output = [];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => output.push(`[${name}] ${chunk.toString()}`));
  child.stderr.on("data", (chunk) => output.push(`[${name}] ${chunk.toString()}`));
  return { name, child, output };
}

async function stopProcess(processInfo) {
  if (!processInfo || processInfo.reused || processInfo.child.killed) return;
  processInfo.child.kill("SIGTERM");
  await delay(250);
  if (!processInfo.child.killed) processInfo.child.kill("SIGKILL");
}

async function startApi() {
  if (await isPortOpen(apiPort)) return { name: "api", reused: true, output: [] };
  return spawnProcess("api", process.execPath, ["server/beihai-api.mjs"], {
    PORT: String(apiPort),
    BEIHAI_DB_PATH: dbPath,
  });
}

async function startPreview() {
  if (await isPortOpen(previewPort)) return { name: "preview", reused: true, output: [] };
  return spawnProcess("preview", process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(previewPort)], {
    VITE_API_BASE_URL: apiBaseUrl,
  });
}

async function runBrowserSmoke() {
  const deferredChunkFiles = getDeferredChunkFiles();
  const browser = await chromium.launch({
    headless: true,
    ...(systemChromePath ? { executablePath: systemChromePath } : {}),
  });
  const context = await browser.newContext({
    viewport: { width: 1850, height: 1150 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const resourceFailures = [];
  const loadedScripts = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText ?? "";
    failedRequests.push({ url, failure });
    if (/\.(?:avif|gif|glb|gltf|jpe?g|png|svg|webp)(?:\?|$)/i.test(url)) {
      resourceFailures.push({ url, failure });
    }
  });
  page.on("response", (response) => {
    const request = response.request();
    if (request.resourceType() !== "script" && !/\.js(?:\?|$)/i.test(response.url())) return;
    loadedScripts.push(new URL(response.url()).pathname);
  });

  try {
    const url = new URL(previewBaseUrl);
    url.searchParams.set("module", "home");
    await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 12_000 });
    await page.waitForSelector(".home-screen-shell", { timeout: 10_000 });
    await page.waitForSelector(".pixi-world-canvas", { timeout: 10_000 });
    await page.waitForSelector(".shell-child-chip", { timeout: 10_000 });
    await page.waitForTimeout(700);

    const screenshot = path.join(outputDir, "preview-smoke-home-whiteboard.png");
    await page.screenshot({ path: screenshot, fullPage: false });

    const state = await page.evaluate(() => {
      const canvas = document.querySelector(".pixi-world-canvas");
      const childChip = document.querySelector(".shell-child-chip");
      const homeShell = document.querySelector(".home-screen-shell");
      const visibleText = document.body.innerText || "";
      const canvasRect = canvas?.getBoundingClientRect();
      const chipRect = childChip?.getBoundingClientRect();
      return {
        hasRoot: Boolean(document.querySelector("#root")?.children.length),
        hasHomeShell: Boolean(homeShell),
        hasCanvas: Boolean(canvas && canvasRect && canvasRect.width > 800 && canvasRect.height > 500),
        canvasRenderState: canvas?.getAttribute("data-render-state") ?? "",
        canvasRenderResolution: Number(canvas?.getAttribute("data-render-resolution") || Number.NaN),
        hasChildChip: Boolean(childChip && chipRect && chipRect.width >= 44 && chipRect.height >= 44),
        childChipText: childChip?.textContent?.replace(/\s+/g, "") ?? "",
        hasCurrentChildName: /安安|贝贝|晨晨|朵朵|恩恩|帆帆|年年/.test(visibleText),
        hasSelfServiceCopy: visibleText.includes("说成长"),
        hasHorizontalOverflow: document.body.scrollWidth > document.documentElement.clientWidth,
      };
    });

    const uniqueLoadedScripts = [...new Set(loadedScripts)].sort();
    const deferredChunkSet = new Set(deferredChunkFiles);
    const unexpectedEagerChunks = uniqueLoadedScripts.filter((scriptPath) => deferredChunkSet.has(scriptPath));

    return {
      state,
      screenshot,
      consoleErrors,
      failedRequests,
      resourceFailures,
      loadedScripts: uniqueLoadedScripts,
      deferredChunkFiles,
      unexpectedEagerChunks,
    };
  } finally {
    await context.close();
    await browser.close();
  }
}

async function run() {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.rmSync(dbPath, { force: true });

  const api = await startApi();
  const preview = await startPreview();
  const spawned = [api, preview];

  try {
    await waitForHttp(`${apiBaseUrl}/api/health`, "API health");
    await waitForHttp(previewBaseUrl, "Vite preview");
    const browser = await runBrowserSmoke();
    const failures = [];
    if (!browser.state.hasRoot) failures.push("React root did not render");
    if (!browser.state.hasHomeShell) failures.push("home shell missing");
    if (!browser.state.hasCanvas) failures.push("Pixi canvas missing or too small");
    if (!browser.state.hasChildChip) failures.push("selected child chip missing or too small");
    if (!browser.state.hasCurrentChildName) failures.push("current child name not visible");
    if (!browser.state.hasSelfServiceCopy) failures.push("self-service copy missing");
    if (browser.state.hasHorizontalOverflow) failures.push("horizontal overflow detected");
    if (browser.resourceFailures.length) failures.push(`${browser.resourceFailures.length} image/model resource request(s) failed`);
    if (browser.consoleErrors.length) failures.push(`${browser.consoleErrors.length} browser console/page error(s)`);
    if (browser.unexpectedEagerChunks.length) failures.push(`${browser.unexpectedEagerChunks.length} lazy chunk(s) loaded eagerly on home`);

    const report = {
      generatedAt: new Date().toISOString(),
      previewBaseUrl,
      apiBaseUrl,
      reusedProcesses: spawned.filter((item) => item.reused).map((item) => item.name),
      state: browser.state,
      screenshot: browser.screenshot,
      consoleErrors: browser.consoleErrors,
      failedRequests: browser.failedRequests,
      resourceFailures: browser.resourceFailures,
      loadedScripts: browser.loadedScripts,
      deferredChunkFiles: browser.deferredChunkFiles,
      unexpectedEagerChunks: browser.unexpectedEagerChunks,
      ok: failures.length === 0,
      failures,
    };
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Preview smoke report: ${reportPath}`);
    console.log(`screenshot=${browser.screenshot}`);
    if (failures.length) {
      failures.forEach((failure) => console.error(`FAIL: ${failure}`));
      process.exitCode = 1;
    }
  } finally {
    await Promise.all(spawned.reverse().map(stopProcess));
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
