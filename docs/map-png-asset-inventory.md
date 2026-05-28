# 成长岛 PNG 地图资产清单

目标已经调整：地图场景不再继续依赖 Pixi `Graphics` 代码绘制。后续海水、岛屿、区域、房屋、树木、装饰物统一用 AI 生成 PNG 资产替换。参考图方向为动物森友会式 2.5D 等轴家园：马卡龙配色、圆润厚地块、软萌建筑、粉色栅栏、花树、灌木、家具和生活化摆件。

当前阶段只做资产清单和接入预留，不做地图几何视觉优化。

配套文档：

- 地图 PNG 美术规范：[map-png-style-guide.md](./map-png-style-guide.md)
- WSL 生产与验收流程：[map-png-generation-guide.md](./map-png-generation-guide.md)
- 生图、模型抠图与边缘修复记录：[asset-generation-and-cutout-log.md](./asset-generation-and-cutout-log.md)

## 替换入口

| 场景层 | 当前代码位置 | 需要替换的内容 | PNG 接入方式 |
| --- | --- | --- | --- |
| 海水 | `src/game/pixi/OceanLayer.ts` | 海水底色、水波线、气泡、流动纹理 | `ocean-base`、`ocean-wave-tile`、`ocean-sparkle` |
| 岛屿 | `src/game/pixi/IslandLayer.ts` | 岛面、岛侧、岸线、浅滩、投影 | `island-shadow`、`island-side`、`island-surface`、`island-shore-foam` |
| 区域地形 | `src/game/pixi/RegionLayer.ts` | 七个区域地形色块、区域纹理、区域牌 | `region-*` |
| 路径 | `src/game/pixi/PathLayer.ts` | 主路、小径、石板、贝壳路、木栈道 | `path-main-overlay`、`path-*-segment` |
| 地标建筑 | `src/game/pixi/DecorationLayer.ts` | 成长树、数学竞技场、老街牌坊、码头、桥 | `landmark-*` |
| 精灵小屋 | `src/game/pixi/HomeLayer.ts` | 6 种小屋、地垫、门牌、等级装饰 | `home-{type}-lv{n}`、`home-ground-pad` |
| 小装饰 | `src/game/pixi/DecorationLayer.ts` | 树、花、石头、贝壳、灯、旗、邮箱、风车等 | `decor-*` |
| 标签/徽章 | `src/game/pixi/LabelLayer.ts`、`SpiritLayer.ts` | 区域牌、成长气泡、等级徽章 | `label-*` |
| 特效 | `src/game/pixi/EffectLayer.ts`、`XpParticleSystem.ts` | XP 光点、升级闪光、选中指引 | `effect-*` |

## 第一批核心资产

| 资产 ID | 元素名称 | 建议尺寸 | 透明背景 | 对应代码位置 |
| --- | --- | ---: | --- | --- |
| `ocean-base` | 海水底图 | 512x512 | 否 | `OceanLayer.ts` |
| `ocean-wave-tile` | 水波纹理 tile | 512x512 | 是 | `OceanLayer.ts` |
| `ocean-sparkle` | 水面闪光/泡泡 | 128x128 | 是 | `OceanLayer.ts` |
| `island-shadow` | 整岛投影 | 2400x1600 | 是 | `IslandLayer.ts` |
| `island-side` | 整岛厚度侧面 | 2400x1600 | 是 | `IslandLayer.ts` |
| `island-surface` | 整岛表面 | 2400x1600 | 是 | `IslandLayer.ts` |
| `island-shore-foam` | 岸线浅滩高光 | 2400x1600 | 是 | `IslandLayer.ts` |
| `path-main-overlay` | 全岛主路 overlay | 2400x1600 | 是 | `PathLayer.ts` |

## 七大区域资产

| 资产 ID | 元素名称 | 建议尺寸 | 对应区域 |
| --- | --- | ---: | --- |
| `region-growth-plaza` | 成长树广场地形 | 760x560 | 中央 |
| `region-mangrove` | 红树林社区地形 | 820x620 | 左上 |
| `region-shell-bay` | 贝壳湾住宅区地形 | 760x620 | 左下 |
| `region-pearl-bay` | 珍珠湾地形 | 860x620 | 右上 |
| `region-sun-town` | 阳光小镇地形 | 820x620 | 右下 |
| `region-math-arena` | 数学竞技场地形 | 820x520 | 下方 |
| `region-old-street` | 北海老街地形 | 780x430 | 中上 |

## 大建筑资产

| 资产 ID | 元素名称 | 建议尺寸 | 对应代码位置 |
| --- | --- | ---: | --- |
| `landmark-growth-tree` | 成长树 | 420x520 | `DecorationLayer.drawLandmarks` |
| `landmark-math-arena` | 数学竞技场建筑 | 680x420 | `DecorationLayer.drawLandmarks` |
| `landmark-old-street-gate` | 老街牌坊 | 420x260 | `DecorationLayer.drawLandmarks` |
| `landmark-pearl-dock` | 珍珠湾浮桥/码头 | 360x220 | `DecorationLayer.drawDecoration` |
| `landmark-shell-pier` | 贝壳湾小码头 | 340x240 | `DecorationLayer.drawDecoration` |
| `landmark-mangrove-bridge` | 红树林木桥 | 360x220 | `DecorationLayer.drawDecoration` |

## 小屋资产

每种小屋先做 `Lv.1 / Lv.3 / Lv.5 / Lv.8` 四档，代码按 `homeLevel` 映射。所有小屋统一等轴透视，门口朝下或右下。

| 资产 ID 模板 | 元素名称 | 建议尺寸 | 对应代码位置 |
| --- | --- | ---: | --- |
| `home-shell-lv1/lv3/lv5/lv8` | 贝壳屋 | 256x256 | `HomeLayer.drawShellHouse` |
| `home-treehouse-lv1/lv3/lv5/lv8` | 树屋 | 300x320 | `HomeLayer.drawTreehouse` |
| `home-cottage-lv1/lv3/lv5/lv8` | 小镇屋 | 280x260 | `HomeLayer.drawCottage` |
| `home-pearl-lv1/lv3/lv5/lv8` | 珍珠屋 | 260x260 | `HomeLayer.drawPearlHouse` |
| `home-tent-lv1/lv3/lv5/lv8` | 帐篷屋 | 260x240 | `HomeLayer.drawTentHouse` |
| `home-garden-lv1/lv3/lv5/lv8` | 花园屋 | 300x280 | `HomeLayer.drawGardenHouse` |
| `home-ground-pad` | 小屋地垫/小院 | 300x180 | `HomeLayer.drawHomeGround` |
| `home-selected-beacon` | 选中小屋标记 | 160x160 | `HomeLayer.drawSelectedBeacon` |

## 装饰物资产

这些资产对应 `src/game/decorationConfig.ts` 的 `DecorationKind`，都需要透明 PNG。

| 资产 ID | 元素名称 | 建议尺寸 | 当前 kind |
| --- | --- | ---: | --- |
| `decor-tree-round` | 圆树/果树 | 180x220 | `tree` |
| `decor-tree-cherry` | 粉色花树 | 220x240 | 新增 |
| `decor-mangrove` | 红树林树 | 220x240 | `mangrove` |
| `decor-flower-patch` | 花丛 | 160x120 | `flower` |
| `decor-bush` | 灌木 | 160x120 | 新增 |
| `decor-rock` | 圆石 | 120x90 | `rock` |
| `decor-shell` | 贝壳 | 120x90 | `shell` |
| `decor-scallop` | 扇贝 | 130x100 | `scallop` |
| `decor-pearl` | 珍珠泡泡 | 120x120 | `pearl` |
| `decor-flag` | 小旗 | 90x140 | `flag` |
| `decor-lamp` | 小灯 | 90x150 | `lamp` |
| `decor-sign` | 路牌 | 160x120 | `sign` |
| `decor-bridge` | 小桥 | 260x160 | `bridge` |
| `decor-dock` | 小码头 | 260x190 | `dock` |
| `decor-fence-green` | 绿色栅栏 | 220x90 | `fence` |
| `decor-fence-pink` | 粉色栅栏 | 220x90 | 新增/替换 |
| `decor-mailbox` | 邮箱 | 100x120 | `mailbox` |
| `decor-windmill` | 小风车 | 180x220 | `windmill` |
| `decor-street-gate` | 老街门楼 | 300x220 | `street-gate` |
| `decor-yard-table` | 家园桌子 | 180x130 | 新增 |
| `decor-shelf-stall` | 展示架/矮柜 | 240x160 | 新增 |
| `decor-stone-stairs` | 草坡石阶 | 240x180 | 新增 |

## 路径和标签资产

| 资产 ID | 元素名称 | 建议尺寸 | 对应代码位置 |
| --- | --- | ---: | --- |
| `path-dirt-segment` | 泥土小径段 | 256x128 | `PathLayer.ts` |
| `path-stone-segment` | 石板路段 | 256x128 | `PathLayer.ts` |
| `path-shell-segment` | 贝壳路段 | 256x128 | `PathLayer.ts` |
| `path-wood-segment` | 木栈道段 | 256x128 | `PathLayer.ts` |
| `label-region-sign` | 区域木牌底图 | 220x90 | `LabelLayer.ts` / `RegionLayer.ts` |
| `label-growth-bubble` | 最近成长气泡底图 | 260x120 | `LabelLayer.ts` |
| `label-level-badge` | 等级徽章 | 96x96 | `SpiritLayer.ts` / `HomeLayer.ts` |
| `effect-xp-orb` | XP 光点 | 64x64 | `EffectLayer.ts` |

## 文件路径约定

正式 PNG 放到：

```text
public/assets/map/
  ocean/
  island/
  regions/
  landmarks/
  homes/
  decorations/
  paths/
  labels/
  effects/
```

例如：

```text
public/assets/map/homes/home-shell-lv1.png
public/assets/map/decorations/decor-fence-pink.png
public/assets/map/regions/region-mangrove.png
```

代码中的资产 ID 和目标路径已经在 `src/game/mapAssetCatalog.ts` 预留。资产到位后优先替换这些路径对应的 PNG，不再回到几何图形打磨路线。
