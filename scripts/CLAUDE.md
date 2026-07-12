# scripts/
> L2 | 父级: /CLAUDE.md

成员清单
qa-visual.mjs: 视觉 QA 兼容入口，加载 scripts/qa/runner.mjs。
qa/: 视觉 QA runner、check catalog 和检查实现。
dev.mjs: 本地 API + Vite 开发服务启动脚本。
generate-map-hidpi.mjs: 地图高分辨率资产生成脚本。
generate-map-webp.mjs: 地图 WebP 转换脚本。
generate-spirit-thumbnails.mjs: 精灵缩略图生成脚本。

法则: npm scripts 的公开命令保持稳定；复杂实现进入子目录。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
