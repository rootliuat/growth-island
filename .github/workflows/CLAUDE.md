# workflows/
> L2 | 父级: /.github/CLAUDE.md

成员清单
ci.yml: Node 22 基础 CI，验证锁文件、测试、生产构建与高危依赖审计。
classroom-qa.yml: 手动/每日 mock Provider 课堂 QA，运行浏览器试教与生产 preview，并归档 14 天截图报告。

法则: validate 是唯一分支保护契约；课堂 QA 独立运行、无密钥、失败不阻断普通提交。

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
