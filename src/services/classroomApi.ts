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

async function requestSnapshot(path: string, init?: RequestInit): Promise<ClassroomSnapshot> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<ClassroomSnapshot>;
}

export function fetchClassroomSnapshot() {
  return requestSnapshot("/api/classroom");
}

export function patchChildProfile(childId: string, patch: Partial<ChildProfile>) {
  return requestSnapshot(`/api/children/${encodeURIComponent(childId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function createLedgerRecord(input: LedgerRecordInput) {
  return requestSnapshot("/api/ledger", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function undoLedgerRecord(recordId: string, operatorChildId: string) {
  return requestSnapshot("/api/ledger/undo", {
    method: "POST",
    body: JSON.stringify({ recordId, operatorChildId }),
  });
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
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function evaluateMoralRecord(input: { childId: string; operatorChildId: string; transcript: string }) {
  return requestJson<MoralAgentResponse>("/api/agent/moral-evaluate", {
    method: "POST",
    body: JSON.stringify(input),
  });
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

export function approveMoralReview(reviewId: string, operatorChildId: string) {
  return requestSnapshot(`/api/agent/reviews/${encodeURIComponent(reviewId)}/approve`, {
    method: "POST",
    body: JSON.stringify({ operatorChildId }),
  });
}

export function rejectMoralReview(reviewId: string, operatorChildId: string, rejectionReason = "老师复核后驳回") {
  return requestSnapshot(`/api/agent/reviews/${encodeURIComponent(reviewId)}/reject`, {
    method: "POST",
    body: JSON.stringify({ operatorChildId, rejectionReason }),
  });
}
