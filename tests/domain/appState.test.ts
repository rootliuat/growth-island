/**
 * [INPUT]: 依赖 src/domain/appState 的不确定写入错误、operationId 绑定恢复判定与课堂快照契约。
 * [OUTPUT]: 对外提供错误分类、预期权威本机提交、server-only 转换和同操作证据恢复的回归测试。
 * [POS]: tests/domain 的课堂权威恢复规则测试，阻止 local 被旧请求降级或采用无关服务器快照。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { describe, expect, it } from "vitest";
import { UncertainClassroomWriteError, canCommitLocalChanges, canMarkServerWriteUncertain, canRecoverUncertainWrite, canReplayUncertainWrite, canSettleServerRequest } from "../../src/domain/appState";
import type { ClassroomSnapshot, LedgerRecord } from "../../src/types";

const record: LedgerRecord = {
  id: "record-1",
  childId: "child-1",
  operatorChildId: "child-1",
  operatorRole: "teacher",
  delta: 10,
  source: "dialogue-agent",
  reason: "自助成长：帮助同伴",
  aiSuggested: true,
  reviewStatus: "approved",
  createdAt: "2026-07-17T00:00:00.000Z",
  operationId: "operation-1",
};

const snapshot: ClassroomSnapshot = { children: [], ledger: [record], moralReviews: [] };

describe("classroom authority recovery", () => {
  it("distinguishes unknown write outcomes from deterministic request errors", () => {
    expect(new UncertainClassroomWriteError("unknown")).toBeInstanceOf(UncertainClassroomWriteError);
    expect(new Error("rejected")).not.toBeInstanceOf(UncertainClassroomWriteError);
  });

  it("allows only the server authority to become uncertain", () => {
    expect(canMarkServerWriteUncertain("server")).toBe(true);
    expect(canMarkServerWriteUncertain("local")).toBe(false);
    expect(canMarkServerWriteUncertain("unavailable")).toBe(false);
  });

  it("ignores a late deterministic response after another request made authority uncertain", () => {
    expect(canSettleServerRequest("server")).toBe(true);
    expect(canSettleServerRequest("unavailable")).toBe(false);
    expect(canSettleServerRequest("local")).toBe(false);
  });

  it("allows local fallback only while the request's starting authority still owns the session", () => {
    expect(canCommitLocalChanges("server", "server")).toBe(true);
    expect(canCommitLocalChanges("local", "local")).toBe(true);
    expect(canCommitLocalChanges("unavailable", "server")).toBe(false);
    expect(canCommitLocalChanges("local", "server")).toBe(false);
  });

  it("allows preflight replay only for the operation that made server authority uncertain", () => {
    expect(canReplayUncertainWrite("unavailable", "operation-1", "operation-1")).toBe(true);
    expect(canReplayUncertainWrite("unavailable", undefined, "operation-1")).toBe(false);
    expect(canReplayUncertainWrite("unavailable", "operation-2", "operation-1")).toBe(false);
    expect(canReplayUncertainWrite("local", "operation-1", "operation-1")).toBe(false);
  });

  it("adopts a replay snapshot only when it proves the same operation is in the ledger", () => {
    expect(canRecoverUncertainWrite("unavailable", "operation-1", "operation-1", snapshot)).toBe(true);
    expect(canRecoverUncertainWrite("server", "operation-1", "operation-1", snapshot)).toBe(false);
    expect(canRecoverUncertainWrite("local", "operation-1", "operation-1", snapshot)).toBe(false);
    expect(canRecoverUncertainWrite("unavailable", "operation-2", "operation-1", snapshot)).toBe(false);
    expect(canRecoverUncertainWrite("unavailable", "operation-1", "operation-2", snapshot)).toBe(false);
    expect(canRecoverUncertainWrite("unavailable", "operation-1", "operation-1", { ...snapshot, ledger: [] })).toBe(false);
  });
});
