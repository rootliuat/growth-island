# tests/
> L2 | 父级: /CLAUDE.md

成员清单
browserAdapters.test.ts: 浏览器录音与 localStorage Adapter 回归，保护腾讯音频格式和本地快照启动来源。
classroomApi.test.ts: HTTP Adapter 结构化错误回归，保护语音错误码与可重试语义。
domain/: 领域规则回归测试，覆盖 ledger、德育 Agent、组织、成长等级、能量和说成长 session。
server/: 本地 API 与 provider 稳定性测试，保护数据读写和外部服务兜底。

法则: 测试命名贴近被保护的领域对象；新增测试先进入对应子目录，不把浏览器 QA 混入 Vitest。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
