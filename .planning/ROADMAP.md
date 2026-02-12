# Roadmap: What's for Dinner?

## Milestones

- ✅ **v1.0 MVP** - Phases 1-5 (shipped 2026-02-10)
- 🚧 **v1.1 Smart Variety & Preferences** - Phases 6-10 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-5) - SHIPPED 2026-02-10</summary>

### Phase 1: Foundation
**Goal**: Users can authenticate and data persists securely
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. ✅ User can sign in with Google OAuth (Clerk)
  2. ✅ User session persists across browser refresh
  3. ✅ User can sign out from any page
  4. ✅ Database schema exists for Meals and WeeklyPlans (Prisma + Neon PostgreSQL)
**Status**: Complete (2026-02-09, migrated to Clerk 2026-02-10)

Plans:
- [x] Auth.js setup with Google OAuth (replaced with Clerk)
- [x] Prisma schema with database models
- [x] Clerk authentication with catch-all routes

### Phase 2: Core Data
**Goal**: Users can manage their personal meal list with minimal setup friction
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, MEAL-01, MEAL-02, MEAL-03, MEAL-04
**Success Criteria** (what must be TRUE):
  1. ✅ First-time user sees starter pack of 18 pre-filled meals
  2. ✅ User can view their complete meal list
  3. ✅ User can add new text-based meals to their list
  4. ✅ User can edit existing meal names
  5. ✅ User can delete meals from their list
  6. ✅ User can proceed to planning without forced setup
**Status**: Complete (2026-02-09)

Plans:
- [x] Meal CRUD operations with Server Actions
- [x] Starter meal initialization
- [x] Meal list UI components

### Phase 3: Planning Logic
**Goal**: Users receive auto-generated weekly plans without manual assignment
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06
**Success Criteria** (what must be TRUE):
  1. ✅ User sees auto-generated plan with 5 weekday meals (Mon-Fri)
  2. ✅ Each day displays one meal from the user's personal list
  3. ✅ Plan avoids meals used in previous week
  4. ✅ Plan avoids repeating the same meal within current week
  5. ✅ Current week's plan persists across browser sessions
  6. ✅ New plan generates automatically when viewing next week
**Status**: Complete (2026-02-09)

Plans:
- [x] Weekly plan generation algorithm
- [x] Recency tracking with lastUsed field
- [x] Plan persistence and retrieval

### Phase 4: Plan Adjustment
**Goal**: Users can quickly adjust plans without regenerating entire week
**Requirements**: SWAP-01, SWAP-02
**Success Criteria** (what must be TRUE):
  1. ✅ User can swap any single day's meal with one click
  2. ✅ Swap replaces only that day, leaving other days unchanged
  3. ✅ Swapped meal respects recency constraints (avoids recent meals)
**Status**: Complete (2026-02-09)

Plans:
- [x] Single-day meal swap functionality
- [x] Swap UI component with optimistic updates

### Phase 5: Polish & Deployment
**Goal**: Application is production-ready with error handling and deployed live
**Requirements**: None (production readiness work)
**Success Criteria** (what must be TRUE):
  1. ✅ Loading states display during plan generation
  2. ✅ Error handling prevents crashes on failed operations
  3. ✅ Empty states guide new users appropriately
  4. ✅ Application is deployed to Vercel with production database
  5. ✅ Environment variables are configured for production
**Status**: Complete (2026-02-10)

Plans:
- [x] Loading and empty states
- [x] Error handling
- [x] Vercel deployment with Neon PostgreSQL
- [x] Production environment variables
- [x] Clerk auth configuration for production
- [x] Fixed compatibility issues (Prisma v5, React 18, Zod v4)

</details>

### 🚧 v1.1 Smart Variety & Preferences (In Progress)

**Milestone Goal:** Plans feel fresh and match household preferences while maintaining fast planning (sub-60 seconds)

#### Phase 6: Database Foundation
**Goal**: Schema supports ratings, complexity levels, and usage tracking for smart variety
**Depends on**: Phase 5
**Requirements**: RATING-02, VARIETY-04, COMPLEX-01, COMPLEX-02
**Success Criteria** (what must be TRUE):
  1. Meal model includes rating field (THUMBS_DOWN/NEUTRAL/THUMBS_UP enum with default NEUTRAL)
  2. Meal model includes complexity field (SIMPLE/MEDIUM/COMPLEX enum with default MEDIUM)
  3. UsageHistory model tracks when each meal was used with timestamp and week context
  4. Database indexes exist for filtered queries (userId + rating, userId + complexity)
  5. New and existing meals resolve to explicit defaults (rating=NEUTRAL, complexity=MEDIUM)
  6. Plan generation no longer relies on Meal.lastUsed and uses UsageHistory as primary recency source
**Plans**: 3 plans in 2 waves

Plans:
- [x] 06-01-PLAN.md — Add Rating/Complexity enums to Meal model with explicit defaults
- [x] 06-02-PLAN.md — Add UsageHistory model with cascade delete and composite indexes
- [x] 06-03-PLAN.md — Apply migration and verify backward compatibility

#### Phase 7: Variety Rules & Rotation Logic
**Goal**: Generated plans avoid repetition and respect long-term rotation without user configuration
**Depends on**: Phase 6
**Requirements**: VARIETY-01, VARIETY-02, VARIETY-03, VARIETY-05
**Success Criteria** (what must be TRUE):
  1. Generated plans never include duplicate meals within same week (hard constraint)
  2. Meals used in last 2 weeks are deprioritized in selection algorithm
  3. Favorite meals can appear weekly but not 3+ weeks consecutively
  4. When variety constraints conflict with small meal libraries, system gracefully degrades (shows message: "We repeated a recent meal because your library is small")
  5. UsageHistory entries are created on plan generation and swap actions
**Plans**: 3 plans

Plans:
- [x] 07-01: Enhance selection algorithm with 14-day recency + no-duplicate constraints
- [x] 07-02: Implement constraint relaxation cascade for edge cases
- [x] 07-03: Add graceful degradation warnings and test coverage

#### Phase 8: Rating System & UI
**Goal**: Users can express meal preferences that influence future plan generation
**Depends on**: Phase 6
**Requirements**: RATING-01, RATING-03, RATING-04, RATING-05, RATING-06
**Success Criteria** (what must be TRUE):
  1. User can toggle meal rating between thumbs-up/neutral/thumbs-down
  2. Rating changes appear immediately (optimistic UI)
  3. Rating toggle appears in meal management list view (single-view drawer)
  4. Thumbs-up meals appear more frequently in generated plans (2x probability boost)
  5. Thumbs-down meals appear less frequently but are never excluded (0.5x probability)
  6. All existing meals default to neutral rating
**Plans**: TBD

Plans:
- [ ] 08-01: Create RatingToggle component with optimistic updates
- [ ] 08-02: Implement rateMeal() Server Action
- [ ] 08-03: Integrate rating influence into plan generation algorithm

#### Phase 9: Complexity Levels & Badges
**Goal**: Meals indicate preparation effort, enabling time-aware meal selection
**Depends on**: Phase 6
**Requirements**: COMPLEX-03, COMPLEX-04, COMPLEX-05
**Success Criteria** (what must be TRUE):
  1. User can set complexity level when creating or editing meal
  2. Complexity selector shows clear definitions (Simple: <30min, Medium: 30-60min, Complex: >60min)
  3. Complexity badges display in meal list with visual coding (green=Simple, yellow=Medium, orange=Complex)
  4. Complexity information helps users understand preparation time at a glance
**Plans**: TBD

Plans:
- [ ] 09-01: Create ComplexityBadge component with clear visual design
- [ ] 09-02: Add complexity selector to meal forms with examples
- [ ] 09-03: Display complexity badges in meal list

#### Phase 10: Progressive Disclosure Swap
**Goal**: Users can swap meals with optional filters while keeping fast random swap as default
**Depends on**: Phases 7, 8, 9
**Requirements**: SWAP-01, SWAP-02, SWAP-03, SWAP-04, SWAP-05, SWAP-06, SWAP-07, SWAP-08, SWAP-09, SWAP-10, SWAP-11
**Success Criteria** (what must be TRUE):
  1. Fast random swap remains primary action (one click, no modal, existing v1.0 behavior preserved)
  2. Swap shows immediately using preloaded candidates (at least 4 meals)
  3. "Swap with filters" option reveals progressive disclosure UI (modal with filter options)
  4. User can filter swap options by complexity (show only simple/medium/complex)
  5. User can filter by rating (show only thumbs-up meals)
  6. User can filter by recency (show meals not recently used)
  7. Filtered results show meal count ("Simple (3 meals)" vs "Simple (0 meals)")
  8. Zero-result filters show fallback options with message
  9. Background refresh updates swap pool after swap completes
  10. Main plan page UI unchanged from v1.0 (fast path preserved)
**Plans**: TBD

Plans:
- [ ] 10-01: Create SwapModal component with progressive disclosure pattern
- [ ] 10-02: Implement getSwapOptions() Server Action with filtering
- [ ] 10-03: Add swap candidate preloading and background refresh
- [ ] 10-04: Display result counts and zero-state fallbacks

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9 → 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-02-09 |
| 2. Core Data | v1.0 | 3/3 | Complete | 2026-02-09 |
| 3. Planning Logic | v1.0 | 3/3 | Complete | 2026-02-09 |
| 4. Plan Adjustment | v1.0 | 2/2 | Complete | 2026-02-09 |
| 5. Polish & Deployment | v1.0 | 6/6 | Complete | 2026-02-10 |
| 6. Database Foundation | v1.1 | 3/3 | Complete | 2026-02-12 |
| 7. Variety Rules & Rotation Logic | v1.1 | 3/3 | Complete | 2026-02-12 |
| 8. Rating System & UI | v1.1 | 0/3 | Not started | - |
| 9. Complexity Levels & Badges | v1.1 | 0/3 | Not started | - |
| 10. Progressive Disclosure Swap | v1.1 | 0/4 | Not started | - |

**Deployment:** https://foodish-red.vercel.app
**Repository:** https://github.com/xeppen/foodish
**Current Status:** v1.0 deployed, v1.1 Phases 6-7 complete, Phase 9 planning started

---
*Roadmap created: 2026-02-09*
*Last updated: 2026-02-12 (Phase 7 completed, Phase 9 planning started)*
