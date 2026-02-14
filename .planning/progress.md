# Progress

## Completed in current branch (`feat/dynamic-shopping-list-ai-v1`)

- Added structured ingredient model and shopping-list persistence in Prisma:
  - `MealIngredient`
  - `WeeklyPlanEntry`
  - `ShoppingList` + `ShoppingListItem`
- Added weekly-plan entry syncing (meal IDs per day) during generate/swap flows.
- Added AI ingredient draft endpoint:
  - `POST /api/meal-ingredients`
  - strict validation + rate limiting + fast fallback.
- Added AI-assisted ingredient editing in both create and edit meal flows.
- Added dynamic shopping list generation from current weekly plan with:
  - ingredient normalization
  - unit normalization/conversion
  - unresolved flags for manual review.
- Added shopping-list drawer with generate/regenerate + check/uncheck interactions.
- Added tests for new domains:
  - AI ingredient draft
  - shopping aggregation
  - shopping-list actions.

## Validation

- `pnpm test` ✅ (10 files, 36 tests)
- `pnpm build` ✅

## Next priorities

1. Add serving-based scaling (`defaultServings` + per-week override).
2. Add editable shopping list rows (inline amount/unit edits) and persistence.
3. Replace in-memory AI draft cache with durable DB cache keyed by normalized dish name.
