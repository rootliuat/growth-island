/**
 * [INPUT]: 依赖 Vite、React plugin 与 Rollup 静态可分析分包能力。
 * [OUTPUT]: 对外提供 React vendor 稳定缓存边界、构建 manifest 和 Growth Island 构建配置。
 * [POS]: 项目根构建入口，约束生产包的基础依赖分层。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
declare const _default: import("vite").UserConfig;
export default _default;
