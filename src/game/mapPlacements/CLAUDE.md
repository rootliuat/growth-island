# mapPlacements/
> L2 | 父级: /CLAUDE.md

成员清单
path.ts: placement 区域顺序、RawPlacementGroups 类型和按 layer 展平工具。
growth.ts: 成长广场区域 placement 数据，包含成长树、主环路和自助成长热点。
home.ts: 红树林、贝壳湾、珍珠湾的小屋相关 placement 数据。
honor.ts: 阳光小镇与数学广场的荣誉/挑战 placement 数据。
shop.ts: 旧街小铺、对话亭、记录角和任务牌 placement 数据。

法则: 分区文件只产出 RawMapPlacement[]；坐标物化、排序和对外兼容由 mapPlacementConfig.ts 负责。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
