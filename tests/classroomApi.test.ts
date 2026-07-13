/**
 * [INPUT]: 依赖 services/classroomApi 的结构化错误解析与浏览器 fetch。
 * [OUTPUT]: 提供语音 API 错误码、可重试标记和兼容文案回归。
 * [POS]: tests 根级 HTTP Adapter 契约测试，不启动真实服务。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeSpeech } from "../src/services/classroomApi";

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
});
