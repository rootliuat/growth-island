/**
 * [INPUT]: 无运行时依赖，描述精灵小屋和移动小屋 QA checks。
 * [OUTPUT]: 对外提供 profileChecks。
 * [POS]: scripts/qa/checks 的精灵小屋检查清单，被 index.mjs 聚合。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const profileChecks = [
  { name: "child-profile", module: "teacher-workbench", viewports: ["whiteboard"], kind: "profile-flow", offline: true },
  { name: "mobile-child-profile", module: "child-profile", viewports: ["mobile"], kind: "profile-flow", offline: true },
];
