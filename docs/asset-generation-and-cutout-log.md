# 生图与抠图工作记录

记录日期：2026-05-28

这份文档记录 Growth Island 近期做过的地图资产生图、V4 地图抠图、BiRefNet 模型抠图、精灵透明 PNG 替换，以及 PixiJS 缩放采样漏边修复。

## 环境

- WSL2 路径：`/root/my-project/Points_game`
- Windows 项目路径：`F:\TestCode\Points_game`
- Windows 路径在 WSL 中对应：`/mnt/f/TestCode/Points_game`
- GPU：NVIDIA GeForce RTX 4070 Ti SUPER 16GB，WSL2 中 `nvidia-smi` 可用
- 抠图虚拟环境：`.venv-birefnet`
- 推理环境大小：约 `5.3G`
- BiRefNet 模型缓存：`~/.cache/huggingface/hub/models--ZhengPeng7--BiRefNet_dynamic-matting`，约 `425M`

## 使用的抠图模型

首选模型：

```text
ZhengPeng7/BiRefNet_dynamic-matting
```

用途：

- 地图 V4 分层资产批量抠图
- 精灵图片批量去背景
- 适配不同尺寸，不强制固定 1024
- 对插画、小物件、复杂边缘更稳

本地脚本：

```text
scripts/birefnet_cutout.py
scripts/white_bg_cutout.py
```

`birefnet_cutout.py` 使用 HuggingFace `transformers` 加载 BiRefNet，CUDA FP16 推理，输出 RGBA PNG。

`white_bg_cutout.py` 用于白底或纯色底素材，采用 color-key / alpha-from-white 思路，避免模型误删浅色线条。

## 地图生图记录

### V3 场景参考图

V3 方向用于丰富地图场景参考，但后续判断塑料感偏强，没有作为最终生产方向。

| Batch | 内容 | Manifest | 图片数量 | 输出目录 |
| --- | --- | --- | ---: | --- |
| batch5 | 高房子、小院、围栏、花草、桌椅等家园场景 | `assets/generated/v3/map-prompts-batch5.json` | 12 | `assets/generated/v3/batch5/` |
| batch6 | 区域邻里场景 | `assets/generated/v3/map-prompts-batch6.json` | 8 | `assets/generated/v3/batch6/` |
| batch7 | 围栏、路径、花带、长条连接件 | `assets/generated/v3/map-prompts-batch7.json` | 10 | `assets/generated/v3/batch7/` |
| batch8 | 功能地标场景 | `assets/generated/v3/map-prompts-batch8.json` | 8 | `assets/generated/v3/batch8/` |

V3 合计：`38` 张场景图。

### V4 生产资产

V4 改为高级马卡龙质感：

- 低饱和、高明度
- 哑光材质
- 手绘感 / gouache / paper-clay 质感
- 柔和边缘高光
- 轻微环境遮蔽
- 避免塑料 3D 玩具感、亮面反光、树脂感、产品棚拍感

| Batch | 内容 | Manifest | 原图数量 | Cutout 数量 |
| --- | --- | --- | ---: | ---: |
| batch9 | 单体分层素材 | `assets/generated/v4/map-prompts-batch9-v4.json` | 64 | 64 |
| batch10 | 场景分层素材 | `assets/generated/v4/map-prompts-batch10-v4.json` | 80 | 80 |
| batch11 | 全岛底层、海水、岛屿、区域地块、路径 | `assets/generated/v4/map-prompts-batch11-v4.json` | 18 | 18 |
| batch12 | 成长树、数学竞技场、排行榜、ASR、老师复核、北海元素 | `assets/generated/v4/map-prompts-batch12-v4.json` | 18 | 18 |
| batch13 | 6 类房屋 Lv1/Lv3/Lv5/Lv8 与颜色变体 | `assets/generated/v4/map-prompts-batch13-v4.json` | 30 | 30 |
| batch14 | XP、选中、升级、扣分、标签、徽章、心情图标 | `assets/generated/v4/map-prompts-batch14-v4.json` | 16 | 16 |
| batch15 | 生产修补包，小元素、连接件、填充件、入口提示 | `assets/generated/v4/map-prompts-batch15-v4.json` | 30 | 30 |

V4 合计：`256` 张原图，`256` 张最终 cutout。

主要路径：

```text
assets/generated/v4/batch9/
assets/generated/v4/batch10/
assets/generated/v4/batch11/
assets/generated/v4/batch12/
assets/generated/v4/batch13/
assets/generated/v4/batch14/
assets/generated/v4/batch15/
assets/generated/v4/cutout-birefnet-dynamic/
```

## V4 地图抠图记录

V4 地图最终 cutout 目录：

```text
assets/generated/v4/cutout-birefnet-dynamic/
```

批次数量：

| Batch | Cutout PNG |
| --- | ---: |
| batch9 | 64 |
| batch10 | 80 |
| batch11 | 18 |
| batch12 | 18 |
| batch13 | 30 |
| batch14 | 16 |
| batch15 | 30 |

工程 QA：

```text
assets/generated/v4/cutout-birefnet-dynamic/ENGINEERING_QA.md
```

QA 结论：

```text
Total PNG files: 256
Expected total: 256
PNG readable failures: 0
Missing manifest cutout files: 0
Files without alpha, excluding v4-ocean-base-tile.png: 0
Files with non-transparent corners, excluding v4-ocean-base-tile.png: 0
Size anomaly files: 0
Extra cutout files not referenced by manifests: 0
V4 cutout assets are ready for PixiJS integration.
```

### V4 特殊修复

修复清单：

```text
assets/generated/v4/cutout-review/redo-cutout-list.json
```

修复过的 3 个 batch11 资产：

| 资产 | 处理 |
| --- | --- |
| `v4-ocean-base-tile.png` | 海水底图允许不透明，复制原图并转 RGBA alpha=255 |
| `v4-ocean-wave-overlay.png` | 用白底 color-key / alpha-from-white，保留浅蓝水波线和泡泡 |
| `v4-region-pearl-bay-pad.png` | 只去外部白底，保留内部浅蓝水湾、平台、码头和装饰 |

`batch14`、`batch15` 曾用白底抠图流程重做过，旧版本备份：

```text
assets/generated/v4/cutout-birefnet-dynamic-backup-20260527-065520/
```

`batch14/v4-label-speech-bubble.png` 单独修过阴影和白底问题。

## 精灵模型抠图记录

精灵原始目录：

```text
F:\TestCode\Points_game\assets\generated\spirits
```

WSL 路径：

```text
/mnt/f/TestCode/Points_game/assets/generated/spirits
```

### 41 到 50 整组抠图

处理范围：

```text
41-yueying-hu-jingling
42-xingyu-lu-jingling
43-linglan-tu-jingling
44-yunwei-xiaoxiongmao-jingling
45-yinyue-mao-jingling
46-qingyu-maotouying-jingling
47-hupo-songshu-jingling
48-xiguang-shuita-jingling
49-shuangye-langzai-jingling
50-hualu-ciwei-jingling
```

每组 11 张，合计 `110` 张。先输出到：

```text
F:\TestCode\Points_game\assets\generated\spirits-cutout-birefnet-dynamic
```

然后删除原 `spirits` 下 41 到 50 的原图目录，并替换成扣好的同名目录。

QA 文件：

```text
assets/generated/spirits-cutout-birefnet-dynamic/QA_41_50.json
```

QA 结果：

```text
expected_total: 110
output_total: 110
missing: []
unreadable: []
no_alpha: []
opaque_corners: []
empty_alpha: []
size_mismatch: []
```

说明：41 到 50 做过 Alpha 抠图和目录替换，但没有做完整的 PixiJS 洋红 RGB 边缘专项清洗。后续如果它们进入主地图显示，应再做一次边缘污染复核。

### 26、28、31 补抠并替换

处理过的目录：

```text
F:\TestCode\Points_game\assets\generated\spirits\26-shanhu-tuling
F:\TestCode\Points_game\assets\generated\spirits\28-yunduo-yangling
F:\TestCode\Points_game\assets\generated\spirits\31-zhuyin-xiongmaoling
```

处理细节：

- `26-shanhu-tuling`：原目录有 6 张 RGB 无 Alpha，补扣 `egg-2.png`、`egg-3.png`、`lv3.png`、`lv4.png`、`lv5.png`、`lv6.png`，再整组替换回原目录。
- `28-yunduo-yangling`：11 张全部是 RGB 无 Alpha，整组重新抠图并替换。
- `31-zhuyin-xiongmaoling`：11 张全部是 RGB 无 Alpha，整组重新抠图并替换。

替换后校验：

```text
26-shanhu-tuling count=11 unreadable=0 no_alpha=0 opaque_corners=0
28-yunduo-yangling count=11 unreadable=0 no_alpha=0 opaque_corners=0
31-zhuyin-xiongmaoling count=11 unreadable=0 no_alpha=0 opaque_corners=0
```

## PixiJS 边缘 RGB 污染修复

问题：

PNG 的 Alpha 已经是透明，但透明像素里的 RGB 仍保留洋红背景色。PixiJS 缩放、线性采样或 mip/filter 处理时，边缘可能漏出洋红色。

处理方式：

- 保留原 Alpha 蒙版。
- 识别透明和半透明区域中的洋红 RGB 污染。
- 用最近的有效角色边缘颜色扩展填充污染区域 RGB。
- 文件名和原路径不变，原路径覆盖。

处理数量：`29` 张。

处理报告：

```text
assets/generated/spirits-edgefix-report-20260527-201048.json
```

备份目录：

```text
assets/generated/spirits-edgefix-backup-20260527-201048/
```

最终校验：

```text
checked 29
missing 0
unreadable 0
no_alpha 0
opaque_corners 0
empty_alpha 0
magenta_transparent 0
magenta_semitrans 0
31-zhuyin-xiongmaoling/egg-1.png: RGBA, alpha 0-255, magenta residual 0
```

处理过的文件：

```text
24-shuangye-huling/lv4.png
24-shuangye-huling/lv7.png
26-shanhu-tuling/egg-2.png
26-shanhu-tuling/egg-3.png
26-shanhu-tuling/lv3.png
26-shanhu-tuling/lv4.png
26-shanhu-tuling/lv5.png
26-shanhu-tuling/lv6.png
28-yunduo-yangling/egg-4.png
28-yunduo-yangling/lv2.png
28-yunduo-yangling/lv3.png
28-yunduo-yangling/lv4.png
28-yunduo-yangling/lv5.png
28-yunduo-yangling/lv6.png
28-yunduo-yangling/lv7.png
28-yunduo-yangling/lv8.png
31-zhuyin-xiongmaoling/egg-1.png
31-zhuyin-xiongmaoling/egg-2.png
31-zhuyin-xiongmaoling/egg-3.png
31-zhuyin-xiongmaoling/egg-4.png
31-zhuyin-xiongmaoling/lv2.png
31-zhuyin-xiongmaoling/lv3.png
31-zhuyin-xiongmaoling/lv4.png
31-zhuyin-xiongmaoling/lv5.png
31-zhuyin-xiongmaoling/lv6.png
31-zhuyin-xiongmaoling/lv7.png
31-zhuyin-xiongmaoling/lv8.png
40-tongmeng-shuling/egg-4.png
40-tongmeng-shuling/lv2.png
```

## 当前可用结论

- V4 地图 cutout 已完成：`256/256`，可进入 PixiJS 接入。
- 精灵 26、28、31 已完成补抠和原路径替换。
- 精灵 24、26、28、31、40 中指定 29 张已完成 PixiJS 边缘污染修复。
- 精灵 41 到 50 已完成 BiRefNet 抠图和原路径替换，但若用于主地图，建议再做一次 RGB 边缘污染专项 QA。

## 2026-05-28 WSL2 本地预览注意

P0 收口时发现当前 shell 环境带有 `HTTP_PROXY=http://172.20.128.1:7897`。在 WSL 中直接请求 `localhost:5173` 可能被代理到 Windows 侧旧 dev server，导致看到旧版 `EffectLayer` 和旧红树林木板配置。

后续预览以 WSL IP 为准，例如：

```text
http://172.20.133.79:5173/?wsl=1
```

前端默认 API 地址已改为跟随当前页面 hostname 的 `:5174`。也就是说，从 `172.20.133.79:5173` 打开的页面会请求 `172.20.133.79:5174`，避免 Windows 浏览器误连本机 `localhost:5174`。

## 2026-05-29 P6 首屏资产轻量化

P6 性能稳定先不改 PixiJS 地图结构，也不继续生图。当前只做两处低风险加载策略调整：

- 首页精灵图不再全班一次性并发预加载。当前选中孩子立即加载，其余孩子按 rank 以小批次后台加载。
- PixiJS `decoration` layer 的非关键装饰 PNG 延迟加载，岛体、区域底图、主路径、小屋、地标和交互入口仍保持首屏加载。

Playwright 7 秒窗口内请求基线对比：

```text
优化前：totalPng 187, spirit 115, map 72
精灵分批后：totalPng 106, spirit 34, map 72
精灵分批 + 装饰延迟后：totalPng 95, spirit 34, map 61
```

验证截图：`/tmp/p6-home-7s.png`。首页地图 canvas 正常，区域、道路、小屋、地标和 fallback 精灵可见，无 console error 或失败请求。

## 2026-05-29 P6.2 长时间运行资产限流

P6.2 继续沿用“不改地图结构、不继续生图”的边界，只调整精灵图后台预热策略。页面仍会立即加载当前选中孩子的精灵图，但后台不再持续把全班精灵图全部拉完；只预热少量优先对象：

- 班级排名前三名。
- 与当前选中家园位置接近的孩子。
- Lv.7 以上高等级孩子。

32 秒窗口对比：

```text
P6.1：totalPng 143, spirit 71, map 72
P6.2：totalPng 99, spirit 27, map 72
```

预期效果：长时间打开首页时，精灵 PNG 请求和解码压力不再随班级人数持续爬升；未预热孩子被点选后仍会即时加载对应精灵图，地图 fallback 仍保持可见。

补充交互验证：搜索并点选未预热的“团团”后，首页焦点切换成功，并产生新的精灵 PNG 请求；无失败请求或 console error。
