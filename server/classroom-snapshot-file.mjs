/**
 * [INPUT]: 依赖 node:fs/promises、课堂 schema v1 数据和主 JSON 文件路径。
 * [OUTPUT]: 对外提供 revision 校验、耐久提交、20 份滚动快照、目录同步补偿及最高 revision 恢复的文件持久化 Module。
 * [POS]: server 的课堂文件真相源，被 classroom-store 消费，不承载 ledger/review 业务规则。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";

const schemaVersion = 1;
const defaultSnapshotLimit = 20;

export class ClassroomSnapshotFileError extends Error {
  constructor(message, { code, retryable = false, cause } = {}) {
    super(message, { cause });
    this.name = "ClassroomSnapshotFileError";
    this.code = code;
    this.retryable = retryable;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Invalid ${label}`);
}

function requireUniqueIds(items, label) {
  const ids = new Set();
  items.forEach((item) => {
    requireString(item?.id, `${label} id`);
    if (ids.has(item.id)) throw new Error(`Duplicate ${label} id`);
    ids.add(item.id);
  });
  return ids;
}

export function validateClassroomDatabase(db) {
  if (!isRecord(db) || db.version !== schemaVersion) throw new Error("Unsupported classroom schema");
  if (!Number.isInteger(db.revision) || db.revision < 0) throw new Error("Invalid classroom revision");
  if (!Array.isArray(db.children) || !Array.isArray(db.ledger) || !Array.isArray(db.moralReviews)) {
    throw new Error("Invalid classroom collections");
  }
  requireString(db.updatedAt, "updatedAt");
  if (Number.isNaN(Date.parse(db.updatedAt))) throw new Error("Invalid updatedAt");

  const childIds = requireUniqueIds(db.children, "child");
  const ledgerIds = requireUniqueIds(db.ledger, "ledger");
  requireUniqueIds(db.moralReviews, "moral review");
  db.children.forEach((child) => {
    requireString(child.name, "child name");
    requireString(child.spiritId, "child spiritId");
  });
  db.ledger.forEach((record) => {
    if (!childIds.has(record.childId) || !childIds.has(record.operatorChildId)) throw new Error("Invalid ledger child reference");
    if (!Number.isInteger(record.delta) || !Number.isFinite(record.delta)) throw new Error("Invalid ledger delta");
    requireString(record.source, "ledger source");
    requireString(record.reason, "ledger reason");
    requireString(record.createdAt, "ledger createdAt");
    if (record.undoOf && !ledgerIds.has(record.undoOf)) throw new Error("Invalid undo reference");
  });
  db.moralReviews.forEach((review) => {
    if (!childIds.has(review.childId) || !childIds.has(review.operatorChildId)) throw new Error("Invalid review child reference");
    requireString(review.transcript, "review transcript");
    requireString(review.status, "review status");
    requireString(review.createdAt, "review createdAt");
  });
  return db;
}

function serialize(db) {
  return `${JSON.stringify(db, null, 2)}\n`;
}

function timestamp(now) {
  return now().toISOString().replace(/[-:.TZ]/g, "");
}

export function createClassroomSnapshotFile({
  dbPath,
  createDefaultDatabase,
  prepareDatabase = (db) => db,
  snapshotLimit = defaultSnapshotLimit,
  fileOps = fs,
  now = () => new Date(),
}) {
  const dataDirectory = path.dirname(dbPath);
  const snapshotDirectory = path.join(dataDirectory, "backups");
  const snapshotPrefix = `${path.basename(dbPath)}.snapshot-`;
  let currentDatabase;
  let initialization;
  let snapshotSequence = 0;
  const pendingDirectorySyncs = new Set();
  let health = {
    status: "initializing",
    available: false,
    schemaVersion,
    validSnapshotCount: 0,
  };

  function parseDatabase(text) {
    return validateClassroomDatabase(prepareDatabase(JSON.parse(text)));
  }

  async function readValidated(filePath) {
    return parseDatabase(await fileOps.readFile(filePath, "utf8"));
  }

  async function syncDirectory(directory) {
    let handle;
    try {
      handle = await fileOps.open(directory, "r");
      await handle.sync();
    } catch (error) {
      const unsupported = new Set(["EBADF", "EINVAL", "EISDIR", "ENOTSUP", "EPERM"]);
      if (!unsupported.has(error?.code)) throw error;
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }

  async function durableWrite(filePath, db) {
    await fileOps.mkdir(path.dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    let handle;
    let renamed = false;
    try {
      handle = await fileOps.open(tempPath, "w", 0o600);
      await handle.writeFile(serialize(db), "utf8");
      await handle.sync();
      await handle.close();
      handle = undefined;
      await fileOps.rename(tempPath, filePath);
      renamed = true;
      await syncDirectory(path.dirname(filePath));
    } catch (error) {
      if (renamed && error && typeof error === "object") {
        error.committedToPath = true;
        error.committedDirectory = path.dirname(filePath);
      }
      await handle?.close().catch(() => undefined);
      await fileOps.unlink(tempPath).catch(() => undefined);
      throw error;
    }
  }

  async function listSnapshotPaths() {
    try {
      const entries = await fileOps.readdir(snapshotDirectory, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isFile() && entry.name.startsWith(snapshotPrefix) && entry.name.endsWith(".json"))
        .map((entry) => path.join(snapshotDirectory, entry.name))
        .sort()
        .reverse();
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
  }

  async function inspectSnapshots() {
    const paths = await listSnapshotPaths();
    const valid = [];
    for (const snapshotPath of paths) {
      try {
        valid.push({ path: snapshotPath, db: await readValidated(snapshotPath) });
      } catch {
        // 损坏快照保留作诊断，但永远不参与恢复。
      }
    }
    valid.sort((left, right) => right.db.revision - left.db.revision || right.path.localeCompare(left.path));
    return { paths, valid };
  }

  async function pruneSnapshots() {
    const { valid } = await inspectSnapshots();
    const obsolete = valid.slice(snapshotLimit);
    await Promise.all(obsolete.map((item) => fileOps.unlink(item.path)));
    return Math.min(valid.length, snapshotLimit);
  }

  async function writeCommittedSnapshot(db) {
    snapshotSequence += 1;
    const sequence = String(snapshotSequence).padStart(6, "0");
    const filename = `${snapshotPrefix}${timestamp(now)}-${sequence}-${randomUUID()}.json`;
    await durableWrite(path.join(snapshotDirectory, filename), db);
    health.validSnapshotCount = await pruneSnapshots();
  }

  async function syncPendingDirectories() {
    for (const directory of pendingDirectorySyncs) {
      await syncDirectory(directory);
      pendingDirectorySyncs.delete(directory);
    }
  }

  async function quarantineMainFile() {
    const corruptPath = `${dbPath}.corrupt-${timestamp(now)}-${process.pid}`;
    await fileOps.rename(dbPath, corruptPath);
    await syncDirectory(dataDirectory);
  }

  async function restoreSnapshot(item) {
    await durableWrite(dbPath, item.db);
    currentDatabase = structuredClone(item.db);
    health = {
      status: "recovered",
      available: true,
      schemaVersion,
      validSnapshotCount: health.validSnapshotCount,
    };
  }

  async function seedDatabase() {
    const seeded = validateClassroomDatabase(prepareDatabase(createDefaultDatabase()));
    await durableWrite(dbPath, seeded);
    currentDatabase = structuredClone(seeded);
    health = { status: "ready", available: true, schemaVersion, validSnapshotCount: 0 };
    try {
      await writeCommittedSnapshot(seeded);
    } catch (error) {
      health = { ...health, status: "at_risk", snapshotError: error instanceof Error ? error.message : "Snapshot failed" };
    }
  }

  async function initializeOnce() {
    await fileOps.mkdir(dataDirectory, { recursive: true });
    const snapshots = await inspectSnapshots();
    health.validSnapshotCount = snapshots.valid.length;
    let mainMissing = false;
    let mainDatabase;
    try {
      mainDatabase = await readValidated(dbPath);
    } catch (error) {
      mainMissing = error?.code === "ENOENT";
      if (!mainMissing) {
        try {
          await quarantineMainFile();
        } catch (quarantineError) {
          throw new Error("Classroom file could not be quarantined", { cause: quarantineError });
        }
      }
    }

    const newestSnapshot = snapshots.valid[0];
    if (mainDatabase && (!newestSnapshot || mainDatabase.revision >= newestSnapshot.db.revision)) {
      currentDatabase = structuredClone(mainDatabase);
      health = { status: "ready", available: true, schemaVersion, validSnapshotCount: snapshots.valid.length };
      return;
    }
    if (newestSnapshot) {
      await restoreSnapshot(newestSnapshot);
      return;
    }
    if (mainMissing && snapshots.paths.length === 0) {
      await seedDatabase();
      return;
    }
    throw new Error("No valid classroom snapshot is available");
  }

  async function initialize() {
    initialization ??= initializeOnce().catch((error) => {
      currentDatabase = undefined;
      health = {
        status: "degraded",
        available: false,
        schemaVersion,
        validSnapshotCount: health.validSnapshotCount,
        diagnostic: error instanceof Error ? error.message : "Classroom initialization failed",
      };
    });
    await initialization;
    return getHealth();
  }

  async function read() {
    await initialize();
    if (!currentDatabase) {
      throw new ClassroomSnapshotFileError("Classroom data unavailable", { code: "classroom_degraded" });
    }
    return structuredClone(currentDatabase);
  }

  async function commit(input) {
    await initialize();
    if (!currentDatabase) {
      throw new ClassroomSnapshotFileError("Classroom data unavailable", { code: "classroom_degraded" });
    }
    const candidate = validateClassroomDatabase(prepareDatabase(structuredClone(input)));
    candidate.revision = currentDatabase.revision + 1;
    candidate.updatedAt = now().toISOString();
    try {
      await durableWrite(dbPath, candidate);
    } catch (error) {
      if (error?.committedToPath) {
        pendingDirectorySyncs.add(error.committedDirectory ?? dataDirectory);
        currentDatabase = structuredClone(candidate);
        health = { ...health, status: "at_risk", diagnostic: "Main directory sync failed after rename" };
      }
      throw new ClassroomSnapshotFileError("Classroom data could not be saved", {
        code: "classroom_write_failed",
        retryable: true,
        cause: error,
      });
    }
    currentDatabase = structuredClone(candidate);
    try {
      await writeCommittedSnapshot(candidate);
    } catch (error) {
      if (error?.committedToPath) pendingDirectorySyncs.add(error.committedDirectory ?? snapshotDirectory);
      health = { ...health, status: "at_risk", snapshotError: error instanceof Error ? error.message : "Snapshot failed" };
      throw new ClassroomSnapshotFileError("Classroom recovery snapshot could not be saved", {
        code: "classroom_snapshot_failed",
        retryable: true,
        cause: error,
      });
    }
    health = { ...health, status: "ready", available: true, snapshotError: undefined };
    return structuredClone(candidate);
  }

  async function ensureCurrentSnapshot() {
    const db = await read();
    try {
      await syncPendingDirectories();
      await writeCommittedSnapshot(db);
    } catch (error) {
      if (error?.committedToPath) pendingDirectorySyncs.add(error.committedDirectory ?? snapshotDirectory);
      health = { ...health, status: "at_risk", snapshotError: error instanceof Error ? error.message : "Snapshot failed" };
      throw new ClassroomSnapshotFileError("Classroom recovery snapshot could not be saved", {
        code: "classroom_snapshot_failed",
        retryable: true,
        cause: error,
      });
    }
    health = { ...health, status: "ready", available: true, diagnostic: undefined, snapshotError: undefined };
    return db;
  }

  function getHealth() {
    return { ...health };
  }

  return { commit, ensureCurrentSnapshot, getHealth, initialize, read };
}
