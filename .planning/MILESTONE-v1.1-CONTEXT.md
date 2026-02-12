# Milestone v1.1: Smart Variety & Preferences - Context

**Created:** 2026-02-12
**Milestone:** v1.1 Smart Variety & Preferences
**Status:** Planning complete, ready for execution

## Motivation

After shipping v1.0 (basic meal planning with auto-generation and simple swap), the core problem emerged: **plans feel repetitive**. Users want:
1. More variety in their weekly plans
2. Influence over which meals appear more/less frequently
3. Better understanding of meal preparation effort
4. Smarter swapping with filters

The driving forces are both **variety** (plans need to feel fresh) and **practical info** (need ingredients, complexity levels, better swap options).

## Core Value Addition

Building on v1.0's core value ("Weekly dinner planning takes less than 60 seconds and removes decision fatigue"), v1.1 adds:

**"Plans feel fresh and match household preferences while maintaining fast planning (sub-60 seconds)"**

The constraint is critical: we can't sacrifice speed for features. The fast path must stay fast.

## Feature Scope Decisions

### ✅ In Scope (v1.1)

**1. Ratings System**
- **What:** Thumbs up/neutral/down on meals
- **Why:** Users want to influence what appears in plans
- **Decision:** Simple binary (not 5-star) - research shows 200% higher engagement with thumbs vs stars
- **Constraint:** Ratings influence frequency, but never exclude meals (avoid "no meals available" scenarios)

**2. Variety Rules**
- **What:** Hard rule (no duplicates in same week) + long-term rotation (2-3 weeks)
- **Why:** Users notice immediately if Monday's meal repeats on Thursday
- **Decision:** Favorites can appear once/week but not 3+ weeks in a row
- **Constraint:** Graceful degradation when meal library is small (6-8 meals)

**3. Meal Complexity Levels**
- **What:** Simple/medium/complex levels indicating preparation time
- **Why:** Time constraints are a key challenge (58% cite this as blocker)
- **Decision:** Time-based definitions (<30min, 30-60min, >60min)
- **Default:** Medium (70% of recipes fall here)
- **Constraint:** Defaults to medium when creating meals (no forced classification)

**4. Enhanced Swapping**
- **What:** Fast random swap (existing) + progressive disclosure filters
- **Why:** Sometimes you want something specific (simpler, fresh, favorite) but not always
- **Decision:** Keep one-click random swap as primary, reveal filters on demand
- **Filters:** Complexity (up/down), rating (favorites), recency (fresh meals)
- **Critical addition:** Preload 4+ swap candidates when plan loads (no backend wait on swap click)
- **Constraint:** Main plan page UI unchanged from v1.0 (fast path preserved)

### ❌ Deferred to Future

**Shopping Lists + Ingredients**
- **Rationale:** Massive complexity increase, requires ingredient tracking on meals
- **Future:** v1.2 or later after smart variety is validated

**Weekend Meals (Saturday/Sunday)**
- **Rationale:** Weekends have different patterns (eating out, brunch, more time to cook)
- **Decision:** Keep 5 weekdays for now, can add later if users want it
- **Core problem:** Weekday dinner stress (Sunday-Thursday)

**AI-Generated Meal Images**
- **Rationale:** Polish/nice-to-have, not essential for variety problem
- **Future:** Can add once core variety features are working

**Context-Aware Suggestions (time-of-day)**
- **Rationale:** Interesting but not core to variety problem
- **Future:** v1.2+ if data shows it would help

## Key Design Constraints

### 1. Fast Path Stays Fast
**Problem:** Adding preferences could slow down the core flow
**Solution:** Progressive disclosure - advanced options hidden until needed
- Plan page: Identical to v1.0 (5 meals, one swap button per day)
- Filters: Only revealed when user clicks "Swap with filters"
- Ratings: Small icon, optional interaction

### 2. Backward Compatibility Required
**Problem:** App is in production with real users
**Solution:** All schema changes nullable, migrations staged carefully
- Existing meals: rating=null, complexity=null (app treats as neutral/medium)
- No forced data backfill
- Old code continues working during deployment window

### 3. Decision Removal, Not Optimization
**Problem:** Feature creep toward complex ML/recommendation systems
**Solution:** Simple, predictable logic
- Binary ratings (not 5-star scales)
- Clear complexity definitions (time-based)
- Transparent variety rules (no black-box algorithms)

### 4. Zero New Dependencies
**Problem:** Every dependency adds maintenance burden
**Solution:** Use existing stack (Next.js 15, Prisma 5.22.0, Clerk)
- Prisma enums for ratings/complexity
- Server Actions for mutations
- Tailwind for progressive disclosure UI

## UX Decisions

### Progressive Disclosure for Swap Filters
**Problem:** Too many filter options = decision paralysis (defeats "decision removal" goal)

**Solution:**
- Primary action: Big "Swap" button (random, instant, no thinking)
- Secondary action: Smaller "Swap with filters..." link
- Default flow: 90% of swaps use random (fast path)
- Power user flow: 10% use filters when they want something specific

**Why this works:** Preserves speed for common case, allows specificity for edge cases.

### Preloading Swap Candidates
**Problem:** Clicking swap and waiting for backend = slow, breaks flow

**Solution:**
- When plan loads: Fetch 4+ swap candidates in background
- When user clicks swap: Show immediately from preloaded pool
- After swap: Refresh pool in background for next swap

**Why this matters:** Maintains sub-60-second planning time even with swaps.

### Rating Placement
**Decision:** Rating toggle in meal list (Meals page), NOT on plan view

**Rationale:**
- Plan view: Focused on decision (what to cook this week)
- Meal list: Management context (rate meals you've tried)
- Keeps plan view clean, maintains v1.0 simplicity

## Technical Approach

### Phase 1: Database Foundation (Phase 6)
- Add Rating/Complexity enums to Prisma schema
- Create UsageHistory model (tracks when each meal was used)
- Nullable fields for backward compatibility
- Composite indexes for filtered queries

### Phase 2: Variety Rules & Rotation Logic (Phase 7)
- Hard rule: no duplicate meals in same week
- Soft rule: deprioritize meals from last 2 weeks
- Graceful degradation cascade when constraints conflict

### Phase 3: Rating System & UI (Phase 8)
- RatingToggle component (thumbs up/neutral/down)
- Optimistic UI updates
- Rating influence in plan generation (2x probability for thumbs-up)

### Phase 4: Complexity Levels & Badges (Phase 9)
- ComplexityBadge component with visual coding
- Complexity selector with clear definitions
- Display in meal list only (not plan view)

### Phase 5: Progressive Disclosure Swap (Phase 10)
- SwapModal with filter options
- Preloaded swap candidates
- Result counts and zero-state fallbacks
- Preserve v1.0 fast path

## Success Metrics

**Primary:** Plans feel fresh (no repetition complaints)
**Secondary:** Planning time stays <60 seconds
**Tertiary:** Swap usage increases (filters add value)

**Failure signals:**
- Users complain about repetitive plans despite variety features
- Planning time increases significantly
- Users confused by filter options

## Open Questions Resolved

**Q: Should complexity be auto-inferred from meal name?**
A: No. Start with manual selection (defaults to medium). Can add NLP later if users request it.

**Q: Should we track historical meal names for accuracy?**
A: No. Store only mealId (foreign key). Join for current name. Low-value feature, not worth denormalization.

**Q: Do we need timezone-aware timestamps?**
A: No for v1.1. All users in same timezone, relative date math doesn't need timezone awareness.

## Next Steps

1. Execute Phase 6 (Database Foundation) - `/gsd:execute-phase 6`
2. After Phase 6: Plan and execute Phases 7-10 in sequence
3. After Phase 10: Verify milestone completion, ship to production

---

**Note:** This document captures the context and decisions from the milestone planning conversation on 2026-02-12. All decisions are reflected in `PROJECT.md`, `REQUIREMENTS.md`, and phase plans.
