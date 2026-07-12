/**
 * [INPUT]: 依赖 scripts/qa/runner.mjs 的视觉 QA 执行流程。
 * [OUTPUT]: 保留 npm run qa:visual 的兼容入口。
 * [POS]: scripts 的薄入口，实际实现集中在 scripts/qa。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import "./qa/runner.mjs";
