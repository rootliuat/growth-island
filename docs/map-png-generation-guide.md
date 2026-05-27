# 成长岛地图 PNG 生产指南

这份文档用于在 WSL 或其他批量生图环境里生产地图 PNG。先不要一次性生成全部资产，先做小批量风格验证。

## 资产落盘位置

代码预留路径使用 Vite `public` 目录，对外访问路径是 `/assets/map/...`。

在 WSL 下先建目录：

```bash
cd /mnt/f/TestCode/Points_game
mkdir -p public/assets/map/{ocean,island,regions,landmarks,homes,decorations,paths,labels,effects}
```

示例：

```text
public/assets/map/ocean/ocean-base.png
public/assets/map/island/island-surface.png
public/assets/map/regions/region-growth-plaza.png
public/assets/map/landmarks/landmark-growth-tree.png
public/assets/map/homes/home-cottage-lv3.png
public/assets/map/decorations/decor-tree-cherry.png
```

## 生产顺序

不要直接做完整批量。建议按下面批次推进。

### Batch 0：风格验证 6 张

先生成这 6 张，确认“动物森友会式 2.5D 家园 + 马卡龙 + 原创成长岛”方向成立：

| 资产 ID | 目的 |
| --- | --- |
| `island-surface` | 验证地块厚度、透视、草地质感 |
| `landmark-growth-tree` | 验证视觉中心和魔法成长感 |
| `home-cottage-lv3` | 验证普通小屋风格 |
| `home-shell-lv3` | 验证特色小屋风格 |
| `decor-tree-cherry` | 验证树木和花树质量 |
| `decor-fence-pink` | 验证低龄友好生活感 |

这 6 张通过后，再继续后面批次。

### Batch 1：地图基础层

`ocean-base`、`ocean-wave-tile`、`ocean-sparkle`、`island-shadow`、`island-side`、`island-surface`、`island-shore-foam`、`path-main-overlay`。

### Batch 2：七大区域和大建筑

七个 `region-*`，再做 `landmark-growth-tree`、`landmark-math-arena`、`landmark-old-street-gate`、`landmark-pearl-dock`、`landmark-shell-pier`、`landmark-mangrove-bridge`。

### Batch 3：小屋

6 种 homeType，每种 `lv1/lv3/lv5/lv8`，共 24 张。

### Batch 4：装饰、标签、特效

装饰物、空白路牌、等级徽章、XP 光点、升级光环、选中提示。

## 通用 Prompt 模板

### 大地图层

```text
Create an original 2.5D isometric casual life-sim game map asset for a kindergarten fantasy growth island.
Asset id: [asset_id].
Subject: [asset_description].
Style: Animal-Crossing-inspired cozy 2.5D diorama feel, but fully original, no copied IP, macaron color palette, rounded soft forms, clean premium casual game art, child-friendly but not cheap.
Camera: consistent isometric / 3/4 top-down view, soft light from upper left, gentle shadow to lower right.
Composition: [size] PNG, asset aligned for a game map layer, no text, no UI, no logo, no watermark.
Background: [opaque ocean background / transparent overlay].
Quality: crisp readable silhouette, soft hand-painted texture, polished game asset, no messy edges.
Avoid: realistic render, dark fantasy, cheap clip art, flat PPT illustration, commercial IP similarity, checkerboard background.
```

### 小屋/地标/装饰透明 PNG

```text
Create one original transparent PNG game asset for a 2.5D isometric kindergarten fantasy growth island.
Asset id: [asset_id].
Subject: [asset_description].
Style: cozy premium casual life-sim game asset, macaron colors, rounded forms, soft toy-like volume, refined details, child-friendly, original.
Camera: isometric / 3/4 top-down view, front facing slightly downward or lower-right, same perspective as a cozy island home map.
Lighting: soft light from upper left, gentle contact shadow included only under the object.
Composition: single isolated object, centered, generous safe margin, [size].
Background: perfectly flat chroma-key background [key_color] for later alpha removal. Do not use [key_color] inside the object.
Constraints: no text, no logo, no watermark, no UI, no fake checkerboard, no commercial IP, no scary or weapon-like details.
```

### 特效透明 PNG

```text
Create one soft magical VFX sprite for a 2.5D kindergarten fantasy growth island game.
Asset id: [asset_id].
Subject: [asset_description].
Style: gentle premium casual game effect, soft glow, stars, leaves, crystal glints, tiny math sparks if relevant.
Composition: isolated centered effect, transparent-ready, [size], clean edges.
Background: perfectly flat chroma-key background [key_color] for alpha removal.
Constraints: no text, no numbers baked in, no logo, no explosive battle feeling, no fake checkerboard.
```

## 透明 PNG 检查

现在不做自动抠图。源图可以先放到：

```text
assets/generated/map-workbench/
```

你手动抠图之后，再把最终 PNG 放到：

```text
public/assets/map/...
```

手动抠完后用 Python 快速检查 alpha：

```bash
python - <<'PY'
from pathlib import Path
from PIL import Image

for path in Path("public/assets/map").rglob("*.png"):
    img = Image.open(path)
    has_alpha = img.mode in ("RGBA", "LA")
    corner_alpha = None
    if has_alpha:
        corner_alpha = img.convert("RGBA").getpixel((0, 0))[3]
    print(path, img.size, img.mode, "alpha=", has_alpha, "corner=", corner_alpha)
PY
```

最终验收要求：

- 透明资产必须是 `RGBA` 或 `LA`。
- 透明资产左上角 alpha 应该是 `0` 或接近 `0`。
- `ocean-base` 允许不透明。
- 不允许最终图出现棋盘格背景。

## 最小可用交付

第一轮给开发接入时，至少需要：

- `island-surface.png`
- `island-side.png`
- `island-shadow.png`
- `path-main-overlay.png`
- 7 张 `region-*.png`
- 6 张关键地标
- 每种 homeType 至少 `lv3` 一张
- 10-15 个高频装饰物

这批够先把代码绘制地图替换成图片资产地图。完整小屋等级、标签、特效可以第二轮补齐。
