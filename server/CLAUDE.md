# server/
> L2 | 父级: /CLAUDE.md

成员清单
beihai-api.mjs: 薄 HTTP 入口，负责请求解析、路由、错误映射和进程启动。
classroom-providers.mjs: 课堂 Provider 深 Module，封装腾讯语音、DeepSeek、mock、超时与规则降级。
classroom-store.mjs: 课堂数据事务深 Module，独占 JSON 快照、串行事务和 ledger/review/profile 规则。
moral-agent.mjs: 德育文本本地规则引擎，在远端模型不可用时提供确定性评估。

法则: Provider 等待不持有数据库写锁；所有读改写串行提交；规则兜底必须确定可测。

变更日志
2026-07-12: 将单体 beihai-api 拆为薄 HTTP 入口、课堂数据事务深 Module 与课堂 Provider 深 Module。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
