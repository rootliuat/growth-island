/**
 * [INPUT]: 依赖 Vite、React plugin、Rollup 静态分包和本地 Beihai API 目标。
 * [OUTPUT]: 对外提供 React vendor 缓存边界、构建 manifest、同源开发/预览代理和构建配置。
 * [POS]: 项目根构建入口，约束生产包依赖分层与本地同源 API 契约。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function () {
    var apiTarget = process.env.BEIHAI_API_PROXY_TARGET || "http://127.0.0.1:5174";
    var proxy = { "/api": { target: apiTarget, changeOrigin: true } };
    return {
        plugins: [react()],
        server: { proxy: proxy },
        preview: { proxy: proxy },
        build: {
            manifest: true,
            rollupOptions: {
                output: {
                    manualChunks: function (id) {
                        if (id.includes("/node_modules/react/") || id.includes("/node_modules/react-dom/") || id.includes("/node_modules/scheduler/")) {
                            return "react-vendor";
                        }
                        return undefined;
                    }
                },
            },
        },
    };
});
