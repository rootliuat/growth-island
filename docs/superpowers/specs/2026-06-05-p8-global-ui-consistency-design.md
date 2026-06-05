# P8 Global UI Consistency Closure

Date: 2026-06-05
Scope: classroom whiteboard frontend only

## Goal

P8 does not add new product capability. It tightens the existing classroom experience so Beihai Growth Island reads as one complete whiteboard product:

```text
child selects own spirit -> says growth -> teacher confirms -> energy feedback -> return to full island
```

## Constraints

- Do not change backend, APIs, seed data, XP ledger contracts, or PixiJS map structure.
- Do not add parent, reviewer, kindergarten admin, PDF export, approval flow, accounts, permissions, or cloud sync.
- Preserve child self-selection. The system must not queue or assign a fixed next child.
- Keep URL module access for existing QA and future development, even if a module is demoted from the classroom dock.

## Design Direction

1. The bottom dock remains child-first: self-service child chip, classroom activity modules, and a small teacher drawer.
2. The teacher drawer is renamed to `老师工具` and only exposes classroom-needed fallback actions by default.
3. Backstage-like routes such as data, organization, and settings remain reachable by URL and QA, but are not presented as normal whiteboard actions.
4. Module command bars should carry the global return action. Module-local headers should be compact status labels, not a second full navigation layer.
5. Default visible copy uses `能量` and `看精灵`; `XP`, `定位`, and disabled feature-looking actions are avoided unless they are internal data details.
6. CSS polish should map existing selectors to a shared game HUD vocabulary instead of introducing new one-off chrome.

## Acceptance

- Home idle view has one obvious child path: tap spirit or child chip, then `说成长`.
- Teacher drawer is closed by default and does not expose data/admin/organization/settings copy on home.
- Teacher fallback still opens from home and returns to a full-island idle state.
- Module pages keep `回岛` in the global command bar and use local `看精灵` only when focusing a child.
- Child-facing and default teacher surfaces do not show `XP`, confidence, transcript, backend, admin, report, approval, PDF, permission, or cloud-sync language.
- `npm run build` and `npm run qa:visual` pass.
