/**
 * [INPUT]: 依赖 types 的课堂快照，仅定义应用级状态与不确定写入恢复规则。
 * [OUTPUT]: 对外提供权威状态、不确定写入错误、预期权威本机提交、server-only 转换与 operationId 恢复判定。
 * [POS]: domain 的应用状态词汇与权威恢复规则 Module，被 App、课堂会话与 QA bridge 共享。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import type { ClassroomSnapshot } from "../types";

export type SyncStatus = "connecting" | "online" | "saving" | "offline" | "unavailable";
export type ClassroomDataAuthority = "server" | "local" | "unavailable";

export class UncertainClassroomWriteError extends Error {
  override name = "UncertainClassroomWriteError";
}

export function canSettleServerRequest(authority: ClassroomDataAuthority) {
  return authority === "server";
}

export function canCommitLocalChanges(
  authority: ClassroomDataAuthority,
  expectedAuthority: Exclude<ClassroomDataAuthority, "unavailable">,
) {
  return authority === expectedAuthority;
}

export function canMarkServerWriteUncertain(authority: ClassroomDataAuthority) {
  return authority === "server";
}

export function canReplayUncertainWrite(
  authority: ClassroomDataAuthority,
  uncertainOperationId: string | undefined,
  requestedOperationId: string,
) {
  return authority === "unavailable" && Boolean(uncertainOperationId) && uncertainOperationId === requestedOperationId;
}

export function canRecoverUncertainWrite(
  authority: ClassroomDataAuthority,
  uncertainOperationId: string | undefined,
  requestedOperationId: string,
  snapshot: ClassroomSnapshot,
) {
  return authority === "unavailable"
    && uncertainOperationId === requestedOperationId
    && snapshot.ledger.some((record) => record.operationId === requestedOperationId);
}
