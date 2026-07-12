/**
 * [INPUT]: 无运行时依赖，描述首页性能 soak QA checks。
 * [OUTPUT]: 对外提供 performanceChecks。
 * [POS]: scripts/qa/checks 的性能检查清单，被 index.mjs 聚合。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const performanceChecks = [
  { name: "home-performance-soak", module: "home", viewports: ["whiteboard"], kind: "home-performance-soak" },
];
