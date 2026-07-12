# P9 Large-Screen Classroom Loop

Date: 2026-06-05
Scope: classroom whiteboard frontend only

## Goal

P9 hardens the real classroom touch loop:

```text
child taps own spirit -> speaks growth -> teacher confirms -> energy feedback -> full island -> next child self-selects
```

The work does not add a queue, account system, approval workflow, PDF export, parent/reviewer/admin role, backend change, data change, or PixiJS rewrite.

## Design Direction

1. During recording, recognition, teacher review, and success, the active child owns the turn. Accidental taps on another spirit or dock child do not switch the turn.
2. The real child name stays visible through ready, listening, recognizing, pending review, and success.
3. The teacher confirmation card becomes a touch-first whiteboard stamp card: larger child name, larger primary confirm action, and reachable correction/re-speak/skip controls.
4. After success, the app returns to the full island and shows a short handoff: the next child can choose their own spirit.
5. QA must prove the loop under classroom pressure by completing ten unique child turns and checking wrong-child taps during active stages.

## Acceptance

- A child can start from the map or bottom dock without leaving the island.
- Before teacher confirmation, no self-service ledger record is written.
- Double-confirm creates one approved ledger record only.
- Active recording/review/success stages ignore wrong-child selections.
- Success shows the child name, energy arrival, and `已点亮` feedback.
- After success timeout, the stage is idle, the map is back to full island, and no fixed next-child UI appears.
- Mobile and whiteboard states keep the teacher card, mic, child name, and dock controls reachable without horizontal overflow.
- `npm run build` and `npm run qa:visual` pass.
