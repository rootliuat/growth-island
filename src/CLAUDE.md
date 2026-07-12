# src/
> L2 | 父级: /CLAUDE.md

成员清单
App.tsx: 应用组合根，连接 app 深 Module、domain 规则、产品动作和展示 Adapter。
app/: 应用级深 Module 与展示 Adapter，集中课堂数据会话、说成长会话和 QA 接线。
main.tsx: React/Vite 浏览器挂载入口，只导入 App 与 styles/index.css。
browser/: 浏览器能力 Adapter，集中 localStorage、MediaRecorder 等 window 依赖。
components/: React UI Module，包括 HUD、WorldMap 桥接和产品模块页面。
data/: 演示课堂、组织和奖励种子数据。
domain/: 业务规则 Module，提供 App 可复用的深 Interface。
game/: PixiJS 地图配置、资产、布局、placement 和运行时。
services/: 本地 API Adapter。
types.ts: 前端共享类型契约。

法则: App 只做接线；业务判断下沉 domain；浏览器能力放 browser；地图运行时留在 game。

变更日志
2026-07-12: 将课堂数据会话、说成长会话、QA Adapter、反馈、预载和展示装配从 App 根文件拆出。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
