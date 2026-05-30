# Overnight Project UI Maturity Goal

Work in /root/my-project/Points_game.

This is a long-running 5–6 hour overnight UI maturity task. Do not force unnecessary changes just to consume time. Work in checkpoints, validate often, and stop when the stop conditions are met.

## Source of truth

Read AGENTS.md first.

Also read:
- docs/overnight-ui-polish-goal.md
- docs/ui-polish-overnight-log.md
- package.json
- current git status and current git diff

The previous P0 pass has completed with:
- npm run build passing
- npm run qa:visual passing
- 13 viewport/page QA checks passing
- no protected assets, CSV/JSON data, backend logic, or dependency files changed

Build on that work. Do not revert it unless a clear regression is found.

## Main objective

Complete a second-pass, project-wide UI maturity improvement.

The app should become a professional coastal island learning game cockpit, not a SaaS landing page, not a white admin console, and not a plastic AI-generated demo.

Focus on:
1. consistent module page command bars
2. better HUD/module entry clarity
3. improved teacher workflow density
4. fewer generic headings/subtitles/cards
5. more coherent shell/sand/sea/coral/gold visual language
6. mobile and whiteboard touch usability
7. stable build and visual QA

## Agent routing

Use installed agents deliberately.

1. Spawn `ux_researcher` first for read-only review of remaining P1/P2 issues:
   - teacher workflow clarity
   - module entry clarity
   - icon-only navigation ambiguity
   - large heading/subtitle leftovers
   - confusing button labels
   - mobile/whiteboard friction

2. Spawn `ui_designer` for read-only visual review:
   - module page visual hierarchy
   - cockpit/HUD consistency
   - button/card/panel/chip consistency
   - shell/sand/sea/coral/gold polish
   - remaining SaaS or plastic AI patterns

3. Summarize both reviews into a concrete implementation plan before editing.

4. Spawn `frontend_developer` only after the plan is clear.

5. Spawn `code_reviewer` after each major implementation checkpoint if available. If unavailable, perform an internal read-only review.

Do not use `backend_architect` unless a backend/API/data-contract issue is directly discovered. This task should remain frontend-focused.

## Hard constraints

Do not:
- commit
- push
- reinitialize the project
- run destructive git commands
- clean untracked files
- delete assets
- modify package dependencies or lockfiles
- modify backend logic
- modify CSV or JSON data files
- modify generated asset directories
- touch assets/generated/v4
- touch cutout-birefnet-dynamic
- touch public/assets/map/v4
- weaken qa:visual just to pass tests

Preserve:
- App state flow
- module routing
- XP ledger behavior
- roll call behavior
- voice review behavior
- math arena behavior
- service calls
- domain helpers
- seed classroom data
- existing local API behavior

Only edit frontend UI/component/style files unless a directly related QA script update is needed because legitimate wording changed.

## Checkpoint 0: baseline and backup

1. Confirm current path is /root/my-project/Points_game.
2. Run git status.
3. Save a patch backup of the current working tree to /tmp before editing:
   - /tmp/points-game-before-overnight-ui-maturity.patch
4. Read AGENTS.md.
5. Read docs/ui-polish-overnight-log.md.
6. Inspect package.json scripts.
7. Append a new section to docs/ui-polish-overnight-log.md named “Second-pass UI maturity run”.

## Checkpoint 1: remaining UX/design review

Before editing, perform a short read-only review using ux_researcher and ui_designer.

Create a P1/P2 implementation plan in docs/ui-polish-overnight-log.md.

P1 candidates:
- unify module pages around compact 44–56px top command bars
- reduce remaining large headings and explanatory subtitles
- add clearer labels to icon-only navigation where needed
- improve teacher workbench flow: selected child first, actions second
- reduce repeated +10/+20/+30 visual clutter where safe
- make module placeholders feel like formal product states, not roadmap/demo cards
- keep touch targets at least 44px where practical
- ensure no mobile horizontal overflow

P2 candidates:
- shared visual tokens or small reusable UI primitives if they reduce duplication
- more coherent panel/card/chip/button styling
- stronger coastal game cockpit atmosphere
- minor copy polish across touched modules
- visual QA screenshots and documentation

Do not implement everything blindly. Choose the smallest useful set of changes that improves consistency across the project.

## Checkpoint 2: shared UI structure

Inspect existing components first.

If useful, introduce or refine small reusable frontend UI pieces, such as:
- compact module command bar
- game panel/card wrapper
- status chip
- action dock pattern
- touch-safe button style

Only create shared components if they reduce duplication and keep the code easier to maintain.

Do not rewrite business logic. Do not move large parts of the app unnecessarily.

After this checkpoint:
- run npm run build
- fix only issues caused by your changes

## Checkpoint 3: module page maturity pass

Prioritize these files when relevant:

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

Improve:
- command bar consistency
- heading scale
- panel density
- task/action labels
- product-state wording
- mobile layout
- touch target size
- visual consistency

Avoid:
- huge titles
- generic subtitles
- roadmap/future feature blocks
- feature-card grids
- meaningless decorative icons
- purple/blue AI gradients
- excessive glassmorphism
- pure white admin-console look

After this checkpoint:
- run npm run build
- run npm run qa:visual if available
- inspect failures before changing code
- do not weaken QA assertions to hide real problems

## Checkpoint 4: teacher workflow polish

If time remains and build/QA are stable, improve TeacherWorkbenchModule and related module actions.

Goals:
- selected child should be visually obvious
- primary teacher action should be obvious
- repeated scoring actions should be less noisy
- prevent accidental taps where practical
- keep classroom workflow fast
- keep XP ledger behavior unchanged

Do not change scoring logic unless explicitly required by existing behavior.

After this checkpoint:
- run npm run build
- run npm run qa:visual if available

## Checkpoint 5: mobile and whiteboard pass

Review changed screens for:
- 390px narrow mobile
- tablet/whiteboard style use
- touch target size
- no horizontal overflow
- no clipped critical actions
- no tiny icon-only critical controls
- module command bars remain usable

Use existing QA/browser tooling only. Do not create a large new test framework.

If screenshots are produced, save them under qa-artifacts/latest/ or the existing QA artifact convention.

## Checkpoint 6: review

Spawn `code_reviewer` if available and valid. If it is unavailable or invalid, perform an internal read-only review.

Review:
- changed files
- accidental unrelated edits
- build stability
- QA stability
- App state flow
- module routing
- XP ledger behavior
- roll call
- voice review
- math arena
- HUD/map integration
- mobile overflow
- touch targets
- remaining plastic AI patterns
- remaining prototype/demo copy

If review finds critical or high issues:
- fix only those issues
- rerun npm run build
- rerun npm run qa:visual if relevant

## Stop conditions

Stop when:
- npm run build passes
- npm run qa:visual passes if available
- one review pass is complete
- no critical or high review issues remain
- docs/ui-polish-overnight-log.md contains the implementation plan, checkpoints, validation results, and remaining risks

Stop early if:
- a required file is missing
- the task becomes a broad rewrite
- a requested improvement would require product judgment
- a requested improvement would require protected data/assets/backend/dependency changes
- a build failure appears unrelated and unsafe to fix
- permissions block essential commands

## Final report

Final output must include:

1. Changed files.
2. What changed in UI/UX.
3. What changed in shared styling/components.
4. What was intentionally not changed.
5. Build result.
6. Visual QA result.
7. Mobile/whiteboard observations.
8. Review findings.
9. Remaining risks.
10. Exact next recommended task for the next session.

Do not commit or push.