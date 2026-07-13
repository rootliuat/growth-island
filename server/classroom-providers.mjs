/**
 * [INPUT]: 依赖 process.env、全局 fetch、moral-agent 规则与 classroom-store 的声音档案查询。
 * [OUTPUT]: 对外提供 createClassroomProviders、Provider 就绪预检、结构化 ProviderError 和脱敏错误格式化。
 * [POS]: server 的课堂 Provider 深 Module，隐藏腾讯签名、语音调用与 DeepSeek 降级实现。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createHash, createHmac } from "node:crypto";
import { evaluateMoralText } from "./moral-agent.mjs";
import { getDefaultSpiritVoiceType, getSpiritVoiceOption, normalizeVoiceType } from "./classroom-store.mjs";

const defaultProviderTimeoutMs = 12_000;
const virtueCategories = ["家国情怀", "意志坚韧", "积极阳光", "勇毅有力", "激浊扬清", "开拓创新", "尊矩守法"];

export class ProviderError extends Error {
  constructor(status, message, { code = "provider_failed", retryable = status >= 500 } = {}) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export function formatProviderError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[A-Za-z0-9_-]{24,}/g, "<redacted>").slice(0, 220);
}

function normalizeTimeoutMs(value, fallback = defaultProviderTimeoutMs) {
  const timeoutMs = Number(value);
  if (!Number.isFinite(timeoutMs)) return fallback;
  return Math.min(60_000, Math.max(100, Math.round(timeoutMs)));
}

function getProviderTimeoutMs(env, name) {
  return normalizeTimeoutMs(env[name] ?? env.PROVIDER_TIMEOUT_MS);
}

async function fetchJsonWithTimeout(url, init, { label, timeoutMs = defaultProviderTimeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let payload = {};
    if (text.trim()) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(`${label} returned non-JSON response: ${text.slice(0, 180)}`);
      }
    }
    if (!response.ok) throw new Error(`${label} ${response.status}: ${text.slice(0, 180)}`);
    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function hmac(key, data, encoding) {
  return createHmac("sha256", key).update(data).digest(encoding);
}

function sha256(data, encoding = "hex") {
  return createHash("sha256").update(data).digest(encoding);
}

async function callTencentCloud(env, { service, action, version, region = "ap-guangzhou", payload, secretId, secretKey }) {
  const host = `${service}.tencentcloudapi.com`;
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().slice(0, 10);
  const body = JSON.stringify(payload);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`;
  const signedHeaders = "content-type;host";
  const canonicalRequest = ["POST", "/", "", canonicalHeaders, signedHeaders, sha256(body)].join("\n");
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = ["TC3-HMAC-SHA256", String(timestamp), credentialScope, sha256(canonicalRequest)].join("\n");
  const secretDate = hmac(`TC3${secretKey}`, date);
  const secretService = hmac(secretDate, service);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = hmac(secretSigning, stringToSign, "hex");
  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetchJsonWithTimeout(
    `https://${host}`,
    {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json; charset=utf-8",
        Host: host,
        "X-TC-Action": action,
        "X-TC-Timestamp": String(timestamp),
        "X-TC-Version": version,
        "X-TC-Region": region,
      },
      body,
    },
    { label: `Tencent ${action}`, timeoutMs: getProviderTimeoutMs(env, "TENCENT_TIMEOUT_MS") },
  );
}

function isMockSpeechProvider(env) {
  return env.SPEECH_PROVIDER === "mock" || env.TENCENT_PROVIDER === "mock";
}

function getSpeechProviderName(env) {
  return isMockSpeechProvider(env) ? "mock" : "tencent";
}

function getProviderHealth(env) {
  const speechName = getSpeechProviderName(env);
  const speechConfigured =
    speechName === "mock" ||
    Boolean((env.TENCENT_ASR_SECRET_ID || env.TENCENT_SECRET_ID) && (env.TENCENT_ASR_SECRET_KEY || env.TENCENT_SECRET_KEY));
  const llmName = env.LLM_PROVIDER === "deepseek" ? "deepseek" : env.LLM_PROVIDER === "mock" ? "mock" : "rules";
  return {
    speech: { name: speechName, configured: speechConfigured },
    llm: { name: llmName, configured: llmName !== "deepseek" || Boolean(env.DEEPSEEK_API_KEY) },
  };
}

function classifySpeechError(error, kind) {
  if (error instanceof ProviderError) return error;
  const message = formatProviderError(error);
  if (message.includes("credentials are not configured")) {
    return new ProviderError(503, message, { code: "speech_not_configured", retryable: false });
  }
  if (message.includes("timed out")) {
    return new ProviderError(503, message, { code: kind === "asr" ? "asr_timeout" : "tts_timeout", retryable: true });
  }
  if (message.includes("Invalid audio data") || message.includes("3MB limit")) {
    return new ProviderError(400, message, { code: "asr_rejected", retryable: false });
  }
  return new ProviderError(503, message, { code: kind === "asr" ? "asr_upstream" : "tts_upstream", retryable: true });
}

async function synthesizeTencentSpeech(env, { text, child, voiceType }) {
  if (isMockSpeechProvider(env)) {
    return Buffer.from(`mock-mp3:${child.id}:${voiceType}:${text}`, "utf8").toString("base64");
  }
  const secretId = env.TENCENT_TTS_SECRET_ID || env.TENCENT_SECRET_ID;
  const secretKey = env.TENCENT_TTS_SECRET_KEY || env.TENCENT_SECRET_KEY;
  if (!secretId || !secretKey) throw new Error("Tencent TTS credentials are not configured");

  const result = await callTencentCloud(env, {
    service: "tts",
    action: "TextToVoice",
    version: "2019-08-23",
    secretId,
    secretKey,
    payload: {
      Text: text,
      SessionId: `points-game-${child.id}-${Date.now()}`,
      ModelType: 1,
      VoiceType: voiceType,
      Codec: "mp3",
      SampleRate: 16000,
    },
  });
  const error = result?.Response?.Error;
  if (error) throw new Error(`${error.Code}: ${error.Message}`);
  return result?.Response?.Audio;
}

function normalizeAudioBase64(value) {
  const text = String(value || "").trim();
  const commaIndex = text.indexOf(",");
  return commaIndex >= 0 && text.slice(0, commaIndex).includes("base64") ? text.slice(commaIndex + 1) : text;
}

async function transcribeTencentSpeech(env, { audioBase64, voiceFormat = "mp3" }) {
  if (isMockSpeechProvider(env)) {
    return {
      text: env.MOCK_ASR_TEXT || "我今天主动帮同学收玩具",
      audioDuration: 1,
      wordSize: 0,
      requestId: "mock-asr",
    };
  }
  const secretId = env.TENCENT_ASR_SECRET_ID || env.TENCENT_SECRET_ID;
  const secretKey = env.TENCENT_ASR_SECRET_KEY || env.TENCENT_SECRET_KEY;
  if (!secretId || !secretKey) throw new Error("Tencent ASR credentials are not configured");

  const data = normalizeAudioBase64(audioBase64);
  const audio = Buffer.from(data, "base64");
  if (!data || audio.byteLength === 0) throw new Error("Invalid audio data");
  if (audio.byteLength > 3 * 1024 * 1024) throw new Error("Audio data exceeds Tencent ASR 3MB limit");

  const result = await callTencentCloud(env, {
    service: "asr",
    action: "SentenceRecognition",
    version: "2019-06-14",
    region: env.TENCENT_ASR_REGION || "ap-guangzhou",
    secretId,
    secretKey,
    payload: {
      ProjectId: 0,
      SubServiceType: 2,
      EngSerViceType: env.TENCENT_ASR_ENGINE || "16k_zh",
      SourceType: 1,
      VoiceFormat: voiceFormat,
      Data: data,
      DataLen: audio.byteLength,
    },
  });
  const error = result?.Response?.Error;
  if (error) throw new Error(`${error.Code}: ${error.Message}`);
  return {
    text: String(result?.Response?.Result || "").trim(),
    audioDuration: result?.Response?.AudioDuration,
    wordSize: result?.Response?.WordSize,
    requestId: result?.Response?.RequestId,
  };
}

function extractJsonObject(text) {
  const trimmed = String(text || "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : undefined;
  }
}

function validateCategory(category) {
  return category === undefined || virtueCategories.includes(category);
}

function normalizeDeepSeekMoralResult(raw, fallback) {
  const intent = ["reward", "deduct", "no_score", "needs_clarification"].includes(raw?.intent)
    ? raw.intent
    : fallback.intent;
  const category = validateCategory(raw?.category) ? raw.category : fallback.category;
  const numericDelta = Number(raw?.xpDelta);
  const allowedDeltas = new Set([-30, -20, -10, 0, 10, 20, 30]);
  const xpDelta = allowedDeltas.has(numericDelta) ? numericDelta : fallback.xpDelta;
  const confidence = Number.isFinite(Number(raw?.confidence))
    ? Math.max(0, Math.min(0.98, Number(raw.confidence)))
    : fallback.confidence;
  const status = xpDelta === 0 || intent === "needs_clarification" ? "manual_fallback" : "pending_review";
  const riskFlags = Array.isArray(raw?.riskFlags) ? raw.riskFlags.map(String).slice(0, 4) : fallback.riskFlags;

  return {
    intent,
    category,
    xpDelta,
    confidence,
    status,
    reasonForChild: String(raw?.reasonForChild || fallback.reasonForChild).slice(0, 80),
    reasonForTeacher: String(raw?.reasonForTeacher || fallback.reasonForTeacher).slice(0, 160),
    riskFlags: xpDelta < 0 ? Array.from(new Set([...riskFlags, "teacher_required_for_negative"])) : riskFlags,
  };
}

async function evaluateMoralTranscript(env, transcript) {
  const fallback = evaluateMoralText(transcript);
  if (env.LLM_PROVIDER === "mock") return { result: fallback, provider: "mock", model: "mock-rules" };
  if (env.LLM_PROVIDER !== "deepseek" || !env.DEEPSEEK_API_KEY) return { result: fallback, provider: "rules" };

  const baseUrl = (env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const model = env.DEEPSEEK_MODEL || "deepseek-v4-flash";
  try {
    const payload = await fetchJsonWithTimeout(
      `${baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "你是幼儿园德育成长记录助手。只输出 JSON，不要解释。字段：intent(reward/deduct/no_score/needs_clarification), category(家国情怀/意志坚韧/积极阳光/勇毅有力/激浊扬清/开拓创新/尊矩守法), xpDelta(-30/-20/-10/0/10/20/30), confidence(0-1), reasonForChild, reasonForTeacher, riskFlags数组。负向内容只能给 pending review 建议，不能自动入账。",
            },
            { role: "user", content: `孩子说：${transcript}` },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
          max_tokens: 420,
        }),
      },
      { label: "DeepSeek", timeoutMs: getProviderTimeoutMs(env, "DEEPSEEK_TIMEOUT_MS") },
    );
    const parsed = extractJsonObject(payload?.choices?.[0]?.message?.content);
    if (!parsed) throw new Error("DeepSeek returned non-JSON moral evaluation");
    return {
      result: normalizeDeepSeekMoralResult(parsed, fallback),
      provider: "deepseek",
      model: payload?.model || model,
      usage: payload?.usage,
    };
  } catch (error) {
    return { result: fallback, provider: "rules", model, providerError: formatProviderError(error) };
  }
}

export function createClassroomProviders(env = process.env) {
  const speak = async ({ text, child }) => {
    const voiceType = normalizeVoiceType(child.voiceType) ?? getDefaultSpiritVoiceType(child);
    const voice = getSpiritVoiceOption(voiceType);
    try {
      const audioBase64 = await synthesizeTencentSpeech(env, { text, child, voiceType });
      if (!audioBase64) throw new ProviderError(502, "Tencent TTS returned empty audio");
      return {
        provider: getSpeechProviderName(env),
        childId: child.id,
        voiceType,
        voiceLabel: voice?.label,
        codec: "mp3",
        sampleRate: 16000,
        audioBase64,
      };
    } catch (error) {
      throw classifySpeechError(error, "tts");
    }
  };

  const transcribe = async ({ audioBase64, voiceFormat }) => {
    try {
      const result = await transcribeTencentSpeech(env, { audioBase64, voiceFormat });
      if (!result.text) {
        throw new ProviderError(502, "Tencent ASR returned empty transcript", { code: "asr_empty", retryable: false });
      }
      return {
        provider: getSpeechProviderName(env),
        text: result.text,
        voiceFormat,
        engineModel: env.TENCENT_ASR_ENGINE || "16k_zh",
        audioDuration: result.audioDuration,
        wordSize: result.wordSize,
        requestId: result.requestId,
      };
    } catch (error) {
      throw classifySpeechError(error, "asr");
    }
  };

  return {
    evaluateMoralTranscript: (transcript) => evaluateMoralTranscript(env, transcript),
    getHealth: () => getProviderHealth(env),
    speak,
    transcribe,
  };
}
