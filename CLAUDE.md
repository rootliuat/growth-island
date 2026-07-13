# Growth Island - 课堂德育成长岛
Vite + React + TypeScript + PixiJS + Three.js

<directory>
src/ - 前端应用机器相，承载课堂状态、UI Module、domain 规则、PixiJS 地图和本地 API Adapter。
</directory>

<directory>
scripts/ - 工程与 QA 自动化，视觉 QA 通过 scripts/qa-visual.mjs 兼容入口执行。
</directory>

<directory>
tests/ - Vitest 领域与 API 回归，保护业务规则、数据同步和说成长状态契约。
</directory>

<directory>
server/ - 本地 Beihai API 与德育分析后端 Adapter。
</directory>

<directory>
docs/ - 产品、视觉、地图、生图、课堂验收与迭代记录。
</directory>

<directory>
.github/ - GitHub Actions 与仓库治理配置，提供合并前校验门禁。
</directory>

<config>
package.json - npm scripts 与 Vite/React/Pixi/Three 依赖版本。
</config>

<config>
vite.config.ts - Vite React 构建入口，提供稳定 vendor 分包与生产 manifest。
</config>

<config>
tsconfig.json - TypeScript strict 编译规则与项目 include 范围。
</config>

<config>
CONTEXT.md - 课堂德育领域词汇、关系与命名约束。
</config>

法则: 主屏优先孩子自助成长；老师是守门员；后台能力不得挤压课堂岛屿体验。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
