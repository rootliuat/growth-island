<!--
[INPUT]: 依赖仓库实现、构建测试结果与课堂 QA 报告。
[OUTPUT]: 对外提供 UI、性能、恢复与 QA 改进的连续变更日志。
[POS]: docs 的工程演进记录，承接每轮实现范围、设计理由与验证证据。
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
-->

# UI Polish Overnight Log

## Checkpoint 0 - Baseline

- Worktree: `/root/my-project/Points_game`.
- Source instructions read: `AGENTS.md` and `docs/overnight-ui-polish-goal.md`.
- Git status at start: `main...origin/main`, with untracked `docs/overnight-ui-polish-goal.md`.
- Scripts confirmed: `npm run build`, `npm run qa:visual`, `npm run dev`, `npm run dev:vite`, `npm run api`, `npm run preview`.
- Existing review conclusion in the goal file is used as the UX/UI source of truth.
- Agent availability: `frontend_developer` and `code_reviewer` roles are not available in the installed multi-agent set; implementation will be done in the main thread, and review will be an internal read-only pass as allowed by the goal file.

## Checkpoint 1 - P0/P1/P2 Plan

### P0

- Replace ambiguous `聚焦` labels with `回到成长岛` or `回岛聚焦` where the action returns to the Growth Island view.
- Remove or replace prototype/demo wording in user-facing module screens: `录音占位`, `静态奖池`, `本地记录`, `演示兑换`, and visible `占位` labels.
- Reduce oversized module headings and explanatory subtitles by converting module hero sections into compact command bars.
- Reduce `ModulePlaceholder` SaaS-template structure by removing feature-card grids and future-roadmap style blocks in favor of compact product-state panels.
- Address global `min-width: 1120px` narrow-screen risk without changing core app state or routing.
- Improve small control targets toward at least 44px where practical, especially home zoom controls and compact module actions.

### P1

- Reduce teacher workbench density where low risk: clearer selected-child/action-drawer flow, less repeated explanatory text, fewer ambiguity points.
- Make homepage/sidebar module labels clearer while preserving the map-first home stage.
- Continue copy cleanup across roll call, voice record, lottery, shop, settings, and leaderboard.

### P2

- Deeper visual polish of the shell/sand/sea/coral game cockpit skin.
- Additional screenshot polish after P0/P1 validation.
- Broader responsive pass if P0 uncovers complex layout decisions.

## Running Notes

- Protected asset/data/backend constraints remain active; no generated asset directories, CSV/JSON data, or backend logic should be changed for this UI polish pass.

## Checkpoint 2 - Implementation

- Replaced ambiguous return/focus labels in module buttons with `回岛`, `回到成长岛`, or `定位当前精灵` depending on context.
- Removed visible prototype/demo wording from module screens and sync labels, including `录音占位`, `静态奖池`, `本地记录`, `演示兑换`, visible `占位`, and `离线演示`.
- Simplified `ModulePlaceholder` by removing the SaaS-style feature-card grid and future-roadmap block; placeholder modules now show compact current-state and Growth Island linkage panels.
- Reduced narrow-screen risk by changing global `min-width: 1120px` to `min-width: 0`.
- Increased the home sidebar collapse affordance and home zoom controls toward 44px touch targets.
- Updated `scripts/qa-visual.mjs` selectors to match the new formal product wording.

## Checkpoint 3 - Validation

- `npm run build`: passed.
- `npm run qa:visual`: passed after starting the local dev server.
- Visual QA report: `qa-artifacts/latest/report.json`.
- Screenshots inspected: `home-whiteboard.png`, `teacher-workbench-whiteboard.png`, `teacher-workbench-compact.png`, `roll-call-whiteboard.png`, `voice-record-whiteboard.png`, `lottery-whiteboard.png`, `shop-whiteboard.png`, `settings-whiteboard.png`, `mobile-home.png`, `mobile-teacher-workbench.png`, and `mobile-settings.png`.
- QA coverage: 13 page/viewport checks, 0 issues, 0 warnings, 0 failed images, 0 horizontal-overflow pages.
- Home performance evidence from QA: 60.8 FPS normal sampling, 56.7 FPS wheel sampling.
- Narrow-screen smoke check at 390x844: home, teacher workbench, and settings all had document/body width 390px, no horizontal overflow; teacher workbench cards retained visible spirit images and quick XP buttons.

## Checkpoint 4 - Internal Review

- `frontend_developer` and `code_reviewer` roles were unavailable, so implementation and review were completed in the main thread as allowed by the goal file.
- `git diff --check`: passed.
- `rg` check for visible `聚焦|录音占位|静态奖池|本地记录|演示兑换|占位|演示` in `src/components`, `src/styles.css`, module config, and QA script: no matches.
- Changed-file audit found no generated asset directory, CSV/JSON data, backend logic, package dependency, or lockfile changes.
- No critical or high issues remain from the P0 scope.

## Second-pass UI maturity run

### Checkpoint 0 - Baseline

- Worktree: `/root/my-project/Points_game`.
- Source instructions read: `AGENTS.md`, `docs/overnight-project-ui-maturity-goal.md`, `docs/overnight-ui-polish-goal.md`, and this running log.
- Git status at start: `main...origin/main`, with the first-pass UI polish files still modified and the overnight docs untracked.
- Patch backup saved before second-pass edits: `/tmp/points-game-before-overnight-ui-maturity.patch`.
- Scripts confirmed in `package.json`: `npm run build`, `npm run qa:visual`, `npm run dev`, `npm run dev:vite`, `npm run api`, and `npm run preview`.
- Agent workflow started with read-only `ux_researcher` and `ui_designer` reviews as required by the second-pass goal.
- Constraints remain active: no commits, no pushes, no protected asset/data/backend/dependency changes, and no QA weakening.

### Checkpoint 1 - P1/P2 Review Summary

- `ux_researcher` found P1 risks in mobile wayfinding, teacher workbench action overload, lingering oversized module headings, placeholder/settings actions that look real, and icon-only map controls without reliable accessible labels.
- `ui_designer` found P1 visual risks in the later `--apple-*` CSS layer, which made modules too white/admin-like, plus missing shared cockpit command bars, mobile home zoom-control crowding, and mobile teacher workbench prioritizing cards before the selected-child workflow.
- Both reviews recommend a smaller second-pass scope: unify compact module command bars, bring the module skin back toward Beihai shell/sand/sea/coral/gold, improve touch/mobile discoverability, and reduce teacher workflow ambiguity without changing XP logic.

### Checkpoint 1 - P1/P2 Implementation Plan

#### P1

- Replace the hidden-header pattern with a visible compact cockpit command bar for module pages: small module name, active child/status chip, and one return-to-island action. Keep it within 44-56px where practical.
- Replace the white/admin `--apple-*` token layer with Beihai-neutral tokens while preserving the user's requested simple, uncluttered surface.
- Add explicit `aria-label` to map zoom/focus buttons and reduce mobile map-control crowding through CSS placement rather than new PixiJS work.
- Improve teacher workbench mobile priority: selected child and action drawer should appear before the large roster on narrow screens; per-card actions stay compact and do not change scoring behavior.
- Remove or soften inactive-command wording in settings/placeholders so unavailable actions read as product status rather than broken buttons.

#### P2

- Add a small shared CSS vocabulary for cockpit surfaces (`game-command-bar`, `game-panel`, `game-chip`, `game-button-*`) only if it reduces duplication in touched screens.
- Densify reward/shop cards if P1 remains stable.
- Lower old hero-scale CSS title rules to the documented 18-22px range so future screens do not regress.
- Re-run `npm run build`, `npm run qa:visual`, and inspect mobile/whiteboard screenshots before final reporting.

### Checkpoint 2 - Second-pass Implementation

- Kept the effective current diff scoped to frontend UI, `scripts/qa-visual.mjs`, and overnight docs. A later audit found non-UI/backend/dependency/test changes in the branch; those paths were locally backed out so the current worktree diff against `main` no longer includes package files, backend logic, domain rules, JSON data, or tests.
- Reworked module-page presentation toward compact cockpit command bars instead of large title/subtitle blocks.
- Retuned the later simple UI token layer away from a plain white admin look and back toward a restrained Beihai shell/sand/sea/coral surface.
- Added accessible labels for map zoom/focus controls and adjusted narrow home controls to reduce mobile crowding.
- Improved teacher workbench mobile priority so the selected child and action drawer appear before the large roster on narrow screens.
- Removed inactive-command wording from settings/placeholders where it read like fake working buttons.
- Added mobile 44px touch-height overrides for profile, manual scoring, voice review, and collapsed dock controls.
- Extended `npm run qa:visual` with repeatable 390x844 mobile smoke screenshots for home, teacher workbench, roll call, voice record, math arena, shop, data management, and settings.
- Updated image QA so offscreen lazy-loaded images are treated as deferred, while visible broken images and completed zero-width images still fail the run.

### Checkpoint 3 - Second-pass Validation

- `npm run build`: passed.
- `git diff --check main --`: passed.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- QA coverage after the second pass: 21 checks, 0 issues, 0 warnings.
- Whiteboard screenshots inspected: `home-whiteboard.png` and the full QA output set.
- Mobile screenshots generated by QA include `mobile-home-mobile.png`, `mobile-teacher-workbench-mobile.png`, `mobile-roll-call-mobile.png`, `mobile-voice-record-mobile.png`, `mobile-math-arena-mobile.png`, `mobile-shop-mobile.png`, `mobile-data-management-mobile.png`, and `mobile-settings-mobile.png`.
- Protected path audit against `main`: no diffs under `assets/generated/v4`, `cutout-birefnet-dynamic`, `public/assets/map/v4`, `src/data`, CSV files, package files, backend files, domain files, `shared`, `tests`, or `tsconfig.json`.

### Checkpoint 4 - Second-pass Review And Risks

- `code_reviewer` read-only review found no critical or high issues.
- Medium review findings were addressed for log completeness, repeatable mobile QA coverage, and mobile touch-height gaps.
- Remaining risk: this pass deliberately avoided deeper product changes such as reducing scoring choices, changing XP behavior, rewriting PixiJS map layers, or editing generated assets.
- Remaining risk: the branch already has a pushed commit from an earlier explicit upload request; this current goal pass made only local corrective changes and did not commit or push further.

## Energy constellation asset follow-up

### Completed

- Reviewed Batch1 seven virtue-energy glyphs against the Beihai coastal game style.
- Kept all seven accepted; no full-set regeneration is needed.
- Added runtime glyph use rules: keep text labels visible, avoid full-background usage, and revisit `energy-aijiaxiang-glyph.png` / `energy-yongqi-glyph.png` only if a future icon-only mode removes labels.
- Added the asset trail to `docs/asset-generation-and-cutout-log.md`, including source paths, runtime paths, QA files, and engineering acceptance.
- Produced Batch2 VFX assets after the separate image generation window stopped: `energy-confirm-burst.png`, `energy-arrival-orb.png`, `energy-touch-halo.png`, and `next-child-halo.png`.
- Rejected two `energy-confirm-burst.png` candidates before accepting the final gold/coral version: one was too much like a large shell badge, and one was too green / plant-like.
- Added Batch2 manifest and QA: `assets/generated/ui/energy-constellation/energy-vfx-batch2.manifest.json`, `assets/generated/ui/energy-constellation/energy-vfx-batch2-qa.png`, and `assets/generated/ui/energy-constellation/BATCH2_VFX_REVIEW.md`.

### Next frontend slice

P1:

- Use `energy-confirm-burst.png` on teacher approval so the child sees one short, clear success moment near the current spirit or energy card.
- Use `energy-arrival-orb.png` as a lightweight travel cue from the teacher confirmation card toward the current spirit / growth tree / active energy slot.
- Use `energy-touch-halo.png` for the current child touch target or speak-growth mic state.
- Use `next-child-halo.png` after success to mark the next child without adding more persistent text.
- Keep `energy-confirm-burst.png` to `500-700ms`, with `pointer-events: none`, and respect `prefers-reduced-motion`.

P2:

- Add optional `energy-slot-current.png` only if the CSS card state still reads too flat.
- Skip `energy-slot-empty.png` and `energy-slot-lit.png` until the UI has a real icon-only or slot-based display need.
- Keep animations short and reduced-motion aware; do not add idle looping clutter to the home map.

### Validation target

- `npm run build`
- `npm run qa:visual`
- Manual screenshot review of `home-whiteboard.png`, focused child state, teacher approval state, and `mobile-home-mobile.png`

## P3 child self-service VFX integration

### Scope

- Integrated Batch2 VFX assets into the child self-service growth loop:
  - `energy-touch-halo.png`
  - `energy-confirm-burst.png`
  - `energy-arrival-orb.png`
  - `next-child-halo.png`
- Kept the implementation in the existing React/CSS HUD layers. No PixiJS map rewrite, backend change, XP logic change, service change, or data-file change.
- Used the VFX as state feedback only: ready mic affordance, teacher-approved success burst, energy arrival bead, and next-child queue marker.

### UX/UI Review Notes

- `ux_researcher` and `ui_designer` completed read-only reviews before implementation.
- Both reviews recommended keeping effects short, copy-free, and subordinate to existing child-facing labels.
- Teacher review actions remain calm and functional; the approval button itself does not receive celebratory VFX.
- Next-child halo is anchored behind the dock/avatar state and does not cover child names.

### Implementation Notes

- `MoralSpeakOverlay.tsx` adds `aria-hidden` VFX hooks for the ready mic and success state.
- `SpiritDock.tsx` renders `next-child-halo` only when a child is actually in `next-ready` state.
- `styles.css` binds the hooks to the runtime PNG assets, sets `pointer-events: none`, defines short animations, and extends the existing `prefers-reduced-motion` block.
- The success burst is capped to `680ms`; the arrival orb is capped to `880ms`; the next-child cue is capped to `940ms` and fades out in normal motion.

### Validation

- `npm run build`: passed.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- QA coverage: 32 checks, 0 issues, 0 warnings.
- Manual screenshots inspected:
  - `qa-artifacts/latest/moral-speak-flow-ready-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-pending-mobile.png`
  - `qa-artifacts/latest/moral-speak-flow-mobile.png`
- Additional reduced-motion Playwright check confirmed all four Batch2 VFX nodes use `pointer-events: none`, load the expected runtime image paths, and switch to `animation-name: none` under `prefers-reduced-motion: reduce`.

## P4 whiteboard touch and home information layer

### Scope

- Reworked only the home React/CSS touch layer for the electronic whiteboard flow.
- Kept backend, server API, XP/ledger logic, data files, generated map assets, and PixiJS map rendering untouched.
- Did not add parent, reviewer, kindergarten admin, PDF export, approval flow, account, or permission surfaces.

### UX/UI Review Notes

- `ux_researcher` and `ui_designer` completed read-only reviews before implementation.
- Both reviews identified the same P4 risk: the home screen was technically map-first, but too many persistent HUD layers competed with the child action.
- The selected direction was to keep the island and child spirit primary, lower the visual weight of energy and scene-entry boards, and let teacher tools appear only as guardrails during review.

### Implementation Notes

- `SpiritDock.tsx` now separates the selected child name from the status chip, adds a clearer all-class affordance, and keeps long names truncatable without hiding the current child.
- `MoralSpeakOverlay.tsx` adds a small ready-state child name near the mic so a child standing at the whiteboard can see whose turn it is.
- `AppShell.tsx` adds title attributes to current-child chips so clipped names remain inspectable.
- `styles.css` adds the P4 home touch pass:
  - lighter home energy board and scene gate;
  - shorter collapsed child queue;
  - single-row expanded roster on the home map;
  - hidden duplicate home HUD layers during moral-speaking stages;
  - mobile non-idle expanded dock compressed into a bottom short queue so it does not overlap the mic;
  - pointer-events disabled for VFX/image-only layers.

### Validation

- `git diff --check`: passed.
- `npm run build`: passed.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- QA coverage: 32 checks, 0 issues, 0 warnings.
- `code_reviewer` found one medium issue: mobile expanded `SpiritDock` search/filter controls were hidden in normal idle browsing, not only during moral-speaking states. The rule was narrowed so normal mobile full-class browsing keeps search/filter, while non-idle moral stages still compress the dock away from the mic.
- Manual screenshots inspected:
  - `qa-artifacts/latest/home-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-ready-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-ready-mobile.png`
  - `qa-artifacts/latest/moral-speak-flow-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-mobile.png`
  - `qa-artifacts/latest/moral-speak-flow-pending-whiteboard.png`
  - `qa-artifacts/latest/moral-review-safety-mobile.png`
- First P4 QA run found one mobile ready-state overlap between expanded `SpiritDock` and the mic; the mobile non-idle expanded dock was then compressed and the second QA run passed.

## P5 map spirit selection and name anchor closure

### Scope

- Improved the child-facing map selection loop without changing backend, server API, XP/ledger logic, data files, generated assets, or the PixiJS map architecture.
- Kept the work to React/CSS glue and small existing Pixi layer adjustments for visible name anchors and touch hit areas.
- Did not add parent, reviewer, kindergarten admin, PDF export, approval flow, account, or permission surfaces.

### UX/UI Review Notes

- `ux_researcher` and `ui_designer` completed read-only reviews before implementation.
- Both reviews found that P4 made the home screen less crowded, but the next risk was child identity on the map: a child could tap or use the dock, yet the map did not give enough non-hover evidence that spirits and homes were tappable.

- The selected direction was to reinforce the current/next child state and name anchors, keep the teacher card secondary, and avoid restoring large home information plaques. The fixed next-child role was later superseded by P6.1 self-selection.

### Implementation Notes

- `LabelLayer.ts` now keeps compact spirit name chips visible in full-island find mode, gives the selected child a stronger name ring, and keeps the selected label above other labels.
- `HomeLayer.ts` shows the selected home beacon in overview/focused community ranges, so the current child has a clearer map anchor before speaking.
- `SpiritLayer.ts` slightly enlarges the spirit hit area for whiteboard taps.
- `MoralSpeakOverlay.tsx` updates the child flow rhythm to `找 / 说 / 等 / 亮`, simplifies pending review to a short wait state, and changes success copy to `{能量}能量进精灵`.
- `SpiritDock.tsx` separated `当前` and `下一位` roles at this stage; P6.1 later removed the fixed next-child role entirely.
- `WorldMapContainer.tsx` adds travel-button `aria-label`s and uses `等待点亮` during non-idle wait states.
- `styles.css` adds P5 touch feedback, focus-visible coverage, 44px touch floors for remaining controls, compact non-idle energy board behavior, mobile teacher-card overlap containment, and quieter duplicate shell child-chip styling.
- `scripts/qa-visual.mjs` was updated to validate the new `找 / 说 / 等 / 亮` rhythm labels.

### Validation

- `git diff --check`: passed.
- `npm run build`: passed.
- First `npm run qa:visual` found:
  - QA still expected the old `我 / 说 / 等 / 亮` rhythm labels.
  - Mobile shell child chip text was hidden too aggressively, so the self-service dock entry looked missing.
  - Mobile teacher adjust menu overlapped the child speech bubble.
- These were fixed by updating QA expectations, restoring mobile shell child-chip text, and moving the child bubble away while the teacher adjust popover is open.
- Second `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- QA coverage: 32 checks, 0 issues, 0 warnings.
- Manual screenshots inspected:
  - `qa-artifacts/latest/home-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-ready-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-ready-mobile.png`
  - `qa-artifacts/latest/moral-review-safety-mobile.png`

## P14 whiteboard clarity, performance, and touch closure

### Scope

- Tightened only the existing classroom home loop: map clarity, touch feedback, success copy, 3D weight, and visual QA.
- Kept backend, XP/ledger logic, data files, generated map assets, and PixiJS map architecture unchanged.
- Kept the next-child model as self-selection: after success the app returns to the full island and the next child taps their own spirit.

### Implementation Notes

- Raised Pixi's interaction render-resolution floor so whiteboard drag/wheel no longer drops to the very blurry `0.32` range while preserving adaptive caps for large screens.
- Suppressed 3D loading/fallback text in the child success bubble; success copy now remains child-facing and energy-based.
- Removed the collapsed dock's 3D shortcut so `找我 / 点精灵 / 全班` remain the whiteboard primary actions.
- Added a P14 CSS closure layer that hides active-flow 3D shortcuts, hides pending duplicate energy board, and keeps success 3D reward previews small/passive.
- Updated visual QA to sample the real Pixi canvas, add an ultra whiteboard viewport, assert interaction render-resolution, and reject technical 3D loading copy in success bubbles.

### Validation Target

- `npm run build`
- `QA_CHECKS=home,moral-speak-flow,classroom-touch-loop,spirit-showcase-3d npm run qa:visual`
- `npm run qa:trial:fast`

## P6 teacher confirmation and exception closure

### Scope

- Reworked the child self-service teacher confirmation stage into a light guardrail flow: confirm, correct, say again, or skip this child.
- Kept backend, server API, XP/ledger logic, data files, generated assets, and PixiJS map rendering untouched.
- Did not add parent, reviewer, kindergarten admin, PDF export, approval flow, account, permission, or cloud-sync surfaces.

### UX/UI Review Notes

- `ux_researcher` and `ui_designer` completed read-only reviews before implementation.
- Both reviews found that the prior confirmation card still read like a score-adjustment card in exception cases.
- The selected direction was to make the teacher card task-based: normal suggestions get `确认点亮`; unclear or negative suggestions route through `修正`, `补说`, or `跳过这位`.

### Implementation Notes

- `TeacherMoralReviewCard.tsx` now shows `确认点亮` as a full-width primary action only when the suggestion is safe to approve.
- The correction panel now lets the teacher choose the child-facing energy category and a `+10 / +20 / +30` amount, so corrected records no longer default to one category.
- `MoralSpeakOverlay.tsx` keeps unsafe pending child copy fixed at `请老师帮忙`, avoiding transcript, score, confidence, or negative-label leakage on the child layer.
- `App.tsx` adds separate say-again and skip handlers. Say-again returns the current child to ready without writing a ledger record; skip marks the pending review handled locally and readies the next child without writing energy.
- `WorldMapContainer.tsx` remounts the teacher review card by review identity so an open correction panel does not leak into the next child's review.
- `styles.css` updates the teacher-card action grid, mobile review-card safe heights, and correction-panel overlap behavior.
- `scripts/qa-visual.mjs` now validates low-confidence and negative review safety, correction category persistence, say-again, skip-to-next, single positive ledger writes after correction, and action layout clipping.

### Validation

- `git diff --check`: passed.
- `npm run build`: passed.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- Latest visual QA generated at `2026-06-04T23:35:09.120Z`.
- QA coverage: 32 checks, 0 issues, 0 warnings.
- Fixes during QA:
  - Stabilized correction-panel opening in QA when a previous `details` state was already open.
  - Cleared stale global feedback before pending review so it does not overlap the teacher card.
  - Remounted the review card per review and adjusted mobile safe heights so expanded dock, topbar, speech bubble, and teacher card do not collide.
- Code review follow-up:
  - Say-again and skip now also reject the current review through the existing online API when a review id exists, so pending server reviews do not reappear after the next snapshot.
  - Visual QA now asserts that say-again and skip leave no matching pending review and store the expected rejection reason.
  - Confirmation no longer overwrites a server snapshot's review result with the local pre-submit result.

## P6.1 child self-selection loop

### Scope

- Changed the child self-service loop so every child chooses their own spirit from the map or bottom dock each time.
- Kept backend, XP/ledger logic, service calls, seed data, generated assets, and map assets untouched.
- Preserved teacher actions: confirm, correct, say again, skip, and defer.

### Implementation Notes

- `App.tsx` no longer computes or readies the next self-service child after confirmation or skip.
- Confirmation still writes the approved self-service ledger record, plays the success/energy-arrival state, then returns to `idle` and focuses the full island.
- Skip still rejects the pending review when present, writes no ledger record, then returns to `idle` and focuses the full island.
- `MoralSpeakOverlay.tsx` removes the child-facing next-turn card and success next-child chip.
- `SpiritDock.tsx` removes next-ready roles, halos, and labels; the dock remains a self-select entry for the current child and full roster.
- `styles.css` removes the unused next-ready dock and next-turn overlay styling.
- `scripts/qa-visual.mjs` now validates idle/full-island return after confirmation and skip instead of requiring a fixed next child.

### Validation

- `git diff --check`: passed.
- `npm run build`: passed.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- Latest visual QA generated at `2026-06-05T11:35:39.054Z`.
- QA coverage: 32 checks, 0 issues, 1 warning.
- Remaining warning: home wheel frame sample is low at 11.7 FPS; not introduced by the self-selection state change.
- Code review follow-up: restored the QA helper's `moralSpeak` state read after removing queue checks, so moral-review safety assertions still inspect result intent/category/status.

## P7 whiteboard performance and math light-up

### Scope

- Removed the combat/PK feel from the math module and reframed it as cooperative arithmetic light-up.
- Improved home whiteboard interaction performance for wheel zoom and map drag.
- Kept backend, server API, XP/ledger source id, data files, generated assets, and PixiJS map structure unchanged.
- Did not add parent, reviewer, kindergarten admin, PDF export, approval flow, account, permission, or cloud-sync surfaces.

### UX/UI Review Notes

- `ux_researcher` and `ui_designer` completed read-only reviews before implementation.
- Both reviews agreed that the child self-selection loop should stay simple: children choose their own spirit, speak growth, teacher confirms, then the screen returns to the full island.
- The math module direction changed from battle language to a classroom-safe light route: shell answers, light tracks, completion glow, and energy feedback.
- Visible text should avoid `PK`, `HP`, attack, damage, opponent, winner, arena, battle, and similar combat terms.

### Implementation Notes

- `MathPkBattle.tsx` keeps the compatibility export name but now renders a light-up field with two children, `0/5` light progress, answer shells, short light feedback, and completion state.
- `MathArenaModule.tsx`, `MathPkModal.tsx`, module config, HUD labels, map labels, growth log labels, and child profile labels now use `贝壳算术`, `算术点亮`, `数学光路`, and `数学光点` wording.
- `App.tsx` keeps the ledger `source: "math-pk"` for compatibility, but the visible reason is now `数学光路点亮 +30`.
- `styles.css` replaces math combat motion with light-track, shell-answer, glow, and reduced-motion-safe feedback styles.
- `PixiWorld.ts` lowers the canvas resolution to `0.7`, prevents native wheel scroll during map zoom, temporarily caps active interaction rendering at 30 FPS, and wakes rendering only while needed.
- `WorldScene.ts` skips noncritical idle animation work during active drag or zoom while keeping static scene caches enabled.
- `scripts/qa-visual.mjs` now validates the math light-up UI and forbids visible combat terms in the completed math flow.

### Validation

- `node --check scripts/qa-visual.mjs`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- Latest visual QA generated at `2026-06-05T13:06:46.191Z`.
- QA coverage: 32 checks, 0 issues, 0 warnings.
- Home wheel sample improved to 27.5 FPS with a 33-frame sample and max gap of 50.1 ms.
- Manual screenshots inspected:
  - `qa-artifacts/latest/home-whiteboard.png`
  - `qa-artifacts/latest/math-arena-whiteboard.png`
  - `qa-artifacts/latest/mobile-math-arena-mobile.png`

## P8 global UI and experience consistency closure

### Scope

- Tightened the existing classroom frontend without adding new product capabilities.
- Preserved the child self-selection loop: child chooses their own spirit, says growth, teacher confirms, energy feedback plays, then the map returns to the full island.
- Kept backend, server API, XP/ledger contracts, data files, generated assets, and PixiJS map structure unchanged.
- Did not add parent, reviewer, kindergarten admin, PDF export, approval flow, accounts, permissions, or cloud sync.

### UX/UI Review Notes

- Read-only UX review found the largest remaining drift in teacher tools: the drawer label promised a narrow fallback but exposed backstage routes such as账本、岛务、设置.
- Read-only UI review found the largest visual drift in module headers and CSS chrome: several modules carried their own return buttons and one-off header styles on top of the global command bar.
- Selected direction: keep URL access and QA coverage for backstage routes, but make the whiteboard dock classroom-first and keep teacher tools secondary.

### Implementation Notes

- `AppShell.tsx` now presents the bottom-right drawer as `老师工具` and only shows the two classroom fallback tools: `老师记录港` and `贝壳记录台`.
- `moduleConfig.ts` keeps direct routes for `data-management`, `organization`, and `settings`, but renames their visible scene language to `本机账本`, `班级任务`, and `本机舵盘`.
- Module focus actions now use `看精灵` when they return to the island and focus a child; `回岛` remains the global command-bar return action.
- Default visible XP copy in child-facing and primary teacher surfaces is now `能量`; internal ledger source ids and compatibility reasons remain unchanged.
- `VoiceRecordModule.tsx` removes the disabled `语音未开` action so the fallback tool no longer looks broken.
- `MoralSpeakOverlay.tsx` changes the child rhythm rail from `找 / 说 / 等 / 亮` to `我 / 说 / 等 / 亮`.
- `styles.css` adds a final P8 chrome layer for compact module headers, teacher drawer buttons, mobile command chips, and no-wrap energy feedback badges.
- `scripts/qa-visual.mjs` now validates P8 behavior: demoted backstage drawer entries, energy text parsing, `看精灵` actions, and the updated child rhythm rail.
- Design record written to `docs/superpowers/specs/2026-06-05-p8-global-ui-consistency-design.md`.

### Validation

- `git diff --check`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `npm run build`: passed.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- Latest visual QA generated at `2026-06-05T13:49:37.515Z`.
- QA coverage: 32 checks, 0 issues, 0 warnings.
- Manual screenshots inspected:
  - `qa-artifacts/latest/home-whiteboard.png`
  - `qa-artifacts/latest/teacher-workbench-whiteboard.png`
  - `qa-artifacts/latest/mobile-voice-record-mobile.png`
  - `qa-artifacts/latest/mobile-organization-mobile.png`

## P9 large-screen classroom touch loop

### Scope

- Hardened the existing child self-service classroom loop for whiteboard touch use.
- Preserved child self-selection: after success, the screen returns to the full island and the next child chooses their own spirit.
- Kept backend, server API, XP/ledger contracts, data files, generated assets, and PixiJS map structure unchanged.
- Did not add parent, reviewer, kindergarten admin, PDF export, approval flow, accounts, permissions, cloud sync, or a fixed next-child queue.

### UX/UI Review Notes

- Read-only UX review identified the main classroom risk as accidental child switching once a turn is already in progress.
- Read-only UI review identified the main visibility risk as weak real-name hierarchy during pending review and success, plus a teacher card that was too compact for whiteboard touch.
- Selected direction: keep the simple island loop, lock the active child only during active stages, enlarge teacher confirmation, and prove the sequence with a 10-child QA loop.

### Implementation Notes

- `App.tsx` now ignores wrong-child map/dock selections during listening, recognition, pending review, and success.
- `App.tsx` shows a short handoff feedback after success: `下一位可以点精灵`, without assigning a next child.
- `WorldMapContainer.tsx` makes the real child name the primary identity in the map focus plaque.
- `MoralSpeakOverlay.tsx` adds a visible turn chip for ready, listening, recognizing, pending review, success, and error states.
- `TeacherMoralReviewCard.tsx` reframes the card as `确认这位`, puts the child name first, and changes `补说` to the clearer `重说`.
- `styles.css` adds a P9 whiteboard layer for larger teacher confirmation controls, stronger child identity, larger expanded dock cards, and mobile active-flow minimums.
- `scripts/qa-visual.mjs` adds `classroom-touch-loop`, a whiteboard QA pass that completes 10 unique child turns, probes wrong-child taps during active stages, and checks post-success handoff feedback.
- Design record written to `docs/superpowers/specs/2026-06-05-p9-large-screen-classroom-loop-design.md`.

### Validation

- `git diff --check`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `npm run build`: passed.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- Latest visual QA generated at `2026-06-05T16:21:14.423Z`.
- QA coverage: 33 checks, 0 issues, 0 warnings.
- New P9 QA case: `classroom-touch-loop/whiteboard` completes 10 unique child self-service turns and checks both dock and map-callback wrong-child taps during active stages.
- Final read-only code review found no blocking issues. Its low-priority notes were addressed by updating this validation section and adding the map-callback wrong-child guard probe.
- Manual screenshots inspected:
  - `qa-artifacts/latest/classroom-touch-loop-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-whiteboard.png`
  - `qa-artifacts/latest/moral-review-safety-mobile.png`

## P10 trial classroom polish first slice

### Scope

- Started the P10 trial-classroom product closure with P10.1 and P10.2.
- Kept the existing classroom loop and product scope intact: child self-selects, says growth, teacher confirms, energy feedback plays, and the next child self-selects.
- Kept backend, server API, XP/ledger contracts, data files, generated assets, and PixiJS map structure unchanged.
- Did not add parent, reviewer, kindergarten admin, PDF export, approval flow, accounts, permissions, cloud sync, or a fixed next-child queue.

### UX/UI Review Notes

- Read-only UX review found the home screen still exposed too many first actions for a trial classroom: map taps, energy cards, scene gates, companion card, spirit dock, bottom module dock, and teacher affordance.
- Read-only UI review found the map dominated by area but not by attention because idle overlays were still too dense.
- Selected direction: keep the island as the first visual, make self-selection language clearer, and reduce always-visible idle microcopy without removing existing routes or interactions.

### Implementation Notes

- `SpiritDock.tsx` changes the collapsed selector from `当前 / 说成长` to the self-identification language `找我 / 点精灵`; expanded roster cards now say `点我`.
- `WorldMapContainer.tsx` simplifies the home scene gate to four compact entries with label and status only, removing reward/hint microcopy and numeric badges from the DOM.
- `styles.css` adds a P10 final home layer: calmer idle energy board, fewer visible idle energy cards, lighter scene gate, simplified companion action card, and a mobile 2x2 zoom cluster that still keeps 44px touch targets.
- The idle energy board intentionally exposes only current/lit energy cards visually and interactively; all seven energy states remain in the DOM and QA coverage.
- `scripts/qa-visual.mjs` now fails the home check if idle scene gates reintroduce trial-noise copy such as `贝签光`, `数学光`, `荣誉光`, `小票`, or `兑换`.
- `scripts/qa-visual.mjs` also checks that the idle home energy board does not visually show more than four energy cards.
- Design record written to `docs/superpowers/specs/2026-06-06-p10-trial-classroom-polish-design.md`.

### Validation

- `git diff --check`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `npm run build`: passed.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- Latest visual QA generated at `2026-06-05T17:03:32.565Z`.
- QA coverage: 33 checks, 0 issues, 0 warnings.
- New P10 QA assertions: idle scene gate microcopy is absent, and visible idle energy cards are capped.
- Final read-only code review found no blocking issues. Its medium notes were addressed by tightening dock aria labels, documenting idle energy-card exposure, and removing a redundant pointer-events suppression layer.
- Manual screenshots inspected:
  - `qa-artifacts/latest/home-whiteboard.png`
  - `qa-artifacts/latest/mobile-home-mobile.png`
  - `qa-artifacts/latest/moral-review-safety-mobile.png`

## P10 HUD state unity slice

### Scope

- Continued P10.3 and P10.4: HUD information de-noise and key active-state consistency.
- Kept the existing child self-service loop intact: child taps their own spirit, says growth, teacher confirms, energy feedback plays, and the next child self-selects.
- Kept backend, server API, XP/ledger contracts, data files, generated assets, and PixiJS map structure unchanged.
- Did not add parent, reviewer, kindergarten admin, PDF export, approval flow, accounts, permissions, cloud sync, or a fixed next-child queue.

### UX/UI Review Notes

- Read-only UX review found active moral flow had too many competing state surfaces: turn chip, map plaque, speech bubble, teacher card, energy board, and global feedback could all narrate the same state.
- Read-only UI review recommended treating ready/listening/recognizing/pending/success as focus mode and making one active state read as one system.
- Selected direction: standardize short state labels, hide duplicate map identity during active stages, make the active energy board stage-aware, and suppress global feedback until the post-success handoff.

### Implementation Notes

- `MoralSpeakOverlay.tsx` now uses the shared active-state vocabulary: `准备说`, `正在说`, `贝壳在听`, `等老师`, `请老师帮忙`, `已点亮`.
- `TeacherMoralReviewCard.tsx` simplifies the safe approval action from `确认点亮` to `点亮`, shortens skip to `跳过`, and aligns the status chip with `等老师` / `请老师帮忙`.
- `WorldMapContainer.tsx` aligns active energy-board state/value copy and removes the older `等待点亮` / `待点亮` mix.
- `App.tsx` clears duplicate global feedback when a child enters active self-service, blocks wrong-child taps without creating a new global toast, and suppresses the immediate self-service success toast while preserving the final `下一位可以点精灵` handoff.
- `styles.css` hides the map focus plaque for all non-idle moral stages, hides the energy board during ready/listening/recognizing, and keeps pending/success energy cues compact.
- `scripts/qa-visual.mjs` now checks that active stages do not show a duplicate map focus plaque, ready/listening/recognizing do not show the energy board, unsafe pending states put `请老师帮忙` in the turn chip, and success does not show duplicate global feedback.
- Design record written to `docs/superpowers/specs/2026-06-06-p10-hud-state-unity-design.md`.

### Validation

- `git diff --check`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `npm run build`: passed.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- Latest visual QA generated at `2026-06-05T17:53:37.569Z`.
- QA coverage: 33 checks, 0 issues, 0 warnings.
- Final read-only code review found no critical or high issues. Its medium note was addressed by making the pending turn chip result-aware, and its low QA note was addressed by adding recognizing-state coverage.
- Manual screenshots inspected:
  - `qa-artifacts/latest/moral-speak-flow-ready-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-pending-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-whiteboard.png`
  - `qa-artifacts/latest/moral-review-safety-mobile.png`

## P10 trial readiness QA and checklist slice

### Scope

- Continued P10.5 and P10.6: visual QA expansion and trial-classroom checklist documentation.
- Kept product scope unchanged: no parent, reviewer, kindergarten admin, PDF export, approval flow, accounts, permissions, cloud sync, fixed queueing, backend changes, data changes, or PixiJS map rewrite.
- Did not change product UI behavior; this slice only adds QA evidence and trial documentation.

### Implementation Notes

- `scripts/qa-visual.mjs` now captures two extra moral self-service artifacts on both whiteboard and mobile:
  - `moral-speak-flow-recognizing-*.png` for the `贝壳在听` state.
  - `moral-speak-flow-final-*.png` for the returned-to-island handoff state.
- The existing moral-flow assertions continue to prove that recognizing hides duplicate map focus plaque and energy board.
- `docs/trial-classroom-checklist.md` documents the trial setup, core classroom steps, exception paths, pass criteria, validation commands, required screenshots, and current non-goals.
- `docs/superpowers/specs/2026-06-06-p10-hud-state-unity-design.md` now lists the new recognizing and final whiteboard screenshots in its manual review set.

### Validation

- `git diff --check`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `npm run build`: passed.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- Latest visual QA generated at `2026-06-05T18:11:13.200Z`.
- QA coverage: 33 checks, 0 issues, 0 warnings.
- New P10.5 screenshot artifacts:
  - `qa-artifacts/latest/moral-speak-flow-recognizing-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-recognizing-mobile.png`
  - `qa-artifacts/latest/moral-speak-flow-final-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-final-mobile.png`
- Manual screenshots inspected:
  - `qa-artifacts/latest/moral-speak-flow-recognizing-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-final-whiteboard.png`
  - `qa-artifacts/latest/moral-speak-flow-recognizing-mobile.png`
  - `qa-artifacts/latest/moral-speak-flow-final-mobile.png`

## P11 Three.js spirit showcase POC

### Scope

- Added an isolated 3D spirit showcase effect preview for selected children.
- Kept the main island map on PixiJS and did not change backend, XP, ledger, moral review, data files, or classroom flow.
- Kept child self-service intact: children still tap their own spirit, say growth, wait for teacher confirmation, receive energy feedback, and the next child self-selects.
- Explicitly excluded weapon, skull, cannon, bomb, spike, saw, and other combat or hazard assets.

### Implementation Notes

- Added `three` and `@types/three`.
- Copied selected CC0 Quaternius runtime assets into `public/assets/3d/`.
- Added `SpiritShowcase3D.tsx`, a dynamically loaded Three.js preview modal with slow rotation, touch drag, model switching, growth chest prop, and PNG fallback when WebGL is unavailable.
- Added lightweight `看3D` / `3D` entry points on the right spirit card and collapsed/expanded bottom dock.
- Added `docs/3d-assets-license.md` to record runtime files, source files, CC0 license, and excluded asset categories.

### Validation

- `git diff --check`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `npm run build`: passed.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- Latest visual QA generated at `2026-06-06T03:12:26.248Z`.
- QA coverage: 35 checks, 0 issues, 0 warnings.
- New P11 screenshot artifacts:
  - `qa-artifacts/latest/spirit-showcase-3d-whiteboard.png`
  - `qa-artifacts/latest/spirit-showcase-3d-mobile.png`

## P11 frontend performance and clarity pass

### Scope

- Responded to the classroom-facing feedback that the frontend felt laggy and blurry after the 3D showcase slice.
- Kept the main map on PixiJS and kept the 3D showcase isolated from the child growth flow.
- Did not change backend, API contracts, XP logic, ledger writes, generated data files, classroom flow, permissions, PDF, approval flow, parent, reviewer, or admin scope.

### Diagnosis

- The map canvas had a fixed Pixi renderer resolution below 1x, so the whiteboard overview could look soft even when idle.
- The large whiteboard canvas could get expensive during wheel, drag, focus, and zoom interactions if it stayed at full backing resolution.
- The static map layer texture cache added large GPU texture pressure and could soften the focused map after cache refresh.
- The spirit layer attempted to load too many class spirit images up front, which made first-home rendering heavier than needed.
- The new Three.js preview used more GPU work than necessary for a small optional effect room.

### Implementation Notes

- `PixiWorld.ts` now uses adaptive render resolution: idle restores to at least 1x for clarity, while active touch, wheel, zoom, and focus temporarily drop to a lower resolution on large canvases.
- `PixiWorld.ts` exposes `data-render-resolution` on the map canvas so visual QA can prove whether blur is from an active performance state or an idle clarity bug.
- `WorldScene.ts` no longer caches ocean, island, and path layers as static textures, reducing GPU pressure and avoiding cache-softened focus views.
- `SpiritLayer.ts` now lazy-loads spirit artwork: the selected child loads immediately, the top few ranked children preload shortly after, and the rest stay on lightweight fallback art until selected.
- `SpiritShowcase3D.tsx` reduces optional 3D cost by capping pixel ratio by stage size, disabling real-time shadow maps, and lowering decorative geometry segments.
- `App.tsx` keeps moral-speak locked-child checks on the latest state ref so stale handlers and QA probes cannot interrupt the child self-service success handoff.
- `scripts/qa-visual.mjs` adds `QA_CHECKS`, records Pixi backing/CSS ratios, treats low render resolution as acceptable only during active map interaction, and hardens the moral self-service and 3D showcase checks.

### Validation

- `npm run build`: passed.
- `QA_CHECKS=home npm run qa:visual`: passed with 0 issues and 0 warnings.
- `QA_CHECKS=home,roll-call npm run qa:visual`: passed with 0 issues and 0 warnings.
- `QA_CHECKS=moral-speak-flow,classroom-touch-loop npm run qa:visual`: passed with 0 issues and 0 warnings.
- `npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- Latest visual QA generated at `2026-06-06T05:07:17.192Z`.
- QA coverage: 35 checks, 0 issues, 0 warnings.
- Latest home whiteboard render state: idle resolution 1x, backing ratio 1x, 60.8 fps static sample, 25 fps headless wheel sample without warning.
- Latest 3D showcase checks: whiteboard and mobile both open, render canvas, stay contained, show no forbidden combat copy, and report Pixi idle resolution 1x behind the modal.

## P11 whiteboard blur and stutter hotfix

### Scope

- Responded to the whiteboard feedback that the focused child self-service screen still looked blurry and stuttered.
- Kept the main map on PixiJS, kept the optional 3D showcase isolated, and did not change backend, API contracts, XP logic, ledger writes, data files, or classroom product scope.

### Diagnosis

- The main island surface asset is `1536x1024`, but the Pixi world scales it to roughly `2774px` wide before camera zoom. The previous child focus zoom near `1.88x` effectively enlarged map detail more than 3x, so the watercolor source art looked soft even with a 1x canvas backing store.
- Entering moral self-service changed the home shell grid from `1fr + 74px dock` to `1fr + 0`, forcing the large map canvas to resize from about `2032x918` to `2032x992`. That resize caused the visible stutter right after opening `准备说`.
- `focusChildOnHome` retried `focusSelected()` every 100ms even when the map ref was already available, repeatedly restarting the camera animation.
- Interaction downsampling is still useful for wheel/drag, but it must not run for automatic child focus because it makes the focused classroom state look blurry.

### Implementation Notes

- Lowered focused camera zooms in `cameraConfig.ts` so child focus stays close enough for self-service while avoiding heavy over-enlargement of the 1536px island art.
- Shortened the default focus animation duration.
- `PixiWorld.ts` now keeps automatic focus, region focus, and zoom-button moves at the base 1x render resolution; only direct drag/wheel interaction temporarily drops resolution, then idle restores to 1x.
- `App.tsx` now stops retrying `focusSelected()` once the map handle exists.
- Moral self-service no longer resizes the whole home shell; the bottom module dock keeps its layout slot but is hidden with `visibility: hidden` during the child flow.
- Increased growth handoff feedback duration so the `下一位可以点精灵` handoff remains visible after returning to island idle.
- On mobile pending review, the auxiliary child bubble and energy board are hidden so the teacher confirmation card has a clean touch area.

### Validation

- `git diff --check`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `npm run build`: passed.
- `QA_CHECKS=home npm run qa:visual`: passed with 0 issues and 0 warnings.
- `QA_CHECKS=moral-speak-flow npm run qa:visual`: passed with 0 issues and 0 warnings on whiteboard and mobile.
- `QA_CHECKS=classroom-touch-loop npm run qa:visual`: passed with 0 issues and 0 warnings.
- Latest classroom loop report: `qa-artifacts/latest/report.json`, generated at `2026-06-06T06:12:51.127Z`.
- Manual screenshot inspected: `qa-artifacts/latest/home-ready-select-focus-clear.png`.

## P11 hidpi map runtime pass

### Scope

- Continued the whiteboard clarity work after confirming the remaining softness came from source asset scale.
- Kept product behavior unchanged and did not regenerate AI art, rewrite PixiJS, or change backend, XP, ledger, classroom flow, data files, permissions, PDF, approval flow, parent, reviewer, or admin scope.

### Implementation Notes

- Added `scripts/generate-map-hidpi.mjs` and `npm run assets:map-hidpi`.
- Generated 8 targeted 2x WebP runtime assets under `public/assets/map/v4-runtime-hidpi/batch11/`:
  - 4 main island layers: shadow, side, surface, shoreline foam.
  - 4 large route layers: main loop, shell branch, stone branch, wood bridge network.
- Updated `src/game/v4MapAssets.ts` so only those large base/path layers use the hidpi runtime directory; all other 286 map runtime assets still use the existing compact `v4-runtime` directory.
- Runtime hidpi directory size is about `3.0 MB`.
- Home whiteboard resource budget increased from about `4.7 MB` WebP to `6.41 MB` WebP, with no visual QA warnings.

### Validation

- `npm run assets:map-hidpi`: generated 8 assets.
- `git diff --check`: passed.
- `node --check scripts/generate-map-hidpi.mjs`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `npm run build`: passed.
- `QA_CHECKS=home,moral-speak-flow,classroom-touch-loop npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- Latest visual QA generated at `2026-06-06T07:13:06.602Z`.
- QA coverage for this pass: 4 checks, 0 issues, 0 warnings.
- Manual screenshot inspected: `qa-artifacts/latest/home-ready-select-focus-hidpi.png`.

## P12 trial release stability gate

### Scope

- Added a trial-release gate for the current child self-service classroom flow.
- Kept product scope unchanged: no parent, reviewer, kindergarten admin, PDF export, approval flow, accounts, permissions, cloud sync, backend changes, data changes, XP changes, or PixiJS map rewrite.
- Did not change frontend behavior; this slice adds release commands, production preview smoke coverage, asset budget checks, and trial documentation.

### Implementation Notes

- Added `npm run qa:trial` to build the app, start local API/Vite services when needed, run only the trial-critical visual checks, and then enforce trial asset budgets.
- Added `npm run qa:trial:fast` for a shorter home and moral-speak regression pass.
- Added `scripts/check-trial-assets.mjs` to fail on visual QA warnings, missing trial results, failed images, home resource budget regressions, 3D fallback/forbidden copy, or hidpi runtime drift.
- Added `scripts/qa-preview-smoke.mjs` to start local API/preview services when needed, open the production preview with Playwright, capture a whiteboard screenshot, and fail on missing root, shell, Pixi canvas, current child entry, horizontal overflow, console errors, or resource failures.
- Updated `docs/trial-classroom-checklist.md` from P10 to P12 with exact trial commands, production preview checks, screenshot artifacts, and common failure triage.

### Validation

- `git diff --check`: passed.
- `node --check scripts/check-trial-assets.mjs`: passed.
- `node --check scripts/qa-trial.mjs`: passed.
- `node --check scripts/qa-preview-smoke.mjs`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `npm run build`: passed.
- `QA_CHECKS=classroom-touch-loop npm run qa:visual`: passed with 0 issues and 0 warnings.
- `npm run qa:trial`: passed.
- `npm run qa:preview-smoke`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- Latest visual QA generated at `2026-06-06T10:33:44.083Z`.
- P12 trial coverage: 6 checks, 0 issues, 0 warnings.
- Trial asset report: `qa-artifacts/latest/trial-assets-report.json`, hidpi runtime 8 files, `2.97 MB`.
- Preview smoke report: `qa-artifacts/latest/preview-smoke-report.json`, no failures.
- Preview screenshot: `qa-artifacts/latest/preview-smoke-home-whiteboard.png`.

## P13 bounded 3D product surfaces

### Scope

- Expanded the existing Three.js model usage beyond the standalone 3D modal without making the classroom island a 3D map.
- Kept product scope unchanged: no backend, XP, ledger, data file, parent, reviewer, kindergarten admin, PDF export, approval flow, accounts, permissions, cloud sync, or PixiJS map rewrite.
- Used 3D only where it behaves like product polish: profile cabin stage, success reward feedback, shop reward preview, and leaderboard honor preview.

### Implementation Notes

- Added `SpiritModelStage3D` and `RewardModelPreview3D` as shared bounded stages with lazy Three.js and GLTFLoader imports.
- Reused the existing friendly Quaternius runtime assets under `public/assets/3d/`; no weapon, skull, bomb, spike, saw, cannon, or combat prop was introduced.
- Updated the standalone `SpiritShowcase3D` modal to reuse the shared spirit stage.
- Replaced the profile cabin 2D portrait with an interactive 3D spirit stage plus small growth chest/star props.
- Added compact reward previews to the moral success bubble, shop intent card, and leaderboard selected child token.
- Reward previews are passive (`pointer-events: none`) and support reduced-motion behavior; profile/showcase are the only draggable 3D surfaces.
- Extended visual QA so profile, shop, leaderboard, and moral success now assert the new 3D stages, passive reward previews, and bounded layout.

### Validation

- `git diff --check`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `npm run build`: passed.
- `QA_CHECKS=child-profile,shop,leaderboard,moral-speak-flow npm run qa:visual`: passed with 5 results, 0 issues, and 0 warnings.
- `npm run qa:trial:fast`: passed; home whiteboard, moral-speak whiteboard, and moral-speak mobile all reported 0 issues and 0 warnings.
- Latest visual QA report: `qa-artifacts/latest/report.json`, generated by `qa:trial:fast` at `2026-06-06T11:47:48.382Z`.
- Latest trial asset report: `qa-artifacts/latest/trial-assets-report.json`, hidpi runtime 8 files, `2.97 MB`.
- Manual screenshots inspected: `qa-artifacts/latest/child-profile-whiteboard.png`, `qa-artifacts/latest/shop-whiteboard.png`, `qa-artifacts/latest/leaderboard-whiteboard.png`, and `qa-artifacts/latest/moral-speak-flow-whiteboard.png`.

## P15 baked 3D island prop layer

### Scope

- Brought the uploaded `model/ultimateplatformer` glTF assets onto the main island without converting the PixiJS map into a live Three.js scene.
- Kept product scope unchanged: no backend, XP, ledger, data file, parent, reviewer, kindergarten admin, PDF export, approval flow, accounts, permissions, cloud sync, or PixiJS map rewrite.
- Continued to exclude weapon, skull, bomb, cannon, spike, saw, and other combat/hazard assets.

### Implementation Notes

- Added `scripts/bake-map-3d-props.mjs` to render 25 safe glTF source models into transparent WebP map props.
- Runtime props live under `public/assets/map/3d-props/p15/`; manifest, source PNGs, and QA contact sheet live under `assets/generated/map-3d-props/p15/`.
- Added P15 prop URLs to `v4MapAssets` and placed all 25 props through the existing `mapPlacementConfig` / `DecorationLayer` pipeline.
- Covered home groves, paths, shell/pearl/sun residential areas, old-street shop rewards, and the honor stage with visible model-derived props.
- Made only the shop chest and honor star/flag interactive, opening existing `shop` and `leaderboard` modules; decorative props do not intercept input.
- P15 props bypass the old delayed decoration load so they are visible in the initial island view.
- Added a lightweight Pixi energy-arrival effect for child self-service success so energy flies into the selected child's home without changing ledger behavior.
- Extended visual QA to assert all 25 P15 island props load on home whiteboard and ultra viewports, while keeping the home WebP budget under the existing 7 MB gate.

### Validation

- `P15_FORCE=1 node scripts/bake-map-3d-props.mjs`: generated 25 runtime props, total `0.11 MB`.
- `node --check scripts/bake-map-3d-props.mjs`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `git diff --check`: passed.
- `npm run build`: passed.
- `npm run qa:trial`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`, generated at `2026-06-06T14:47:28.229Z`.
- Trial QA coverage: home whiteboard, home ultra, moral-speak whiteboard/mobile, classroom-touch-loop whiteboard, spirit-showcase whiteboard/mobile; all reported 0 issues and 0 warnings.
- Home QA loaded P15 props `25/25`; home WebP budget stayed at `6.37 MB`.
- Latest trial asset report: `qa-artifacts/latest/trial-assets-report.json`, hidpi runtime 8 files, `2.97 MB`, no failures.
- Manual screenshots inspected: `qa-artifacts/latest/home-whiteboard.png` and `assets/generated/map-3d-props/p15/p15-map-3d-props-qa.png`.

## P16 baked village prop density pass

### Scope

- Added a second baked map-prop layer so the main island has clearer house, shop, honor, and path scenery.
- Kept product scope unchanged: no backend, XP, ledger, data file, parent, reviewer, kindergarten admin, PDF export, approval flow, accounts, permissions, cloud sync, or PixiJS map rewrite.
- Continued to exclude weapons, monsters, skulls, bombs, cannons, spikes, saws, traps, fire/smoke props, and other combat or hazard language.

### Implementation Notes

- Added `scripts/bake-map-3d-props-p16.mjs` to render `ultimateplatformer` glTF and `medievalvillage` OBJ/MTL assets into transparent WebP props.
- Rejected `Inn.obj`, `Mill.obj`, and `Well.obj` after QA contact-sheet review because their first bake read as too wireframe-like.
- Accepted 31 props and generated runtime assets under `public/assets/map/3d-props/p16/`; QA/source files and manifest live under `assets/generated/map-3d-props/p16/`.
- Added P16 prop URLs to `v4MapAssets` and placed all 31 props through the existing map placement pipeline.
- Covered growth plaza, mangrove, shell bay, pearl bay, sun town, honor plaza, and old-street shop with visible model-derived scenery.
- Made only a few semantic hotspots interactive: growth heart opens `child-profile`, shop stands open `shop`, honor bell tower/bell open `leaderboard`.
- Extended map hotspot types to support `child-profile` without adding a new module or changing existing module routing.
- P16 props bypass delayed decoration loading like P15, while runtime size stays small.
- Brightened OBJ materials during baking so village props do not appear as black blocks on the soft island map.
- Extended visual QA and trial asset QA to assert P16 map props load on home whiteboard/ultra and stay under the P16 WebP budget.

### Validation

- `P16_FORCE=1 node scripts/bake-map-3d-props-p16.mjs`: generated 31 runtime props, total about `0.19 MB`.
- `node --check scripts/bake-map-3d-props-p16.mjs`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `node --check scripts/check-trial-assets.mjs`: passed.
- `npm run build`: passed.
- `npm run qa:trial`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`, generated at `2026-06-06T15:44:46.669Z`.
- Trial QA coverage: home whiteboard/ultra, moral-speak whiteboard/mobile, classroom-touch-loop whiteboard, spirit-showcase whiteboard/mobile; all reported 0 issues and 0 warnings.
- Home QA loaded P16 props `31/31`; P16 prop size was `0.19 MB`; home WebP budget stayed at `6.56 MB`.
- Latest trial asset report: `qa-artifacts/latest/trial-assets-report.json`, P16 prop budget passed and hidpi runtime remained `2.97 MB`.
- Manual screenshots inspected: `qa-artifacts/latest/home-whiteboard.png` and `assets/generated/map-3d-props/p16/p16-map-3d-props-qa.png`.

## P17 child self-selection and island hotspot closure

### Scope

- Made the main island props participate in the child self-service loop instead of only adding more scenery.
- Kept product scope unchanged: no backend, XP, ledger, data file, parent, reviewer, kindergarten admin, PDF export, approval flow, accounts, permissions, cloud sync, queue algorithm, or PixiJS map rewrite.
- Kept children in control: the next child still self-selects their own spirit after the prior confirmation returns to idle.

### Implementation Notes

- Added a focused map interaction type, `self-service`, for props that should start the current child's growth-speaking loop.
- Wired only two growth-area props as self-service hotspots: `p15-growth-tree` and `p16-growth-heart`.
- Left shop and honor props on their existing routes, so shop props still open `shop` and honor props still open `leaderboard`.
- Added small non-text Pixi hotspot dots only to four representative props, `p15-growth-tree`, `p16-growth-heart`, `p15-shop-chest`, and `p16-honor-bell-tower`, so the island reads as touchable without adding another text panel or cluttering every prop.
- Connected Pixi `self-service` taps back to the existing `focusChildOnHome(childId, { prepareMoralSpeak: true })` path, so the same ready/listening/review/success state machine is reused.
- Tightened bottom spirit dock language to `点我说` and added QA data markers for dock self-service entries.
- Added runtime canvas metadata for self-service hotspot count and ids, which lets visual QA prove the map is wired.
- Added a QA-only island hotspot hook that reuses the same self-service function and does not change production data or business logic.

### Validation

- `node --check scripts/qa-visual.mjs`: passed.
- `git diff --check`: passed.
- `npm run build`: passed.
- `QA_CHECKS=home,moral-speak-flow,classroom-touch-loop npm run qa:visual`: passed.
- Latest visual QA report: `qa-artifacts/latest/report.json`.
- P17 QA coverage: home whiteboard/ultra, moral-speak whiteboard/mobile, classroom-touch-loop whiteboard; all reported 0 issues and 0 warnings.
- Home QA confirmed dock self-service entry exists and runtime map self-service hotspots are `p16-growth-heart,p15-growth-tree`.
- Moral-flow QA confirmed the island hotspot enters `ready`, dock selection enters `ready` for 3 children, and the classroom loop enters `ready` for 10 children.
- Manual screenshots inspected: `qa-artifacts/latest/home-whiteboard.png`, `qa-artifacts/latest/moral-speak-flow-ready-whiteboard.png`, and `qa-artifacts/latest/moral-speak-flow-whiteboard.png`.

## P17 runtime clarity and touch performance patch

### Scope

- Responded to large-screen feedback that the home map looked blurry and felt laggy after zooming or dragging.
- Kept product scope unchanged: no backend, XP, data, queue, parent, reviewer, kindergarten admin, PDF, account, permission, or PixiJS map rewrite.
- Preserved the P15/P16 model-derived island props and the P17 child self-service hotspot loop.

### Implementation Notes

- Confirmed the blur was caused by interactive Pixi render resolution dropping to `0.46x` on a whiteboard-size canvas.
- Raised interaction render quality so whiteboard drag/wheel states stay around `0.78x` instead of `0.46x`, then return to `1.00x` after the interaction settles.
- Shortened post-interaction wake time so one wheel/touch event no longer keeps the full whiteboard canvas rendering for about two seconds.
- Lowered active Pixi ticker cap to reduce main-thread pressure during large-canvas interaction.
- Changed baked P15/P16 map props from all-at-once loading to staged loading: key growth/shop/honor props appear first, remaining decorative props load in a short stagger.
- Strengthened visual QA to fail if interaction render resolution drops back toward the old low-resolution path.

### Validation

- Reproduced the issue with a whiteboard viewport: drag render backing was `0.46x` before the patch.
- After the patch, wheel/touch interaction backing is `0.78x` and idle backing returns to `1.00x`.
- Targeted wheel/stillness sample improved from about `8.3 FPS` to about `49-50 FPS` in the headless whiteboard check.
- Continuous drag remains heavier in headless software rendering, about `13 FPS`; it should be rechecked on the physical classroom display/GPU before adding more main-map effects.
- `node --check scripts/qa-visual.mjs`: passed.
- `git diff --check`: passed.
- `npm run build`: passed.
- `QA_CHECKS=home npm run qa:visual`: passed with 0 issues and 0 warnings on home whiteboard/ultra.
- Memory check, development home page: JS heap about `25-34 MB`; Vite dev server about `370 MB RSS`; local API about `67 MB RSS`.
- Memory check, production preview home page: JS heap about `18-20 MB`; headless Chrome process tree about `1.79 GB RSS`, dominated by software GPU/renderer processes.

## P17.1 active interaction QA and low-power drag patch

### Scope

- Tightened the performance validation for the previously reported blurry and laggy large-screen map.
- Kept product scope unchanged: no backend, XP, data, queue, parent, reviewer, kindergarten admin, PDF, account, permission, or PixiJS map rewrite.
- Preserved the child self-service loop, map hotspots, dock behavior, teacher confirmation card, and 3D prop scenery.

### Implementation Notes

- Replaced optimistic wheel FPS sampling with a true short active-window metric, so QA no longer reports only the post-idle recovery state.
- Added active drag FPS measurement to home QA.
- Added `home-performance-soak` visual QA for sustained whiteboard dragging, with configurable `QA_SOAK_MS` and `QA_SOAK_SAMPLE_MS`.
- Changed Pixi pointer handling so hover movement no longer wakes the full map renderer.
- Changed mouse wheel over the map to only prevent page scrolling; it no longer resizes or wakes Pixi because zoom is controlled by the map buttons.
- Added sustained drag low-power mode: active drag uses `drag-low-power` render resolution, then returns to `1.00x` after release.
- Exposed `data-interaction-mode` on the Pixi canvas so QA can distinguish idle, wheel, touch, and low-power drag states.

### Validation

- New active home QA first reproduced the hidden issue:
  - Before low-power drag: whiteboard active drag about `8.3 FPS`, ultra active drag about `6.4 FPS`.
  - Before wheel simplification: whiteboard active wheel about `10.3 FPS`.
- After low-power drag and wheel simplification:
  - `QA_CHECKS=home npm run qa:visual`: home whiteboard reported 0 issues and 0 warnings.
  - Home ultra still reports headless warnings near the extreme viewport: wheel about `17.5 FPS`, drag about `16.2 FPS`; idle returns to `1.00x`.
- `QA_CHECKS=home-performance-soak QA_SOAK_MS=120000 QA_SOAK_SAMPLE_MS=10000 npm run qa:visual`: passed with 0 issues and 0 warnings.
- Two-minute soak result: sustained whiteboard drag about `18 FPS`, max frame gap about `183.4 ms`, JS heap delta `0 MB`, low-power drag resolution `0.60x`, release returns to `1.00x`.
- `QA_CHECKS=moral-speak-flow,classroom-touch-loop npm run qa:visual`: passed with 0 issues and 0 warnings across moral-speak whiteboard/mobile and classroom-touch-loop whiteboard.
- `node --check scripts/qa-visual.mjs`: passed.
- `git diff --check`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.

## P17.2 drag flicker and sustained touch stability patch

### Scope

- Responded to the observed issue that moving around the island could flash during touch/drag.
- Kept product scope unchanged: no backend, XP, data, queue, parent, reviewer, kindergarten admin, PDF, account, permission, or PixiJS map rewrite.
- Preserved all P15/P16 island model props and the P17 child self-service loop.

### Implementation Notes

- Removed dynamic drag-time renderer resolution switching. The canvas no longer jumps between crisp and low-power backing sizes while a child or teacher drags the map.
- Changed large-screen base render resolution to a stable `0.95-0.96x` range instead of switching down during drag; this keeps the map visually close to crisp while reducing large whiteboard pixel pressure.
- Cached static Pixi layers: ocean, island, regions, paths, decorations, and labels. Homes, spirits, effects, and stateful interaction remain dynamic.
- During drag, the label cache is temporarily not rendered, then restored after idle, reducing text-layer cost without hiding the dock or DOM controls.
- Delayed async asset loading, sprite mounting, and static-cache refresh while the map is actively being dragged. This prevents delayed WebP decode/mount work from causing visible drag-time flashes.
- Added QA metrics for active drag/wheel, sustained soak, render-resolution stability, interaction mode, P95/P99 frame gaps, heap delta, and dock/map self-service markers.
- Fixed a repeated moral-speak timer cleanup issue where executed timer ids stayed in the ref and could affect later children in a long classroom loop.
- Hardened visual QA around dock visibility and handoff feedback so it reads the actual visible dock entry and does not miss a feedback message that was already observed during success-to-idle handoff.

### Validation

- `node --check scripts/qa-visual.mjs`: passed.
- `git diff --check`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.
- `QA_CHECKS=home npm run qa:visual`: home whiteboard reported 0 issues; latest run had one headless warning, active drag about `16.6 FPS`. Home ultra remains a headless stress viewport with drag warnings.
- `QA_CHECKS=moral-speak-flow npm run qa:visual`: whiteboard and mobile passed with 0 issues and 0 warnings.
- `QA_CHECKS=classroom-touch-loop npm run qa:visual`: whiteboard passed with 0 issues and 0 warnings after the timer cleanup fix.
- `QA_CHECKS=home-performance-soak QA_SOAK_MS=120000 QA_SOAK_SAMPLE_MS=10000 npm run qa:visual`: passed with 0 issues and one average-FPS warning.
- Final two-minute soak result: average `15.9 FPS` in headless, P95 frame gap `83.3 ms`, P99 frame gap `116.7 ms`, max single outlier `866.7 ms`, JS heap delta `0 MB`, render resolution stable at `0.96x`, and release returned to idle.
- The remaining warning is a headless/software-rendering average FPS warning, not a render-resolution drop or memory leak. Recheck on the physical classroom display/GPU before adding more live main-map effects.

## P17.3 icon-only mic and touch drag detail shedding patch

### Scope

- Responded to three latest whiteboard observations: map movement still feels laggy, the bottom module dock disappeared during the prepared speaking state, and the microphone button should not show text inside the circle.
- Kept product scope unchanged: no backend, XP, data, queue, parent, reviewer, kindergarten admin, PDF, account, permission, or PixiJS map rewrite.
- Preserved the P15/P16 island props and P17 child self-service loop.

### Implementation Notes

- Kept the AppShell bottom module dock visible through ready/listening/review/success moral-speak stages, so zooming or preparing to speak no longer leaves an empty bottom strip.
- Removed the visible `说成长` text from the circular microphone button while keeping its accessible `aria-label` as the action label.
- Updated moral-flow QA so it now expects an icon-only mic on screen and verifies the accessible label instead of visible button copy.
- Added drag-time detail shedding: while the map is actively being dragged, Pixi pauses decoration props, labels, and effects, then restores them when interaction returns to idle.
- Kept render resolution stable at `0.95-0.96x`; this patch does not reintroduce drag-time canvas resize, avoiding the earlier flash path.
- Tested disabling static layer caching entirely; it made drag performance worse, so the static cache remains enabled for ocean, island, regions, paths, and decorations.

### Validation

- `npm run typecheck`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.
- `git diff --check`: passed.
- `QA_CHECKS=home npm run qa:visual`: passed with 0 issues. Whiteboard active drag improved to about `19 FPS`; ultra active drag remains a headless stress warning at about `11 FPS`.
- `QA_CHECKS=moral-speak-flow npm run qa:visual`: whiteboard and mobile passed with 0 issues and 0 warnings.
- Ready-state screenshot inspected: `qa-artifacts/latest/moral-speak-flow-ready-whiteboard.png`; the bottom module dock is visible and the mic circle is icon-only.

## P17.4 whiteboard drag stability and cache-thrash patch

### Scope

- Responded to the latest classroom-readiness concern: the island still felt too laggy for normal use, moving around the island could flash, and the selected spirit appeared frozen during drag.
- Kept product scope unchanged: no backend, XP, data, queue, parent, reviewer, kindergarten admin, PDF, account, permission, or PixiJS map rewrite.
- Preserved P15/P16 island props while reducing their runtime loading/cache impact.

### Implementation Notes

- Reverted the drag-time hiding of decorations, labels, and effects. The map no longer flashes because visual layers stay renderable during movement.
- Kept the selected spirit breathing/floating during active drag with a lightweight selected-only update path, so it no longer looks stuck while the map is moving.
- Added medium active-interaction render resolution: large screens temporarily render at about `0.78x`, ultra at about `0.72x`, then return to `0.95-0.96x` after release. This avoids the old severe blur while restoring touch smoothness.
- Changed static cache refresh after asset loads from immediate per-asset rebuilds to a `520ms` debounce. Multiple delayed image loads now collapse into one cache refresh instead of repeatedly rebuilding the large static map texture.
- Changed legacy decoration loading from one `8.5s` burst to a staggered queue starting at `5.2s`, stepping by `220ms`, reducing late decode/cache spikes.
- Kept JS heap monitoring in QA. Latest samples show the issue is not memory growth; heap stays stable around `30MB` with `0MB` delta in the soak run.
- Tried enabling Pixi viewport wheel zoom, but it worsened active wheel and ultra drag. That experiment was reverted; right-side zoom buttons remain the intended classroom zoom control.

### Validation

- `npm run typecheck`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `QA_CHECKS=home npm run qa:visual`: whiteboard passed with 0 issues; idle and drag warnings cleared. One synthetic wheel warning remains.
- `QA_CHECKS=home-performance-soak QA_SOAK_MS=30000 npm run qa:visual`: whiteboard sustained drag passed with 0 issues and 0 warnings.
- `QA_CHECKS=moral-speak-flow,classroom-touch-loop npm run qa:visual`: whiteboard/mobile moral-speak and classroom touch loop passed with 0 issues and 0 warnings.
- Remaining risk: ultra `2560x1440` headless stress viewport still reports active drag/wheel warnings. Treat it as a stress case until tested on the actual classroom display/GPU.

## P17.5 map overlay and prop readability cleanup

### Scope

- Responded to the latest visual review screenshots where close zoom showed debug-like blue region outlines/dots and non-current spirit fallback faces crowding nearby homes.
- Also removed the most out-of-style baked 3D props from the main classroom island: high-saturation blue/orange village houses, the black tower, and the stray pearl-bay blue gem.
- Kept product scope unchanged: no backend, XP, data, queue, parent, reviewer, kindergarten admin, PDF, account, permission, or PixiJS map rewrite.

### Implementation Notes

- Changed virtue region energy feedback from full-region polygon strokes and scattered dots to a small badge-local aura. It now reads as growth energy feedback instead of a debug selection layer.
- Hidden non-selected spirits once the camera is in close home focus, so only the selected child's spirit stays visible and floating.
- Added a baked-prop rejection list in `DecorationLayer.ts` so problematic model-derived props are not requested or mounted at runtime.
- Updated visual QA thresholds from "all generated props must load" to "accepted visible map props must be present": at least 24 P15 and 24 P16 props.
- Kept the semantic hotspots that matter for the child self-service loop, shop, and honor routes.

### Validation

- `npm run typecheck`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `node --check scripts/check-trial-assets.mjs`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.
- `QA_CHECKS=home npm run qa:visual`: whiteboard/ultra passed with 0 issues; home whiteboard kept 24 P15 and 24 P16 accepted map props, whiteboard drag sampled about `20.7 FPS`, and idle render resolution returned to `0.96x`.
- `QA_CHECKS=moral-speak-flow,classroom-touch-loop npm run qa:visual`: whiteboard/mobile moral-speak and classroom touch loop passed with 0 issues and 0 warnings.
- Close-zoom screenshots inspected: `qa-artifacts/latest/home-close-anan-after-cleanup.png` and `qa-artifacts/latest/home-close-qingqing-after-cleanup.png`.
- Remaining risk: synthetic headless wheel still reports low FPS/frame-gap warnings. The visible close-zoom artifacts are removed; physical whiteboard testing is still needed for final touch-smoothness acceptance.

## P17.6 selected spirit idle motion patch

### Scope

- Responded to the latest close-zoom observation that the selected spirit looked stuck and no longer had a clear up/down floating effect.
- Kept product scope unchanged: no backend, XP, data, queue, parent, reviewer, kindergarten admin, PDF, account, permission, or PixiJS map rewrite.

### Implementation Notes

- Added a focused-view idle animation mode in `PixiWorld.ts`: after the map settles on a selected child, Pixi keeps a low-cost `24fps` loop running only for the selected spirit.
- `WorldScene.ts` now supports a selected-idle update path that skips region, home, decoration, and effect animation work.
- Increased close-focus selected spirit floating amplitude in `SpiritLayer.ts`, so the selected spirit visibly breathes/floats while waiting for the child to speak.
- Exposed lightweight canvas QA markers: `data-selected-idle-animation`, `data-selected-spirit-body-y`, and `data-selected-spirit-visible`.

### Validation

- Manual Playwright sampling after focused idle showed `data-render-state="idle-animating"` and selected spirit `bodyY` changing over time, for example `-7.93 -> -0.07 -> -3.45`.
- `npm run typecheck`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.
- `QA_CHECKS=home npm run qa:visual`: whiteboard/ultra passed with 0 issues; remaining warnings are the existing headless wheel/FPS warnings.
- `QA_CHECKS=moral-speak-flow,classroom-touch-loop npm run qa:visual`: whiteboard/mobile moral-speak and classroom touch loop passed with 0 issues and 0 warnings.

## P17.7 crisp touch performance patch

### Scope

- Responded to the agent review and classroom feedback that the map still felt carded during island movement, while the fix must not rely on lowering render clarity.
- Kept product scope unchanged: no backend, XP, data, queue, parent, reviewer, kindergarten admin, PDF, account, permission, or PixiJS map rewrite.

### Implementation Notes

- Removed the remaining active drag/wheel render downsampling path. Home map active and settled states now keep `1x` render/backing resolution.
- Raised home visual QA render-resolution gates to `0.99` for both active interaction and settled idle states so future patches cannot silently trade clarity for FPS.
- Changed mouse wheel over the map to only prevent page scrolling. Wheel no longer wakes Pixi or resizes the renderer; classroom zoom remains on the map zoom buttons.
- Throttled pointer-move wake work and capped active Pixi ticking at `30fps`, reducing input-loop pressure without lowering canvas resolution.
- Stopped delayed asset loads from repeatedly waking the full map ticker. Asset loads now only mark the static cache dirty, then merge cache refreshes and render once when idle.
- Merged ocean, island, region, path, and decoration layers under one `staticRoot` cache at `1x`, reducing large static texture draw count while keeping native clarity.
- Changed region-energy cache refresh to run only when region energy content changes, rather than on every selected-child/data update.
- Limited selected-spirit body position dataset writes to QA URLs and at most every `120ms`; production no longer writes those animation metrics every frame.

### Validation

- `npm run typecheck`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.
- `QA_CHECKS=home npm run qa:visual`: whiteboard and ultra passed with 0 issues. Whiteboard passed with 0 warnings; active drag sampled `23 FPS`, wheel sampled `61.8 FPS`, and active/settled backing stayed at `1x`. Ultra remains a headless stress viewport with active drag warning at `17.1 FPS`.
- `QA_CHECKS=home-performance-soak QA_SOAK_MS=120000 QA_SOAK_SAMPLE_MS=10000 npm run qa:visual`: passed with 0 issues and 0 warnings. Two-minute sustained drag averaged `25.5 FPS`, P95/P99 frame gap `50.1 ms`, JS heap delta `0 MB`, and all samples stayed at `1x` render/backing resolution.
- `QA_CHECKS=moral-speak-flow,classroom-touch-loop npm run qa:visual`: whiteboard/mobile moral-speak and classroom touch loop passed with 0 issues and 0 warnings.
- Manual Playwright selected-idle sampling after focusing the current spirit showed `data-render-state="idle-animating"` and bodyY changing over time, for example `-4.45 -> -9.69 -> -0.05`.

## P18.1 profile cabin unique 2D spirit stage

### Scope

- Changed the spirit cabin main stage so each child is represented by their own generated 2D spirit thumbnail, rather than one of the shared safe 3D spirit models.
- Kept the cabin product scope unchanged: no backend, XP, ledger, data, moral-speak, microphone chat, account, permission, PDF, approval, or parent/reviewer/admin work.

### Implementation Notes

- `ChildProfileModule.tsx` now renders the selected child's `getSpiritAsset(...)` result as the cabin's primary spirit, with `data-spirit-id` and `data-spirit-state` markers for QA.
- The 3D layer is reduced to a small passive star prop in the cabin corner. It uses the existing reward 3D preview, does not intercept pointer input, and no longer reads as the child's identity.
- Added a small floating motion, aura, and floor shadow around the 2D spirit, with `prefers-reduced-motion` disabling the animation.
- Fixed the mobile profile layout so the cabin stage stays within the viewport instead of centering the spirit inside an oversized grid track.
- Updated profile visual QA to require a unique 2D spirit main visual and passive cabin atmosphere prop, replacing the old "3D cabin stage" requirement.

### Validation

- `npm run typecheck`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.
- `QA_CHECKS=child-profile,mobile-child-profile npm run qa:visual`: whiteboard and mobile passed with 0 issues and 0 warnings.
- Screenshots inspected: `qa-artifacts/latest/child-profile-whiteboard.png` and `qa-artifacts/latest/mobile-child-profile-mobile.png`.

## P18.2 profile cabin stage atmosphere cleanup

### Scope

- Responded to the visual review that the red-boxed cabin star prop looked like an unclear tiny object beside the child's spirit.
- Kept the product scope unchanged: no backend, XP, ledger, data, moral-speak, microphone chat, account, permission, PDF, approval, or parent/reviewer/admin work.

### Implementation Notes

- Kept the selected child's unique 2D spirit as the cabin's main identity and largest visual object.
- Changed the passive 3D reward prop from a small right-corner object into a soft floor-level atmosphere accent behind the spirit.
- The 3D prop remains non-interactive and hidden from accessibility semantics, so children should read the stage as one spirit with energy glow rather than two competing characters.

### Validation

- `npm run build`: passed with the existing `three.module` large chunk warning.
- `QA_CHECKS=child-profile,mobile-child-profile npm run qa:visual`: whiteboard and mobile passed with 0 issues and 0 warnings.
- Screenshot inspected: `qa-artifacts/latest/child-profile-whiteboard.png`.

## P19 model asset usage pass

### Scope

- Continued the model-asset utilization plan across five product surfaces: child home surroundings, shop area, honor area, growth feedback landing, and the spirit cabin interior.
- Kept classroom performance constraints unchanged: no PixiJS map rewrite, no live Three.js main island, no backend, XP, ledger, data, account, permission, PDF, parent/reviewer/admin, or approval-flow changes.

### Implementation Notes

- `HomeLayer.ts` now gives each child home one or two model-derived props, such as fruit trees, bushes, benches, fences, crates, gems, hearts, fruit, and star pads.
- Home props render through the existing baked WebP asset pipeline and are only visible for the selected home or close zoom. A first attempt kept them always visible, but a 30-second drag soak dropped to `14.5 FPS`; moving them into the close/selected decor layer restored the soak to 0 warnings.
- `mapPlacementConfig.ts` makes shop and honor props more legible: shop chest, coins, gems, and market stands are larger; honor star, flag, and bell are larger; growth plaza gets an additional star-pad landing prop.
- `DecorationLayer.ts` treats the new growth star pad, shop stand, and honor star as priority/hinted map props where appropriate.
- `ChildProfileModule.tsx` adds two model-derived room props beside the 2D spirit. These are decorative WebP room pieces, while the child's unique 2D spirit remains the main identity.
- Profile visual QA now asserts that the spirit cabin includes model-derived room props.

### Validation

- `npm run typecheck`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `git diff --check`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.
- `QA_CHECKS=home,child-profile,mobile-child-profile npm run qa:visual`: home whiteboard, profile whiteboard, and mobile profile passed with 0 issues and 0 warnings. Ultra still has the existing headless active-drag warning.
- `QA_CHECKS=home-performance-soak QA_SOAK_MS=30000 npm run qa:visual`: passed with 0 issues and 0 warnings after moving home props into the selected/close decor layer.
- `QA_CHECKS=classroom-touch-loop npm run qa:visual`: passed with 0 issues and 0 warnings.
- Manual close-focus screenshot inspected: `qa-artifacts/latest/p19-home-props-close-whiteboard.png`.

## P20 model prop visibility and LOD pass

### Scope

- Tightened the model-asset plan so the island reads as richer at close range without making the full classroom map noisy or slower.
- Kept the same product boundaries: no backend, XP, ledger, data, account, permission, PDF, parent/reviewer/admin, approval-flow, or PixiJS map rewrite.
- Continued using baked WebP model props on the main island. Live Three.js remains limited to bounded module surfaces, not the classroom map.

### Implementation Notes

- `DecorationLayer.ts` now applies a simple model-prop LOD: key interactive/priority props stay visible in island overview, while non-interactive baked model props appear only after zooming into detail range.
- `WorldScene.ts` wires the decoration LOD into the camera zoom loop without refreshing the static map cache during active drag/wheel interaction. Detail props update after interaction settles, avoiding zoom flicker and frame spikes.
- `PixiWorld.ts` exposes QA-only map prop LOD metrics on the canvas, including mode, visible count, detail-only count, and total count.
- `HomeLayer.ts` keeps each child's home props in the selected/close decor layer, widens the close-range visibility window, and slightly enlarges home-side props so they read as real trees, benches, fences, crates, gems, hearts, fruit, or star pads.
- `styles.css` slightly enlarges the spirit-cabin baked room props. The child's unique 2D spirit remains the primary cabin character.
- `qa-visual.mjs` now asserts selected-spirit idle float in focused mode. This directly guards against the reported "spirit gets stuck and no longer floats" problem.

### Validation

- `npm run typecheck`: passed.
- `node --check scripts/qa-visual.mjs`: passed.
- `git diff --check`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.
- `QA_BASE_URL=http://127.0.0.1:5175 QA_CHECKS=home,child-profile,mobile-child-profile npm run qa:visual`: home whiteboard, home ultra, profile whiteboard, and mobile profile passed with 0 issues and 0 warnings. Selected-spirit float sampled successfully with a `6.23px` movement range in focused idle mode.
- `QA_BASE_URL=http://127.0.0.1:5175 QA_CHECKS=home-performance-soak QA_SOAK_MS=30000 npm run qa:visual`: passed with 0 issues and 0 warnings.
- `QA_BASE_URL=http://127.0.0.1:5175 QA_CHECKS=classroom-touch-loop,moral-speak-flow npm run qa:visual`: whiteboard/mobile moral-speak and classroom touch loop passed with 0 issues and 0 warnings.

## P21 profile cabin moral-speak loop

### Scope

- Added the child self-service growth loop to the spirit cabin so children can start "say growth" from their own cabin, not only from the island map.
- Kept the same classroom product boundary: no backend schema, XP rules, ledger contract, data files, account, permission, PDF, parent/reviewer/admin, approval-flow, or PixiJS map rewrite changes.
- Kept the cabin identity hierarchy: the selected child's unique 2D spirit stays primary, while 3D/model props remain passive room atmosphere.

### Implementation Notes

- `ChildProfileModule.tsx` now accepts the existing moral-speak view state and callbacks, then renders the shared `MoralSpeakOverlay` inside the cabin stage.
- The cabin stage gets a coral `说成长` microphone entry. When activated, it enters `ready`, `listening`, `pendingReview`, and `success` using the same state machine as the home island.
- `TeacherMoralReviewCard` is reused inside the cabin stage for pending reviews, so teacher confirmation, correction, respeak, and skip actions remain one shared implementation.
- `App.tsx` now allows moral-speak state to stay active on `child-profile`; switching to other non-home modules still clears it.
- Added a QA-only clear hook so profile visual QA can enter the ready state and return the cabin to idle without affecting later checks.
- `styles.css` scopes the moral overlay and teacher card to the cabin stage, adds reduced-motion-safe success lighting on cabin room props, and keeps the microphone inside the stage without covering the roster or bottom dock.
- `qa-visual.mjs` now asserts that the cabin has a usable `说成长` entry and that clicking it enters a ready overlay contained inside the cabin stage.

### Validation

- `node --check scripts/qa-visual.mjs`: passed.
- `npm run typecheck`: passed.
- `git diff --check`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.
- `QA_BASE_URL=http://127.0.0.1:5173 QA_CHECKS=child-profile,mobile-child-profile npm run qa:visual`: whiteboard and mobile profile passed with 0 issues and 0 warnings.
- `QA_BASE_URL=http://127.0.0.1:5173 QA_CHECKS=moral-speak-flow,classroom-touch-loop npm run qa:visual`: whiteboard/mobile moral-speak and classroom touch loop passed with 0 issues and 0 warnings.
- `QA_BASE_URL=http://127.0.0.1:5173 QA_CHECKS=home,home-fallback-return npm run qa:visual`: passed with 0 issues. Home ultra kept the existing headless drag warning at `17.3 FPS`.
- Manual Playwright profile-cabin smoke in offline mode: cabin entered `pendingReview`, teacher card rendered inside the cabin, approval produced `moral-stage-success`, and the newest local ledger record used `source: "dialogue-agent"`, `reviewStatus: "approved"`, and `reason: "自助成长：..."`.

## P22 classroom readiness performance hardening

### Scope

- Responded to the classroom-facing reports that the island still felt laggy during large-screen drag/zoom, that movement could look like flicker, and that selected spirits could stop floating after zoom.
- Kept the same product and data boundaries: no backend, XP rules, ledger contract, data files, account, permission, PDF, parent/reviewer/admin, approval-flow, or live Three.js main-island rewrite changes.
- Preserved map clarity: Pixi render resolution stays at `1x` or above; no blur, CSS downsampling, or lower-resolution fallback was introduced.

### Baseline Finding

- Before the patch, `QA_CHECKS=home` passed functionally but ultra viewport active interaction was below the classroom threshold:
  - active wheel: `13.6 FPS`
  - active drag: `13.5 FPS`
- Short whiteboard soak was stable, so the primary regression was active interaction load on very large screens rather than a steady memory leak.

### Implementation Notes

- `PixiWorld.ts` now skips scene culling while pointer drag/wheel interaction is active, then performs one forced cull after interaction settles. This removes repeated traversal during the most latency-sensitive gesture and also reduces visible pop/flicker while dragging.
- `WorldScene.ts` now applies a real interaction visual mode instead of a no-op. During active interaction, nonessential effect rendering is paused while the map, homes, spirits, and selected child label remain visible.
- `LabelLayer.ts` now has interaction visibility mode: active drag/zoom hides region labels and non-selected spirit labels, while keeping the current child's name/ring visible. On settle it restores the normal zoom-dependent label layout.
- `PixiWorld.ts` treats `manual` zoom as eligible for selected-spirit idle animation, so wheel zoom no longer leaves the selected spirit stuck after interaction settles.
- `qa-visual.mjs` now prefers system Chrome through `PLAYWRIGHT_CHROME_PATH` or `/usr/bin/google-chrome`, matching the repository validation guidance and avoiding a hidden dependency on the Playwright browser cache.
- `qa-visual.mjs` adds a selected-spirit wheel regression: select a child, wheel zoom, wait for settle, and assert that the selected spirit remains visible and continues idle floating.

### Validation

- `node --check scripts/qa-visual.mjs`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.
- `QA_BASE_URL=http://127.0.0.1:5173 QA_CHECKS=home npm run qa:visual`: whiteboard and ultra passed with 0 issues and 0 warnings.
  - whiteboard active wheel: `33 FPS`; active drag: `29.6 FPS`.
  - ultra active wheel: `21.2 FPS`; active drag: `20.6 FPS`.
  - selected-spirit idle float after wheel stayed active; sampled range was `8.53px` on ultra.
  - Pixi render resolution stayed at `1`.
- `QA_BASE_URL=http://127.0.0.1:5173 QA_CHECKS=classroom-touch-loop,moral-speak-flow,child-profile,mobile-child-profile npm run qa:visual`: all listed flows passed with 0 issues and 0 warnings.
- `QA_BASE_URL=http://127.0.0.1:5173 QA_CHECKS=home-performance-soak QA_SOAK_MS=300000 QA_SOAK_SAMPLE_MS=30000 npm run qa:visual`: 5-minute whiteboard sustained drag passed with 0 issues and 0 warnings.
  - sampled duration: `300000ms`.
  - sustained frame average: `34.5 FPS`.
  - p95/p99 frame gap: `33.4ms`.
  - heap delta: `4.3MB`.
  - render resolution remained `1`; settled state returned to crisp idle.

## P23 classroom moral-speak recovery loop

### Scope

- Hardened the classroom "say growth" loop so teachers can recover from wrong taps, microphone failure, recognition cancellation, temporary module switches, and refreshes without leaving the child flow half locked.
- Kept the same product and data boundaries: no backend schema, XP rules, ledger contract, data files, account, permission, PDF, parent/reviewer/admin, approval-flow, map clarity, or live Three.js main-island changes.

### Implementation Notes

- `MoralSpeakOverlay` now exposes a visible safe-exit action for ready, listening, recognizing, and error states. The microphone remains icon-only on screen; rescue text stays in compact cancel/later controls and accessible labels.
- `TeacherMoralReviewCard` now includes a `稍后` action beside `修正 / 重说 / 跳过`. `稍后` exits the active UI and preserves the pending review for the teacher; `重说` and `跳过` reject the current review so stale pending items are not left behind.
- `App.tsx` centralizes moral-speak idle reset, stops active recording when needed, preserves pending reviews on defer/module switch, and adds child-facing guard feedback when a different child is tapped during a locked state.
- The moral-speak child lock now starts at `ready`, not only after recording begins. This prevents the spirit-cabin roster or island child selection from hiding a prepared microphone flow and later recording the wrong child.
- Moral-speak recording, transcription, and evaluation now carry a session token. If the teacher cancels, switches module, retries, or defers while an async result is in flight, the old callback cannot reopen `pendingReview` or write a dirty review/ledger record.
- Stale online evaluation responses now reject their temporary server review and apply the returned snapshot, falling back to offline status only on cleanup failure. This avoids leaving sync status stuck in saving after a cancelled in-flight request.
- Teacher approval now locks review actions while ledger commit is in flight, including the correction select, and the async completion rechecks the same child/review before entering success. This prevents `稍后 / 重说 / 跳过 / 修正` from racing a confirmed point award.
- The spirit-cabin roster now uses the same locked-child guard as the island map, so switching children cannot hide an active listening/review flow in the cabin.
- Dev-only QA hooks now cover forced microphone failure and controlled module switching, without affecting production behavior.
- Whiteboard teacher-card sizing was adjusted so the opened correction panel keeps all teacher action buttons at valid touch size instead of clipping the bottom row.

### Validation

- `node --check scripts/qa-visual.mjs`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.
- `QA_BASE_URL=http://127.0.0.1:5173 QA_CHECKS=moral-review-safety npm run qa:visual`: whiteboard and mobile passed with 0 issues and 0 warnings after the touch-target fix.
- `QA_BASE_URL=http://127.0.0.1:5173 QA_CHECKS=moral-review-online-stale npm run qa:visual`: whiteboard passed with 0 issues and 0 warnings, covering the online in-flight evaluate/cancel/cleanup branch.
- `QA_BASE_URL=http://127.0.0.1:5173 QA_CHECKS=home,classroom-touch-loop,moral-speak-flow,moral-review-safety,child-profile,mobile-child-profile npm run qa:visual`: all listed checks passed with 0 issues and 0 warnings.
- Code review follow-up fixed P23 blocking findings: delayed speech/evaluation responses after cancellation, cabin roster selection hiding active/ready moral-speak, approval/defer race during ledger commit, locked correction controls during approval, and stale online cleanup leaving sync status in saving.

## P24 large-screen map clarity and interaction performance pass

### Scope

- Continued the classroom big-screen performance work after reports that island drag still felt laggy and that selected spirits could appear stuck after zoom.
- Kept map clarity intact: Pixi render resolution remains `1`, no blur/downsample fallback, no backend/XP/data/approval-flow changes.
- Kept the main island 2.5D/Pixi architecture; this pass only split stable static visuals and constrained oversized ultra-wide drawing.

### Implementation Notes

- Added `DomStaticMapLayer.ts` to move the non-clickable island base from Pixi into a DOM static layer that follows the Pixi camera transform.
- Removed the old Pixi `IslandLayer.ts`, leaving Pixi focused on region/path/decor interaction, homes, spirits, labels, and effects.
- Set WebGL `premultipliedAlpha: false` and explicitly kept renderer background alpha at `0`; this fixes transparent canvas composition so CSS ocean and DOM island layers remain visible under Pixi.
- Added CSS z-index rules for `pixi-static-map-layer` under the transparent Pixi canvas.
- Added an ultra-wide classroom stage cap at `2200x1240` for screens wider than `2000px`. This preserves map-first layout while avoiding a `2544x1350` WebGL canvas on very wide displays.

### Validation

- `npm run build`: passed with the existing large chunk warning.
- `QA_CHECKS=home npm run qa:visual`: whiteboard and ultra passed with 0 issues and 0 warnings.
  - whiteboard active drag: `31.6 FPS`; active wheel: `33.2 FPS`.
  - ultra active drag: `28.4 FPS`; active wheel: `26 FPS`.
  - ultra Pixi backing size reduced from `2544x1350` to `2162x1240` while render resolution stayed `1`.
- `QA_CHECKS=home-performance-soak npm run qa:visual`: 2-minute whiteboard sustained interaction passed with 0 issues and 0 warnings.
  - sustained frame average: `34.5 FPS`.
  - p95/p99 frame gap: `33.4ms / 33.5ms`.
  - max frame gap: `50.1ms`.
  - settled state returned to idle; selected spirit remained visible and animating.
- `QA_CHECKS=home,moral-speak-flow,classroom-touch-loop npm run qa:visual`: home, whiteboard/mobile moral-speak, and classroom touch loop passed with 0 issues and 0 warnings.

## P25 App and QA core split

### Scope

- Started the App/QA runner inner-core split after the large-screen performance work, without adding product features.
- Kept classroom behavior unchanged: no backend, XP, ledger, data, parent/reviewer/admin, PDF, approval-flow, or main-island Three.js changes.

### Implementation Notes

- Added `src/domain/appViewModel.ts` so `App.tsx` no longer owns the selected child, selected spirit, recent ledger, PK opponent, showcase child, and pending-review derivation rules.
- Added `scripts/qa/home-assertions.mjs` so homepage clarity, model-prop, active drag/wheel, selected-spirit float, and soak assertions are no longer embedded in the generic QA runner.
- Kept `scripts/qa/home-tools.mjs` as the measurement Module and `scripts/qa/runner.mjs` as orchestration. The runner now calls a homepage assertion Interface instead of carrying the whole assertion implementation.

### Validation

- `node --check scripts/qa/runner.mjs && node --check scripts/qa/home-assertions.mjs && node --check scripts/qa/home-tools.mjs`: passed.
- `npm run build`: passed with the existing `three.module` large chunk warning.
- `QA_BASE_URL=http://127.0.0.1:5173 QA_CHECKS=home npm run qa:visual`: whiteboard and ultra passed with 0 issues and 0 warnings.
- `QA_BASE_URL=http://127.0.0.1:5173 QA_CHECKS=home-performance-soak QA_SOAK_MS=30000 QA_SOAK_SAMPLE_MS=10000 npm run qa:visual`: whiteboard passed with 0 issues and 0 warnings.

## P25.1 classroom operations QA split

### Scope

- Continued the strict-structure-equivalent QA runner split without changing check names, order, browser actions, assertion text, report schema, artifact paths, or product behavior.

### Implementation Notes

- Added `scripts/qa/operations-flows.mjs` as the bounded home for data management, organization, settings, generic module, and mobile operations flows.
- Kept browser lifecycle, check dispatch, issue aggregation, screenshots, and report serialization in `scripts/qa/runner.mjs`.
- Preserved the extracted function bodies byte-for-byte apart from adding ESM exports; dependencies are explicit imports from `home-tools.mjs` and `data-management-assertions.mjs`.
- Reduced `scripts/qa/runner.mjs` from 5,413 to 4,722 lines; the new Module is 710 lines and remains below the repository 800-line limit.

### Validation

- `node --check scripts/qa/runner.mjs && node --check scripts/qa/operations-flows.mjs && git diff --check`: passed.
- `npm test`: 16 files and 79 tests passed.
- `npm run build`: passed; build budgets stayed at initial `315.6 KB`, Pixi `452.3 KB`, and home `767.9 KB`.
- Operations QA (`data-management`, `organization`, `settings`, and their mobile checks): six results passed with 0 issues and 0 warnings.
- `npm run qa:trial`: seven default whiteboard/mobile results passed with 0 issues and 0 warnings; trial assets passed.
- `npm run qa:preview-smoke`: passed.
- Pre/post reports kept the same result keys, recursive field schema, issue list, and warning list.
- Read-only review found no runtime or report-contract regression; follow-up made the `Buffer` dependency explicit and aligned runner/operations L3 plus the nested QA L2 parent and migration status with the code.
- GitHub CI exposed the snapshot-rotation durability test crossing Vitest's 5-second default on shared storage; the real fsync coverage remains unchanged and only that test receives a 15-second timeout.

## P25.2 scheduled classroom QA stabilization

### Scope

- Fixed the common cause behind the 2026-07-13 and 2026-07-14 scheduled Classroom QA failures without weakening classroom assertions or changing product behavior.
- Kept the existing ten-child loop, physical touch geometry, center-point hit testing, overlap checks, check names, top-level report schema, and artifact paths intact; listening details gained additive pointer-stop evidence.

### Implementation Notes

- The listening control combines an infinite waveform animation with a hover transform. After the wrong-child guard probe expands and collapses the dock, Playwright's pointer actionability check could wait indefinitely for the control to become geometrically stable even though its size, visibility, and center hit target had already passed inspection.
- After the wrong-child guard probes, the QA runner now rechecks touch geometry and center-point hit targets, samples the button's current center, and sends a real pointer click at that coordinate. This removes the locator stability deadlock without bypassing pointer dispatch or current-layout hit testing.
- The recorder mock counts `stop()` calls, and every child flow reports an issue unless the pointer click stopped exactly that recording. All ten listening states now participate in the final touch-geometry issue aggregation.
- No `force` click, timeout increase, assertion removal, CSS change, or production QA hook was added.

### Validation

- `node --check scripts/qa/runner.mjs && git diff --check`: passed.
- Two isolated `classroom-touch-loop/whiteboard` trial runs passed consecutively; 20 child turns completed with 0 issues and 0 warnings, and both asset gates passed.
- `npm test`: 16 files and 79 tests passed.
- `npm run build`: passed; build budgets stayed at initial `315.6 KB`, Pixi `452.3 KB`, and home `767.9 KB`.
- `npm run qa:trial`: all seven default whiteboard/mobile results passed with 0 issues and 0 warnings; trial assets passed.
- `npm run qa:preview-smoke`: passed against the production manifest and preview server.
- Read-only follow-up review confirmed the real pointer path, per-recording stop proof, ten-child listening geometry aggregation, and documentation accuracy; no blocking findings remained.

## P25.3 remote classroom QA timing follow-up

### Scope

- Followed the merged P25.2 change through a manual full Classroom QA run on GitHub instead of treating local success as the terminal signal.
- Kept the same product layout, copy, ledger, Provider, classroom data, check names, top-level report schema, and artifact paths; listening details gained additive settled-pointer evidence.

### Remote Findings

- GitHub run `29388970729` completed the raw classroom runner, asset report, production preview smoke, summary, and artifact upload, but functional assessment found 13 report issues.
- GitHub run `29390655699` confirmed that every failed turn had a valid settled center hit and that the handoff fix worked; the remaining 12 recorder failures were not pointer misses.
- GitHub run `29393087661` confirmed all 16 moral/classroom turns with valid pre-click recording, settled-center, pointer-stop, and handoff evidence. Its only issue was an unrelated ultra-wide selected-spirit sample at `2.81px` while the reported positions still moved continuously from `-2.81` to `0` and back to `-2.74`.
- On software-rendered CI, the wrong-child and geometry probes can exceed the product's 5.5-second auto-stop window. The mock recorder then became inactive without emitting `onstop`, leaving the UI in `listening`; the later real pointer click could no longer call `stop()` again. Faster mobile and local turns completed before the timeout, which explains their success.
- A mobile success turn exposed a separate real feedback race: an old success-state wrong-child guard could overwrite the final idle “下一位” handoff before React committed the reset.

### Implementation Notes

- Animated QA activation now moves the pointer outside, moves it into the initial center, waits 220 ms for the 180 ms hover transition, resamples the settled center, verifies its hit target, and clicks through the real pointer path.
- The recorder mock requests a bounded 30-second development-only auto-stop window before app startup; production and production previews keep the original 5.5-second classroom behavior.
- Every moral and classroom turn reports settled-center misses, premature auto-stops, and missing pointer-triggered recorder stops as distinct failures.
- Selected-spirit motion keeps the existing `3px` functional threshold and seven-sample minimum, but slow renderers may continue up to fifteen samples. Healthy motion exits as soon as it proves the threshold; a truly stopped animation still fails after the bounded window.
- Successful moral approval now schedules the existing handoff feedback one browser task after the idle reset, so stale success-DOM guard feedback finishes first without weakening the child-selection guard.
- Added the reviewed design contract at `docs/superpowers/specs/2026-07-15-classroom-qa-ci-stability-design.md`.

### Validation

- `node --check scripts/qa/runner.mjs && git diff --check`: passed.
- `npm test`: 16 files and 79 tests passed.
- `npm run build`: passed; build budgets stayed at initial `315.6 KB`, Pixi `452.3 KB`, and home `767.9 KB`.
- Combined desktop/mobile moral flow plus ten-child classroom loop: 16 turns passed with 0 issues and 0 warnings; every settled center, recorder stop, and handoff flag was true.
- A second isolated ten-child classroom loop passed with 0 issues and 0 warnings; trial assets passed.
- `npm run qa:trial`: all seven default whiteboard/mobile results passed with 0 issues and 0 warnings; trial assets passed.
- `npm run qa:preview-smoke`: passed against the production manifest and preview server.
- Read-only review exposed a 220ms stop-attribution window and two GEB gaps; stop evidence now samples immediately before the real click, and the L2/L3 contracts record the development-only QA window.
- GitHub run `29393087661` proved the recording fix remotely: all 16 moral/classroom turns passed every pointer, stop, ledger, and handoff assertion; only the phase-sensitive ultra-wide home motion sample remained.
- A 20x CPU-throttled browser harness kept a truly stalled animation below threshold for all 15 samples, while healthy motion passed without lowering the existing `3px` gate. Whiteboard and ultra home checks then passed with 0 functional issues.
- Follow-up read-only review confirmed visible-only range calculation, exact 7–15 sample bounds, the nominal `3.08s` span, wheel-animation proof, unchanged report schema, and no product behavior change; no findings remained.
