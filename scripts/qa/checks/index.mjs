/**
 * [INPUT]: 依赖各 QA check 分区清单。
 * [OUTPUT]: 对外提供按历史顺序排列的 allChecks。
 * [POS]: scripts/qa/checks 的聚合入口，被 runner.mjs 消费。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { homeChecks } from "./home.mjs";
import { performanceChecks } from "./performance.mjs";
import { moralChecks } from "./moral.mjs";
import { moduleChecks } from "./modules.mjs";
import { profileChecks } from "./profile.mjs";

export const allChecks = [
  homeChecks[0],
  performanceChecks[0],
  homeChecks[1],
  moralChecks[0],
  homeChecks[2],
  moralChecks[1],
  moralChecks[2],
  homeChecks[3],
  ...moduleChecks.slice(0, 5),
  profileChecks[0],
  ...moduleChecks.slice(5, 12),
  ...moduleChecks.slice(12, 16),
  profileChecks[1],
  ...moduleChecks.slice(16),
];
