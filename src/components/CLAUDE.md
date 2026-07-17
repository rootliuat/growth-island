# components/
> L2 | 父级: /CLAUDE.md

成员清单
Hud/: 首页 HUD、说成长浮层、老师确认卡和 3D 展示小面。
WorldMap/: React 到 PixiJS 主地图的桥接 Module。
modules/: 底部 dock 对应的产品页面 Module。
AppShell.tsx: 产品 shell 与底部模块 dock 框架，常驻显示 server/local/unavailable 数据权威状态。
DialogueModal.tsx: 老师/孩子文本对话记录弹窗，只在权威快照确认后显示结果并呈现提交错误。
MathPkBattle.tsx: 数学光路对战视觉片段。
MathPkModal.tsx: 数学 PK 弹窗入口。
ReviewQueue.tsx: 待老师看记录队列。
TeacherBar.tsx: 早期老师工具栏。
ChildPanel.tsx: 早期孩子信息面板。
Leaderboard.tsx: 早期排行榜面板。

法则: 组件只渲染和派发事件；状态机与业务判断进入 domain/App 接线层。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
