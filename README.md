# 成长岛 / Beihai Growth Island

成长岛是一套面向幼儿园班级的游戏化德育成长系统。它把日常行为记录、XP、精灵成长、随机点名、语音/文本记录、数学 PK、积分活动和成长档案组织成一个“北海成长岛”班级世界。

当前项目是 Vite + React + TypeScript 原型，包含本地 JSON API 和 PixiJS 地图渲染。

## 快速开始

```bash
npm install
npm run dev
```

`npm run dev` 会同时启动：

- 本地 API：`http://localhost:5174`
- Vite 前端：`http://localhost:5173`

如果只需要单独启动某一部分：

```bash
npm run api       # 只启动 server/beihai-api.mjs
npm run dev:vite  # 只启动 Vite
```

## 常用命令

```bash
npm run typecheck   # TypeScript 项目检查
npm run test        # Vitest 单元测试
npm run test:watch  # Vitest watch 模式
npm run build       # typecheck + Vite 生产构建
npm run preview     # 预览生产构建
npm run qa:visual   # Playwright 视觉/流程 QA
```

资源生成命令：

```bash
npm run assets:map-webp
npm run assets:thumbs
```

## 项目结构

```text
src/
  App.tsx                    # 应用状态、模块路由、XP ledger、地图联动装配层
  components/                # React UI 组件
    modules/                 # 课堂记录台、随机点名、语音记录、数学竞技场等模块页
    Hud/                     # 顶部 HUD、精灵详情、底部精灵队伍等
    WorldMap/                # React 与 Pixi 地图桥接
  domain/                    # XP、等级、德育判断等纯业务规则
  services/                  # 前端本地 API 访问
  game/                      # PixiJS 地图配置、布局、渲染层
  data/                      # 前端种子数据
server/
  beihai-api.mjs             # 本地 JSON API
  moral-agent.mjs            # 服务端德育关键词判断
scripts/
  dev.mjs                    # 同时启动 API 和 Vite
  qa-visual.mjs              # Playwright 视觉/流程 QA
  generate-*.mjs             # 资源生成脚本
docs/
  product-spec.md            # 产品需求主文档
  three-screen-product-structure.md
  map-png-*.md               # 地图资产说明
data/
  beihai-db.json             # 本地 API 默认数据文件
tests/
  domain/                    # 纯业务规则单元测试
public/assets/map/           # 运行时地图资源
```

## 本地 API 和数据

默认 API 端口是 `5174`。前端默认会连接当前 hostname 的 5174 端口，也可以用环境变量覆盖：

```bash
VITE_API_BASE_URL=http://localhost:5174 npm run dev:vite
```

本地 API 默认读写：

```text
data/beihai-db.json
```

也可以用环境变量指定数据库路径：

```bash
BEIHAI_DB_PATH=/tmp/beihai-db.json npm run api
```

## 产品文档

优先阅读：

- `docs/product-spec.md`：产品定位、核心系统、模块规划
- `docs/three-screen-product-structure.md`：成长岛大屏、课堂记录台、孩子成长档案三屏结构
- `docs/map-png-style-guide.md`：地图资产风格
- `docs/map-png-generation-guide.md`：地图资产生成说明

## 开发约束

- 不要重新初始化项目。
- 不要运行破坏性 git 命令。
- 不要清理未跟踪资产。
- 不要删除或随意改动大型/生成资产目录，尤其是：
  - `assets/generated/v4`
  - `cutout-birefnet-dynamic`
  - `public/assets/map/v4`
  - `public/assets/map/v4-runtime`
- 不要无关修改 CSV/JSON 数据文件。
- 前端 UI 改动后至少运行：

```bash
npm run build
```

涉及主要流程或布局时，再运行：

```bash
npm run qa:visual
```

## 测试策略

当前第一层测试覆盖纯业务规则：

- XP / 等级 / rank / ledger 归一化：`tests/domain/progression.test.ts`
- 德育关键词判断：`tests/domain/moralAgent.test.ts`

后续新增业务规则时，优先放入 `src/domain/` 并补单元测试。UI 和 Pixi 地图流程使用 `scripts/qa-visual.mjs` 做浏览器 smoke 和视觉检查。
