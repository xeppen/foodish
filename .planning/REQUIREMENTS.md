# Requirements: What's for Dinner?

**Defined:** 2026-02-09
**Core Value:** Weekly dinner planning takes less than 60 seconds and removes decision fatigue.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign in with Google
- [ ] **AUTH-02**: User session persists across browser refresh
- [ ] **AUTH-03**: User can sign out from any page

### Setup

- [ ] **SETUP-01**: First-time user sees starter pack of 15-20 common meals pre-filled
- [ ] **SETUP-02**: User can remove meals from starter pack
- [ ] **SETUP-03**: User can add their own meals during setup
- [ ] **SETUP-04**: User can proceed to planning without completing setup

### Meal Management

- [ ] **MEAL-01**: User can view their personal meal list
- [ ] **MEAL-02**: User can add new meals (text-based, no images/recipes)
- [ ] **MEAL-03**: User can edit existing meals
- [ ] **MEAL-04**: User can delete meals from their list

### Weekly Planning

- [ ] **PLAN-01**: User sees auto-generated weekly plan with 5 weekday meals
- [ ] **PLAN-02**: Each day shows one meal from the user's personal list
- [ ] **PLAN-03**: Recently used meals are deprioritized in generation
- [ ] **PLAN-04**: Same weekly plan is avoided if possible
- [ ] **PLAN-05**: Current week's plan is saved automatically
- [ ] **PLAN-06**: New plan is generated automatically for next week

### Plan Adjustment

- [ ] **SWAP-01**: User can swap individual days with one click
- [ ] **SWAP-02**: Swap replaces only that single day, not entire week

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Extended Planning
- **PLAN-07**: User can plan weekend meals (Saturday/Sunday)
- **PLAN-08**: User can view plan history for past weeks

### Meal Organization
- **MEAL-05**: User can add tags/categories to meals
- **MEAL-06**: User can filter meal list by tags

### Shopping
- **SHOP-01**: User can generate shopping list from weekly plan
- **SHOP-02**: User can customize ingredient lists per meal

### Notifications
- **NOTF-01**: User receives email reminder to plan next week
- **NOTF-02**: User receives notification when new week begins

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Recipe libraries | Not a food discovery tool, users already know their meals |
| Nutrition tracking | Not a health app, trust users' existing meal knowledge |
| AI/ML optimization | Intentionally simple logic, no complex personalization |
| Shopping lists (v1) | Massive complexity, defer to v2 after core validation |
| Child profiles/preferences | Household-level tool, not per-person customization |
| Social features | Personal tool, no sharing or community aspects |
| Inspiration feeds | No browsing, only decision removal |
| Weekend meals (v1) | Focus on recurring weekday friction first |
| Meal ratings/reviews | No feedback loops, keep it boring and predictable |
| Recipe content/images | Text-only keeps focus on decision, not discovery |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| AUTH-03 | TBD | Pending |
| SETUP-01 | TBD | Pending |
| SETUP-02 | TBD | Pending |
| SETUP-03 | TBD | Pending |
| SETUP-04 | TBD | Pending |
| MEAL-01 | TBD | Pending |
| MEAL-02 | TBD | Pending |
| MEAL-03 | TBD | Pending |
| MEAL-04 | TBD | Pending |
| PLAN-01 | TBD | Pending |
| PLAN-02 | TBD | Pending |
| PLAN-03 | TBD | Pending |
| PLAN-04 | TBD | Pending |
| PLAN-05 | TBD | Pending |
| PLAN-06 | TBD | Pending |
| SWAP-01 | TBD | Pending |
| SWAP-02 | TBD | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 0 (pending roadmap creation)
- Unmapped: 19 ⚠️

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after initial definition*
