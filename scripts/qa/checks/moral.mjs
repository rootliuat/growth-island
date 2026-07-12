/**
 * [INPUT]: 无运行时依赖，描述儿童自助说成长与老师复核 QA checks。
 * [OUTPUT]: 对外提供 moralChecks。
 * [POS]: scripts/qa/checks 的说成长检查清单，被 index.mjs 聚合。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const moralChecks = [
  { name: "moral-speak-flow", module: "home", viewports: ["whiteboard", "mobile"], kind: "moral-speak-flow", offline: true },
  { name: "moral-review-safety", module: "home", viewports: ["whiteboard", "mobile"], kind: "moral-review-safety", offline: true },
  { name: "moral-review-online-stale", module: "home", viewports: ["whiteboard"], kind: "moral-review-online-stale" },
];
