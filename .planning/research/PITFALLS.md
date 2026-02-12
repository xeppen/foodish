# Pitfalls Research: Adding Ratings, Variety & Preferences to Meal Planning

**Domain:** Meal Planning Enhancement (v1.1 - Adding preferences to existing system)
**Researched:** 2026-02-12
**Confidence:** HIGH (based on existing codebase analysis + research)
**Context:** Adding ratings, variety control, complexity levels, and filtered swapping to a working v1.0 app with real users

## Critical Pitfalls

### Pitfall 1: Null Rating Migration Breaking Plan Generation

**What goes wrong:**
Adding a nullable `rating` column to the Meal table causes the existing plan generation algorithm to fail or produce unexpected results. All existing meals have `null` ratings, and the algorithm doesn't handle this state gracefully, either filtering out all existing meals or causing runtime errors when attempting to sort/weight by rating.

**Why it happens:**
Developers add the schema field first, then update the algorithm to use ratings without considering the transition period where production data has no ratings. The v1.0 algorithm's `orderBy: { lastUsed: "asc" }` gets replaced with rating-based logic that assumes non-null values.

**How to avoid:**
- Add rating column as nullable with a documented neutral value (e.g., null = neutral/unrated)
- Update algorithm to treat null ratings as neutral (3/5 or middle weight) in all sorting/filtering logic
- Never filter meals by `rating != null` — always include unrated meals in pool
- Use coalescing in queries: `orderBy: { rating: "desc" }` becomes `orderBy: [{ rating: { sort: "desc", nulls: "last" } }, { lastUsed: "asc" }]`
- Add explicit tests for the mixed state (some meals rated, some not)

**Warning signs:**
- New installs work but existing users see "not enough meals" errors
- User with 15 meals suddenly can't generate plans (because only 2 have ratings)
- Test database has all meals rated but production doesn't

**Phase to address:**
Phase 1 (Schema & Migration) — Migration must include default handling strategy documented in code comments

---

### Pitfall 2: Variety Rules Creating "No Meals Available" Edge Cases

**What goes wrong:**
User has 8 meals in their library but can't generate a 5-day plan after running the app for 2 weeks because variety rules are too strict. The constraint "no meal used in last 7 days AND not in current plan" leaves zero eligible meals, causing plan generation to fail with a cryptic error.

**Why it happens:**
Variety constraints are implemented as hard filters without graceful degradation. The existing v1.0 logic already has this issue (lines 43-45 in plans.ts: "If we don't have enough meals, cycle through what we have"), but adding MORE constraints (variety rules, complexity filters, rating thresholds) exponentially increases the risk. Developers test with 20+ meals and don't notice the problem until production users with minimal meal libraries report issues.

**How to avoid:**
- Implement constraint relaxation cascade:
  1. Try: Rating > 3 + Variety rules + Complexity match
  2. Fallback: Rating > 2 + Relaxed variety (last 4 days instead of 7)
  3. Fallback: Any rated meal + No variety constraints
  4. Final fallback: ANY meal (current v1.0 behavior)
- Show user-friendly message when falling back: "We repeated a recent meal because your library is small. Add more meals for better variety."
- Track fallback metrics to detect when users consistently hit constraints
- Minimum meal library warning: "For best variety, add at least 10-12 meals" (2x the plan length)

**Warning signs:**
- "Not enough meals" errors despite user having meals in library
- Plans start showing same meals repeatedly after 1-2 weeks of use
- User can generate plan on Monday but swap fails on Friday

**Phase to address:**
Phase 2 (Variety Rules) — Constraint system must include graceful degradation from day one

---

### Pitfall 3: Complexity Filtering Causes Empty Swap Results

**What goes wrong:**
User clicks "Quick & Easy" filter on the swap dialog, and instead of seeing alternative meals, they get "No meals available" or an empty state. The current meal is complexity="Medium", and filtering by "Easy" + applying existing variety constraints leaves zero eligible swaps.

**Why it happens:**
The swap function (line 285 in plans.ts) already has a narrow selection pool (avoids recent + current plan meals). Adding complexity filters further narrows this pool without a fallback strategy. The UI shows a filter but doesn't warn when it will produce zero results.

**How to avoid:**
- ALWAYS show result count in filter UI: "Quick & Easy (3 meals)" vs. "Quick & Easy (0 meals)"
- When filter produces 0 results, show fallback section:
  - "No quick meals available. Here are other options:" with unfiltered results
  - Or disable/dim filters that would produce zero results (like e-commerce sites)
- Keep a "Random" option that ignores all filters as safety valve
- In swap algorithm, apply filters as preferences, not hard constraints:
  ```typescript
  // Prefer matching complexity, but fall back to any meal
  const preferredMeals = availableMeals.filter(m => m.complexity === filter)
  const mealsToChooseFrom = preferredMeals.length > 0 ? preferredMeals : availableMeals
  ```

**Warning signs:**
- Swap button sometimes returns errors that weren't there in v1.0
- Users with small meal libraries can't use filters
- Filter UI shows options that produce no results when clicked

**Phase to address:**
Phase 4 (Filtered Swap) — Filter UX must show result counts and handle zero states before feature ships

---

### Pitfall 4: Progressive Disclosure Slowing Down the "Fast Path"

**What goes wrong:**
The v1.0 app's core value is "sub-60 second planning." Adding ratings, complexity, and filters clutters the UI with dropdowns, stars, and badges. New users get lost in options, and existing users who loved the simplicity feel the app became "complicated." Time-to-first-plan increases from 30 seconds to 2+ minutes.

**Why it happens:**
Developers add all new features to the main UI by default, treating them as equal-priority. The progressive disclosure pattern is poorly implemented with too many layers or confusing navigation. Research shows designs with more than 2 disclosure levels have low usability.

**How to avoid:**
- Keep main path identical to v1.0: Plan page shows 5 meals, one swap button per day (no filters shown)
- New features in secondary layer:
  - Ratings: Small star icon next to meal name (optional, not blocking)
  - Complexity: Badge only shown on Meals page, not on Plan view
  - Filtered swap: Revealed only after clicking swap button (modal/drawer with filters)
- "Advanced" section for variety preferences, collapsed by default
- A/B test with existing users to ensure speed doesn't regress
- Performance budget: First plan generation must stay under 60 seconds, swaps under 5 seconds

**Warning signs:**
- Analytics show time-to-first-plan increased
- User feedback mentions "too complicated" or "too many options"
- Support requests asking "how do I just get a simple plan like before?"
- Existing users have lower engagement after update

**Phase to address:**
Phase 5 (Progressive Disclosure) — Must validate that fast path remains fast before considering feature complete

---

### Pitfall 5: Ratings Encouraging Meal Library Stagnation

**What goes wrong:**
Users rate their favorite 5 meals with 5 stars and everything else 2-3 stars. The algorithm heavily weights high-rated meals, so plans become repetitive (same 5 meals rotating constantly). Variety rules become ineffective because the algorithm prefers breaking variety constraints to using lower-rated meals. Ironically, adding "variety" features reduces actual variety.

**Why it happens:**
Rating weight is too high in the selection algorithm. The algorithm treats ratings as hard preferences rather than soft suggestions. This is a known problem in recommendation systems: excessive personalization limits diversity. Research shows over-reliance on historical data can limit food diversity and encourage unhealthy dietary choices.

**How to avoid:**
- Limit rating influence: Ratings adjust probability but don't override variety constraints
  - Bad: Only select from 4-5 star meals
  - Good: 5-star meals are 2x more likely than 3-star, but 3-star still appear regularly
- Implement "rating decay" over time: A meal rated 5 stars but used 3 times this week gets temporarily downweighted
- Show user their variety metrics: "This week: 3 new meals, 2 repeats from last week"
- Periodic "discovery mode": Occasionally suggest a lower-rated or new meal with explanation: "Haven't tried this in a while!"
- Don't allow filtering out meals entirely (no "hide meals under 3 stars" option)

**Warning signs:**
- User's plans show the same 5-7 meals constantly despite having 20+ in library
- Low-rated meals never appear in plans (check database: `lastUsed` months old)
- Users complaint of boredom despite high ratings

**Phase to address:**
Phase 3 (Planning Algorithm with Ratings) — Rating weight must be tuned conservatively from the start

---

### Pitfall 6: Database Migration Without Schema-Code-Test Alignment

**What goes wrong:**
Schema migration lands, but application code and tests are not updated at the same time. Recency logic, writes, or filters still assume old fields (like `lastUsed`) and break after schema changes.

**Why it happens:**
Teams apply schema changes without end-to-end verification of all affected actions and UI flows.

**How to avoid:**
- Apply schema + application updates together in pre-launch milestones
- Use explicit defaults for new enum-backed fields (no ambiguous null semantics)
- Add unit tests for selection logic and integration tests for actions touching new fields
- Verify plan generation + swap flows after migration in CI before release

**Warning signs:**
- Migration succeeds but plan generation/swap fail in runtime
- Tests pass for schema validation but fail for action behavior
- Code still writes/reads deprecated recency fields

**Phase to address:**
Phase 1 (Schema & Migration) — Migration strategy must be defined before any schema changes

---

### Pitfall 7: Complexity Levels Without Clear Definitions

**What goes wrong:**
User sees three complexity options (Quick, Medium, Advanced) but has no idea what they mean in context. Is "Quick" under 15 minutes or under 30? Does "Advanced" mean hard techniques or just long cooking time? Different users interpret differently, making the data inconsistent and the filtering feature useless. User tags a 45-minute roast as "Quick" because it's easy technique.

**Why it happens:**
Complexity is subjective, and the app doesn't provide clear definitions or examples. Developers assume users have a shared understanding, but users optimize for different things (time, technique difficulty, cleanup, ingredients).

**How to avoid:**
- Provide explicit definitions with examples in the UI:
  - Quick: "30 minutes or less, minimal prep" (e.g., pasta, stir-fry)
  - Medium: "30-60 minutes, standard cooking" (e.g., roasted chicken)
  - Advanced: "60+ minutes or special techniques" (e.g., braised dishes, baking)
- Show examples when user first adds complexity to a meal
- Consider breaking into two dimensions if needed: "Time" + "Difficulty"
- Start with optional field, observe patterns, refine definitions based on data
- Allow users to edit complexity if they disagree with their past choice

**Warning signs:**
- Filter by "Quick" returns meals that take 60+ minutes
- Users never use complexity filters (data is unreliable)
- Support questions: "What does Medium mean?"

**Phase to address:**
Phase 3 (Complexity Levels) — Definitions must be user-tested before rollout

---

### Pitfall 8: Over-Engineering Variety Rules for v1.1

**What goes wrong:**
Developers implement sophisticated variety algorithms with multiple rules: "No same protein twice in a row," "Balance cuisines across week," "Rotate cooking methods." The algorithm becomes slow (takes 10+ seconds to generate a plan), hard to debug, and creates unexpected edge cases. The complexity violates the app's core principle of "decision removal, not optimization."

**Why it happens:**
Feature creep. The milestone says "variety control" and developers interpret that as building a comprehensive meal planning optimizer. They research advanced constraint satisfaction algorithms and implement solutions appropriate for much larger systems.

**How to avoid:**
- Start with ONE simple variety rule: "Avoid meals used in last N days"
- Make N configurable per user (default 7 days): "Low variety" = 3 days, "High variety" = 14 days
- Ship this first, measure effectiveness, then iterate
- Resist adding more rules until data shows the first rule is insufficient
- Performance requirement: Plan generation must complete in under 2 seconds (database query time)
- Remember: v1.0 solved the problem with just `lastUsed` tracking — build on that, don't replace it

**Warning signs:**
- Plan generation becomes noticeably slower
- Algorithm has more than 3-4 constraint checks
- Team debates algorithm details for multiple days
- Code comments say "this handles the edge case where..."

**Phase to address:**
Phase 2 (Variety Rules) — Scope must be ruthlessly minimized to single rule with graceful degradation

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing complexity as string enum ("Easy", "Medium", "Hard") instead of normalized table | Faster to implement, easier to query | Hard to change labels, no i18n support, typo risks | Acceptable for v1.1 — MVP doesn't need i18n |
| Calculating variety constraints in application code vs. database query | Easier to understand logic flow | Fetches more data than needed, slower at scale | Acceptable until 1000+ meals per user (unlikely) |
| Rating values 1-5 stored as Int vs. flexible point system | Simple UX, familiar pattern | Can't change to 10-point or thumbs-up/down later | Never — use 0-100 internally, map to stars in UI |
| Default null ratings to 3 in queries vs. explicit null handling | Cleaner query code | Hides difference between "neutral" and "unrated" | Never — unrated is different from neutral rating |
| Adding complexity to existing Meal table vs. separate MealMetadata table | One migration, fewer joins | Schema grows, harder to add more metadata later | Acceptable for 2-3 fields, refactor if adding more |
| Client-side filtering for swap vs. server-side | Faster perceived performance | Sends more data, filter logic duplicated | Never — must be server-side for accuracy |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading ALL user meals to apply filters in memory | Works fine in dev with 10 meals | Use database-level filtering with WHERE clauses | 100+ meals = slow queries, 500+ meals = timeouts |
| N+1 queries when displaying plans with ratings (fetching meal details for each day) | Initial load feels slow | Use `include` in Prisma query or single join | 10+ plans loaded = page takes 3+ seconds |
| Recalculating variety constraints on every swap | Swap button feels sluggish | Cache recent meal IDs for the session/request | Fine for v1.1, only issue with rapid swaps |
| Full table scan for "unused meals" without index on lastUsed | Swap gets slower over time | Ensure `lastUsed` field has database index | 50+ meals without index = 500ms queries |
| Storing variety preferences as JSON blob requiring parsing on every plan generation | Plan generation feels slower than v1.0 | Store as proper columns or cache parsed version | Fine for v1.1 scale, issue if rules become complex |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Prisma Schema | Changing schema without updating actions and tests | Update schema + actions + tests in the same phase and verify end-to-end |
| Next.js Caching | Forgetting to revalidatePath after rating updates | Add `revalidatePath("/meals")` after any rating mutation |
| Clerk Auth | Assuming userId is integer when it's string | TypeScript will catch this, but watch for numeric comparisons |
| Vercel Deployment | Long-running plan generation hitting serverless timeout | Current generation is fast (<1s), but complex algorithms might hit 10s default limit |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing all preference options on first use | Overwhelming, increases time-to-first-plan | Hide advanced options by default, show after user generates first few plans |
| Requiring ratings before meals can be used | User can't use app until rating 15-20 meals | Ratings completely optional, plans work without any ratings |
| Filter UI that doesn't show "no results" state | User clicks filter, sees spinning loader, then error | Show result count next to filter, disable filters that produce zero results |
| Complexity badges on every meal in plan view | Visual clutter, distracts from meal names | Show complexity only on Meals management page, hide in Plan view |
| Making variety settings a separate page | User doesn't discover feature | Show variety preference as inline setting on Plan page with clear label |
| Stars UI blocking interaction while saving | User clicks star, nothing happens for 2 seconds | Optimistic UI: Show star immediately, revert if save fails |
| Swap modal showing 20+ filtering options | User spends 30 seconds choosing instead of quick swap | Show 3 simple filters max: Complexity, Recently Used, Random |

## "Looks Done But Isn't" Checklist

- [ ] **Rating Migration:** Has explicit enum defaults and algorithm uses consistent rating semantics
- [ ] **Variety Rules:** Tested with user who has only 6-8 meals (edge case that must work)
- [ ] **Complexity Filter:** Shows result count before applying filter, handles zero results
- [ ] **Swap with Filters:** Works when filter matches zero meals (shows fallback)
- [ ] **Plan Generation:** Still completes in <2 seconds with new algorithm complexity
- [ ] **Empty States:** All new features have empty/zero states designed and implemented
- [ ] **Schema-Logic Alignment:** App code and tests are updated for new schema in the same release
- [ ] **Error Messages:** User-friendly messages, not "No meals found in database query"
- [ ] **Loading States:** All async operations show loading indicators
- [ ] **Mobile Responsive:** Rating stars, complexity badges, filter UI work on mobile
- [ ] **Accessibility:** Star ratings, filters, complexity indicators keyboard accessible
- [ ] **Database Indexes:** Added indexes for new query patterns (rating, complexity, usage history)

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Rating semantics break plan generation | LOW | Quick patch: normalize enum handling in selection logic, deploy hotfix in <1 hour |
| Variety rules too strict | MEDIUM | Feature flag to disable variety rules, relax constraints, deploy in 2-4 hours |
| Complexity filter produces empty results | LOW | Add fallback logic to show unfiltered results with message |
| Database migration broke release | HIGH | Forward-fix schema/action mismatch and re-run integration suite before redeploy |
| Progressive disclosure confused users | MEDIUM | Move advanced features back to simple UI, simplify navigation |
| Ratings caused repetitive plans | MEDIUM | Adjust rating weights in algorithm, redeploy (no data changes needed) |
| Performance degradation | MEDIUM | Add database indexes, optimize queries, cache where appropriate |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Rating handling regression | Phase 1 (Schema) | Test plan generation with explicit enum defaults and mixed rating states |
| Variety rules too strict | Phase 2 (Variety) | Test with small meal library (6-8 meals), verify plans generate for 2+ weeks |
| Complexity filter empty results | Phase 4 (Filtered Swap) | Test with library where no meals match filter, verify fallback shown |
| Progressive disclosure slows fast path | Phase 5 (UI Polish) | Time test: New user generates first plan in <60 seconds |
| Ratings cause repetition | Phase 3 (Algorithm) | Generate 4 weeks of plans for user with 20 meals rated 1-5, measure variety |
| Migration/schema mismatch | Phase 1 (Schema) | Run full action integration tests against migrated schema |
| Complexity definitions unclear | Phase 3 (Complexity) | User test: 5 users tag same 10 meals, check consistency |
| Over-engineered variety | Phase 2 (Variety) | Measure plan generation time, must be <2 seconds |

## Phase-Specific Warnings

### Phase 1: Schema & Migration
- CRITICAL: Test migration with production database size (not empty dev database)
- Add explicit defaults for new enum-backed fields
- Include rollback migration script
- Document what happens to existing data
- Test updated app code and action suite against new schema

### Phase 2: Variety Rules
- CRITICAL: Test with minimal meal library (6-8 meals)
- Implement graceful degradation from day one, not as afterthought
- Start with single rule, resist feature creep
- Set performance budget: <2 seconds for plan generation

### Phase 3: Planning Algorithm Updates
- CRITICAL: Test rating weight carefully — too high kills variety
- Handle enum ratings explicitly and consistently across selection logic
- Validate that v1.0 behavior is preserved when no preferences set
- Test with 4+ weeks of continuous plan generation

### Phase 4: Filtered Swap
- CRITICAL: Always show fallback when filter produces zero results
- Show result counts in UI before user applies filter
- Keep "Random" option that ignores all filters
- Test with small meal libraries and aggressive filters

### Phase 5: Progressive Disclosure & UI
- CRITICAL: Measure time-to-first-plan, must stay under 60 seconds
- Default view should look almost identical to v1.0
- A/B test with existing users before full rollout
- Don't add more than 2 levels of disclosure

## Sources

### Research Sources
- [An AI-based nutrition recommendation system - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12390980/) - Variety constraints and dietary diversity
- [Delighting Palates with AI - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10857145/) - Personalized meal planning with user acceptance
- [Food Recommendation: Framework, Existing Solutions](https://arxiv.org/pdf/1905.06269) - Constraint satisfaction in food recommendation
- [Meal Planning Apps That You Will Actually Use (2026)](https://planeatai.com/blog/meal-planning-apps-that-you-will-actually-use-2026) - UX patterns and user retention
- [Best Meal-Planning Apps in 2026](https://ollie.ai/2025/10/21/best-meal-planning-apps-in-2025/) - Common pitfalls in meal planning UX
- [Resolving cold start and sparse data in recommender systems](https://www.sciencedirect.com/science/article/abs/pii/S0045790621003311) - Cold start problems with ratings
- [Addressing sparse data challenges in recommendation systems](https://www.sciencedirect.com/science/article/pii/S2667305324001480) - Sparse rating data handling
- [PostgreSQL nullable columns and NOT NULL without downtime](https://www.sqlservercentral.com/articles/nullable-vs-non-nullable-columns-and-adding-not-null-without-downtime-in-postgresql) - Migration pitfalls
- [Safely Adding NOT NULL Columns - Shopify](https://shopify.engineering/add-not-null-colums-to-database) - Production migration best practices
- [Database Migrations: The Silent Killer](https://toolshelf.tech/blog/database-migrations-disasters/) - Migration failure patterns
- [Progressive Disclosure - Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/) - UX pattern best practices
- [Progressive disclosure in UX design - LogRocket](https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases/) - Implementation challenges
- [Getting filters right - LogRocket](https://blog.logrocket.com/ux-design/filtering-ux-ui-design-patterns-best-practices/) - Filter UX and zero-result states
- [Filter UI Design Best Practices](https://www.aufaitux.com/blog/filter-ui-design/) - Preventing empty result states

### Codebase Analysis
- `/Users/seblju/Development/repos/foodish/lib/actions/plans.ts` - Current planning algorithm
- `/Users/seblju/Development/repos/foodish/lib/actions/meals.ts` - Meal management actions
- `/Users/seblju/Development/repos/foodish/prisma/schema.prisma` - Current schema structure
- `/Users/seblju/Development/repos/foodish/.planning/v1.0-MILESTONE-AUDIT.md` - v1.0 success criteria and performance baselines

---
*Pitfalls research for: Adding Ratings, Variety & Preferences to Meal Planning App*
*Researched: 2026-02-12*
*Confidence: HIGH (existing codebase + domain research)*
