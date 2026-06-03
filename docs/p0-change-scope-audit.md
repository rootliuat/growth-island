# P0 Change Scope Audit

Date: 2026-06-02

This audit splits the current large working tree into reviewable scopes so the project can move from "large diff that runs" to "regression-tested and handoff-ready".

## Validation Baseline

Current required gates:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run qa:visual`
- `npm run qa:p4-providers` when Tencent and DeepSeek credentials are configured

Provider and recording configuration is documented in `docs/provider-runtime-guide.md`.

## Scope Groups

### P0/P1 Engineering And Business Safeguards

Keep together as the engineering safety base:

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `shared/moral-rules.json`
- `src/domain/moralAgent.ts`
- `server/moral-agent.mjs`
- `tests/domain/moralAgent.test.ts`
- `tests/domain/progression.test.ts`
- `tests/server/beihaiApi.test.ts`
- `tests/server/providerStability.test.ts`

Reason to keep:

- Restores `npm test`, Vitest, and Node test typing.
- Restores shared moral-rule source of truth.
- Guards XP, level, ledger undo, review approve/reject, and provider fallback behavior.

Review focus:

- Do not allow future UI work to remove `tests`, `shared/moral-rules.json`, or `npm test`.
- Keep front-end and server moral classification behavior sourced from the same rules file.

### P3 Provider Stability

Keep as the provider reliability slice:

- `server/beihai-api.mjs`
- `src/types.ts`
- `scripts/qa-p4-provider-smoke.mjs`
- `tests/server/providerStability.test.ts`

Reason to keep:

- Adds DeepSeek timeout and local-rule fallback.
- Adds provider error reporting and usage pass-through for diagnosis/cost auditing.
- Adds mock speech provider for credential-free smoke tests.
- Converts Tencent speech provider failures into structured JSON errors instead of unhandled server exceptions.

Review focus:

- Verify real provider smoke still reports Tencent TTS/ASR and DeepSeek.
- Verify no secrets are echoed in `providerError`.
- Keep mock provider opt-in via environment variables only.

### P2 Child Self-Service Moral Flow

Keep as a separate product slice until real recording replaces simulation:

- `docs/child-self-service-moral-growth-island-plan.md`
- `src/App.tsx`
- `src/components/Hud/MoralSpeakOverlay.tsx`
- `src/components/Hud/TeacherMoralReviewCard.tsx`
- `src/components/WorldMap/WorldMapContainer.tsx`
- `src/domain/virtueEnergy.ts`
- `src/services/classroomApi.ts`

Current status:

- Map-click to moral-speak overlay and teacher review exists.
- The runtime child speech flow uses browser microphone recording, ASR upload, retry, and permission error states.
- Visual QA uses a QA-only hook so automated screenshots do not require a microphone.

Review focus:

- Keep `moralSpeakSamples` out of runtime flow.
- Treat physical microphone plus Tencent ASR compatibility as a deployment smoke check, not as covered by visual QA alone.

### Voice And Spirit Profile Configuration

Keep with P2/P3 or split as a small support slice:

- `src/domain/spiritVoice.ts`
- `src/components/Hud/TeacherActionPanel.tsx`
- `src/components/Hud/SpiritDetailPanel.tsx`
- `src/data/classroom.ts`
- `server/beihai-api.mjs`
- `src/types.ts`

Reason to keep:

- Adds per-child `voiceType` so TTS can use a stable voice per spirit/child.
- Normalizes old local DB records that do not yet have `voiceType`.

Review focus:

- This touches seed classroom data and server DB normalization; keep it tied to provider/voice work, not generic UI polish.

### UI Maturity And Visual QA

Keep as a separate frontend/UI slice:

- `README.md`
- `docs/ui-polish-overnight-log.md`
- `scripts/qa-visual.mjs`
- `scripts/qa-p0-trace.mjs`
- `src/styles.css`
- `src/components/modules/*.tsx`
- `src/game/layout.ts`
- `src/game/pixi/*.ts`

Reason to keep:

- Supports map-first shell, compact module pages, mobile QA, and visual regression coverage.

Review focus:

- This group should not modify moral rules, package dependencies, backend provider logic, or tests except QA scripts.
- Keep generated assets and protected map asset directories untouched.

### P4 Teacher Workbench Noise Reduction

Keep as the classroom-operation slice:

- `src/components/modules/TeacherWorkbenchModule.tsx`
- `src/App.tsx`
- `src/styles.css`
- `scripts/qa-visual.mjs`

Current status:

- Student cards are selection-first and no longer repeat `+10/+20/+30` on every child.
- The selected-child drawer is the single quick reward surface.
- Negative XP actions are moved into `调整 XP` and require a confirmation step before ledger write.
- Negative AI suggestions also require a confirmation step before `记入成长` can write to the ledger.
- Latest feedback names the selected child and delta, and the undo action is passed the concrete record id.
- Visual QA now asserts no per-card quick-score buttons, exactly three drawer reward buttons, named feedback/undo, actual undo ledger reversal, manual deduct confirmation, and negative-AI confirmation without direct XP mutation.

Review focus:

- Keep teacher scoring behavior routed through existing `onQuickRecord` and ledger helpers.
- Do not reintroduce duplicate quick-score grids on child cards.
- Keep mobile drawer-first behavior and avoid horizontal overflow.

### P5 Map Feedback Upgrade

Keep as the first map-feedback slice:

- `src/components/WorldMap/WorldMapContainer.tsx`
- `src/game/virtueRegions.ts`
- `src/game/layout.ts`
- `src/game/types.ts`
- `src/game/pixi/RegionLayer.ts`
- `src/game/pixi/PixiWorld.ts`
- `src/game/pixi/WorldScene.ts`
- `src/styles.css`
- `scripts/qa-visual.mjs`

Current status:

- The home map now shows a compact seven-dimension energy constellation with child-friendly labels.
- The selected child's recent positive categories light up, and the current category is emphasized.
- Energy slots focus the corresponding island region so 德育维度 and map areas are linked.
- Pixi region data now receives the same energy state and renders persistent region glows/badges for lit 德育 areas.
- Moral-speak success updates the map energy board to `已点亮` before the flow returns to full-island view.
- The existing Pixi energy guide from the selected spirit toward the growth tree is enabled for recent positive activity.
- Visual QA now asserts the energy board exists, has seven slots, has active/current energy, lights a Pixi map region, and updates during moral-speak success.

Review focus:

- Keep the energy board compact enough that the map remains the primary surface.
- Do not replace the Pixi map feedback with explanatory copy.
- Future P5 work should connect more module returns to map focus/energy feedback, not just add more HUD text.

### P6 Module Completeness

Current module-completeness slice:

- `src/App.tsx`
- `src/components/modules/LotteryModule.tsx`
- `src/components/modules/SettingsModule.tsx`
- `src/components/modules/ShopModule.tsx`
- `src/types.ts`
- `src/styles.css`
- `scripts/qa-visual.mjs`

Current status:

- The shop now has a real redemption action instead of only checking XP gates.
- Successful redemption creates a `ShopRedemption` record with child, reward, cost, category, status, and timestamp.
- Redemption records are stored in local browser state/localStorage for the current classroom device and displayed in the shop history panel.
- Shop redemption still does not mutate growth XP ledger; XP remains a growth score, not a spendable currency.
- Returning to the island focuses the redeeming child.
- Visual QA asserts insufficient state, successful redemption state, redemption history, redemption contract, unchanged XP ledger, and home focus.
- The lottery module now writes `LotteryDrawRecord` entries at App level and reads them back into the draw-history panel.
- Lottery draw records are stored in local browser state/localStorage and include child, prize, rarity, status, and timestamp.
- Visual QA asserts lottery draw contract, unchanged XP ledger, visible draw result/history, and home focus.
- Settings now persists teacher mode and writes explicit `SettingsChangeRecord` entries instead of behaving like a demo-only toggle.
- Saving current settings creates a `settings-save` operation record, while teacher mode changes create `teacher-mode` records.
- Settings records are stored in local browser state/localStorage for the current classroom device and displayed in the settings record panel.
- Visual QA asserts teacher mode change, save contract, record panel update, unchanged XP ledger, and home focus.

Review focus:

- Keep reward fulfillment separate from XP ledger until a durable reward/permissions model exists.
- Before moving into P7, run a final P6 audit for any remaining demo-only module actions that should write explicit operation records.

### P7 Data Management

Current data-management slice:

- `src/domain/classroomBackup.ts`
- `src/domain/ledgerAnalytics.ts`
- `tests/domain/classroomBackup.test.ts`
- `tests/domain/ledgerAnalytics.test.ts`
- `src/App.tsx`
- `src/components/modules/DataManagementModule.tsx`
- `src/components/modules/moduleConfig.ts`
- `src/types.ts`
- `src/styles.css`
- `scripts/qa-visual.mjs`

Current status:

- Data management now has a real classroom backup contract instead of an export placeholder.
- Backups include child profiles, growth ledger, moral reviews, shop redemptions, lottery draws, teacher mode, settings operation records, organization curriculum publication state, and parent report approval state.
- Import/restore validates schema version, product identity, child IDs, ledger sources, review statuses, virtue categories, settings records, and operation references before applying data.
- Restored data is written into App state and the local browser backup store, so the classroom can be moved by exporting JSON and restored on another device/browser.
- Data management UI exposes export and import actions with compact data-volume chips and a short local-storage/privacy note.
- Unit tests cover backup JSON round-trip, ledger default normalization, invalid JSON rejection, and records that reference missing children.
- Data management now filters growth records by `近7天`, `近30天`, or `全部`, and shows XP delta, active child count, and active record count for the selected range.
- The page now computes seven-dimension 德育 statistics from active ledger records and supports filtering records/reviews by dimension.
- Unit tests cover rolling week/month filtering, category filtering, and statistics that ignore undone records and undo records.
- Import now creates a restore preview with current-vs-incoming differences; the app only applies the backup after an explicit confirm action.
- Clear-demo-data is a guarded local operation: the teacher must type `清空演示数据`, child profiles stay intact, and activity records are cleared from App state and local backup storage.
- The data page now includes a local-device privacy note explaining browser storage, backup/export responsibility, and restore confirmation.
- Unit tests cover import comparison and cleared classroom backup generation.
- Visual QA asserts the backup panel, backup contract including organization/report state, restore preview, restore confirmation gate, restore contract, local persistence, privacy note, clear confirmation gate, clear persistence, week/month scope controls, scope metrics, virtue stats, virtue filtering, search, ledger rows, pending reviews, and non-table layout.

Review focus:

- This is local-device backup/restore, not a multi-user cloud sync model.
- Future P7 work should add trend charts, multi-device sync strategy, role-based permissions, and stronger privacy/retention controls.

### P10 Productization Expansion

Current productization skeleton:

- `src/domain/organization.ts`
- `src/data/organization.ts`
- `tests/domain/organization.test.ts`
- `src/components/modules/OrganizationModule.tsx`
- `src/components/modules/moduleConfig.ts`
- `src/App.tsx`
- `src/styles.css`
- `scripts/qa-visual.mjs`

Current status:

- Adds a typed organization model for kindergarten, classrooms, teachers, curriculum tracks, curriculum publication state, growth task templates, task completion summaries, parent report drafts, and parent report documents.
- The seed organization turns the existing classroom children into three operating classes with five teachers across 园长、德育主任 and 主班老师 roles.
- `buildOrganizationRuntime` derives classroom-level child counts, active ledger records, pending review counts, teacher links, currently published curriculum tracks, current-course task context, growth task completion counts, and report drafts from existing App state.
- The new `园所运营` admin module exposes a compact multi-classroom cockpit instead of a placeholder: class switcher, class metrics, teacher list, report drafts, report preview/export, 德育课程配置, and 成长任务系统.
- Curriculum tracks can now be published per classroom; publishing a track changes the current-course task context while keeping other class tasks visible.
- Curriculum publication state is lifted into App state and included in the local classroom backup contract, so refresh, export/import, restore, and clear-demo-data flows handle it consistently.
- Growth tasks can now be completed for the selected report child; completion reuses the App ledger path with `manual` source, virtue category, XP delta, and `not_required` review status.
- Parent report preview derives teacher summary, dimension summary, representative evidence, next tasks, and Markdown export from active ledger records while ignoring undone/undo records.
- Parent reports now have a local approval workflow: submit for review, approve, or request revision. Approval state is stored in `OrganizationState`, backed up/restored with classroom data, and survives reload.
- Parent report actions can export a Markdown report or drill down to the selected child on the home island, preserving the existing home focus path.
- Unit tests cover seed config validity, multi-class/multi-teacher runtime generation, active-record filtering, pending review aggregation, curriculum publishing, current-course task context, task ledger input, task completion summaries, report draft ordering, report approval state, report document generation, and Markdown formatting.
- Visual QA now includes the organization flow and mobile organization page, asserting the productization sections, class switching, selected-class teacher/curriculum/task links, curriculum publication, current-course task shift, curriculum persistence through backup/localStorage/reload, parent report approval submission/approval/persistence, task completion ledger contract, parent report drafts, report preview, evidence/category summary, export action, home focus, and no horizontal overflow.

Review focus:

- This is a productization skeleton, not full SaaS tenancy.
- It does not yet add account login, role authorization, cloud sync, PDF generation, billing, or 园所级后台 APIs.
- Future P10 work should split auth/permissions, cloud organization sync, PDF export, task assignment windows, and curriculum approval workflows into separate reviewable slices.

## Must Not Regress

- `npm test` must remain available.
- `shared/moral-rules.json` must remain tracked.
- `tests/domain/moralAgent.test.ts` and `tests/domain/progression.test.ts` must remain tracked.
- `tests/server/beihaiApi.test.ts` and `tests/server/providerStability.test.ts` must keep API business safeguards covered.
- `src/data` changes must be limited to typed child profile fields needed by voice/provider work.
- No generated asset directories should be edited as part of P0/P1/P3 work.

## Remaining P0 Work

- Split these groups into separate commits or PR sections before review.
- Re-run the full validation baseline after any split.
- Keep provider credential and mock/fallback documentation current in `docs/provider-runtime-guide.md`.
