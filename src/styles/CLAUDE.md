# styles/
> L2 | 父级: /CLAUDE.md

成员清单
index.css: 全局样式聚合入口，唯一被 src/main.tsx 导入，按历史 cascade 顺序导入片段。
01-tokens.css: 根变量、字体、基础 reset，必须最先加载。
shell/: shell、老师栏、基础卡片和旧课堂面板，承接旧 02-shell.css。
home-map/: 首页海岛地图、HUD、底部精灵队列与能量星座样式，承接旧 03-home-map.css。
modules-base/: 产品 shell、模块页面基础、小铺/榜单/抽取等早期模块样式，承接旧 04-modules-base.css。
child-profile/: 精灵小屋、成长档案、紧凑模块 chrome 与孩子档案覆盖样式，承接旧 05-child-profile.css。
moral-speak/: 儿童自助说成长、老师确认卡、成功点亮反馈样式，承接旧 06-moral-speak.css。
modules/: P0-P14 后续模块、移动端、白板触控的最终覆盖层，承接旧 07-modules.css。

法则: 只通过 index.css 暴露 Interface；新增样式先进入对应域目录，避免恢复巨型 styles.css。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
