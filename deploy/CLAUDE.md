# deploy/
> L2 | 父级: /CLAUDE.md

成员清单
nginx.conf: HTTPS 静态站点与同源 API 反向代理模板，承担课堂访问保护、缓存和 Provider 超时边界。
growth-island.service: 单实例 Node API 的 systemd 模板，只监听回环并把课堂数据写入持久目录。
runtime.env.example: 服务端运行变量模板，列出持久化、腾讯、DeepSeek 和 12 秒超时契约但不携带凭据。

法则: 线上首版只允许单 API 实例；TLS 与访问控制在反向代理终止；课堂数据必须落持久磁盘。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
