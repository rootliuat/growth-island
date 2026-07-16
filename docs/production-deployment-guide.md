# 线上部署与发布指南

这份指南只覆盖当前试教版：一个课堂、一个 Node API 实例、一块持久磁盘。它不是多园所云平台方案。

## 1. 支持的拓扑

```text
目标白板 Chrome
  -> HTTPS + Basic Auth
  -> Nginx
       -> /assets 与 index.html: /opt/growth-island/dist
       -> /api: 127.0.0.1:5174
  -> 单实例 Node API
  -> /var/lib/growth-island/classroom.json + backups/
  -> Tencent ASR / DeepSeek（失败时规则降级）
```

必须坚持单 API 实例。当前写事务队列只在一个 Node 进程内串行，多实例会破坏课堂数据一致性。Vercel、Netlify 等无状态函数文件系统不能承载当前课堂数据库。

## 2. 主机准备

1. 安装 Node 22、Nginx 和证书工具。
2. 创建 `growth-island` 系统用户以及 `/opt/growth-island`、`/var/lib/growth-island`、`/etc/growth-island`。
3. 将仓库部署到 `/opt/growth-island`，执行 `npm ci && npm run build`。
4. 把 `deploy/runtime.env.example` 复制为 `/etc/growth-island/runtime.env`，填入腾讯和 DeepSeek 凭据，并把 `RELEASE_VERSION` 写成部署 commit SHA。
5. 安装 `deploy/growth-island.service`，确认 Node 仅监听 `127.0.0.1:5174`。
6. 根据正式域名和证书修改 `deploy/nginx.conf`，创建 `/etc/nginx/growth-island.htpasswd` 后启用站点。

Provider 密钥只存在于 root 可读的环境文件中，不得写入 Vite 环境、浏览器、截图或 QA 报告。

## 3. 线上边界

- 浏览器默认使用同源 `/api`；Nginx 负责反向代理，不公开 5174。
- HTTPS 与 `Permissions-Policy: microphone=(self)` 是真实麦克风前提。
- Nginx 请求体上限为 5MB，覆盖腾讯 3MB 原始音频经 base64 后的 JSON；Node 使用同一 5MB 上限。
- Nginx Provider 读取超时为 15 秒；腾讯和 DeepSeek 应保持 12 秒应用超时，让服务端先返回结构化降级结果。
- `index.html` 不缓存；哈希 JS/CSS 长缓存；地图图片缓存七天并可重新验证。
- Basic Auth 是当前公网试教的最低访问保护。正式多园所产品必须另建账号、权限和租户隔离，不能复用此模板冒充完整鉴权。

## 4. 自动发布前检查

```bash
npm run qa:release:auto
```

该命令依次执行 Vitest、生产构建、生产预览 smoke 和快速课堂浏览器 QA。软件渲染结果只能证明功能、资源、清晰度和相对回归，不能证明目标白板达到 45 FPS。

部署后检查：

```bash
curl -u "$CLASSROOM_USER:$CLASSROOM_PASSWORD" https://growth-island.example.com/api/health
```

必须看到 `classroom.available=true`、`providers.speech.name=tencent`、`providers.speech.configured=true` 和当前 `releaseVersion`。`classroom.status=recovered` 表示从滚动快照恢复，应立即导出课堂备份并检查磁盘。

## 5. 目标白板发布门禁

在目标白板所在 Windows 主机运行，用户名和密码只通过进程环境传入：

```bash
REAL_MIC_BASE_URL=https://growth-island.example.com \
REAL_MIC_HTTP_USERNAME="$CLASSROOM_USER" \
REAL_MIC_HTTP_PASSWORD="$CLASSROOM_PASSWORD" \
REAL_MIC_TARGET_COUNT=3 npm run qa:real-mic

REAL_MIC_BASE_URL=https://growth-island.example.com \
REAL_MIC_HTTP_USERNAME="$CLASSROOM_USER" \
REAL_MIC_HTTP_PASSWORD="$CLASSROOM_PASSWORD" \
REAL_MIC_TARGET_COUNT=10 npm run qa:real-mic
```

脚本自动记录生产冷启动、WebGL renderer、设备像素比、wheel/drag FPS 与渲染倍率，然后等待真实课堂操作。脚本不会替浏览器预先授予麦克风权限，首位孩子必须在目标白板真实完成权限授权。只有权限最终为 `granted`、原分辨率下 wheel 和 drag 均不低于 45 FPS、腾讯 ASR 真实启用、3/3 与 10/10 完成、十人首次识别至少 9 次、每次 ASR 不超过 12 秒、不同孩子每人恰好一条账本记录时才返回成功。

报告位于 `qa-artifacts/latest/real-mic-report.json`，不含音频、凭据或完整转写。3 人和 10 人报告应分别归档，不能让第二次覆盖成为唯一证据。

## 6. 恢复与回滚

- 发布前导出课堂备份，并复制 `/var/lib/growth-island`。
- 代码回滚只切换 `/opt/growth-island` 的发布目录并重启服务，不覆盖课堂数据目录。
- 强杀 Node 后重启，确认最后一次已确认记录仍在；主文件损坏时确认 health 为 `recovered`。
- 没有有效快照时保持 `classroom_degraded`，禁止用演示数据覆盖损坏课堂数据。
- 写入失败或数据权威不确定时停止新增记录，先恢复服务或导出浏览器本机备份。
