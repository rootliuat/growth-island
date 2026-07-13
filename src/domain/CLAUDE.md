# domain/
> L2 | 父级: /CLAUDE.md

成员清单
appViewModel.ts: 应用根读模型，集中选中幼儿、精灵、最近记录、PK 对手和审核队列派生规则。
appState.ts: 应用级状态词汇，提供 SyncStatus 契约。
classroomBackup.ts: 课堂本地备份快照、导入预览、清空演示数据的结构化规则。
energyAssets.ts: 德育能量图标资产映射。
growthFeedback.ts: 全局成长反馈数据契约和短反馈文案规则。
ledgerAnalytics.ts: 成长流水统计与筛选规则。
mathPk.ts: 数学光路玩法的题目、结果和记录规则。
moralAgent.ts: 德育文本本地评估规则。
moralSpeakSession.ts: 儿童自助说成长状态、锁定、session 与审批目标判断。
organization.ts: 班级任务、课程轨道、UTC 周期窗口和组织态沉淀规则。
progression.ts: 幼儿 XP、等级、精灵成长状态和携带 operationId 的流水创建规则。
spiritAssets.ts: 精灵图像资产选择与预加载规则。
spiritVoice.ts: 精灵声音类型与选项规则。
virtueEnergy.ts: 德育分类、能量标签、颜色和可审批判断。

法则: domain Module 给 App 提供深 Interface；UI 不复制业务判断。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
