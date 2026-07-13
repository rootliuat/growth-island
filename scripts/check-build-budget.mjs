/**
 * [INPUT]: 依赖 Vite manifest、dist/assets 产物和试教首页性能预算。
 * [OUTPUT]: 校验非首页动态入口，并约束初始入口、Pixi 增量及首页静态 JS 总量。
 * [POS]: scripts 的确定性构建门禁，被 npm run build 消费，避免用搬包绕过体积约束。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve("dist");
const manifest = JSON.parse(fs.readFileSync(path.join(distDir, ".vite/manifest.json"), "utf8"));
const budgets = {
  initial: 330 * 1024,
  pixiIncremental: 480 * 1024,
  homeStatic: 810 * 1024,
};
const lazyEntrySources = [
  "src/components/modules/ChildProfileModule.tsx",
  "src/components/DialogueModal.tsx",
  "src/components/modules/DataManagementModule.tsx",
  "src/components/modules/LeaderboardModule.tsx",
  "src/components/modules/LotteryModule.tsx",
  "src/components/modules/MathArenaModule.tsx",
  "src/components/MathPkModal.tsx",
  "src/components/modules/OrganizationModule.tsx",
  "src/components/modules/RollCallModule.tsx",
  "src/components/modules/SettingsModule.tsx",
  "src/components/modules/ShopModule.tsx",
  "src/components/Hud/SpiritShowcase3D.tsx",
  "src/components/modules/TeacherWorkbenchModule.tsx",
  "src/components/modules/VoiceRecordModule.tsx",
];

function findChunk(predicate, label) {
  const matches = Object.entries(manifest).filter(([, chunk]) => predicate(chunk));
  if (matches.length !== 1) throw new Error(`Expected one ${label} manifest entry, found ${matches.length}`);
  return matches[0][0];
}

function collectStaticImports(rootKey, collected = new Set()) {
  if (collected.has(rootKey)) return collected;
  const chunk = manifest[rootKey];
  if (!chunk) throw new Error(`Missing manifest entry: ${rootKey}`);
  collected.add(rootKey);
  (chunk.imports ?? []).forEach((key) => collectStaticImports(key, collected));
  return collected;
}

function totalBytes(keys) {
  return [...keys].reduce((total, key) => total + fs.statSync(path.join(distDir, manifest[key].file)).size, 0);
}

function assertBudget(bytes, budget, label) {
  if (bytes <= budget) return;
  throw new Error(`${label} is ${(bytes / 1024).toFixed(1)}KB; budget is ${(budget / 1024).toFixed(0)}KB`);
}

const entryKey = findChunk((chunk) => chunk.isEntry, "HTML entry");
const pixiKey = findChunk((chunk) => chunk.isDynamicEntry && chunk.name === "PixiWorldMap", "PixiWorldMap dynamic entry");
const entry = manifest[entryKey];
lazyEntrySources.forEach((source) => {
  if (!entry.dynamicImports?.includes(source) || !manifest[source]?.isDynamicEntry) {
    throw new Error(`Expected direct lazy entry for ${source}`);
  }
});

const initialKeys = collectStaticImports(entryKey);
const pixiKeys = collectStaticImports(pixiKey);
const pixiIncrementalKeys = new Set([...pixiKeys].filter((key) => !initialKeys.has(key)));
const homeStaticKeys = new Set([...initialKeys, ...pixiKeys]);
const initialBytes = totalBytes(initialKeys);
const pixiIncrementalBytes = totalBytes(pixiIncrementalKeys);
const homeStaticBytes = totalBytes(homeStaticKeys);

assertBudget(initialBytes, budgets.initial, "initial JS");
assertBudget(pixiIncrementalBytes, budgets.pixiIncremental, "Pixi incremental JS");
assertBudget(homeStaticBytes, budgets.homeStatic, "home static JS");

console.log(
  `Build budgets passed: initial=${(initialBytes / 1024).toFixed(1)}KB, `
  + `pixi=${(pixiIncrementalBytes / 1024).toFixed(1)}KB, home=${(homeStaticBytes / 1024).toFixed(1)}KB`,
);
