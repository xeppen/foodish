## Goal
Ship a production-ready dynamic shopping list for the generated weekly plan, with AI-assisted ingredient drafting in create/edit meal flows and safe aggregation logic.

## Tasks
1. Add ingredient and shopping-list data model with backward-compatible plan linkage (meal IDs), plus migration-safe Prisma updates - files: `prisma/schema.prisma`, `lib/actions/plans.ts`, `lib/actions/meals.ts`, `lib/actions/plans.test.ts`, `lib/actions/meals.test.ts`
2. Implement AI ingredient draft endpoint with strict structured validation, confidence/review flags, caching, and rate limiting hooks - files: `app/api/meal-ingredients/route.ts`, `lib/ai/ingredients.ts`, `lib/ai/ingredients.test.ts`, `lib/actions/meals.ts`
3. Build shopping-list generation domain (normalize, unit conversion, aggregation, unresolved handling) and persist weekly snapshots - files: `lib/shopping/normalize.ts`, `lib/shopping/aggregate.ts`, `lib/actions/shopping-list.ts`, `lib/shopping/aggregate.test.ts`
4. Add shopping-list UI drawer/FAB and integrate with single-view shell, including regenerate/edit/check flows - files: `components/shopping-list-drawer.tsx`, `components/single-view-shell.tsx`, `components/weekly-plan-view.tsx`, `app/page.tsx`
5. Upgrade create/edit meal UX to AI-assisted ingredient table (manual edits before save) for both Magic input and Meal edit, aligned behavior - files: `components/magic-meal-input.tsx`, `components/meal-list.tsx`, `lib/actions/meals.ts`, `app/api/meal-ingredients/route.ts`
6. Add coverage for AI parsing, aggregation math, and plan-to-shopping-list flow; run full test suite and update roadmap/progress - files: `lib/actions/plans.test.ts`, `lib/actions/meals.test.ts`, `lib/actions/shopping-list.test.ts`, `.planning/ROADMAP.md`, `.planning/progress.md`

## Verification
- [ ] Generate weekly plan, then generate shopping list for that week from meal ingredients
- [ ] AI ingredient draft returns structured rows and flags low-confidence rows for review
- [ ] Ingredient aggregation merges compatible units and preserves unresolved conflicts safely
- [ ] Create/edit meal can generate, tweak, and save ingredients with amounts and units
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
