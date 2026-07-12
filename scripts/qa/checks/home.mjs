/**
 * [INPUT]: 无运行时依赖，描述首页课堂地图相关 QA checks。
 * [OUTPUT]: 对外提供 homeChecks。
 * [POS]: scripts/qa/checks 的首页检查清单，被 index.mjs 聚合。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const homeChecks = [
  { name: "home", module: "home", viewports: ["whiteboard", "ultra"], kind: "home" },
  { name: "home-fallback-return", module: "home", viewports: ["whiteboard", "mobile"], kind: "home-fallback-return" },
  { name: "classroom-touch-loop", module: "home", viewports: ["whiteboard"], kind: "classroom-loop", offline: true },
  { name: "spirit-showcase-3d", module: "home", viewports: ["whiteboard", "mobile"], kind: "spirit-showcase", offline: true },
];
