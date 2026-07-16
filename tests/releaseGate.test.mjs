/**
 * [INPUT]: 依赖 scripts/qa/release-gate 的目标 URL、地图性能与真实语音发布判定。
 * [OUTPUT]: 提供 HTTPS、腾讯 Provider、45 FPS、WebM 转换、不同儿童单账本和 10 人通过回归。
 * [POS]: tests 根级生产发布契约测试，不启动浏览器或真实 Provider。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from "vitest";
import {
  evaluateMapPerformance,
  evaluateRealMicAcceptance,
  normalizeReleaseTarget,
} from "../scripts/qa/release-gate.mjs";

function renderState(resolution = 1) {
  return { renderResolution: resolution, backingRatioX: resolution, backingRatioY: resolution };
}

function mapPerformance(fps = 50, resolution = 1) {
  return {
    wheelFps: { fps, renderState: renderState(resolution), settledRenderState: renderState(resolution) },
    dragFps: { fps, renderState: renderState(resolution), settledRenderState: renderState(resolution) },
  };
}

function approvedAttempt(index) {
  return {
    childId: `child-${String(index + 1).padStart(2, "0")}`,
    outcome: "approved",
    sourceVoiceFormat: "webm",
    preparedVoiceFormat: "wav",
    asrMs: 900 + index,
    retryCount: index === 9 ? 1 : 0,
  };
}

function runtime(permission = "granted") {
  return {
    isSecureContext: true,
    origin: "https://island.example.com",
    expectedOrigin: "https://island.example.com",
    microphonePermissionAfter: permission,
  };
}

describe("production release gate", () => {
  it("requires HTTPS outside loopback", () => {
    expect(normalizeReleaseTarget("http://127.0.0.1:5173/")).toBe("http://127.0.0.1:5173");
    expect(normalizeReleaseTarget("https://island.example.com/")).toBe("https://island.example.com");
    expect(() => normalizeReleaseTarget("http://island.example.com")).toThrow(/HTTPS/);
  });

  it("rejects interaction below 45 FPS or below native resolution", () => {
    expect(evaluateMapPerformance(mapPerformance(44)).ok).toBe(false);
    expect(evaluateMapPerformance(mapPerformance(50, 0.9)).ok).toBe(false);
    expect(evaluateMapPerformance(mapPerformance(45, 1)).ok).toBe(true);
  });

  it("accepts ten distinct Tencent recordings with one ledger each", () => {
    const attempts = Array.from({ length: 10 }, (_, index) => approvedAttempt(index));
    const ledgerRecords = attempts.map((attempt) => ({ childId: attempt.childId }));
    const result = evaluateRealMicAcceptance({
      targetCount: 10,
      attempts,
      ledgerRecords,
      providers: { speech: { name: "tencent", configured: true } },
      runtime: runtime(),
      performance: mapPerformance(),
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({ approvedCount: 10, distinctChildCount: 10, firstPassCount: 9, ledgerCount: 10 });
  });

  it("rejects mock speech and duplicate child or ledger evidence", () => {
    const attempts = [approvedAttempt(0), approvedAttempt(0), approvedAttempt(2)];
    const result = evaluateRealMicAcceptance({
      targetCount: 3,
      attempts,
      ledgerRecords: [{ childId: "child-01" }, { childId: "child-01" }, { childId: "child-03" }],
      providers: { speech: { name: "mock", configured: true } },
      runtime: runtime(),
      performance: mapPerformance(),
    });

    expect(result.ok).toBe(false);
    expect(result.failures.join(" ")).toMatch(/Tencent ASR/);
    expect(result.failures.join(" ")).toMatch(/approved children/);
    expect(result.failures.join(" ")).toMatch(/exactly one/);
  });

  it("rejects a target browser that did not grant microphone permission", () => {
    const attempts = Array.from({ length: 3 }, (_, index) => approvedAttempt(index));
    const result = evaluateRealMicAcceptance({
      targetCount: 3,
      attempts,
      ledgerRecords: attempts.map((attempt) => ({ childId: attempt.childId })),
      providers: { speech: { name: "tencent", configured: true } },
      runtime: runtime("denied"),
      performance: mapPerformance(),
    });

    expect(result.ok).toBe(false);
    expect(result.failures.join(" ")).toMatch(/microphone permission/);
  });
});
