# WorldMap/
> L2 | 父级: /CLAUDE.md

成员清单
WorldMapContainer.tsx: React 桥接层，组合 Pixi 地图与儿童说成长浮层，老师复核由首页右轨承载。
PixiWorldMap.tsx: PixiWorld 的 React 封装，暴露 focusSelected/focusFullIsland 等命令。

法则: React 层只传递 App 状态和命令；Pixi 运行时细节留在 game/pixi。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
