# src/
> L2 | 父级: /CLAUDE.md

成员清单
App.tsx: 应用根状态接线层，协调课堂数据、路由、ledger、同步和说成长 session。
main.tsx: React/Vite 浏览器挂载入口，只导入 App 与 styles/index.css。
browser/: 浏览器能力 Adapter，集中 localStorage、MediaRecorder 等 window 依赖。
components/: React UI Module，包括 HUD、WorldMap 桥接和产品模块页面。
data/: 演示课堂、组织和奖励种子数据。
domain/: 业务规则 Module，提供 App 可复用的深 Interface。
game/: PixiJS 地图配置、资产、布局、placement 和运行时。
services/: 本地 API Adapter。
types.ts: 前端共享类型契约。

法则: App 只做接线；业务判断下沉 domain；浏览器能力放 browser；地图运行时留在 game。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
