# Phase 9 Research Notes (Complexity Levels)

## Decisions

- Complexity remains enum-backed in Prisma (`SIMPLE`, `MEDIUM`, `COMPLEX`).
- Default remains `MEDIUM` at DB level.
- Complexity controls belong in meal-management context (drawer), not weekly plan cards.

## UX Constraints

- Keep complexity controls lightweight to avoid adding setup friction.
- Badge should be visible but not dominate row content.
- Definitions must be explicit and time-based.

## Test Strategy

- Unit/integration tests for action-level persistence (`addMeal`, `updateMeal`).
- UI snapshot-style verification is optional; primary guard is action tests + lint/build.
