# qa/
> L2 | 父级: /scripts/CLAUDE.md

成员清单
runner.mjs: Playwright 视觉 QA 编排核心，负责浏览器生命周期、页面调度、截图、报告、issue 汇总与尚未迁出的遗留流程。
data-management-assertions.mjs: 记录港纯断言 Module，核对分类过滤后的能量、活跃孩子和有效记录统计。
home-assertions.mjs: 首页主屏、清晰度、模型道具和持续拖拽性能断言。
home-tools.mjs: 首页地图性能与清晰度测量工具，集中 Pixi render state、拖拽、缩放、soak 采样。
moral-recovery-flow.mjs: 说成长恢复纵切 QA，验证确定性 4xx 可退出、未知写结果幂等恢复、重放锁和连续课堂动作。
operations-flows.mjs: 课堂运营 QA Module，封装记录港、园所运营、设置舵盘及其移动端交互流程。
release-gate.mjs: 生产发布规则纯函数，统一 HTTPS、腾讯 ASR、45 FPS、清晰度和逐儿童单账本门槛。
checks/: QA check catalog 分区，维护默认检查顺序和 QA_CHECKS 名称。

法则: runner 逐步收缩为编排与汇总；首页逻辑进入 home-*；课堂运营流程进入 operations-flows；说成长恢复进入 moral-recovery-flow；check 名称和顺序由 checks/index.mjs 控制。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
