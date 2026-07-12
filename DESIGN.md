---
name: "北海成长岛"
description: "幼儿自助说成长、精灵领取德育能量的沿海课堂游戏 HUD。"
colors:
  deep-sea: "#174C5A"
  lagoon: "#2D9FB2"
  foam: "#87D8D0"
  shell-panel: "#FFF8EA"
  cream: "#FFFDF4"
  warm-sand: "#F4D99B"
  xp-gold: "#F6B352"
  coral-action: "#FF7A59"
  leaf-success: "#3B7D53"
  soft-border: "#D6B16A"
  muted-text: "#5F746D"
  danger: "#D95F55"
typography:
  display:
    fontFamily: "Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif"
    fontSize: "22px"
    fontWeight: 950
    lineHeight: 1.08
    letterSpacing: "0"
  headline:
    fontFamily: "Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif"
    fontSize: "18px"
    fontWeight: 950
    lineHeight: 1.16
    letterSpacing: "0"
  title:
    fontFamily: "Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif"
    fontSize: "16px"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "0"
  body:
    fontFamily: "Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "0"
  label:
    fontFamily: "Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif"
    fontSize: "12px"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0"
rounded:
  tight: "12px"
  control: "14px"
  card: "18px"
  panel: "20px"
  map: "30px"
  pill: "999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "10px"
  md: "12px"
  lg: "16px"
  xl: "22px"
  dock-safe: "96px"
components:
  button-primary:
    backgroundColor: "{colors.coral-action}"
    textColor: "{colors.shell-panel}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "44px"
  button-confirm:
    backgroundColor: "{colors.leaf-success}"
    textColor: "{colors.shell-panel}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.shell-panel}"
    textColor: "{colors.deep-sea}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
    height: "40px"
  chip-status:
    backgroundColor: "{colors.shell-panel}"
    textColor: "{colors.deep-sea}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  panel-shell:
    backgroundColor: "{colors.shell-panel}"
    textColor: "{colors.deep-sea}"
    rounded: "{rounded.panel}"
    padding: "16px"
---

# Design System: 北海成长岛

## 1. Overview

**Creative North Star: "海岛成长座舱"**

北海成长岛的界面是课堂白板上的沿海游戏座舱。主画面先服务孩子：看到全岛、找到自己的精灵、点麦克风说成长、看见能量进入精灵和成长树。老师工具存在，但默认靠边、收起、紧凑。

视觉系统要保留贝壳、浅海、沙地、成长树、光点和精灵的游戏感，同时保持课堂可用。它不是官网，也不是后台表格。大屏状态应少文字、强反馈、触控友好；老师侧可以更密，但仍使用同一套海岛 HUD 语言。

**Key Characteristics:**

- Map first: 地图和精灵是第一视觉，模块面板是辅助层。
- Child first: 自助说成长和领能量的入口优先于老师补记。
- Compact HUD: 顶栏、底部 dock、角落确认卡都要短、低、可扫。
- Tactile feedback: 按钮和卡片可以有内凹或低位阴影，但不能变成塑料玩具。
- Calm classroom: 动效表达状态，避免嘈杂打斗感。

## 2. Colors

整体色彩来自北海浅海、贝壳面板、暖沙和珊瑚按钮。海色负责导航和文字，贝壳色负责面板，珊瑚只给关键行动，金色只给 XP 和能量。

### Primary

- **Deep Sea Ink** (#174C5A): 主文字、顶栏、回岛按钮、重要导航选中态。
- **Lagoon HUD** (#2D9FB2): 地图热点、选中状态、进度提示和可交互高亮。
- **Coral Action** (#FF7A59): 孩子自助主动作，例如说成长、开始记录、确认触发能量。

### Secondary

- **Foam Light** (#87D8D0): 温和的能量光、选中背景、地图区域呼吸状态。
- **Leaf Success** (#3B7D53): 老师通过、成长确认、兑换成功等正向结果。
- **XP Gold** (#F6B352): XP、奖票、能量到账、荣誉和当前成长提示。

### Neutral

- **Shell Panel** (#FFF8EA): 游戏面板、卡片、老师角落确认卡的默认底色。
- **Cream Surface** (#FFFDF4): 卡片内部、列表行、输入面板和轻量容器。
- **Warm Sand** (#F4D99B): 地面、分隔、模块背景层和低优先级装饰。
- **Muted Sea Text** (#5F746D): 次级说明、时间、分类和非主动作。
- **Soft Border** (#D6B16A): 贝壳面板边框、低强度分隔和卡片描边。

### Named Rules

**The Coral Rarity Rule.** 珊瑚色只给当前最重要的孩子或老师动作，单屏不要同时出现多个珊瑚主按钮。

**The XP Gold Rule.** 金色表达奖励、能量、票券和荣誉，不作为普通导航色。

**The No Purple Gradient Rule.** 不使用紫蓝渐变作为品牌背景或模块头图。

## 3. Typography

**Display Font:** Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif
**Body Font:** Microsoft YaHei, PingFang SC, Noto Sans CJK SC, sans-serif
**Label/Mono Font:** 同一无衬线字体栈

**Character:** 字体系统服务白板可读性。层级来自字号、字重和空间，不靠夸张 display 字体。

### Hierarchy

- **Display** (950, 22px, 1.08): 仅用于应用名、模块主标题或当前孩子大名牌。
- **Headline** (950, 18px, 1.16): 模块标题、面板标题、老师记录港标题。
- **Title** (900, 16px, 1.2): 卡片标题、列表行主名、确认卡主信息。
- **Body** (700, 14px, 1.45): 老师端说明、记录原因、表单内容。长文本限制在 65-75ch。
- **Label** (900, 12px, 1): chip、状态、按钮短标签和 dock 文案。

### Named Rules

**The Whiteboard Scale Rule.** 真实产品界面不要用 36-48px 大标题，除非是一次性启动页。主界面标题通常在 18-24px。

**The Short Copy Rule.** 孩子端常驻文字只保留名词和动作短词，例如 说成长、领能量、小屋、回岛。

## 4. Elevation

系统使用混合层级：贝壳面板靠边框和暖色底区分，浮动 HUD 和地图容器使用浅阴影。静态列表和老师工具应更平，只有地图、dock、角落卡、当前选中项可以有更强层级。

### Shadow Vocabulary

- **Map Lift** (`0 26px 80px rgba(4, 20, 29, 0.34)`): 全岛地图外壳，只用于主地图容器。
- **Panel Lift** (`0 16px 34px rgba(23, 76, 90, 0.09)`): 模块面板、老师记录港、抽取台、商店等主要容器。
- **Soft HUD Lift** (`0 10px 26px rgba(20, 28, 25, 0.055)`): 次级面板、列表、状态栏。
- **Inset Shell Press** (`inset 0 -3px 0 rgba(214, 177, 106, 0.16)`): 可点击贝壳卡和模板按钮。

### Named Rules

**The Flat Teacher Tool Rule.** 老师工具可以清楚，但不要堆大阴影。选中态优先用边框、底色和 outline。

**The Motion Shows State Rule.** 动效用于录音、识别、能量到账、当前孩子和成功反馈，不做纯装饰入场动画。

## 5. Components

### Buttons

- **Shape:** 普通按钮使用 14px radius，chip 按钮使用 999px。卡片内按钮最小高度 40px，主动作尽量 44px。
- **Primary:** 珊瑚底、贝壳白字，用于说成长、开始、生成建议等当前关键动作。
- **Confirm:** 叶绿底、贝壳白字，用于通过、确认、完成。
- **Secondary:** 贝壳底、深海字、暖沙边框，用于回岛、稍后、取消、查看小屋。
- **Hover / Focus:** hover 只轻微上移或加深边框。focus-visible 使用金色或浅海 outline，至少 3px。

### Chips

- **Style:** 999px pill，短文字，深海字。状态 chip 不超过 13px。
- **State:** 当前孩子、同步状态、等级、XP、待确认数量都用 chip 表达。不要把 chip 写成长句。

### Cards / Containers

- **Corner Style:** 卡片 18px，面板 20px，地图 30px。避免 32px 以上的普通卡片圆角。
- **Background:** 默认 shell 或 cream。老师工具用 shell 面板，孩子主屏用地图和精灵视觉承载。
- **Shadow Strategy:** 主地图可以有明显 lift，模块卡片使用 Panel Lift 或 inset press，列表行默认平。
- **Border:** 暖沙半透明边框是默认分隔。危险或负向状态使用珊瑚或 danger，但必须克制。
- **Internal Padding:** 紧凑面板 12px，标准面板 16px，大地图外壳 0-16px。

### Inputs / Fields

- **Style:** 贝壳或 cream 底，暖沙边框，14px radius。老师端 textarea 可以更密，但不能像后台表格。
- **Focus:** 金色或浅海 outline，outline-offset 3px。
- **Error / Disabled:** 错误用 danger 边框和短文案。禁用按钮降饱和并保留可见边界。

### Navigation

- **Top HUD:** 18-24px 应用名，状态 chip 紧跟，不放大标题和副标题。
- **Bottom Dock:** 孩子自助入口在最左侧，主 dock 放孩子可见或课堂活动，老师工具收在掌舵抽屉。
- **Module Command Bar:** 非首页模块使用 44-56px 紧凑命令条，包含场景名、当前孩子、奖励语义和回岛按钮。
- **Mobile Treatment:** 底部 dock 保留 96px safe area，面板单列，横向模板按钮允许滚动。

### Signature Component: Moral Self-Service Overlay

孩子点精灵后，主画面进入 ready、listening、recognizing、pendingReview、success 或 error。状态必须通过麦克风、声波、贝壳、精灵气泡和能量反馈表达。孩子端不常驻显示置信度、AI 判断过程或完整文本。

### Signature Component: Teacher Review Corner Card

老师确认卡是角落工具，不是主流程面板。默认显示能量结果、孩子名、通过、改、稍后。详情放在 details 内，置信度和完整文本只给老师看。

## 6. Do's and Don'ts

### Do:

- **Do** 让地图和精灵成为首页第一视觉。
- **Do** 把 说成长 和 领能量 放在孩子能直接触发的位置。
- **Do** 把老师记录港、贝壳记录台、账本、岛务和设置收进老师工具。
- **Do** 使用 #174C5A、#2D9FB2、#87D8D0、#FFF8EA、#F4D99B、#F6B352、#FF7A59、#3B7D53 这组海岛色。
- **Do** 用金色光点、能量槽、精灵反应和成长树点亮表达 XP 结果。
- **Do** 保持白板触控目标接近或大于 44px。
- **Do** 给 reduced motion 用户关闭循环和冲击型动画。

### Don't:

- **Don't** 做成 SaaS 后台或数据管理系统。
- **Don't** 做成老师积分表套一层可爱皮肤。
- **Don't** 使用 AI 生成感的大卡片、大标题、重复副标题布局。
- **Don't** 使用紫蓝渐变、过度玻璃拟态、塑料质感按钮。
- **Don't** 使用以打斗、PK、攻击反馈为主的游戏 UI。
- **Don't** 让孩子阅读大量说明文字的流程页。
- **Don't** 把老师操作放在首页主视觉中心的课堂管理台。
- **Don't** 在普通卡片上使用 32px 以上圆角、厚侧边彩条、渐变文字或无意义装饰图标。
