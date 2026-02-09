# Roadmap: What's for Dinner?

## Overview

This roadmap delivers a minimal meal planning tool that removes dinner decisions in under 60 seconds. Five phases build from authentication foundation through meal management, auto-generated planning, adjustment capabilities, and production deployment. Every phase delivers a complete, verifiable capability that moves closer to the core value proposition: weekly dinner planning without decision fatigue.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Authentication and database infrastructure
- [ ] **Phase 2: Core Data** - Meal management with starter pack
- [ ] **Phase 3: Planning Logic** - Auto-generated weekly plans
- [ ] **Phase 4: Plan Adjustment** - Single-day meal swapping
- [ ] **Phase 5: Polish & Deployment** - Production readiness

## Phase Details

### Phase 1: Foundation
**Goal**: Users can authenticate and data persists securely
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. User can sign in with Google OAuth
  2. User session persists across browser refresh
  3. User can sign out from any page
  4. Database schema exists for Users, Meals, and WeeklyPlans
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 2: Core Data
**Goal**: Users can manage their personal meal list with minimal setup friction
**Depends on**: Phase 1
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, MEAL-01, MEAL-02, MEAL-03, MEAL-04
**Success Criteria** (what must be TRUE):
  1. First-time user sees starter pack of 15-20 pre-filled meals
  2. User can view their complete meal list
  3. User can add new text-based meals to their list
  4. User can edit existing meal names
  5. User can delete meals from their list
  6. User can proceed to planning without forced setup
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 3: Planning Logic
**Goal**: Users receive auto-generated weekly plans without manual assignment
**Depends on**: Phase 2
**Requirements**: PLAN-01, PLAN-02, PLAN-03, PLAN-04, PLAN-05, PLAN-06
**Success Criteria** (what must be TRUE):
  1. User sees auto-generated plan with 5 weekday meals (Mon-Fri)
  2. Each day displays one meal from the user's personal list
  3. Plan avoids meals used in previous week
  4. Plan avoids repeating the same meal within current week
  5. Current week's plan persists across browser sessions
  6. New plan generates automatically when viewing next week
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 4: Plan Adjustment
**Goal**: Users can quickly adjust plans without regenerating entire week
**Depends on**: Phase 3
**Requirements**: SWAP-01, SWAP-02
**Success Criteria** (what must be TRUE):
  1. User can swap any single day's meal with one click
  2. Swap replaces only that day, leaving other days unchanged
  3. Swapped meal respects recency constraints (avoids recent meals)
**Plans**: TBD

Plans:
- [ ] TBD during planning

### Phase 5: Polish & Deployment
**Goal**: Application is production-ready with error handling and deployed live
**Depends on**: Phase 4
**Requirements**: None (production readiness work)
**Success Criteria** (what must be TRUE):
  1. Loading states display during plan generation
  2. Error handling prevents crashes on failed operations
  3. Empty states guide new users appropriately
  4. Application is deployed to Vercel with production database
  5. Environment variables are configured for production
**Plans**: TBD

Plans:
- [ ] TBD during planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/TBD | Not started | - |
| 2. Core Data | 0/TBD | Not started | - |
| 3. Planning Logic | 0/TBD | Not started | - |
| 4. Plan Adjustment | 0/TBD | Not started | - |
| 5. Polish & Deployment | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-09*
*Last updated: 2026-02-09*
