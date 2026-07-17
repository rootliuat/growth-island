# domain/
> L2 | 父级: /tests/CLAUDE.md

成员清单
appState.test.ts: 课堂权威恢复规则测试，拒绝迟到响应完成或降级 local/unavailable，并要求同 operationId 证据恢复。
classroomBackup.test.ts: 课堂快照备份与恢复规则测试，保护离线兜底不覆盖在线同步。
ledgerAnalytics.test.ts: 成长 ledger 分析测试，保护时间与类别筛选后的统计口径。
moralAgent.test.ts: 德育 Agent 分类与风险判断测试，保护说成长评估契约。
moralSpeakSession.test.ts: 儿童自助说成长状态机测试，保护 session、分阶段恢复、老师 fallback、重放锁、冻结审批载荷和摘要规则。
organization.test.ts: 班级/园所组织规则测试，保护组织数据派生和周期任务窗口。
progression.test.ts: 成长等级推进测试，保护 XP 到等级的计算。
virtueEnergy.test.ts: 七项能量映射测试，保护德育类别到能量槽的契约。

法则: 每个领域对象一组测试；测试只验证规则，不模拟浏览器。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
