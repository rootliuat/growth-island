/**
 * [INPUT]: 依赖 services/classroomApi 的结构化错误解析与浏览器 fetch。
 * [OUTPUT]: 提供语音 API 错误码、可重试标记和兼容文案回归。
 * [POS]: tests 根级 HTTP Adapter 契约测试，不启动真实服务。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { ClassroomApiError, createLedgerRecord, isClassroomAvailabilityFailure, isDefiniteClassroomUnavailable, transcribeSpeech } from "../src/services/classroomApi";

afterEach(() => vi.unstubAllGlobals());

describe("classroom API errors", () => {
  it("preserves speech failure codes and retryability", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Tencent SentenceRecognition timed out", code: "asr_timeout", retryable: true }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(transcribeSpeech({ audioBase64: "dGVzdA==", voiceFormat: "wav" })).rejects.toMatchObject({
      name: "ClassroomApiError",
      status: 503,
      code: "asr_timeout",
      retryable: true,
      message: "Tencent SentenceRecognition timed out",
    });
  });

  it("allows local authority only for network and server availability failures", () => {
    expect(isClassroomAvailabilityFailure(new TypeError("Failed to fetch"))).toBe(true);
    expect(isClassroomAvailabilityFailure(new ClassroomApiError(503, "unavailable", { code: "classroom_degraded" }))).toBe(true);
    expect(isClassroomAvailabilityFailure(new ClassroomApiError(409, "conflict"))).toBe(false);
    expect(isClassroomAvailabilityFailure(new Error("business bug"))).toBe(false);
    expect(isDefiniteClassroomUnavailable(new ClassroomApiError(503, "unavailable", { code: "classroom_degraded" }))).toBe(true);
    expect(isDefiniteClassroomUnavailable(new ClassroomApiError(503, "unknown", { code: "classroom_write_failed" }))).toBe(false);
  });

  it("retries an unknown write result with the same operation id", async () => {
    const bodies: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      bodies.push(String(init?.body));
      if (bodies.length === 1) throw new TypeError("response lost");
      return new Response(JSON.stringify({ children: [], ledger: [], moralReviews: [] }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }));

    await createLedgerRecord({
      childId: "child-01",
      operatorChildId: "child-01",
      delta: 10,
      source: "manual",
      reason: "幂等请求",
      operationId: "operation-stable",
    });

    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toBe(bodies[1]);
    expect(JSON.parse(bodies[0]).operationId).toBe("operation-stable");
  });
});
