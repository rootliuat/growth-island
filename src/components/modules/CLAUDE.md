# modules/
> L2 | 父级: /CLAUDE.md

成员清单
ChildProfileModule.tsx: 精灵小屋页面，孩子唯一 2D 精灵为主，3D 道具和说成长为辅。
DataManagementModule.tsx: 班级数据备份、恢复、清空和筛选统计同口径的记录港工具。
LeaderboardModule.tsx: 荣誉榜与成长能量排行。
LotteryModule.tsx: 幸运贝池抽取页面。
MathArenaModule.tsx: 数学光路练习页面。
ModulePlaceholder.tsx: 未重点产品化模块的占位页面。
OrganizationModule.tsx: 班级/课程任务现场操作页面。
RollCallModule.tsx: 随机抽取幼儿页面。
SettingsModule.tsx: 本机课堂设置页面。
ShopModule.tsx: 小铺奖励兑换页面。
TeacherWorkbenchModule.tsx: 老师补记和待看工作台。
VoiceRecordModule.tsx: 贝壳语音记录页面。
moduleConfig.ts: 模块 dock 的配置 Interface。

法则: 模块页专注一个课堂工作流；共享规则进 domain，共享 chrome 进 AppShell/HUD。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
