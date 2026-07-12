/**
 * [INPUT]: 依赖 React 根渲染、App 入口组件和全局样式聚合入口。
 * [OUTPUT]: 对外提供浏览器端应用挂载。
 * [POS]: src 的 Vite/React 启动入口，只负责挂载，不承载业务状态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
