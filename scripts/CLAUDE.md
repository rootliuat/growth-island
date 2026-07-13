# scripts/
> L2 | 父级: /CLAUDE.md

成员清单
qa-visual.mjs: 视觉 QA 兼容入口，加载 scripts/qa/runner.mjs。
qa-real-mic.mjs: 独占端口的真实物理麦克风人工试教门禁，输出无音频、无全文的脱敏报告。
qa-preview-smoke.mjs: 独占端口使用生产 manifest、预览与系统 Chrome 验收首页，并阻止延迟运行图被提前加载。
qa-trial.mjs: 试教 QA 编排入口，独占端口与恢复数据并串联视觉和资源门禁。
qa-p4-provider-smoke.mjs: 真实 Provider 链路 smoke，拒绝未知端口服务并输出脱敏报告。
qa-database.mjs: QA 数据库重置工具，只清理指定测试数据库自己的主文件、快照和残留。
check-build-budget.mjs: 基于生产 manifest 校验懒加载契约，递归约束初始、Pixi 增量与首页静态 JS。
qa/: 视觉 QA runner、check catalog 和检查实现。
dev.mjs: 本地 API + Vite 开发服务启动脚本。
generate-map-hidpi.mjs: 地图高分辨率资产生成脚本。
generate-map-webp.mjs: 地图 WebP 转换脚本。
generate-spirit-thumbnails.mjs: 精灵缩略图生成脚本。

法则: npm scripts 的公开命令保持稳定；复杂实现进入子目录。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
