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
