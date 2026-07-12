# P2 Review Fixes Design

## Scope

Resolve the three remaining review findings without changing API shapes, stored ledger reason text, or module layout:

1. A teacher correction may replace an already-positive moral review suggestion.
2. Weekly, monthly, and seasonal growth-task completion applies only to the current cadence window.
3. Category-filtered dashboard totals summarize the same category-filtered ledger shown by the panel.

## Moral review correction

Review validation has one invariant path. The pending review must belong to the target child. A request with `teacherAdjustedReview: true` must provide one of the shared moral-growth increments (`+10`, `+20`, or `+30`) and a known virtue category; it replaces either a positive or unsafe suggestion and records `teacher_adjusted_positive`. Without that flag, only an already-approvable suggestion with exactly matching category and delta may enter the ledger.

This ordering removes the accidental special case where positive suggestions rejected explicit teacher corrections while preserving the existing safety gate for unadjusted unsafe suggestions.

## Recurring task cadence

Task history keeps the existing `成长任务：{title}` reason for storage and display compatibility. Completion is derived from that reason plus `createdAt` inside the current UTC cadence window:

- weekly: Monday 00:00 UTC through the next Monday;
- monthly: first day of the UTC month through the next month;
- seasonal: calendar quarter boundaries in UTC.

The same domain predicate drives both organization runtime summaries and the App duplicate-write guard. Invalid timestamps, future timestamps, and undone/undo records never complete a task. A fixed `now` parameter keeps tests deterministic.

## Category analytics

The dashboard first applies the selected time scope, then the selected virtue category, and summarizes that category-scoped collection. Text search continues to affect visible rows only; it does not silently redefine the labeled time/category totals.

## Verification

- API regression: create an approvable review, post a different positive category and delta with `teacherAdjustedReview`, and assert both review and ledger use the correction.
- Domain regression: an old cadence completion is excluded while a completion inside the current weekly, monthly, or seasonal window is included.
- Analytics regression: filtering to one category yields totals, active-child count, and valid-record count from only that category.
- Run focused tests, full `npm test`, `npm run build`, and targeted browser QA for organization and data-management flows when available.

## Non-goals

- Migrating historical ledger reason strings.
- Locale-dependent week boundaries.
- Redesigning the data-management UI or organization workflow.
