/**
 * [INPUT]: 无运行时依赖，描述非首页模块 QA checks。
 * [OUTPUT]: 对外提供 moduleChecks。
 * [POS]: scripts/qa/checks 的模块页检查清单，被 index.mjs 聚合。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export const moduleChecks = [
  { name: "teacher-workbench", module: "teacher-workbench", viewports: ["whiteboard", "compact"], kind: "teacher" },
  { name: "teacher-flow", module: "teacher-workbench", viewports: ["whiteboard"], kind: "teacher-flow", offline: true },
  { name: "voice-record", module: "voice-record", viewports: ["whiteboard"], kind: "voice-flow", offline: true },
  { name: "roll-call", module: "roll-call", viewports: ["whiteboard"], kind: "roll-call", offline: true },
  { name: "math-arena", module: "math-arena", viewports: ["whiteboard"], kind: "math-flow", offline: true },
  { name: "leaderboard", module: "leaderboard", viewports: ["whiteboard"], kind: "leaderboard-flow" },
  { name: "lottery", module: "lottery", viewports: ["whiteboard"], kind: "lottery-flow" },
  { name: "shop", module: "shop", viewports: ["whiteboard"], kind: "shop-flow" },
  { name: "data-management", module: "data-management", viewports: ["whiteboard"], kind: "data-flow", offline: true },
  { name: "organization", module: "organization", viewports: ["whiteboard"], kind: "organization-flow" },
  { name: "settings", module: "settings", viewports: ["whiteboard"], kind: "settings-flow" },
  { name: "mobile-home", module: "home", viewports: ["mobile"], kind: "module", selector: ".home-module" },
  {
    name: "mobile-teacher-workbench",
    module: "teacher-workbench",
    viewports: ["mobile"],
    kind: "module",
    selector: ".teacher-workbench-page",
  },
  { name: "mobile-roll-call", module: "roll-call", viewports: ["mobile"], kind: "roll-call", offline: true },
  {
    name: "mobile-voice-record",
    module: "voice-record",
    viewports: ["mobile"],
    kind: "voice-mobile",
    selector: ".voice-record-page",
  },
  { name: "mobile-math-arena", module: "math-arena", viewports: ["mobile"], kind: "module", selector: ".math-arena-page" },
  { name: "mobile-lottery", module: "lottery", viewports: ["mobile"], kind: "lottery-flow" },
  { name: "mobile-shop", module: "shop", viewports: ["mobile"], kind: "shop-flow" },
  { name: "mobile-leaderboard", module: "leaderboard", viewports: ["mobile"], kind: "leaderboard-flow" },
  { name: "mobile-data-management", module: "data-management", viewports: ["mobile"], kind: "data-mobile-drawer", selector: ".data-page" },
  { name: "mobile-organization", module: "organization", viewports: ["mobile"], kind: "module", selector: ".organization-page" },
  { name: "mobile-settings", module: "settings", viewports: ["mobile"], kind: "settings-mobile", selector: ".settings-page" },
];
