# game/
> L2 | 父级: /CLAUDE.md

成员清单
mapPlacementConfig.ts: 地图 placement 兼容聚合入口，保持 createRawV4PlacementGroups 等原有 Interface。
mapPlacements/: 分区维护原始地图摆放数据，避免一个巨型配置文件吸收所有道具。
pixi/: PixiJS 地图运行时层，负责渲染、交互、LOD、限帧和动效。
layout.ts: 地图读模型 Adapter，将课堂孩子、账本与家园槽位投影为 Pixi 世界数据。
v4MapAssets.ts: v4 地图资产 URL、材质化 placement 和首页资产宽度。
assetScaleRules.ts: 地图资产缩放规则。
cameraConfig.ts: 地图相机单一配置源，并派生活动气泡可达缩放阈值。
mapAssetPlacement.ts: RawMapPlacement/MapPlacement 类型与 materialize/compare 工具。

法则: 地图数据分区维护，运行时消费聚合 Interface；不把主岛改成实时 3D。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
