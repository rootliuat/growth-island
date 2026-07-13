/**
 * [INPUT]: 依赖 QA 专用数据库路径和 node:fs/path 的同步文件操作。
 * [OUTPUT]: 对外提供 resetQaDatabase，删除指定 QA 数据库及其专属快照、临时文件和损坏副本。
 * [POS]: scripts 的 QA 隔离工具，防止恢复机制把上一次测试状态带入新运行。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import fs from "node:fs";
import path from "node:path";

export function resetQaDatabase(dbPath) {
  const directory = path.dirname(dbPath);
  const basename = path.basename(dbPath);
  fs.rmSync(dbPath, { force: true });
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory)
      .filter((name) => name.startsWith(`${basename}.corrupt-`) || (name.startsWith(`${basename}.`) && name.endsWith(".tmp")))
      .forEach((name) => fs.rmSync(path.join(directory, name), { force: true }));
  }
  const backupDirectory = path.join(directory, "backups");
  if (!fs.existsSync(backupDirectory)) return;
  fs.readdirSync(backupDirectory)
    .filter((name) => name.startsWith(`${basename}.snapshot-`))
    .forEach((name) => fs.rmSync(path.join(backupDirectory, name), { force: true }));
}
