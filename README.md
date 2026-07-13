# 北海成长岛

北海成长岛是一个面向幼儿园德育成长记录的游戏化原型。当前版本把地图层重构为 PixiJS 2D/2.5D 精灵家园地图，React 负责业务 HUD，保留 XP、等级、加分、扣分、成长记录、AI 复核和数学 PK 的业务流程。

## 当前形态

- PixiJS 渲染成长岛地图、海水、区域、道路、小屋、精灵、粒子、标签和镜头。
- `pixi-viewport` 支持拖拽、滚轮缩放、触摸缩放、点击聚焦、返回全岛。
- 每个幼儿绑定一个精灵家园，精灵和小屋分布在不同社区。
- React HUD 提供顶部状态、右侧角色卡、底部精灵 Dock、老师操作和成长记录。
- 加分会触发 XP 光点飞向成长树，扣分有克制反馈。

## 运行

```bash
npm install
npm run dev
```

默认前端运行在 `http://localhost:5173/`，本地 API 运行在 `http://localhost:5174/`。

## 构建

```bash
npm run build
```

首页使用 WebP 精灵缩略图，非首页模块和 Three.js 展示按需加载。构建仍会提示可选 Three.js chunk 较大，但它不会进入首页请求；`npm run build` 会基于生产 manifest 校验动态入口，并递归约束初始、Pixi 增量与首页静态 JS 预算。

## 测试与 QA

```bash
npm run typecheck
npm test
npm run qa:visual
npm run qa:p4-providers
```

`qa:visual` 需要先运行 `npm run dev`。`qa:p4-providers` 需要 Tencent TTS/ASR 和 DeepSeek 凭据；环境变量、mock provider、fallback 行为见 `docs/provider-runtime-guide.md`。

## 数据说明

运行数据在 `data/beihai-db.json`，滚动快照在同目录的 `backups/`，均不会提交到仓库。服务端保留最近 20 份已验证快照；主文件损坏时恢复最新有效快照，只有主文件和快照都不存在时才创建内置初始数据。无法恢复时 `/api/health` 仍可用，课堂接口会明确返回 `classroom_degraded` 503。

## 目录重点

- `src/game/`：地图配置、区域、小屋、精灵布局和 PixiJS 场景代码。
- `src/game/pixi/`：PixiJS 分层、镜头、粒子和交互系统。
- `src/components/Hud/`：React 游戏 HUD。
- `src/components/WorldMap/`：React 与 PixiJS 的桥接容器。
- `assets/generated/`：当前生成的精灵图资产。
- `.agents/skills/beihai-asset-imagegen/`：项目专用批量生图 skill。
