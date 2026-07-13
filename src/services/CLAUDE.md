# services/
> L2 | 父级: /src/CLAUDE.md

成员清单
classroomApi.ts: 本地课堂 HTTP Adapter，统一稳定 operationId 写重试、快照/语音请求、结构化错误和降级分类。

法则: UI 不直接拼接 API；错误码在服务边界解析，领域层只消费稳定语义。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
