# Hud/
> L2 | 父级: /CLAUDE.md

成员清单
GameTopBar.tsx: 首页顶部课堂状态 HUD，白板常驻显示真实数据去向。
GrowthFeedbackOverlay.tsx: 全局成长反馈浮层，只消费 growthFeedback 视图契约。
GrowthLogPanel.tsx: 成长记录和待看队列 HUD 面板。
HudPanelTabs.tsx: HUD 面板 tab 定义。
MoralSpeakOverlay.tsx: 儿童自助说成长浮层，只消费 moralSpeakSession 状态。
SpiritDetailPanel.tsx: 当前精灵详情面板。
SpiritDock.tsx: 底部幼儿精灵队列。
SpiritModelStage3D.tsx: Three.js 精灵/奖励模型舞台。
SpiritShowcase3D.tsx: 首页 3D 精灵展示弹窗。
TeacherActionPanel.tsx: 老师快捷操作面板。
TeacherMoralReviewCard.tsx: 老师确认/修正/重说/跳过说成长卡片。
ZoomControls.tsx: 首页地图缩放控制。

法则: HUD Module 接受状态和回调，不直接改 ledger 或课堂数据。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
