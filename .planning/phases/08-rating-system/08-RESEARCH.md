# Phase 8 Research Notes (Rating System)

## Decisions

- Rating is a strict enum (`THUMBS_DOWN`, `NEUTRAL`, `THUMBS_UP`) already in schema.
- Rating controls live in meal management drawer, not on plan cards.
- Optimistic UI is required for interaction speed.

## Algorithm Constraints

- Rating weighting must not override hard constraints from Phase 7.
- Down-rated meals are de-prioritized, never hard-filtered out.
- Weighted randomness should remain deterministic under test via injected random fn.

## Test Strategy

- `lib/actions/meals.test.ts`: rating action validation + authorization.
- `lib/planning/selection.test.ts`: weighted distribution trend tests.
- `lib/actions/plans.test.ts`: integration checks for rated pool behavior.
