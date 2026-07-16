/**
 * [INPUT]: 依赖运行中的 Growth Island、Playwright 系统 Chrome、CDP tracing 与首页/教师台交互。
 * [OUTPUT]: 对外提供首页 wheel 与教师台滚动的 renderer、FPS、帧间隔和 Chrome trace 汇总报告。
 * [POS]: scripts 的按需性能诊断入口，不进入普通 CI，由服务生命周期 helper 托管运行。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:5173";
const outputDir = path.resolve("qa-artifacts/latest");
const systemChromePath = process.env.PLAYWRIGHT_CHROME_PATH
  || (fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined);

fs.mkdirSync(outputDir, { recursive: true });

async function measureFrameRate(page, selector, durationMs = 1200) {
  return page.evaluate(
    async ({ targetSelector, durationMs }) => {
      const scroller = document.querySelector(targetSelector) || document.scrollingElement;
      const start = performance.now();
      let frames = 0;
      let maxFrameGap = 0;
      let previous = start;
      const initialScrollTop = scroller && "scrollTop" in scroller ? scroller.scrollTop : 0;

      await new Promise((resolve) => {
        function tick(now) {
          frames += 1;
          maxFrameGap = Math.max(maxFrameGap, now - previous);
          previous = now;
          if (scroller && "scrollTop" in scroller) scroller.scrollTop = initialScrollTop + frames * 6;
          if (now - start < durationMs) requestAnimationFrame(tick);
          else resolve();
        }
        requestAnimationFrame(tick);
      });

      if (scroller && "scrollTop" in scroller) scroller.scrollTop = initialScrollTop;
      return {
        frames,
        fps: Number((frames / (durationMs / 1000)).toFixed(1)),
        maxFrameGap: Number(maxFrameGap.toFixed(1)),
      };
    },
    { targetSelector: selector, durationMs },
  );
}

async function waitForPixiIdle(page) {
  await page.waitForSelector(".pixi-world-canvas[data-render-state='idle']", { timeout: 7000 }).catch(() => undefined);
}

function summarizeTrace(traceEvents) {
  const interesting = new Set([
    "EventDispatch",
    "FunctionCall",
    "Layout",
    "Paint",
    "PrePaint",
    "RasterTask",
    "CompositeLayers",
    "UpdateLayerTree",
  ]);
  const summary = {};

  for (const event of traceEvents) {
    if (!interesting.has(event.name) || typeof event.dur !== "number") continue;
    const current = summary[event.name] ?? { count: 0, totalMs: 0, maxMs: 0 };
    const durationMs = event.dur / 1000;
    current.count += 1;
    current.totalMs += durationMs;
    current.maxMs = Math.max(current.maxMs, durationMs);
    summary[event.name] = current;
  }

  for (const item of Object.values(summary)) {
    item.totalMs = Number(item.totalMs.toFixed(1));
    item.maxMs = Number(item.maxMs.toFixed(1));
  }

  return summary;
}

async function collectTrace(page, name, action) {
  const client = await page.context().newCDPSession(page);
  const traceEvents = [];
  let tracingComplete;
  const completePromise = new Promise((resolve) => {
    tracingComplete = resolve;
  });

  client.on("Tracing.dataCollected", (event) => {
    traceEvents.push(...event.value);
  });
  client.on("Tracing.tracingComplete", () => tracingComplete());

  await client.send("Tracing.start", {
    categories: [
      "devtools.timeline",
      "disabled-by-default-devtools.timeline.frame",
      "blink.user_timing",
      "v8.execute",
    ].join(","),
    options: "sampling-frequency=10000",
  });

  await action();
  await client.send("Tracing.end");
  await completePromise;
  await client.detach();

  const tracePath = path.join(outputDir, `${name}-chrome-trace.json`);
  fs.writeFileSync(tracePath, `${JSON.stringify({ traceEvents })}\n`);
  return { tracePath, summary: summarizeTrace(traceEvents) };
}

async function inspectHome(page) {
  const url = new URL(baseUrl);
  url.searchParams.set("module", "home");
  url.searchParams.set("qa", `p0-trace-${Date.now()}`);
  await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await waitForPixiIdle(page);

  const renderer = await page.evaluate(() => {
    const canvas = document.querySelector(".pixi-world-canvas");
    const gl = canvas instanceof HTMLCanvasElement ? canvas.getContext("webgl2") || canvas.getContext("webgl") : undefined;
    const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
      vendor: debugInfo ? gl?.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : undefined,
      renderer: debugInfo ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : undefined,
    };
  });

  const frameSample = await measureFrameRate(page, ".world-map-stage");
  const trace = await collectTrace(page, "p0-home-wheel", async () => {
    const canvas = page.locator(".pixi-world-canvas").first();
    const box = await canvas.boundingBox({ timeout: 7000 });
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -420);
    await page.waitForTimeout(250);
  });
  await waitForPixiIdle(page);
  await page.waitForTimeout(300);
  const postWheelFrameSample = await measureFrameRate(page, ".world-map-stage");
  return { renderer, frameSample, postWheelFrameSample, ...trace };
}

async function inspectTeacher(page) {
  const url = new URL(baseUrl);
  url.searchParams.set("module", "teacher-workbench");
  url.searchParams.set("qa", `p0-trace-${Date.now()}`);
  await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.waitForSelector(".workbench-student-card");

  const frameSample = await measureFrameRate(page, ".workbench-class-grid");
  const trace = await collectTrace(page, "p0-teacher-scroll", async () => {
    await page.evaluate(async () => {
      const scroller = document.querySelector(".workbench-class-grid");
      if (!scroller) return;
      for (let i = 0; i < 18; i += 1) {
        scroller.scrollTop += 90;
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    });
  });

  return { frameSample, ...trace };
}

const browser = await chromium.launch({ headless: true, ...(systemChromePath ? { executablePath: systemChromePath } : {}) });
const page = await browser.newPage({ viewport: { width: 1850, height: 1150 }, deviceScaleFactor: 1 });

try {
  const homeTrace = await inspectHome(page);
  const teacherTrace = await inspectTeacher(page);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    home: {
      renderer: homeTrace.renderer,
      frameSample: homeTrace.frameSample,
      postWheelFrameSample: homeTrace.postWheelFrameSample,
      tracePath: homeTrace.tracePath,
      traceSummary: homeTrace.summary,
    },
    teacherWorkbench: {
      frameSample: teacherTrace.frameSample,
      tracePath: teacherTrace.tracePath,
      traceSummary: teacherTrace.summary,
    },
  };
  const reportPath = path.join(outputDir, "p0-trace-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`P0 trace report: ${reportPath}`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
