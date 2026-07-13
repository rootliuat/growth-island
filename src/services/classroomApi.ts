/**
 * [INPUT]: 依赖浏览器 fetch、types 的课堂/语音响应契约与 Vite API 地址。
 * [OUTPUT]: 对外提供携带稳定 operationId 的课堂写重试、语音 HTTP Adapter、结构化错误与降级分类。
 * [POS]: services 的本地 API 边界，统一请求编码、未知结果同操作重试和服务器可用性语义。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type {
  ChildProfile,
  ClassroomSnapshot,
  LedgerRecordInput,
  MoralAgentResponse,
  SpeechRecognitionResponse,
  SpeechSynthesisResponse,
} from "../types";

function getDefaultApiBaseUrl() {
  if (typeof window === "undefined") return "http://localhost:5174";
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:5174`;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? getDefaultApiBaseUrl()).replace(/\/$/, "");

export class ClassroomApiError extends Error {
  status: number;
  code?: string;
  retryable?: boolean;

  constructor(status: number, message: string, details: { code?: string; retryable?: boolean } = {}) {
    super(message || `API request failed: ${status}`);
    this.name = "ClassroomApiError";
    this.status = status;
    this.code = details.code;
    this.retryable = details.retryable;
  }
}

export function isClassroomApiError(error: unknown): error is ClassroomApiError {
  return error instanceof ClassroomApiError;
}

export function isClassroomAvailabilityFailure(error: unknown) {
  return error instanceof TypeError || (isClassroomApiError(error) && error.status >= 500);
}

export function isDefiniteClassroomUnavailable(error: unknown) {
  return isClassroomApiError(error) && error.code === "classroom_degraded";
}

async function readApiError(response: Response) {
  const text = await response.text();
  try {
    const body = JSON.parse(text) as { error?: string; code?: string; retryable?: boolean };
    return new ClassroomApiError(response.status, body.error || text, { code: body.code, retryable: body.retryable });
  } catch {
    return new ClassroomApiError(response.status, text || `API request failed: ${response.status}`);
  }
}

async function requestSnapshot(path: string, init?: RequestInit): Promise<ClassroomSnapshot> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw await readApiError(response);
  }

  return response.json() as Promise<ClassroomSnapshot>;
}

async function retryMutation<T>(request: () => Promise<T>) {
  try {
    return await request();
  } catch (error) {
    if (!isClassroomAvailabilityFailure(error)) throw error;
    return request();
  }
}

export function fetchClassroomSnapshot() {
  return requestSnapshot("/api/classroom");
}

export function patchChildProfile(childId: string, patch: Partial<ChildProfile>) {
  return retryMutation(() => requestSnapshot(`/api/children/${encodeURIComponent(childId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }));
}

export function createLedgerRecord(input: LedgerRecordInput) {
  const operation = { ...input, operationId: input.operationId ?? crypto.randomUUID() };
  return retryMutation(() => requestSnapshot("/api/ledger", {
    method: "POST",
    body: JSON.stringify(operation),
  }));
}

export function undoLedgerRecord(recordId: string, operatorChildId: string, operationId = crypto.randomUUID()) {
  return retryMutation(() => requestSnapshot("/api/ledger/undo", {
    method: "POST",
    body: JSON.stringify({ recordId, operatorChildId, operationId }),
  }));
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw await readApiError(response);
  }

  return response.json() as Promise<T>;
}

export function evaluateMoralRecord(input: { childId: string; operatorChildId: string; transcript: string; operationId?: string }) {
  const operation = { ...input, operationId: input.operationId ?? crypto.randomUUID() };
  return retryMutation(() => requestJson<MoralAgentResponse>("/api/agent/moral-evaluate", {
    method: "POST",
    body: JSON.stringify(operation),
  }));
}

export function speakForChild(input: { childId: string; text: string }) {
  return requestJson<SpeechSynthesisResponse>("/api/speech/speak", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function transcribeSpeech(input: { audioBase64: string; voiceFormat?: string }) {
  return requestJson<SpeechRecognitionResponse>("/api/speech/transcribe", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function approveMoralReview(reviewId: string, operatorChildId: string, operationId = crypto.randomUUID()) {
  return retryMutation(() => requestSnapshot(`/api/agent/reviews/${encodeURIComponent(reviewId)}/approve`, {
    method: "POST",
    body: JSON.stringify({ operatorChildId, operationId }),
  }));
}

export function rejectMoralReview(
  reviewId: string,
  operatorChildId: string,
  rejectionReason = "老师复核后驳回",
  operationId = crypto.randomUUID(),
) {
  return retryMutation(() => requestSnapshot(`/api/agent/reviews/${encodeURIComponent(reviewId)}/reject`, {
    method: "POST",
    body: JSON.stringify({ operatorChildId, rejectionReason, operationId }),
  }));
}
