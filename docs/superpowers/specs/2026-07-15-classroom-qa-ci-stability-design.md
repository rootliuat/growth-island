<!--
[INPUT]: 依赖 2026-07-15 远端 Classroom QA 报告、说成长会话状态机、动画触控契约与 Pixi 精灵浮动采样。
[OUTPUT]: 对外提供 CI 指针激活、QA 录音窗口、成功交接反馈与慢渲染动效门禁的最小修复设计。
[POS]: specs 的课堂 QA 稳定性补充规格，约束 runner 与说成长录音、反馈时序及首页动效测量的协同修复。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# Classroom QA CI Stability Design

## Goal

Make the remote Classroom QA prove the real pointer path without depending on Playwright locator stability, make the final “下一位” handoff survive stale success-state guard feedback, and keep the selected-spirit motion gate independent of software-renderer speed. Product layout, animation, copy, ledger, Provider, and classroom data contracts remain unchanged.

## Pointer activation

Before every animated listening-button activation, the runner moves the pointer outside the control, samples its center, moves into it, waits beyond the 180 ms hover transition, and samples the settled center again. It then sends a real mouse click at that coordinate. The report records whether the settled center still hit the button and whether exactly one recorder `stop()` followed; all moral-flow and ten-child classroom turns treat either failure as a functional issue.

This preserves current-layout size, overlap, center-hit, pointer dispatch, and callback evidence. It does not use force click, DOM click, keyboard substitution, or a longer locator timeout.

The synthetic wrong-child and geometry probes may exceed the product's 5.5-second automatic recording window on software-rendered CI. Development QA therefore requests a bounded 30-second recording window before the session starts. Production ignores this hook and keeps 5.5 seconds. The report also proves that no recorder stop occurred between entering listening and the pointer activation, so a future timeout regression cannot be misreported as a missed click.

## Slow-renderer motion gate

The selected spirit still needs to move through at least 3 pixels while visible. Sampling starts with the existing seven observations, then continues only when the threshold has not yet been reached, up to fifteen observations at the same 220 ms cadence. A healthy animation exits as soon as it proves the existing range; a stopped animation remains below the same threshold and fails after the bounded 3.3-second window.

This removes the fixed-window phase race seen at 7 FPS, where coherent positions moved from `-2.81` to `0` and back to `-2.74` but narrowly missed the threshold. It does not lower the threshold, alter the production Pixi ticker or animation curve, or convert a functional issue into a warning.

## Handoff feedback

Successful approval still returns to the full island after 2.4 seconds. The workflow resets the moral session first, then schedules the existing “下一位可以点精灵 / 孩子自己选择精灵继续” feedback for the next browser task. Any guard event produced by the old success DOM finishes first; the handoff message becomes the final idle-state feedback without changing guard behavior or allowing a stale click to select another child.

## Verification

- Unit tests and production build remain green.
- Two isolated ten-child loops pass with every settled center hit and every recorder stop flag true.
- Whiteboard and ultra home checks pass while preserving the 3-pixel selected-spirit motion threshold.
- The default local trial and production preview smoke pass.
- A manually dispatched full Classroom QA on `main` produces seven results, zero functional issues, an accepted asset report, a passing preview smoke, and uploaded artifacts.

## Rejected alternatives

- Synchronously updating `stateRef` during reset could let a click from stale success DOM select another child after the state becomes idle.
- Accepting keyboard activation or relaxing the handoff assertion would hide real whiteboard interaction failures.
- Increasing the production auto-stop would change classroom behavior merely to accommodate synthetic QA work; only the development hook may extend it.
- Lowering the motion threshold would weaken the stuck-animation gate; changing the production animation would make product behavior serve CI timing rather than classroom UX.
