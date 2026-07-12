# app/
> L2 | 父级: /src/CLAUDE.md

成员清单
GrowthIslandView.tsx: 纯展示 Adapter，装配 HUD、地图、产品 Module、弹层和活动模块路由。
useClassroomSession.ts: 课堂数据会话深 Module，集中快照、同步、备份和浏览器持久化。
useMoralSpeakWorkflow.ts: 说成长会话深 Module，集中录音、识别、复核、审批锁和陈旧响应保护。
useGrowthIslandQaBridge.ts: 开发期 QA Adapter，维持 window.__growthIsland* 自动化 Interface。
useGrowthFeedback.ts: 全局成长反馈深 Module，集中反馈状态、自动消退计时与清理。
useSpiritAssetPreload.ts: 首页精灵资产预载 Module，集中优先级、分批调度和取消清理。

法则: App 只组合深 Module；持久状态只有一个所有者；展示 Adapter 不承载业务判断。

变更日志
2026-07-12: 建立课堂数据会话 Module，开始收敛 App 根接线层。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
