## Goal
Define a robust, production-grade test strategy for validating shopping-list correctness from weekly meal plans, including AI-assisted ingredient generation and aggregation math.

## Scope
- Generate weekly plan from meal library.
- Generate shopping list from selected weekly meals.
- Validate normalization, unit conversion, aggregation, unresolved handling, and persistence.
- Validate behavior with AI ingredient generation (mocked deterministic + optional live contract mode).

## Test Layers

1. Unit Tests (fast, deterministic)
- `lib/shopping/normalize.ts`
- `lib/shopping/aggregate.ts`
- `lib/ai/ingredients.ts` (schema/cleanup behavior only)

2. Integration Tests (primary signal)
- `lib/actions/plans.ts` + `lib/actions/shopping-list.ts` with Prisma mocked or test DB.
- Verify full flow: plan -> entries -> shopping list snapshot.

3. Optional Live Contract Tests (nightly/manual)
- Hit real AI provider with strict schema.
- Not part of required CI pass.

## Required Scenarios

### A. Plan-to-List Happy Path
1. Seed 5 meals with complete structured ingredients.
2. Generate weekly plan.
3. Generate shopping list.
4. Assert:
- list created for correct `weekStartDate`
- all 5 meals contributed rows
- no missing items

### B. Aggregation Correctness
1. Two meals include same ingredient (`Potatis`) with compatible units.
2. Assert:
- `1 kg + 500 g = 1500 g`
- output has single bucket for canonical ingredient

### C. Unit Normalization
1. Inputs with English units (`tbsp`, `tsp`, `cups`, `pieces`).
2. Assert mapped units (`msk`, `tsk`, `dl`, `st`) before aggregation.

### D. Invalid/Garbage Ingredient Filtering
1. Include rows with names like `"null"`, `"undefined"`, `"-"`.
2. Assert those rows never appear in final shopping list.

### E. Null Amount/Unit Handling
1. Ingredient with `name` only (`Sylt` or `Salt`) and no amount/unit.
2. Assert:
- item remains in list
- flagged as `unresolved=true`
- no crash/no invalid numeric merge

### F. Legacy Fallback
1. Meal has no `mealIngredients`, but has legacy `ingredients` array.
2. Assert legacy rows included in shopping list.

### G. Auto-Fill Missing Ingredients During List Generation
1. Weekly meal has no structured or legacy ingredients.
2. Mock AI draft response for that meal.
3. Assert:
- ingredient rows persisted to meal
- shopping list includes generated rows

### H. Strict AI Failure Path
1. Enable strict AI mode.
2. AI call fails/aborts for one meal.
3. Assert:
- generation continues for other meals
- missing meal does not crash flow
- result still persists partial list with safe output

### I. Idempotency / Regeneration
1. Generate shopping list twice for same week.
2. Assert:
- one list per user/week (upsert)
- items replaced (no duplicates from previous run)

### J. Authorization
1. Unauthenticated user calls actions.
2. Assert clean `Ej behörig` response and no DB write.

## Test Data Fixtures (Recommended)

- Meal A: `Köttbullar med potatis och brunsås`
  - Potatis 1 kg, Köttbullar 600 g, Gräddsås 3 dl
- Meal B: `Fiskpinnar med potatis`
  - Potatis 500 g, Fiskpinnar 400 g
- Meal C: `Pannkakor med sylt`
  - Mjöl 3 dl, Mjölk 6 dl, Sylt (null/null)
- Meal D: no ingredients (forces AI autofill)
- Meal E: legacy ingredients string array only

## Assertions to Always Include
- `shoppingList.userId`, `weekStartDate`, `weeklyPlanId`
- item count > 0 when meals contain ingredient data
- canonical names sorted and stable
- source traceability populated (`sourceMealIds`, `sourceMealNames`)
- unresolved rows explicitly marked

## Live AI Contract Tests (Optional)

Run separately with env flag, not in default CI:
- `RUN_LIVE_AI_CONTRACT=1`
- `OPENAI_API_KEY` required

Live contract checks:
1. Response parses strict schema.
2. Ingredient names are Swedish.
3. Units from allowed set.
4. No placeholder garbage values.

Pass criteria:
- >= 95% successful schema parse over fixed dish sample set.
- < 5% rows flagged invalid after sanitation.

## CI Strategy

- PR required:
  - unit + integration (deterministic only)
- nightly/manual:
  - live AI contract suite
- block merge if deterministic suite fails.

## Implementation Plan

1. Add integration spec file:
- `lib/actions/plan-to-shopping.integration.test.ts`

2. Add fixture builders:
- `lib/testing/fixtures/meals.ts`
- `lib/testing/fixtures/plans.ts`

3. Add AI mock harness:
- deterministic mock for `generateIngredientDraft`.

4. Add optional live AI spec:
- `lib/ai/ingredients.contract.live.test.ts`
- skip unless `RUN_LIVE_AI_CONTRACT=1`.

## Verification Checklist
- [ ] Deterministic integration tests prove aggregation math and unresolved behavior.
- [ ] Regeneration is idempotent and replaces previous snapshot safely.
- [ ] Strict AI mode failure is non-fatal for overall list generation.
- [ ] Live AI contract test can run on demand and reports quality threshold.
