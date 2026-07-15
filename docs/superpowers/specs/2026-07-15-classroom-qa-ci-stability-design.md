<!--
[INPUT]: 依赖 2026-07-15 远端 Classroom QA 报告、说成长会话状态机与动画触控契约。
[OUTPUT]: 对外提供 CI 指针激活与成功交接反馈竞态的最小修复设计。
[POS]: specs 的课堂 QA 稳定性补充规格，约束 runner 与说成长反馈时序的协同修复。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# Classroom QA CI Stability Design

## Goal

Make the remote Classroom QA prove the real pointer path without depending on Playwright locator stability, and make the final “下一位” handoff survive stale success-state guard feedback. Product layout, copy, ledger, Provider, and classroom data contracts remain unchanged.

## Pointer activation

Before every animated listening-button activation, the runner moves the pointer outside the control, samples its center, moves into it, waits beyond the 180 ms hover transition, and samples the settled center again. It then sends a real mouse click at that coordinate. The report records whether the settled center still hit the button and whether exactly one recorder `stop()` followed; all moral-flow and ten-child classroom turns treat either failure as a functional issue.

This preserves current-layout size, overlap, center-hit, pointer dispatch, and callback evidence. It does not use force click, DOM click, keyboard substitution, or a longer locator timeout.

## Handoff feedback

Successful approval still returns to the full island after 2.4 seconds. The workflow resets the moral session first, then schedules the existing “下一位可以点精灵 / 孩子自己选择精灵继续” feedback for the next browser task. Any guard event produced by the old success DOM finishes first; the handoff message becomes the final idle-state feedback without changing guard behavior or allowing a stale click to select another child.

## Verification

- Unit tests and production build remain green.
- Two isolated ten-child loops pass with every settled center hit and every recorder stop flag true.
- The default local trial and production preview smoke pass.
- A manually dispatched full Classroom QA on `main` produces seven results, zero functional issues, an accepted asset report, a passing preview smoke, and uploaded artifacts.

## Rejected alternatives

- Synchronously updating `stateRef` during reset could let a click from stale success DOM select another child after the state becomes idle.
- Accepting keyboard activation or relaxing the handoff assertion would hide real whiteboard interaction failures.
