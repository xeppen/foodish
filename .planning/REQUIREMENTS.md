# Requirements: What's for Dinner? v1.1

**Defined:** 2026-02-12
**Core Value:** Plans feel fresh and match household preferences while maintaining fast planning (sub-60 seconds)

## v1.1 Requirements

Requirements for Smart Variety & Preferences milestone. Each maps to roadmap phases.

### Ratings

- [ ] **RATING-01**: User can rate meals with thumbs up/neutral/down
- [x] **RATING-02**: Meal ratings persist across sessions
- [ ] **RATING-03**: Rating toggle appears in meal list (not plan view)
- [ ] **RATING-04**: Thumbs-up meals appear more frequently in generation
- [ ] **RATING-05**: Thumbs-down meals appear less frequently (but not excluded)
- [ ] **RATING-06**: Existing meals default to neutral rating

### Variety Control

- [x] **VARIETY-01**: Generated plans never include duplicate meals within same week
- [x] **VARIETY-02**: Meals used in last 2 weeks are deprioritized
- [x] **VARIETY-03**: Favorite meals can appear once per week but not 3+ weeks consecutively
- [x] **VARIETY-04**: Usage history tracks when each meal was used
- [x] **VARIETY-05**: Graceful degradation when constraints conflict with small meal libraries

### Complexity

- [x] **COMPLEX-01**: Meals have complexity level (simple/medium/complex)
- [x] **COMPLEX-02**: New meals default to medium complexity in persisted data
- [ ] **COMPLEX-03**: User can set/change complexity when creating or editing meal
- [ ] **COMPLEX-04**: Complexity definitions are clear (time-based: <30min, 30-60min, >60min)
- [ ] **COMPLEX-05**: Complexity badges display in meal list

### Enhanced Swapping

- [ ] **SWAP-01**: Fast random swap remains primary action (one click, no filters)
- [ ] **SWAP-02**: At least 4 swap candidate meals preloaded when plan loads (no backend wait)
- [ ] **SWAP-03**: Swap shows immediately using preloaded candidates
- [ ] **SWAP-04**: Background refresh of swap pool after swap completes
- [ ] **SWAP-05**: "Swap with filters" option reveals progressive disclosure UI
- [ ] **SWAP-06**: Filter by complexity (show only simple/medium/complex meals)
- [ ] **SWAP-07**: Filter by rating (show only thumbs-up meals)
- [ ] **SWAP-08**: Filter by recency (show meals not used recently)
- [ ] **SWAP-09**: Filtered results show meal count ("Simple (3 meals)")
- [ ] **SWAP-10**: Zero-result filters show fallback options
- [ ] **SWAP-11**: Main plan page UI unchanged from v1.0 (fast path preserved)

## Future Requirements

Deferred from v1.1 to future milestones.

### Shopping Lists

- **SHOP-01**: User can generate shopping list from weekly plan
- **SHOP-02**: User can add ingredients to meals
- **SHOP-03**: Shopping list aggregates ingredients from plan

### Weekend Meals

- **PLAN-07**: User can plan weekend meals (Saturday/Sunday)
- **PLAN-08**: Weekend meals have different patterns than weekday

### Visual Enhancement

- **MEAL-07**: Meals can have images
- **MEAL-08**: AI-generated or AI-searched meal images

### Extended Variety

- **VARIETY-06**: User can configure variety window (default 14 days)
- **VARIETY-07**: Variety dashboard shows usage stats ("14/18 meals used this month")
- **VARIETY-08**: Transparent selection reasons (tooltips explaining why meal chosen)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| 5-star ratings | Adds ambiguity vs binary clarity, 200% lower engagement than thumbs |
| Hard meal exclusions ("never show") | Shrinks viable pool dangerously, creates "no meals" scenarios |
| ML recommendation engine | Over-engineering for 18-meal sets, violates simplicity principle |
| Complex rotation schedules | Reduces flexibility, adds configuration burden |
| Per-person preferences | Household-level tool, not individual profiles |
| Extensive meal metadata (tags, categories) | Adds friction on meal creation |
| Recipe content/cooking instructions | Not a recipe app, focus on decision removal |
| Nutrition tracking | Not a health app, trust users' meal knowledge |
| Social features | Personal tool, no sharing or community |
| Context-aware suggestions (time-of-day) | Defer to v1.2+, not core to variety problem |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| RATING-01 | Phase 8 | Pending |
| RATING-02 | Phase 6 | Complete |
| RATING-03 | Phase 8 | Pending |
| RATING-04 | Phase 8 | Pending |
| RATING-05 | Phase 8 | Pending |
| RATING-06 | Phase 8 | Pending |
| VARIETY-01 | Phase 7 | Complete |
| VARIETY-02 | Phase 7 | Complete |
| VARIETY-03 | Phase 7 | Complete |
| VARIETY-04 | Phase 6 | Complete |
| VARIETY-05 | Phase 7 | Complete |
| COMPLEX-01 | Phase 6 | Complete |
| COMPLEX-02 | Phase 6 | Complete |
| COMPLEX-03 | Phase 9 | Pending |
| COMPLEX-04 | Phase 9 | Pending |
| COMPLEX-05 | Phase 9 | Pending |
| SWAP-01 | Phase 10 | Pending |
| SWAP-02 | Phase 10 | Pending |
| SWAP-03 | Phase 10 | Pending |
| SWAP-04 | Phase 10 | Pending |
| SWAP-05 | Phase 10 | Pending |
| SWAP-06 | Phase 10 | Pending |
| SWAP-07 | Phase 10 | Pending |
| SWAP-08 | Phase 10 | Pending |
| SWAP-09 | Phase 10 | Pending |
| SWAP-10 | Phase 10 | Pending |
| SWAP-11 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 27 total
- Mapped to phases: 27 (100% coverage)
- Unmapped: 0

**Coverage by Phase:**
- Phase 6 (Database Foundation): 4 requirements (RATING-02, VARIETY-04, COMPLEX-01, COMPLEX-02)
- Phase 7 (Variety Rules): 4 requirements (VARIETY-01, VARIETY-02, VARIETY-03, VARIETY-05)
- Phase 8 (Rating System): 5 requirements (RATING-01, RATING-03, RATING-04, RATING-05, RATING-06)
- Phase 9 (Complexity Levels): 3 requirements (COMPLEX-03, COMPLEX-04, COMPLEX-05)
- Phase 10 (Progressive Swap): 11 requirements (SWAP-01 through SWAP-11)

---
*Requirements defined: 2026-02-12*
*Last updated: 2026-02-12 (Phase 7 traceability updated)*
