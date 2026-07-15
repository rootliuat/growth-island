# server/
> L2 | 父级: /tests/CLAUDE.md

成员清单
beihaiApi.test.ts: 课堂 API 业务保护测试，覆盖 ledger、撤销、德育复核入账和教师显式修正。
classroomCrashRecovery.test.ts: 课堂进程级恢复验收，覆盖 SIGKILL 后重启与主文件损坏后恢复最后提交。
classroomRecoveryApi.test.ts: 课堂恢复 HTTP 契约测试，覆盖 degraded health、结构化 503 和独立 ASR 可用性。
classroomSnapshotFile.test.mjs: 课堂文件持久化 Interface 测试，覆盖 schema、fsync 失败、20 份轮转、最高 revision 恢复和 degraded。
classroomStore.test.mjs: 课堂数据事务 Interface 测试，保护原子失败、队列恢复、幂等冲突和持久化。
providerContract.test.mjs: Provider 配置预检与结构化语音错误 Interface 测试，不访问外网。
providerStability.test.ts: Provider 超时、降级、语音 mock、评估幂等预检与并发写一致性测试。

法则: 每个测试进程使用独立临时数据库；外部 Provider 必须本地伪造且时序可控。

变更日志
2026-07-12: 新增 classroom-store Interface 回归，锁定原子失败与事务队列恢复。
2026-07-13: 新增课堂文件快照恢复与耐久失败回归。
2026-07-15: 轮转测试保留真实 fsync，并使用 15 秒单测预算容纳 CI 共享磁盘延迟。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
