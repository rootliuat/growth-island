/**
 * [INPUT]: 依赖 Vite、React plugin、Rollup 静态分包和本地 Beihai API 目标。
 * [OUTPUT]: 对外提供 React vendor 缓存边界、构建 manifest、同源开发/预览代理和构建配置。
 * [POS]: 项目根构建入口，约束生产包依赖分层与本地同源 API 契约。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
declare const _default: import("vite").UserConfigFnObject;
export default _default;
