# qa/
> L2 | 父级: /CLAUDE.md

成员清单
runner.mjs: Playwright 视觉 QA 执行核心，负责浏览器、页面、截图、报告和 issue 汇总。
data-management-assertions.mjs: 记录港纯断言 Module，核对分类过滤后的能量、活跃孩子和有效记录统计。
home-assertions.mjs: 首页主屏、清晰度、模型道具和持续拖拽性能断言。
home-tools.mjs: 首页地图性能与清晰度测量工具，集中 Pixi render state、拖拽、缩放、soak 采样。
checks/: QA check catalog 分区，维护默认检查顺序和 QA_CHECKS 名称。

法则: runner 保持执行流程；首页测量进 home-tools；首页断言进 home-assertions；check 名称和顺序由 checks/index.mjs 控制。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
