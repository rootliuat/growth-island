/**
 * [INPUT]: 依赖 classroom-providers 的配置预检与结构化错误。
 * [OUTPUT]: 提供真实 Provider 就绪状态和语音失败分类回归。
 * [POS]: tests/server 的 Provider Interface 测试，不发起外部网络请求。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from "vitest";
import { createClassroomProviders } from "../../server/classroom-providers.mjs";

describe("provider runtime contract", () => {
  it("reports provider readiness without exposing credentials", () => {
    const providers = createClassroomProviders({
      LLM_PROVIDER: "deepseek",
      DEEPSEEK_API_KEY: "secret-value",
      TENCENT_ASR_SECRET_ID: "speech-id",
      TENCENT_ASR_SECRET_KEY: "speech-key",
    });

    expect(providers.getHealth()).toEqual({
      speech: { name: "tencent", configured: true },
      llm: { name: "deepseek", configured: true },
    });
    expect(JSON.stringify(providers.getHealth())).not.toContain("secret-value");
  });

  it("classifies missing Tencent credentials as a permanent speech failure", async () => {
    const providers = createClassroomProviders({});

    await expect(providers.transcribe({ audioBase64: "dGVzdA==", voiceFormat: "wav" })).rejects.toMatchObject({
      status: 503,
      code: "speech_not_configured",
      retryable: false,
    });
  });
});
