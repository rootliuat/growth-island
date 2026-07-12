/**
 * [INPUT]: 依赖 classroom-store 与临时 JSON 数据库目录。
 * [OUTPUT]: 提供课堂数据事务原子性、队列恢复和持久化回归。
 * [POS]: tests/server 的深 Module Interface 测试，绕过 HTTP 但不绕过真实文件存储。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClassroomStore } from "../../server/classroom-store.mjs";

let tempDir;

afterEach(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("classroom store transactions", () => {
  it("discards invalid partial changes and keeps the queue usable", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "beihai-store-test-"));
    const dbPath = path.join(tempDir, "classroom.json");
    const store = createClassroomStore({ dbPath, dataDir: tempDir });
    const initial = await store.getSnapshot();
    const originalName = initial.children.find((child) => child.id === "child-01")?.name;

    await expect(store.patchChild("child-01", { name: "不应落盘", voiceType: 999 })).rejects.toMatchObject({
      status: 400,
      message: "Invalid voiceType",
    });
    expect((await store.getSnapshot()).children.find((child) => child.id === "child-01")?.name).toBe(originalName);

    const reason = `队列恢复 ${crypto.randomUUID()}`;
    const created = await store.createLedger({
      childId: "child-01",
      operatorChildId: "child-01",
      delta: 10,
      source: "manual",
      category: "积极阳光",
      reason,
    });
    expect(created.created).toBe(true);

    const reloadedStore = createClassroomStore({ dbPath, dataDir: tempDir });
    expect((await reloadedStore.getSnapshot()).ledger.some((record) => record.reason === reason)).toBe(true);
  });
});
