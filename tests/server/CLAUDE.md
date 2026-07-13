# server/
> L2 | 父级: /tests/CLAUDE.md

成员清单
beihaiApi.test.ts: 课堂 API 业务保护测试，覆盖 ledger、撤销、德育复核入账和教师显式修正。
classroomStore.test.mjs: 课堂数据事务 Interface 测试，保护原子失败、队列恢复和持久化。
providerContract.test.mjs: Provider 配置预检与结构化语音错误 Interface 测试，不访问外网。
providerStability.test.ts: Provider 超时、降级、语音 mock 与评估并发写一致性测试。

法则: 每个测试进程使用独立临时数据库；外部 Provider 必须本地伪造且时序可控。

变更日志
2026-07-12: 新增 classroom-store Interface 回归，锁定原子失败与事务队列恢复。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
