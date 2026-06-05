# 试教版课堂验收清单

适用版本：P10 试教版产品收口

目标：验证当前版本能拿到班级电子白板上完成一轮真实课堂试用。试教只看孩子和老师两类用户，不验证家长、评审、园所管理者、PDF、审批流、账号权限或云同步。

## 1. 课前准备

- 启动本地项目：`npm run dev`
- 打开首页，使用白板或触控大屏模式。
- 确认浏览器允许麦克风；没有真实麦克风时，只能用 QA hook 验证 UI 流程，不能证明真实 ASR 可用。
- 确认白板触摸、拖拽和缩放正常。
- 确认首页第一眼是成长岛地图，不是后台、表格或营销页。

## 2. 核心试教流程

按 3 名孩子试一轮，最后再按 10 名孩子跑节奏。

1. 孩子在地图或底部精灵队伍里找到自己的精灵。
2. 孩子点自己的精灵，画面聚焦到该精灵。
3. 孩子点麦克风，说一句具体成长。
4. 说话中只看见当前孩子、麦克风/声波和短状态，不出现后台判断文案。
5. 识别后老师确认卡出现，老师看孩子名、能量建议和操作按钮。
6. 老师点 `点亮`。
7. 孩子看到能量点亮精灵。
8. 画面回到全岛，下一位孩子自己选择精灵，不出现固定排队或自动指定下一位。

## 3. 异常流程

- 低置信或无效表达：孩子端只显示 `请老师帮忙`，不显示置信度、模型状态、原始判断或分数。
- 负向表达：不能直接入账扣分；老师需要 `修正`、`重说` 或 `跳过`。
- 活跃孩子说话、等待老师、已点亮期间，其他孩子误点地图或底部队伍时，当前孩子不被切走。
- 老师修正后，确认按钮恢复可用，最终只写入一条正向成长记录。

## 4. 通过标准

- 孩子能在 5 秒内理解：找自己、点精灵、点麦克风。
- 白板关键触摸目标可点，不出现遮挡、横向滚动或按钮文字挤压。
- active 状态只保留一套主状态：`准备说`、`正在说`、`贝壳在听`、`等老师`、`请老师帮忙`、`已点亮`。
- ready、listening、recognizing 阶段不显示重复能量板。
- pending 和 success 阶段能量提示紧凑，不抢老师确认卡和孩子名字。
- success 阶段不叠全局能量 toast；回岛后才提示 `下一位可以点精灵`。
- 儿童主界面不出现 `XP`、`AI建议`、`置信度`、`确认入账` 等后台词。
- 自助成长确认后只产生一条 ledger 记录，且包含老师确认信息。

## 5. 自动验收命令

```bash
git diff --check
node --check scripts/qa-visual.mjs
npm run build
npm run qa:visual
```

`npm run qa:visual` 通过标准：

- 33 checks
- 0 issues
- 0 warnings
- 报告路径：`qa-artifacts/latest/report.json`

## 6. 必看截图

首页和回岛：

- `qa-artifacts/latest/home-whiteboard.png`
- `qa-artifacts/latest/mobile-home-mobile.png`
- `qa-artifacts/latest/home-fallback-return-whiteboard.png`

孩子自助成长闭环：

- `qa-artifacts/latest/moral-speak-flow-ready-whiteboard.png`
- `qa-artifacts/latest/moral-speak-flow-recognizing-whiteboard.png`
- `qa-artifacts/latest/moral-speak-flow-pending-whiteboard.png`
- `qa-artifacts/latest/moral-speak-flow-whiteboard.png`
- `qa-artifacts/latest/moral-speak-flow-final-whiteboard.png`
- `qa-artifacts/latest/moral-speak-flow-mobile.png`
- `qa-artifacts/latest/moral-speak-flow-final-mobile.png`

课堂节奏和异常：

- `qa-artifacts/latest/classroom-touch-loop-whiteboard.png`
- `qa-artifacts/latest/moral-review-safety-whiteboard.png`
- `qa-artifacts/latest/moral-review-safety-mobile.png`

课堂活动回岛：

- `qa-artifacts/latest/roll-call-home-focus-whiteboard.png`
- `qa-artifacts/latest/math-arena-home-focus-whiteboard.png`
- `qa-artifacts/latest/teacher-flow-home-focus-whiteboard.png`

## 7. 试教记录模板

```text
日期：
班级：
设备：
参与孩子数：

孩子是否能自己找到精灵：
麦克风/识别是否顺：
老师确认是否够快：
能量反馈是否清楚：
下一位是否能自己接上：
误点/低置信/负向表达是否可控：
需要调整的词或按钮：
需要调整的布局：
是否达到可继续试教：
```

## 8. 当前明确不验收

- 家长端、评审端、园所管理者端。
- PDF 导出。
- 课程审批流。
- 账号、权限、云同步。
- 固定排队系统或自动指定下一位。
- 后台报表完整性。
