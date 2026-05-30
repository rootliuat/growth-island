# Overnight UI Polish Goal for Points_game

Work in /root/my-project/Points_game.

This is an overnight checkpointed UI polish task. Budget up to 5–6 hours, but do not force the run to last that long. Stop early if the stop conditions are met or if further work requires product judgment.

## Source of truth

Read AGENTS.md first.

Use the existing ux_researcher and ui_designer review conclusions. If their full outputs are not available in context, use this merged conclusion:

1. The homepage is now more map-first than before, but it still feels like a white admin/backend interface. It needs more coastal island / shell / sand / sea game HUD atmosphere.
2. Non-home modules still have obvious SaaS-template patterns: large headings, explanatory subtitles, feature cards, future roadmap blocks, and placeholder copy.
3. The meaning of “聚焦” is unclear. It really means returning to Growth Island and focusing the current child.
4. Teacher workbench has high information density and too many repeated +10/+20/+30 actions, which can cause misclicks.
5. Homepage icon-only navigation is too minimal; teachers may not understand entry meanings.
6. Prototype-like copy such as “录音占位 / 静态奖池 / 本地记录 / 演示兑换” should be removed or replaced with formal product-state wording.
7. Mobile still has risk: global min-width: 1120px and 34px controls are unsuitable for narrow screens and touch/whiteboard use.

## Main objective

Complete a safe first-pass “de-SaaS + game cockpit unification” for the project.

The UI should feel like a professional coastal island learning game, not a SaaS landing page, not a white admin console, and not a plastic AI-generated demo.

## Design direction

Prefer:
- map-first layout
- compact top command/HUD bar
- shell/sand/sea/coral/gold visual language
- task dock or floating operation panels
- XP/gold/badge/status chips
- short task labels
- smaller headings
- clearer action feedback
- touch targets of at least 44px where practical
- mobile-first behavior without horizontal overflow

Avoid:
- oversized H1/H2 headings
- repeated title + subtitle blocks
- generic SaaS feature-card grids
- purple/blue AI gradients
- excessive glassmorphism
- decorative icons without meaning
- future roadmap blocks
- prototype labels or demo copy
- broad rewrites

## Target files

Prioritize these files if relevant:

- src/styles.css
- src/components/AppShell.tsx
- src/components/Hud/GameTopBar.tsx
- src/components/Hud/SpiritDock.tsx
- src/components/modules/ModulePlaceholder.tsx
- src/components/modules/moduleConfig.ts
- src/components/modules/TeacherWorkbenchModule.tsx
- src/components/modules/RollCallModule.tsx
- src/components/modules/VoiceRecordModule.tsx
- src/components/modules/LotteryModule.tsx
- src/components/modules/ShopModule.tsx
- src/components/modules/SettingsModule.tsx

Do not assume every file must be changed. Make the smallest useful set of edits.

## Hard constraints

Do not:
- reinitialize the project
- run destructive git commands
- clean untracked files
- delete assets
- modify generated asset directories
- touch assets/generated/v4
- touch cutout-birefnet-dynamic
- touch public/assets/map/v4
- modify backend logic unless absolutely required
- modify CSV or JSON data files
- modify package dependencies or lockfiles unless absolutely required for a build fix caused by your own changes

Preserve:
- App state flow
- module routing
- XP ledger behavior
- service calls
- domain helpers
- seed classroom data
- existing business logic

## Checkpoint 0: baseline

1. Confirm current path is /root/my-project/Points_game.
2. Read AGENTS.md.
3. Run git status.
4. Inspect package.json scripts.
5. Create or update docs/ui-polish-overnight-log.md with a short running log.

## Checkpoint 1: P0 implementation plan

Before editing, write a concise P0/P1/P2 plan in docs/ui-polish-overnight-log.md.

P0 must include:
- Replace unclear “聚焦” wording with “回到成长岛” or “回岛聚焦” where appropriate.
- Remove or replace prototype/demo copy.
- Reduce oversized headings and explanatory subtitles.
- Start unifying module pages toward a compact 44–56px top command bar.
- Remove or reduce obvious SaaS feature-card/future-roadmap blocks.
- Address global min-width / narrow-screen risk if it exists.
- Improve touch targets toward 44px where practical.

P1 may include:
- Teacher workbench density reduction.
- Fewer repeated score buttons.
- More obvious selected-child + operation-drawer flow.
- More explicit homepage navigation labels.

P2 may include:
- Deeper visual polish, microcopy refinements, screenshot polish.

## Checkpoint 2: implementation

Spawn frontend_developer if available. If unavailable, implement in the main thread.

Implement P0 first. Keep edits scoped.

After P0, run npm run build.

If build fails, fix only issues caused by your changes and rerun npm run build.

If P0 is stable and there is enough time, implement selected P1 items.

Do not implement P2 unless P0 and P1 are stable and build continues to pass.

## Checkpoint 3: visual QA

If an existing visual QA script exists, run it.

If no visual QA script exists, do not create a large new framework. Use existing browser/Playwright tooling only if already available and practical.

Inspect or capture desktop and narrow mobile states for changed screens when possible.

Focus on:
- homepage
- HUD
- module entry
- teacher workbench
- roll call
- voice record
- lottery/shop/settings placeholders if touched

## Checkpoint 4: review

Spawn code_reviewer if available and valid. If unavailable, perform an internal read-only review.

Review for:
- build failures
- accidental unrelated edits
- App state regression
- module routing regression
- XP ledger regression
- roll call regression
- voice review regression
- math arena regression
- HUD/map integration regression
- mobile overflow
- too-small touch targets
- remaining oversized headings
- remaining SaaS/template/demo copy

If review finds critical or high issues, fix only those issues and rerun npm run build.

## Stop conditions

Stop when:
- npm run build passes
- P0 is complete
- at least one review pass is complete
- no critical or high review issues remain

Also stop early if:
- required files are missing
- build failure is unrelated and unsafe to fix
- further changes require product judgment
- changes would require modifying protected data/assets/backend files
- the task risks becoming a broad rewrite

## Final report

At the end, output:

1. Changed files.
2. What was improved.
3. What was intentionally not changed.
4. Validation commands and results.
5. Review findings.
6. Remaining risks.
7. Exact recommended next task for the next session.