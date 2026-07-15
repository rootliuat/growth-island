/**
 * [INPUT]: 依赖 classroom-snapshot-file 与隔离临时目录中的真实文件系统。
 * [OUTPUT]: 提供 schema 校验、耐久失败、20 份轮转、最高 revision 恢复和 degraded 状态回归。
 * [POS]: tests/server 的文件持久化 Interface 测试，不经过课堂业务事务或 HTTP。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createClassroomSnapshotFile } from "../../server/classroom-snapshot-file.mjs";

let tempDir;

function makeDatabase(name = "安安") {
  return {
    version: 1,
    revision: 0,
    updatedAt: "2026-07-13T00:00:00.000Z",
    children: [{ id: "child-01", name, spiritId: "01", slotId: 1, voiceType: 101016 }],
    ledger: [],
    moralReviews: [],
  };
}

async function createFile(options = {}) {
  tempDir ??= await fs.mkdtemp(path.join(tmpdir(), "beihai-snapshot-test-"));
  const dbPath = path.join(tempDir, "classroom.json");
  const file = createClassroomSnapshotFile({ dbPath, createDefaultDatabase: makeDatabase, ...options });
  await file.initialize();
  return { dbPath, file };
}

async function backupPaths(dbPath) {
  const directory = path.join(path.dirname(dbPath), "backups");
  try {
    return (await fs.readdir(directory)).filter((name) => name.startsWith(`${path.basename(dbPath)}.snapshot-`)).sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

afterEach(async () => {
  if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
  tempDir = undefined;
});

describe("classroom snapshot file", () => {
  it("seeds only an empty store and preserves an empty review collection", async () => {
    const { dbPath, file } = await createFile();

    expect(file.getHealth()).toMatchObject({ status: "ready", available: true, schemaVersion: 1 });
    expect((await file.read()).moralReviews).toEqual([]);
    expect(JSON.parse(await fs.readFile(dbPath, "utf8")).moralReviews).toEqual([]);
    expect(await backupPaths(dbPath)).toHaveLength(1);
  });

  it("keeps only the latest twenty validated committed snapshots", async () => {
    const { dbPath, file } = await createFile();
    for (let index = 1; index <= 24; index += 1) {
      const db = await file.read();
      db.children[0].name = `孩子${index}`;
      await file.commit(db);
    }

    expect(await backupPaths(dbPath)).toHaveLength(20);
    expect(file.getHealth().validSnapshotCount).toBe(20);
    expect((await file.read()).children[0].name).toBe("孩子24");
  }, 15_000);

  it("quarantines a corrupt main file and restores the newest valid snapshot", async () => {
    const { dbPath, file } = await createFile();
    const db = await file.read();
    db.children[0].name = "已确认状态";
    await file.commit(db);
    await fs.writeFile(dbPath, "{broken", "utf8");

    const recovered = createClassroomSnapshotFile({ dbPath, createDefaultDatabase: () => makeDatabase("不应播种") });
    await recovered.initialize();

    expect(recovered.getHealth()).toMatchObject({ status: "recovered", available: true });
    expect((await recovered.read()).children[0].name).toBe("已确认状态");
    expect((await fs.readdir(tempDir)).some((name) => name.startsWith("classroom.json.corrupt-"))).toBe(true);
  });

  it("skips a corrupt newest snapshot and restores an older valid snapshot", async () => {
    const { dbPath, file } = await createFile();
    let db = await file.read();
    db.children[0].name = "较旧有效";
    await file.commit(db);
    await new Promise((resolve) => setTimeout(resolve, 2));
    db = await file.read();
    db.children[0].name = "最新有效";
    await file.commit(db);
    const snapshots = await backupPaths(dbPath);
    await fs.writeFile(path.join(tempDir, "backups", snapshots.at(-1)), "bad", "utf8");
    await fs.writeFile(dbPath, "bad", "utf8");

    const recovered = createClassroomSnapshotFile({ dbPath, createDefaultDatabase: makeDatabase });
    await recovered.initialize();

    expect((await recovered.read()).children[0].name).toBe("较旧有效");
  });

  it("recovers by persistent revision when the wall clock moves backwards", async () => {
    let clock = new Date("2026-07-13T10:00:00.000Z");
    const { dbPath, file } = await createFile({ now: () => clock });
    let db = await file.read();
    db.children[0].name = "较早提交";
    await file.commit(db);
    clock = new Date("2026-07-13T09:00:00.000Z");
    db = await file.read();
    db.children[0].name = "最后真实提交";
    await file.commit(db);
    await fs.writeFile(dbPath, "bad", "utf8");

    const recovered = createClassroomSnapshotFile({ dbPath, createDefaultDatabase: makeDatabase, now: () => clock });
    await recovered.initialize();

    expect((await recovered.read()).children[0].name).toBe("最后真实提交");
    expect((await recovered.read()).revision).toBe(2);
  });

  it("enters degraded mode instead of reseeding when no valid recovery source exists", async () => {
    tempDir = await fs.mkdtemp(path.join(tmpdir(), "beihai-snapshot-test-"));
    const dbPath = path.join(tempDir, "classroom.json");
    await fs.writeFile(dbPath, "{broken", "utf8");
    const file = createClassroomSnapshotFile({ dbPath, createDefaultDatabase: () => makeDatabase("不应出现") });

    await file.initialize();

    expect(file.getHealth()).toMatchObject({ status: "degraded", available: false });
    await expect(file.read()).rejects.toMatchObject({ code: "classroom_degraded", retryable: false });
    await expect(fs.readFile(dbPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps the last committed state when file fsync fails", async () => {
    let failNextDatabaseSync = false;
    tempDir = await fs.mkdtemp(path.join(tmpdir(), "beihai-snapshot-test-"));
    const dbPath = path.join(tempDir, "classroom.json");
    const fileOps = {
      ...fs,
      async open(filePath, flags, mode) {
        const handle = await fs.open(filePath, flags, mode);
        if (!failNextDatabaseSync || !filePath.startsWith(`${dbPath}.`) || !filePath.endsWith(".tmp")) return handle;
        return {
          writeFile: handle.writeFile.bind(handle),
          close: handle.close.bind(handle),
          async sync() {
            failNextDatabaseSync = false;
            throw new Error("simulated fsync failure");
          },
        };
      },
    };
    const file = createClassroomSnapshotFile({ dbPath, createDefaultDatabase: makeDatabase, fileOps });
    await file.initialize();
    const candidate = await file.read();
    candidate.children[0].name = "不应提交";
    failNextDatabaseSync = true;

    await expect(file.commit(candidate)).rejects.toMatchObject({ code: "classroom_write_failed", retryable: true });
    expect((await file.read()).children[0].name).toBe("安安");
    expect(JSON.parse(await fs.readFile(dbPath, "utf8")).children[0].name).toBe("安安");
  });

  it("does not report success until the committed recovery snapshot is durable", async () => {
    let failSnapshots = false;
    tempDir = await fs.mkdtemp(path.join(tmpdir(), "beihai-snapshot-test-"));
    const dbPath = path.join(tempDir, "classroom.json");
    const fileOps = {
      ...fs,
      async open(filePath, flags, mode) {
        if (failSnapshots && filePath.includes(`${path.sep}backups${path.sep}`) && filePath.endsWith(".tmp")) {
          throw new Error("simulated snapshot failure");
        }
        return fs.open(filePath, flags, mode);
      },
    };
    const file = createClassroomSnapshotFile({ dbPath, createDefaultDatabase: makeDatabase, fileOps });
    await file.initialize();
    const candidate = await file.read();
    candidate.children[0].name = "需要恢复的提交";
    failSnapshots = true;

    await expect(file.commit(candidate)).rejects.toMatchObject({ code: "classroom_snapshot_failed", retryable: true });
    expect(file.getHealth()).toMatchObject({ status: "at_risk", available: true });
    failSnapshots = false;
    await file.ensureCurrentSnapshot();
    await fs.writeFile(dbPath, "bad", "utf8");
    const recovered = createClassroomSnapshotFile({ dbPath, createDefaultDatabase: makeDatabase });
    await recovered.initialize();
    expect((await recovered.read()).children[0].name).toBe("需要恢复的提交");
  });

  it("propagates real directory fsync errors and keeps the renamed revision recoverable", async () => {
    let failDirectorySync = false;
    tempDir = await fs.mkdtemp(path.join(tmpdir(), "beihai-snapshot-test-"));
    const dbPath = path.join(tempDir, "classroom.json");
    const fileOps = {
      ...fs,
      async open(filePath, flags, mode) {
        const handle = await fs.open(filePath, flags, mode);
        if (!failDirectorySync || filePath !== tempDir || flags !== "r") return handle;
        return {
          close: handle.close.bind(handle),
          async sync() {
            const error = new Error("simulated directory EIO");
            error.code = "EIO";
            throw error;
          },
        };
      },
    };
    const file = createClassroomSnapshotFile({ dbPath, createDefaultDatabase: makeDatabase, fileOps });
    await file.initialize();
    const candidate = await file.read();
    candidate.children[0].name = "改名后状态";
    failDirectorySync = true;

    await expect(file.commit(candidate)).rejects.toMatchObject({ code: "classroom_write_failed", retryable: true });
    expect(file.getHealth()).toMatchObject({ status: "at_risk", available: true });
    expect((await file.read()).children[0].name).toBe("改名后状态");
  });

  it("repairs a failed main-directory sync and recovers the highest durable revision", async () => {
    let failNextDataDirectorySync = false;
    tempDir = await fs.mkdtemp(path.join(tmpdir(), "beihai-snapshot-test-"));
    const dbPath = path.join(tempDir, "classroom.json");
    const fileOps = {
      ...fs,
      async open(filePath, flags, mode) {
        const handle = await fs.open(filePath, flags, mode);
        if (!failNextDataDirectorySync || filePath !== tempDir || flags !== "r") return handle;
        return {
          close: handle.close.bind(handle),
          async sync() {
            failNextDataDirectorySync = false;
            const error = new Error("simulated one-shot directory EIO");
            error.code = "EIO";
            throw error;
          },
        };
      },
    };
    const file = createClassroomSnapshotFile({ dbPath, createDefaultDatabase: makeDatabase, fileOps });
    await file.initialize();
    const oldMain = await fs.readFile(dbPath, "utf8");
    const candidate = await file.read();
    candidate.children[0].name = "最高版本";
    failNextDataDirectorySync = true;

    await expect(file.commit(candidate)).rejects.toMatchObject({ code: "classroom_write_failed", retryable: true });
    await file.ensureCurrentSnapshot();
    expect(file.getHealth()).toMatchObject({ status: "ready", available: true });

    await fs.writeFile(dbPath, oldMain, "utf8");
    const recovered = createClassroomSnapshotFile({ dbPath, createDefaultDatabase: makeDatabase });
    await recovered.initialize();
    expect(recovered.getHealth()).toMatchObject({ status: "recovered", available: true });
    expect((await recovered.read()).children[0].name).toBe("最高版本");
    expect((await recovered.read()).revision).toBe(1);
  });
});
