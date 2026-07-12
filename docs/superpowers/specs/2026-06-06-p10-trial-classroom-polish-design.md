# P10 Trial Classroom Polish

Date: 2026-06-06
Scope: classroom trial frontend polish

## Goal

P10 turns the current home flow into a trial-classroom-ready surface without adding product scope:

```text
child finds own spirit -> taps spirit -> speaks growth -> teacher confirms -> energy feedback -> next child self-selects
```

This slice covers P10.1 and P10.2 first, with narrow support for P10.3 and P10.6. It does not add parent, reviewer, kindergarten admin, PDF export, approval flow, accounts, permissions, cloud sync, fixed queueing, backend changes, data changes, or a PixiJS rewrite.

## Review Findings

- UX review found the home screen still had too many first actions: map taps, energy cards, scene gates, companion card, spirit dock, bottom module dock, and teacher affordance.
- UI review found the map dominates by area but not by attention because idle overlays are too dense.
- Both reviews recommended a small first slice: reduce idle home clutter, make self-selection language clearer, and keep the existing child loop intact.

## Design Direction

1. The home idle state should read as island first, not a control dashboard.
2. The child selector should speak in self-identification terms: `找我`, `点精灵`, `点我`.
3. The right spirit card remains the main visible `说成长` action after the child sees their name.
4. Small activity entries stay available, but no longer show reward/hint microcopy in the idle whiteboard view.
5. The energy board keeps all seven energy categories in the DOM and QA model, but the idle view intentionally exposes only the current/lit cards visually and interactively.
6. Active speak/review states continue to quiet non-current controls and do not introduce a fixed next-child queue.

## Acceptance

- Whiteboard home still shows the full island and selected child identity.
- A trial user can identify the child path: find self, tap spirit, say growth.
- The home scene gate has four entries and no always-visible reward/hint text such as `贝签光`, `数学光`, `荣誉光`, `小票`, or `兑换`.
- Idle home shows no more than four visible energy cards while preserving seven energy states for QA coverage.
- Mobile home uses a compact 2x2 zoom control cluster.
- `npm run build` and `npm run qa:visual` pass.
