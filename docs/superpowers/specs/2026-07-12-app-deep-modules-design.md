# App Deep Modules Design

## Goal

Reduce `src/App.tsx` below 800 lines without changing UI, routes, copy, state transitions, storage keys, HTTP calls, ledger semantics, moral-review semantics, QA hooks, or responsive behaviour.

The refactor deepens two existing domain concepts—**classroom data session** and **moral-speak session**—and separates development QA wiring from production orchestration. It does not introduce React Context, a new state library, or a new rendering abstraction hierarchy.

## Chosen structure

```text
src/app/
├── useClassroomSession.ts       # classroom snapshot, sync, backup and persistence
├── useMoralSpeakWorkflow.ts     # recording, recognition, review and session locking
├── useGrowthIslandQaBridge.ts   # development-only window Adapter
├── GrowthIslandView.tsx         # presentation Adapter for module routing and overlays
└── CLAUDE.md                    # local module map
```

`App.tsx` remains the composition root. It derives the app view model, creates cross-workflow feedback/navigation actions, wires product-module operations, and passes grouped state/actions into `GrowthIslandView`.

## Classroom data session Module

`useClassroomSession` owns the persistent classroom state:

- children, ledger, moral reviews, teacher mode, settings changes, lottery draws, shop redemptions, and organization state;
- startup choice between server and an explicitly authoritative local backup;
- snapshot application and online/offline/saving status;
- backup creation, export, preview, restore, and clear;
- localStorage persistence effects for every backup field.

Its Interface returns grouped `state`, `setters`, `sync`, and `backup` capabilities. Callers cannot know storage keys or backup serialization order. Existing online/offline ledger fallback remains in the composition root initially because it also owns global growth feedback; it may call the session's snapshot and setters but cannot write localStorage directly.

## Moral-speak session Module

`useMoralSpeakWorkflow` owns:

- `MoralSpeakViewState`, session IDs, approval lock, recorder, MediaStream, timers, and current child refs;
- prepare, start, stop, retry, transcribe, adjust, approve, reject, defer, re-speak, and skip transitions;
- stale response protection and cancellation rejection;
- child-selection lock while one child owns the active session;
- audio conversion and classroom Provider calls.

Its Interface exposes the current view state, user actions, selection guards, and a small QA control surface. The hook receives the current children, selected child, ledger commit capability, snapshot application capability, and feedback/navigation callbacks. It does not render UI.

## QA Adapter

`useGrowthIslandQaBridge` is a concrete development Adapter at the existing `window.__growthIsland*` seam. It receives grouped classroom, moral-speak, navigation, feedback, and showcase capabilities and mirrors the exact current property names and behaviour.

The Adapter remains inert unless `?qa` is present in development. Production bundles retain no new external interface.

## Presentation Adapter

`GrowthIslandView` contains the existing `AppShell` tree, active-module routing, modals, showcase, and growth-feedback overlay. It accepts grouped `view` and `actions` objects rather than dozens of top-level arguments.

This file is intentionally a presentation Adapter, not a claimed deep Module. It may be deleted by moving JSX back into `App.tsx`; its value is locality of rendering, while behavioural depth remains in the session Modules.

## React invariants

- State initializers remain lazy and run once per mount.
- Provider waits stay in event handlers, not effects.
- Existing effects retain their dependency semantics and cleanup ordering.
- Mutable recorder, timer, approval, and session identifiers remain refs rather than render state.
- Derived classroom data remains in `createAppViewModel` and is not duplicated into effects.
- Callback identity is not changed merely for memoization; no speculative `useCallback` layer is introduced.

## Verification

1. Run all existing Vitest tests before and after extraction.
2. Keep browser Adapter, moral-speak session, online stale-response, approval-lock, restore/reload, and WebM conversion regressions passing.
3. Run `npm run build` after every completed extraction stage.
4. Run targeted Chromium smoke checks for home moral-speak QA hooks and local backup reload.
5. Confirm `App.tsx` and every new source file remain below 800 lines.
6. Compare all `window.__growthIsland*` names and all module callback wiring before and after extraction.

## Non-goals

- No visual or layout changes.
- No P2 behaviour fixes.
- No Context provider, reducer rewrite, state library, route library, or test framework change.
- No renaming of public types, storage keys, QA hooks, module IDs, or classroom Provider calls.
