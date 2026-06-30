# pixi/
> L2 | 父级: /src/game/CLAUDE.md

成员清单
PixiWorld.ts: PixiJS 地图运行时主控，管理挂载、相机、交互唤醒、渲染清晰度、限帧和销毁。
WorldScene.ts: 地图场景编排，组合海岛、区域、道具、小屋、精灵、标签和特效层。
CameraController.ts: Pixi viewport 相机 Adapter，负责缩放、拖拽和聚焦动画。
InteractionManager.ts: 运行时清理栈，集中移除监听器和副作用。
LayerManager.ts: 地图图层树，提供固定层级顺序。
OceanLayer.ts: 海水层生命周期占位，避免海水大纹理进入 Pixi 静态缓存；真实海水由 CSS 背景承载。
IslandLayer.ts: 主岛底图层。
RegionLayer.ts: 区域轮廓、能量徽章和区域聚焦入口。
PathLayer.ts: 岛内路径层。
DecorationLayer.ts: 海岛道具、热点和模型烘焙道具层。
HomeLayer.ts: 孩子小屋和门牌层。
SpiritLayer.ts: 精灵节点、浮动、进化和点击聚焦层。
LabelLayer.ts: 姓名、区域、活动标签层。
EffectLayer.ts: XP、能量落点和成长反馈特效层。
XpParticleSystem.ts: XP 粒子系统。
assetSprites.ts: Pixi 资产加载和 Sprite 构造工具，默认关闭纯视觉资产事件命中。
drawing.ts: 图形绘制辅助函数。

法则: 主屏交互必须优先顺滑；主动交互可 60 FPS，空闲动画低帧率；不能用降清晰度掩盖卡顿。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
