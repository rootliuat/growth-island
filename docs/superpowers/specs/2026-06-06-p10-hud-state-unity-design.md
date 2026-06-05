# P10 HUD State Unity Design

## Goal

Close P10.3 and P10.4 for the trial-classroom build without adding product scope. The home island should keep the child self-service loop readable on a whiteboard:

`child taps spirit -> says growth -> teacher confirms -> energy feedback -> next child self-selects`

The slice removes duplicate state narration during active moral stages and standardizes the visible state language.

## Shared State Language

- Idle self-selection: `找我`
- Ready: `准备说`
- Listening: `正在说`
- Recognizing: `贝壳在听`
- Pending safe result: `等老师`
- Pending unsafe or unclear result: `请老师帮忙`
- Success: `已点亮`

## UX Decisions

- `MoralSpeakOverlay` is the child-facing active-state owner.
- The map focus plaque is hidden during every non-idle moral stage, because the turn chip already owns child identity.
- The energy board is hidden during ready, listening, and recognizing. It returns only for pending review and success as a compact current-result cue.
- Wrong-child taps during an active turn are still blocked, but they no longer create a global toast that can overlap success or teacher confirmation.
- Self-service ledger success no longer creates a global energy toast during the success animation. The handoff toast remains after returning to the island.

## Implementation Scope

- Update short active-state labels in `MoralSpeakOverlay.tsx`.
- Simplify teacher confirmation card labels in `TeacherMoralReviewCard.tsx`.
- Align active energy-board state/value text in `WorldMapContainer.tsx`.
- Remove active-flow ready/success global feedback in `App.tsx` while preserving ledger writes and the post-success handoff feedback.
- Add QA checks for hidden duplicate focus plaque, hidden ready/listening/recognizing energy board, result-aware unsafe pending turn chips, and no duplicate global feedback during success.

## Non-Goals

- No backend, API, XP, ledger, data, or PixiJS map rewrite.
- No parent, reviewer, kindergarten admin, PDF export, approval flow, account, permission, cloud sync, or fixed queue features.
- No new generated assets.

## Validation

- `git diff --check`
- `node --check scripts/qa-visual.mjs`
- `npm run build`
- `npm run qa:visual`

Manual screenshots to inspect:

- `qa-artifacts/latest/moral-speak-flow-ready-whiteboard.png`
- `qa-artifacts/latest/moral-speak-flow-pending-whiteboard.png`
- `qa-artifacts/latest/moral-speak-flow-whiteboard.png`
- `qa-artifacts/latest/moral-review-safety-mobile.png`
